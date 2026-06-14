from django.db import models
import uuid


from apps.users.models import User


class ListingType(models.TextChoices):
    RENT = "rent", "Rent"
    BUY = "buy", "Buy"
    BOTH = "both", "Both"


class BodyType(models.TextChoices):
    SEDAN = "sedan", "Sedan"
    SUV = "suv", "SUV"
    HATCHBACK = "hatchback", "Hatchback"
    COUPE = "coupe", "Coupe"
    TRUCK = "truck", "Truck"
    VAN = "van", "Van"
    WAGON = "wagon", "Wagon"
    CONVERTIBLE = "convertible", "Convertible"
    MINIVAN = "minivan", "Minivan"
    CROSSOVER = "crossover", "Crossover"


class Transmission(models.TextChoices):
    AUTOMATIC = "automatic", "Automatic"
    MANUAL = "manual", "Manual"


class FuelType(models.TextChoices):
    PETROL = "petrol", "Petrol"
    DIESEL = "diesel", "Diesel"
    HYBRID = "hybrid", "Hybrid"
    ELECTRIC = "electric", "Electric"


class CarStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_REVIEW = "pending_review", "Pending Review"
    NEEDS_CHANGES = "needs_changes", "Needs Changes"
    PUBLISHED = "published", "Published"
    PAUSED = "paused", "Paused"
    SUSPENDED = "suspended", "Suspended"
    ARCHIVED = "archived", "Archived"


class Currency(models.TextChoices):
    NGN = "NGN", "Nigerian Naira (₦)"
    USD = "USD", "US Dollar ($)"
    GBP = "GBP", "British Pound (£)"
    EUR = "EUR", "Euro (€)"
    GHS = "GHS", "Ghanaian Cedi (₵)"
    KES = "KES", "Kenyan Shilling (KSh)"
    ZAR = "ZAR", "South African Rand (R)"


class RequestStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"
    PAID = "paid", "Paid"
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"


ACTIVE_REQUEST_STATUSES = [
    RequestStatus.PENDING,
    RequestStatus.APPROVED,
    RequestStatus.PAID,
    RequestStatus.ACTIVE,
]


# Create your models here.
class Car(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cars")

    title = models.CharField(max_length=200)
    listing_type = models.CharField(
        max_length=10,
        choices=ListingType.choices,
    )
    rent_price_per_day = models.DecimalField(
        max_digits=14,
        null=True,
        decimal_places=2,
    )
    sale_price = models.DecimalField(
        max_digits=14,
        null=True,
        decimal_places=2,
    )
    currency = models.CharField(
        max_length=3,
        blank=True,
        choices=Currency.choices,
        default=Currency.NGN,
    )
    brand = models.CharField(
        max_length=100,
    )
    model = models.CharField(
        max_length=100,
    )
    color = models.CharField(max_length=50, blank=True)
    year = models.PositiveIntegerField()
    body_type = models.CharField(max_length=20, choices=BodyType.choices, blank=True)
    transmission = models.CharField(
        max_length=20, choices=Transmission.choices, blank=True
    )
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices, blank=True)
    seats = models.PositiveSmallIntegerField(default=5)
    mileage = models.PositiveIntegerField(null=True, blank=True)

    country = models.CharField(max_length=50, blank=True)
    state = models.CharField(max_length=100)
    city = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)

    status = models.CharField(
        max_length=20, choices=CarStatus.choices, default=CarStatus.DRAFT, db_index=True
    )
    admin_note = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["listing_type", "status"]),
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["state", "city"]),
        ]

    def __str__(self):
        return f"{self.year} {self.brand} {self.model} — {self.title}"


def car_image_path(instance, filename):
    return f"car_images/{instance.car_id}/{filename}"


class CarImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=car_image_path)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["car"],
                condition=models.Q(is_primary=True),
                name="one_primary_image_per_car",
            )
        ]


class ListingFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="features")
    name = models.CharField(max_length=100)
    value = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]


class Request(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="requests")
    customer = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="rental_requests"
    )
    request_type = models.CharField(max_length=10, choices=ListingType.choices)
    price_offered = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.NGN,
    )
    duration_days = models.PositiveIntegerField(null=True, blank=True)  # Correct
    start_date = models.DateField(null=True, blank=True)
    message = models.TextField(
        max_length=400,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        db_index=True,
        default=RequestStatus.PENDING,
    )
    owner_note = models.TextField(blank=True)
    created_at = models.DateTimeField(
        auto_now_add=True,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["car", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["car", "customer", "request_type"],
                condition=models.Q(status__in=ACTIVE_REQUEST_STATUSES),
                name="unique_active_request_per_customer_car_type",
            )
        ]


class RequestStatusEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        Request, on_delete=models.CASCADE, related_name="status_events"
    )
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)

    actor = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="+")
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:

        ordering = ["created_at"]  # Correct — oldest first, shows the timeline in order
