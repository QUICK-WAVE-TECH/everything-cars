# Pay-to-book Inspection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the owner's physical-inspection booking behind a one-time, non-refundable fee (inspection + listing + VAT) paid by manual bank transfer + receipt and confirmed by staff.

**Architecture:** An admin-editable `FeeSetting` singleton supplies the quote. Booking-create now takes a receipt, snapshots the quote into a new `InspectionPayment` (OneToOne on the booking), and parks the booking in a new `AWAITING_PAYMENT` status that holds the slot. Staff confirm (→ `PENDING`) or reject (→ `CANCELLED`, slot freed, car reverted). Frontend adds a Summary+payment step to the booking wizard and confirm/reject actions to the staff view.

**Tech Stack:** Django 5.2 + DRF (backend, `uv`, `manage.py test`), Next.js 16 + React Query + shadcn (frontend). Reuses existing patterns: `create_booking_core`, `CustomerPaymentSubmitView` receipt validation, `StaffConfirmPaymentView`, `schedule_notification`/`_create_notification`/`send_email`.

**Workflow split:** Backend tasks (1–8) are written BY THE USER (Namy) with Claude guiding step-by-step TDD — failing test first, reference code, why. Frontend tasks (9–11) Claude implements directly.

**Branch:** `feat/spec3-pay-to-book-inspection` (already created off `origin/main`, spec committed).

**Conventions:**
- Run backend tests with `cd backend && uv run python manage.py test <path>`.
- After any `makemigrations`, apply with `uv run python manage.py migrate` (the dev DB is not auto-migrated).
- Always `select_related`/`prefetch_related` on multi-row/related reads.
- `docs/` is gitignored — commit plan/spec with `git add -f`.
- No `Co-Authored-By` trailer on commits.

---

## File Structure

**Backend (`backend/apps/inspections/`)**
- `models.py` — add `FeeSetting`, `InspectionPayment`, `BookingStatus.AWAITING_PAYMENT`; extend `ACTIVE_BOOKING_STATUSES` + `OCCUPIED_BOOKING_STATUSES`.
- `views.py` — add `initial_status` param to `create_booking_core`; modify `OwnerBookingCreateView` (receipt + payment); add `FeeQuoteView`, `StaffConfirmInspectionPaymentView`, `StaffRejectInspectionPaymentView`.
- `serializers.py` — add `FeeQuoteSerializer` (output shape), `InspectionPaymentSerializer`; expose `payment` on `InspectionBookingDetailSerializer`.
- `urls.py` — add `bookings/fee-quote/`, `admin/bookings/<uuid>/confirm-payment/`, `admin/bookings/<uuid>/reject-payment/`.
- `admin.py` — register `FeeSetting`, `InspectionPayment`.
- `tests.py` (or `tests/`) — new tests per task.

**Backend (`backend/apps/notifications/`)**
- `models.py` — 3 new `NotificationType` values.
- `service.py` — `notify_inspection_payment_submitted/confirmed/rejected`.
- `templates/emails/` — `inspection_payment_submitted.html`, `inspection_payment_confirmed.html`, `inspection_payment_rejected.html`.

**Frontend (`frontend/src/features/inspections/`)**
- `api/*` — `useFeeQuote`, payment-aware booking create, `useConfirmInspectionPayment`, `useRejectInspectionPayment`; extend the booking type with `payment` + `awaiting_payment` status.
- booking wizard component — Summary+payment step.
- owner bookings list — "Awaiting payment confirmation" state.
- staff bookings view — confirm/reject payment actions.

---

## Task 1: `FeeSetting` singleton + quote

**Files:**
- Modify: `backend/apps/inspections/models.py`
- Modify: `backend/apps/inspections/admin.py`
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/inspections/tests.py`:

```python
from decimal import Decimal

from django.test import TestCase

from apps.inspections.models import FeeSetting


