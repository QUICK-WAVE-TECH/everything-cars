from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.listings.models import CarStatus
from apps.notifications.notifications import schedule_notification
from apps.notifications.service import (
    notify_car_available_again,
    notify_deal_cancelled,
    notify_deal_completed,
    notify_deal_disputed,
    notify_dispute_dismissed,
)
from apps.offers.models import Offer, OfferStatus
from .models import (
    DEAL_DISPUTE_WINDOW_DAYS,
    DealCancelledBy,
    DealStatus,
    DisputeResolution,
)


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


def dispute_deal(deal, reason=""):
    """The buyer flags a completed sale they say never happened. Staff review it."""
    if deal.status != DealStatus.COMPLETED:
        raise ValidationError("Only a completed deal can be disputed.")
    if deal.disputed_at is not None:
        raise ValidationError("This deal has already been disputed.")
    window_ends = (deal.completed_at or deal.created_at) + timedelta(
        days=DEAL_DISPUTE_WINDOW_DAYS
    )
    if timezone.now() > window_ends:
        raise ValidationError("The window to dispute this sale has closed.")

    deal.disputed_at = timezone.now()
    deal.dispute_reason = reason or ""
    deal.save(update_fields=["disputed_at", "dispute_reason"])
    schedule_notification(notify_deal_disputed, lambda d=deal: d)
    return deal


def reverse_deal(deal, by=None):
    """Staff uphold a dispute: undo a completed sale, the car goes back on the
    market, and both parties + prior bidders are notified. `by` is the staff user
    resolving it (recorded on the case)."""
    if deal.status != DealStatus.COMPLETED:
        raise ValidationError("Only a completed deal can be reversed.")
    with transaction.atomic():
        car = deal.car
        deal.status = DealStatus.CANCELLED
        deal.cancelled_at = timezone.now()
        deal.cancelled_by = DealCancelledBy.SYSTEM
        deal.cancel_reason = "Reversed by staff after a buyer dispute."
        deal.completed_at = None
        deal.dispute_resolution = DisputeResolution.UPHELD
        deal.dispute_resolved_at = timezone.now()
        deal.dispute_resolved_by = by
        deal.dispute_resolution_note = (
            deal.dispute_resolution_note
            or "Dispute upheld. Deal reversed and the car relisted; "
            "both parties and prior bidders notified."
        )
        deal.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "cancel_reason",
                "completed_at",
                "dispute_resolution",
                "dispute_resolved_at",
                "dispute_resolved_by",
                "dispute_resolution_note",
            ]
        )
        car.status = CarStatus.PUBLISHED
        car.save(update_fields=["status"])
        prior = list(
            Offer.objects.filter(car=deal.car, status=OfferStatus.SUPERSEDED)
            .select_related("car", "customer")
        )

    for recipient in (deal.buyer, deal.seller):
        transaction.on_commit(
            lambda d=deal, r=recipient: notify_deal_cancelled(d, r), robust=True
        )
    for offer in prior:
        schedule_notification(notify_car_available_again, lambda o=offer: o)
    return deal


def dismiss_dispute(deal, note, by=None):
    """Staff dismiss a dispute: the sale stands. The buyer is notified of the
    outcome and the note is recorded on the case for audit. `note` is required."""
    if deal.disputed_at is None:
        raise ValidationError("This deal has not been disputed.")
    if deal.dispute_resolution:
        raise ValidationError("This dispute has already been resolved.")
    note = (note or "").strip()
    if len(note) < 15:
        raise ValidationError("Add a note of at least 15 characters.")

    deal.dispute_resolution = DisputeResolution.DISMISSED
    deal.dispute_resolved_at = timezone.now()
    deal.dispute_resolved_by = by
    deal.dispute_resolution_note = note
    deal.save(
        update_fields=[
            "dispute_resolution",
            "dispute_resolved_at",
            "dispute_resolved_by",
            "dispute_resolution_note",
        ]
    )
    schedule_notification(notify_dispute_dismissed, lambda d=deal: d)
    return deal
