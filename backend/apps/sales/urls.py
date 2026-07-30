from django.urls import path

from .views import (
    DealCancelView,
    DealCompleteView,
    DealDetailView,
    DealDisputeView,
    MyDealListView,
    StaffDisputeDismissView,
    StaffDisputeListView,
    StaffDisputeUpholdView,
)

urlpatterns = [
    path("", MyDealListView.as_view(), name="deal-list"),
    # Staff dispute console (must precede the <uuid> routes).
    path("staff/disputes/", StaffDisputeListView.as_view(), name="staff-disputes"),
    path(
        "staff/disputes/<uuid:deal_id>/uphold/",
        StaffDisputeUpholdView.as_view(),
        name="staff-dispute-uphold",
    ),
    path(
        "staff/disputes/<uuid:deal_id>/dismiss/",
        StaffDisputeDismissView.as_view(),
        name="staff-dispute-dismiss",
    ),
    path("<uuid:deal_id>", DealDetailView.as_view(), name="deal-detail"),
    path("<uuid:deal_id>/complete", DealCompleteView.as_view(), name="deal-complete"),
    path("<uuid:deal_id>/cancel", DealCancelView.as_view(), name="deal-cancel"),
    path("<uuid:deal_id>/dispute", DealDisputeView.as_view(), name="deal-dispute"),
]
