from apps.users.models import User
from django.db import models
import uuid


# Create your models here.
class NotificationType(models.TextChoices):
    REQUEST_RECEIVED = "request_received", "New request received"
    REQUEST_APPROVED = "request_approved", "Request approved"
    REQUEST_REJECTED = "request_rejected", "Request rejected"
    REQUEST_CANCELLED = "request_cancelled", "Request cancelled"
    LISTING_SUBMITTED = "listing_submitted", "Listing submitted for review"
    LISTING_APPROVED = "listing_approved", "Listing approved"
    LISTING_REJECTED = "listing_rejected", "Listing suspended"
    LISTING_NEEDS_CHANGES = "listing_needs_changes", "Listing needs changes"
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
