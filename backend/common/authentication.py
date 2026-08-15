from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.users.models import User
from apps.users.services import (
    SUSPENDED_MESSAGE,
    is_suspended_team_member,
    verify_access_token,
)


class JWTAuthentication(BaseAuthentication):

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        payload = verify_access_token(token)
        if payload is None:
            raise AuthenticationFailed("Invalid or expired token")

        try:
            user = User.objects.get(id=payload["sub"], is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found")

        # A suspended team member's token stops working on their next request.
        if is_suspended_team_member(user):
            raise AuthenticationFailed(SUSPENDED_MESSAGE)

        return (user, payload)

    def authenticate_header(self, request):
        return "Bearer"
