from datetime import time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from django.test import TestCase
from .models import (
    BookingStatus,
    InspectionBooking,
    InspectionSlot,
)
from .models import (
    ActorRole,
    CarStatusHistory,
    InspectionCenter,
    PhysicalInspection,
)
from .services import generate_tracking_id, record_status_change

from apps.listings.models import CarStatus
from apps.listings.tests import create_car, create_owner_profile, create_user


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


class StaffSlotManagementTest(APITestCase):
    def setUp(self):
        self.staff = create_user("staff@test.com", "owner", is_staff=True)
        self.center = create_center(self.staff)
        self.client.force_authenticate(user=self.staff)

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
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_PENDING)
        self.assertRegex(self.car.tracking_id, r"^NG-LOS-\d{6}$")

    def test_cannot_book_unapproved_draft(self):
        self.car.status = CarStatus.DRAFT
        self.car.save(update_fields=["status"])
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
            },
            format="json",
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
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_rebooking_keeps_tracking_id(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {"car_id": str(self.car.id), "slot_id": str(self.slot.id)},
            format="json",
        )
        self.car.refresh_from_db()
        original_tracking_id = self.car.tracking_id
        booking = InspectionBooking.objects.get(car=self.car)
        self.client.post(f"/api/v1/inspections/bookings/{booking.id}/cancel/")
        slot2 = create_slot(self.staff, days_ahead=9, center=self.center)
        self.client.post(
            "/api/v1/inspections/bookings/",
            {"car_id": str(self.car.id), "slot_id": str(slot2.id)},
            format="json",
        )
        self.car.refresh_from_db()
        self.assertEqual(self.car.tracking_id, original_tracking_id)

    def test_reschedule_limit_from_center_policy(self):
        self.center.max_reschedules = 0
        self.center.save(update_fields=["max_reschedules"])
        self.client.post(
            "/api/v1/inspections/bookings/",
            {"car_id": str(self.car.id), "slot_id": str(self.slot.id)},
            format="json",
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
            {"car_id": str(self.car.id), "slot_id": str(self.slot.id)},
            format="json",
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
            },
            format="json",
        )
        slot2 = create_slot(self.staff, days_ahead=8)
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(slot2.id),
            },
            format="json",
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
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_cancel_pending_booking(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
            },
            format="json",
        )
        booking = InspectionBooking.objects.get(car=self.car)
        res = self.client.post(f"/api/v1/inspections/bookings/{booking.id}/cancel/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        # Admin approval survives cancellation — car returns to bookable state
        self.assertEqual(self.car.status, CarStatus.LISTING_APPROVED)

    def test_reschedule_booking(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
            },
            format="json",
        )
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

    def test_reschedule_blocked_after_max(self):
        self.client.post(
            "/api/v1/inspections/bookings/",
            {
                "car_id": str(self.car.id),
                "slot_id": str(self.slot.id),
            },
            format="json",
        )
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
            },
            format="json",
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
    }
    base.update(overrides)
    return base


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

    def test_start_inspection(self):
        res = self._start()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_IN_PROGRESS)

    def test_cannot_submit_before_start(self):
        res = self._submit()
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_passed_publishes_car(self):
        self._start()
        res = self._submit(result="passed")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.PUBLISHED)
        self.assertIsNotNone(self.car.published_at)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.COMPLETED)
        inspection = PhysicalInspection.objects.get(booking=self.booking)
        self.assertEqual(inspection.inspector, self.staff)

    def test_needs_clearance_requires_note(self):
        self._start()
        res = self._submit(result="needs_clearance", staff_notes="")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("staff_notes", res.data)

    def test_needs_clearance_with_note(self):
        self._start()
        res = self._submit(
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
        self._submit(result="passed")
        # a fresh booking would be needed; same booking must 400 (completed)
        res = self._submit(result="passed")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submissions_write_history(self):
        self._start()
        self._submit(result="passed")
        transitions = list(
            self.car.status_history.values_list("to_status", flat=True)
        )
        self.assertEqual(
            transitions,
            [CarStatus.INSPECTION_IN_PROGRESS, CarStatus.PUBLISHED],
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
            inspection_form_payload(result="passed"),
            format="json",
        )
        return res.data["id"]

    def _doc_payload(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

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
        tid = generate_tracking_id(self.center)
        self.assertRegex(tid, r"^NG-LOS-\d{6}$")

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
            inspection_form_payload(
                result="needs_clearance", staff_notes="Customs papers missing"
            ),
            format="json",
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
        self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/start/"
        )

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
            {"car_id": str(self.car.id), "slot_id": str(slot2.id)},
            format="json",
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
            inspection_form_payload(
                result="needs_clearance", staff_notes="Customs docs missing"
            ),
            format="json",
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
