from django.db import migrations

from apps.reviews.migration_helpers import delete_non_rent_reviews


def forwards(apps, schema_editor):
    delete_non_rent_reviews(apps.get_model("reviews", "Review"))


class Migration(migrations.Migration):
    dependencies = [
        ("reviews", "0002_alter_review_comment_alter_review_request_and_more"),
        # The listing_type choices must already be rent/buy-only before we
        # filter on them.
        ("listings", "0013_delete_both_cars"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
