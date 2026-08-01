from django.db import migrations


def forwards(apps, schema_editor):
    """Canonicalize every existing car's free-text brand: matches (incl. the
    alias map) are rewritten to the canonical Brand.name; unmatched values move
    to brand_other (flagged for staff). Brands are already seeded by 0019."""
    from apps.listings.brands_data import canonicalize_car_brand

    Car = apps.get_model("listings", "Car")
    for car in Car.objects.all().only("id", "brand", "brand_other"):
        brand, other = canonicalize_car_brand(car.brand)
        if brand != car.brand or other != car.brand_other:
            car.brand = brand
            car.brand_other = other
            car.save(update_fields=["brand", "brand_other"])


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0019_seed_brands"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
