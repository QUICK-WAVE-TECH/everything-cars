from datetime import timedelta
from io import BytesIO
from pathlib import Path

import uuid as uuid_lib
from PIL import Image, ImageOps
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.db.models import (
    Count,
    DateField,
    Exists,
    ExpressionWrapper,
    F,
    OuterRef,
    Prefetch,
    Q,
)
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page


from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser
from common.pagination import StandardPagination
from common.permissions import IsOwner, IsCustomer, IsStaff
from .models import (
    ACTIVE_REQUEST_STATUSES,
    Brand,
    Car,
    CarImage,
    CarImageType,
    CarStatus,
    ListingType,
    Request,
    RequestStatus,
    RequestStatusEvent,
    Transaction,
)
from .serializers import (
    BrandSerializer,
    CarListSerializer,
    CarDetailSerializer,
    CarCreateSerializer,
    CarImageUploadSerializer,
    CarImageSerializer,
    RequestListSerializer,
    RequestDetailSerializer,
    RequestCreateSerializer,
    RequestActionSerializer,
    TransactionDetailSerializer,
    TransactionListSerializer,
)
from apps.notifications.service import (
    notify_new_request,
    notify_request_approved,
    notify_request_rejected,
    notify_request_cancelled,
    notify_payment_submitted,
    notify_payment_confirmed,
    notify_rental_active,
    notify_rental_completed,
    notify_auto_rejected,
    notify_listing_suspended,
    notify_listing_approved,
    notify_listing_submitted,
    notify_changes_requested,
)
from apps.inspections.models import (
    ACTIVE_BOOKING_STATUSES,
    ActorRole,
    BookingStatus,
    InspectionBooking,
    PhysicalInspection,
    InspectionResult,
)
from apps.inspections.serializers import (
    CarStatusHistorySerializer,
    StaffCarStatusHistorySerializer,
)
from apps.inspections.services import record_status_change
from apps.sales.models import Deal, DealStatus


REQUIRED_CAR_IMAGE_TYPES = [
    CarImageType.FRONT,
    CarImageType.BACK,
    CarImageType.LEFT_SIDE,
    CarImageType.RIGHT_SIDE,
]
OPTIONAL_CAR_IMAGE_TYPES = [CarImageType.INTERIOR]
CAR_IMAGE_TYPES = REQUIRED_CAR_IMAGE_TYPES + OPTIONAL_CAR_IMAGE_TYPES
MAX_CAR_IMAGES_PER_REQUEST = len(CAR_IMAGE_TYPES)
MAX_CAR_IMAGES_PER_CAR = len(CAR_IMAGE_TYPES)
MAX_CAR_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
# Editable: pre-approval states, the clearance loop, and failed inspections
# (owner fixes the issues and resubmits for review). inspection_no_show
# rebooks without editing.
# Owners may only edit listing *content* (text/spec fields) when staff explicitly
# requested changes. needs_clearance is answered with a message (not an edit); a
# rejected inspection is fixed on the physical car and resubmitted. None of those
# reopen the listing for editing.
EDITABLE_CAR_STATUSES = [
    CarStatus.NEEDS_CHANGES,
]

# Photo uploads are also allowed in DRAFT: creating a listing IS submitting it,
# and photos are uploaded to the freshly-created draft as part of that flow.
# (Text details are captured atomically at create time, so DRAFT text stays
# locked — only the images arrive afterward.)
IMAGE_EDITABLE_CAR_STATUSES = [
    CarStatus.DRAFT,
    CarStatus.NEEDS_CHANGES,
]
REQUEST_APPROVAL_BLOCKING_STATUSES = [
    RequestStatus.APPROVED,
    RequestStatus.PAYMENT_SUBMITTED,
    RequestStatus.PAID,
    RequestStatus.ACTIVE,
]
RESERVED_RENTAL_STATUSES = [
    RequestStatus.APPROVED,
    RequestStatus.PAYMENT_SUBMITTED,
    RequestStatus.PAID,
]
MAX_OPTIMIZED_CAR_IMAGE_SIZE = (1600, 1200)
MAX_CAR_IMAGE_THUMBNAIL_SIZE = (480, 360)
CAR_IMAGE_WEBP_QUALITY = 82
CAR_IMAGE_THUMBNAIL_WEBP_QUALITY = 76


def schedule_notification(notify_func, get_payload):
    transaction.on_commit(lambda: notify_func(get_payload()), robust=True)


def request_end_date_expression():
    return ExpressionWrapper(
        F("start_date") + F("duration_days"),
        output_field=DateField(),
    )


def availability_annotations():
    today = timezone.localdate()
    buy_in_progress = Deal.objects.filter(
        car_id=OuterRef("id"),
        status=DealStatus.ACTIVE,
    )
    active_current_rental = (
        Request.objects.filter(
            car_id=OuterRef("id"),
            request_type=ListingType.RENT,
            status=RequestStatus.ACTIVE,
            start_date__lte=today,
        )
        .annotate(end_date=request_end_date_expression())
        .filter(end_date__gt=today)
    )
    # No reserved status for rentals — they show as "available" with
    # blocked dates on the calendar. Only an active Deal reserves the car.
    reserved_future_rental = Request.objects.none()
    return {
        "_has_buy_in_progress": Exists(buy_in_progress),
        "_has_active_current_rental": Exists(active_current_rental),
        "_has_reserved_future_rental": Exists(reserved_future_rental),
    }


