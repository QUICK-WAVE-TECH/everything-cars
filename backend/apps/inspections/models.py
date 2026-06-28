import uuid

from django.db import models

from apps.listings.models import Car
from apps.users.models import User


class InspectionSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    capacity = models.PositiveSmallIntegerField(default=1)
    location = models.CharField(max_length=200)
    note = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_slots"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["date", "start_time", "end_time", "location"],
                name="unique_slot_per_date_time_location",
            ),
        ]
        indexes = [
            models.Index(fields=["date", "is_active"]),
        ]

    def __str__(self):
        return f"{self.date} {self.start_time}–{self.end_time} @ {self.location}"


class BookingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    COMPLETED = "completed", "Completed"
    NO_SHOW = "no_show", "No Show"
    CANCELLED = "cancelled", "Cancelled"


ACTIVE_BOOKING_STATUSES = [BookingStatus.PENDING, BookingStatus.APPROVED]

MAX_RESCHEDULES = 2


class InspectionBooking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="inspection_bookings")
    slot = models.ForeignKey(
        InspectionSlot, on_delete=models.CASCADE, related_name="bookings"
    )
    booked_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="inspection_bookings"
    )
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        db_index=True,
    )
    reschedule_count = models.PositiveSmallIntegerField(default=0)
    staff_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["car"],
                condition=models.Q(status__in=ACTIVE_BOOKING_STATUSES),
                name="one_active_booking_per_car",
            ),
        ]
        indexes = [
            models.Index(fields=["slot", "status"]),
        ]

    def __str__(self):
        return f"Booking {self.car} → {self.slot} ({self.status})"
