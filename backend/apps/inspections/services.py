import secrets
from apps.listings.models import Car
from .models import ActorRole, CarStatusHistory

MAX_TRACKING_ATTEMPTS = 10


def _client_ip(request):
    """
    Real client IP, honoring a proxy's X-forwarded-for if present

    Behind a load balancer / reverse proxy, REMOTE_ADDR is the proxy's IP,
    not the user's. XFF is a comma-separated chain "client, proxy1, proxy2";

    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_status_change(
    car,
    to_status,
    actor=None,
    actor_role=ActorRole.SYSTEM,
    note="",
    extra_update_fields=(),
    request=None,
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
        actor_name=actor.get_full_name() if actor else "",
        actor_email=actor.email if actor else "",
        actor_phone=actor.phone if actor else "",
        ip_address=_client_ip(request) if request else None,
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
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
