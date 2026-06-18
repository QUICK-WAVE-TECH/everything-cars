import logging
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs

logger = logging.getLogger("notifications")


@database_sync_to_async
def get_user_from_token(token):
    """Validate JWT and return user. Uses the same verify_access_token as REST auth."""
    from apps.users.services import verify_access_token
    from apps.users.models import User

    payload = verify_access_token(token)
    if payload is None:
        logger.warning("[WS AUTH] Token invalid or expired")
        return AnonymousUser()

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("[WS AUTH] No 'sub' claim in token")
        return AnonymousUser()

    try:
        user = User.objects.get(id=user_id, is_active=True)
        logger.info("[WS AUTH] Authenticated: %s", user.email)
        return user
    except User.DoesNotExist:
        logger.warning("[WS AUTH] User not found: %s", user_id)
        return AnonymousUser()


class JWTWebSocketMiddleware(BaseMiddleware):
    """Authenticate WebSocket via token query param: ws://host/ws/notifications/?token=xxx"""

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            logger.warning("[WS AUTH] No token in query string")
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
