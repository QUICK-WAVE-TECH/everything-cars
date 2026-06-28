from datetime import date, time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inspections.models import (
    BookingStatus,
    InspectionBooking,
    InspectionSlot,
)
from apps.listings.models import Car, CarStatus
from apps.listings.tests import create_car, create_customer_profile, create_owner_profile, create_user


def create_slot(staff, days_ahead=7, **overrides):
    slot_date = timezone.localdate() + timedelta(days=days_ahead)
    defaults = {
        "date": slot_date,
        "start_time": time(9, 0),
        "end_time": time(10, 0),
        "capacity": 1,
        "location": "Test Inspection Center, Lagos",
        "created_by": staff,
    }
    defaults.update(overrides)
    return InspectionSlot.objects.create(**defaults)


class StaffSlotManagementTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff@test.com", "owner", is_staff=True)
        self.client.force_authenticate(user=self.staff)

    def test_create_slots_batch(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        next_week = tomorrow + timedelta(days=6)
        res = self.client.post("/api/v1/inspections/slots/", {
            "date_from": tomorrow.isoformat(),
            "date_to": next_week.isoformat(),
            "days": [0, 1, 2, 3, 4],  # Mon-Fri
            "time_slots": [
                {"start_time": "09:00", "end_time": "10:00"},
                {"start_time": "10:00", "end_time": "11:00"},
            ],
            "capacity": 1,
            "location": "Lekki Inspection Center",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertGreater(res.data["created_count"], 0)

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


class OwnerBookingTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff@test.com", "owner", is_staff=True)
        self.owner = create_user("owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.DRAFT)
        self.slot = create_slot(self.staff)
        self.client.force_authenticate(user=self.owner)

    def test_book_inspection(self):
        res = self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(self.slot.id),
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_PENDING)

    def test_cannot_book_non_draft_car(self):
        self.car.status = CarStatus.PUBLISHED
        self.car.save(update_fields=["status"])
        res = self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(self.slot.id),
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_double_book_car(self):
        # After the first booking succeeds, car moves to INSPECTION_PENDING.
        # A second booking attempt is rejected because the car is no longer
        # in a bookable status (DRAFT / NEEDS_CHANGES / etc.).
        self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(self.slot.id),
        }, format="json")
        slot2 = create_slot(self.staff, days_ahead=8)
        res = self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(slot2.id),
        }, format="json")
        # Car is INSPECTION_PENDING → not a bookable status → 400
        self.assertIn(res.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT))

    def test_cannot_book_full_slot(self):
        self.slot.capacity = 1
        self.slot.save()
        # Fill the slot
        other_owner = create_user("other@test.com", "owner")
        create_owner_profile(other_owner)
        other_car = create_car(other_owner, status=CarStatus.DRAFT)
        InspectionBooking.objects.create(
            car=other_car, slot=self.slot, booked_by=other_owner
        )
        res = self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(self.slot.id),
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_cancel_pending_booking(self):
        self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(self.slot.id),
        }, format="json")
        booking = InspectionBooking.objects.get(car=self.car)
        res = self.client.post(f"/api/v1/inspections/bookings/{booking.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.DRAFT)

    def test_reschedule_booking(self):
        self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(self.slot.id),
        }, format="json")
        booking = InspectionBooking.objects.get(car=self.car, status=BookingStatus.PENDING)
        new_slot = create_slot(self.staff, days_ahead=10, start_time=time(14, 0), end_time=time(15, 0))
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

    def test_reschedule_blocked_after_max(self):
        self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(self.slot.id),
        }, format="json")
        booking = InspectionBooking.objects.get(car=self.car, status=BookingStatus.PENDING)
        booking.reschedule_count = 2
        booking.save(update_fields=["reschedule_count"])
        new_slot = create_slot(self.staff, days_ahead=12, start_time=time(14, 0), end_time=time(15, 0))
        res = self.client.post(
            f"/api/v1/inspections/bookings/{booking.id}/reschedule/",
            {"slot_id": str(new_slot.id)},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_my_bookings(self):
        self.client.post("/api/v1/inspections/bookings/", {
            "car_id": str(self.car.id),
            "slot_id": str(self.slot.id),
        }, format="json")
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


class StaffBookingActionsTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff@test.com", "owner", is_staff=True)
        self.owner = create_user("owner@test.com", "owner")
        create_owner_profile(self.owner)
        self.car = create_car(self.owner, status=CarStatus.DRAFT)
        self.slot = create_slot(self.staff)
        self.booking = InspectionBooking.objects.create(
            car=self.car, slot=self.slot, booked_by=self.owner
        )
        self.car.status = CarStatus.INSPECTION_PENDING
        self.car.save(update_fields=["status"])
        self.client.force_authenticate(user=self.staff)

    def test_approve_booking(self):
        res = self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/approve/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.APPROVED)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_APPROVED)

    def test_reject_booking_requires_note(self):
        res = self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/reject/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_booking_with_note(self):
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/reject/",
            {"staff_note": "Photos are blurry"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.NEEDS_CHANGES)
        self.assertEqual(self.car.admin_note, "Photos are blurry")

    def test_pass_inspection(self):
        self.booking.status = BookingStatus.APPROVED
        self.booking.save(update_fields=["status"])
        self.car.status = CarStatus.INSPECTION_APPROVED
        self.car.save(update_fields=["status"])

        res = self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/pass/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.PUBLISHED)
        self.assertIsNotNone(self.car.published_at)

    def test_fail_inspection_requires_note(self):
        self.booking.status = BookingStatus.APPROVED
        self.booking.save(update_fields=["status"])
        res = self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/fail/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fail_inspection_with_note(self):
        self.booking.status = BookingStatus.APPROVED
        self.booking.save(update_fields=["status"])
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/fail/",
            {"staff_note": "Brake pads worn out"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_REJECTED)

    def test_mark_no_show(self):
        self.booking.status = BookingStatus.APPROVED
        self.booking.save(update_fields=["status"])
        res = self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/no-show/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_NO_SHOW)

    def test_cannot_pass_non_approved_booking(self):
        res = self.client.post(f"/api/v1/inspections/admin/bookings/{self.booking.id}/pass/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_list_bookings(self):
        res = self.client.get("/api/v1/inspections/admin/bookings/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_staff_booking_detail(self):
        res = self.client.get(f"/api/v1/inspections/admin/bookings/{self.booking.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("car", res.data)
