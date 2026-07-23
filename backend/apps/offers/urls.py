from django.urls import path

from .views import CarOfferCreateView, OfferRespondView


urlpatterns = [
    path("cars/<uuid:car_id>/offers", CarOfferCreateView.as_view(), name="car-offers"),
    path(
        "offers/<uuid:offer_id>/respond",
        OfferRespondView.as_view(),
        name="offer-respond",
    ),
]
