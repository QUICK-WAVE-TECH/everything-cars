from django.urls import path
from .views import (
    MyCarListCreateView,
    MyCarDetailView,
    CarImageUploadView,
    PublicCarListView,
    PublicCarDetailView,
)

urlpatterns = [
    # Owner endpoints
    path("my-cars", MyCarListCreateView.as_view(), name="my-cars-list-create"),
    path("my-cars/<uuid:car_id>", MyCarDetailView.as_view(), name="my-car-detail"),
    path(
        "my-cars/<uuid:car_id>/images",
        CarImageUploadView.as_view(),
        name="my-car-images",
    ),
    # Public endpoints
    path("cars", PublicCarListView.as_view(), name="public-cars-list"),
    path("cars/<uuid:car_id>", PublicCarDetailView.as_view(), name="public-car-detail"),
]
