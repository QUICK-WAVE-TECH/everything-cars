from django.urls import path

from .views import CarOfferCreateView

urlpatterns = [
    path("cars/<uuid:car_id>/offers", CarOfferCreateView.as_view(), name="car-offers"),
]
