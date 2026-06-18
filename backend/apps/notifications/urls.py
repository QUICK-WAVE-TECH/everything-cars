from django.urls import path
from .views import (
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notifications-list"),
    path(
        "unread-count",
        NotificationUnreadCountView.as_view(),
        name="notifications-unread",
    ),
    path(
        "<uuid:notification_id>/read",
        NotificationMarkReadView.as_view(),
        name="notification-read",
    ),
    path(
        "mark-all-read",
        NotificationMarkAllReadView.as_view(),
        name="notifications-mark-all",
    ),
]
