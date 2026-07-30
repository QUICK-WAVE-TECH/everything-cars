import json
from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from django_countries.fields import Country
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsOwner, IsStaff
from apps.listings.models import Car, CarStatus
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.notifications.service import (
    notify_clearance_response,
    notify_inspection_booked,
    notify_inspection_started,
    notify_needs_clearance,
    notify_inspection_passed,
    notify_inspection_failed,
    notify_inspection_no_show,
    notify_inspection_rescheduled,
    notify_inspection_cancelled,
    notify_inspection_payment_submitted,
    notify_inspection_payment_confirmed,
    notify_inspection_payment_rejected,
    notify_assistance_requested,
)
from apps.notifications.email_service import (
    send_assistance_booked,
    send_assistance_received,
    send_booking_confirmation,
)
from .models import (
    ACTIVE_BOOKING_STATUSES,
    OCCUPIED_BOOKING_STATUSES,
    ActorRole,
    AttendeeType,
    BookingStatus,
    FeeSetting,
    InspectionBooking,
    InspectionCenter,
    InspectionPayment,
    InspectionPaymentStatus,
    InspectionResult,
    InspectionSlot,
    PhysicalInspection,
    AssistanceStatus,
    AssistanceRequest,
)
from .services import generate_tracking_id, record_status_change
from .serializers import (
    AvailableSlotSerializer,
    BookingCreateSerializer,
    FeeQuoteSerializer,
    InspectionBookingDetailSerializer,
    InspectionBookingSerializer,
    InspectionCenterSerializer,
    InspectionDocumentSerializer,
    InspectionSlotCreateSerializer,
    InspectionSlotSerializer,
    PhysicalInspectionSerializer,
    AssistanceRequestCreateSerializer,
    AssistanceRequestSerializer,
)


# Booking requires prior admin approval of the listing. INSPECTION_NO_SHOW is
# included because those cars were already approved — the owner rebooks directly.
BOOKABLE_CAR_STATUSES = [
    CarStatus.LISTING_APPROVED,
    CarStatus.INSPECTION_NO_SHOW,
]


def _valid_uuid_or_none(value):
    """Query params are user input — a malformed UUID must 400, not 500."""
    import uuid as uuid_module

    try:
        return uuid_module.UUID(value)
    except (ValueError, TypeError, AttributeError):
        return None


def _valid_date_or_none(value):
    """Query-param dates are user input — a malformed date must 400, not 500."""
    from datetime import date as date_cls

    try:
        return date_cls.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _slot_has_started(slot, now=None):
    now = now or timezone.localtime()
    return slot.date < now.date() or (
        slot.date == now.date() and slot.start_time <= now.time()
    )


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes"}:
            return True
        if normalized in {"false", "0", "no"}:
            return False
    return None


# Cancel/reschedule are locked from the start of the appointment day onward; an
# absence on the day itself becomes a staff-recorded no-show instead.
DAY_OF_LOCK_MESSAGE = (
    "Changes are locked on the day of the appointment. "
    "Contact staff if you cannot attend."
)


def schedule_notification(notify_func, get_payload):
    transaction.on_commit(lambda: notify_func(get_payload()), robust=True)


def booking_detail_queryset():
    return InspectionBooking.objects.select_related(
        "car",
        "car__owner",
        "car__owner__owner_profile",
        "slot",
        "slot__center",
        "slot__created_by",
        "booked_by",
        "inspection",
        "inspection__inspector",
        "inspection__documents",
        "payment",
    ).prefetch_related("car__images", "car__features")


