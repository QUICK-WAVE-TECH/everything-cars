# Inspection Refinements (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ SPECIAL WORKFLOW:** Backend tasks (1–11) are written **by Namy** with Claude guiding (failing test → why → implementation → verify → commit). Frontend tasks (12–18) are implemented **directly by Claude**. Do NOT dispatch subagents to write backend code.

**Goal:** Ship the phase-2 refinements: audit hardening, identity chain (sign-up ID → attendee declaration → day-of verification), booking emails, assistance requests with staff booking on behalf, day-of lockdown, needs_changes-only editing, verified public data, staff-visible audit names, and combined center+slot creation with per-row capacity.

**Architecture:** Django 5.2 + DRF backend, Next.js 16 + React Query frontend. All status transitions continue through `record_status_change` (now audit-enriched). Email via Django SMTP → Mailpit in dev, env-driven in prod. ID data is staff-only at the serializer layer, everywhere.

**Tech Stack:** Django/DRF, PostgreSQL, Django email, Mailpit (dev), Next.js, React Query, shadcn/base-ui.

**Spec:** `docs/superpowers/specs/2026-07-14-inspection-refinements-design.md`

---

## File Structure

**Backend (Namy, guided):**
- Modify: `backend/apps/inspections/models.py` — CarStatusHistory audit fields, IDType choices, InspectionBooking attendee fields, PhysicalInspection presented-ID fields, AssistanceRequest model
- Modify: `backend/apps/inspections/services.py` — snapshot + request forensics in `record_status_change`
- Create: `backend/apps/notifications/email_service.py` — EmailLog writes + `send_booking_confirmation`
- Modify: `backend/apps/notifications/models.py` — EmailLog model, `assistance_requested` notification type
- Modify: `backend/apps/users/models.py` — OwnerProfile `id_type`, `id_document`
- Modify: `backend/apps/users/serializers.py` — sign-up ID requirements
- Modify: `backend/apps/inspections/views.py` — booking gates (ID-on-file, attendee), day-of lockdown, assistance endpoints, book-for-owner, presented-ID in submit
- Modify: `backend/apps/inspections/serializers.py` — attendee fields, per-row capacity, staff history serializer, assistance serializers
- Modify: `backend/apps/listings/views.py` — EDITABLE_CAR_STATUSES, pass `request` into `record_status_change` calls
- Modify: `backend/apps/listings/serializers.py` — verified-data overlay
- Modify: `backend/config/settings/development.py` + `production.py` — email config
- Tests: `backend/apps/inspections/tests.py`, `backend/apps/listings/tests.py`, `backend/apps/users/tests.py`

**Frontend (Claude):**
- Modify: `frontend/src/features/inspections/api/types.ts`, `inspections-api.ts`
- Modify: `frontend/src/app/(auth)/owner-sign-up/page.tsx`, `frontend/src/app/owner/profile/page.tsx`
- Modify: `frontend/src/features/inspections/components/booking-modal.tsx`
- Modify: `frontend/src/app/owner/my-cars/new/page.tsx`, `[id]/page.tsx`, `page.tsx`
- Modify: `frontend/src/app/admin/approvals/page.tsx`, `admin/inspections/centers/page.tsx`, `admin/inspections/page.tsx`, `admin/inspections/[bookingId]/inspect/page.tsx`
- Create: `frontend/src/features/listings/components/verified-report.tsx`
- Modify: `frontend/src/features/listings/components/car-detail-page.tsx` (public), `car-status-timeline.tsx`

---

## Phase A — Backend (guided: Namy writes, Claude explains & reviews)

### Task 1: Audit hardening — snapshots + request forensics on history rows

**Files:**
- Modify: `backend/apps/inspections/models.py` (CarStatusHistory)
- Modify: `backend/apps/inspections/services.py`
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Failing tests**