class FeeSettingTest(TestCase):
    def test_get_solo_creates_one_row_with_defaults(self):
        fee = FeeSetting.get_solo()
        self.assertEqual(fee.pk, 1)
        self.assertEqual(FeeSetting.get_solo().pk, 1)  # idempotent
        self.assertEqual(FeeSetting.objects.count(), 1)
        self.assertEqual(fee.vat_rate, Decimal("0.0750"))

    def test_quote_computes_vat_and_total(self):
        fee = FeeSetting.get_solo()
        fee.inspection_fee = Decimal("15000.00")
        fee.listing_fee = Decimal("5000.00")
        fee.vat_rate = Decimal("0.0750")
        fee.save()
        q = fee.quote()
        self.assertEqual(q["subtotal"], Decimal("20000.00"))
        self.assertEqual(q["vat_amount"], Decimal("1500.00"))
        self.assertEqual(q["total"], Decimal("21500.00"))
        self.assertEqual(q["currency"], "NGN")

    def test_quote_rounds_vat_half_up_to_two_dp(self):
        fee = FeeSetting.get_solo()
        fee.inspection_fee = Decimal("10000.00")
        fee.listing_fee = Decimal("3333.33")
        fee.vat_rate = Decimal("0.0750")
        fee.save()
        # subtotal 13333.33 * 0.075 = 999.99975 -> 1000.00
        self.assertEqual(fee.quote()["vat_amount"], Decimal("1000.00"))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.FeeSettingTest -v 2`
Expected: FAIL — `ImportError: cannot import name 'FeeSetting'`.

- [ ] **Step 3: Implement `FeeSetting`**

In `backend/apps/inspections/models.py`, add at the top with the other imports:

```python
from decimal import Decimal, ROUND_HALF_UP
```

Add the model (place it near the top, after the imports, before `InspectionCenter`):

```python
class FeeSetting(models.Model):
    """Admin-editable singleton (pk pinned to 1) holding the owner listing/inspection
    fees. `get_solo()` returns the single row, creating it with defaults on first read."""

    inspection_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    listing_fee = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    vat_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.0750")
    )
    # Platform bank details shown on the payment Summary.
    bank_name = models.CharField(max_length=100, blank=True, default="")
    bank_account_name = models.CharField(max_length=200, blank=True, default="")
    bank_account_number = models.CharField(max_length=20, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Fee Setting"
        verbose_name_plural = "Fee Settings"

    def __str__(self):
        return f"Fees: inspection {self.inspection_fee}, listing {self.listing_fee}"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def quote(self):
        subtotal = self.inspection_fee + self.listing_fee
        vat_amount = (subtotal * self.vat_rate).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return {
            "inspection_fee": self.inspection_fee,
            "listing_fee": self.listing_fee,
            "subtotal": subtotal,
            "vat_amount": vat_amount,
            "total": subtotal + vat_amount,
            "currency": "NGN",
        }
```

- [ ] **Step 4: Make & apply the migration**

Run:
```bash
cd backend && uv run python manage.py makemigrations inspections && uv run python manage.py migrate
```
Expected: a new migration adding `FeeSetting`, applied cleanly.

- [ ] **Step 5: Register in admin**

In `backend/apps/inspections/admin.py`, add:

```python
from .models import FeeSetting


@admin.register(FeeSetting)
class FeeSettingAdmin(admin.ModelAdmin):
    list_display = ("inspection_fee", "listing_fee", "vat_rate", "updated_at")

    def has_add_permission(self, request):
        # Singleton — edit the one row, never add more.
        return not FeeSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.FeeSettingTest -v 2`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/apps/inspections/models.py backend/apps/inspections/admin.py backend/apps/inspections/migrations/ backend/apps/inspections/tests.py
git commit -m "feat(inspections): FeeSetting singleton with fee quote"
```

---

## Task 2: `AWAITING_PAYMENT` booking status

**Files:**
- Modify: `backend/apps/inspections/models.py` (`BookingStatus`, `ACTIVE_BOOKING_STATUSES`, `OCCUPIED_BOOKING_STATUSES`)
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/inspections/tests.py`:

```python
from django.db.utils import IntegrityError

from apps.inspections.models import (
    ACTIVE_BOOKING_STATUSES,
    BookingStatus,
    InspectionBooking,
)


class AwaitingPaymentStatusTest(TestCase):
    def test_awaiting_payment_is_an_active_status(self):
        self.assertIn(BookingStatus.AWAITING_PAYMENT, ACTIVE_BOOKING_STATUSES)

    def test_awaiting_payment_holds_the_slot_uniquely_per_car(self):
        # Reuse the booking factory built in the existing test module.
        from apps.inspections.tests import make_booking_fixture

        ctx = make_booking_fixture()
        InspectionBooking.objects.create(
            car=ctx["car"],
            slot=ctx["slot"],
            booked_by=ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        with self.assertRaises(IntegrityError):
            InspectionBooking.objects.create(
                car=ctx["car"],
                slot=ctx["slot"],
                booked_by=ctx["owner"],
                status=BookingStatus.AWAITING_PAYMENT,
            )
```

> **Note:** If `make_booking_fixture` does not already exist in `tests.py`, add a small helper that creates an owner (with `OwnerProfile`, ID on file), a `Car` in a bookable status, an `InspectionCenter`, and a future active `InspectionSlot`, returning them in a dict. Mirror the setUp of the existing booking tests in this file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.AwaitingPaymentStatusTest -v 2`
Expected: FAIL — `AttributeError: AWAITING_PAYMENT` (member doesn't exist).

- [ ] **Step 3: Add the status and extend the status lists**

In `backend/apps/inspections/models.py`, update `BookingStatus` so `AWAITING_PAYMENT` sorts first:

```python
class BookingStatus(models.TextChoices):
    AWAITING_PAYMENT = "awaiting_payment", "Awaiting payment"
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    COMPLETED = "completed", "Completed"
    NO_SHOW = "no_show", "No Show"
    CANCELLED = "cancelled", "Cancelled"
```

Update the two module-level lists:

```python
ACTIVE_BOOKING_STATUSES = [
    BookingStatus.AWAITING_PAYMENT,
    BookingStatus.PENDING,
    BookingStatus.APPROVED,
]

OCCUPIED_BOOKING_STATUSES = [
    BookingStatus.AWAITING_PAYMENT,
    BookingStatus.PENDING,
    BookingStatus.APPROVED,
    BookingStatus.COMPLETED,
    BookingStatus.NO_SHOW,
]
```

- [ ] **Step 4: Make & apply the migration**

The `one_active_booking_per_car` constraint condition references `ACTIVE_BOOKING_STATUSES`, so its definition changed and needs a migration.

Run:
```bash
cd backend && uv run python manage.py makemigrations inspections && uv run python manage.py migrate
```
Expected: a migration altering the `one_active_booking_per_car` constraint, applied cleanly.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.AwaitingPaymentStatusTest -v 2`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/inspections/models.py backend/apps/inspections/migrations/ backend/apps/inspections/tests.py
git commit -m "feat(inspections): AWAITING_PAYMENT status holds the slot"
```

---

## Task 3: `InspectionPayment` model

**Files:**
- Modify: `backend/apps/inspections/models.py`
- Modify: `backend/apps/inspections/admin.py`
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/inspections/tests.py`:

```python
from apps.inspections.models import InspectionPayment


class InspectionPaymentModelTest(TestCase):
    def test_payment_snapshots_amounts_and_links_one_to_one(self):
        from apps.inspections.tests import make_booking_fixture

        ctx = make_booking_fixture()
        booking = InspectionBooking.objects.create(
            car=ctx["car"], slot=ctx["slot"], booked_by=ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        payment = InspectionPayment.objects.create(
            booking=booking,
            inspection_fee=Decimal("15000.00"),
            listing_fee=Decimal("5000.00"),
            vat_amount=Decimal("1500.00"),
            total=Decimal("21500.00"),
            currency="NGN",
            receipt="inspection_payments/r.pdf",
            payment_method="transfer",
        )
        self.assertEqual(booking.payment, payment)          # reverse OneToOne
        self.assertEqual(payment.status, "submitted")        # default
        self.assertEqual(payment.total, Decimal("21500.00"))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.InspectionPaymentModelTest -v 2`
Expected: FAIL — `ImportError: cannot import name 'InspectionPayment'`.

- [ ] **Step 3: Implement `InspectionPayment`**

In `backend/apps/inspections/models.py`, add after `InspectionBooking`:

```python
class InspectionPaymentStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    CONFIRMED = "confirmed", "Confirmed"
    REJECTED = "rejected", "Rejected"


class InspectionPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        InspectionBooking, on_delete=models.CASCADE, related_name="payment"
    )
    # Amounts are snapshotted at submit time so later FeeSetting edits never
    # rewrite an existing payment record.
    inspection_fee = models.DecimalField(max_digits=12, decimal_places=2)
    listing_fee = models.DecimalField(max_digits=12, decimal_places=2)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="NGN")

    receipt = models.FileField(upload_to="inspection_payments/")
    payment_method = models.CharField(
        max_length=20,
        choices=[("transfer", "Bank Transfer"), ("card", "Card")],
        default="transfer",
    )
    status = models.CharField(
        max_length=20,
        choices=InspectionPaymentStatus.choices,
        default=InspectionPaymentStatus.SUBMITTED,
        db_index=True,
    )
    staff_note = models.CharField(max_length=400, blank=True, default="")
    submitted_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Payment {self.total} {self.currency} ({self.status})"
```

- [ ] **Step 4: Make & apply the migration**

Run:
```bash
cd backend && uv run python manage.py makemigrations inspections && uv run python manage.py migrate
```
Expected: migration adding `InspectionPayment`, applied cleanly.

- [ ] **Step 5: Register in admin**

In `backend/apps/inspections/admin.py`, add:

```python
from .models import InspectionPayment


@admin.register(InspectionPayment)
class InspectionPaymentAdmin(admin.ModelAdmin):
    list_display = ("booking", "total", "currency", "status", "submitted_at")
    list_filter = ("status", "payment_method")
    readonly_fields = (
        "booking", "inspection_fee", "listing_fee", "vat_amount", "total",
        "currency", "receipt", "payment_method", "submitted_at", "confirmed_at",
        "confirmed_by",
    )
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.InspectionPaymentModelTest -v 2`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/inspections/models.py backend/apps/inspections/admin.py backend/apps/inspections/migrations/ backend/apps/inspections/tests.py
git commit -m "feat(inspections): InspectionPayment with snapshotted amounts"
```

---

## Task 4: Fee-quote endpoint

**Files:**
- Modify: `backend/apps/inspections/serializers.py`
- Modify: `backend/apps/inspections/views.py`
- Modify: `backend/apps/inspections/urls.py`
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/inspections/tests.py`:

```python
from rest_framework.test import APITestCase

from apps.inspections.models import FeeSetting


class FeeQuoteEndpointTest(APITestCase):
    def setUp(self):
        from apps.inspections.tests import make_owner_with_id
        self.owner = make_owner_with_id()
        fee = FeeSetting.get_solo()
        fee.inspection_fee = Decimal("15000.00")
        fee.listing_fee = Decimal("5000.00")
        fee.bank_name = "GTBank"
        fee.bank_account_number = "0123456789"
        fee.save()

    def test_owner_gets_fee_breakdown(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/v1/inspections/bookings/fee-quote/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total"], "21500.00")
        self.assertEqual(res.data["vat_amount"], "1500.00")
        self.assertEqual(res.data["bank_account_number"], "0123456789")

    def test_anonymous_rejected(self):
        res = self.client.get("/api/v1/inspections/bookings/fee-quote/")
        self.assertIn(res.status_code, (401, 403))
```

> **Note:** If `make_owner_with_id` doesn't exist yet, add it near `make_booking_fixture` — it returns an `owner` `User` with an `OwnerProfile` that has `id_type` and `id_document` set (so the ID gate passes).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.FeeQuoteEndpointTest -v 2`
Expected: FAIL — 404 (route not registered).

- [ ] **Step 3: Add the serializer**

In `backend/apps/inspections/serializers.py`, add:

```python
class FeeQuoteSerializer(serializers.Serializer):
    inspection_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    listing_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2)
    vat_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField()
    bank_name = serializers.CharField()
    bank_account_name = serializers.CharField()
    bank_account_number = serializers.CharField()
```

- [ ] **Step 4: Add the view**

In `backend/apps/inspections/views.py`, add (near the other owner views; reuse the existing `IsOwner` import):

```python
from .models import FeeSetting
from .serializers import FeeQuoteSerializer


class FeeQuoteView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        fee = FeeSetting.get_solo()
        data = fee.quote()
        data.update(
            bank_name=fee.bank_name,
            bank_account_name=fee.bank_account_name,
            bank_account_number=fee.bank_account_number,
        )
        return Response(FeeQuoteSerializer(data).data)
```

- [ ] **Step 5: Register the route**

In `backend/apps/inspections/urls.py`, add `FeeQuoteView` to the import block and add this path **above** the `bookings/` create path (so `fee-quote` isn't shadowed):

```python
    path("bookings/fee-quote/", FeeQuoteView.as_view(), name="fee-quote"),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.FeeQuoteEndpointTest -v 2`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/apps/inspections/serializers.py backend/apps/inspections/views.py backend/apps/inspections/urls.py backend/apps/inspections/tests.py
git commit -m "feat(inspections): GET fee-quote for the payment summary"
```

---

## Task 5: Booking-create requires payment

**Files:**
- Modify: `backend/apps/inspections/views.py` (`create_booking_core`, `OwnerBookingCreateView`)
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/inspections/tests.py`:

```python
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile


def _receipt(name="r.pdf", content=b"%PDF-1.4 test", ctype="application/pdf"):
    return SimpleUploadedFile(name, content, content_type=ctype)


class OwnerBookingPaymentCreateTest(APITestCase):
    def setUp(self):
        from apps.inspections.tests import make_booking_fixture
        self.ctx = make_booking_fixture()
        self.owner = self.ctx["owner"]
        fee = FeeSetting.get_solo()
        fee.inspection_fee = Decimal("15000.00")
        fee.listing_fee = Decimal("5000.00")
        fee.save()
        self.client.force_authenticate(user=self.owner)

    def _payload(self, **over):
        data = {
            "car_id": str(self.ctx["car"].id),
            "slot_id": str(self.ctx["slot"].id),
            "attendee_type": "self",
            "payment_method": "transfer",
            "receipt": _receipt(),
        }
        data.update(over)
        return data

    def test_booking_without_receipt_is_rejected(self):
        payload = self._payload()
        payload.pop("receipt")
        res = self.client.post(
            "/api/v1/inspections/bookings/", payload, format="multipart"
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(InspectionBooking.objects.count(), 0)

    def test_booking_with_receipt_awaits_payment_and_snapshots(self):
        res = self.client.post(
            "/api/v1/inspections/bookings/", self._payload(), format="multipart"
        )
        self.assertEqual(res.status_code, 201, res.data)
        booking = InspectionBooking.objects.get()
        self.assertEqual(booking.status, BookingStatus.AWAITING_PAYMENT)
        self.assertEqual(booking.payment.status, "submitted")
        self.assertEqual(booking.payment.total, Decimal("21500.00"))

    def test_bad_receipt_type_rejected(self):
        res = self.client.post(
            "/api/v1/inspections/bookings/",
            self._payload(receipt=_receipt("r.txt", b"x", "text/plain")),
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(InspectionBooking.objects.count(), 0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.OwnerBookingPaymentCreateTest -v 2`
Expected: FAIL — booking currently lands in `PENDING` with no receipt required.

- [ ] **Step 3: Add `initial_status` to `create_booking_core`**

In `backend/apps/inspections/views.py`, change the signature and the `InspectionBooking.objects.create(...)` call inside `create_booking_core`:

```python
def create_booking_core(
    *, car, slot, booked_by, attendee, actor, actor_role, request=None,
    initial_status=BookingStatus.PENDING,
):
```

and in the `create(...)` call add:

```python
            status=initial_status,
```

(Leave `StaffBookForOwnerView`'s call unchanged — it keeps the `PENDING` default, so staff-booked inspections skip the fee gate.)

- [ ] **Step 4: Modify `OwnerBookingCreateView`**

Add `MultiPartParser` and receipt handling. Update the imports at the top of `views.py`:

```python
from rest_framework.parsers import MultiPartParser, FormParser
from .models import FeeSetting, InspectionPayment, InspectionPaymentStatus
```

Replace the body of `OwnerBookingCreateView.post` so that, after the ID gate and after `create_booking_core` returns the booking (call it with `initial_status=BookingStatus.AWAITING_PAYMENT`), it validates the receipt and creates the payment **inside the same `transaction.atomic()` block**:

```python
class OwnerBookingCreateView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_RECEIPT_TYPES = [
        "image/jpeg", "image/png", "image/webp", "application/pdf",
    ]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        profile = getattr(request.user, "owner_profile", None)
        if not profile or not profile.id_type or not profile.id_document:
            return Response(
                {"detail": "Complete your ID verification in your profile before booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method = request.data.get("payment_method", "transfer")
        if method not in ("transfer", "card"):
            return Response(
                {"detail": "Invalid payment method. Must be 'transfer' or 'card'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        receipt = request.FILES.get("receipt")
        if not receipt:
            return Response(
                {"detail": "Payment receipt is required to book an inspection."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if receipt.content_type not in self.ALLOWED_RECEIPT_TYPES:
            return Response(
                {"detail": "Receipt must be a JPG, PNG, WebP, or PDF file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if receipt.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Receipt file must be 5MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(
                    id=data["car_id"], owner=request.user
                )
            except Car.DoesNotExist:
                return Response(
                    {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
                )
            try:
                slot = (
                    InspectionSlot.objects.select_related("center")
                    .select_for_update(of=("self",))
                    .get(id=data["slot_id"], is_active=True)
                )
            except InspectionSlot.DoesNotExist:
                return Response(
                    {"detail": "Slot not found or inactive."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            booking, error = create_booking_core(
                car=car, slot=slot, booked_by=request.user, attendee=data,
                actor=request.user, actor_role=ActorRole.OWNER, request=request,
                initial_status=BookingStatus.AWAITING_PAYMENT,
            )
            if error:
                return error

            q = FeeSetting.get_solo().quote()
            InspectionPayment.objects.create(
                booking=booking,
                inspection_fee=q["inspection_fee"],
                listing_fee=q["listing_fee"],
                vat_amount=q["vat_amount"],
                total=q["total"],
                currency=q["currency"],
                receipt=receipt,
                payment_method=method,
                status=InspectionPaymentStatus.SUBMITTED,
            )

        schedule_notification(
            notify_inspection_payment_submitted,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        detail = booking_detail_queryset().get(id=booking.id)
        return Response(
            InspectionBookingSerializer(detail).data, status=status.HTTP_201_CREATED,
        )
```

> `notify_inspection_payment_submitted` is created in Task 6. Import it alongside the existing notification imports at the top of `views.py`: `from apps.notifications.service import notify_inspection_payment_submitted` (add to the existing import line). This task's tests don't assert on notifications, so a `NameError` here means Task 6 must land first if running out of order — but in-order, Task 6 precedes wiring. If you implement Task 5 before Task 6, temporarily stub the import; the ordering below runs Task 6's model/service pieces first is NOT required because the create test doesn't fire commit hooks under `TestCase`'s atomic wrapper. To avoid churn, implement Task 6 before running Task 5's Step 6.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.OwnerBookingPaymentCreateTest -v 2`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/inspections/views.py backend/apps/inspections/tests.py
git commit -m "feat(inspections): booking-create requires receipt, parks in AWAITING_PAYMENT"
```

---

## Task 6: Payment notifications

**Files:**
- Modify: `backend/apps/notifications/models.py` (`NotificationType`)
- Modify: `backend/apps/notifications/service.py`
- Create: `backend/apps/notifications/templates/emails/inspection_payment_submitted.html`
- Create: `backend/apps/notifications/templates/emails/inspection_payment_confirmed.html`
- Create: `backend/apps/notifications/templates/emails/inspection_payment_rejected.html`
- Test: `backend/apps/notifications/tests.py` (or the inspections test module)

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/notifications/tests.py`:

```python
from django.test import TestCase

from apps.notifications.models import Notification, NotificationType


class InspectionPaymentNotificationTest(TestCase):
    def test_notify_submitted_pings_all_staff(self):
        from apps.inspections.tests import make_booking_fixture
        from apps.inspections.models import (
            BookingStatus, InspectionBooking, InspectionPayment,
        )
        from apps.notifications.service import notify_inspection_payment_submitted
        from apps.users.models import User
        from decimal import Decimal

        staff = User.objects.create_user(
            email="staff@t.com", first_name="S", last_name="T",
            password="pw12345678", role="customer", is_active=True, is_staff=True,
        )
        ctx = make_booking_fixture()
        booking = InspectionBooking.objects.create(
            car=ctx["car"], slot=ctx["slot"], booked_by=ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        InspectionPayment.objects.create(
            booking=booking, inspection_fee=Decimal("1"), listing_fee=Decimal("1"),
            vat_amount=Decimal("0"), total=Decimal("2"), receipt="x.pdf",
        )
        notify_inspection_payment_submitted(booking)
        self.assertTrue(
            Notification.objects.filter(
                recipient=staff,
                notification_type=NotificationType.INSPECTION_PAYMENT_SUBMITTED,
            ).exists()
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.notifications.tests.InspectionPaymentNotificationTest -v 2`
Expected: FAIL — `AttributeError: INSPECTION_PAYMENT_SUBMITTED` / import error.

- [ ] **Step 3: Add the notification types**

In `backend/apps/notifications/models.py`, add to `NotificationType`:

```python
    INSPECTION_PAYMENT_SUBMITTED = "inspection_payment_submitted", "Inspection payment submitted"
    INSPECTION_PAYMENT_CONFIRMED = "inspection_payment_confirmed", "Inspection payment confirmed"
    INSPECTION_PAYMENT_REJECTED = "inspection_payment_rejected", "Inspection payment rejected"
```

- [ ] **Step 4: Make & apply the migration** (NotificationType is a field `choices` change — Django records it)

Run:
```bash
cd backend && uv run python manage.py makemigrations notifications && uv run python manage.py migrate
```
Expected: a migration altering `notification_type` choices, applied cleanly.

- [ ] **Step 5: Add the service functions**

In `backend/apps/notifications/service.py`, add (mirroring `notify_payment_submitted` / `notify_payment_confirmed`, and using the existing `send_email` + `_fe` helpers already imported in the file):

```python
def notify_inspection_payment_submitted(booking):
    """All staff get pinged when an owner submits an inspection payment."""
    payment = booking.payment
    for staff in User.objects.filter(is_staff=True, is_active=True):
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.INSPECTION_PAYMENT_SUBMITTED,
            title="Inspection payment needs verification",
            message=f"{booking.booked_by.first_name} paid to inspect {booking.car.title}",
            data={
                "booking_id": str(booking.id),
                "car_title": booking.car.title,
                "total": str(payment.total),
                "currency": payment.currency,
            },
        )
        send_email(
            recipient=staff,
            subject="Inspection payment needs verification",
            template_key="inspection_payment_submitted",
            context={
                "car_title": booking.car.title,
                "total": str(payment.total),
                "currency": payment.currency,
                "review_url": _fe("/admin/inspections"),
            },
        )


def notify_inspection_payment_confirmed(booking):
    owner = booking.booked_by
    _create_notification(
        recipient=owner,
        notification_type=NotificationType.INSPECTION_PAYMENT_CONFIRMED,
        title="Inspection payment confirmed",
        message=f"Your inspection for {booking.car.title} is confirmed.",
        data={"booking_id": str(booking.id), "car_title": booking.car.title},
    )
    send_email(
        recipient=owner,
        subject="Your inspection is confirmed",
        template_key="inspection_payment_confirmed",
        context={
            "car_title": booking.car.title,
            "slot_date": str(booking.slot.date),
            "slot_time": str(booking.slot.start_time),
        },
    )


def notify_inspection_payment_rejected(booking):
    owner = booking.booked_by
    reason = booking.payment.staff_note
    _create_notification(
        recipient=owner,
        notification_type=NotificationType.INSPECTION_PAYMENT_REJECTED,
        title="Inspection payment could not be verified",
        message=f"Your payment for {booking.car.title} was not verified.",
        data={"booking_id": str(booking.id), "reason": reason},
    )
    send_email(
        recipient=owner,
        subject="Inspection payment could not be verified",
        template_key="inspection_payment_rejected",
        context={"car_title": booking.car.title, "reason": reason},
    )
```

> If `_fe` is not already defined/imported in `service.py`, use the same helper the deal notifications use (`review_url=_fe("/admin/inspections")`); check the top of `service.py` — it was added in Spec 2.

- [ ] **Step 6: Create the email templates**

Create `backend/apps/notifications/templates/emails/inspection_payment_submitted.html`:

```html
<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#111">
<h2>Inspection payment to verify</h2>
<p>An owner submitted a payment of {{ currency }} {{ total }} to inspect
<strong>{{ car_title }}</strong>.</p>
<p><a href="{{ review_url }}">Review &amp; confirm in the admin</a></p>
</body></html>
```

Create `backend/apps/notifications/templates/emails/inspection_payment_confirmed.html`:

```html
<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#111">
<h2>Your inspection is confirmed</h2>
<p>We verified your payment for <strong>{{ car_title }}</strong>.</p>
<p>Your appointment: {{ slot_date }} at {{ slot_time }}.</p>
</body></html>
```

Create `backend/apps/notifications/templates/emails/inspection_payment_rejected.html`:

```html
<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#111">
<h2>Payment could not be verified</h2>
<p>We could not verify your payment for <strong>{{ car_title }}</strong>.</p>
{% if reason %}<p>Reason: {{ reason }}</p>{% endif %}
<p>Please re-book and submit a valid receipt to try again.</p>
</body></html>
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.notifications.tests.InspectionPaymentNotificationTest -v 2`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/notifications/models.py backend/apps/notifications/service.py backend/apps/notifications/templates/emails/ backend/apps/notifications/migrations/ backend/apps/notifications/tests.py
git commit -m "feat(notifications): inspection payment submitted/confirmed/rejected"
```

---

## Task 7: Staff confirm / reject payment endpoints

**Files:**
- Modify: `backend/apps/inspections/views.py`
- Modify: `backend/apps/inspections/urls.py`
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/inspections/tests.py`:

```python
class StaffPaymentActionTest(APITestCase):
    def setUp(self):
        from apps.inspections.tests import make_booking_fixture
        from apps.users.models import User
        self.ctx = make_booking_fixture()
        self.staff = User.objects.create_user(
            email="pay-staff@t.com", first_name="S", last_name="T",
            password="pw12345678", role="customer", is_active=True, is_staff=True,
        )
        self.booking = InspectionBooking.objects.create(
            car=self.ctx["car"], slot=self.ctx["slot"], booked_by=self.ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        InspectionPayment.objects.create(
            booking=self.booking, inspection_fee=Decimal("1"), listing_fee=Decimal("1"),
            vat_amount=Decimal("0"), total=Decimal("2"), receipt="x.pdf",
        )
        # Booking-create would have moved the car to INSPECTION_PENDING; emulate it.
        from apps.listings.models import CarStatus
        self.ctx["car"].status = CarStatus.INSPECTION_PENDING
        self.ctx["car"].save(update_fields=["status"])

    def test_confirm_moves_booking_to_pending(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/confirm-payment/"
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.PENDING)
        self.assertEqual(self.booking.payment.status, "confirmed")

    def test_reject_cancels_booking_and_frees_slot(self):
        from apps.listings.models import CarStatus
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/reject-payment/",
            {"reason": "Receipt unreadable."}, format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.booking.refresh_from_db()
        self.ctx["car"].refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.CANCELLED)
        self.assertEqual(self.booking.payment.status, "rejected")
        self.assertEqual(self.ctx["car"].status, CarStatus.LISTING_APPROVED)

    def test_confirm_requires_awaiting_payment(self):
        self.booking.status = BookingStatus.PENDING
        self.booking.save(update_fields=["status"])
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/v1/inspections/admin/bookings/{self.booking.id}/confirm-payment/"
        )
        self.assertEqual(res.status_code, 400)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.StaffPaymentActionTest -v 2`
Expected: FAIL — 404 (routes not registered).

- [ ] **Step 3: Add the views**

In `backend/apps/inspections/views.py`, add (reuse existing imports: `IsStaff`, `record_status_change`, `ActorRole`, `CarStatus`, `Car`, `schedule_notification`, `booking_detail_queryset`; add the notify imports):

```python
from apps.notifications.service import (
    notify_inspection_payment_confirmed,
    notify_inspection_payment_rejected,
)


class StaffConfirmInspectionPaymentView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, booking_id):
        with transaction.atomic():
            try:
                booking = InspectionBooking.objects.select_for_update().get(
                    id=booking_id
                )
            except InspectionBooking.DoesNotExist:
                return Response(
                    {"detail": "Booking not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if booking.status != BookingStatus.AWAITING_PAYMENT:
                return Response(
                    {"detail": f"Cannot confirm — booking is '{booking.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            payment = booking.payment
            payment.status = InspectionPaymentStatus.CONFIRMED
            payment.confirmed_at = timezone.now()
            payment.confirmed_by = request.user
            payment.save(update_fields=["status", "confirmed_at", "confirmed_by"])

            booking.status = BookingStatus.PENDING
            booking.save(update_fields=["status", "updated_at"])

        schedule_notification(
            notify_inspection_payment_confirmed,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        detail = booking_detail_queryset().get(id=booking.id)
        return Response(InspectionBookingSerializer(detail).data)


class StaffRejectInspectionPaymentView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, booking_id):
        reason = request.data.get("reason", "")
        with transaction.atomic():
            try:
                booking = InspectionBooking.objects.select_for_update().get(
                    id=booking_id
                )
            except InspectionBooking.DoesNotExist:
                return Response(
                    {"detail": "Booking not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if booking.status != BookingStatus.AWAITING_PAYMENT:
                return Response(
                    {"detail": f"Cannot reject — booking is '{booking.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            payment = booking.payment
            payment.status = InspectionPaymentStatus.REJECTED
            payment.staff_note = reason
            payment.save(update_fields=["status", "staff_note"])

            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=["status", "updated_at"])

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status == CarStatus.INSPECTION_PENDING:
                record_status_change(
                    car, CarStatus.LISTING_APPROVED, actor=request.user,
                    actor_role=ActorRole.STAFF,
                    note="Inspection payment rejected.", request=request,
                )

        schedule_notification(
            notify_inspection_payment_rejected,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        detail = booking_detail_queryset().get(id=booking.id)
        return Response(InspectionBookingSerializer(detail).data)
```

> Confirm `ActorRole.STAFF` exists (it's used by other staff views in this file); if the enum member differs, match the one `StaffBookForOwnerView` uses.

- [ ] **Step 4: Register the routes**

In `backend/apps/inspections/urls.py`, add both views to the import block and add:

```python
    path(
        "admin/bookings/<uuid:booking_id>/confirm-payment/",
        StaffConfirmInspectionPaymentView.as_view(),
        name="confirm-inspection-payment",
    ),
    path(
        "admin/bookings/<uuid:booking_id>/reject-payment/",
        StaffRejectInspectionPaymentView.as_view(),
        name="reject-inspection-payment",
    ),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.StaffPaymentActionTest -v 2`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/inspections/views.py backend/apps/inspections/urls.py backend/apps/inspections/tests.py
git commit -m "feat(inspections): staff confirm/reject inspection payment"
```

---

## Task 8: Expose payment on booking detail

**Files:**
- Modify: `backend/apps/inspections/serializers.py`
- Modify: `backend/apps/inspections/views.py` (`booking_detail_queryset` — add `select_related("payment")`)
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/apps/inspections/tests.py`:

```python
class BookingDetailPaymentTest(APITestCase):
    def test_staff_detail_includes_payment_summary(self):
        from apps.inspections.tests import make_booking_fixture
        from apps.users.models import User
        ctx = make_booking_fixture()
        staff = User.objects.create_user(
            email="det-staff@t.com", first_name="S", last_name="T",
            password="pw12345678", role="customer", is_active=True, is_staff=True,
        )
        booking = InspectionBooking.objects.create(
            car=ctx["car"], slot=ctx["slot"], booked_by=ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        InspectionPayment.objects.create(
            booking=booking, inspection_fee=Decimal("15000"), listing_fee=Decimal("5000"),
            vat_amount=Decimal("1500"), total=Decimal("21500"), receipt="x.pdf",
        )
        self.client.force_authenticate(user=staff)
        res = self.client.get(
            f"/api/v1/inspections/admin/bookings/{booking.id}/"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["payment"]["total"], "21500.00")
        self.assertEqual(res.data["payment"]["status"], "submitted")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.BookingDetailPaymentTest -v 2`
Expected: FAIL — `KeyError: 'payment'`.

- [ ] **Step 3: Add the serializer + expose it**

In `backend/apps/inspections/serializers.py`, add:

```python
class InspectionPaymentSerializer(serializers.ModelSerializer):
    receipt_url = serializers.SerializerMethodField()

    class Meta:
        model = InspectionPayment
        fields = [
            "inspection_fee", "listing_fee", "vat_amount", "total", "currency",
            "payment_method", "status", "staff_note", "submitted_at",
            "confirmed_at", "receipt_url",
        ]

    def get_receipt_url(self, obj):
        if not obj.receipt:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.receipt.url) if request else obj.receipt.url
```

Import `InspectionPayment` at the top of `serializers.py`. In `InspectionBookingDetailSerializer`, add `payment` to `fields` and a method:

```python
    payment = serializers.SerializerMethodField()
```

```python
    def get_payment(self, obj):
        payment = getattr(obj, "payment", None)
        if payment is None:
            return None
        return InspectionPaymentSerializer(payment, context=self.context).data
```

(Add `"payment"` to the `fields` list of `InspectionBookingDetailSerializer.Meta`.)

- [ ] **Step 4: Add `select_related("payment")` to the detail queryset**

In `backend/apps/inspections/views.py`, find `booking_detail_queryset()` and add `"payment"` to its `select_related(...)` call so the payment is fetched in one query.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run python manage.py test apps.inspections.tests.BookingDetailPaymentTest -v 2`
Expected: PASS.

- [ ] **Step 6: Run the full inspections + notifications suites**

Run: `cd backend && uv run python manage.py test apps.inspections apps.notifications -v 1`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/inspections/serializers.py backend/apps/inspections/views.py backend/apps/inspections/tests.py
git commit -m "feat(inspections): expose payment summary on booking detail"
```

---

## Task 9: Frontend — fee quote + booking wizard payment step

**Files:**
- Modify/Create: `frontend/src/features/inspections/api/*` (types + hooks)
- Modify: the owner booking wizard component (the one that submits to `POST /inspections/bookings/`)

> **Discovery first:** locate the existing booking wizard and inspections API module. Run:
> `grep -rl "inspections/bookings" frontend/src` and `grep -rln "available-slots\|InspectionBooking\|useBookInspection" frontend/src/features/inspections`.

- [ ] **Step 1: Add the fee-quote type + hook**

In the inspections API types, add:

```ts
export type FeeQuote = {
  inspection_fee: string;
  listing_fee: string;
  subtotal: string;
  vat_amount: string;
  total: string;
  currency: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
};
```

In the inspections API hooks file:

```ts
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { FeeQuote } from "./types";

export const inspectionKeys = {
  feeQuote: ["inspections", "fee-quote"] as const,
};

export function useFeeQuote() {
  return useQuery({
    queryKey: inspectionKeys.feeQuote,
    queryFn: () => apiClient.get<FeeQuote>("/inspections/bookings/fee-quote/"),
  });
}
```

- [ ] **Step 2: Make the booking-create mutation send multipart**

Update the existing "create booking" hook so its `mutationFn` builds `FormData` (car_id, slot_id, attendee fields, `payment_method`, `receipt` file) and posts it. Follow the existing multipart pattern used by the customer payment submit (`frontend` already posts receipts elsewhere — reuse `apiClient` with `FormData`). Example:

```ts
export function useBookInspection() {
  return useMutation({
    mutationFn: (input: BookInspectionInput) => {
      const fd = new FormData();
      fd.append("car_id", input.carId);
      fd.append("slot_id", input.slotId);
      fd.append("attendee_type", input.attendeeType);
      if (input.repName) fd.append("rep_name", input.repName);
      if (input.repIdType) fd.append("rep_id_type", input.repIdType);
      if (input.repIdNumber) fd.append("rep_id_number", input.repIdNumber);
      if (input.consentAccepted) fd.append("consent_accepted", "true");
      fd.append("payment_method", "transfer");
      fd.append("receipt", input.receipt);
      return apiClient.post("/inspections/bookings/", fd);
    },
    meta: { skipGlobalOverlay: true },
  });
}
```

- [ ] **Step 3: Add the Summary + payment step to the wizard**

After the slot-selection step and before final submit, render a **Summary** card (shadcn `Card`, `--brc-*` tokens) that:
- Calls `useFeeQuote()` and lists: Inspection fee, Listing fee, VAT, **Total** (formatted as NGN).
- Shows the platform **bank details** (`bank_name`, `bank_account_name`, `bank_account_number`) with a copy affordance.
- Has a **receipt upload** input (accept `image/jpeg,image/png,image/webp,application/pdf`; client-side reject > 5 MB with an inline message).
- The final "Book inspection" button is **disabled until a receipt is attached**; on submit it calls `useBookInspection`.
- On success, route to the owner bookings list and show a toast: "Payment submitted — we'll confirm shortly."

- [ ] **Step 4: Verify build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/inspections
git commit -m "feat(inspections): booking wizard fee summary + receipt payment step"
```

---

## Task 10: Frontend — "Awaiting payment confirmation" state

**Files:**
- Modify: the owner bookings list component + the booking status type/label map.

- [ ] **Step 1: Extend the booking status type**

Wherever the booking `status` union is declared, add `"awaiting_payment"`. Add a label + badge style entry: label "Awaiting payment confirmation", using a neutral/amber `--brc-*` token consistent with other pending-ish badges.

- [ ] **Step 2: Render the state**

In the owner bookings list, an `awaiting_payment` booking shows the badge and a short helper line: "We're verifying your payment. You'll get an email once it's confirmed." Do **not** show cancel/reschedule actions for this state (those require `pending`).

- [ ] **Step 3: Verify build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/inspections
git commit -m "feat(inspections): owner bookings show awaiting-payment state"
```

---

## Task 11: Frontend — staff confirm / reject payment

**Files:**
- Modify: inspections API hooks (add mutations).
- Modify: the staff bookings view/detail component.

> **Discovery first:** `grep -rln "admin/bookings\|StaffBooking\|staff" frontend/src/features/inspections` to find the staff bookings screen.

- [ ] **Step 1: Add the mutations**

```ts
export function useConfirmInspectionPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post(`/inspections/admin/bookings/${bookingId}/confirm-payment/`),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspections"] }),
  });
}

export function useRejectInspectionPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      apiClient.post(`/inspections/admin/bookings/${bookingId}/reject-payment/`, {
        reason,
      }),
    meta: { skipGlobalOverlay: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspections"] }),
  });
}
```

- [ ] **Step 2: Add the staff actions UI**

On a booking in `awaiting_payment`, the staff detail shows the **payment summary** (amounts + status) and a **View receipt** link (`payment.receipt_url`), plus two buttons:
- **Confirm payment** → `ConfirmDialog` → `useConfirmInspectionPayment`.
- **Reject payment** → dialog with a required reason textarea → `useRejectInspectionPayment`.
Both show pending state and a success/error toast. Reuse the existing `ConfirmDialog` component (open/onOpenChange/title/description/confirmLabel/destructive/isPending/onConfirm).

- [ ] **Step 3: Verify build + lint**

Run: `cd frontend && npm run build && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/inspections
git commit -m "feat(inspections): staff confirm/reject inspection payment UI"
```

---

## Final verification

- [ ] Run the full affected backend suites: `cd backend && uv run python manage.py test apps.inspections apps.notifications apps.listings -v 1` → all green.
- [ ] `cd frontend && npm run build && npm run lint` → clean.
- [ ] Manual smoke (dev DB migrated): owner books an inspection → sees Summary + pays (uploads receipt) → booking shows "Awaiting payment confirmation" → staff confirms → booking `pending`, owner emailed; staff rejects a second one → booking cancelled, car back to listing-approved, slot free.
- [ ] Then use **superpowers:finishing-a-development-branch** to open the PR against `main`.

---

## Self-Review notes

- **Spec coverage:** FeeSetting+quote (T1) ✓; AWAITING_PAYMENT + status lists (T2) ✓; InspectionPayment snapshot (T3) ✓; fee-quote endpoint (T4) ✓; booking-create receipt gate + payment (T5) ✓; 3 notifications + templates (T6) ✓; staff confirm/reject + slot-free + car revert (T7) ✓; payment on detail (T8) ✓; frontend summary/receipt (T9), awaiting state (T10), staff actions (T11) ✓. "Applies to buy and rent" is inherent — the gate is on every owner booking regardless of `listing_type`.
- **Ordering caveat:** Task 5's owner view imports `notify_inspection_payment_submitted` (Task 6). Implement **Task 6 before running Task 5's Step 5**, or the import fails. Noted inline in Task 5 Step 4.
- **Type consistency:** `InspectionPaymentStatus` values (`submitted`/`confirmed`/`rejected`), `BookingStatus.AWAITING_PAYMENT` (`awaiting_payment`), and the `payment` reverse accessor are used identically across T3/T5/T7/T8 and the frontend union.
