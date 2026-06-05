import uuid
from datetime import datetime, timedelta, timezone

import jwt
import resend
from django.conf import settings

from .models import AccessCode, RefreshTokenBlacklist


def issue_tokens(user) -> dict:
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
    try:
        payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=["RS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def verify_refresh_token(token: str) -> dict | None:
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


def generate_and_send_code(email: str, purpose: str, user=None) -> AccessCode:
    code_obj = AccessCode.create_code(email=email, purpose=purpose, user=user)

    if settings.RESEND_API_KEY:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": [email],
                "subject": "Your EverythingCars Access Code",
                "text": f"Your access code is: {code_obj.plain_code}\n\nIt expires in 10 minutes.",
            }
        )
    else:
        # Dev fallback: print to console
        print(f"\n[DEV] Access code for {email}: {code_obj.plain_code}\n")

    return code_obj
