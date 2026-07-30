from django.db import models
import uuid


from apps.users.models import User


class ListingType(models.TextChoices):
    RENT = "rent", "Rent"
    BUY = "buy", "Buy"


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
    INSPECTION_PENDING = "inspection_pending", "Inspection Pending"
    LISTING_APPROVED = "listing_approved", "Listing Approved"
    INSPECTION_IN_PROGRESS = "inspection_in_progress", "Inspection In Progress"
    NEEDS_CLEARANCE = "needs_clearance", "Needs Clearance"
    INSPECTION_REJECTED = "inspection_rejected", "Inspection Rejected"
    INSPECTION_NO_SHOW = "inspection_no_show", "Inspection No Show"
    NEEDS_CHANGES = "needs_changes", "Needs Changes"
    PUBLISHED = "published", "Published"
    PAUSED = "paused", "Paused"
    SUSPENDED = "suspended", "Suspended"
    ARCHIVED = "archived", "Archived"


class CarImageType(models.TextChoices):
    FRONT = "front", "Front"
    BACK = "back", "Back"
    LEFT_SIDE = "left_side", "Left Side"
    RIGHT_SIDE = "right_side", "Right Side"
    INTERIOR = "interior", "Interior"


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
    PAYMENT_SUBMITTED = "payment_submitted", "Payment Submitted"  # NEW
    PAID = "paid", "Paid"
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"


ACTIVE_REQUEST_STATUSES = [
    RequestStatus.PENDING,
    RequestStatus.APPROVED,
    RequestStatus.PAYMENT_SUBMITTED,
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
    # Prices are conditionally required by listing_type (validated in the API
    # serializer). blank=True keeps a rent-only car (sale_price=None) editable
    # in the Django admin, which otherwise treats the field as required.
    rent_price_per_day = models.DecimalField(
        max_digits=14,
        null=True,
        blank=True,
        decimal_places=2,
    )
    sale_price = models.DecimalField(
        max_digits=14,
        null=True,
        blank=True,
        decimal_places=2,
    )
    vin = models.CharField(max_length=17, blank=True, null=True, unique=True)
    plate_number = models.CharField(
        max_length=12, blank=True, null=True, unique=True
    )  # ✓

    is_negotiable = models.BooleanField(
        null=True,
        blank=True,
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
        max_length=30, choices=CarStatus.choices, default=CarStatus.DRAFT, db_index=True
    )
    admin_note = models.TextField(blank=True)
    tracking_id = models.CharField(
        max_length=20, unique=True, null=True, blank=True, db_index=True
    )
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


def car_image_thumbnail_path(instance, filename):
    return f"car_images/{instance.car_id}/thumbnails/{filename}"


class CarImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="images")
    image_type = models.CharField(
        max_length=20,
        choices=CarImageType.choices,
        blank=True,
        default="",
    )
    image = models.ImageField(upload_to=car_image_path)
    thumbnail = models.ImageField(
        upload_to=car_image_thumbnail_path,
        blank=True,
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["car"],
                condition=models.Q(is_primary=True),
                name="one_primary_image_per_car",
            ),
            models.UniqueConstraint(
                fields=["car", "image_type"],
                condition=~models.Q(image_type=""),
                name="one_image_per_type_per_car",
            ),
        ]


class ListingFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name="features")
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=200, blank=True)
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
    payment_receipt = models.FileField(
        upload_to="payment_receipts/%Y/%m/", blank=True, null=True
    )
    payment_method_choice = models.CharField(
        max_length=20,
        choices=[("transfer", "Bank Transfer"), ("card", "Card")],
        blank=True,
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


class TransactionType(models.TextChoices):
    RENTAL = "rental", "Rental"
    PURCHASE = "purchase", "Purchase"
    REFUND = "refund", "Refund"


class PaymentMethod(models.TextChoices):
    MANUAL = "manual", "Manual (Bank Transfer/Cash)"
    CARD = "card", "Card"
    PAYSTACK = "paystack", "Paystack"
    OPAY = "opay", "Opay"
    TRANSFER = "transfer", "Bank Transfer"


class TransactionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        Request, on_delete=models.CASCADE, related_name="transactions"
    )
    payer = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="payments_made"
    )
    receiver = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="payments_received"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.NGN
    )
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.MANUAL
    )
    status = models.CharField(
        max_length=20,
        choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING,
        db_index=True,
    )
    reference = models.CharField(max_length=100, unique=True)
    idempotency_key = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payer", "status"]),
            models.Index(fields=["receiver", "status"]),
        ]

    def __str__(self):
        return (
            f"{self.transaction_type} — {self.amount} {self.currency} ({self.status})"
        )


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
