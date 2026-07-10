from datetime import timedelta, time

from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsOwner, IsStaff
from apps.listings.models import Car, CarStatus
from rest_framework.parsers import FormParser, MultiPartParser

from apps.notifications.service import (
    notify_inspection_booked,
    notify_inspection_started,
    notify_needs_clearance,
    notify_inspection_passed,
    notify_inspection_failed,
    notify_inspection_no_show,
    notify_inspection_rescheduled,
)
from .models import (
    ACTIVE_BOOKING_STATUSES,
    ActorRole,
    BookingStatus,
    InspectionBooking,
    InspectionCenter,
    InspectionResult,
    InspectionSlot,
    PhysicalInspection,
)
from .services import generate_tracking_id, record_status_change
from .serializers import (
    AvailableSlotSerializer,
    BookingCreateSerializer,
    InspectionBookingDetailSerializer,
    InspectionBookingSerializer,
    InspectionCenterSerializer,
    InspectionDocumentSerializer,
    InspectionSlotCreateSerializer,
    InspectionSlotSerializer,
    PhysicalInspectionSerializer,
)


# Booking requires prior admin approval of the listing. INSPECTION_NO_SHOW is
# included because those cars were already approved — the owner rebooks directly.
BOOKABLE_CAR_STATUSES = [
    CarStatus.LISTING_APPROVED,
    CarStatus.INSPECTION_NO_SHOW,
]


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
    ).prefetch_related("car__images", "car__features")


# ── Staff Slot Management ──


