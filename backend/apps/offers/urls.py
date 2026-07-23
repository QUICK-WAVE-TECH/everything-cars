from django.urls import path

from .views import (
    CarOfferCreateView,
    MyOfferListView,
    OfferRespondView,
    OfferWithdrawView,
    OwnerCarRangeView,
    OwnerOfferListView,
)

urlpatterns = [
    path("cars/<uuid:car_id>/offers", CarOfferCreateView.as_view(), name="car-offers"),
    path("cars/<uuid:car_id>/range", OwnerCarRangeView.as_view(), name="car-range"),
    path("my-offers", MyOfferListView.as_view(), name="my-offers"),
    path("owner-offers", OwnerOfferListView.as_view(), name="owner-offers"),
    path(
        "offers/<uuid:offer_id>/respond",
        OfferRespondView.as_view(),
        name="offer-respond",
    ),
    path(
        "offers/<uuid:offer_id>/withdraw",
        OfferWithdrawView.as_view(),
        name="offer-withdraw",
    ),
]
