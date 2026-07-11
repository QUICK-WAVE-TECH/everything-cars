from django.urls import path
from .views import (
    CustomerPaymentSubmitView,
    MyCarListCreateView,
    MyCarDetailView,
    MyCarHistoryView,
    CarImageUploadView,
    MyCarStatusView,
    PublicCarListView,
    PublicCarFilterOptionsView,
    PublicCarDetailView,
    CustomerRequestListCreateView,
    CustomerRequestDetailView,
    CustomerRequestCancelView,
    OwnerRequestListView,
    OwnerRequestDetailView,
    OwnerRequestActionView,
    AdminApproveListingView,
    AdminCarHistoryView,
    AdminCarStatusCountsView,
    AdminCarListView,
    AdminCarDetailView,
    AdminCarStatusView,
    AdminRequestListView,
    AdminRequestDetailView,
    StaffConfirmPaymentView,
    TransactionDetailView,
    TransactionListView,
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
    path(
        "my-cars/<uuid:car_id>/history",
        MyCarHistoryView.as_view(),
        name="my-car-history",
    ),
    # Public car endpoints
    path("cars", PublicCarListView.as_view(), name="public-cars-list"),
    path("cars/filter-options", PublicCarFilterOptionsView.as_view(), name="public-car-filter-options"),
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
    path("transactions", TransactionListView.as_view(), name="transaction"),
    path(
        "transactions/<uuid:transaction_id>",
        TransactionDetailView.as_view(),
        name="transaction-detail",
    ),
    path(
        "requests/<uuid:request_id>/submit-payment",
        CustomerPaymentSubmitView.as_view(),
        name="customer-submit-payment",
    ),
    # Admin endpoints
    path("admin/requests", AdminRequestListView.as_view(), name="admin-requests"),
    path(
        "admin/requests/<uuid:request_id>",
        AdminRequestDetailView.as_view(),
        name="admin-request-detail",
    ),
    path("admin/cars", AdminCarListView.as_view(), name="admin-cars"),
    path(
        "admin/cars/status-counts",
        AdminCarStatusCountsView.as_view(),
        name="admin-car-status-counts",
    ),
    path(
        "admin/cars/<uuid:car_id>",
        AdminCarDetailView.as_view(),
        name="admin-car-detail",
    ),
    path(
        "admin/cars/<uuid:car_id>/status",
        AdminCarStatusView.as_view(),
        name="admin-car-status",
    ),
    path(
        "admin/cars/<uuid:car_id>/approve-listing",
        AdminApproveListingView.as_view(),
        name="admin-approve-listing",
    ),
    path(
        "admin/cars/<uuid:car_id>/history",
        AdminCarHistoryView.as_view(),
        name="admin-car-history",
    ),
    path(
        "admin/requests/<uuid:request_id>/confirm-payment",
        StaffConfirmPaymentView.as_view(),
        name="staff-confirm-payment",
    ),
]