```python
class AuditHardeningTest(APITestCase):
    def test_history_snapshots_actor_identity(self):
        staff = create_user("staff-aud@test.com", "owner", is_staff=True)
        owner = create_user("owner-aud@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner, status=CarStatus.DRAFT)
        self.client.force_authenticate(user=staff)
        self.client.post(f"/api/v1/listings/admin/cars/{car.id}/approve-listing")
        entry = car.status_history.get()
        self.assertEqual(entry.actor_name, f"{staff.first_name} {staff.last_name}")
        self.assertEqual(entry.actor_email, staff.email)
        # snapshot survives account deletion
        staff.delete()
        entry.refresh_from_db()
        self.assertIsNone(entry.actor)
        self.assertEqual(entry.actor_email, "staff-aud@test.com")

    def test_history_captures_request_forensics(self):
        staff = create_user("staff-ip@test.com", "owner", is_staff=True)
        owner = create_user("owner-ip@test.com", "owner")
        create_owner_profile(owner)
        car = create_car(owner, status=CarStatus.DRAFT)
        self.client.force_authenticate(user=staff)
        self.client.post(
            f"/api/v1/listings/admin/cars/{car.id}/approve-listing",
            HTTP_USER_AGENT="TestBrowser/1.0",
        )
        entry = car.status_history.get()
        self.assertEqual(entry.ip_address, "127.0.0.1")
        self.assertEqual(entry.user_agent, "TestBrowser/1.0")
```

- [ ] **Step 2: Run → fail** (`uv run python manage.py test apps.inspections.tests.AuditHardeningTest` — AttributeError: no `actor_name`)

- [ ] **Step 3: Model fields** — add to `CarStatusHistory`:

```python
    # Snapshots survive staff account deletion (actor FK is SET_NULL)
    actor_name = models.CharField(max_length=200, blank=True, default="")
    actor_email = models.CharField(max_length=254, blank=True, default="")
    # Request forensics — empty for system transitions
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
```

- [ ] **Step 4: Service** — `record_status_change` gains `request=None`:

```python
def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_status_change(
    car, to_status, *, actor=None, actor_role=ActorRole.SYSTEM,
    note="", extra_update_fields=(), request=None,
):
    CarStatusHistory.objects.create(
        car=car,
        from_status=car.status,
        to_status=to_status,
        actor=actor,
        actor_role=actor_role,
        actor_name=(
            f"{actor.first_name} {actor.last_name}".strip() if actor else ""
        ),
        actor_email=actor.email if actor else "",
        ip_address=_client_ip(request) if request else None,
        user_agent=(request.META.get("HTTP_USER_AGENT", "") if request else ""),
        note=note,
    )
    car.status = to_status
    car.save(update_fields=["status", "updated_at", *extra_update_fields])
```

- [ ] **Step 5: Thread `request=request` through every caller** that has one (grep `record_status_change(` across `apps/listings/views.py` and `apps/inspections/views.py` — all view callers add `request=request`; the service default keeps system paths working).
- [ ] **Step 6:** `makemigrations inspections && migrate` → run tests → PASS → full inspections+listings suites green.
- [ ] **Step 7: Commit** — `feat(audit): snapshot actor identity and request forensics on status history`

### Task 2: Email infrastructure — Mailpit, EmailLog, booking confirmation

**Files:**
- Modify: `backend/config/settings/development.py`, `backend/config/settings/production.py`
- Modify: `backend/apps/notifications/models.py` (EmailLog)
- Create: `backend/apps/notifications/email_service.py`
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Dev settings (Mailpit)** — in `development.py`:

```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "localhost"
EMAIL_PORT = 1025          # Mailpit SMTP; inbox at http://localhost:8025
EMAIL_USE_TLS = False
DEFAULT_FROM_EMAIL = "EverythingCars <no-reply@everythingcars.local>"
```

Production (`production.py`): `EMAIL_HOST/PORT/HOST_USER/HOST_PASSWORD/USE_TLS/DEFAULT_FROM_EMAIL` from `os.environ`.
Tests automatically use `locmem` backend (`django.core.mail.outbox`) — no Mailpit needed in CI.

- [ ] **Step 2: EmailLog model** (in `apps/notifications/models.py`):

```python
class EmailLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    booking = models.ForeignKey(
        "inspections.InspectionBooking", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="emails",
    )
    success = models.BooleanField(default=False)
    error = models.TextField(blank=True, default="")
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]
```

- [ ] **Step 3: Email service** — `apps/notifications/email_service.py`:

```python
import logging
from django.conf import settings
from django.core.mail import send_mail
from .models import EmailLog

logger = logging.getLogger("notifications")


def _send_logged(recipient, subject, body, booking=None, html_message=None):
    log = EmailLog(recipient=recipient, subject=subject, booking=booking)
    try:
        send_mail(
            subject, body, settings.DEFAULT_FROM_EMAIL, [recipient],
            html_message=html_message, fail_silently=False,
        )
        log.success = True
    except Exception as exc:  # noqa: BLE001 — email must never crash the flow
        log.error = str(exc)
        logger.error("[EMAIL] Send failed to %s: %s", recipient, exc)
    log.save()
    return log


def send_booking_confirmation(booking):
    slot = booking.slot
    center = slot.center
    attendee = (
        booking.rep_name
        if booking.attendee_type == "representative"
        else booking.booked_by.first_name
    )
    rep_line = (
        f"\nYou have declared {booking.rep_name} as your representative. "
        "They must present the declared ID at the center.\n"
        if booking.attendee_type == "representative"
        else ""
    )
    body = (
        f"Hi {booking.booked_by.first_name},\n\n"
        f"Your inspection for {booking.car.title} is confirmed.\n\n"
        f"Date: {slot.date.strftime('%A, %d %B %Y')}\n"
        f"Time: {slot.start_time.strftime('%I:%M %p')} – {slot.end_time.strftime('%I:%M %p')}\n"
        f"Center: {center.company_name}, {center.address}, {center.city}\n"
        f"Tracking ID: {booking.car.tracking_id}\n"
        f"{rep_line}\n"
        f"IMPORTANT: {attendee} must bring a valid means of identification "
        "(International passport, NIN, Voter's card, or Driver's licence).\n\n"
        "EverythingCars"
    )
    return _send_logged(
        booking.booked_by.email,
        "Inspection appointment confirmed — bring a valid ID",
        body,
        booking=booking,
    )
```

(HTML template: when Namy supplies it, render with `django.template.loader.render_to_string` and pass as `html_message` — the service signature already accepts it.)

- [ ] **Step 4: Failing test**

```python
class BookingEmailTest(APITestCase):
    def test_booking_sends_confirmation_and_logs(self):
        from django.core import mail
        from apps.notifications.models import EmailLog
        staff = create_user("staff-em@test.com", "owner", is_staff=True)
        owner = create_user("owner-em@test.com", "owner")
        create_owner_profile(owner)   # updated in Task 3 to include ID fields
        car = create_car(owner, status=CarStatus.LISTING_APPROVED)
        slot = create_slot(staff)
        self.client.force_authenticate(user=owner)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                "/api/v1/inspections/bookings/",
                {"car_id": str(car.id), "slot_id": str(slot.id)},
                format="json",
            )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("valid means of identification", mail.outbox[0].body)
        log = EmailLog.objects.get(recipient="owner-em@test.com")
        self.assertTrue(log.success)
```

- [ ] **Step 5:** Wire into `OwnerBookingCreateView` (and later book-for-owner) after the atomic block: `schedule_notification(send_booking_confirmation, lambda bid=booking.id: booking_detail_queryset().get(id=bid))`. Reschedule view sends the same email (updated appointment).
- [ ] **Step 6:** migrations → tests PASS → commit `feat(email): mailpit dev backend, EmailLog, booking confirmation email`

### Task 3: OwnerProfile ID fields + sign-up requirements

**Files:**
- Modify: `backend/apps/users/models.py`, `backend/apps/users/serializers.py`
- Modify: `backend/apps/inspections/models.py` (shared IDType lives here? No — define in `apps/users/models.py`, import in inspections)
- Test: `backend/apps/users/tests.py`

- [ ] **Step 1: IDType choices** (in `apps/users/models.py`, above OwnerProfile):

```python
class IDType(models.TextChoices):
    INTL_PASSPORT = "intl_passport", "International Passport"
    NIN = "nin", "NIN"
    VOTERS_CARD = "voters_card", "Voter's Card"
    DRIVERS_LICENCE = "drivers_licence", "Driver's Licence"
```

OwnerProfile additions:

```python
    id_type = models.CharField(
        max_length=20, choices=IDType.choices, blank=True, default=""
    )
    id_document = models.ImageField(
        upload_to="identity-docs/%Y/%m/", blank=True, null=True
    )
```

`national_id` stays as the number field; its digits-only validation now applies only when `id_type == IDType.NIN` (serializer change).

- [ ] **Step 2: Sign-up serializer** — require `id_type` + `id_document` for all sign-ups going forward; `validate_national_id` becomes type-aware:

