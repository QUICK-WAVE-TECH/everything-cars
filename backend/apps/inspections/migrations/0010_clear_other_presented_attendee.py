from django.db import migrations


def clear_other_attendee(apps, schema_editor):
    """Migration 0009 removed the "other" choice from presented_attendee. Any
    rows that stored "other" before then are now invalid enum values (they'd
    fail validation on the next edit), so normalize them to blank."""
    PhysicalInspection = apps.get_model("inspections", "PhysicalInspection")
    PhysicalInspection.objects.filter(presented_attendee="other").update(
        presented_attendee=""
    )


class Migration(migrations.Migration):
    dependencies = [
        ("inspections", "0009_alter_physicalinspection_presented_attendee"),
    ]

    operations = [
        # No inverse — "other" is gone; leaving rows blank on rollback is fine.
        migrations.RunPython(clear_other_attendee, migrations.RunPython.noop),
    ]
