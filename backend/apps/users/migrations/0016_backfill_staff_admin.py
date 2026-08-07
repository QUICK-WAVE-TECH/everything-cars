from django.db import migrations


def backfill_admin(apps, schema_editor):
    """Existing staff could do everything; keep them full-access as 'admin'."""
    User = apps.get_model("users", "User")
    User.objects.filter(is_staff=True).exclude(staff_role="admin").update(
        staff_role="admin"
    )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("users", "0015_user_staff_role")]
    operations = [migrations.RunPython(backfill_admin, noop)]
