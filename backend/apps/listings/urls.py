from django.urls import path
from .views import (
    MyCarListCreateView,
    MyCarDetailView,
    CarImageUploadView,
    MyCarStatusView,
    PublicCarListView,
    PublicCarDetailView,
    CustomerRequestListCreateView,
    CustomerRequestDetailView,
    CustomerRequestCancelView,
    OwnerRequestListView,
    OwnerRequestDetailView,
    OwnerRequestActionView,
    AdminCarListView,
    AdminCarDetailView,
    AdminCarStatusView,
)

urlpatterns = [
    # Owner car endpoints
    path("my-cars", MyCarListCreateView.as_view(), name="my-cars-list-create"),
    path("my-cars/<uuid:car_id>", MyCarDetailView.as_view(), name="my-car-detail"),
    path(
        "my-cars/<uuid:car_id>/images",
        CarImageUploadView.as_view(),
        name="my-car-images",
    ),
    path(
        "my-cars/<uuid:car_id>/status", MyCarStatusView.as_view(), name="my-car-status"
    ),
    # Public car endpoints
    path("cars", PublicCarListView.as_view(), name="public-cars-list"),
    path("cars/<uuid:car_id>", PublicCarDetailView.as_view(), name="public-car-detail"),
    # Customer request endpoints
    path("requests", CustomerRequestListCreateView.as_view(), name="customer-requests"),
    path(
        "requests/<uuid:request_id>",
        CustomerRequestDetailView.as_view(),
        name="customer-request-detail",
    ),
    path(
        "requests/<uuid:request_id>/cancel",
        CustomerRequestCancelView.as_view(),
        name="customer-request-cancel",
    ),
    # Owner request endpoints
    path("owner-requests", OwnerRequestListView.as_view(), name="owner-requests"),
    path(
        "owner-requests/<uuid:request_id>",
        OwnerRequestDetailView.as_view(),
        name="owner-request-detail",
    ),
    path(
        "owner-requests/<uuid:request_id>/action",
        OwnerRequestActionView.as_view(),
        name="owner-request-action",
    ),
    # Admin endpoints
    path("admin/cars", AdminCarListView.as_view(), name="admin-cars"),
    path("admin/cars/<uuid:car_id>", AdminCarDetailView.as_view(), name="admin-car-detail"),
    path(
        "admin/cars/<uuid:car_id>/status",
        AdminCarStatusView.as_view(),
        name="admin-car-status",
    ),
]
