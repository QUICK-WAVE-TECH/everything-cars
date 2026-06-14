from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Prefetch
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser
from common.pagination import StandardPagination
from common.permissions import IsOwner, IsCustomer, IsStaff
from .models import (
    ACTIVE_REQUEST_STATUSES,
    Car,
    CarImage,
    CarStatus,
    ListingType,
    Request,
    RequestStatus,
    RequestStatusEvent,
    Transaction,
)
from .serializers import (
    CarListSerializer,
    CarDetailSerializer,
    CarCreateSerializer,
    CarImageUploadSerializer,
    CarImageSerializer,
    RequestListSerializer,
    RequestDetailSerializer,
    RequestCreateSerializer,
    RequestActionSerializer,
)


MAX_CAR_IMAGES_PER_REQUEST = 10
MAX_CAR_IMAGES_PER_CAR = 20
MAX_CAR_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
REQUEST_APPROVAL_BLOCKING_STATUSES = [
    RequestStatus.APPROVED,
    RequestStatus.PAID,
    RequestStatus.ACTIVE,
]


def car_has_active_requests(car_id):
    return Request.objects.filter(
        car_id=car_id,
        status__in=ACTIVE_REQUEST_STATUSES,
    ).exists()


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

    rent_conflicts = competing_requests.filter(request_type=ListingType.RENT).only(
        "id",
        "start_date",
        "duration_days",
    )
    for existing_request in rent_conflicts:
        if rental_dates_overlap(req, existing_request):
            return "This car already has an approved, paid, or active rental for those dates."

    return None


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
            .select_related("owner__owner_profile")
            .prefetch_related("images")
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

        serializer = CarCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            car = serializer.save(owner=request.user)

        car = (
            Car.objects.select_related("owner__owner_profile")
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
                Car.objects.select_related("owner__owner_profile")
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

            if car.status == CarStatus.ARCHIVED:
                return Response(
                    {"detail": "Archived cars cannot be updated."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            was_published = car.status == CarStatus.PUBLISHED
            serializer = CarCreateSerializer(car, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            car = serializer.save()

            if was_published:
                car.status = CarStatus.PENDING_REVIEW
                car.published_at = None
                car.save(update_fields=["status", "published_at", "updated_at"])

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

            if car_has_active_requests(car.id):
                return active_request_archive_response()

            car.status = CarStatus.ARCHIVED
            car.save(update_fields=["status", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CarImageUploadView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser]

    def post(self, request, car_id):
        files = request.FILES.getlist("images")
        if not files:
            return Response(
                {
                    "detail": "No images provided",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(files) > MAX_CAR_IMAGES_PER_REQUEST:
            return Response(
                {
                    "detail": (
                        f"You can upload up to {MAX_CAR_IMAGES_PER_REQUEST} "
                        "images at a time."
                    )
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

        upload_serializer = CarImageUploadSerializer(data={"images": files})
        upload_serializer.is_valid(raise_exception=True)
        files = upload_serializer.validated_data["images"]

        try:
            with transaction.atomic():
                car = Car.objects.select_for_update().get(id=car_id, owner=request.user)
                if car.status == CarStatus.ARCHIVED:
                    return Response(
                        {"detail": "Archived cars cannot receive new images."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                existing_image_count = car.images.count()
                if existing_image_count + len(files) > MAX_CAR_IMAGES_PER_CAR:
                    return Response(
                        {
                            "detail": (
                                f"A car can have up to {MAX_CAR_IMAGES_PER_CAR} images."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                has_existing_images = existing_image_count > 0
                created_images = []

                for i, file in enumerate(files):
                    image = CarImage.objects.create(
                        car=car,
                        image=file,
                        is_primary=(not has_existing_images and i == 0),
                    )
                    created_images.append(image)

                if car.status == CarStatus.PUBLISHED:
                    car.status = CarStatus.PENDING_REVIEW
                    car.published_at = None
                    car.save(update_fields=["status", "published_at", "updated_at"])
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
            Car.objects.filter(status=CarStatus.PUBLISHED)
            .select_related("owner__owner_profile")
            .prefetch_related("images")
        )

        # Basic filters
        listing_type = request.query_params.get("listing_type")
        if listing_type:
            cars = cars.filter(listing_type=listing_type)

        state = request.query_params.get("state")
        if state:
            cars = cars.filter(state__icontains=state)

        brand = request.query_params.get("brand")
        if brand:
            cars = cars.filter(brand__icontains=brand)

        search = request.query_params.get("search")
        if search:
            from django.db.models import Q

            cars = cars.filter(
                Q(title__icontains=search)
                | Q(brand__icontains=search)
                | Q(model__icontains=search)
            )

        paginator = StandardPagination()
        page = paginator.paginate_queryset(cars, request)
        serializer = CarListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class PublicCarDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, car_id):
        try:
            car = (
                Car.objects.select_related("owner__owner_profile")
                .prefetch_related("images", "features")
                .get(id=car_id, status=CarStatus.PUBLISHED)
            )
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car does not exist"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(CarDetailSerializer(car, context={"request": request}).data)


class MyCarStatusView(APIView):
    permission_classes = [IsOwner]

    OWNER_TRANSITIONS = {
        "draft": ["pending_review"],
        "pending_review": [],  # Only admin can transition from here
        "needs_changes": ["pending_review"],  # Owner fixes and resubmits
        "published": ["paused", "archived"],
        "paused": ["published", "archived"],
        "suspended": [],  # Only admin can transition from here
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

            if new_status == CarStatus.ARCHIVED and car_has_active_requests(car.id):
                return active_request_archive_response()

            car.status = new_status
            if new_status == CarStatus.PUBLISHED and not car.published_at:
                from django.utils import timezone

                car.published_at = timezone.now()
            if new_status == CarStatus.PENDING_REVIEW:
                car.admin_note = ""  # Clear admin note on resubmit
            car.save(
                update_fields=["status", "admin_note", "published_at", "updated_at"]
            )

        return Response(
            CarDetailSerializer(
                Car.objects.select_related("owner__owner_profile")
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

                req = serializer.save(customer=request.user)
                RequestStatusEvent.objects.create(
                    request=req,
                    from_status="",
                    to_status=RequestStatus.PENDING,
                    actor=request.user,
                    note="Request created",
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
        "confirm_payment": (RequestStatus.APPROVED, RequestStatus.PAID),
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
            RequestStatusEvent.objects.create(
                request=req,
                from_status=old_status,
                to_status=new_status,
                actor=request.user,
                note=note
                or {
                    "approve": "Request approved by owner",
                    "reject": "Request rejected by owner",
                    "confirm_payment": "Payment confirmed by owner",
                    "mark_active": "Car handed over — rental is now active",
                    "complete": "Rental completed — car returned",
                }.get(action, ""),
            )

            # Auto-create transaction on payment confirmation
            if action == "confirm_payment":
                import uuid as uuid_lib

                Transaction.objects.create(
                    request=req,
                    payer=req.customer,
                    receiver=request.user,
                    amount=req.price_offered,
                    currency=req.currency,
                    transaction_type=(
                        "rental" if req.request_type == "rent" else "purchase"
                    ),
                    payment_method="manual",
                    status="completed",
                    reference=f"TXN-{uuid_lib.uuid4().hex[:12].upper()}",
                )

        detail = request_detail_queryset().get(id=req.id)
        return Response(
            RequestDetailSerializer(detail, context={"request": request}).data
        )


class AdminCarListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        cars = Car.objects.select_related("owner__owner_profile").prefetch_related(
            "images"
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            cars = cars.filter(status=status_filter)

        search = request.query_params.get("search")
        if search:
            from django.db.models import Q

            cars = cars.filter(
                Q(title__icontains=search)
                | Q(brand__icontains=search)
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

        paginator = StandardPagination()
        page = paginator.paginate_queryset(cars, request)
        serializer = CarListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class AdminCarDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, car_id):
        try:
            car = (
                Car.objects.select_related("owner__owner_profile")
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
        ("pending_review", "published"),
        ("pending_review", "suspended"),
        ("pending_review", "needs_changes"),
        ("needs_changes", "published"),
        ("needs_changes", "suspended"),
        ("published", "suspended"),
        ("suspended", "published"),
    }

    def post(self, request, car_id):
        new_status = request.data.get("status")
        note = request.data.get("note", "")
        if not new_status:
            return Response(
                {"detail": "Status is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        if new_status == "needs_changes" and not note:
            return Response(
                {"detail": "A note is required when requesting changes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                car: Car = (
                    Car.objects.select_for_update()
                    .select_related("owner__owner_profile")
                    .prefetch_related("images", "features")
                    .get(id=car_id)
                )
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
            from django.utils import timezone

            car.status = new_status
            if new_status == CarStatus.PUBLISHED:
                car.published_at = timezone.now()
                car.admin_note = ""  # Clear note on publish
            elif new_status == CarStatus.NEEDS_CHANGES:
                car.admin_note = note
            car.save(
                update_fields=["status", "admin_note", "updated_at", "published_at"]
            )

        return Response(CarDetailSerializer(car, context={"request": request}).data)
