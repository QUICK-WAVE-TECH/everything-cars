import secrets
from apps.listings.models import Car
from .models import ActorRole, CarStatusHistory

MAX_TRACKING_ATTEMPTS = 10


def record_status_change(
    car,
    to_status,
    actor=None,
    actor_role=ActorRole.SYSTEM,
    note="",
    extra_update_fields=(),
):
    """Transition a car's status and write the history row

    Must be called inside the caller's transaction so the status and its history entry commit or roll back together.
    """
    CarStatusHistory.objects.create(
        car=car,
        from_status=car.status,
        to_status=to_status,
        actor=actor,
        actor_role=actor_role,
        note=note,
    )
    car.status = to_status
    car.save(update_fields=["status", "updated_at", *extra_update_fields])


def generate_tracking_id(center):
    """Generate a unique tracking id like NG-LOS-482913"""
    prefix = f"{center.country_code}-{center.city_code}"
    for _ in range(MAX_TRACKING_ATTEMPTS):
        candidate = f"{prefix}-{secrets.randbelow(1_000_000):06d}"
        if not Car.objects.filter(tracking_id=candidate).exists():
            return candidate
    raise RuntimeError("Exhausted tracking-id attempts; widen the digit space")
