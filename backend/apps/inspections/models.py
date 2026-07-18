import uuid

from django.db import models

from apps.listings.models import Car
from apps.users.models import User, IDType
from django_countries.fields import CountryField


class InspectionCenter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_name = models.CharField(max_length=225)
    address = models.TextField()
    country = CountryField(blank_label="Select country", default="NG")
    country_code = models.CharField(max_length=3, default="NG")
    state = models.CharField(max_length=250)
    city = models.CharField(max_length=100)
    city_code = models.CharField(max_length=3)
    phone = models.CharField(blank=True, max_length=20, default="")
    email = models.EmailField(blank=True, default="")
    max_reschedules = models.PositiveSmallIntegerField(default=2)  # per center policy
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_centers"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inspection_centers"
        ordering = ["company_name", "-created_at", "country", "state"]
        verbose_name = "Inspection Center"
        verbose_name_plural = "Inspection Centers"

        indexes = [
            # Index for filtering active centers (very common query)
            models.Index(fields=["is_active"]),
            # Index for text searches on company_name
            models.Index(fields=["company_name"]),
        ]

    def __str__(self):

        return f"{self.company_name} - {self.city}, {self.state}"


class InspectionSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    capacity = models.PositiveSmallIntegerField(default=1)

    center = models.ForeignKey(
        InspectionCenter, on_delete=models.CASCADE, related_name="slots"
    )
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
                fields=["date", "start_time", "end_time", "center"],
                name="unique_slot_per_date_time_center",
            ),
        ]
        indexes = [
            models.Index(fields=["date", "is_active"]),
        ]

    def __str__(self):
        return f"{self.date} {self.start_time}–{self.end_time} @ {self.center}"


class BookingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    COMPLETED = "completed", "Completed"
    NO_SHOW = "no_show", "No Show"
    CANCELLED = "cancelled", "Cancelled"


class AssistanceStatus(models.TextChoices):
    OPEN = "open", "Open"
    HANDLED = "handled", "Handled"


ACTIVE_BOOKING_STATUSES = [BookingStatus.PENDING, BookingStatus.APPROVED]

# Bookings that actually took the slot — used for the staff calendar's display
# count so a completed/no-show inspection still reads as "booked" (it happened),
# matching the day-activity view. Only cancelled/rejected free the slot.
OCCUPIED_BOOKING_STATUSES = [
    BookingStatus.PENDING,
    BookingStatus.APPROVED,
    BookingStatus.COMPLETED,
    BookingStatus.NO_SHOW,
]

MAX_RESCHEDULES = 2


class AttendeeType(models.TextChoices):
    SELF = "self", "Owner attends"
    REPRESENTATIVE = "representative", "Representative attends"


class InspectionBooking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(
        Car, on_delete=models.CASCADE, related_name="inspection_bookings"
    )
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
    # Attendee declaration — who is physically showing up for the inspection.
    attendee_type = models.CharField(
        max_length=20, choices=AttendeeType.choices, default=AttendeeType.SELF
    )
    rep_name = models.CharField(max_length=200, blank=True, default="")
    rep_id_type = models.CharField(
        max_length=20, choices=IDType.choices, blank=True, default=""
    )
    rep_id_number = models.CharField(max_length=50, blank=True, default="")
    # Proof of authorization consent — null unless a representative is declared.
    # A timestamp (not a bool) records both that consent was given and when.
    consent_accepted_at = models.DateTimeField(null=True, blank=True)
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


class VehicleUsedCondition(models.TextChoices):
    USED = "used", "Used"
    BRAND_NEW = "brand_new", "Brand New"


class FuelType(models.TextChoices):
    PETROL = "petrol", "Petrol"
    DIESEL = "diesel", "Diesel"
    HYBRID = "hybrid", "Hybrid"
    ELECTRIC = "electric", "Electric"


class CarType(models.TextChoices):
    FOREIGN_USED = "foreign_used", "Foreign Used"
    BRAND_NEW = "brand_new", "Brand New"
    LOCAL_USED = "local_used", "Local Used"


class ComponentCondition(models.TextChoices):
    EXCELLENT = "excellent", "Excellent"
    GOOD = "good", "Good"
    FAIR = "fair", "Fair"
    POOR = "poor", "Poor"


class InspectionResult(models.TextChoices):
    PASSED = "passed", "Passed"
    NEEDS_CLEARANCE = "needs_clearance", "Needs Clearance"
    FAILED = "failed", "Failed"


class PresentedAttendee(models.TextChoices):
    """Who the inspector confirmed presented — only the owner or the declared
    representative are permitted to attend."""

    OWNER = "owner", "Owner"
    REPRESENTATIVE = "representative", "Declared representative"