def create_booking_core(
    *, car, slot, booked_by, attendee, actor, actor_role, request=None,
    initial_status=BookingStatus.PENDING,
):
    """Shared booking rules for owner-self-booking and staff-books-for-owner.

    Assumes `car` and `slot` are already locked (select_for_update) inside the
    caller's transaction and the slot is active. Returns (booking, error_response)
    — exactly one is non-None.
    """
    if car.status not in BOOKABLE_CAR_STATUSES:
        return None, Response(
            {
                "detail": f"Cannot book inspection — car status is '{car.get_status_display()}'."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if _slot_has_started(slot):
        return None, Response(
            {"detail": "Cannot book a slot that has already started."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    current_bookings = InspectionBooking.objects.filter(
        slot=slot, status__in=ACTIVE_BOOKING_STATUSES
    ).count()
    if current_bookings >= slot.capacity:
        return None, Response(
            {"detail": "This slot is full. Please pick another."},
            status=status.HTTP_409_CONFLICT,
        )

    # Rebooking after a cancel/no-show counts toward the per-center cap.
    last_booking = (
        InspectionBooking.objects.filter(car=car).order_by("-created_at").first()
    )
    reschedule_count = 0
    if last_booking and last_booking.status in (
        BookingStatus.CANCELLED,
        BookingStatus.NO_SHOW,
    ):
        reschedule_count = last_booking.reschedule_count + 1
        if reschedule_count > slot.center.max_reschedules:
            return None, Response(
                {
                    "detail": (
                        f"Maximum rebookings ({slot.center.max_reschedules}) reached. "
                        "Contact staff to rebook."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    try:
        booking = InspectionBooking.objects.create(
            car=car,
            slot=slot,
            booked_by=booked_by,
            status=initial_status,
            reschedule_count=reschedule_count,
            attendee_type=attendee["attendee_type"],
            rep_name=attendee.get("rep_name", ""),
            rep_id_type=attendee.get("rep_id_type", ""),
            rep_id_number=attendee.get("rep_id_number", ""),
            consent_accepted_at=(
                timezone.now()
                if attendee["attendee_type"] == AttendeeType.REPRESENTATIVE
                else None
            ),
        )
    except IntegrityError:
        return None, Response(
            {"detail": "This car already has an active inspection booking."},
            status=status.HTTP_409_CONFLICT,
        )

    extra = []
    if not car.tracking_id:
        car.tracking_id = generate_tracking_id(slot.center)
        extra.append("tracking_id")
    record_status_change(
        car,
        CarStatus.INSPECTION_PENDING,
        actor=actor,
        actor_role=actor_role,
        extra_update_fields=extra,
        request=request,
    )
    return booking, None


# ── Staff Slot Management ──


class StaffSlotListCreateView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        slots = InspectionSlot.objects.select_related("created_by", "center").all()

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        is_active = request.query_params.get("is_active")

        parsed_from = parsed_to = None
        if date_from:
            parsed_from = _valid_date_or_none(date_from)
            if parsed_from is None:
                return Response(
                    {"detail": "Invalid date_from."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if date_to:
            parsed_to = _valid_date_or_none(date_to)
            if parsed_to is None:
                return Response(
                    {"detail": "Invalid date_to."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if parsed_from and parsed_to and parsed_from > parsed_to:
            return Response(
                {"detail": "date_from cannot be after date_to."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if parsed_from:
            slots = slots.filter(date__gte=parsed_from)
        if parsed_to:
            slots = slots.filter(date__lte=parsed_to)
        if is_active is not None:
            slots = slots.filter(is_active=is_active.lower() == "true")

        # Display count for the staff calendar — include completed/no-show so a
        # slot that was attended still reads as booked (matches the day view).
        slots = slots.annotate(
            bookings_count=Count(
                "bookings",
                filter=Q(bookings__status__in=OCCUPIED_BOOKING_STATUSES),
            )
        ).order_by("date", "start_time", "created_at")

        paginator = StandardPagination()
        page = paginator.paginate_queryset(slots, request)
        data = InspectionSlotSerializer(page, many=True).data
        # Add bookings_count to response
        for item, slot in zip(data, page):
            item["bookings_count"] = slot.bookings_count
        return paginator.get_paginated_response(data)

    def post(self, request):
        serializer = InspectionSlotCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        date_from = data["date_from"]
        date_to = data["date_to"]
        days = data["days"]
        time_slots = data["time_slots"]
        capacity = data["capacity"]
        center = data["center"]

        # The serializer normalizes time_slots into `time` objects, so build the
        # rows and insert them in one query. Skip combinations that already
        # exist (the unique constraint) so we can report an accurate count, and
        # let ignore_conflicts absorb any race with a concurrent create.
        existing = set(
            InspectionSlot.objects.filter(
                center=center, date__range=(date_from, date_to)
            ).values_list("date", "start_time", "end_time")
        )
        to_create = []
        seen = set()  # de-dupe identical rows within a single payload
        current = date_from
        while current <= date_to:
            if current.weekday() in days:
                for ts in time_slots:
                    key = (current, ts["start_time"], ts["end_time"])
                    if key in existing or key in seen:
                        continue
                    seen.add(key)
                    to_create.append(
                        InspectionSlot(
                            date=current,
                            start_time=ts["start_time"],
                            end_time=ts["end_time"],
                            center=center,
                            capacity=ts.get("capacity", capacity),
                            created_by=request.user,
                        )
                    )
            current += timedelta(days=1)

        InspectionSlot.objects.bulk_create(to_create, ignore_conflicts=True)

        # Re-fetch by the client-generated UUIDs of the rows we tried to insert.
        # ignore_conflicts disables PK return on the objects (they'd serialize as
        # null id), so we re-query. Because a conflicting row keeps the *existing*
        # row's id — never ours — matching on our ids counts exactly what this
        # request inserted, accurate even against a concurrent duplicate batch.
        new_ids = [slot.id for slot in to_create]
        created = list(
            InspectionSlot.objects.filter(id__in=new_ids)
            .select_related("center", "created_by")
            .order_by("date", "start_time")
        )

        return Response(
            {
                "created_count": len(created),
                "slots": InspectionSlotSerializer(created, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StaffSlotDetailView(APIView):
    permission_classes = [IsStaff]

    def patch(self, request, slot_id):
        try:
            slot = InspectionSlot.objects.select_related("center").get(id=slot_id)
        except InspectionSlot.DoesNotExist:
            return Response(
                {"detail": "Slot not found."}, status=status.HTTP_404_NOT_FOUND
            )

        active_bookings = slot.bookings.filter(
            status__in=ACTIVE_BOOKING_STATUSES
        ).count()
        update_fields = []

        if "capacity" in request.data:
            try:
                capacity = int(request.data["capacity"])
            except (TypeError, ValueError):
                return Response(
                    {"capacity": "Capacity must be a valid number."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if capacity < 1:
                return Response(
                    {"capacity": "Capacity must be at least 1."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if capacity < active_bookings:
                return Response(
                    {
                        "capacity": (
                            "Capacity cannot be lower than the current active "
                            f"booking count ({active_bookings})."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            slot.capacity = capacity
            update_fields.append("capacity")

        if "center" in request.data:
            try:
                center = InspectionCenter.objects.get(
                    id=request.data["center"],
                    is_active=True,
                )
            except (
                InspectionCenter.DoesNotExist,
                DjangoValidationError,
                ValueError,
                TypeError,
            ):
                return Response(
                    {"center": "Select a valid active inspection center."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            slot.center = center
            update_fields.append("center")

        if "note" in request.data:
            slot.note = str(request.data.get("note") or "")
            update_fields.append("note")

        if "is_active" in request.data:
            is_active = _parse_bool(request.data["is_active"])
            if is_active is None:
                return Response(
                    {"is_active": "Use true or false."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not is_active and active_bookings:
                return Response(
                    {"detail": "Cannot deactivate a slot with active bookings."},
                    status=status.HTTP_409_CONFLICT,
                )
            slot.is_active = is_active
            update_fields.append("is_active")

        if update_fields:
            slot.save(update_fields=update_fields)

        data = InspectionSlotSerializer(slot).data
        data["bookings_count"] = active_bookings
        return Response(data)

    def delete(self, request, slot_id):
        try:
            slot = InspectionSlot.objects.get(id=slot_id)
        except InspectionSlot.DoesNotExist:
            return Response(
                {"detail": "Slot not found."}, status=status.HTTP_404_NOT_FOUND
            )

        has_active = slot.bookings.filter(status__in=ACTIVE_BOOKING_STATUSES).exists()
        if has_active:
            return Response(
                {"detail": "Cannot deactivate a slot with active bookings."},
                status=status.HTTP_409_CONFLICT,
            )
        slot.is_active = False
        slot.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Owner Slot Availability ──


class AvailableSlotsView(APIView):
    # Owners browse slots to book; staff also need them to book on an owner's
    # behalf from the assistance queue.
    permission_classes = [IsOwner | IsStaff]

    def get(self, request):
        slots, error = _open_available_slots(request)
        if error:
            return error

        # spots_remaining is derived per row from the booking-count annotation.
        for slot in slots:
            slot.spots_remaining = slot.capacity - slot.bookings_count

        serializer = AvailableSlotSerializer(slots, many=True)
        return Response(serializer.data)


class AvailableSlotsSummaryView(APIView):
    """Per-day availability counts for the booking calendar.

    The calendar only needs "which days have open slots?" to highlight dates and
    open on the first available month. Serving that from the full slot list
    duplicates the nested center on every row and scales with slot density; this
    aggregate returns at most one tiny row per day in the window."""

    permission_classes = [IsOwner | IsStaff]

    def get(self, request):
        slots, error = _open_available_slots(request)
        if error:
            return error

        # Aggregate over the open slots' PKs via a subquery — grouping the
        # annotated queryset directly would multiply rows through the bookings
        # join and miscount.
        summary = (
            InspectionSlot.objects.filter(id__in=slots.values("id"))
            .values("date")
            .annotate(open_count=Count("id"))
            .order_by("date")
        )
        return Response(list(summary))


# Cap how far ahead a single availability read may reach, and the default
# look-ahead when no upper bound is supplied, so a caller can't pull every
# future slot. Must exceed the slot-batch range cap (300 days) so every
# creatable slot is reachable from the booking calendar.
AVAILABLE_WINDOW_DAYS = 365


def _open_available_slots(request):
    """Shared queryset for the availability endpoints: future-only, active,
    open-capacity slots, with validated center/date filters and a bounded
    window. Returns (queryset, None) or (None, error Response)."""
    now = timezone.localtime()
    slots = (
        InspectionSlot.objects.filter(is_active=True)
        .filter(
            Q(date__gt=now.date()) | Q(date=now.date(), start_time__gt=now.time())
        )
        .select_related("center")
        .annotate(
            bookings_count=Count(
                "bookings",
                filter=Q(bookings__status__in=ACTIVE_BOOKING_STATUSES),
            )
        )
        .filter(bookings_count__lt=F("capacity"))
        .order_by("date", "start_time")
    )

    center_filter = request.query_params.get("center")
    if center_filter:
        center_uuid = _valid_uuid_or_none(center_filter)
        if center_uuid is None:
            return None, Response(
                {"detail": "Invalid center id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slots = slots.filter(center_id=center_uuid)

    # Validate the optional date filters up front.
    parsed = {}
    for param in ("date", "date_from", "date_to"):
        raw = request.query_params.get(param)
        if not raw:
            continue
        value = _valid_date_or_none(raw)
        if value is None:
            return None, Response(
                {"detail": f"Invalid {param}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        parsed[param] = value

    if "date" in parsed:
        # Exact-day lookup — inherently bounded.
        slots = slots.filter(date=parsed["date"])
        return slots, None

    if (
        "date_from" in parsed
        and "date_to" in parsed
        and parsed["date_from"] > parsed["date_to"]
    ):
        return None, Response(
            {"detail": "date_from cannot be after date_to."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    # Bound the read to a window so a bare ?center=<id> call can't pull every
    # future slot. Default to an AVAILABLE_WINDOW_DAYS look-ahead when no upper
    # bound is given, and reject an over-large explicit range.
    window_from = parsed.get("date_from") or now.date()
    window_to = parsed.get("date_to") or (
        window_from + timedelta(days=AVAILABLE_WINDOW_DAYS)
    )
    if (window_to - window_from).days > AVAILABLE_WINDOW_DAYS:
        return None, Response(
            {"detail": f"Date range cannot exceed {AVAILABLE_WINDOW_DAYS} days."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if "date_from" in parsed:
        slots = slots.filter(date__gte=parsed["date_from"])
    slots = slots.filter(date__lte=window_to)
    return slots, None


# ── Owner Booking ──


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


class OwnerBookingCreateView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_RECEIPT_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    ]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # ID-on-file gate — an owner with no ID document on record can't book.
        # This is what lets us avoid asking for the owner's ID at every booking.
        profile = getattr(request.user, "owner_profile", None)
        if not profile or not profile.id_type or not profile.id_document:
            return Response(
                {
                    "detail": (
                        "Complete your ID verification in your profile "
                        "before booking."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Payment gate — the owner pays (inspection + listing + VAT) up front.
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
                car=car,
                slot=slot,
                booked_by=request.user,
                attendee=data,
                actor=request.user,
                actor_role=ActorRole.OWNER,
                request=request,
                initial_status=BookingStatus.AWAITING_PAYMENT,
            )
            if error:
                return error

            quote = FeeSetting.get_solo().quote()
            InspectionPayment.objects.create(
                booking=booking,
                inspection_fee=quote["inspection_fee"],
                listing_fee=quote["listing_fee"],
                vat_amount=quote["vat_amount"],
                total=quote["total"],
                currency=quote["currency"],
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
            InspectionBookingSerializer(detail).data,
            status=status.HTTP_201_CREATED,
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

        # Payment cleared → the appointment is real; tell the owner (both the
        # payment-confirmed note and the bring-your-ID appointment email).
        schedule_notification(
            notify_inspection_payment_confirmed,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        schedule_notification(
            send_booking_confirmation,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        detail = booking_detail_queryset().get(id=booking.id)
        return Response(InspectionBookingSerializer(detail).data)


class StaffRejectInspectionPaymentView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, booking_id):
        reason = (request.data or {}).get("reason", "")
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
                    car,
                    CarStatus.LISTING_APPROVED,
                    actor=request.user,
                    actor_role=ActorRole.STAFF,
                    note="Inspection payment rejected.",
                    request=request,
                )

        schedule_notification(
            notify_inspection_payment_rejected,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        detail = booking_detail_queryset().get(id=booking.id)
        return Response(InspectionBookingSerializer(detail).data)


class OwnerBookingListView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        bookings = (
            InspectionBooking.objects.filter(booked_by=request.user)
            .select_related("car", "slot")
            .order_by("-created_at")
        )
        car_filter = request.query_params.get("car")
        if car_filter:
            car_uuid = _valid_uuid_or_none(car_filter)
            if car_uuid is None:
                return Response(
                    {"detail": "Invalid car id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            bookings = bookings.filter(car_id=car_uuid)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(bookings, request)
        serializer = InspectionBookingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class OwnerBookingCancelView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, booking_id):
        with transaction.atomic():
            try:
                booking = (
                    InspectionBooking.objects.select_related("slot")
                    .select_for_update(of=("self",))
                    .get(id=booking_id, booked_by=request.user)
                )
            except InspectionBooking.DoesNotExist:
                return Response(
                    {"detail": "Booking not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if booking.status != BookingStatus.PENDING:
                return Response(
                    {"detail": "Only pending bookings can be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if booking.slot.date <= timezone.localdate():
                return Response(
                    {"detail": DAY_OF_LOCK_MESSAGE},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status != CarStatus.INSPECTION_PENDING:
                # e.g. inspection already in progress — too late to cancel
                return Response(
                    {"detail": f"Cannot cancel — car status is '{car.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=["status", "updated_at"])

            # Back to bookable — admin's listing approval still stands.
            record_status_change(
                car,
                CarStatus.LISTING_APPROVED,
                actor=request.user,
                actor_role=ActorRole.OWNER,
                note="Inspection booking cancelled.",
                request=request,
            )

        # Notify staff so their queue and slot calendar free the slot live.
        schedule_notification(
            notify_inspection_cancelled,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )

        return Response({"detail": "Booking cancelled."})


class OwnerBookingRescheduleView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, booking_id):
        new_slot_id = request.data.get("slot_id")
        if not new_slot_id:
            return Response(
                {"detail": "slot_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        consent_accepted = bool(request.data.get("consent_accepted"))

        with transaction.atomic():
            try:
                booking = (
                    InspectionBooking.objects.select_related("slot__center")
                    .select_for_update(of=("self",))
                    .get(id=booking_id, booked_by=request.user)
                )
            except InspectionBooking.DoesNotExist:
                return Response(
                    {"detail": "Booking not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if booking.status not in (BookingStatus.PENDING, BookingStatus.NO_SHOW):
                return Response(
                    {"detail": "This booking cannot be rescheduled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if booking.slot.date <= timezone.localdate():
                return Response(
                    {"detail": DAY_OF_LOCK_MESSAGE},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # A representative booking carries a signed authorization; moving the
            # appointment requires the owner to re-accept it for the new date.
            if (
                booking.attendee_type == AttendeeType.REPRESENTATIVE
                and not consent_accepted
            ):
                return Response(
                    {
                        "consent_accepted": (
                            "You must re-accept the authorization agreement to "
                            "reschedule."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status not in (
                CarStatus.INSPECTION_PENDING,
                CarStatus.INSPECTION_NO_SHOW,
            ):
                # e.g. inspection already in progress — too late to move it
                return Response(
                    {"detail": f"Cannot reschedule — car status is '{car.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Per-center policy: the center of the appointment being moved.
            max_reschedules = booking.slot.center.max_reschedules
            if booking.reschedule_count >= max_reschedules:
                return Response(
                    {
                        "detail": (
                            f"Maximum reschedules ({max_reschedules}) reached. "
                            "Contact staff to rebook."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                new_slot = InspectionSlot.objects.select_for_update().get(
                    id=new_slot_id, is_active=True
                )
            except InspectionSlot.DoesNotExist:
                return Response(
                    {"detail": "Slot not found or inactive."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if _slot_has_started(new_slot):
                return Response(
                    {"detail": "Cannot book a slot that has already started."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            current_bookings = InspectionBooking.objects.filter(
                slot=new_slot, status__in=ACTIVE_BOOKING_STATUSES
            ).count()
            if current_bookings >= new_slot.capacity:
                return Response(
                    {"detail": "This slot is full. Please pick another."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Cancel old booking
            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=["status", "updated_at"])

            # Create new booking with incremented reschedule count. Carry over the
            # attendee declaration — rescheduling moves the same appointment, so a
            # representative booking must not silently reset to the owner. Consent
            # is re-captured for the new date (validated above), so stamp it fresh.
            new_booking = InspectionBooking.objects.create(
                car=booking.car,
                slot=new_slot,
                booked_by=request.user,
                reschedule_count=booking.reschedule_count + 1,
                attendee_type=booking.attendee_type,
                rep_name=booking.rep_name,
                rep_id_type=booking.rep_id_type,
                rep_id_number=booking.rep_id_number,
                consent_accepted_at=(
                    timezone.now()
                    if booking.attendee_type == AttendeeType.REPRESENTATIVE
                    else None
                ),
            )

            if car.status != CarStatus.INSPECTION_PENDING:
                # e.g. rescheduling out of a no-show — a real transition
                record_status_change(
                    car,
                    CarStatus.INSPECTION_PENDING,
                    actor=request.user,
                    actor_role=ActorRole.OWNER,
                    note="Inspection rescheduled.",
                    request=request,
                )

        schedule_notification(
            notify_inspection_rescheduled,
            lambda bid=new_booking.id: booking_detail_queryset().get(id=bid),
        )

        detail = booking_detail_queryset().get(id=new_booking.id)
        return Response(InspectionBookingSerializer(detail).data)


# ── Staff Booking Actions ──


class StaffBookingListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        bookings = booking_detail_queryset().order_by("-created_at")

        status_filter = request.query_params.get("status")
        if status_filter:
            bookings = bookings.filter(status=status_filter)

        date_filter = request.query_params.get("date")
        if date_filter:
            parsed_date = _valid_date_or_none(date_filter)
            if parsed_date is None:
                return Response(
                    {"detail": "Invalid date."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            bookings = bookings.filter(slot__date=parsed_date)

        car_filter = request.query_params.get("car")
        if car_filter:
            car_uuid = _valid_uuid_or_none(car_filter)
            if car_uuid is None:
                return Response(
                    {"detail": "Invalid car id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            bookings = bookings.filter(car_id=car_uuid)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(bookings, request)
        serializer = InspectionBookingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StaffBookingDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, booking_id):
        try:
            booking = booking_detail_queryset().get(id=booking_id)
        except InspectionBooking.DoesNotExist:
            return Response(
                {"detail": "Booking not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            InspectionBookingDetailSerializer(
                booking,
                context={"request": request},
            ).data
        )


class StaffInspectionStartView(APIView):
    """Marks the start of the physical inspection: car → inspection_in_progress."""

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

            if booking.status != BookingStatus.PENDING:
                return Response(
                    {
                        "detail": f"Cannot start — booking is '{booking.get_status_display()}'."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status != CarStatus.INSPECTION_PENDING:
                return Response(
                    {"detail": f"Cannot start — car status is '{car.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            record_status_change(
                car,
                CarStatus.INSPECTION_IN_PROGRESS,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                request=request,
            )

        schedule_notification(
            notify_inspection_started,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )

        detail = booking_detail_queryset().get(id=booking.id)
        return Response(
            InspectionBookingDetailSerializer(
                detail,
                context={"request": request},
            ).data
        )


# result → (car status, owner notification)
RESULT_TRANSITIONS = {
    InspectionResult.PASSED: (CarStatus.PUBLISHED, notify_inspection_passed),
    InspectionResult.NEEDS_CLEARANCE: (
        CarStatus.NEEDS_CLEARANCE,
        notify_needs_clearance,
    ),
    InspectionResult.FAILED: (
        CarStatus.INSPECTION_REJECTED,
        notify_inspection_failed,
    ),
}


class StaffInspectionSubmitView(APIView):
    """Records the physical inspection form. The result drives the car's
    next status: passed → published (auto), needs_clearance → owner loop,
    failed → inspection_rejected (terminal)."""

    permission_classes = [IsStaff]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, booking_id):
        payload = (
            request.data.dict()
            if hasattr(request.data, "dict")
            else request.data.copy()
        )
        features = payload.get("features")
        if isinstance(features, str):
            try:
                payload["features"] = json.loads(features)
            except json.JSONDecodeError:
                pass

        serializer = PhysicalInspectionSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        inspection_result = serializer.validated_data["result"]

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

            if booking.status != BookingStatus.PENDING:
                return Response(
                    {
                        "detail": f"Cannot submit — booking is '{booking.get_status_display()}'."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if PhysicalInspection.objects.filter(booking=booking).exists():
                return Response(
                    {"detail": "An inspection was already submitted for this booking."},
                    status=status.HTTP_409_CONFLICT,
                )

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status != CarStatus.INSPECTION_IN_PROGRESS:
                return Response(
                    {
                        "detail": (
                            "Start the inspection before submitting results "
                            f"(car status is '{car.status}')."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            document_serializer = None
            requires_documents = (
                bool(car.sale_price) and inspection_result != InspectionResult.FAILED
            )
            has_document_payload = any(
                payload.get(field)
                for field in (
                    "car_documents",
                    "receipt_upload",
                    "custom_duty_status",
                    "receipt_type",
                    "additional_notes",
                )
            )
            if bool(car.sale_price) and (requires_documents or has_document_payload):
                document_serializer = InspectionDocumentSerializer(data=payload)
                document_serializer.is_valid(raise_exception=True)

            inspection = serializer.save(
                booking=booking,
                car=car,
                inspector=request.user,
                inspected_at=serializer.validated_data.get("inspected_at")
                or timezone.now(),
            )

            booking.status = BookingStatus.COMPLETED
            booking.staff_note = inspection.staff_notes
            booking.save(update_fields=["status", "staff_note", "updated_at"])

            if document_serializer is not None:
                try:
                    document_serializer.save(inspection=inspection)
                except IntegrityError:
                    return Response(
                        {
                            "detail": "Documents were already uploaded for this inspection."
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

            new_status, notify_func = RESULT_TRANSITIONS[inspection.result]
            extra = ["admin_note"]
            if new_status == CarStatus.PUBLISHED:
                car.published_at = timezone.now()
                car.admin_note = ""
                extra.append("published_at")
            else:
                car.admin_note = inspection.staff_notes
            record_status_change(
                car,
                new_status,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                note=inspection.staff_notes,
                extra_update_fields=extra,
                request=request,
            )

        schedule_notification(
            notify_func,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )

        return Response(
            PhysicalInspectionSerializer(inspection).data,
            status=status.HTTP_201_CREATED,
        )


class StaffInspectionDocumentsView(APIView):
    """Uploads sale-car paperwork gathered during the physical inspection."""

    permission_classes = [IsStaff]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, inspection_id):
        try:
            inspection = PhysicalInspection.objects.select_related("car").get(
                id=inspection_id
            )
        except PhysicalInspection.DoesNotExist:
            return Response(
                {"detail": "Inspection not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not inspection.car.sale_price:
            return Response(
                {"detail": "Documents are only required for cars listed for sale."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(inspection, "documents"):
            return Response(
                {"detail": "Documents were already uploaded for this inspection."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = InspectionDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            documents = serializer.save(inspection=inspection)
        except IntegrityError:
            # concurrent upload won the OneToOne race
            return Response(
                {"detail": "Documents were already uploaded for this inspection."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            InspectionDocumentSerializer(documents).data,
            status=status.HTTP_201_CREATED,
        )


class StaffClearanceResolveView(APIView):
    """Final staff decision on a needs_clearance car: publish it or reject it."""

    permission_classes = [IsStaff]

    ACTIONS = {
        "publish": (CarStatus.PUBLISHED, notify_inspection_passed),
        "reject": (CarStatus.INSPECTION_REJECTED, notify_inspection_failed),
    }

    def post(self, request, booking_id):
        action = request.data.get("action")
        if action not in self.ACTIONS:
            return Response(
                {"detail": "action must be 'publish' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        note = (request.data.get("staff_note") or "").strip()
        if action == "reject" and not note:
            return Response(
                {"detail": "A reason is required when rejecting."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

            # Resolution targets the completed inspection booking — cancelled
            # leftovers from reschedules must not carry the notification.
            if booking.status != BookingStatus.COMPLETED:
                return Response(
                    {
                        "detail": (
                            "Cannot resolve — booking is "
                            f"'{booking.get_status_display()}', must be Completed."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status != CarStatus.NEEDS_CLEARANCE:
                return Response(
                    {"detail": f"Cannot resolve — car status is '{car.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            new_status, notify_func = self.ACTIONS[action]
            extra = ["admin_note"]
            if new_status == CarStatus.PUBLISHED:
                car.published_at = timezone.now()
                car.admin_note = ""
                extra.append("published_at")
            else:
                car.admin_note = note
                # The owner notification reads booking.staff_note — keep it
                # in sync with the actual rejection reason, not the stale
                # clearance-era note.
                booking.staff_note = note
                booking.save(update_fields=["staff_note", "updated_at"])
            record_status_change(
                car,
                new_status,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                note=note,
                extra_update_fields=extra,
                request=request,
            )

        schedule_notification(
            notify_func,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        detail = booking_detail_queryset().get(id=booking.id)
        return Response(
            InspectionBookingDetailSerializer(
                detail,
                context={"request": request},
            ).data
        )


class OwnerClearanceResponseView(APIView):
    """Owner confirms clearance issues are addressed. The car stays in
    needs_clearance (staff has final say) — the response is recorded as a
    same-status history row so it appears on the timeline, and staff are
    notified to re-review."""

    permission_classes = [IsOwner]

    def post(self, request, booking_id):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response(
                {"detail": "A message describing what was addressed is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                booking = InspectionBooking.objects.select_for_update().get(
                    id=booking_id, booked_by=request.user
                )
            except InspectionBooking.DoesNotExist:
                return Response(
                    {"detail": "Booking not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status != CarStatus.NEEDS_CLEARANCE:
                return Response(
                    {
                        "detail": (
                            "Clearance responses are only accepted while the car "
                            "needs clearance."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            record_status_change(
                car,
                CarStatus.NEEDS_CLEARANCE,
                actor=request.user,
                actor_role=ActorRole.OWNER,
                note=message,
                request=request,
            )

        schedule_notification(
            lambda b, msg=message: notify_clearance_response(b, response_message=msg),
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        return Response({"detail": "Response recorded — staff will re-review."})


class StaffBookingNoShowView(APIView):
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

            if booking.status != BookingStatus.PENDING:
                return Response(
                    {
                        "detail": f"Cannot mark no-show — booking is '{booking.get_status_display()}'."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status != CarStatus.INSPECTION_PENDING:
                # e.g. inspection already started — the owner clearly showed up
                return Response(
                    {"detail": f"Cannot mark no-show — car status is '{car.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            booking.status = BookingStatus.NO_SHOW
            booking.save(update_fields=["status", "updated_at"])

            record_status_change(
                car,
                CarStatus.INSPECTION_NO_SHOW,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                note="Missed inspection appointment.",
                request=request,
            )

        schedule_notification(
            notify_inspection_no_show,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )

        detail = booking_detail_queryset().get(id=booking.id)
        return Response(
            InspectionBookingDetailSerializer(
                detail,
                context={"request": request},
            ).data
        )


class StaffCenterListCreateView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        qs = InspectionCenter.objects.all()

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

            # Get the search request

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(company_name__icontains=search)
                | Q(state__icontains=search)
                | Q(city__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = InspectionCenterSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):

        serializer = InspectionCenterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        center = serializer.save(created_by=request.user)
        return Response(
            InspectionCenterSerializer(center).data,
            status=status.HTTP_201_CREATED,
        )


class StaffCenterDetailView(APIView):
    permission_classes = [IsStaff]

    def get_query(self, center_id):
        try:
            return InspectionCenter.objects.get(id=center_id)
        except InspectionCenter.DoesNotExist:
            return None

    def get(self, request, center_id):

        center = self.get_query(center_id)
        if center is None:
            return Response(
                {"detail": "Center not found"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(InspectionCenterSerializer(center).data)

    def patch(self, request, center_id):
        center = self.get_query(center_id)
        if center is None:
            return Response(
                {"detail": "Center not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = InspectionCenterSerializer(center, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(InspectionCenterSerializer(center).data)


class LocationsView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        rows = (
            InspectionCenter.objects.filter(is_active=True)
            .values("country", "state", "city")
            .distinct()
            .order_by("country", "state", "city")
        )

        tree = {}
        for row in rows:
            country = tree.setdefault(str(row["country"]), {})
            country.setdefault(row["state"], []).append(row["city"])

        return Response(
            [
                {
                    "country": country,
                    # Full display name ("Nigeria"); `country` stays the ISO
                    # code because the centers filter matches the stored code.
                    "country_name": Country(country).name or country,
                    "states": [
                        {"state": state, "cities": cities}
                        for state, cities in states.items()
                    ],
                }
                for country, states in tree.items()
            ]
        )


class PublicCentersView(APIView):

    permission_classes = [IsOwner]

    def get(self, request):
        qs = InspectionCenter.objects.filter(is_active=True)

        for param in ("country", "state", "city"):
            value = request.query_params.get(param)
            if value:
                qs = qs.filter(**{f"{param}__iexact": value})

        return Response(InspectionCenterSerializer(qs, many=True).data)


class OwnerAssistanceCreateView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        """The owner's own assistance requests — lets the UI show an already-sent
        state instead of allowing a duplicate."""
        qs = (
            AssistanceRequest.objects.filter(owner=request.user)
            .select_related("car")
            .order_by("-created_at")
        )
        car = request.query_params.get("car")
        if car:
            car_uuid = _valid_uuid_or_none(car)
            if car_uuid is None:
                return Response(
                    {"detail": "Invalid car id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(car_id=car_uuid)
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(AssistanceRequestSerializer(qs, many=True).data)

    def post(self, request):
        serializer = AssistanceRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        car = None
        if data.get("car_id"):
            car = Car.objects.filter(id=data["car_id"], owner=request.user).first()
            if car is None:
                return Response(
                    {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
                )

        # Dedup — one open request per owner+car, so repeated taps don't pile up.
        if AssistanceRequest.objects.filter(
            owner=request.user, car=car, status=AssistanceStatus.OPEN
        ).exists():
            return Response(
                {
                    "detail": "You already have an open assistance request for this vehicle."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        assistance = AssistanceRequest.objects.create(
            owner=request.user,
            car=car,
            country=data.get("country", ""),
            state=data.get("state", ""),
            message=data.get("message", ""),
        )
        schedule_notification(
            notify_assistance_requested,
            lambda aid=assistance.id: AssistanceRequest.objects.select_related(
                "owner", "car"
            ).get(id=aid),
        )
        # Confirmation email to the owner.
        schedule_notification(
            send_assistance_received,
            lambda aid=assistance.id: AssistanceRequest.objects.select_related(
                "owner"
            ).get(id=aid),
        )
        return Response(
            AssistanceRequestSerializer(assistance).data,
            status=status.HTTP_201_CREATED,
        )


class StaffAssistanceListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        qs = AssistanceRequest.objects.select_related("owner", "car").all()
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AssistanceRequestSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StaffAssistanceHandleView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, request_id):
        try:
            assistance = AssistanceRequest.objects.get(id=request_id)
        except AssistanceRequest.DoesNotExist:
            return Response(
                {"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND
            )
        if assistance.status == AssistanceStatus.HANDLED:
            return Response(
                {"detail": "This request is already handled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assistance.status = AssistanceStatus.HANDLED
        assistance.handled_by = request.user
        assistance.handled_at = timezone.now()
        assistance.save(update_fields=["status", "handled_by", "handled_at"])
        return Response(AssistanceRequestSerializer(assistance).data)


class StaffBookForOwnerView(APIView):
    permission_classes = [IsStaff]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            try:
                car = (
                    Car.objects.select_for_update()
                    .select_related("owner")
                    .get(id=data["car_id"])
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

            # Staff verified identity out of band, so the ID-on-file gate is
            # intentionally skipped. booked_by is the owner; the history actor is
            # the staff member, so the audit shows staff placed the booking.
            booking, error = create_booking_core(
                car=car,
                slot=slot,
                booked_by=car.owner,
                attendee=data,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                request=request,
            )
            if error:
                return error

            # Close any open assistance request for this owner+car.
            AssistanceRequest.objects.filter(
                owner=car.owner, car=car, status=AssistanceStatus.OPEN
            ).update(
                status=AssistanceStatus.HANDLED,
                handled_by=request.user,
                handled_at=timezone.now(),
            )

        schedule_notification(
            notify_inspection_booked,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        # Staff booked on the owner's behalf → the "we booked it for you" email.
        schedule_notification(
            send_assistance_booked,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )
        detail = booking_detail_queryset().get(id=booking.id)
        return Response(
            InspectionBookingSerializer(detail).data,
            status=status.HTTP_201_CREATED,
        )