```python
    def validate(self, data):
        if not data.get("id_type"):
            raise serializers.ValidationError({"id_type": "Select a means of identification."})
        if not data.get("national_id"):
            raise serializers.ValidationError({"national_id": "ID number is required."})
        if data["id_type"] == "nin" and not data["national_id"].strip().isdigit():
            raise serializers.ValidationError({"national_id": "NIN must contain digits only."})
        if not data.get("id_document"):
            raise serializers.ValidationError({"id_document": "Upload an image of your ID document."})
        # ... existing owner-specific checks unchanged
```

(Move the digits check out of `validate_national_id` since it now depends on `id_type`.)

- [ ] **Step 3: Failing tests** — sign-up without id_type/id_document → 400 with those keys; NIN with letters → 400; passport with letters → 201. Existing-profile helper `create_owner_profile` gains `id_type="nin"`, `national_id`-equivalent, and a `SimpleUploadedFile` image so downstream tests satisfy the booking gate (Task 4).
- [ ] **Step 4:** migrations → tests → commit `feat(users): identity document capture at sign-up`

### Task 4: Booking attendee declaration + ID-on-file gate + consent

**Files:**
- Modify: `backend/apps/inspections/models.py` (InspectionBooking), `serializers.py` (BookingCreateSerializer), `views.py` (OwnerBookingCreateView)
- Test: `backend/apps/inspections/tests.py`

- [ ] **Step 1: Model fields** (InspectionBooking):

```python
class AttendeeType(models.TextChoices):
    SELF = "self", "Owner attends"
    REPRESENTATIVE = "representative", "Representative attends"
```

```python
    attendee_type = models.CharField(
        max_length=20, choices=AttendeeType.choices, default=AttendeeType.SELF
    )
    rep_name = models.CharField(max_length=200, blank=True, default="")
    rep_id_type = models.CharField(
        max_length=20, choices=IDType.choices, blank=True, default=""
    )
    rep_id_number = models.CharField(max_length=50, blank=True, default="")
    consent_accepted_at = models.DateTimeField(null=True, blank=True)
```

