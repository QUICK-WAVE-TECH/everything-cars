from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.sales.models import Deal, DealCancelledBy, DealStatus
from apps.sales.services import cancel_deal


class Command(BaseCommand):
    help = "Cancel Deals past their expiry and put the cars back on the market."

    def handle(self, *args, **options):
        stale = list(
            Deal.objects.filter(
                status=DealStatus.ACTIVE, expires_at__lte=timezone.now()
            ).select_related("car", "buyer", "seller")
        )
        for deal in stale:
            cancel_deal(deal, cancelled_by=DealCancelledBy.SYSTEM)
        self.stdout.write(self.style.SUCCESS(f"Expired {len(stale)} deal(s)."))
