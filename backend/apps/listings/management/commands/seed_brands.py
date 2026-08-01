from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.listings.brands_data import POPULAR_NG, WORLD_MAKES
from apps.listings.models import Brand


class Command(BaseCommand):
    help = "Seed the canonical Brand list (idempotent)."

    def handle(self, *args, **options):
        popular = {name: i * 10 for i, name in enumerate(POPULAR_NG, start=1)}
        created = 0
        seen = set()
        for name in WORLD_MAKES:
            if name in seen:
                continue
            seen.add(name)
            _, was_created = Brand.objects.get_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "display_order": popular.get(name, 1000),
                },
            )
            created += int(was_created)
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created} new brand(s); total {Brand.objects.count()}."
            )
        )
