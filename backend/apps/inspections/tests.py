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
from .models import ActorRole, CarStatusHistory, InspectionCenter
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
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/approve/"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.APPROVED)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_APPROVED)

    def test_reject_booking_requires_note(self):
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/reject/"
        )
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

        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/pass/"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.PUBLISHED)
        self.assertIsNotNone(self.car.published_at)

    def test_fail_inspection_requires_note(self):
        self.booking.status = BookingStatus.APPROVED
        self.booking.save(update_fields=["status"])
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/fail/"
        )
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
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/no-show/"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.car.refresh_from_db()
        self.assertEqual(self.car.status, CarStatus.INSPECTION_NO_SHOW)

    def test_cannot_pass_non_approved_booking(self):
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/pass/"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_list_bookings(self):
        res = self.client.get("/api/v1/inspections/admin/bookings/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    def test_staff_booking_detail(self):
        res = self.client.get(f"/api/v1/inspections/admin/bookings/{self.booking.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("car", res.data)


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
