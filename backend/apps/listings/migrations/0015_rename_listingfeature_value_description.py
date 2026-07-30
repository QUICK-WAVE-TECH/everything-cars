from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0014_remove_car_max_price_remove_car_min_price"),
    ]

    operations = [
        migrations.RenameField(
            model_name="listingfeature",
            old_name="value",
            new_name="description",
        ),
    ]
