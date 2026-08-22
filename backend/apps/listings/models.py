from django.db import models
from django.utils.text import slugify
from django_countries.fields import CountryField
import uuid


from apps.users.models import User, OwnerProfile


class Brand(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    # Lower sorts first — Nigeria-common brands get a low value so they float to
    # the top of the picker; ties break alphabetically.
    display_order = models.PositiveSmallIntegerField(default=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


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
    PENDING_PUBLISHING = "pending_publishing", "Pending Publishing"
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
    branch = models.ForeignKey(
        "Branch", null=True, blank=True, on_delete=models.PROTECT, related_name="cars"
    )

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
    vin = models.CharField(max_length=17, blank=True, null=True)
    plate_number = models.CharField(max_length=12, blank=True, null=True)

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
    # Canonical brand (source of truth = Brand table). Null only for an "Other"
    # brand pending staff review — see brand_other.
    brand = models.ForeignKey(
        Brand,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="cars",
    )
    model = models.CharField(
        max_length=100,
    )
    # The owner's typed brand when it isn't on the canonical list. Non-empty ⇒
    # needs staff review (folded into the Brand table during approval).
    brand_other = models.CharField(max_length=100, blank=True, default="")
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
        constraints = [
            # At most one live (non-archived) listing per VIN / plate. A sold car
            # is ARCHIVED, which frees its VIN/plate for the new owner to relist.
            models.UniqueConstraint(
                fields=["vin"],
                condition=models.Q(vin__isnull=False)
                & ~models.Q(status=CarStatus.ARCHIVED),
                name="one_active_listing_per_vin",
            ),
            models.UniqueConstraint(
                fields=["plate_number"],
                condition=models.Q(plate_number__isnull=False)
                & ~models.Q(status=CarStatus.ARCHIVED),
                name="one_active_listing_per_plate",
            ),
        ]

    def __str__(self):
        brand = self.brand.name if self.brand_id else (self.brand_other or "—")
        return f"{self.year} {brand} {self.model} — {self.title}"

    @property
    def needs_brand_review(self):
        return bool(self.brand_other)


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
    INSPECTION = "inspection", "Inspection fee"
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
    # Nullable: platform fees (e.g. an inspection fee) have no rental/buy request.
    request = models.ForeignKey(
        Request,
        on_delete=models.CASCADE,
        related_name="transactions",
        null=True,
        blank=True,
    )
    # Set for inspection-fee transactions so the car/owner can be shown.
    inspection_booking = models.ForeignKey(
        "inspections.InspectionBooking",
        on_delete=models.SET_NULL,
        related_name="transactions",
        null=True,
        blank=True,
    )
    payer = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="payments_made"
    )
    # Nullable: a platform fee is paid to EverythingCars, not another user.
    receiver = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="payments_received",
        null=True,
        blank=True,
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

    # SET_NULL (not CASCADE) so deleting a staff/team-member account anonymizes
    # the events they authored instead of erasing a request's history.
    actor = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:

        ordering = ["created_at"]  # Correct — oldest first, shows the timeline in order


class DeletionOutcome(models.TextChoices):
    SOLD_PLATFORM = "sold_platform", "Sold on EverythingCars"
    SOLD_ELSEWHERE = "sold_elsewhere", "Sold elsewhere"
    NOT_SOLD = "not_sold", "Not sold / other reason"


class CarDeletionFeedback(models.Model):
    """Optional 'was it sold?' survey captured when an owner deletes (archives) a
    listing. Feeds sales/marketing analytics — a 'sold elsewhere' answer is a lost
    sale we can act on."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(
        Car, on_delete=models.CASCADE, related_name="deletion_feedback"
    )
    deleted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    deleted_by_name = models.CharField(max_length=255, blank=True, default="")
    outcome = models.CharField(max_length=20, choices=DeletionOutcome.choices)
    sale_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    amount_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "car_deletion_feedback"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.car_id} — {self.outcome}"


class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(
        OwnerProfile, on_delete=models.CASCADE, related_name="branches"
    )
    name = models.CharField(max_length=255)
    # A branch can be in a different country than the business's registered one;
    # its fleet cars inherit this country (and the state/city below).
    country = CountryField(blank=True, blank_label="Select country")
    state = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    street_address = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "branches"
        ordering = ["-is_active", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "name"], name="unique_branch_name_per_business"
            ),
        ]

    def __str__(self):
        return f"{self.business.fleet_name} - {self.name}"