class StaffSlotListCreateView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        slots = InspectionSlot.objects.select_related("created_by", "center").all()

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        is_active = request.query_params.get("is_active")

        if date_from:
            slots = slots.filter(date__gte=date_from)
        if date_to:
            slots = slots.filter(date__lte=date_to)
        if is_active is not None:
            slots = slots.filter(is_active=is_active.lower() == "true")

        # Annotate with booking count
        slots = slots.annotate(
            bookings_count=Count(
                "bookings",
                filter=Q(bookings__status__in=ACTIVE_BOOKING_STATUSES),
            )
        )

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

        created = []
        current = date_from
        while current <= date_to:
            if current.weekday() in days:
                for ts in time_slots:
                    start = ts["start_time"]
                    end = ts["end_time"]
                    # Parse time strings if needed
                    if isinstance(start, str):
                        parts = (
                            start.replace("AM", "").replace("PM", "").strip().split(":")
                        )
                        hour = int(parts[0])
                        minute = int(parts[1]) if len(parts) > 1 else 0
                        if "PM" in ts["start_time"] and hour != 12:
                            hour += 12
                        if "AM" in ts["start_time"] and hour == 12:
                            hour = 0
                        start = time(hour, minute)
                    if isinstance(end, str):
                        parts = (
                            end.replace("AM", "").replace("PM", "").strip().split(":")
                        )
                        hour = int(parts[0])
                        minute = int(parts[1]) if len(parts) > 1 else 0
                        if "PM" in ts["end_time"] and hour != 12:
                            hour += 12
                        if "AM" in ts["end_time"] and hour == 12:
                            hour = 0
                        end = time(hour, minute)

                    slot, was_created = InspectionSlot.objects.get_or_create(
                        date=current,
                        start_time=start,
                        end_time=end,
                        center=center,
                        defaults={
                            "capacity": capacity,
                            "created_by": request.user,
                        },
                    )
                    if was_created:
                        created.append(slot)
            current += timedelta(days=1)

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
            slot = InspectionSlot.objects.get(id=slot_id)
        except InspectionSlot.DoesNotExist:
            return Response(
                {"detail": "Slot not found."}, status=status.HTTP_404_NOT_FOUND
            )

        allowed_fields = {"capacity", "center", "note", "is_active"}
        for field, value in request.data.items():
            if field in allowed_fields:
                setattr(slot, field, value)
        slot.save()
        return Response(InspectionSlotSerializer(slot).data)

    def delete(self, request, slot_id):
        try:
            slot = InspectionSlot.objects.get(id=slot_id)
        except InspectionSlot.DoesNotExist:
            return Response(
                {"detail": "Slot not found."}, status=status.HTTP_404_NOT_FOUND
            )

        has_active = slot.bookings.filter(
            status__in=ACTIVE_BOOKING_STATUSES
        ).exists()
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
    permission_classes = [IsOwner]

    def get(self, request):
        today = timezone.localdate()
        slots = (
            InspectionSlot.objects.filter(date__gte=today, is_active=True)
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
            slots = slots.filter(center_id=center_filter)

        date_filter = request.query_params.get("date")
        if date_filter:
            slots = slots.filter(date=date_filter)

        # Add spots_remaining as annotation
        for slot in slots:
            slot.spots_remaining = slot.capacity - slot.bookings_count

        serializer = AvailableSlotSerializer(slots, many=True)
        return Response(serializer.data)


# ── Owner Booking ──


class OwnerBookingCreateView(APIView):
    permission_classes = [IsOwner]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        car_id = serializer.validated_data["car_id"]
        slot_id = serializer.validated_data["slot_id"]

        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(id=car_id, owner=request.user)
            except Car.DoesNotExist:
                return Response(
                    {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
                )

            if car.status not in BOOKABLE_CAR_STATUSES:
                return Response(
                    {
                        "detail": f"Cannot book inspection — car status is '{car.get_status_display()}'."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                slot = InspectionSlot.objects.select_related(
                    "center"
                ).select_for_update(of=("self",)).get(id=slot_id, is_active=True)
            except InspectionSlot.DoesNotExist:
                return Response(
                    {"detail": "Slot not found or inactive."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if slot.date < timezone.localdate():
                return Response(
                    {"detail": "Cannot book a slot in the past."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check capacity
            current_bookings = InspectionBooking.objects.filter(
                slot=slot, status__in=ACTIVE_BOOKING_STATUSES
            ).count()
            if current_bookings >= slot.capacity:
                return Response(
                    {"detail": "This slot is full. Please pick another."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Check reschedule count from previous bookings
            last_booking = (
                InspectionBooking.objects.filter(car=car)
                .order_by("-created_at")
                .first()
            )
            reschedule_count = last_booking.reschedule_count if last_booking else 0

            try:
                booking = InspectionBooking.objects.create(
                    car=car,
                    slot=slot,
                    booked_by=request.user,
                    reschedule_count=reschedule_count,
                )
            except IntegrityError:
                return Response(
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
                actor=request.user,
                actor_role=ActorRole.OWNER,
                extra_update_fields=extra,
            )

        schedule_notification(
            notify_inspection_booked,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )

        detail = booking_detail_queryset().get(id=booking.id)
        return Response(
            InspectionBookingSerializer(detail).data,
            status=status.HTTP_201_CREATED,
        )


class OwnerBookingListView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        bookings = (
            InspectionBooking.objects.filter(booked_by=request.user)
            .select_related("car", "slot")
            .order_by("-created_at")
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(bookings, request)
        serializer = InspectionBookingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class OwnerBookingCancelView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, booking_id):
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

            if booking.status != BookingStatus.PENDING:
                return Response(
                    {"detail": "Only pending bookings can be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=["status", "updated_at"])

            # Back to bookable — admin's listing approval still stands.
            car = Car.objects.select_for_update().get(id=booking.car_id)
            record_status_change(
                car,
                CarStatus.LISTING_APPROVED,
                actor=request.user,
                actor_role=ActorRole.OWNER,
                note="Inspection booking cancelled.",
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

            if new_slot.date < timezone.localdate():
                return Response(
                    {"detail": "Cannot book a slot in the past."},
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

            # Create new booking with incremented reschedule count
            new_booking = InspectionBooking.objects.create(
                car=booking.car,
                slot=new_slot,
                booked_by=request.user,
                reschedule_count=booking.reschedule_count + 1,
            )

            car = Car.objects.select_for_update().get(id=booking.car_id)
            if car.status != CarStatus.INSPECTION_PENDING:
                # e.g. rescheduling out of a no-show — a real transition
                record_status_change(
                    car,
                    CarStatus.INSPECTION_PENDING,
                    actor=request.user,
                    actor_role=ActorRole.OWNER,
                    note="Inspection rescheduled.",
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
        bookings = booking_detail_queryset()

        status_filter = request.query_params.get("status")
        if status_filter:
            bookings = bookings.filter(status=status_filter)

        date_filter = request.query_params.get("date")
        if date_filter:
            bookings = bookings.filter(slot__date=date_filter)

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
        return Response(InspectionBookingDetailSerializer(booking).data)


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
            )

        schedule_notification(
            notify_inspection_started,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )

        detail = booking_detail_queryset().get(id=booking.id)
        return Response(InspectionBookingDetailSerializer(detail).data)


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

    def post(self, request, booking_id):
        serializer = PhysicalInspectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

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
        documents = serializer.save(inspection=inspection)
        return Response(
            InspectionDocumentSerializer(documents).data,
            status=status.HTTP_201_CREATED,
        )


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

            booking.status = BookingStatus.NO_SHOW
            booking.save(update_fields=["status", "updated_at"])

            car = Car.objects.select_for_update().get(id=booking.car_id)
            record_status_change(
                car,
                CarStatus.INSPECTION_NO_SHOW,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                note="Missed inspection appointment.",
            )

        schedule_notification(
            notify_inspection_no_show,
            lambda bid=booking.id: booking_detail_queryset().get(id=bid),
        )

        detail = booking_detail_queryset().get(id=booking.id)
        return Response(InspectionBookingDetailSerializer(detail).data)


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
