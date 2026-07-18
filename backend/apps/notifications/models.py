from apps.users.models import User
from django.db import models
import uuid


# Create your models here.
class NotificationType(models.TextChoices):
    REQUEST_RECEIVED = "request_received", "New request received"
    REQUEST_APPROVED = "request_approved", "Request approved"
    REQUEST_REJECTED = "request_rejected", "Request rejected"
    REQUEST_CANCELLED = "request_cancelled", "Request cancelled"
    LISTING_SUSPENDED = "listing_suspended", "Listing suspended"
    LISTING_APPROVED = "listing_approved", "Listing approved"
    LISTING_SUBMITTED = "listing_submitted", "Listing submitted for review"
    CHANGES_REQUESTED = "changes_requested", "Changes requested"
    INSPECTION_BOOKED = "inspection_booked", "Inspection booked"
    INSPECTION_BOOKING_APPROVED = (
        "inspection_booking_approved",
        "Inspection booking approved",
    )
    INSPECTION_BOOKING_REJECTED = (
        "inspection_booking_rejected",
        "Inspection booking rejected",
    )
    INSPECTION_STARTED = "inspection_started", "Inspection started"
    NEEDS_CLEARANCE = "needs_clearance", "Needs further clearance"
    CLEARANCE_RESPONSE = "clearance_response", "Clearance response received"
    INSPECTION_PASSED = "inspection_passed", "Inspection passed"
    INSPECTION_FAILED = "inspection_failed", "Inspection failed"
    INSPECTION_NO_SHOW = "inspection_no_show", "Inspection no-show"
    INSPECTION_RESCHEDULED = "inspection_rescheduled", "Inspection rescheduled"
    ASSISTANCE_REQUESTED = "assistance_requested", "Booking assistance requested"

    PAYMENT_SUBMITTED = "payment_submitted", "Payment submitted"
    PAYMENT_CONFIRMED = "payment_confirmed", "Payment confirmed"
    RENTAL_ACTIVE = "rental_active", "Rental is active"
    RENTAL_COMPLETED = "rental_completed", "Rental completed"
    REQUESTS_AUTO_REJECTED = "requests_auto_rejected", "Requests auto-rejected"
    SYSTEM = "system", "System announcement"


class Notification(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(
        max_length=30, choices=NotificationType.choices
    )
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "is_read", "-created_at"])]

    def __str__(self):
        return f"{self.notification_type} → {self.recipient.email}"


class EmailLog(models.Model):
    """
    One row per email send attempt — makes 'did we email them, and when?'
    queryable without digging through a provider dashboard. Written by the
    email service on every send, success or failure.
    """

    id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    template_key = models.CharField(max_length=255, blank=True, default="")

    booking = models.ForeignKey(
        "inspections.InspectionBooking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
    )
    success = models.BooleanField(default=False)
    error = models.TextField(blank=True, default="")
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]
        indexes = [models.Index(fields=["recipient", "-sent_at"])]

    def __str__(self):
        status = "sent" if self.success else "FAILED"
        return f"[{status}] {self.subject} → {self.recipient}"
