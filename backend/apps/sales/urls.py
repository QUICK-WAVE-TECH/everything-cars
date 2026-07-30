from django.urls import path

from .views import (
    DealCancelView,
    DealCompleteView,
    DealDetailView,
    MyDealListView,
)

urlpatterns = [
    path("", MyDealListView.as_view(), name="deal-list"),
    path("<uuid:deal_id>", DealDetailView.as_view(), name="deal-detail"),
    path("<uuid:deal_id>/complete", DealCompleteView.as_view(), name="deal-complete"),
    path("<uuid:deal_id>/cancel", DealCancelView.as_view(), name="deal-cancel"),
]
