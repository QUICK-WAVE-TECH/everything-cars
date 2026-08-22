from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.listings.models import Car, CarStatus
from apps.notifications.notifications import schedule_notification
from apps.notifications.service import (
    notify_car_available_again,
    notify_deal_cancelled,
    notify_deal_completed,
    notify_deal_disputed,
    notify_dispute_dismissed,
)
from apps.offers.models import OFFER_TTL_HOURS, Offer, OfferStatus
from apps.listings.models import (
    Transaction,
    TransactionStatus,
    TransactionType,
)
from .models import (
    DEAL_DISPUTE_WINDOW_DAYS,
    Deal,
    DealCancelledBy,
    DealStatus,
    DisputeResolution,
)


def record_deal_sale_transaction(deal):
    """Record a completed negotiated sale in the ledger so it counts as revenue
    (sales report + transactions page). Idempotent, and skips cars that already
    have a completed purchase transaction so a single sale is never double
    counted."""
    if Transaction.objects.filter(deal=deal).exists():
        return None
    already = Transaction.objects.filter(
        request__car_id=deal.car_id,
        transaction_type=TransactionType.PURCHASE,
        status=TransactionStatus.COMPLETED,
    ).exists()
    if already:
        return None
    return Transaction.objects.create(
        deal=deal,
        payer=deal.buyer,
        receiver=deal.seller,
        amount=deal.agreed_amount,
        currency=deal.currency,
        transaction_type=TransactionType.PURCHASE,
        status=TransactionStatus.COMPLETED,
        reference=f"DEAL-{deal.id.hex[:12].upper()}",
    )


def _revive_standby_offers(car):
    """A deal fell through — the car reverts to active negotiation. Bring every
    still-open offer (the standby rivals AND the now-defunct accepted offer) back
    as acceptable PENDING offers (fresh 48h TTL) so the seller can accept a
    fallback without the buyer re-submitting. Returns the revived offers (for
    notifications). Must run inside the caller's transaction."""
    now = timezone.now()
    revived = list(
        Offer.objects.filter(
            car=car, status__in=[OfferStatus.STANDBY, OfferStatus.ACCEPTED]
        ).select_related("car", "customer")
    )
    Offer.objects.filter(id__in=[o.id for o in revived]).update(
        status=OfferStatus.PENDING,
        expires_at=now + timedelta(hours=OFFER_TTL_HOURS),
        revived_at=now,
    )
    return revived


def latest_completed_deal_for_vin(vin):
    """The most recent COMPLETED deal for a car with this VIN, or None. This is
    the ownership proof for relisting: its buyer is the vehicle's current owner.
    COMPLETED excludes reversed disputes (they become CANCELLED)."""
    if not vin:
        return None
    return (
        Deal.objects.filter(car__vin=vin, status=DealStatus.COMPLETED)
        .select_related("buyer")
        .order_by("-completed_at")
        .first()
    )


def completed_deal_is_final(deal, now=None):
    """Whether a completed transfer can be used as proof for a relisting.

    A completion remains reversible during the buyer's dispute window. A
    dismissed dispute finalizes the transfer immediately; an open dispute never
    does. Keeping this rule beside the deal state machine prevents relisting and
    dispute resolution from disagreeing about who owns the VIN.
    """
    if deal.status != DealStatus.COMPLETED:
        return False
    if deal.dispute_resolution == DisputeResolution.DISMISSED:
        return True
    if deal.disputed_at is not None:
        return False
    completed_at = deal.completed_at or deal.created_at
    return (now or timezone.now()) >= completed_at + timedelta(
        days=DEAL_DISPUTE_WINDOW_DAYS
    )


def _locked_deal(deal):
    return (
        Deal.objects.select_for_update()
        .select_related("car", "buyer", "seller", "offer")
        .get(pk=deal.pk)
    )


def complete_deal(deal):
    """Seller confirms the sale: close the deal and take the car off the market."""
    with transaction.atomic():
        deal = _locked_deal(deal)
        if deal.status != DealStatus.ACTIVE:
            raise ValidationError("This deal is already closed.")
        car = Car.objects.select_for_update().get(pk=deal.car_id)
        deal.status = DealStatus.COMPLETED
        deal.completed_at = timezone.now()
        deal.save(update_fields=["status", "completed_at"])
        car.status = CarStatus.ARCHIVED
        car.save(update_fields=["status"])
        # Record the sale in the ledger so it counts toward revenue everywhere.
        record_deal_sale_transaction(deal)
        # The car genuinely sold — standby offers are now terminally closed.
        Offer.objects.filter(car=car, status=OfferStatus.STANDBY).update(
            status=OfferStatus.SUPERSEDED, responded_at=timezone.now()
        )
    schedule_notification(notify_deal_completed, lambda d=deal: d)
    return deal


def cancel_deal(deal, cancelled_by):
    """Either party (or the system, on timeout) ends the deal; the car returns to
    the market and prior bidders are invited back."""
    with transaction.atomic():
        deal = _locked_deal(deal)
        if deal.status != DealStatus.ACTIVE:
            raise ValidationError("This deal is already closed.")
        deal.status = DealStatus.CANCELLED
        deal.cancelled_at = timezone.now()
        deal.cancelled_by = cancelled_by
        deal.save(update_fields=["status", "cancelled_at", "cancelled_by"])
        # Bidders on standby when this offer won — revive their offers so the
        # seller can accept a fallback directly, and invite them back.
        prior = _revive_standby_offers(deal.car)

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
    with transaction.atomic():
        deal = _locked_deal(deal)
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
    with transaction.atomic():
        deal = _locked_deal(deal)
        if deal.status != DealStatus.COMPLETED:
            raise ValidationError("Only a completed deal can be reversed.")
        car = Car.objects.select_for_update().get(pk=deal.car_id)
        if (
            car.vin
            and Car.objects.filter(vin=car.vin)
            .exclude(pk=car.pk)
            .exclude(status=CarStatus.ARCHIVED)
            .exists()
        ):
            raise ValidationError(
                "This deal cannot be reversed while another active listing uses "
                "the same VIN. Archive that listing and try again."
            )
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
        prior = _revive_standby_offers(car)

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
    note = (note or "").strip()
    if len(note) < 15:
        raise ValidationError("Add a note of at least 15 characters.")
    with transaction.atomic():
        deal = _locked_deal(deal)
        if deal.disputed_at is None:
            raise ValidationError("This deal has not been disputed.")
        if deal.dispute_resolution:
            raise ValidationError("This dispute has already been resolved.")

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
