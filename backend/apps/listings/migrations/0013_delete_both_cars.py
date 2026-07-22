from django.db import migrations

from apps.listings.migration_helpers import delete_both_cars


def forwards(apps, schema_editor):
    delete_both_cars(apps.get_model("listings", "Car"))


class Migration(migrations.Migration):
    dependencies = [("listings", "0012_alter_car_vin")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