def sold_annotation():
    """True when a Deal on the car completed (the car was genuinely sold).
    Archived-without-sale means the owner withdrew the listing — those
    cars must not appear publicly as 'sold'."""
    return Exists(
        Deal.objects.filter(car_id=OuterRef("id"), status=DealStatus.COMPLETED)
    )


def car_has_active_requests(car_id):
    return Request.objects.filter(
        car_id=car_id,
        status__in=ACTIVE_REQUEST_STATUSES,
    ).exists()


def car_is_reserved(car_id):
    """True when an active Deal holds the car (an accepted offer in progress) —
    the car reads as 'reserved' and can't be paused or archived mid-sale."""
    return Deal.objects.filter(car_id=car_id, status=DealStatus.ACTIVE).exists()


def active_request_archive_response():
    return Response(
        {
            "detail": (
                "This listing has active customer requests. Resolve or cancel "
                "those requests before archiving the listing."
            )
        },
        status=status.HTTP_409_CONFLICT,
    )


def rental_end_date(req):
    if not req.start_date or not req.duration_days:
        return None
    return req.start_date + timedelta(days=req.duration_days)


def rental_dates_overlap(first, second):
    first_end = rental_end_date(first)
    second_end = rental_end_date(second)
    if not first.start_date or not second.start_date or not first_end or not second_end:
        return False
    return first.start_date < second_end and second.start_date < first_end


def find_rental_overlap_conflict(
    car_id,
    start_date,
    duration_days,
    exclude_request_id=None,
):
    if not start_date or not duration_days:
        return None

    requested_end = start_date + timedelta(days=duration_days)
    overlapping = (
        Request.objects.filter(
            car_id=car_id,
            request_type=ListingType.RENT,
            status__in=REQUEST_APPROVAL_BLOCKING_STATUSES,
            start_date__lt=requested_end,
        )
        .annotate(end_date=request_end_date_expression())
        .filter(end_date__gt=start_date)
    )
    if exclude_request_id is not None:
        overlapping = overlapping.exclude(id=exclude_request_id)

    existing = overlapping.only("start_date", "duration_days").first()
    if not existing:
        return None

    existing_end = existing.start_date + timedelta(days=existing.duration_days)
    return (
        "This car is already booked from "
        f"{existing.start_date.isoformat()} to {existing_end.isoformat()}. "
        "Please pick different dates."
    )


def find_request_approval_conflict(req):
    competing_requests = Request.objects.filter(
        car_id=req.car_id,
        status__in=REQUEST_APPROVAL_BLOCKING_STATUSES,
    ).exclude(id=req.id)

    if req.request_type == ListingType.BUY:
        conflict = competing_requests.first()
        if conflict:
            return "This car already has an approved, paid, or active request."
        return None

    buy_conflict = competing_requests.filter(request_type=ListingType.BUY).first()
    if buy_conflict:
        return "This car already has an approved, paid, or active buy request."

    rent_conflict = find_rental_overlap_conflict(
        req.car_id,
        req.start_date,
        req.duration_days,
        exclude_request_id=req.id,
    )
    if rent_conflict:
        return (
            "This car already has an approved, paid, or active rental for those dates."
        )

    return None


def optimize_car_image(file, max_size, suffix="", quality=CAR_IMAGE_WEBP_QUALITY):
    file.seek(0)
    with Image.open(file) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        image.thumbnail(max_size, Image.Resampling.LANCZOS)

        output = BytesIO()
        image.save(output, format="WEBP", quality=quality, method=6)

    name = f"{Path(file.name).stem}{suffix}.webp"
    return ContentFile(output.getvalue(), name=name)


def request_detail_queryset():
    return Request.objects.select_related(
        "car",
        "car__owner",
        "car__owner__owner_profile",
        "customer",
    ).prefetch_related(
        "car__images",
        "car__features",
        Prefetch(
            "status_events",
            queryset=RequestStatusEvent.objects.select_related("actor"),
        ),
    )


