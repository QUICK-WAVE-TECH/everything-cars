import pytest


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """Seed the canonical Brand list once per test session.

    pytest runs with ``--nomigrations`` (see pyproject), so the seed_brands data
    migration never runs under pytest — seed here instead. ``manage.py test``
    runs migrations and gets the brands from the migration. Seeding here (outside
    the per-test transaction) means every rollback-based TestCase sees the list.
    """
    with django_db_blocker.unblock():
        from django.core.management import call_command

        call_command("seed_brands")
