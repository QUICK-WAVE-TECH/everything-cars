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

from .models import OFFER_TTL_HOURS, Offer, OfferStatus


def owner_respond(offer, action, data):
    if offer.status != OfferStatus.PENDING:
        raise ValidationError("This offer is no longer awaiting your response.")

    if action == "reject":
        offer.status = OfferStatus.REJECTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])
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
        return offer

    return accept_offer(offer)


def accept_offer(offer):
    """
    Accept an offer and hand the sale to the existing purchase pipeline.

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

        # Everyone else loses; they are told the vehicle is gone
        Offer.objects.filter(car=car, status__in=ACTIVE_OFFER_STATUSES).exclude(
            id=offer.id
        ).update(
            status=OfferStatus.SUPERSEDED,
            responded_at=timezone.now(),
        )
    return offer


def customer_respond(offer, action):
    if offer.status != OfferStatus.COUNTERED:
        raise ValidationError("There is no counter-offer awaiting your response.")
    if action == "accept":
        return accept_offer(offer)
    if action == "reject":
        offer.status = OfferStatus.REJECTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])
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
