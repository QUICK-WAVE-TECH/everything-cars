from django.urls import path

from .views import DealDetailView, MyDealListView

urlpatterns = [
    path("", MyDealListView.as_view(), name="deal-list"),
    path("<uuid:deal_id>", DealDetailView.as_view(), name="deal-detail"),
]
