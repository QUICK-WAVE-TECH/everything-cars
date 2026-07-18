from django.urls import path

from .views import (
    AvailableSlotsSummaryView,
    AvailableSlotsView,
    LocationsView,
    OwnerAssistanceCreateView,
    OwnerBookingCancelView,
    OwnerBookingCreateView,
    OwnerBookingListView,
    OwnerBookingRescheduleView,
    OwnerClearanceResponseView,
    PublicCentersView,
    StaffAssistanceHandleView,
    StaffAssistanceListView,
    StaffBookingDetailView,
    StaffBookingListView,
    StaffBookingNoShowView,
    StaffCenterDetailView,
    StaffClearanceResolveView,
    StaffCenterListCreateView,
    StaffInspectionDocumentsView,
    StaffInspectionStartView,
    StaffInspectionSubmitView,
    StaffSlotDetailView,
    StaffSlotListCreateView,
    StaffBookForOwnerView,
)

urlpatterns = [
    # Staff slot management
    path("slots/", StaffSlotListCreateView.as_view(), name="staff-slots"),
    path(
        "slots/<uuid:slot_id>/", StaffSlotDetailView.as_view(), name="staff-slot-detail"
    ),
    # Staff center management
    path("admin/centers/", StaffCenterListCreateView.as_view(), name="staff-centers"),
    path(
        "admin/centers/<uuid:center_id>/",
        StaffCenterDetailView.as_view(),
        name="staff-center-detail",
    ),
    # Owner location discovery & slot availability
    path("locations/", LocationsView.as_view(), name="locations"),
    path("centers/", PublicCentersView.as_view(), name="public-centers"),
    path("available-slots/", AvailableSlotsView.as_view(), name="available-slots"),
    path(
        "available-slots/summary/",
        AvailableSlotsSummaryView.as_view(),
        name="available-slots-summary",
    ),
    # Owner booking
    path("bookings/", OwnerBookingCreateView.as_view(), name="create-booking"),
    path("bookings/my/", OwnerBookingListView.as_view(), name="my-bookings"),
    path(
        "bookings/<uuid:booking_id>/cancel/",
        OwnerBookingCancelView.as_view(),
        name="cancel-booking",
    ),
    path(
        "bookings/<uuid:booking_id>/reschedule/",
        OwnerBookingRescheduleView.as_view(),
        name="reschedule-booking",
    ),
    path(
        "bookings/<uuid:booking_id>/clearance-response/",
        OwnerClearanceResponseView.as_view(),
        name="clearance-response",
    ),
    # Staff booking management & physical inspection
    path("admin/bookings/", StaffBookingListView.as_view(), name="staff-bookings"),
    path(
        "admin/bookings/<uuid:booking_id>/",
        StaffBookingDetailView.as_view(),
        name="staff-booking-detail",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/start/",
        StaffInspectionStartView.as_view(),
        name="start-inspection",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/inspection/",
        StaffInspectionSubmitView.as_view(),
        name="submit-inspection",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/no-show/",
        StaffBookingNoShowView.as_view(),
        name="no-show-booking",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/clearance/",
        StaffClearanceResolveView.as_view(),
        name="resolve-clearance",
    ),
    path(
        "admin/inspections/<uuid:inspection_id>/documents/",
        StaffInspectionDocumentsView.as_view(),
        name="inspection-documents",
    ),
    path("assistance/", OwnerAssistanceCreateView.as_view(), name="create-assistance"),
    path(
        "admin/assistance/", StaffAssistanceListView.as_view(), name="staff-assistance"
    ),
    path(
        "admin/assistance/<uuid:request_id>/handle/",
        StaffAssistanceHandleView.as_view(),
        name="handle-assistance",
    ),
    path(
        "admin/bookings/book-for-owner/",
        StaffBookForOwnerView.as_view(),
        name="staff-book-for-owner",
    ),
]
