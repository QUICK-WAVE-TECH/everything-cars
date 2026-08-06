import uuid
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

from .models import AccessCode, RefreshTokenBlacklist, TeamMembership, User


def _require_jwt_keys() -> None:
    if not settings.JWT_PRIVATE_KEY or not settings.JWT_PUBLIC_KEY:
        raise RuntimeError("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be configured.")


def issue_tokens(user) -> dict:
    _require_jwt_keys()
    now = datetime.now(timezone.utc)
    jti_access = uuid.uuid4().hex
    jti_refresh = uuid.uuid4().hex

    access_payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES),
        "jti": jti_access,
        "type": "access",
    }
    refresh_payload = {
        "sub": str(user.id),
        "iat": now,
        "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS),
        "jti": jti_refresh,
        "type": "refresh",
    }

    access_token = jwt.encode(
        access_payload, settings.JWT_PRIVATE_KEY, algorithm="RS256"
    )
    refresh_token = jwt.encode(
        refresh_payload, settings.JWT_PRIVATE_KEY, algorithm="RS256"
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES * 60,
    }


def verify_access_token(token: str) -> dict | None:
    _require_jwt_keys()

    try:
        payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=["RS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def verify_refresh_token(token: str) -> dict | None:
    _require_jwt_keys()

    try:
        payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=["RS256"])
        if payload.get("type") != "refresh":
            return None
        if RefreshTokenBlacklist.objects.filter(jti=payload["jti"]).exists():
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def blacklist_token(jti: str) -> None:
    RefreshTokenBlacklist.objects.get_or_create(jti=jti)


ACCESS_CODE_EXPIRY_MINUTES = 10


def generate_and_send_code(email: str, purpose: str, user=None) -> AccessCode:
    code_obj = AccessCode.create_code(email=email, purpose=purpose, user=user)

    # Deliver through the shared email engine (Mailpit in dev, SMTP in prod).
    # Lazy import avoids any users<->notifications import-order issues.
    from apps.notifications.email_service import send_email

    context = {
        "code": code_obj.plain_code,
        "expires_minutes": ACCESS_CODE_EXPIRY_MINUTES,
    }

    if purpose == AccessCode.Purpose.SIGN_UP_VERIFY:
        template_key = "auth_signup_code"
        subject = "Verify your email"
        # A one-click verification link that carries the code, so the recipient
        # can just tap the button instead of copying the digits.
        from urllib.parse import urlencode

        context["verify_url"] = (
            settings.FRONTEND_URL.rstrip("/")
            + "/verify-email?"
            + urlencode({"email": email, "code": code_obj.plain_code})
        )
    else:
        template_key = "auth_login_code"
        subject = "Your EverythingCars login code"

    send_email(
        recipient=email,
        subject=subject,
        template_key=template_key,
        context=context,
    )

    # Dev convenience: still echo the code to the console so you don't have to
    # open Mailpit for every login.
    if settings.DEBUG:
        print(f"\n[DEV] Access code for {email}: {code_obj.plain_code}\n")

    return code_obj


class NoBusinessAccess(Exception):
    """The user has no usable business/branch context (a customer, or a team
    member with a disabled/absent membership)."""


def resolve_business_scope(user):
    """Return ``(business_owner_user, branch_ids)`` for an owner or team member.

    - primary **owner** → ``(user, None)`` where ``None`` means "all branches".
    - active **team member** → ``(membership.business.user, [assigned active branch ids])``.

    Raises :class:`NoBusinessAccess` for a disabled/absent membership or any
    other role. Callers filter owner-side querysets by ``owner=business_owner``
    and, when ``branch_ids`` is not None, ``branch_id__in=branch_ids``.
    """
    if user.role == User.Role.OWNER:
        return user, None
    if user.role == User.Role.TEAM_MEMBER:
        membership = (
            TeamMembership.objects.filter(user=user, is_active=True)
            .select_related("business__user")
            .first()
        )
        if membership is None:
            raise NoBusinessAccess()
        branch_ids = list(
            membership.branches.filter(is_active=True).values_list("id", flat=True)
        )
        return membership.business.user, branch_ids
    raise NoBusinessAccess()
