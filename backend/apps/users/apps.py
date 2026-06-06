from django.apps import AppConfig
from django.core.checks import Error, register


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"

    def ready(self):
        register(check_jwt_keys)


def check_jwt_keys(app_configs, **kwargs):
    from django.conf import settings

    errors = []
    if not settings.JWT_PRIVATE_KEY:
        errors.append(
            Error(
                "JWT_PRIVATE_KEY is not set.",
                hint="Add JWT_PRIVATE_KEY to your .env file. Generate with: python -c 'from cryptography.hazmat.primitives.asymmetric import rsa; ...'",
                id="users.E001",
            )
        )
    if not settings.JWT_PUBLIC_KEY:
        errors.append(
            Error(
                "JWT_PUBLIC_KEY is not set.",
                hint="Add JWT_PUBLIC_KEY to your .env file.",
                id="users.E002",
            )
        )
    return errors
