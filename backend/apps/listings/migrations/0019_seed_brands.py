from django.db import migrations
from django.utils.text import slugify


def seed(apps, schema_editor):
    """Seed the canonical Brand list so it exists in every environment (prod +
    every test DB). Idempotent — safe alongside the seed_brands command."""
    from apps.listings.brands_data import POPULAR_NG, WORLD_MAKES

    Brand = apps.get_model("listings", "Brand")
    popular = {name: i * 10 for i, name in enumerate(POPULAR_NG, start=1)}
    seen = set()
    for name in WORLD_MAKES:
        if name in seen:
            continue
        seen.add(name)
        Brand.objects.get_or_create(
            slug=slugify(name),
            defaults={"name": name, "display_order": popular.get(name, 1000)},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0018_car_brand_other"),
    ]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
