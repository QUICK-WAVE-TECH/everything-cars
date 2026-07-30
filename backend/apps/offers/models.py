from django.db import models
import uuid
from apps.listings.models import Car, Currency, Request
from apps.users.models import User


class OfferStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COUNTERED = "countered", "Countered"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    WITHDRAWN = "withdrawn", "Withdrawn"
    EXPIRED = "expired", "Expired"
    SUPERSEDED = "superseded", "Closed — vehicle sold"


# An offer still awaiting somebody's decision. Everything else is terminal.
ACTIVE_OFFER_STATUSES = [OfferStatus.PENDING, OfferStatus.COUNTERED]

MAX_OFFERS_PER_CAR = 2
OFFER_TTL_HOURS = 48


class Offer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="offers")
    customer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="offer_made"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.NGN
    )

    message = models.TextField(max_length=400, blank=True)
    status = models.CharField(
        max_length=20,
        choices=OfferStatus.choices,
        default=OfferStatus.PENDING,
        db_index=True,
    )
    # The owner's single counter-offer.
    counter_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    counter_message = models.TextField(max_length=400, blank=True)
    countered_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    # set when accepted - the buy request that carries the sale to completion
    resulting_request = models.ForeignKey(
        Request,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="originating_offers",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["car", "status"]),
            models.Index(fields=["customer", "status"]),
        ]
        constraints = [
            # one live offer per customer per car, enforced in the database so
            # concurrent submissions cannot both slip through a serializer check
            models.UniqueConstraint(
                fields=["car", "customer"],
                condition=models.Q(status__in=ACTIVE_OFFER_STATUSES),
                name="one_active_offer_per_customer_per_car",
            )
        ]

    def __str__(self):
        return f"{self.customer.email} - {self.amount} on {self.car.title}"

    @property
    def is_expired(self):
        """Lazy expiry: the clock is the truth, not the stored status"""
        from django.utils import timezone

        return (
            self.status in ACTIVE_OFFER_STATUSES
            and timezone.now() > self.expires_at <= timezone.now()
        )

    @property
    def agreed_amount(self):
        """What the sale is for - the counter if there was one, else the offer"""
        return self.counter_amount if self.counter_amount is not None else self.amount
