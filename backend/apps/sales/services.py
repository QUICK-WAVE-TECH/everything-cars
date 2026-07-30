from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.listings.models import CarStatus
from apps.notifications.notifications import schedule_notification
from apps.notifications.service import (
    notify_car_available_again,
    notify_deal_cancelled,
    notify_deal_completed,
)
from apps.offers.models import Offer, OfferStatus
from .models import DealCancelledBy, DealStatus


def complete_deal(deal):
    """Seller confirms the sale: close the deal and take the car off the market."""
    if deal.status != DealStatus.ACTIVE:
        raise ValidationError("This deal is already closed.")
    with transaction.atomic():
        car = deal.car
        deal.status = DealStatus.COMPLETED
        deal.completed_at = timezone.now()
        deal.save(update_fields=["status", "completed_at"])
        car.status = CarStatus.ARCHIVED
        car.save(update_fields=["status"])
    schedule_notification(notify_deal_completed, lambda d=deal: d)
    return deal


def cancel_deal(deal, cancelled_by):
    """Either party (or the system, on timeout) ends the deal; the car returns to
    the market and prior bidders are invited back."""
    if deal.status != DealStatus.ACTIVE:
        raise ValidationError("This deal is already closed.")
    with transaction.atomic():
        deal.status = DealStatus.CANCELLED
        deal.cancelled_at = timezone.now()
        deal.cancelled_by = cancelled_by
        deal.save(update_fields=["status", "cancelled_at", "cancelled_by"])
        # Bidders who were superseded when this offer won — invite them back.
        prior = list(
            Offer.objects.filter(car=deal.car, status=OfferStatus.SUPERSEDED)
            .select_related("car", "customer")
        )

    if cancelled_by in (DealCancelledBy.BUYER, DealCancelledBy.SELLER):
        other = deal.seller if cancelled_by == DealCancelledBy.BUYER else deal.buyer
        transaction.on_commit(
            lambda d=deal, r=other: notify_deal_cancelled(d, r), robust=True
        )
    for offer in prior:
        schedule_notification(notify_car_available_again, lambda o=offer: o)
    return deal
