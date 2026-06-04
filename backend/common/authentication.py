from rest_framework.authentication import BaseAuthentication


class JWTAuthentication(BaseAuthentication):
    """JWT authentication — full implementation in Task 4."""

    def authenticate(self, request):
        # Stub — returns None (no auth) until JWT service is built
        return None
