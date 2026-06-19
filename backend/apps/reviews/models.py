import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

from apps.users.models import User
from apps.listings.models import Car, Request


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="reviews"
    )
    request = models.ForeignKey(
        Request, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(max_length=1500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["car", "-created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["request", "reviewer"],
                name="one_review_per_request_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.reviewer.first_name} — {self.rating}★ on {self.car.title}"
