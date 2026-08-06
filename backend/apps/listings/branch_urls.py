from django.urls import path

from apps.listings.branch_views import (
    BranchListCreateView,
    BranchDetailView,
    BranchDeactivateView,
    BranchReactivateView,
)

urlpatterns = [
    path("branches/", BranchListCreateView.as_view(), name="owner-branches"),
    path(
        "branches/<uuid:branch_id>/",
        BranchDetailView.as_view(),
        name="owner-branch-detail",
    ),
    path(
        "branches/<uuid:branch_id>/deactivate/",
        BranchDeactivateView.as_view(),
        name="owner-branch-deactivate",
    ),
    path(
        "branches/<uuid:branch_id>/reactivate/",
        BranchReactivateView.as_view(),
        name="owner-branch-reactivate",
    ),
]
