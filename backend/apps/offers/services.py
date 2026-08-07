from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from django.db import transaction

from apps.listings.models import Car

from apps.notifications.notifications import schedule_notification
from apps.notifications.service import (
    notify_car_no_longer_available,
    notify_counter_rejected,
    notify_deal_reached,
    notify_offer_countered,
    notify_offer_rejected,
)
from apps.sales.models import Deal, DEAL_TTL_DAYS
from .models import ACTIVE_OFFER_STATUSES, OFFER_TTL_HOURS, Offer, OfferStatus


def owner_respond(offer, action, data):
    if offer.status != OfferStatus.PENDING:
        raise ValidationError("This offer is no longer awaiting your response.")

    if action == "reject":
        offer.status = OfferStatus.REJECTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])
        schedule_notification(notify_offer_rejected, lambda o=offer: o)
        return offer

    if action == "counter":
        offer.status = OfferStatus.COUNTERED
        offer.counter_amount = data["counter_amount"]
        offer.counter_message = data.get("message", "")
        offer.countered_at = timezone.now()
        # The ball is now in the buyer's court, so restart their clock.
        offer.expires_at = timezone.now() + timedelta(hours=OFFER_TTL_HOURS)
        offer.save(
            update_fields=[
                "status",
                "counter_amount",
                "counter_message",
                "countered_at",
                "expires_at",
                "updated_at",
            ]
        )
        schedule_notification(notify_offer_countered, lambda o=offer: o)
        return offer

    # Owner accepted a pending offer → the buyer is the one to notify.
    return accept_offer(offer, accepted_by="owner")


def accept_offer(offer, accepted_by="owner"):
    """
    Accept an offer and open a Deal. Both parties then coordinate the sale and
    payment off-platform via the revealed contact details.

    One transaction under a row lock on the car so two offers on the same
    vehicle can't both be accepted.
    """
    with transaction.atomic():
        car = Car.objects.select_for_update().get(id=offer.car_id)

        if (
            Offer.objects.filter(car=car, status=OfferStatus.ACCEPTED)
            .exclude(id=offer.id)
            .exists()
        ):
            raise ValidationError("Another offer on this vehicle was already accepted.")
        if offer.status not in ACTIVE_OFFER_STATUSES:
            raise ValidationError("This offer is no longer open.")

        offer.status = OfferStatus.ACCEPTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])

        deal = Deal.objects.create(
            car=car,
            buyer=offer.customer,
            seller=car.owner,
            offer=offer,
            agreed_amount=offer.agreed_amount,
            currency=car.currency,
            expires_at=timezone.now() + timedelta(days=DEAL_TTL_DAYS),
        )

        rivals = list(
            Offer.objects.filter(car=car, status__in=ACTIVE_OFFER_STATUSES)
            .exclude(id=offer.id)
            .select_related("car", "customer")
        )
        Offer.objects.filter(id__in=[r.id for r in rivals]).update(
            status=OfferStatus.STANDBY,
            responded_at=timezone.now(),
        )

    schedule_notification(notify_deal_reached, lambda d=deal: d)
    for rival in rivals:
        schedule_notification(notify_car_no_longer_available, lambda o=rival: o)
    return offer


def customer_respond(offer, action):
    if offer.status != OfferStatus.COUNTERED:
        raise ValidationError("There is no counter-offer awaiting your response.")
    if action == "accept":
        # Customer accepted the owner's counter → notify the owner.
        return accept_offer(offer, accepted_by="customer")
    if action == "reject":
        offer.status = OfferStatus.REJECTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])
        schedule_notification(notify_counter_rejected, lambda o=offer: o)
        return offer
    raise ValidationError("Unsupported action.")


def withdraw_offer(offer):
    # Only before the owner has responded — once they have, the buyer answers
    # rather than retreats.
    if offer.status != OfferStatus.PENDING:
        raise ValidationError("You can only withdraw an offer awaiting a response.")
    offer.status = OfferStatus.WITHDRAWN
    offer.responded_at = timezone.now()
    offer.save(update_fields=["status", "responded_at", "updated_at"])
    return offer