# Create your views here.
class MyCarListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        obj = (
            Car.objects.filter(owner=request.user)
            .select_related("owner__owner_profile", "brand")
            .prefetch_related("images")
            # Annotate availability so the serializer doesn't run per-car request
            # queries (N+1) computing each card's status.
            .annotate(_is_sold=sold_annotation(), **availability_annotations())
        )
        # exclude archived unless explicitly requested for
        status_filter = request.query_params.get("status")
        if status_filter:
            obj = obj.filter(status=status_filter)
        else:
            obj = obj.exclude(status=CarStatus.ARCHIVED)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(obj, request)
        serializer = CarListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        owner_profile = getattr(request.user, "owner_profile", None)
        if not owner_profile or not owner_profile.is_verified:
            return Response(
                {"detail": "Account must be verified to list cars. "},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CarCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            car = serializer.save(owner=request.user)
            schedule_notification(
                notify_listing_submitted,
                lambda car_id=car.id: Car.objects.select_related("owner", "brand").get(
                    id=car_id
                ),
            )

        car = (
            Car.objects.select_related("owner__owner_profile", "brand")
            .prefetch_related("images", "features")
            .get(id=car.id)
        )
        return Response(
            CarDetailSerializer(car, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyCarDetailView(APIView):
    permission_classes = [IsOwner]

    def _get_car(self, car_id, user):
        try:
            return (
                Car.objects.select_related("owner__owner_profile", "brand")
                .prefetch_related("images", "features")
                .get(id=car_id, owner=user)
            )
        except Car.DoesNotExist:
            return None

    def get(self, request, car_id):
        car = self._get_car(car_id, request.user)
        if not car:
            return Response(
                {"detail": "Car not found"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(CarDetailSerializer(car, context={"request": request}).data)

    def patch(self, request, car_id):
        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(id=car_id, owner=request.user)
            except Car.DoesNotExist:
                return Response(
                    {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
                )

            if car.status not in EDITABLE_CAR_STATUSES:
                return Response(
                    {"detail": "Car details cannot be edited in this status."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            serializer = CarCreateSerializer(
                car, data=request.data, partial=True, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            car = serializer.save()

        car.refresh_from_db()
        car = self._get_car(car_id, request.user)
        return Response(CarDetailSerializer(car, context={"request": request}).data)

    def delete(self, request, car_id):
        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(id=car_id, owner=request.user)
            except Car.DoesNotExist:
                return Response(
                    {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
                )

            if car_has_active_requests(car.id) or car_is_reserved(car.id):
                return active_request_archive_response()

            # Archiving mid-inspection would orphan the booking (it keeps
            # consuming slot capacity and sits in the staff queue forever).
            if car.status == CarStatus.INSPECTION_PENDING:
                return Response(
                    {
                        "detail": (
                            "Cancel your inspection booking before archiving "
                            "this listing."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            if car.status == CarStatus.INSPECTION_IN_PROGRESS:
                return Response(
                    {
                        "detail": (
                            "An inspection is in progress — wait for the "
                            "result before archiving this listing."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            record_status_change(
                car,
                CarStatus.ARCHIVED,
                actor=request.user,
                actor_role=ActorRole.OWNER,
                request=request,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CarImageUploadView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser]

    def post(self, request, car_id):
        # Check car ownership and edit lockdown before file validation so
        # we return 403/404 even when no files are sent.
        try:
            with transaction.atomic():
                car = Car.objects.select_for_update().get(id=car_id, owner=request.user)
                if car.status not in IMAGE_EDITABLE_CAR_STATUSES:
                    return Response(
                        {"detail": "Car images cannot be uploaded in this status."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )

        upload_data = {
            image_type: request.FILES.get(image_type)
            for image_type in CAR_IMAGE_TYPES
            if request.FILES.get(image_type) is not None
        }
        files = list(upload_data.values())
        if not upload_data:
            return Response(
                {
                    "detail": "No images provided",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        oversized_file = next(
            (file for file in files if file.size > MAX_CAR_IMAGE_SIZE_BYTES), None
        )
        if oversized_file is not None:
            max_size_mb = MAX_CAR_IMAGE_SIZE_BYTES // (1024 * 1024)
            return Response(
                {
                    "detail": (
                        f"{oversized_file.name} is too large. "
                        f"Images must be {max_size_mb}MB or smaller."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        upload_serializer = CarImageUploadSerializer(data=upload_data)
        upload_serializer.is_valid(raise_exception=True)
        uploads_by_type = upload_serializer.validated_data

        try:
            with transaction.atomic():
                car = Car.objects.select_for_update().get(id=car_id, owner=request.user)

                existing_types = set(
                    car.images.exclude(image_type="").values_list(
                        "image_type", flat=True
                    )
                )
                missing_required_types = [
                    image_type
                    for image_type in REQUIRED_CAR_IMAGE_TYPES
                    if image_type not in uploads_by_type
                    and image_type not in existing_types
                ]
                if missing_required_types:
                    return Response(
                        {
                            "detail": (
                                "Please upload front, back, left side, and right side "
                                "photos before continuing."
                            ),
                            "missing_types": missing_required_types,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                created_images = []

                for image_type in CAR_IMAGE_TYPES:
                    file = uploads_by_type.get(image_type)
                    if file is None:
                        continue

                    optimized_file = optimize_car_image(
                        file,
                        MAX_OPTIMIZED_CAR_IMAGE_SIZE,
                    )
                    thumbnail_file = optimize_car_image(
                        file,
                        MAX_CAR_IMAGE_THUMBNAIL_SIZE,
                        suffix="-thumb",
                        quality=CAR_IMAGE_THUMBNAIL_WEBP_QUALITY,
                    )
                    car.images.filter(image_type=image_type).delete()
                    if image_type == CarImageType.FRONT:
                        car.images.filter(is_primary=True).update(is_primary=False)
                    image = CarImage.objects.create(
                        car=car,
                        image_type=image_type,
                        image=optimized_file,
                        thumbnail=thumbnail_file,
                        is_primary=(image_type == CarImageType.FRONT),
                    )
                    created_images.append(image)

        except Car.DoesNotExist:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(
            CarImageSerializer(
                created_images, many=True, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class PublicCarListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cars = (
            Car.objects.filter(status__in=[CarStatus.PUBLISHED, CarStatus.ARCHIVED])
            .annotate(_is_sold=sold_annotation())
            # Archived cars appear publicly only when actually sold
            .filter(Q(status=CarStatus.PUBLISHED) | Q(_is_sold=True))
            .select_related("owner__owner_profile", "brand")
            .prefetch_related("images")
            .annotate(**availability_annotations())
        )
        # Prefetch each car's passed inspection so the serializer's is_verified /
        # verified overlay reads it without a per-car query (N+1).
        passed_prefetch = Prefetch(
            "physical_inspections",
            queryset=PhysicalInspection.objects.filter(
                result=InspectionResult.PASSED
            ).order_by("-inspected_at"),
            to_attr="_passed_inspections",
        )
        cars = cars.prefetch_related(passed_prefetch)

        # Basic filters
        listing_type = request.query_params.get("listing_type")
        if listing_type:
            cars = cars.filter(listing_type=listing_type)

        state = request.query_params.get("state")
        if state:
            cars = cars.filter(state__icontains=state)

        city = request.query_params.get("city")
        if city:
            cars = cars.filter(city__icontains=city)

        brand = request.query_params.get("brand")
        if brand:
            cars = cars.filter(brand__name__icontains=brand)

        body_type = request.query_params.get("body_type")
        if body_type:
            cars = cars.filter(body_type__icontains=body_type)

        search = request.query_params.get("search")
        if search:
            cars = cars.filter(
                Q(title__icontains=search)
                | Q(brand__name__icontains=search)
                | Q(model__icontains=search)
                | Q(state__icontains=search)
                | Q(city__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(cars, request)
        serializer = CarListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


@method_decorator(cache_page(60 * 30), name="dispatch")
class BrandListView(APIView):
    """The canonical, active brand list — powers the listing-form picker and the
    buyer brand filter."""

    permission_classes = [AllowAny]

    def get(self, request):
        brands = Brand.objects.filter(is_active=True)
        return Response(BrandSerializer(brands, many=True).data)


@method_decorator(cache_page(60 * 5), name="dispatch")
class PublicCarFilterOptionsView(APIView):
    """Returns available filter options (states, cities, body types, brands) from published cars."""

    permission_classes = [AllowAny]

    def get(self, request):
        published = Car.objects.filter(status=CarStatus.PUBLISHED)

        def distinct_values(field):
            return list(
                published.exclude(**{field: ""})
                .order_by(field)
                .values_list(field, flat=True)
                .distinct()
            )

        return Response(
            {
                "states": distinct_values("state"),
                "cities": distinct_values("city"),
                "body_types": distinct_values("body_type"),
                # Canonical brands (not distinct free-text) so facets never
                # fragment into "Benz" vs "Mercedes-Benz".
                "brands": list(
                    Brand.objects.filter(is_active=True).values_list(
                        "name", flat=True
                    )
                ),
            }
        )


class PublicCarDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, car_id):
        booked_prefetch = Prefetch(
            "requests",
            queryset=Request.objects.filter(
                request_type="rent",
                status__in=[
                    RequestStatus.APPROVED,
                    RequestStatus.PAYMENT_SUBMITTED,
                    RequestStatus.PAID,
                    RequestStatus.ACTIVE,
                ],
            ).only("id", "start_date", "duration_days", "status"),
            to_attr="_booked_requests",
        )
        passed_prefetch = Prefetch(
            "physical_inspections",
            queryset=PhysicalInspection.objects.filter(
                result=InspectionResult.PASSED
            ).order_by("-inspected_at"),
            to_attr="_passed_inspections",
        )

        try:
            car = (
                Car.objects.select_related("owner__owner_profile", "brand")
                .prefetch_related(
                    "images", "features", booked_prefetch, passed_prefetch
                )
                .annotate(_is_sold=sold_annotation(), **availability_annotations())
                .filter(Q(status=CarStatus.PUBLISHED) | Q(_is_sold=True))
                .get(
                    id=car_id,
                    status__in=[CarStatus.PUBLISHED, CarStatus.ARCHIVED],
                )
            )
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car does not exist"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(
            CarDetailSerializer(car, context={"request": request, "public": True}).data
        )


class MyCarHistoryView(APIView):
    """Owner-facing status timeline. The serializer excludes staff identity —
    owners see roles and notes, never who acted."""

    permission_classes = [IsOwner]

    def get(self, request, car_id):
        try:
            car = Car.objects.get(id=car_id, owner=request.user)
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )
        history = car.status_history.all()
        return Response(CarStatusHistorySerializer(history, many=True).data)


class MyCarStatusView(APIView):
    permission_classes = [IsOwner]

    OWNER_TRANSITIONS = {
        "draft": [],  # Admin approves listing → listing_approved
        "listing_approved": [],  # Owner books via inspections app → inspection_pending
        "inspection_pending": [],  # Only staff can transition
        "inspection_in_progress": [],  # Only staff can transition
        "needs_clearance": [],  # Owner addresses issues; staff transitions
        "inspection_rejected": ["draft"],  # Owner fixes issues and resubmits
        "inspection_no_show": [],  # Owner rebooks via inspections app
        "needs_changes": ["draft"],  # Owner resubmits for admin review
        "published": ["paused", "archived"],
        "paused": ["published", "archived"],
        "suspended": [],  # Only staff can transition
        "archived": [],  # Terminal
    }

    def post(self, request, car_id):
        new_status = request.data.get("status")
        if not new_status:
            return Response(
                {"detail": "Status is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(id=car_id, owner=request.user)
            except Car.DoesNotExist:
                return Response(
                    {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
                )

            allowed = self.OWNER_TRANSITIONS.get(car.status, [])
            if new_status not in allowed:
                return Response(
                    {
                        "detail": (
                            f"Cannot transition from '{car.status}' to '{new_status}'."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if new_status == CarStatus.ARCHIVED and (
                car_has_active_requests(car.id) or car_is_reserved(car.id)
            ):
                return active_request_archive_response()

            # A reserved car (accepted offer / purchase in progress) can't be
            # hidden from the buyer mid-sale.
            if new_status == CarStatus.PAUSED and car_is_reserved(car.id):
                return Response(
                    {
                        "detail": (
                            "This vehicle is reserved by an accepted offer and "
                            "can't be paused until the sale is resolved."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            extra = []
            if new_status == CarStatus.PUBLISHED and not car.published_at:
                car.published_at = timezone.now()
                extra.append("published_at")
            record_status_change(
                car,
                new_status,
                actor=request.user,
                actor_role=ActorRole.OWNER,
                extra_update_fields=extra,
                request=request,
            )
            if new_status == CarStatus.DRAFT:
                # needs_changes → draft is a resubmission — tell staff
                schedule_notification(
                    lambda resubmitted_car: notify_listing_submitted(
                        resubmitted_car, resubmitted=True
                    ),
                    lambda car_id=car.id: Car.objects.select_related("owner", "brand").get(
                        id=car_id
                    ),
                )

        return Response(
            CarDetailSerializer(
                Car.objects.select_related("owner__owner_profile", "brand")
                .prefetch_related("images", "features")
                .get(id=car.id),
                context={"request": request},
            ).data
        )


# ────────────────────────────────────────────────────────
# Customer Request Views
# ────────────────────────────────────────────────────────


class CustomerRequestListCreateView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        requests_qs = (
            Request.objects.filter(customer=request.user)
            .select_related("car", "car__owner", "customer")
            .prefetch_related("car__images")
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            requests_qs = requests_qs.filter(status=status_filter)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(requests_qs, request)
        serializer = RequestListSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = RequestCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        requested_car = serializer.validated_data["car"]
        requested_type = serializer.validated_data["request_type"]

        try:
            with transaction.atomic():
                requested_car = Car.objects.select_for_update().get(id=requested_car.id)
                serializer.validated_data["car"] = requested_car

                duplicate_exists = Request.objects.filter(
                    car=requested_car,
                    customer=request.user,
                    request_type=requested_type,
                    status__in=ACTIVE_REQUEST_STATUSES,
                ).exists()
                if duplicate_exists:
                    return Response(
                        {"detail": "You already have an active request for this car."},
                        status=status.HTTP_409_CONFLICT,
                    )

                if requested_type == ListingType.RENT:
                    overlap_detail = find_rental_overlap_conflict(
                        requested_car.id,
                        serializer.validated_data.get("start_date"),
                        serializer.validated_data.get("duration_days"),
                    )
                    if overlap_detail:
                        return Response(
                            {"start_date": overlap_detail},
                            status=status.HTTP_409_CONFLICT,
                        )

                req = serializer.save(customer=request.user)
                RequestStatusEvent.objects.create(
                    request=req,
                    from_status="",
                    to_status=RequestStatus.PENDING,
                    actor=request.user,
                    note="Request created",
                )
                schedule_notification(
                    notify_new_request,
                    lambda req_id=req.id: request_detail_queryset().get(id=req_id),
                )

        except IntegrityError:
            duplicate_exists = Request.objects.filter(
                car=requested_car,
                customer=request.user,
                request_type=requested_type,
                status__in=ACTIVE_REQUEST_STATUSES,
            ).exists()
            if not duplicate_exists:
                raise
            return Response(
                {"detail": "You already have an active request for this car."},
                status=status.HTTP_409_CONFLICT,
            )

        detail = request_detail_queryset().get(id=req.id)
        return Response(
            RequestDetailSerializer(detail, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CustomerRequestDetailView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request, request_id):
        try:
            req = request_detail_queryset().get(id=request_id, customer=request.user)
        except Request.DoesNotExist:
            return Response(
                {"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(RequestDetailSerializer(req, context={"request": request}).data)


class CustomerRequestCancelView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, request_id):
        with transaction.atomic():
            try:
                req = Request.objects.select_for_update().get(
                    id=request_id, customer=request.user
                )
            except Request.DoesNotExist:
                return Response(
                    {"detail": "Request not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if req.status not in (RequestStatus.PENDING, RequestStatus.APPROVED):
                return Response(
                    {"detail": f"Cannot cancel a request with status '{req.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            old_status = req.status
            req.status = RequestStatus.CANCELLED
            req.save(update_fields=["status", "updated_at"])
            RequestStatusEvent.objects.create(
                request=req,
                from_status=old_status,
                to_status=RequestStatus.CANCELLED,
                actor=request.user,
                note="Request cancelled by customer",
            )
            schedule_notification(
                notify_request_cancelled,
                lambda req_id=req.id: Request.objects.select_related(
                    "car__owner", "customer"
                ).get(id=req_id),
            )

        return Response({"detail": "Request cancelled."})


# ────────────────────────────────────────────────────────
# Owner Request Views
# ────────────────────────────────────────────────────────


class OwnerRequestListView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        requests_qs = (
            Request.objects.filter(car__owner=request.user)
            .select_related("car", "car__owner", "customer")
            .prefetch_related("car__images")
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            requests_qs = requests_qs.filter(status=status_filter)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(requests_qs, request)
        serializer = RequestListSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)


class OwnerRequestDetailView(APIView):
    permission_classes = [IsOwner]

    def get(self, request, request_id):
        try:
            req = request_detail_queryset().get(id=request_id, car__owner=request.user)
        except Request.DoesNotExist:
            return Response(
                {"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(RequestDetailSerializer(req, context={"request": request}).data)


class OwnerRequestActionView(APIView):
    permission_classes = [IsOwner]

    VALID_TRANSITIONS = {
        "approve": (RequestStatus.PENDING, RequestStatus.APPROVED),
        "reject": (RequestStatus.PENDING, RequestStatus.REJECTED),
        "mark_active": (RequestStatus.PAID, RequestStatus.ACTIVE),
        "complete": (RequestStatus.ACTIVE, RequestStatus.COMPLETED),
    }

    def post(self, request, request_id):
        serializer = RequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        note = serializer.validated_data.get("note", "")

        transition = self.VALID_TRANSITIONS.get(action)
        if not transition:
            return Response(
                {"detail": f"Unknown action '{action}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_status, new_status = transition
        with transaction.atomic():
            try:
                req = (
                    Request.objects.select_for_update()
                    .select_related("car")
                    .get(id=request_id, car__owner=request.user)
                )
            except Request.DoesNotExist:
                return Response(
                    {"detail": "Request not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if req.status != required_status:
                return Response(
                    {
                        "detail": (
                            f"Cannot '{action}' - request is '{req.status}', "
                            f"must be '{required_status}'."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if action == "approve":
                Car.objects.select_for_update().only("id").get(id=req.car_id)
                conflict_detail = find_request_approval_conflict(req)
                if conflict_detail:
                    return Response(
                        {"detail": conflict_detail},
                        status=status.HTTP_409_CONFLICT,
                    )

            old_status = req.status
            req.status = new_status
            if note:
                req.owner_note = note
            req.save(update_fields=["status", "owner_note", "updated_at"])
            is_buy = req.request_type == "buy"
            default_notes = {
                "approve": "Request approved by owner",
                "reject": "Request rejected by owner",
                "mark_active": (
                    "Ownership transferred — purchase is now active"
                    if is_buy
                    else "Car handed over — rental is now active"
                ),
                "complete": (
                    "Purchase completed — car sold"
                    if is_buy
                    else "Rental completed — car returned"
                ),
            }
            RequestStatusEvent.objects.create(
                request=req,
                from_status=old_status,
                to_status=new_status,
                actor=request.user,
                note=note or default_notes.get(action, ""),
            )

            # Auto-archive car when a buy request completes (car is sold)
            if action == "complete" and req.request_type == "buy":
                Car.objects.filter(id=req.car_id).update(status=CarStatus.ARCHIVED)

            notification_map = {
                "approve": notify_request_approved,
                "reject": notify_request_rejected,
                "mark_active": notify_rental_active,
                "complete": notify_rental_completed,
            }
            schedule_notification(
                notification_map[action],
                lambda req_id=req.id: request_detail_queryset().get(id=req_id),
            )

        detail = request_detail_queryset().get(id=req.id)
        return Response(
            RequestDetailSerializer(detail, context={"request": request}).data
        )


class AdminCarListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        cars = (
            Car.objects.select_related("owner__owner_profile", "brand")
            .prefetch_related("images")
            # Annotate availability so the serializer doesn't run per-car request
            # queries (N+1) computing each card's status.
            .annotate(_is_sold=sold_annotation(), **availability_annotations())
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            cars = cars.filter(status=status_filter)

        search = request.query_params.get("search")
        if search:
            cars = cars.filter(
                Q(title__icontains=search)
                | Q(brand__name__icontains=search)
                | Q(model__icontains=search)
                | Q(owner__first_name__icontains=search)
                | Q(owner__last_name__icontains=search)
                | Q(country__icontains=search)
                | Q(state__icontains=search)
                | Q(city__icontains=search)
            )

        listing_type = request.query_params.get("listing_type")
        if listing_type:
            cars = cars.filter(listing_type=listing_type)

        state = request.query_params.get("state")
        if state:
            cars = cars.filter(state__icontains=state)

        ordering = request.query_params.get("ordering", "-created_at")
        if ordering not in {"created_at", "-created_at"}:
            ordering = "-created_at"
        cars = cars.order_by(ordering)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(cars, request)
        serializer = CarListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class AdminCarDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, car_id):
        try:
            car = (
                Car.objects.select_related("owner__owner_profile", "brand")
                .prefetch_related("images", "features")
                .get(id=car_id)
            )
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(CarDetailSerializer(car, context={"request": request}).data)


class AdminCarStatusView(APIView):
    permission_classes = [IsStaff]

    ADMIN_TRANSITIONS = {
        ("draft", "needs_changes"),
        ("inspection_pending", "suspended"),
        ("needs_changes", "suspended"),
        ("published", "suspended"),
        ("suspended", "published"),
    }

    def post(self, request, car_id):
        new_status = request.data.get("status")
        if not new_status:
            return Response(
                {"detail": "Status is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(id=car_id)
            except Car.DoesNotExist:
                return Response(
                    {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
                )

            if (car.status, new_status) not in self.ADMIN_TRANSITIONS:
                return Response(
                    {
                        "detail": (
                            f"Cannot transition from '{car.status}' to '{new_status}'."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Reinstating restores the pre-suspension status — publishing
            # unconditionally would let a never-inspected car go live.
            if car.status == CarStatus.SUSPENDED:
                last_suspension = (
                    car.status_history.filter(to_status=CarStatus.SUSPENDED)
                    .order_by("-created_at")
                    .first()
                )
                prior = last_suspension.from_status if last_suspension else ""
                if prior == CarStatus.NEEDS_CHANGES:
                    new_status = CarStatus.NEEDS_CHANGES
                elif prior == CarStatus.INSPECTION_PENDING:
                    # The booking was cancelled on suspension — back to bookable
                    new_status = CarStatus.LISTING_APPROVED
                # anything else (published or unknown) → published

            # Suspending mid-booking would strand a PENDING booking that
            # keeps consuming slot capacity — release it.
            if (
                new_status == CarStatus.SUSPENDED
                and car.status == CarStatus.INSPECTION_PENDING
            ):
                InspectionBooking.objects.filter(
                    car=car, status__in=ACTIVE_BOOKING_STATUSES
                ).update(status=BookingStatus.CANCELLED)

            note = request.data.get("note", "")
            extra = ["admin_note"]
            if note:
                car.admin_note = note
            elif new_status == CarStatus.NEEDS_CHANGES:
                # Never let a stale note leak into the owner notification
                car.admin_note = ""
            if new_status == CarStatus.PUBLISHED:
                car.published_at = timezone.now()
                car.admin_note = ""  # Clear note on publish
                extra.append("published_at")
            record_status_change(
                car,
                new_status,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                note=note,
                extra_update_fields=extra,
                request=request,
            )
            notification_map = {
                CarStatus.SUSPENDED: notify_listing_suspended,
                CarStatus.NEEDS_CHANGES: notify_changes_requested,
            }
            notify_func = notification_map.get(new_status)
            if notify_func:
                schedule_notification(
                    notify_func,
                    lambda car_id=car.id: Car.objects.select_related("owner", "brand").get(
                        id=car_id
                    ),
                )

        car = (
            Car.objects.select_related("owner__owner_profile", "brand")
            .prefetch_related("images", "features")
            .get(id=car_id)
        )
        return Response(CarDetailSerializer(car, context={"request": request}).data)


class TransactionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get the queryset
        qs = Transaction.objects.select_related(
            "request",
            "request__car",
            "inspection_booking",
            "inspection_booking__car",
            "payer",
            "receiver",
        )
        if not request.user.is_staff:
            if request.user.role == "customer":
                qs = qs.filter(payer=request.user)
            elif request.user.role == "owner":
                # Owners receive rental/sale money and pay inspection fees.
                qs = qs.filter(Q(receiver=request.user) | Q(payer=request.user))

            else:
                return Response(
                    {
                        "detail": "Transaction are only available to customers and owners"
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = TransactionListSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transaction_id):

        try:
            txn = (
                Transaction.objects.select_related(
                    "request",
                    "request__car",
                    "request__car__owner",
                    "payer",
                    "receiver",
                )
                .prefetch_related(
                    "request__car__images",
                    "request__car__features",
                    "request__status_events",
                )
                .get(id=transaction_id)
            )

        except Transaction.DoesNotExist:
            return Response(
                {"detail": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND
            )
        # Staff can see any transaction, others must be payer or receiver
        if not request.user.is_staff and request.user not in (txn.payer, txn.receiver):
            return Response(
                {"detail": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            TransactionDetailSerializer(txn, context={"request": request}).data
        )


class CustomerPaymentSubmitView(APIView):
    permission_classes = [IsCustomer]
    parser_classes = [MultiPartParser]

    def post(self, request, request_id):
        method = request.data.get("payment_method", "transfer")
        receipt = request.FILES.get("receipt")

        ALLOWED_RECEIPT_TYPES = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
        ]
        # Validate payment method
        if method not in ("transfer", "card"):
            return Response(
                {"detail": "Invalid payment method. Must be 'transfer' or 'card'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Receipt required for bank transfers
        if method == "transfer" and not receipt:
            return Response(
                {"detail": "Payment receipt is required for bank transfers."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if receipt and receipt.content_type not in ALLOWED_RECEIPT_TYPES:
            return Response(
                {"detail": "Receipt must be a JPG, PNG, WebP, or PDF file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 5MB)
        if receipt and receipt.size > 5 * 1024 * 1024:
            return Response(
                {"detail": "Receipt file must be 5MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                req = Request.objects.select_for_update().get(
                    id=request_id, customer=request.user
                )
            except Request.DoesNotExist:
                return Response(
                    {"detail": "Request not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if req.status != RequestStatus.APPROVED:
                return Response(
                    {"detail": "Payment can only be submitted for approved requests."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            req.status = RequestStatus.PAYMENT_SUBMITTED
            req.payment_method_choice = method
            if receipt:
                req.payment_receipt = receipt
            req.save(
                update_fields=[
                    "status",
                    "payment_method_choice",
                    "payment_receipt",
                    "updated_at",
                ]
            )

            RequestStatusEvent.objects.create(
                request=req,
                from_status=RequestStatus.APPROVED,
                to_status=RequestStatus.PAYMENT_SUBMITTED,
                actor=request.user,
                note=f"Payment submitted via {method}",
            )
            schedule_notification(
                notify_payment_submitted,
                lambda req_id=req.id: request_detail_queryset().get(id=req_id),
            )

        detail = request_detail_queryset().get(id=req.id)
        return Response(
            RequestDetailSerializer(detail, context={"request": request}).data,
        )


class AdminRequestListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        qs = Request.objects.select_related(
            "car", "car__owner", "customer"
        ).prefetch_related("car__images")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(car__title__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(car__owner__first_name__icontains=search)
                | Q(car__owner__last_name__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = RequestListSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)


class AdminRequestDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, request_id):
        try:
            req = request_detail_queryset().get(id=request_id)
        except Request.DoesNotExist:
            return Response(
                {"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(RequestDetailSerializer(req, context={"request": request}).data)


class StaffConfirmPaymentView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, request_id):
        with transaction.atomic():
            try:
                req = Request.objects.select_for_update().get(id=request_id)
            except Request.DoesNotExist:
                return Response(
                    {"detail": "Request not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if req.status != RequestStatus.PAYMENT_SUBMITTED:
                return Response(
                    {
                        "detail": f"Cannot confirm payment — request is '{req.status}', must be 'payment_submitted'."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            req.status = RequestStatus.PAID
            req.save(update_fields=["status", "updated_at"])

            # Re-fetch with relations for transaction creation
            req = Request.objects.select_related("car__owner", "customer").get(
                id=request_id
            )

            RequestStatusEvent.objects.create(
                request=req,
                from_status=RequestStatus.PAYMENT_SUBMITTED,
                to_status=RequestStatus.PAID,
                actor=request.user,
                note="Payment verified and confirmed by staff",
            )

            Transaction.objects.create(
                request=req,
                payer=req.customer,
                receiver=req.car.owner,
                amount=req.price_offered,
                currency=req.currency,
                transaction_type="rental" if req.request_type == "rent" else "purchase",
                payment_method=req.payment_method_choice or "manual",
                status="completed",
                reference=f"TXN-{uuid_lib.uuid4().hex[:12].upper()}",
            )

            # Auto-reject other pending/approved/payment_submitted requests
            # for the same car when a buy request is confirmed
            if req.request_type == "buy":
                competing = Request.objects.filter(
                    car_id=req.car_id,
                    status__in=[
                        RequestStatus.PENDING,
                        RequestStatus.APPROVED,
                        RequestStatus.PAYMENT_SUBMITTED,
                    ],
                ).exclude(id=req.id)
                for other in competing:
                    old = other.status
                    other.status = RequestStatus.REJECTED
                    other.save(update_fields=["status", "updated_at"])
                    RequestStatusEvent.objects.create(
                        request=other,
                        from_status=old,
                        to_status=RequestStatus.REJECTED,
                        actor=request.user,
                        note="Auto-rejected — car has been sold",
                    )
                    schedule_notification(
                        notify_auto_rejected,
                        lambda req_id=other.id: Request.objects.select_related(
                            "car", "customer"
                        ).get(id=req_id),
                    )

            schedule_notification(
                notify_payment_confirmed,
                lambda req_id=req.id: request_detail_queryset().get(id=req_id),
            )

        detail = request_detail_queryset().get(id=req.id)
        return Response(
            RequestDetailSerializer(detail, context={"request": request}).data,
        )


class AdminCarHistoryView(APIView):
    """Full status timeline for staff — includes owner clearance responses
    recorded as same-status annotation rows."""

    permission_classes = [IsStaff]

    def get(self, request, car_id):
        try:
            car = Car.objects.get(id=car_id)
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )
        history = car.status_history.select_related("actor").all()
        return Response(StaffCarStatusHistorySerializer(history, many=True).data)


class AdminCarStatusCountsView(APIView):
    """Aggregate car counts per status — the approvals dashboard KPIs.
    Counting a paginated list page undercounts; this asks the DB directly."""

    permission_classes = [IsStaff]

    def get(self, request):
        rows = Car.objects.values("status").annotate(n=Count("id"))
        return Response({row["status"]: row["n"] for row in rows})


class AdminApproveListingView(APIView):
    permission_classes = [IsStaff]

    APPROVABLE_STATUSES = [CarStatus.DRAFT, CarStatus.NEEDS_CHANGES]

    def post(self, request, car_id):
        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(id=car_id)
            except Car.DoesNotExist:
                return Response(
                    {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
                )

            if car.status not in self.APPROVABLE_STATUSES:
                return Response(
                    {"detail": (f"Cannot approve a listing in '{car.status}' status.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            record_status_change(
                car,
                CarStatus.LISTING_APPROVED,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                request=request,
            )

        schedule_notification(
            notify_listing_approved,
            lambda car_id=car.id: Car.objects.select_related("owner", "brand").get(id=car_id),
        )
        car = (
            Car.objects.select_related("owner__owner_profile", "brand")
            .prefetch_related("images", "features")
            .get(id=car_id)
        )
        return Response(CarDetailSerializer(car, context={"request": request}).data)
