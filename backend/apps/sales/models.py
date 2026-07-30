import uuid

from django.db import models

from apps.listings.models import Car, Currency
from apps.offers.models import Offer
from apps.users.models import User

DEAL_TTL_DAYS = 7
# How long after completion a buyer may dispute a "sold" they say never happened.
DEAL_DISPUTE_WINDOW_DAYS = 7


class DealStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class DealCancelledBy(models.TextChoices):
    BUYER = "buyer", "Buyer"
    SELLER = "seller", "Seller"
    SYSTEM = "system", "System"


class Deal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="deals")
    buyer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="deals_as_buyer"
    )
    seller = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="deals_as_seller"
    )
    offer = models.OneToOneField(Offer, on_delete=models.CASCADE, related_name="deal")
    agreed_amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.NGN
    )
    status = models.CharField(
        max_length=10,
        choices=DealStatus.choices,
        default=DealStatus.ACTIVE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.CharField(
        max_length=10, choices=DealCancelledBy.choices, blank=True
    )
    cancel_reason = models.CharField(max_length=200, blank=True)
    # A buyer can flag a completion they say never happened; staff then review.
    disputed_at = models.DateTimeField(null=True, blank=True)
    dispute_reason = models.CharField(max_length=400, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["car"],
                condition=models.Q(status="active"),
                name="one_active_deal_per_car",
            )
        ]

    def __str__(self):
        return f"Deal on {self.car.title} — {self.status}"