(`from apps.users.models import IDType` — safe: users doesn't import inspections.)

- [ ] **Step 2: Serializer** — `BookingCreateSerializer` gains:

```python
    attendee_type = serializers.ChoiceField(
        choices=AttendeeType.choices, default=AttendeeType.SELF
    )
    rep_name = serializers.CharField(required=False, allow_blank=True, max_length=200)
    rep_id_type = serializers.ChoiceField(choices=IDType.choices, required=False, allow_blank=True)
    rep_id_number = serializers.CharField(required=False, allow_blank=True, max_length=50)
    consent_accepted = serializers.BooleanField(default=False)

    def validate(self, data):
        if data.get("attendee_type") == AttendeeType.REPRESENTATIVE:
            missing = [f for f in ("rep_name", "rep_id_type", "rep_id_number") if not data.get(f)]
            if missing:
                raise serializers.ValidationError(
                    {f: "Required when a representative attends." for f in missing}
                )
            if not data.get("consent_accepted"):
                raise serializers.ValidationError(
                    {"consent_accepted": "You must accept the authorization agreement."}
                )
        return data
```

- [ ] **Step 3: View** — in `OwnerBookingCreateView`, before slot checks:

```python
            profile = getattr(request.user, "owner_profile", None)
            if not profile or not profile.id_type or not profile.id_document:
                return Response(
                    {"detail": "Complete your ID verification in your profile before booking."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
```

Booking create passes attendee fields; server stamps consent:

```python
                booking = InspectionBooking.objects.create(
                    car=car, slot=slot, booked_by=request.user,
                    reschedule_count=reschedule_count,
                    attendee_type=data["attendee_type"],
                    rep_name=data.get("rep_name", ""),
                    rep_id_type=data.get("rep_id_type", ""),
                    rep_id_number=data.get("rep_id_number", ""),
                    consent_accepted_at=(
                        timezone.now()
                        if data["attendee_type"] == AttendeeType.REPRESENTATIVE
                        else None
                    ),
                )
```

Owner/staff booking serializers expose `attendee_type` + `rep_name`; `rep_id_number` is **staff-only** (add to staff serializer variant only).

- [ ] **Step 4: Failing tests** — rep booking without consent → 400; without rep fields → 400 per-field; self booking unaffected; owner without ID on file → 400 "Complete your ID verification"; rep booking sets `consent_accepted_at`.
- [ ] **Step 5:** migrations → tests → commit `feat(inspections): attendee declaration, consent, and ID-on-file gate`

### Task 5: Day-of lockdown for cancel + reschedule

**Files:** `backend/apps/inspections/views.py`, tests.

- [ ] **Step 1: Failing tests** — booking on a slot dated today: cancel → 400, reschedule → 400; slot tomorrow: both work. (Use `create_slot(staff, days_ahead=0)`.)
- [ ] **Step 2:** In both `OwnerBookingCancelView` and `OwnerBookingRescheduleView`, after fetching the booking:

```python
            if booking.slot.date <= timezone.localdate():
                return Response(
                    {"detail": (
                        "Changes are locked on the day of the appointment. "
                        "Contact staff if you cannot attend."
                    )},
                    status=status.HTTP_400_BAD_REQUEST,
                )
```

(Cancel view needs `select_related("slot")` on its booking fetch.)
- [ ] **Step 3:** tests PASS → commit `feat(inspections): lock cancel and reschedule on inspection day`

### Task 6: Edit policy — needs_changes only

**Files:** `backend/apps/listings/views.py`, `backend/apps/listings/tests.py`.

- [ ] **Step 1:** `EDITABLE_CAR_STATUSES = [CarStatus.NEEDS_CHANGES]` (comment: listing edits only when staff requests them; clearance answered by message, rejection fixed on the physical car).
- [ ] **Step 2:** Update the EditLockdown test matrix: allowed → needs_changes only; blocked now includes draft, needs_clearance, inspection_rejected. Resubmission tests unchanged (transitions still allowed).
- [ ] **Step 3:** suites green → commit `feat(listings): owner edits restricted to needs_changes status`

### Task 7: AssistanceRequest — model, owner endpoint, staff queue

**Files:** `backend/apps/inspections/models.py`, `serializers.py`, `views.py`, `urls.py`; `backend/apps/notifications/models.py` + `service.py`; tests.

- [ ] **Step 1: Model**

```python
class AssistanceStatus(models.TextChoices):
    OPEN = "open", "Open"
    HANDLED = "handled", "Handled"


class AssistanceRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="assistance_requests")
    car = models.ForeignKey(Car, on_delete=models.CASCADE, null=True, blank=True, related_name="assistance_requests")
    country = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=250, blank=True, default="")
    message = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=AssistanceStatus.choices, default=AssistanceStatus.OPEN, db_index=True)
    handled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="handled_assistance")
    created_at = models.DateTimeField(auto_now_add=True)
    handled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
```

- [ ] **Step 2: Endpoints**
  - `POST /inspections/assistance/` (IsOwner): creates request; 400 if an OPEN request already exists for this owner+car; notifies all staff (`assistance_requested` notification type, service function mirroring `notify_clearance_response`'s staff broadcast).
  - `GET /inspections/admin/assistance/?status=open` (IsStaff): paginated list — serializer includes owner name/email/phone, car title+id, state, message, status.
  - `POST /inspections/admin/assistance/<uuid:request_id>/handle/` (IsStaff): sets handled + `handled_by=request.user` + `handled_at=now`; 400 if already handled.
- [ ] **Step 3: Failing tests** — create → staff notified (captureOnCommitCallbacks) + row exists; duplicate open for same owner+car → 400; handle → handled_by set; owner hitting admin endpoints → 403.
- [ ] **Step 4:** migrations (notifications choice too) → tests → commit `feat(inspections): assistance requests for states without centers`

### Task 8: Staff books on behalf of owner

**Files:** `backend/apps/inspections/views.py`, `urls.py`, tests.

- [ ] **Step 1:** Extract the shared booking core from `OwnerBookingCreateView.post` into a module-level helper so both entry points use identical rules:

```python
def create_booking_for(car, slot, owner, attendee_data, *, actor, actor_role, request=None):
    """Shared by owner-booking and staff-books-on-behalf. Assumes car+slot
    are locked (select_for_update) and car is in a bookable status.
    Returns (booking, error_response)."""
```

— it holds: capacity check, cycle-scoped reschedule-count carry, IntegrityError → 409, tracking-ID generation, `record_status_change(..., actor=actor, actor_role=actor_role, request=request)`.
- [ ] **Step 2:** `POST /inspections/admin/bookings/book-for-owner/` (IsStaff): payload `{car_id, slot_id, attendee fields}`; resolves the car's owner as `booked_by`; ID-on-file gate **skipped** (staff verified identity out-of-band — note in docstring); history actor = staff; confirmation email still to owner; optionally marks a matching open AssistanceRequest for that owner+car as handled.
- [ ] **Step 3: Failing tests** — staff books for owner: 201, `booked_by == owner`, history actor_email == staff email, email in outbox to owner, open assistance request auto-handled; non-staff → 403; car not bookable → 400.
- [ ] **Step 4:** commit `feat(inspections): staff can book inspections on behalf of owners`

### Task 9: Presented-ID capture on the inspection form

**Files:** `backend/apps/inspections/models.py` (PhysicalInspection), `serializers.py`, `views.py` (submit view), tests.

- [ ] **Step 1: Model fields**

```python
    presented_id_type = models.CharField(max_length=20, choices=IDType.choices, blank=True, default="")
    presented_id_number = models.CharField(max_length=50, blank=True, default="")
    presented_id_document = models.ImageField(upload_to="identity-docs/presented/%Y/%m/", blank=True, null=True)
```

- [ ] **Step 2: Serializers** — `PhysicalInspectionSerializer` gains the three fields, **required for non-failed results** (extend the existing cross-field `validate` — same pattern as staff_notes). The submit view's multipart path already carries files; add `presented_id_document` to the payload handling. Ensure **no owner/public serializer** ever includes these fields (they only exist on the staff-only PhysicalInspectionSerializer — assert in test).
- [ ] **Step 3: Failing tests** — submit passed without presented ID → 400; with ID fields + image → 201 and stored; fail-result submit without ID → allowed.
- [ ] **Step 4:** migrations → tests → commit `feat(inspections): inspector records attendee ID at appointment`

### Task 10: Verified-data overlay on public serializers

**Files:** `backend/apps/listings/serializers.py`, `views.py` (prefetch), tests.

- [ ] **Step 1: Prefetch** — public list & detail views add:

```python
from apps.inspections.models import InspectionResult, PhysicalInspection

passed_prefetch = Prefetch(
    "physical_inspections",
    queryset=PhysicalInspection.objects.filter(
        result=InspectionResult.PASSED
    ).order_by("-inspected_at"),
    to_attr="_passed_inspections",
)
```

- [ ] **Step 2: Serializer overlay** — in `CarListSerializer` (and inherited by detail): `description`, `mileage`, `fuel_type`, `features` become `SerializerMethodField`s that return the latest passed inspection's values when present, else the owner's. Detail serializer adds:

```python
    verified_report = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()

    def _latest_passed(self, obj):
        passed = getattr(obj, "_passed_inspections", None)
        if passed is None:
            passed = list(
                obj.physical_inspections.filter(result="passed").order_by("-inspected_at")[:1]
            )
        return passed[0] if passed else None

    def get_is_verified(self, obj):
        return self._latest_passed(obj) is not None

    def get_verified_report(self, obj):
        insp = self._latest_passed(obj)
        if not insp:
            return None
        return {
            "condition": insp.condition,
            "car_type": insp.car_type,
            "engine_condition": insp.engine_condition,
            "chassis_condition": insp.chassis_condition,
            "ac_condition": insp.ac_condition,
            "is_flooded": insp.is_flooded,
            "has_accident_history": insp.has_accident_history,
            "inspected_at": insp.inspected_at,
        }
```

**Scope guard:** overlay applies only in the public views (they pass `context={"public": True}` or the serializer checks for the prefetch attr); owner/admin views don't add the prefetch, so owners keep seeing their own data. Verified report contains no notes-free-text beyond what's listed and never staff identity/ID data.
- [ ] **Step 3: Failing tests** — published car with passed inspection: public detail returns inspector's staff_notes as description, inspector mileage, `is_verified` true, `verified_report` populated, and response JSON contains neither `inspector` nor `presented_id` anywhere; owner my-cars detail still returns owner description; unverified published car: `is_verified` false, owner data shown.
- [ ] **Step 4:** commit `feat(listings): public pages show inspector-verified data`

### Task 11: Staff history names + per-row slot capacity

**Files:** `backend/apps/inspections/serializers.py`, `views.py`, tests.

- [ ] **Step 1: StaffCarStatusHistorySerializer** — subclass adding `actor_name` (from the snapshot field, fallback to FK name) — used by `AdminCarHistoryView` only. Test: staff history includes names; owner history still excludes.
- [ ] **Step 2: Per-row capacity** — `InspectionSlotCreateSerializer.time_slots` rows accept optional `capacity` (min 1); the view uses `ts.get("capacity", top_level_capacity)` when creating each slot. Test: two rows with capacities 3 and 1 → slots created with 3 and 1; row without capacity falls back to top-level.
- [ ] **Step 3:** commit `feat(inspections): staff-visible audit names, per-slot capacity on creation`

---

## Phase B — Frontend (Claude implements directly)

### Task 12: Types + API hooks
- Types: attendee fields on `InspectionBooking` (+ `rep_id_number` only in staff detail type), `AssistanceRequest`, `verified_report`/`is_verified` on `CarDetail`, `id_type`/`id_document` on profile types, per-row capacity in slot-creation payload, presented-ID fields in `PhysicalInspectionPayload` (staff).
- Hooks: `useCreateAssistanceRequest`, `useAssistanceRequests` (staff), `useHandleAssistance`, `useBookForOwner`; booking mutation accepts attendee fields; staff history hook typed with `actor_name`.

### Task 13: Sign-up + profile ID capture
- Owner sign-up: ID type select (4 options), type-aware number field label/validation, mandatory ID image upload (separate from ownership document). Same for customer sign-up where NIN currently appears.
- Owner profile page: "Identity verification" section showing status; upload/edit ID (type, number, image). This is the landing spot for the booking gate.

### Task 14: Booking modal
- Profile-driven defaults for country/state (match against locations tree).
- "No centers in {state}" panel → message textarea → `useCreateAssistanceRequest` → success state ("Our staff will contact you").
- Calendar `startMonth`/`defaultMonth` = month of earliest available date.
- New attendee step (between date/time and confirm): self/representative radio; rep fields + consent checkbox with the authorization text (constant with placeholder copy); confirm step summarizes attendee.
- ID-on-file gate: if profile lacks ID (from `useMe`/profile query), replace steps with "Complete your ID verification" panel linking to `/owner/profile`.

### Task 15: Edit policy + pre-submit confirmation + day-of lockdown UI
- Edit buttons (detail page + my-cars list) render only for `needs_changes`; rejected keeps "Resubmit" without edit; copy updated ("fix the issues with the vehicle, then resubmit").
- New-listing page: pre-submit confirmation Dialog summarizing all entered fields, prices, photo thumbnails + "you won't be able to edit after submitting" warning; Confirm → existing submit flow.
- Cancel/Reschedule buttons hidden when `booking.slot.date` is today (parse date parts), replaced by hint text.

### Task 16: Admin — assistance queue, book-for-owner, staff names, center wizard
- Approvals page: "Assistance" tab (badge = open count) listing requests (owner contact, state, message, age) with "Mark handled" and "Book for owner" (opens a staff booking dialog: pick center → slot → attendee fields → `useBookForOwner`).
- Admin timeline: staff variant shows `actor_name` under each entry.
- Centers page: "New Center" dialog becomes 2-step wizard (details → schedule with per-row capacity time slots, skippable); slots page creation modal gains per-row capacity inputs.
- Inspect form: presented-ID section (type select, number, image upload) required for pass/needs_clearance results.

### Task 17: Public verified report
- `verified-report.tsx`: "Verified Inspection Report" card (condition grades, car type, flood/accident, inspection date) + "Verified" badge component.
- Public car detail page: description block renders inspector notes when `is_verified` (labeled "Inspector's notes"); specs grid uses overlaid values (already server-side); report card placed prominently; services/car cards show a small verified badge when `is_verified`.

### Task 18: Verification + checklist
- `tsc`, lint, full backend suite; update `docs/test-inspection-booking.md` with a Phase 2 section (identity chain end-to-end, assistance flow, day-of lockdown boundary at midnight, edit matrix, verified public data, email in Mailpit inbox, per-row capacities, wizard).

---

## Self-Review Notes
- Spec coverage: §1→T1/3/4/7/9, §2→T2, §3→T4/12/14, §4→T7/8/16, §5→T5/15, §6→T6/15, §7→T10/17, §8→T11/16, §8a→T1/2, §9→T11/16. "Already done" items pinned by existing tests (listing_approved lockdown) — T6 re-verifies the matrix.
- Consistency: `IDType` defined once in `apps/users/models.py`, imported by inspections; `create_booking_for` helper signature used by T8; `create_owner_profile` test helper updated in T3 before T4 depends on the gate.
- Sequencing: T3 before T4 (gate needs profile fields); T1 before all (signature change ripples); T2 before T4 (email wiring); T7 before T8 (auto-handle).
