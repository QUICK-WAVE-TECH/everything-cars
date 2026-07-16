from .base import *  # noqa: F401,F403

DEBUG = True

# WebSocket channel layer — use the in-memory backend locally so dev doesn't
# require a running Redis server (Redis is awkward to run on Windows). This
# keeps notifications/WebSockets working within the single dev process.
# Production still uses Redis PubSub (see base.py / production.py).
CHANNEL_LAYERS = {  # noqa: F405
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
}

# CORS — allow all in dev
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Email — deliver to Mailpit in dev (SMTP on :1025, inbox UI at
# http://localhost:8025). Mailpit captures every message and never relays, so
# real inboxes are never touched while developing. Start it with `mailpit`.
# Production reads real SMTP settings from the environment (see production.py).
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "localhost"
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_HOST_USER = ""
EMAIL_HOST_PASSWORD = ""
DEFAULT_FROM_EMAIL = "EverythingCars <no-reply@everythingcars.local>"

# Use local file storage in dev
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Add browsable API renderer in dev
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
