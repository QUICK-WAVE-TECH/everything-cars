from django.urls import path

from apps.users.scope_views import MyScopeView
from apps.users.team_views import (
    TeamDeactivateView,
    TeamDetailView,
    TeamListCreateView,
    TeamReactivateView,
)

urlpatterns = [
    path("me/scope", MyScopeView.as_view(), name="owner-me-scope"),
    path("team/", TeamListCreateView.as_view(), name="owner-team"),
    path(
        "team/<uuid:member_id>/",
        TeamDetailView.as_view(),
        name="owner-team-detail",
    ),
    path(
        "team/<uuid:member_id>/deactivate/",
        TeamDeactivateView.as_view(),
        name="owner-team-deactivate",
    ),
    path(
        "team/<uuid:member_id>/reactivate/",
        TeamReactivateView.as_view(),
        name="owner-team-reactivate",
    ),
]
