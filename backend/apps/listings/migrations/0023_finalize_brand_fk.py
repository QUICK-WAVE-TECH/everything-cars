from django.db import migrations


class Migration(migrations.Migration):
    """Drop the old free-text brand column and promote the populated FK to `brand`."""

    dependencies = [
        ("listings", "0022_car_brand_ref"),
    ]

    operations = [
        migrations.RemoveField(model_name="car", name="brand"),
        migrations.RenameField(
            model_name="car", old_name="brand_ref", new_name="brand"
        ),
    ]
