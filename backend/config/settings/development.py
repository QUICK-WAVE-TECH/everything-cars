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

# Email — print to console in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Use local file storage in dev
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Add browsable API renderer in dev
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
]
