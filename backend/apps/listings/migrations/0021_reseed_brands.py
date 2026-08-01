from django.db import migrations


def reseed(apps, schema_editor):
    """Re-run the idempotent brand seed so environments already past 0019 pick up
    brands added to WORLD_MAKES since. A fresh DB gets them from 0019; this keeps
    existing DBs in sync on `migrate`."""
    from apps.listings.brands_data import seed_brand_rows

    seed_brand_rows(apps.get_model("listings", "Brand"))


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0020_backfill_car_brands"),
    ]

    operations = [migrations.RunPython(reseed, migrations.RunPython.noop)]
