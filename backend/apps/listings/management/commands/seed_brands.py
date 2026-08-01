from django.core.management.base import BaseCommand

from apps.listings.brands_data import seed_brand_rows
from apps.listings.models import Brand


class Command(BaseCommand):
    help = "Seed the canonical Brand list (idempotent)."

    def handle(self, *args, **options):
        created = seed_brand_rows(Brand)
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created} new brand(s); total {Brand.objects.count()}."
            )
        )
