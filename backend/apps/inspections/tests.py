import json
import uuid
from datetime import time, timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.utils import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from django.test import TestCase
from .models import (
    ACTIVE_BOOKING_STATUSES,
    BookingStatus,
    InspectionBooking,
    InspectionSlot,
)
from .models import (
    ActorRole,
    CarStatusHistory,
    InspectionCenter,
    PhysicalInspection,
    AssistanceRequest,
    FuelType,
    CarType,
    VehicleUsedCondition,
    ComponentCondition,
    InspectionResult,
)
from .services import generate_tracking_id, record_status_change

from apps.listings.models import CarStatus
from apps.listings.tests import create_car, create_owner_profile, create_user
from decimal import Decimal

from apps.inspections.models import FeeSetting


def create_slot(staff, days_ahead=7, **overrides):
    slot_date = timezone.localdate() + timedelta(days=days_ahead)
    defaults = {
        "date": slot_date,
        "start_time": time(9, 0),
        "end_time": time(10, 0),
        "capacity": 1,
        "created_by": staff,
    }
    if "center" not in overrides:
        defaults["center"] = create_center(staff)
    defaults.update(overrides)
    return InspectionSlot.objects.create(**defaults)


class StaffHistoryNamesTest(APITestCase):
    def setUp(self):
        self.staff = create_user(
            "staff-hist@test.com",
            "owner",
            is_staff=True,
            first_name="Jane",
            last_name="Doe",
        )
        self.owner = create_user("owner-hist@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.DRAFT)

    def test_staff_history_shows_name_owner_does_not(self):
        self.client.force_authenticate(user=self.staff)
        self.client.post(f"/api/v1/listings/admin/cars/{self.car.id}/approve-listing")
        staff_res = self.client.get(
            f"/api/v1/listings/admin/cars/{self.car.id}/history"
        )
        self.assertEqual(staff_res.status_code, status.HTTP_200_OK)
        self.assertEqual(staff_res.data[0]["actor_name"], "Jane Doe")

        self.client.force_authenticate(user=self.owner)
        owner_res = self.client.get(f"/api/v1/listings/my-cars/{self.car.id}/history")
        self.assertEqual(owner_res.status_code, status.HTTP_200_OK)
        # The owner still never sees a *staff* member's name — it's blank for
        # staff-role rows (business-side actor names are surfaced separately).
        self.assertEqual(owner_res.data[0]["actor_name"], "")


class StaffSlotManagementTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff@test.com", "owner", is_staff=True)
        self.center = create_center(self.staff)
        self.client.force_authenticate(user=self.staff)

    def test_per_row_capacity(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        res = self.client.post(
            "/api/v1/inspections/slots/",
            {
                "date_from": tomorrow.isoformat(),
                "date_to": tomorrow.isoformat(),
                "days": [tomorrow.weekday()],
                "time_slots": [
                    {"start_time": "09:00", "end_time": "10:00", "capacity": 3},
                    {"start_time": "10:00", "end_time": "11:00"},
                ],
                "capacity": 1,
                "center": str(self.center.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        first = InspectionSlot.objects.get(start_time=time(9, 0), date=tomorrow)
        second = InspectionSlot.objects.get(start_time=time(10, 0), date=tomorrow)
        self.assertEqual(first.capacity, 3)  # row override
        self.assertEqual(second.capacity, 1)  # falls back to top-level

    def test_create_slots_batch(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        next_week = tomorrow + timedelta(days=6)
        res = self.client.post(
            "/api/v1/inspections/slots/",
            {
                "date_from": tomorrow.isoformat(),
                "date_to": next_week.isoformat(),
                "days": [0, 1, 2, 3, 4],  # Mon-Fri
                "time_slots": [
                    {"start_time": "09:00", "end_time": "10:00"},
                    {"start_time": "10:00", "end_time": "11:00"},
                ],
                "capacity": 1,
                "center": str(self.center.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertGreater(res.data["created_count"], 0)
        # Returned slots must carry real DB ids (not null from ignore_conflicts).
        self.assertTrue(res.data["slots"])
        self.assertTrue(all(s["id"] for s in res.data["slots"]))

    def test_create_slots_rejects_too_many_days(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        res = self.client.post(
            "/api/v1/inspections/slots/",
            {
                "date_from": tomorrow.isoformat(),
                "date_to": tomorrow.isoformat(),
                "days": [0, 1, 2, 3, 4, 5, 6, 0],  # 8 items > max_length 7
                "time_slots": [{"start_time": "09:00", "end_time": "10:00"}],
                "capacity": 1,
                "center": str(self.center.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("days", res.data)

    def test_slot_list_rejects_malformed_date(self):
        res = self.client.get("/api/v1/inspections/slots/?date_from=13-2026")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_slot_list_rejects_reversed_range(self):
        today = timezone.localdate()
        res = self.client.get(
            "/api/v1/inspections/slots/"
            f"?date_from={(today + timedelta(days=5)).isoformat()}"
            f"&date_to={today.isoformat()}"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_slots_skips_existing_and_counts_accurately(self):
        # Re-running the same batch must not duplicate slots (unique constraint)
        # and created_count must reflect only newly-created rows.
        tomorrow = timezone.localdate() + timedelta(days=1)
        payload = {
            "date_from": tomorrow.isoformat(),
            "date_to": tomorrow.isoformat(),
            "days": [tomorrow.weekday()],
            "time_slots": [{"start_time": "09:00", "end_time": "10:00"}],
            "capacity": 1,
            "center": str(self.center.id),
        }
        first = self.client.post("/api/v1/inspections/slots/", payload, format="json")
        self.assertEqual(first.data["created_count"], 1)
        second = self.client.post("/api/v1/inspections/slots/", payload, format="json")
        self.assertEqual(second.data["created_count"], 0)
        self.assertEqual(
            InspectionSlot.objects.filter(
                center=self.center, date=tomorrow, start_time=time(9, 0)
            ).count(),
            1,
        )

    def test_create_slots_rejects_range_over_cap(self):
        start = timezone.localdate() + timedelta(days=1)
        end = start + timedelta(days=300)  # 301 days inclusive > 300-day cap
        res = self.client.post(
            "/api/v1/inspections/slots/",
            {
                "date_from": start.isoformat(),
                "date_to": end.isoformat(),
                "days": [0, 1, 2, 3, 4, 5, 6],
                "time_slots": [{"start_time": "09:00", "end_time": "10:00"}],
                "capacity": 1,
                "center": str(self.center.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_to", res.data)

    def test_create_slots_rejects_too_many_time_rows(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        rows = [
            {"start_time": f"{6 + i:02d}:00", "end_time": f"{6 + i:02d}:30"}
            for i in range(21)  # 21 rows > cap of 20
        ]
        res = self.client.post(
            "/api/v1/inspections/slots/",
            {
                "date_from": tomorrow.isoformat(),
                "date_to": tomorrow.isoformat(),
                "days": [tomorrow.weekday()],
                "time_slots": rows,
                "capacity": 1,
                "center": str(self.center.id),
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("time_slots", res.data)

    def test_create_slots_rejects_past_start_date(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        res = self.client.post(
            "/api/v1/inspections/slots/",
            {
                "date_from": yesterday.isoformat(),
                "date_to": yesterday.isoformat(),
                "days": [yesterday.weekday()],
                "time_slots": [{"start_time": "09:00", "end_time": "10:00"}],
                "capacity": 1,
                "center": str(self.center.id),
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_from", res.data)

    def test_create_slots_rejects_end_time_before_start_time(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        res = self.client.post(
            "/api/v1/inspections/slots/",
            {
                "date_from": tomorrow.isoformat(),
                "date_to": tomorrow.isoformat(),
                "days": [tomorrow.weekday()],
                "time_slots": [{"start_time": "10:00", "end_time": "09:00"}],
                "capacity": 1,
                "center": str(self.center.id),
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("time_slots", res.data)

    def test_list_slots(self):
        create_slot(self.staff)
        res = self.client.get("/api/v1/inspections/slots/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_deactivate_slot(self):
        slot = create_slot(self.staff)
        res = self.client.delete(f"/api/v1/inspections/slots/{slot.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        slot.refresh_from_db()
        self.assertFalse(slot.is_active)

    def test_cannot_deactivate_slot_with_approved_booking(self):
        slot = create_slot(self.staff)
        owner = create_user("owner@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner, status=CarStatus.DRAFT)
        InspectionBooking.objects.create(
            car=car, slot=slot, booked_by=owner, status=BookingStatus.APPROVED
        )
        res = self.client.delete(f"/api/v1/inspections/slots/{slot.id}/")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_non_staff_cannot_manage_slots(self):
        owner = create_user("owner2@test.com", "owner")
        self.client.force_authenticate(user=owner)
        res = self.client.get("/api/v1/inspections/slots/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_calendar_count_includes_completed_excludes_cancelled(self):
        # The staff calendar count reflects slots that were actually taken:
        # completed/no-show still count; cancelled/rejected free the slot.
        slot = create_slot(self.staff)
        owner = create_user("owner-count@test.com", "owner")
        create_owner_profile(owner)
        completed_car = create_car(owner, status=CarStatus.DRAFT)
        InspectionBooking.objects.create(
            car=completed_car,
            slot=slot,
            booked_by=owner,
            status=BookingStatus.COMPLETED,
        )
        cancelled_car = create_car(owner, status=CarStatus.DRAFT)
        InspectionBooking.objects.create(
            car=cancelled_car,
            slot=slot,
            booked_by=owner,
            status=BookingStatus.CANCELLED,
        )
        res = self.client.get("/api/v1/inspections/slots/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        row = next(s for s in res.data["results"] if s["id"] == str(slot.id))
        self.assertEqual(row["bookings_count"], 1)


class OwnerBookingTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff@test.com", "owner", is_staff=True)
        self.owner = create_user("owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.LISTING_APPROVED)
        self.center = create_center(self.staff)
        self.slot = create_slot(self.staff, center=self.center)
        self.client.force_authenticate(user=self.owner)

    def test_book_inspection(self):
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_PENDING)
        self.assertRegex(
            self.car.tracking_id, r"^NG-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$"
        )

    def test_representative_requires_consent(self):
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "attendee_type": "representative",
                "rep_name": "Jane Doe",
                "rep_id_type": "nin",
                "rep_id_number": "22334455667",
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("consent_accepted", res.data)

    def test_representative_requires_rep_fields(self):
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "attendee_type": "representative",
                "consent_accepted": True,
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rep_name", res.data)
        self.assertIn("rep_id_type", res.data)
        self.assertIn("rep_id_number", res.data)

    def test_representative_booking_stamps_consent(self):
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "attendee_type": "representative",
                "rep_name": "Jane Doe",
                "rep_id_type": "nin",
                "rep_id_number": "22334455667",
                "consent_accepted": True,
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        booking = InspectionBooking.objects.get(car=self.car)
        self.assertEqual(booking.attendee_type, "representative")
        self.assertEqual(booking.rep_name, "Jane Doe")
        self.assertIsNotNone(booking.consent_accepted_at)

    def test_booking_blocked_without_id_on_file(self):
        from apps.users.models import OwnerProfile

        owner = create_user("noid-owner@test.com", "owner")
        OwnerProfile.objects.create(
            user=owner,
            owner_type="individual",
            is_verified=True,
        )
        car = create_car(owner, status=CarStatus.LISTING_APPROVED)
        self.client.force_authenticate(user=owner)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ID verification", res.data["detail"])

    def test_cannot_book_unapproved_draft(self):
        self.car.status = CarStatus.DRAFT
        self.car.save(update_fields=["status"])
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_rebook_after_no_show(self):
        self.car.status = CarStatus.INSPECTION_NO_SHOW
        self.car.save(update_fields=["status"])
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_rebooking_keeps_tracking_id(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.car.refresh_from_db()
        original_tracking_id = self.car.tracking_id
        booking = InspectionBooking.objects.get(car=self.car)
        self.client.post(f"/api/v1/inspections/bookings/{booking.id}/cancel/")
        slot2 = create_slot(self.staff, days_ahead=9, center=self.center)
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(slot2.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.car.refresh_from_db()
        self.assertEqual(self.car.tracking_id, original_tracking_id)

    def test_reschedule_limit_from_center_policy(self):
        self.center.max_reschedules = 0
        self.center.save(update_fields=["max_reschedules"])
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        booking = InspectionBooking.objects.get(car=self.car)
        new_slot = create_slot(self.staff, days_ahead=10, center=self.center)
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/reschedule/",
            {"slot_id": str(new_slot.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_booking_writes_history(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        entry = CarStatusHistory.objects.get(car=self.car)
        self.assertEqual(entry.from_status, CarStatus.LISTING_APPROVED)
        self.assertEqual(entry.to_status, CarStatus.INSPECTION_PENDING)
        self.assertEqual(entry.actor_role, ActorRole.OWNER)

    def test_cannot_double_book_car(self):
        # After the first booking succeeds, car moves to INSPECTION_PENDING.
        # A second booking attempt is rejected because the car is no longer
        # in a bookable status (LISTING_APPROVED / INSPECTION_NO_SHOW).
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        slot2 = create_slot(self.staff, days_ahead=8)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(slot2.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        # Car is INSPECTION_PENDING → not a bookable status → 400
        self.assertIn(
            res.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT)
        )

    def test_cannot_book_full_slot(self):
        self.slot.capacity = 1
        self.slot.save()
        # Fill the slot
        other_owner = create_user("other@test.com", "owner")
        create_owner_profile(other_owner)
        other_car = create_car(other_owner, status=CarStatus.LISTING_APPROVED)
        InspectionBooking.objects.create(
            car=other_car, slot=self.slot, booked_by=other_owner
        )
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_cancel_pending_booking(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        _mark_paid(self.car)
        booking = InspectionBooking.objects.get(car=self.car)
        res = self.client.post(f"/api/v1/inspections/bookings/{booking.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        # Admin approval survives cancellation — car returns to bookable state
        self.assertEqual(self.car.status, CarStatus.LISTING_APPROVED)

    def test_cancel_notifies_staff(self):
        from apps.notifications.models import Notification

        booking = InspectionBooking.objects.create(
            car=self.car,
            slot=self.slot,
            booked_by=self.owner,
            status=BookingStatus.PENDING,
        )
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(f"/api/v1/inspections/bookings/{booking.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.staff, notification_type="inspection_cancelled"
            ).exists()
        )

    def test_reschedule_booking(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        _mark_paid(self.car)
        booking = InspectionBooking.objects.get(
            car=self.car, status=BookingStatus.PENDING
        )
        new_slot = create_slot(
            self.staff, days_ahead=10, start_time=time(14, 0), end_time=time(15, 0)
        )
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/reschedule/",
            {"slot_id": str(new_slot.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        new_booking = InspectionBooking.objects.filter(
            car=self.car, status=BookingStatus.PENDING
        ).first()
        self.assertEqual(new_booking.reschedule_count, 1)

    def test_cannot_cancel_on_appointment_day(self):
        # Build the booking directly on a today-dated slot (the create endpoint
        # would reject a slot whose start time has already passed).
        today_slot = create_slot(self.staff, days_ahead=0, center=self.center)
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        booking = InspectionBooking.objects.create(
            car=self.car, slot=today_slot, booked_by=self.owner
        )
        res = self.client.post(f"/api/v1/inspections/bookings/{booking.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("day of", res.data["detail"].lower())

    def test_cannot_reschedule_on_appointment_day(self):
        today_slot = create_slot(self.staff, days_ahead=0, center=self.center)
        future_slot = create_slot(self.staff, days_ahead=5, center=self.center)
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        booking = InspectionBooking.objects.create(
            car=self.car, slot=today_slot, booked_by=self.owner
        )
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/reschedule/",
            {"slot_id": str(future_slot.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("day of", res.data["detail"].lower())

    def test_reschedule_blocked_after_max(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        _mark_paid(self.car)
        booking = InspectionBooking.objects.get(
            car=self.car, status=BookingStatus.PENDING
        )
        booking.reschedule_count = 2
        booking.save(update_fields=["reschedule_count"])
        new_slot = create_slot(
            self.staff, days_ahead=12, start_time=time(14, 0), end_time=time(15, 0)
        )
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/reschedule/",
            {"slot_id": str(new_slot.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_my_bookings(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        res = self.client.get("/api/v1/inspections/bookings/my/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_available_slots_excludes_full(self):
        self.slot.capacity = 1
        self.slot.save()
        InspectionBooking.objects.create(
            car=self.car, slot=self.slot, booked_by=self.owner
        )
        res = self.client.get("/api/v1/inspections/available-slots/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slot_ids = [s["id"] for s in res.data]
        self.assertNotIn(str(self.slot.id), slot_ids)

    def test_available_slots_rejects_malformed_center(self):
        res = self.client.get("/api/v1/inspections/available-slots/?center=not-a-uuid")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_available_slots_rejects_malformed_date(self):
        res = self.client.get("/api/v1/inspections/available-slots/?date=13/07/2026")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_available_slots_date_range_filter(self):
        iso = self.slot.date.isoformat()
        in_range = self.client.get(
            f"/api/v1/inspections/available-slots/?date_from={iso}&date_to={iso}"
        )
        self.assertIn(str(self.slot.id), [s["id"] for s in in_range.data])
        after = (self.slot.date + timedelta(days=1)).isoformat()
        out_of_range = self.client.get(
            f"/api/v1/inspections/available-slots/?date_from={after}&date_to={after}"
        )
        self.assertNotIn(str(self.slot.id), [s["id"] for s in out_of_range.data])

    def test_available_slots_rejects_oversized_range(self):
        start = timezone.localdate()
        end = start + timedelta(days=366)  # exceeds the 365-day window
        res = self.client.get(
            "/api/v1/inspections/available-slots/"
            f"?date_from={start.isoformat()}&date_to={end.isoformat()}"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_available_slots_default_window_excludes_far_future(self):
        # A bare call is bounded to the default look-ahead; a slot 400 days out
        # is excluded, while the near slot from setUp is still returned.
        far = create_slot(self.staff, center=self.center, days_ahead=400)
        res = self.client.get(
            f"/api/v1/inspections/available-slots/?center={self.center.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [s["id"] for s in res.data]
        self.assertIn(str(self.slot.id), ids)
        self.assertNotIn(str(far.id), ids)

    def test_availability_summary_counts_open_slots_per_day(self):
        # Two open slots on one day, a second day with one slot that is full —
        # the summary counts only open slots and omits fully-booked days.
        create_slot(
            self.staff,
            center=self.center,
            days_ahead=7,
            start_time=time(14, 0),
            end_time=time(15, 0),
        )
        full_slot = create_slot(self.staff, center=self.center, days_ahead=8)
        full_slot.capacity = 1
        full_slot.save(update_fields=["capacity"])
        blocker_car = create_car(self.owner, status=CarStatus.DRAFT)
        InspectionBooking.objects.create(
            car=blocker_car, slot=full_slot, booked_by=self.owner
        )
        res = self.client.get(
            f"/api/v1/inspections/available-slots/summary/?center={self.center.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        by_date = {str(row["date"]): row["open_count"] for row in res.data}
        self.assertEqual(by_date.get(self.slot.date.isoformat()), 2)
        self.assertNotIn(full_slot.date.isoformat(), by_date)

    def test_availability_summary_validates_params(self):
        res = self.client.get(
            "/api/v1/inspections/available-slots/summary/?center=nope"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        start = timezone.localdate()
        res = self.client.get(
            "/api/v1/inspections/available-slots/summary/"
            f"?date_from={(start + timedelta(days=181)).isoformat()}&date_to={start.isoformat()}"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_available_slots_rejects_reversed_range(self):
        start = timezone.localdate()
        res = self.client.get(
            "/api/v1/inspections/available-slots/"
            f"?date_from={(start + timedelta(days=5)).isoformat()}"
            f"&date_to={start.isoformat()}"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def _make_representative_booking(self):
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        return InspectionBooking.objects.create(
            car=self.car,
            slot=self.slot,
            booked_by=self.owner,
            status=BookingStatus.PENDING,
            attendee_type="representative",
            rep_name="Jane Rep",
            rep_id_type="nin",
            rep_id_number="99887766",
            consent_accepted_at=timezone.now(),
        )

    def test_reschedule_preserves_representative(self):
        # Rescheduling moves the same appointment — the representative
        # declaration must carry over, not reset to the owner.
        booking = self._make_representative_booking()
        original_consent = booking.consent_accepted_at
        new_slot = create_slot(self.staff, center=self.center, days_ahead=10)
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/reschedule/",
            {"slot_id": str(new_slot.id), "consent_accepted": True},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        new_booking = InspectionBooking.objects.get(slot=new_slot, car=self.car)
        self.assertEqual(new_booking.attendee_type, "representative")
        self.assertEqual(new_booking.rep_name, "Jane Rep")
        self.assertEqual(new_booking.rep_id_type, "nin")
        self.assertEqual(new_booking.rep_id_number, "99887766")
        # Consent is re-captured for the new date, not the old timestamp.
        self.assertIsNotNone(new_booking.consent_accepted_at)
        self.assertGreaterEqual(new_booking.consent_accepted_at, original_consent)

    def test_reschedule_representative_requires_consent(self):
        booking = self._make_representative_booking()
        new_slot = create_slot(self.staff, center=self.center, days_ahead=10)
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/reschedule/",
            {"slot_id": str(new_slot.id)},  # no consent_accepted
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("consent_accepted", res.data)
        # The original booking is untouched — no new booking created.
        self.assertFalse(InspectionBooking.objects.filter(slot=new_slot).exists())

    def test_reschedule_self_booking_needs_no_consent(self):
        # A self booking reschedules without any consent field.
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        booking = InspectionBooking.objects.create(
            car=self.car,
            slot=self.slot,
            booked_by=self.owner,
            status=BookingStatus.PENDING,
        )
        new_slot = create_slot(self.staff, center=self.center, days_ahead=10)
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/reschedule/",
            {"slot_id": str(new_slot.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        new_booking = InspectionBooking.objects.get(slot=new_slot, car=self.car)
        self.assertIsNone(new_booking.consent_accepted_at)


class TeamMemberBookingTest(APITestCase):
    """A team member has no owner_profile of their own, yet must be able to
    manage inspection bookings for cars in their assigned branches. The booking
    belongs to the business (the branch owner), whose verified ID satisfies the
    on-file gate."""

    def setUp(self):
        from apps.listings.models import Branch
        from apps.listings.tests import create_fleet_owner_profile
        from apps.users.models import TeamMembership

        self.staff = create_user("tm-staff@test.com", "owner", is_staff=True)
        self.center = create_center(self.staff)
        self.slot = create_slot(self.staff, center=self.center)

        self.owner = create_user("tm-owner@test.com", "owner")
        self.profile = create_fleet_owner_profile(self.owner)
        self.b1 = Branch.objects.create(
            business=self.profile, name="A", state="Lagos",
            city="Ikeja", street_address="1", phone="+2340000000000", email="a@x.ng",
        )
        self.b2 = Branch.objects.create(
            business=self.profile, name="B", state="Oyo",
            city="Ibadan", street_address="2", phone="+2340000000002", email="b@x.ng",
        )
        self.car1 = create_car(
            self.owner, branch=self.b1, status=CarStatus.LISTING_APPROVED
        )
        self.car2 = create_car(
            self.owner, branch=self.b2, status=CarStatus.LISTING_APPROVED
        )

        # Team member assigned to b1 only, with no owner_profile / ID of their own.
        self.member = create_user("tm-member@test.com", "team_member")
        m = TeamMembership.objects.create(user=self.member, business=self.profile)
        m.branches.set([self.b1])

    def test_member_books_using_business_identity(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car1.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        booking = InspectionBooking.objects.get(car=self.car1)
        # The booking belongs to the business, not the acting team member.
        self.assertEqual(booking.booked_by, self.owner)
        self.car1.refresh_from_db()
        self.assertEqual(self.car1.status, CarStatus.INSPECTION_PENDING)

    def test_member_cannot_book_car_outside_assigned_branch(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car2.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(InspectionBooking.objects.filter(car=self.car2).exists())

    def test_member_booking_blocked_when_business_has_no_id(self):
        # Strip the business's ID document — the on-file gate must now block.
        self.profile.id_type = ""
        self.profile.id_document = ""
        self.profile.save(update_fields=["id_type", "id_document"])
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car1.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("business account", res.data["detail"].lower())

    def test_member_lists_only_assigned_branch_bookings(self):
        b1_booking = InspectionBooking.objects.create(
            car=self.car1, slot=self.slot, booked_by=self.owner
        )
        InspectionBooking.objects.create(
            car=self.car2, slot=self.slot, booked_by=self.owner
        )
        self.client.force_authenticate(self.member)
        res = self.client.get("/api/v1/inspections/bookings/my/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [b["id"] for b in res.data["results"]]
        self.assertIn(str(b1_booking.id), ids)
        self.assertEqual(len(ids), 1)

    def test_member_cancels_own_branch_booking(self):
        self.car1.status = CarStatus.INSPECTION_PENDING
        self.car1.save(update_fields=["status"])
        booking = InspectionBooking.objects.create(
            car=self.car1,
            slot=self.slot,
            booked_by=self.owner,
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/cancel/"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CANCELLED)

    def test_member_cannot_cancel_other_branch_booking(self):
        self.car2.status = CarStatus.INSPECTION_PENDING
        self.car2.save(update_fields=["status"])
        booking = InspectionBooking.objects.create(
            car=self.car2,
            slot=self.slot,
            booked_by=self.owner,
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(self.member)
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/cancel/"
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # ── Read-side access: the booking flow's supporting endpoints must serve
    # team members too, or the location/center/date steps are a dead end. ──

    def test_member_can_read_locations(self):
        self.client.force_authenticate(self.member)
        res = self.client.get("/api/v1/inspections/locations/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        countries = {row["country"] for row in res.data}
        self.assertIn("NG", countries)

    def test_member_can_read_centers_by_city(self):
        self.client.force_authenticate(self.member)
        res = self.client.get(
            "/api/v1/inspections/centers/?country=NG&state=Lagos&city=Lagos"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)

    def test_member_can_read_available_slots_summary(self):
        self.client.force_authenticate(self.member)
        res = self.client.get(
            f"/api/v1/inspections/available-slots/summary/?center={self.center.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_member_can_read_fee_quote(self):
        self.client.force_authenticate(self.member)
        res = self.client.get("/api/v1/inspections/bookings/fee-quote/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_member_assistance_request_belongs_to_business(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/v1/inspections/assistance/",
            {"car_id": str(self.car1.id), "message": "Please book for me"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        from apps.inspections.models import AssistanceRequest

        req = AssistanceRequest.objects.get(car=self.car1)
        self.assertEqual(req.owner, self.owner)

    def test_member_cannot_raise_assistance_for_other_branch_car(self):
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/v1/inspections/assistance/",
            {"car_id": str(self.car2.id), "message": "Please book for me"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_can_run_full_inspection_flow_on_member_booking(self):
        # A team member's booking must be a first-class booking: staff confirm
        # the payment, then start the inspection — exactly like an owner booking.
        self.client.force_authenticate(self.member)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car1.id),
                "slot_id": str(self.slot.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        booking = InspectionBooking.objects.get(car=self.car1)
        self.assertEqual(booking.status, BookingStatus.AWAITING_PAYMENT)

        # Staff can only start once the payment is confirmed.
        self.client.force_authenticate(self.staff)
        early = self.client.post(
            f"/api/v1/inspections/admin/bookings/{booking.id}/start/"
        )
        self.assertEqual(early.status_code, status.HTTP_400_BAD_REQUEST)

        confirm = self.client.post(
            f"/api/v1/inspections/admin/bookings/{booking.id}/confirm-payment/"
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)

        started = self.client.post(
            f"/api/v1/inspections/admin/bookings/{booking.id}/start/"
        )
        self.assertEqual(started.status_code, status.HTTP_200_OK)
        self.car1.refresh_from_db()
        self.assertEqual(self.car1.status, CarStatus.INSPECTION_IN_PROGRESS)


def inspection_form_payload(**overrides):
    base = {
        "condition": "used",
        "mileage": 42000,
        "fuel_type": "petrol",
        "car_type": "foreign_used",
        "features": ["ABS", "sunroof"],
        "engine_condition": "good",
        "chassis_condition": "excellent",
        "ac_condition": "good",
        "is_flooded": False,
        "has_accident_history": False,
        "staff_notes": "",
        "result": "passed",
        "presented_attendee": "owner",
        "presented_id_type": "nin",
        "presented_id_number": "22334455667",
    }
    base.update(overrides)
    return base


def inspection_document_payload():
    return {
        "car_documents": SimpleUploadedFile(
            "docs.pdf", b"dummy-doc", content_type="application/pdf"
        ),
        "receipt_upload": SimpleUploadedFile(
            "receipt.pdf", b"dummy-receipt", content_type="application/pdf"
        ),
        "custom_duty_status": "fully_paid",
        "receipt_type": "dealership",
    }


def inspection_form_with_documents(**overrides):
    payload = inspection_form_payload(**overrides)
    payload["features"] = json.dumps(payload["features"])
    payload.update(inspection_document_payload())
    return payload


class StaffInspectionFlowTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff@test.com", "owner", is_staff=True)
        self.owner = create_user("owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.INSPECTION_PENDING)
        self.slot = create_slot(self.staff)
        self.booking = InspectionBooking.objects.create(
            car=self.car, slot=self.slot, booked_by=self.owner
        )
        self.client.force_authenticate(user=self.staff)

    def _start(self):
        return self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/start/"
        )

    def _submit(self, **overrides):
        return self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/inspection/",
            inspection_form_payload(**overrides),
            format="json",
        )

    def _submit_with_documents(self, **overrides):
        return self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/inspection/",
            inspection_form_with_documents(**overrides),
            format="multipart",
        )

    def test_start_inspection(self):
        res = self._start()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_IN_PROGRESS)

    def test_cannot_submit_before_start(self):
        res = self._submit()
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_passed_inspection_alerts_publishers_not_inspectors(self):
        from django.core import mail
        publisher = create_user("flow-pub@test.com", "owner", is_staff=True,
            staff_role="publisher")
        inspector = create_user("flow-insp@test.com", "owner", is_staff=True,
            staff_role="inspector")
        self._start()
        mail.outbox = []
        with self.captureOnCommitCallbacks(execute=True):
            res = self._submit_with_documents(result="passed")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        recipients = {addr for m in mail.outbox for addr in m.to}
        assert "flow-pub@test.com" in recipients        # publisher alerted
        assert "flow-insp@test.com" not in recipients   # inspector is not
        assert publisher.notifications.filter(title__icontains="ready to publish").exists()
        assert not inspector.notifications.filter(title__icontains="ready to publish").exists()

    def test_submit_logs_created_edit_event(self):
        from apps.inspections.models import InspectionEditEvent

        self._start()
        res = self._submit_with_documents(result="passed")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        insp = PhysicalInspection.objects.get(booking=self.booking)
        events = InspectionEditEvent.objects.filter(inspection=insp)
        self.assertEqual(events.count(), 1)
        ev = events.first()
        self.assertEqual(ev.action, "created")
        self.assertEqual(ev.editor, self.staff)

    def test_submit_passed_moves_to_pending_publishing(self):
        self._start()
        res = self._submit_with_documents(result="passed")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.car.refresh_from_db()
        # Two-stage flow: a passed inspection awaits a publisher, not live yet.
        self.assertEqual(self.car.status, CarStatus.PENDING_PUBLISHING)
        self.assertIsNone(self.car.published_at)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.COMPLETED)
        inspection = PhysicalInspection.objects.get(booking=self.booking)
        self.assertEqual(inspection.inspector, self.staff)

    def test_passed_sale_car_requires_documents(self):
        self._start()
        res = self._submit(result="passed")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.car.refresh_from_db()
        self.booking.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_IN_PROGRESS)
        self.assertEqual(self.booking.status, BookingStatus.PENDING)

    def test_needs_clearance_requires_note(self):
        self._start()
        res = self._submit(result="needs_clearance", staff_notes="")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("staff_notes", res.data)

    def test_needs_clearance_with_note(self):
        self._start()
        res = self._submit_with_documents(
            result="needs_clearance", staff_notes="Customs papers missing"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.NEEDS_CLEARANCE)
        self.assertEqual(self.car.admin_note, "Customs papers missing")

    def test_failed_inspection(self):
        self._start()
        res = self._submit(result="failed", staff_notes="Chassis damage")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_REJECTED)

    def test_cannot_submit_twice(self):
        self._start()
        self._submit_with_documents(result="passed")
        # a fresh booking would be needed; same booking must 400 (completed)
        res = self._submit_with_documents(result="passed")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submissions_write_history(self):
        self._start()
        self._submit_with_documents(result="passed")
        transitions = list(self.car.status_history.values_list("to_status", flat=True))
        self.assertEqual(
            transitions,
            [CarStatus.INSPECTION_IN_PROGRESS, CarStatus.PENDING_PUBLISHING],
        )

    def test_mark_no_show(self):
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/no-show/"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_NO_SHOW)

    def test_non_staff_cannot_inspect(self):
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(self._start().status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self._submit().status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_list_bookings(self):
        res = self.client.get("/api/v1/inspections/admin/bookings/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_staff_booking_detail(self):
        res = self.client.get(f"/api/v1/inspections/admin/bookings/{self.booking.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("car", res.data)

    def test_staff_bookings_list_rejects_malformed_date(self):
        res = self.client.get("/api/v1/inspections/admin/bookings/?date=notadate")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_representative_requires_presented_id(self):
        self._start()
        res = self._submit(
            result="passed",
            presented_attendee="representative",
            presented_id_type="",
            presented_id_number="",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("presented_id_type", res.data)

    def test_owner_does_not_require_presented_id(self):
        # The owner's ID is already on file from sign-up.
        self._start()
        res = self._submit_with_documents(
            result="passed",
            presented_attendee="owner",
            presented_id_type="",
            presented_id_number="",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_failed_allows_missing_presented_id(self):
        self._start()
        res = self._submit(
            result="failed",
            staff_notes="Engine seized",
            presented_attendee="",
            presented_id_type="",
            presented_id_number="",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_passed_requires_presented_attendee(self):
        self._start()
        res = self._submit(result="passed", presented_attendee="")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("presented_attendee", res.data)

    def test_other_attendee_is_rejected(self):
        # Only the owner or the declared representative may attend.
        self._start()
        res = self._submit(result="passed", presented_attendee="other")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("presented_attendee", res.data)

    def test_presented_attendee_is_stored(self):
        self._start()
        res = self._submit_with_documents(result="passed")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        insp = PhysicalInspection.objects.get(car=self.car)
        self.assertEqual(insp.presented_attendee, "owner")

    def test_booking_detail_exposes_inspection_record(self):
        self._start()
        self._submit_with_documents(result="passed")
        res = self.client.get(f"/api/v1/inspections/admin/bookings/{self.booking.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data["inspection"])
        self.assertEqual(res.data["inspection"]["presented_attendee"], "owner")
        self.assertEqual(res.data["inspection"]["presented_id_number"], "22334455667")
        # Sale-car documents are surfaced for staff review.
        self.assertIsNotNone(res.data["inspection"]["documents"])
        self.assertTrue(res.data["inspection"]["documents"]["car_documents"])

    def test_presented_id_is_stored(self):
        self._start()
        res = self._submit_with_documents(result="passed")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        insp = PhysicalInspection.objects.get(car=self.car)
        self.assertEqual(insp.presented_id_type, "nin")
        self.assertEqual(insp.presented_id_number, "22334455667")

    def test_presented_id_never_leaks_to_owner(self):
        self._start()
        self._submit_with_documents(result="passed")
        self.client.force_authenticate(user=self.owner)
        res = self.client.get(f"/api/v1/inspections/bookings/my/?car={self.car.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertNotIn("presented_id", json.dumps(res.data))


class InspectionDocumentsTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-doc@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-doc@test.com", "owner")
        create_owner_profile(self.owner)
        self.client.force_authenticate(user=self.staff)

    def _make_inspection(self, car):
        slot = create_slot(self.staff)
        booking = InspectionBooking.objects.create(
            car=car, slot=slot, booked_by=self.owner
        )
        car.status = CarStatus.INSPECTION_PENDING
        car.save(update_fields=["status"])
        self.client.post(f"/api/v1/inspections/admin/bookings/{booking.id}/start/")
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{booking.id}/inspection/",
            inspection_form_payload(
                result="failed", staff_notes="Legacy document upload test"
            ),
            format="json",
        )
        return res.data["id"]

    def _doc_payload(self):
        return inspection_document_payload()

    def test_upload_documents_for_sale_car(self):
        car = create_car(self.owner)  # default listing has a sale price
        inspection_id = self._make_inspection(car)
        res = self.client.post(
            f"/api/v1/inspections/admin/inspections/{inspection_id}/documents/",
            self._doc_payload(),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["custom_duty_status"], "fully_paid")

    def test_documents_rejected_for_rental_only_car(self):
        car = create_car(
            self.owner,
            listing_type="rent",
            sale_price=None,
            rent_price_per_day="25000.00",
        )
        inspection_id = self._make_inspection(car)
        res = self.client.post(
            f"/api/v1/inspections/admin/inspections/{inspection_id}/documents/",
            self._doc_payload(),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_documents_conflict(self):
        car = create_car(self.owner)
        inspection_id = self._make_inspection(car)
        self.client.post(
            f"/api/v1/inspections/admin/inspections/{inspection_id}/documents/",
            self._doc_payload(),
            format="multipart",
        )
        res = self.client.post(
            f"/api/v1/inspections/admin/inspections/{inspection_id}/documents/",
            self._doc_payload(),
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)


def create_center(staff, **overrides):
    defaults = {
        "company_name": "Car 45",
        "address": "12 Marina Rd",
        "country": "NG",
        "country_code": "NG",
        "state": "Lagos",
        "city": "Lagos",
        "city_code": "LOS",
        "created_by": staff,
    }
    defaults.update(overrides)
    return InspectionCenter.objects.create(**defaults)


class StatusChangeServiceTest(TestCase):
    def setUp(self):
        self.owner = create_user("owner-svc@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.DRAFT)

    def test_records_history_and_updates_car(self):
        record_status_change(
            self.car,
            CarStatus.LISTING_APPROVED,
            actor=self.owner,
            actor_role=ActorRole.STAFF,
            note="Looks good",
        )
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.LISTING_APPROVED)

        entry = CarStatusHistory.objects.get(car=self.car)
        self.assertEqual(entry.from_status, CarStatus.DRAFT)
        self.assertEqual(entry.to_status, CarStatus.LISTING_APPROVED)
        self.assertEqual(entry.actor_role, ActorRole.STAFF)
        self.assertEqual(entry.note, "Looks good")

    def test_default_actor_is_system(self):
        record_status_change(self.car, CarStatus.PUBLISHED)
        entry = CarStatusHistory.objects.get(car=self.car)
        self.assertEqual(entry.actor_role, ActorRole.SYSTEM)
        self.assertIsNone(entry.actor)


class TrackingIdTest(TestCase):
    def setUp(self):
        self.staff = create_user("staff-tid@test.com", "owner", is_staff=True)
        self.center = create_center(self.staff)

    def test_format(self):
        # Country code + 6 unambiguous alphanumerics (no I/O/L/0/1).
        tid = generate_tracking_id(self.center)
        self.assertRegex(tid, r"^NG-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$")

    def test_skips_existing_ids(self):
        owner = create_user("owner-tid@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner)
        car.tracking_id = generate_tracking_id(self.center)
        car.save(update_fields=["tracking_id"])
        self.assertNotEqual(generate_tracking_id(self.center), car.tracking_id)


class StaffCenterCrudTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-center@test.com", "owner", is_staff=True)
        self.client.force_authenticate(user=self.staff)

    def _payload(self, **overrides):
        base = {
            "company_name": "Car 45",
            "address": "12 Marina Rd",
            "country": "NG",
            "country_code": "ng",
            "state": "Lagos",
            "city": "Lagos",
            "city_code": "los",
            "max_reschedules": 2,
        }
        return {**base, **overrides}

    def test_create_center_normalizes_codes(self):
        res = self.client.post(
            "/api/v1/inspections/admin/centers/", self._payload(), format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["country_code"], "NG")
        self.assertEqual(res.data["city_code"], "LOS")

    def test_create_rejects_bad_city_code(self):
        res = self.client.post(
            "/api/v1/inspections/admin/centers/",
            self._payload(city_code="LAGOS"),
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("city_code", res.data)

    def test_non_staff_forbidden(self):
        owner = create_user("owner@test.com", "owner")
        self.client.force_authenticate(user=owner)
        res = self.client.post(
            "/api/v1/inspections/admin/centers/",
            self._payload(),
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_centers(self):
        create_center(self.staff)
        create_center(self.staff, company_name="AutoHub", city="Abuja", city_code="ABJ")
        res = self.client.get("/api/v1/inspections/admin/centers/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 2)

    def test_deactivate_center(self):
        center = create_center(self.staff)
        res = self.client.patch(
            f"/api/v1/inspections/admin/centers/{center.id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["is_active"])

    def test_delete_center_cancels_upcoming_keeps_past_and_notifies(self):
        from datetime import timedelta as td
        from django.core import mail
        from django.utils import timezone as tz

        owner = create_user("dc-owner@test.com", "owner")
        create_owner_profile(owner)
        center = create_center(self.staff)

        # Upcoming booking (future date, pending) — should be cancelled.
        future_slot = create_slot(self.staff, center=center, days_ahead=7)
        upcoming_car = create_car(owner, status=CarStatus.INSPECTION_PENDING)
        upcoming = InspectionBooking.objects.create(
            car=upcoming_car, slot=future_slot, booked_by=owner,
            status=BookingStatus.PENDING,
        )
        # Past booking (completed) — should be kept.
        past_slot = create_slot(self.staff, center=center, days_ahead=20)
        InspectionSlot.objects.filter(pk=past_slot.pk).update(
            date=tz.localdate() - td(days=10)
        )
        past_car = create_car(
            owner, status=CarStatus.PUBLISHED, vin="1HGCM82633A9PAST1",
            plate_number="PAST01XY",
        )
        past = InspectionBooking.objects.create(
            car=past_car, slot=past_slot, booked_by=owner,
            status=BookingStatus.COMPLETED,
        )

        mail.outbox = []
        self.client.force_authenticate(self.staff)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.delete(
                f"/api/v1/inspections/admin/centers/{center.id}/"
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["cancelled"], 1)

        # Centre gone; slots survive (SET_NULL); past booking kept.
        self.assertFalse(InspectionCenter.objects.filter(id=center.id).exists())
        upcoming.refresh_from_db()
        self.assertEqual(upcoming.status, BookingStatus.CANCELLED)
        past.refresh_from_db()
        self.assertEqual(past.status, BookingStatus.COMPLETED)
        upcoming_car.refresh_from_db()
        self.assertEqual(upcoming_car.status, CarStatus.LISTING_APPROVED)
        # The owner was emailed about the cancelled upcoming appointment.
        self.assertTrue(any(owner.email in m.to for m in mail.outbox))

    def test_delete_center_non_staff_forbidden(self):
        center = create_center(self.staff)
        owner = create_user("dc-intruder@test.com", "owner")
        self.client.force_authenticate(user=owner)
        res = self.client.delete(
            f"/api/v1/inspections/admin/centers/{center.id}/"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class LocationDiscoveryTest(APITestCase):

    def setUp(self):
        self.owner = create_user("owner-loc@test.com", "owner")
        create_owner_profile(self.owner)
        self.client.force_authenticate(user=self.owner)

        staff = create_user("staff-loc@test.com", "owner", is_staff=True)
        self.lagos = create_center(staff)
        self.abuja = create_center(staff, state="FCT", city="Abuja", city_code="ABJ")

        self.inactive = create_center(
            staff,
            company_name="Closed Co",
            state="Kano",
            is_active=False,
            city="kano",
            city_code="KAN",
        )

    def test_location_tree_excludes_inactive(self):
        res = self.client.get("/api/v1/inspections/locations/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)  # one country: NG
        ng = res.data[0]
        self.assertEqual(ng["country"], "NG")
        self.assertEqual(ng["country_name"], "Nigeria")
        states = {s["state"] for s in ng["states"]}
        self.assertEqual(states, {"Lagos", "FCT"})  # Kano absent — inactive center
        lagos_state = next(s for s in ng["states"] if s["state"] == "Lagos")
        self.assertIn("Lagos", lagos_state["cities"])

    def test_centers_filtered_by_city(self):
        res = self.client.get("/api/v1/inspections/centers/?city=Lagos")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["company_name"], "Car 45")

    def test_centers_city_filter_case_insensitive(self):
        res = self.client.get("/api/v1/inspections/centers/?city=lagos")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_inactive_centers_hidden(self):
        res = self.client.get("/api/v1/inspections/centers/?city=Kano")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)


class ClearanceResponseTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-clr@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-clr@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.INSPECTION_PENDING)
        self.slot = create_slot(self.staff)
        self.booking = InspectionBooking.objects.create(
            car=self.car, slot=self.slot, booked_by=self.owner
        )
        # run the inspection to needs_clearance
        self.client.force_authenticate(user=self.staff)
        self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/start/")
        self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/inspection/",
            inspection_form_with_documents(
                result="needs_clearance", staff_notes="Customs papers missing"
            ),
            format="multipart",
        )
        self.client.force_authenticate(user=self.owner)

    def test_clearance_response_recorded(self):
        res = self.client.post(
            f"/api/v1/inspections/bookings/{self.booking.id}/clearance-response/",
            {"message": "Uploaded the customs papers to my listing."},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        entry = self.car.status_history.latest("created_at")
        self.assertEqual(entry.actor_role, ActorRole.OWNER)
        self.assertEqual(entry.from_status, CarStatus.NEEDS_CLEARANCE)
        self.assertEqual(entry.to_status, CarStatus.NEEDS_CLEARANCE)

    def test_message_required(self):
        res = self.client.post(
            f"/api/v1/inspections/bookings/{self.booking.id}/clearance-response/",
            {},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejected_when_not_needs_clearance(self):
        self.car.status = CarStatus.PUBLISHED
        self.car.save(update_fields=["status"])
        res = self.client.post(
            f"/api/v1/inspections/bookings/{self.booking.id}/clearance-response/",
            {"message": "done"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ReviewFixesTest(APITestCase):
    """Guards for the race/dead-end fixes from code review."""

    def setUp(self):
        self.staff = create_user("staff-fix@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-fix@test.com", "owner")
        create_owner_profile(self.owner)
        self.center = create_center(self.staff)
        self.car = create_car(self.owner, status=CarStatus.INSPECTION_PENDING)
        self.slot = create_slot(self.staff, center=self.center)
        self.booking = InspectionBooking.objects.create(
            car=self.car, slot=self.slot, booked_by=self.owner
        )

    def _start_inspection(self):
        self.client.force_authenticate(user=self.staff)
        self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/start/")

    def test_cannot_cancel_mid_inspection(self):
        self._start_inspection()
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            f"/api/v1/inspections/bookings/{self.booking.id}/cancel/"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_reschedule_mid_inspection(self):
        self._start_inspection()
        self.client.force_authenticate(user=self.owner)
        new_slot = create_slot(self.staff, days_ahead=10, center=self.center)
        res = self.client.post(
            f"/api/v1/inspections/bookings/{self.booking.id}/reschedule/",
            {"slot_id": str(new_slot.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_mark_no_show_mid_inspection(self):
        self._start_inspection()
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/no-show/"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rebook_cap_blocks_cancel_rebook_loop(self):
        self.center.max_reschedules = 0
        self.center.save(update_fields=["max_reschedules"])
        self.client.force_authenticate(user=self.owner)
        # cancel the pending booking → car back to listing_approved
        self.client.post(f"/api/v1/inspections/bookings/{self.booking.id}/cancel/")
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.LISTING_APPROVED)
        # rebooking counts as a reschedule → cap 0 blocks it
        slot2 = create_slot(self.staff, days_ahead=9, center=self.center)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(slot2.id),
                "receipt": _receipt(),
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ClearanceResolutionTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-res@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-res@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.INSPECTION_PENDING)
        self.slot = create_slot(self.staff)
        self.booking = InspectionBooking.objects.create(
            car=self.car, slot=self.slot, booked_by=self.owner
        )
        self.client.force_authenticate(user=self.staff)
        self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/start/")
        self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/inspection/",
            inspection_form_with_documents(
                result="needs_clearance", staff_notes="Customs docs missing"
            ),
            format="multipart",
        )

    def test_publish_after_clearance(self):
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/clearance/",
            {"action": "publish"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.PUBLISHED)
        self.assertIsNotNone(self.car.published_at)

    def test_reject_requires_note(self):
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/clearance/",
            {"action": "reject"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_with_note(self):
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/clearance/",
            {"action": "reject", "staff_note": "Docs never provided"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_REJECTED)

    def test_rejected_when_not_needs_clearance(self):
        self.car.status = CarStatus.PUBLISHED
        self.car.save(update_fields=["status"])
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/clearance/",
            {"action": "publish"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class AvailableSlotShapeTest(APITestCase):
    def test_available_slot_nests_center_object(self):
        staff = create_user("staff-shape@test.com", "owner", is_staff=True)
        owner = create_user("owner-shape@test.com", "owner")
        create_owner_profile(owner)
        center = create_center(staff)
        create_slot(staff, center=center)
        self.client.force_authenticate(user=owner)
        res = self.client.get(
            f"/api/v1/inspections/available-slots/?center={center.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["center"]["company_name"], "Car 45")
        self.assertEqual(res.data[0]["center"]["city_code"], "LOS")


class AdminCarHistoryTest(APITestCase):
    def test_staff_sees_owner_clearance_responses(self):
        staff = create_user("staff-hist2@test.com", "owner", is_staff=True)
        owner = create_user("owner-hist2@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner, status=CarStatus.INSPECTION_PENDING)
        slot = create_slot(staff)
        booking = InspectionBooking.objects.create(car=car, slot=slot, booked_by=owner)
        client = self.client
        client.force_authenticate(user=staff)
        client.post(f"/api/v1/inspections/admin/bookings/{booking.id}/start/")
        client.post(
            f"/api/v1/inspections/admin/bookings/{booking.id}/inspection/",
            inspection_form_with_documents(
                result="needs_clearance", staff_notes="Customs docs missing"
            ),
            format="multipart",
        )
        client.force_authenticate(user=owner)
        client.post(
            f"/api/v1/inspections/bookings/{booking.id}/clearance-response/",
            {"message": "Uploaded the customs documents"},
            format="json",
        )
        client.force_authenticate(user=staff)
        res = client.get(f"/api/v1/listings/admin/cars/{car.id}/history")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        notes = [e["note"] for e in res.data]
        self.assertIn("Uploaded the customs documents", notes)

    def test_owner_cannot_access_admin_history(self):
        owner = create_user("owner-hist3@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner)
        self.client.force_authenticate(user=owner)
        res = self.client.get(f"/api/v1/listings/admin/cars/{car.id}/history")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class CycleCountResetTest(APITestCase):
    def test_new_cycle_starts_at_zero_reschedules(self):
        staff = create_user("staff-cycle@test.com", "owner", is_staff=True)
        owner = create_user("owner-cycle@test.com", "owner")
        create_owner_profile(owner)
        center = create_center(staff)
        car = create_car(owner, status=CarStatus.LISTING_APPROVED)
        old_slot = create_slot(staff, center=center)
        # Previous cycle ended with a completed inspection at the cap
        InspectionBooking.objects.create(
            car=car,
            slot=old_slot,
            booked_by=owner,
            status=BookingStatus.COMPLETED,
            reschedule_count=2,
        )
        new_slot = create_slot(staff, days_ahead=9, center=center)
        self.client.force_authenticate(user=owner)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {"car_id": str(car.id), "slot_id": str(new_slot.id), "receipt": _receipt()},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        _mark_paid(car)
        booking = InspectionBooking.objects.get(car=car, status=BookingStatus.PENDING)
        self.assertEqual(booking.reschedule_count, 0)


class ClearanceResolveGuardTest(APITestCase):
    def test_cannot_resolve_via_cancelled_booking(self):
        staff = create_user("staff-crg@test.com", "owner", is_staff=True)
        owner = create_user("owner-crg@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner, status=CarStatus.NEEDS_CLEARANCE)
        slot = create_slot(staff)
        cancelled = InspectionBooking.objects.create(
            car=car, slot=slot, booked_by=owner, status=BookingStatus.CANCELLED
        )
        self.client.force_authenticate(user=staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{cancelled.id}/clearance/",
            {"action": "publish"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_updates_booking_staff_note(self):
        staff = create_user("staff-crg2@test.com", "owner", is_staff=True)
        owner = create_user("owner-crg2@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner, status=CarStatus.NEEDS_CLEARANCE)
        slot = create_slot(staff)
        booking = InspectionBooking.objects.create(
            car=car,
            slot=slot,
            booked_by=owner,
            status=BookingStatus.COMPLETED,
            staff_note="old clearance note",
        )
        self.client.force_authenticate(user=staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{booking.id}/clearance/",
            {"action": "reject", "staff_note": "Docs never provided"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.staff_note, "Docs never provided")


class BookingCarFilterValidationTest(APITestCase):
    def test_malformed_car_uuid_returns_400(self):
        owner = create_user("owner-uuid@test.com", "owner")
        create_owner_profile(owner)
        self.client.force_authenticate(user=owner)
        res = self.client.get("/api/v1/inspections/bookings/my/?car=not-a-uuid")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class AuditHardeningTest(APITestCase):
    def test_history_snapshots_actor_identify(self):

        staff = create_user("staff-audit@test.com", "owner", is_staff=True)
        owner = create_user("owner-audit@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner, status=CarStatus.DRAFT)
        self.client.force_authenticate(user=staff)
        self.client.post(f"/api/v1/listings/admin/cars/{car.id}/approve-listing")
        entry = car.status_history.get()
        self.assertEqual(entry.actor_name, f"{staff.first_name} {staff.last_name}")
        self.assertEqual(entry.actor_email, staff.email)
        # The snapshot must survive account deletion -> that's  it's whole purpose
        staff.delete()
        entry.refresh_from_db()
        self.assertIsNone(entry.actor)
        self.assertEqual(entry.actor_email, "staff-audit@test.com")

    def test_history_captures(self):
        staff = create_user("staff-audit@test.com", "owner", is_staff=True)
        owner = create_user("owner-audit@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner, status=CarStatus.DRAFT)
        self.client.force_authenticate(user=staff)
        self.client.post(
            f"/api/v1/listings/admin/cars/{car.id}/approve-listing",
            HTTP_USER_AGENT="TestBrowser/1.0",
        )
        entry = car.status_history.get()
        self.assertEqual(entry.ip_address, "127.0.0.1")
        self.assertEqual(entry.user_agent, "TestBrowser/1.0")


class BookingEmailTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-em@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-em@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.LISTING_APPROVED)
        self.center = create_center(self.staff)
        self.slot = create_slot(self.staff, center=self.center)
        self.client.force_authenticate(user=self.owner)

    def test_booking_sends_confirmation_and_logs(self):
        from django.core import mail

        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/v1/inspections/bookings/",
                {
                    "car_id": str(self.car.id),
                    "slot_id": str(self.slot.id),
                    "receipt": _receipt(),
                },
                format="multipart",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        # New flow: the booking is parked awaiting payment, and staff are emailed
        # to verify it. The owner's appointment confirmation now fires once staff
        # confirm the payment (see the confirm-payment flow).
        booking = InspectionBooking.objects.get(car=self.car)
        self.assertEqual(booking.status, BookingStatus.AWAITING_PAYMENT)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["staff-em@test.com"])
        self.assertIn("verif", mail.outbox[0].subject.lower())


class AssistanceRequestTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-asst@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-asst@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.LISTING_APPROVED)
        self.client.force_authenticate(user=self.owner)

    def test_create_assistance_notifies_staff(self):
        from apps.notifications.models import Notification

        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/v1/inspections/assistance/",
                {"car_id": str(self.car.id), "state": "Kano", "message": "No centers"},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AssistanceRequest.objects.count(), 1)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.staff, notification_type="assistance_requested"
            ).exists()
        )

    def test_duplicate_open_request_rejected(self):
        AssistanceRequest.objects.create(owner=self.owner, car=self.car, state="Kano")
        res = self.client.post(
            "/api/v1/inspections/assistance/",
            {"car_id": str(self.car.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_can_list_and_handle(self):
        assistance = AssistanceRequest.objects.create(
            owner=self.owner, car=self.car, state="Kano"
        )
        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/v1/inspections/admin/assistance/?status=open")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        res = self.client.post(
            f"/api/v1/inspections/admin/assistance/{assistance.id}/handle/"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        assistance.refresh_from_db()
        self.assertEqual(assistance.status, "handled")
        self.assertEqual(assistance.handled_by, self.staff)

    def test_owner_cannot_access_staff_queue(self):
        res = self.client.get("/api/v1/inspections/admin/assistance/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_sees_own_open_request_for_car(self):
        AssistanceRequest.objects.create(owner=self.owner, car=self.car, state="Kano")
        res = self.client.get(
            f"/api/v1/inspections/assistance/?car={self.car.id}&status=open"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        # A different owner sees nothing for this car.
        other = create_user("other-asst@test.com", "owner")
        self.client.force_authenticate(user=other)
        res = self.client.get(
            f"/api/v1/inspections/assistance/?car={self.car.id}&status=open"
        )
        self.assertEqual(len(res.data), 0)


class StaffBookForOwnerTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff-bfo@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-bfo@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.LISTING_APPROVED)
        self.center = create_center(self.staff)
        self.slot = create_slot(self.staff, center=self.center)
        self.client.force_authenticate(user=self.staff)

    def test_staff_can_fetch_available_slots(self):
        res = self.client.get(
            f"/api/v1/inspections/available-slots/?center={self.center.id}"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["id"], str(self.slot.id))

    def test_staff_books_for_owner(self):
        from django.core import mail

        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/v1/inspections/admin/bookings/book-for-owner/",
                {"car_id": str(self.car.id), "slot_id": str(self.slot.id)},
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        booking = InspectionBooking.objects.get(car=self.car)
        self.assertEqual(booking.booked_by, self.owner)
        # History actor is the staff member, not the owner.
        entry = self.car.status_history.filter(
            to_status=CarStatus.INSPECTION_PENDING
        ).first()
        self.assertEqual(entry.actor_email, "staff-bfo@test.com")
        self.assertEqual(entry.actor_role, "staff")
        # Owner still receives the confirmation email.
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["owner-bfo@test.com"])

    def test_book_for_owner_closes_assistance(self):
        assistance = AssistanceRequest.objects.create(
            owner=self.owner, car=self.car, state="Kano"
        )
        self.client.post(
            "/api/v1/inspections/admin/bookings/book-for-owner/",
            {"car_id": str(self.car.id), "slot_id": str(self.slot.id)},
            format="json",
        )
        assistance.refresh_from_db()
        self.assertEqual(assistance.status, "handled")
        self.assertEqual(assistance.handled_by, self.staff)

    def test_non_staff_cannot_book_for_owner(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            "/api/v1/inspections/admin/bookings/book-for-owner/",
            {"car_id": str(self.car.id), "slot_id": str(self.slot.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class FeeSettingTest(TestCase):
    def test_get_solo_creates_one_row_with_default(self):
        fee = FeeSetting.get_solo()
        self.assertEqual(fee.pk, 1)
        self.assertEqual(FeeSetting.get_solo().pk, 1)  # idempotent
        self.assertEqual(FeeSetting.objects.count(), 1)
        self.assertEqual(fee.vat_rate, Decimal("0.0750"))

    def test_quote_computes_vat_and_total(self):
        fee = FeeSetting.get_solo()
        fee.inspection_fee = Decimal("15000.00")

        fee.listing_fee = Decimal("5000.00")
        fee.vat_rate = Decimal("0.0750")
        fee.save()
        q = fee.quote()
        self.assertEqual(q["subtotal"], Decimal("20000.00"))
        self.assertEqual(q["vat_amount"], Decimal("1500.00"))
        self.assertEqual(q["total"], Decimal("21500.00"))
        self.assertEqual(q["currency"], "NGN")

    def test_quote_rounds_vat_half_up_to_two_dp(self):
        fee = FeeSetting.get_solo()
        fee.inspection_fee = Decimal("10000.00")
        fee.listing_fee = Decimal("3333.33")
        fee.vat_rate = Decimal("0.0750")
        fee.save()
        # subtotal 13333.33 * 0.075 = 999.99975 -> 1000.00
        self.assertEqual(fee.quote()["vat_amount"], Decimal("1000.00"))


def make_booking_ctx():
    """Owner (ID on file) + bookable car + active future slot, for payment tests."""
    uid = uuid.uuid4().hex[:8]
    staff = create_user(f"bkstaff-{uid}@t.com", "owner", is_staff=True)
    owner = create_user(f"bkowner-{uid}@t.com", "owner")
    create_owner_profile(owner)
    car = create_car(owner, status=CarStatus.LISTING_APPROVED)
    center = create_center(staff)
    slot = create_slot(staff, center=center)
    return {"staff": staff, "owner": owner, "car": car, "center": center, "slot": slot}


class AwaitingPaymentStatusTest(TestCase):
    def test_awaiting_payment_is_an_active_status(self):
        self.assertIn(BookingStatus.AWAITING_PAYMENT, ACTIVE_BOOKING_STATUSES)

    def test_awaiting_payment_holds_the_slot_uniquely_per_car(self):
        ctx = make_booking_ctx()
        InspectionBooking.objects.create(
            car=ctx["car"],
            slot=ctx["slot"],
            booked_by=ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        with self.assertRaises(IntegrityError):
            InspectionBooking.objects.create(
                car=ctx["car"],
                slot=ctx["slot"],
                booked_by=ctx["owner"],
                status=BookingStatus.AWAITING_PAYMENT,
            )


class InspectionPaymentModelTest(TestCase):
    def test_payment_snapshots_amounts_and_links_one_to_one(self):
        from apps.inspections.models import InspectionPayment

        ctx = make_booking_ctx()
        booking = InspectionBooking.objects.create(
            car=ctx["car"],
            slot=ctx["slot"],
            booked_by=ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        payment = InspectionPayment.objects.create(
            booking=booking,
            inspection_fee=Decimal("15000.00"),
            listing_fee=Decimal("5000.00"),
            vat_amount=Decimal("1500.00"),
            total=Decimal("21500.00"),
            currency="NGN",
            receipt="inspection_payments/r.pdf",
            payment_method="transfer",
        )
        self.assertEqual(booking.payment, payment)  # reverse OneToOne
        self.assertEqual(payment.status, "submitted")  # default
        self.assertEqual(payment.total, Decimal("21500.00"))


class FeeQuoteEndpointTest(APITestCase):
    def setUp(self):
        self.owner = create_user("fq-owner@t.com", "owner")
        create_owner_profile(self.owner)
        fee = FeeSetting.get_solo()
        fee.inspection_fee = Decimal("15000.00")
        fee.listing_fee = Decimal("5000.00")
        fee.bank_name = "GTBank"
        fee.bank_account_number = "0123456789"
        fee.save()

    def test_owner_gets_fee_breakdown(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/inspections/bookings/fee-quote/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total"], "21500.00")
        self.assertEqual(res.data["vat_amount"], "1500.00")
        self.assertEqual(res.data["bank_account_number"], "0123456789")

    def test_anonymous_rejected(self):
        res = self.client.get("/api/v1/inspections/bookings/fee-quote/")
        self.assertIn(res.status_code, (401, 403))


def _receipt(name="r.pdf", content=b"%PDF-1.4 test", ctype="application/pdf"):
    return SimpleUploadedFile(name, content, content_type=ctype)


def _mark_paid(car):
    """Simulate staff confirming the inspection payment → booking becomes PENDING."""
    booking = InspectionBooking.objects.filter(car=car).order_by("-created_at").first()
    booking.status = BookingStatus.PENDING
    booking.save(update_fields=["status"])
    return booking


class OwnerBookingPaymentCreateTest(APITestCase):
    def setUp(self):
        self.ctx = make_booking_ctx()
        self.owner = self.ctx["owner"]
        fee = FeeSetting.get_solo()
        fee.inspection_fee = Decimal("15000.00")
        fee.listing_fee = Decimal("5000.00")
        fee.save()
        self.client.force_authenticate(user=self.owner)

    def _payload(self, **over):
        data = {
            "car_id": str(self.ctx["car"].id),
            "slot_id": str(self.ctx["slot"].id),
            "attendee_type": "self",
            "payment_method": "transfer",
            "receipt": _receipt(),
        }
        data.update(over)
        return data

    def test_booking_without_receipt_is_rejected(self):
        payload = self._payload()
        payload.pop("receipt")
        res = self.client.post(
            "/api/v1/inspections/bookings/", payload, format="multipart"
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(InspectionBooking.objects.count(), 0)

    def test_booking_with_receipt_awaits_payment_and_snapshots(self):
        res = self.client.post(
            "/api/v1/inspections/bookings/", self._payload(), format="multipart"
        )
        self.assertEqual(res.status_code, 201, res.data)
        booking = InspectionBooking.objects.get()
        self.assertEqual(booking.status, BookingStatus.AWAITING_PAYMENT)
        self.assertEqual(booking.payment.status, "submitted")
        self.assertEqual(booking.payment.total, Decimal("21500.00"))

    def test_bad_receipt_type_rejected(self):
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            self._payload(receipt=_receipt("r.txt", b"x", "text/plain")),
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(InspectionBooking.objects.count(), 0)


class StaffPaymentActionTest(APITestCase):
    def setUp(self):
        from apps.inspections.models import InspectionPayment

        self.ctx = make_booking_ctx()
        self.staff = create_user("pay-act-staff@t.com", "owner", is_staff=True)
        self.booking = InspectionBooking.objects.create(
            car=self.ctx["car"],
            slot=self.ctx["slot"],
            booked_by=self.ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        InspectionPayment.objects.create(
            booking=self.booking,
            inspection_fee=Decimal("1"),
            listing_fee=Decimal("1"),
            vat_amount=Decimal("0"),
            total=Decimal("2"),
            receipt="x.pdf",
        )
        # Booking-create would have moved the car to INSPECTION_PENDING.
        self.ctx["car"].status = CarStatus.INSPECTION_PENDING
        self.ctx["car"].save(update_fields=["status"])

    def test_confirm_moves_booking_to_pending(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/confirm-payment/"
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.PENDING)
        self.assertEqual(self.booking.payment.status, "confirmed")

    def test_confirm_records_an_inspection_transaction(self):
        from apps.listings.models import Transaction

        self.client.force_authenticate(user=self.staff)
        self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/confirm-payment/"
        )
        txn = Transaction.objects.get(inspection_booking=self.booking)
        self.assertEqual(txn.transaction_type, "inspection")
        self.assertEqual(txn.payer_id, self.ctx["owner"].id)
        self.assertIsNone(txn.request_id)
        self.assertIsNone(txn.receiver_id)
        # It shows up in the owner's transactions list.
        self.client.force_authenticate(user=self.ctx["owner"])
        res = self.client.get("/api/v1/listings/transactions")
        rows = res.data["results"] if isinstance(res.data, dict) else res.data
        self.assertTrue(any(r["transaction_type"] == "inspection" for r in rows))

    def test_reject_cancels_booking_and_frees_slot(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/reject-payment/",
            {"reason": "Receipt unreadable."},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.booking.refresh_from_db()
        self.ctx["car"].refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.CANCELLED)
        self.assertEqual(self.booking.payment.status, "rejected")
        self.assertEqual(self.ctx["car"].status, CarStatus.LISTING_APPROVED)

    def test_reject_requires_a_meaningful_reason(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/reject-payment/",
            {"reason": "Too short"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.booking.refresh_from_db()
        self.booking.payment.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.AWAITING_PAYMENT)
        self.assertEqual(self.booking.payment.status, "submitted")

    def test_confirm_requires_awaiting_payment(self):
        self.booking.status = BookingStatus.PENDING
        self.booking.save(update_fields=["status"])
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/confirm-payment/"
        )
        self.assertEqual(res.status_code, 400)

    def test_non_staff_forbidden(self):
        self.client.force_authenticate(user=self.ctx["owner"])
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/confirm-payment/"
        )
        self.assertEqual(res.status_code, 403)


class BookingDetailPaymentTest(APITestCase):
    def test_staff_detail_includes_payment_summary(self):
        from apps.inspections.models import InspectionPayment

        ctx = make_booking_ctx()
        staff = create_user("det-pay-staff@t.com", "owner", is_staff=True)
        booking = InspectionBooking.objects.create(
            car=ctx["car"],
            slot=ctx["slot"],
            booked_by=ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        InspectionPayment.objects.create(
            booking=booking,
            inspection_fee=Decimal("15000"),
            listing_fee=Decimal("5000"),
            vat_amount=Decimal("1500"),
            total=Decimal("21500"),
            receipt="x.pdf",
        )
        self.client.force_authenticate(user=staff)
        res = self.client.get(f"/api/v1/inspections/admin/bookings/{booking.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["payment"]["total"], "21500.00")
        self.assertEqual(res.data["payment"]["status"], "submitted")


class InspectionRoleGateTest(APITestCase):
    """Only inspectors (or admins) may start/submit inspections; a publisher can't."""

    def setUp(self):
        self.publisher = create_user("insp-gate-pub@test.com", "owner",
            is_staff=True, staff_role="publisher")

    def test_publisher_cannot_start_inspection(self):
        self.client.force_authenticate(self.publisher)
        r = self.client.post(
            f"/api/v1/inspections/admin/bookings/{uuid.uuid4()}/start/"
        )
        assert r.status_code == 403


def make_pending_publishing_car(owner, inspector, slot, title="Queued Car"):
    car = create_car(owner, status=CarStatus.PENDING_PUBLISHING, title=title)
    booking = InspectionBooking.objects.create(
        car=car, slot=slot, booked_by=owner, status=BookingStatus.COMPLETED
    )
    PhysicalInspection.objects.create(
        booking=booking, car=car, inspector=inspector,
        condition=VehicleUsedCondition.values[0], mileage=45000,
        fuel_type=FuelType.values[0], car_type=CarType.values[0], features=[],
        engine_condition=ComponentCondition.values[0],
        chassis_condition=ComponentCondition.values[0],
        ac_condition=ComponentCondition.values[0],
        result=InspectionResult.PASSED, staff_notes="Clean, minor wear on tyres.",
        inspected_at=timezone.now(),
    )
    return car


class PendingPublishingQueueTest(APITestCase):
    def setUp(self):
        self.publisher = create_user("q-pub@test.com", "owner", is_staff=True,
            staff_role="publisher")
        self.inspector = create_user("q-insp@test.com", "owner", is_staff=True,
            staff_role="inspector")
        self.owner = create_user("q-owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.slot = create_slot(self.publisher)
        self.car = make_pending_publishing_car(self.owner, self.inspector, self.slot)

    def test_publisher_lists_pending(self):
        self.client.force_authenticate(self.publisher)
        r = self.client.get("/api/v1/inspections/staff/pending-publishing/")
        assert r.status_code == 200, r.data
        ids = [row["car_id"] for row in r.data["results"]]
        assert str(self.car.id) in ids
        assert "count" in r.data  # paginated

    def test_inspector_forbidden(self):
        self.client.force_authenticate(self.inspector)
        r = self.client.get("/api/v1/inspections/staff/pending-publishing/")
        assert r.status_code == 403

    def test_detail_returns_inspection_report(self):
        self.client.force_authenticate(self.publisher)
        r = self.client.get(f"/api/v1/inspections/staff/pending-publishing/{self.car.id}/")
        assert r.status_code == 200
        assert r.data["inspection"]["staff_notes"] == "Clean, minor wear on tyres."
        assert r.data["inspection"]["inspector_name"]

    def test_detail_exposes_full_inputs_and_edit_history(self):
        from apps.inspections.models import (
            InspectionEditAction,
            InspectionEditEvent,
            PhysicalInspection,
        )

        insp = PhysicalInspection.objects.get(car=self.car)
        InspectionEditEvent.objects.create(
            inspection=insp, editor=self.inspector,
            editor_name=self.inspector.get_full_name(),
            action=InspectionEditAction.EDITED, changed_fields=["mileage"],
        )
        self.client.force_authenticate(self.publisher)
        r = self.client.get(f"/api/v1/inspections/staff/pending-publishing/{self.car.id}/")
        report = r.data["inspection"]
        # Every inspector input the publisher should see is present.
        for key in (
            "inspector_email", "presented_attendee", "presented_id_type",
            "presented_id_number", "presented_id_document", "documents",
            "edit_history",
        ):
            assert key in report, key
        actions = [e["action"] for e in report["edit_history"]]
        assert "edited" in actions
        edited = next(e for e in report["edit_history"] if e["action"] == "edited")
        assert edited["changed_fields"] == ["mileage"]

    def test_admin_edit_logs_edited_event(self):
        from django.contrib.admin.sites import AdminSite

        from apps.inspections.admin import PhysicalInspectionAdmin
        from apps.inspections.models import InspectionEditEvent, PhysicalInspection

        insp = PhysicalInspection.objects.get(car=self.car)
        admin_obj = PhysicalInspectionAdmin(PhysicalInspection, AdminSite())

        class _Req:
            user = self.publisher

        class _Form:
            changed_data = ["mileage", "condition"]

        insp.mileage = 99999
        admin_obj.save_model(_Req(), insp, _Form(), change=True)
        ev = InspectionEditEvent.objects.get(
            inspection=insp, action="edited"
        )
        self.assertEqual(ev.editor, self.publisher)
        self.assertEqual(ev.changed_fields, ["mileage", "condition"])

    def test_publish_goes_live(self):
        self.client.force_authenticate(self.publisher)
        r = self.client.post(f"/api/v1/inspections/staff/pending-publishing/{self.car.id}/publish/")
        assert r.status_code == 200, r.data
        self.car.refresh_from_db()
        assert self.car.status == CarStatus.PUBLISHED
        assert self.car.published_at is not None

    def test_publish_not_in_queue_404(self):
        self.car.status = CarStatus.PUBLISHED
        self.car.save(update_fields=["status"])
        self.client.force_authenticate(self.publisher)
        r = self.client.post(f"/api/v1/inspections/staff/pending-publishing/{self.car.id}/publish/")
        assert r.status_code == 404

    def test_inspector_cannot_publish(self):
        self.client.force_authenticate(self.inspector)
        r = self.client.post(f"/api/v1/inspections/staff/pending-publishing/{self.car.id}/publish/")
        assert r.status_code == 403

    def test_send_back_needs_changes(self):
        self.client.force_authenticate(self.publisher)
        r = self.client.post(
            f"/api/v1/inspections/staff/pending-publishing/{self.car.id}/send-back/",
            {"note": "Front photos are too dark — please re-shoot in daylight."},
            format="json")
        assert r.status_code == 200, r.data
        self.car.refresh_from_db()
        assert self.car.status == CarStatus.NEEDS_CHANGES
        assert "too dark" in self.car.admin_note

    def test_send_back_short_note_rejected(self):
        self.client.force_authenticate(self.publisher)
        r = self.client.post(
            f"/api/v1/inspections/staff/pending-publishing/{self.car.id}/send-back/",
            {"note": "no"}, format="json")
        assert r.status_code == 400


class StaffBookingCarPlateTest(APITestCase):
    """The staff bookings list exposes the car's plate for the day panel."""

    def setUp(self):
        self.staff = create_user("staff-plate@test.com", "owner", is_staff=True)
        self.owner = create_user("owner-plate@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(
            self.owner,
            status=CarStatus.INSPECTION_PENDING,
            plate_number="LAG 123 AB",
        )
        self.center = create_center(self.staff)
        self.slot = create_slot(self.staff, center=self.center)
        InspectionBooking.objects.create(
            car=self.car,
            slot=self.slot,
            booked_by=self.owner,
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(user=self.staff)

    def test_staff_bookings_include_car_plate(self):
        res = self.client.get("/api/v1/inspections/admin/bookings/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        row = res.data["results"][0]
        self.assertEqual(row["car_plate"], "LAG 123 AB")

    def test_car_plate_blank_when_absent(self):
        self.car.plate_number = None
        self.car.save(update_fields=["plate_number"])
        res = self.client.get("/api/v1/inspections/admin/bookings/")
        row = res.data["results"][0]
        self.assertEqual(row["car_plate"], "")
