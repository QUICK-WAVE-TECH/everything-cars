from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from django.db import transaction

from apps.listings.models import (
    Car,
    ListingType,
    Request,
    RequestStatus,
    RequestStatusEvent,
)

from apps.notifications.notifications import schedule_notification
from apps.notifications.service import (
    notify_car_no_longer_available,
    notify_counter_accepted,
    notify_counter_rejected,
    notify_offer_accepted,
    notify_offer_countered,
    notify_offer_rejected,
)
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
    Accept an offer and hand the sale to the existing purchase pipeline.

    ``accepted_by`` decides who hears about it: an owner accepting a pending
    offer notifies the buyer (``offer_accepted``); a customer accepting a
    counter notifies the owner (``counter_accepted``).

    Everything here is one transaction under a row lock on the car: without it,
    two offers on the same vehicle could both be accepted and we would create
    two competing purchase requests for one car.
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

        amount = offer.agreed_amount

        # Owner approval is implicit in accepting, so the request skips PENDING
        # and lands ready for payment.
        req = Request.objects.create(
            car=car,
            customer=offer.customer,
            request_type=ListingType.BUY,
            price_offered=amount,
            currency=car.currency,
            status=RequestStatus.APPROVED,
        )
        RequestStatusEvent.objects.create(
            request=req,
            from_status="",
            to_status=RequestStatus.APPROVED,
            actor=car.owner,
            note="Created from an accepted offer.",
        )

        offer.status = OfferStatus.ACCEPTED
        offer.responded_at = timezone.now()
        offer.resulting_request = req
        offer.save(
            update_fields=[
                "status",
                "responded_at",
                "resulting_request",
                "updated_at",
            ]
        )

        # Everyone else loses; capture them before the bulk update so we can
        # notify each buyer, then close them out.
        rivals = list(
            Offer.objects.filter(car=car, status__in=ACTIVE_OFFER_STATUSES)
            .exclude(id=offer.id)
            .select_related("car", "customer")
        )
        Offer.objects.filter(id__in=[r.id for r in rivals]).update(
            status=OfferStatus.SUPERSEDED,
            responded_at=timezone.now(),
        )

    # After commit: the winner, plus every superseded rival.
    if accepted_by == "customer":
        schedule_notification(notify_counter_accepted, lambda o=offer: o)
    else:
        schedule_notification(notify_offer_accepted, lambda o=offer: o)
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
