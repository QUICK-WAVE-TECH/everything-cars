from django.urls import path
from apps.users.views import (
    AdminOwnerListView,
    AdminOwnerVerifyView,
    MeView,
)

urlpatterns = [
    path("me", MeView.as_view(), name="user-me"),
    path("admin/owners", AdminOwnerListView.as_view(), name="admin-owners"),
    path(
        "admin/owners/<uuid:user_id>/verify",
        AdminOwnerVerifyView.as_view(),
        name="admin-owner-verify",
    ),
]
