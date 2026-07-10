from django.urls import path

from .views import (
    AvailableSlotsView,
    OwnerBookingCancelView,
    OwnerBookingCreateView,
    OwnerBookingListView,
    OwnerBookingRescheduleView,
    StaffBookingApproveView,
    StaffBookingDetailView,
    StaffBookingFailView,
    StaffBookingListView,
    StaffBookingNoShowView,
    StaffBookingPassView,
    StaffBookingRejectView,
    StaffSlotDetailView,
    StaffSlotListCreateView,
    StaffCenterListCreateView,
    StaffCenterDetailView,
    LocationsView,
    PublicCentersView,
)

urlpatterns = [
    # Staff slot management
    path("slots/", StaffSlotListCreateView.as_view(), name="staff-slots"),
    path(
        "slots/<uuid:slot_id>/", StaffSlotDetailView.as_view(), name="staff-slot-detail"
    ),
    # Owner slot availability
    path("available-slots/", AvailableSlotsView.as_view(), name="available-slots"),
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
    # Staff booking management
    path("admin/bookings/", StaffBookingListView.as_view(), name="staff-bookings"),
    path(
        "admin/bookings/<uuid:booking_id>/",
        StaffBookingDetailView.as_view(),
        name="staff-booking-detail",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/approve/",
        StaffBookingApproveView.as_view(),
        name="approve-booking",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/reject/",
        StaffBookingRejectView.as_view(),
        name="reject-booking",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/pass/",
        StaffBookingPassView.as_view(),
        name="pass-booking",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/fail/",
        StaffBookingFailView.as_view(),
        name="fail-booking",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/no-show/",
        StaffBookingNoShowView.as_view(),
        name="no-show-booking",
    ),
    path("admin/centers/", StaffCenterListCreateView.as_view(), name="staff-centers"),
    path(
        "admin/centers/<uuid:center_id>/",
        StaffCenterDetailView.as_view(),
        name="staff-center-detail",
    ),
    path("locations/", LocationsView.as_view(), name="locations"),
    path("centers/", PublicCentersView.as_view(), name="public-centers"),
]