class PhysicalInspection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        InspectionBooking, on_delete=models.CASCADE, related_name="inspection"
    )
    car = models.ForeignKey(
        Car, on_delete=models.CASCADE, related_name="physical_inspections"
    )
    inspector = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="inspections_performed"
    )
    condition = models.CharField(max_length=30, choices=VehicleUsedCondition.choices)
    mileage = models.PositiveIntegerField()
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices)
    car_type = models.CharField(max_length=20, choices=CarType.choices)
    features = models.JSONField(default=list)
    engine_condition = models.CharField(
        max_length=30, choices=ComponentCondition.choices
    )
    chassis_condition = models.CharField(
        max_length=20, choices=ComponentCondition.choices
    )
    ac_condition = models.CharField(max_length=20, choices=ComponentCondition.choices)
    is_flooded = models.BooleanField(default=False)
    has_accident_history = models.BooleanField(default=False)
    result = models.CharField(max_length=20, choices=InspectionResult.choices)
    staff_notes = models.TextField(blank=True, default="")
    # Day-of identity capture — who actually presented, and the ID they showed.
    # Staff-only: never serialized to owner/public responses.
    presented_attendee = models.CharField(
        max_length=20, choices=PresentedAttendee.choices, blank=True, default=""
    )
    presented_id_type = models.CharField(
        max_length=20, choices=IDType.choices, blank=True, default=""
    )
    presented_id_number = models.CharField(max_length=50, blank=True, default="")
    presented_id_document = models.ImageField(
        upload_to="identity-docs/presented/%Y/%m/", blank=True, null=True
    )

    inspected_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "physical_inspections"
        ordering = ["-created_at"]
        verbose_name = "Physical Inspection"
        verbose_name_plural = "Physical Inspections"

    def __str__(self):
        return f"Inspection for {self.car} on {self.created_at} -> {self.get_result_display()}"


class CustomDutyStatus(models.TextChoices):
    FULLY_PAID = "fully_paid", "Fully Paid"
    PARTLY_PAID = "partly_paid", "Partly Paid"
    NOT_AVAILABLE = "not_available", "Not Available"


class ReceiptType(models.TextChoices):

    COMPANY = "company", "Company"
    OTHER = "other", "Other"
    DEALERSHIP = "dealership", "Dealership"


class InspectionDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.OneToOneField(
        PhysicalInspection, on_delete=models.CASCADE, related_name="documents"
    )
    car_documents = models.FileField(upload_to="inspection-docs/%Y/%m/")
    receipt_upload = models.FileField(upload_to="inspection-docs/receipts/%Y/%m/")
    custom_duty_status = models.CharField(
        max_length=20,
        choices=CustomDutyStatus.choices,
    )
    receipt_type = models.CharField(max_length=20, choices=ReceiptType.choices)
    additional_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inspection_documents"
        verbose_name = "Inspection Document"
        verbose_name_plural = "Inspection Documents"

    def __str__(self):
        return f"Documents for {self.inspection.car}"


class ActorRole(models.TextChoices):
    OWNER = "owner", "Owner"
    STAFF = "staff", "Staff"
    SYSTEM = "system", "System"


class CarStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    car = models.ForeignKey(
        Car, on_delete=models.CASCADE, related_name="status_history"
    )
    from_status = models.CharField(max_length=30, blank=True, default="")
    to_status = models.CharField(max_length=30)
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="car_status_changes"
    )
    actor_role = models.CharField(max_length=20, choices=ActorRole.choices)
    note = models.TextField(blank=True, default="")
    actor_name = models.CharField(max_length=255, blank=True, default="")
    actor_email = models.CharField(max_length=254, blank=True, default="")
    actor_phone = models.CharField(max_length=20, blank=True, default="")
    # Request forensics — who acted, from where. Empty for system transitions
    # (auto-publish, etc.) since those have no HTTP request behind them.
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "car_status_history"
        ordering = ["created_at"]
        verbose_name = "Car Status History"
        verbose_name_plural = "Car Status Histories"
        indexes = [
            models.Index(fields=["car", "created_at"]),
        ]

    def __str__(self):
        return f"{self.car} - {self.from_status} -> {self.to_status}"


class AssistanceRequest(models.Model):
    """
    An owner in a state with no inspection center asks staff to help book.
    Backs the 'no centers near you' flow and the staff work queue
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="assistance_requests"
    )
    car = models.ForeignKey(
        Car,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="assistance_requests",
    )
    country = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=250, blank=True, default="")
    message = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=10,
        choices=AssistanceStatus.choices,
        default=AssistanceStatus.OPEN,
        db_index=True,
    )
    handled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_assistance",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    handled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Assistance {self.owner} ({self.status})"
