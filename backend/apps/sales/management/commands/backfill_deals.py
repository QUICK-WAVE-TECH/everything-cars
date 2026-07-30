from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.listings.models import RequestStatus
from apps.offers.models import Offer, OfferStatus
from apps.sales.models import (
    Deal,
    DealCancelledBy,
    DealStatus,
    DEAL_TTL_DAYS,
)


class Command(BaseCommand):
    help = (
        "Create Deal records for accepted offers that predate the Deal model "
        "(their acceptance created a buy Request instead). Idempotent."
    )

    def handle(self, *args, **options):
        offers = Offer.objects.filter(
            status=OfferStatus.ACCEPTED, deal__isnull=True
        ).select_related("car", "car__owner", "customer", "resulting_request")

        created = 0
        skipped = 0
        for offer in offers:
            car = offer.car
            req = offer.resulting_request
            base = offer.responded_at or offer.created_at or timezone.now()

            status = DealStatus.ACTIVE
            completed_at = None
            cancelled_at = None
            cancelled_by = ""
            if req and req.status == RequestStatus.COMPLETED:
                status = DealStatus.COMPLETED
                completed_at = req.updated_at
            elif req and req.status in (
                RequestStatus.CANCELLED,
                RequestStatus.REJECTED,
            ):
                status = DealStatus.CANCELLED
                cancelled_at = req.updated_at
                cancelled_by = DealCancelledBy.SYSTEM

            # The partial unique constraint permits only one active Deal per car.
            if (
                status == DealStatus.ACTIVE
                and Deal.objects.filter(car=car, status=DealStatus.ACTIVE).exists()
            ):
                skipped += 1
                continue

            Deal.objects.create(
                car=car,
                buyer=offer.customer,
                seller=car.owner,
                offer=offer,
                agreed_amount=offer.agreed_amount,
                currency=offer.currency,
                status=status,
                expires_at=base + timedelta(days=DEAL_TTL_DAYS),
                completed_at=completed_at,
                cancelled_at=cancelled_at,
                cancelled_by=cancelled_by,
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Backfilled {created} deal(s); skipped {skipped}.")
        )
