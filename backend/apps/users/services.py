import uuid
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

from .models import AccessCode, RefreshTokenBlacklist


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

    if purpose == AccessCode.Purpose.SIGN_UP_VERIFY:
        template_key = "auth_signup_code"
        subject = "Verify your email — your code inside"
    else:
        template_key = "auth_login_code"
        subject = "Your EverythingCars login code"

    send_email(
        recipient=email,
        subject=subject,
        template_key=template_key,
        context={
            "code": code_obj.plain_code,
            "expires_minutes": ACCESS_CODE_EXPIRY_MINUTES,
        },
    )

    # Dev convenience: still echo the code to the console so you don't have to
    # open Mailpit for every login.
    if settings.DEBUG:
        print(f"\n[DEV] Access code for {email}: {code_obj.plain_code}\n")

    return code_obj
