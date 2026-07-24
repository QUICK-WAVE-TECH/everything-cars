from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.notifications.service import notify_offer_expired
from apps.offers.models import ACTIVE_OFFER_STATUSES, Offer, OfferStatus


class Command(BaseCommand):
    help = "Close offers past their 48-hour window and notify the buyers."

    def handle(self, *args, **options):
        stale = Offer.objects.filter(
            status__in=ACTIVE_OFFER_STATUSES, expires_at__lte=timezone.now()
        ).select_related("car", "customer")
        # Materialise before the update — afterwards they no longer match.
        expiring = list(stale)
        Offer.objects.filter(id__in=[o.id for o in expiring]).update(
            status=OfferStatus.EXPIRED
        )
        for offer in expiring:
            notify_offer_expired(offer)
        self.stdout.write(self.style.SUCCESS(f"Expired {len(expiring)} offer(s)."))
