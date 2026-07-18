from datetime import date, timedelta

from rest_framework import serializers
from django.utils import timezone

from .models import (
    Car,
    CarImage,
    CarStatus,
    Currency,
    ListingFeature,
    ListingType,
    Request,
    RequestStatus,
    RequestStatusEvent,
    Transaction,
)


def _latest_passed_inspection(car):
    """The car's most recent passed physical inspection, or None.

    Uses the view's `_passed_inspections` prefetch when present (no N+1); falls
    back to a query for single-object views that don't prefetch. Uses the string
    "passed" rather than importing InspectionResult to avoid an import cycle.
    """
    passed = getattr(car, "_passed_inspections", None)
    if passed is not None:
        return passed[0] if passed else None
    return (
        car.physical_inspections.filter(result="passed")
        .order_by("-inspected_at")
        .first()
    )


class CarImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = CarImage
        fields = ["id", "image", "thumbnail", "image_type", "is_primary", "created_at"]
        read_only_fields = fields

    def _absolute_file_url(self, file):
        if not file:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(file.url)
        return file.url

    def get_image(self, obj):
        return self._absolute_file_url(obj.image)

    def get_thumbnail(self, obj):
        return self._absolute_file_url(obj.thumbnail)


class ListingFeatureSerializer(serializers.ModelSerializer):

    class Meta:
        model = ListingFeature
        fields = ["id", "name", "value", "sort_order"]
        read_only_fields = ["id"]


class CarOwnerSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    date_joined = serializers.DateTimeField()
    is_verified = serializers.SerializerMethodField()

    def get_is_verified(self, obj):
        owner_profile = getattr(obj, "owner_profile", None)
        return owner_profile.is_verified if owner_profile else False


class CarOwnerSerializer(CarOwnerSummarySerializer):
    listing_count = serializers.SerializerMethodField()

    def get_listing_count(self, obj):
        return obj.cars.count()


class CarListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    owner = CarOwnerSummarySerializer(read_only=True)
    availability_status = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            "id",
            "title",
            "listing_type",
            "rent_price_per_day",
            "sale_price",
            "currency",
            "brand",
            "model",
            "year",
            "body_type",
            "state",
            "city",
            "status",
            "owner",
            "primary_image",
            "availability_status",
            "created_at",
            "availability_status",
            "is_verified",
            "created_at",
        ]

    def get_is_verified(self, obj):
        return _latest_passed_inspection(obj) is not None

    def get_primary_image(self, obj):
        # prefetch related("images") should be used in view
        images = obj.images.all()
        primary = next((img for img in images if img.is_primary), None)
        if primary is None and images:
            primary = images[0]

        if primary:
            image = primary.thumbnail or primary.image
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(image.url)
            return image.url
        return None

    def get_availability_status(self, obj):
        if obj.status == CarStatus.ARCHIVED:
            # "Sold" only when a purchase actually completed; an owner can
            # archive (withdraw) a listing that was never sold.
            is_sold = getattr(obj, "_is_sold", None)
            if is_sold is None:
                is_sold = obj.requests.filter(
                    request_type=ListingType.BUY,
                    status=RequestStatus.COMPLETED,
                ).exists()
            return "sold" if is_sold else "archived"

        has_buy_in_progress = getattr(obj, "_has_buy_in_progress", None)
        has_active_current_rental = getattr(obj, "_has_active_current_rental", None)
        has_reserved_future_rental = getattr(obj, "_has_reserved_future_rental", None)
        if has_buy_in_progress is not None:
            if has_buy_in_progress:
                return "reserved"
            if has_active_current_rental:
                return "rented"
            if has_reserved_future_rental:
                return "reserved"
            return "available"

        in_progress = getattr(obj, "_in_progress_requests", None)
        if in_progress is None:
            in_progress = obj.requests.filter(
                status__in=[
                    RequestStatus.APPROVED,
                    RequestStatus.PAYMENT_SUBMITTED,
                    RequestStatus.PAID,
                    RequestStatus.ACTIVE,
                ],
            )

        today = date.today()
        for req in in_progress:
            # Buy request in progress → reserved (car is off the market)
            if req.request_type == "buy":
                return "reserved"
            # Active rental currently in period → rented
            if (
                req.status == RequestStatus.ACTIVE
                and req.start_date
                and req.duration_days
            ):
                end = req.start_date + timedelta(days=req.duration_days)
                if req.start_date <= today < end:
                    return "rented"
            # Future rental bookings → still "available" (other dates are open)
            # The calendar shows blocked dates, overlap check prevents conflicts

        return "available"


class CarDetailSerializer(serializers.ModelSerializer):
    owner = CarOwnerSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    images = CarImageSerializer(many=True, read_only=True)
    features = ListingFeatureSerializer(many=True, read_only=True)
    availability_status = serializers.SerializerMethodField()
    booked_periods = serializers.SerializerMethodField()
    available_from = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    mileage = serializers.SerializerMethodField()
    fuel_type = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()
    verified_report = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            "id",
            "title",
            "listing_type",
            "rent_price_per_day",
            "sale_price",
            "currency",
            "brand",
            "model",
            "color",
            "year",
            "body_type",
            "transmission",
            "fuel_type",
            "seats",
            "mileage",
            "country",
            "state",
            "city",
            "description",
            "status",
            "tracking_id",
            "admin_note",
            "published_at",
            "created_at",
            "updated_at",
            "owner",
            "primary_image",
            "images",
            "features",
            "availability_status",
            "booked_periods",
            "available_from",
            "features",
            "is_verified",
            "verified_report",
            "availability_status",
        ]
        read_only_fields = ["id"]

    def get_primary_image(self, obj):
        return CarListSerializer(context=self.context).get_primary_image(obj)

    def _get_booked_requests(self, obj):
        """Get booked requests — use prefetched if available."""
        booked = getattr(obj, "_booked_requests", None)
        if booked is None:
            booked = obj.requests.filter(
                request_type="rent",
                status__in=[
                    RequestStatus.APPROVED,
                    RequestStatus.PAYMENT_SUBMITTED,
                    RequestStatus.PAID,
                    RequestStatus.ACTIVE,
                ],
            )
        return booked

    def get_availability_status(self, obj):
        if obj.status == CarStatus.ARCHIVED:
            # "Sold" only when a purchase actually completed; an owner can
            # archive (withdraw) a listing that was never sold.
            is_sold = getattr(obj, "_is_sold", None)
            if is_sold is None:
                is_sold = obj.requests.filter(
                    request_type=ListingType.BUY,
                    status=RequestStatus.COMPLETED,
                ).exists()
            return "sold" if is_sold else "archived"

        has_buy_in_progress = getattr(obj, "_has_buy_in_progress", None)
        has_active_current_rental = getattr(obj, "_has_active_current_rental", None)
        has_reserved_future_rental = getattr(obj, "_has_reserved_future_rental", None)
        if has_buy_in_progress is not None:
            if has_buy_in_progress:
                return "reserved"
            if has_active_current_rental:
                return "rented"
            if has_reserved_future_rental:
                return "reserved"
            return "available"

        # Also check buy requests in progress
        buy_in_progress = getattr(obj, "_buy_in_progress", None)
        if buy_in_progress is None:
            buy_in_progress = obj.requests.filter(
                request_type="buy",
                status__in=[
                    RequestStatus.APPROVED,
                    RequestStatus.PAYMENT_SUBMITTED,
                    RequestStatus.PAID,
                    RequestStatus.ACTIVE,
                ],
            ).exists()
        if buy_in_progress:
            return "reserved"

        today = date.today()
        for req in self._get_booked_requests(obj):
            # Active rental currently in period → rented
            if (
                req.status == RequestStatus.ACTIVE
                and req.start_date
                and req.duration_days
            ):
                end = req.start_date + timedelta(days=req.duration_days)
                if req.start_date <= today < end:
                    return "rented"
            # Future rental bookings → still "available" (other dates are open)

        return "available"

    def get_booked_periods(self, obj):
        if obj.status == CarStatus.ARCHIVED:
            return []

        periods = []
        for req in self._get_booked_requests(obj):
            if req.start_date and req.duration_days:
                periods.append(
                    {
                        "start_date": req.start_date.isoformat(),
                        "end_date": (
                            req.start_date + timedelta(days=req.duration_days)
                        ).isoformat(),
                        "status": req.status,
                    }
                )
        periods.sort(key=lambda p: p["start_date"])
        return periods

    def get_available_from(self, obj):
        if obj.status == CarStatus.ARCHIVED:
            return None

        today = date.today()
        latest_end = None
        for req in self._get_booked_requests(obj):
            if req.start_date and req.duration_days:
                end = req.start_date + timedelta(days=req.duration_days)
                if end > today:
                    if latest_end is None or end > latest_end:
                        latest_end = end

        if latest_end is None:
            return None
        return latest_end.isoformat()

    def _verified_source(self, obj):
        """Inspection that overrides owner input — ONLY in public context, so the
        owner keeps seeing their own values on their own pages."""
        if not self.context.get("public"):
            return None
        return _latest_passed_inspection(obj)

    def get_description(self, obj):
        insp = self._verified_source(obj)
        if insp and insp.staff_notes:
            return insp.staff_notes
        return obj.description

    def get_mileage(self, obj):
        insp = self._verified_source(obj)
        return insp.mileage if insp else obj.mileage

    def get_fuel_type(self, obj):
        insp = self._verified_source(obj)
        return insp.fuel_type if insp else obj.fuel_type

    def get_is_verified(self, obj):
        return _latest_passed_inspection(obj) is not None

    def get_verified_report(self, obj):
        insp = _latest_passed_inspection(obj)
        if not insp:
            return None
        # NOTE: deliberately excludes presented_id_* and inspector identity —
        # the verified report is public and must never leak those.
        return {
            "condition": insp.condition,
            "car_type": insp.car_type,
            "mileage": insp.mileage,
            "fuel_type": insp.fuel_type,
            "features": insp.features,
            "engine_condition": insp.engine_condition,
            "chassis_condition": insp.chassis_condition,
            "ac_condition": insp.ac_condition,
            "is_flooded": insp.is_flooded,
            "has_accident_history": insp.has_accident_history,
            "notes": insp.staff_notes,
            "inspected_at": insp.inspected_at,
        }


class CarCreateSerializer(serializers.ModelSerializer):
    features = ListingFeatureSerializer(many=True, required=False)
    MIN_MODEL_YEAR = 1900
    MAX_SEATS = 60

    class Meta:
        model = Car
        fields = [
            "title",
            "listing_type",
            "rent_price_per_day",
            "sale_price",
            "currency",
            "brand",
            "model",
            "color",
            "year",
            "body_type",
            "transmission",
            "fuel_type",
            "seats",
            "mileage",
            "country",
            "state",
            "city",
            "description",
            "features",
        ]

    def validate(self, data):
        listing_type = data.get("listing_type")
        rent_price = data.get("rent_price_per_day")
        sale_price = data.get("sale_price")

        if self.instance is not None:
            if "listing_type" not in data:
                listing_type = self.instance.listing_type
            if "rent_price_per_day" not in data:
                rent_price = self.instance.rent_price_per_day
            if "sale_price" not in data:
                sale_price = self.instance.sale_price

        if listing_type in ("rent", "both") and rent_price is None:
            raise serializers.ValidationError(
                {"rent_price_per_day": "Required for rent or both listing type."}
            )
        if listing_type in ("buy", "both") and sale_price is None:
            raise serializers.ValidationError(
                {"sale_price": "Required for buy or both listing type."}
            )
        return data

    def validate_year(self, value):
        max_year = timezone.now().year + 1
        if value < self.MIN_MODEL_YEAR or value > max_year:
            raise serializers.ValidationError(
                f"Year must be between {self.MIN_MODEL_YEAR} and {max_year}."
            )
        return value

    def validate_seats(self, value):
        if value < 1:
            raise serializers.ValidationError("Seats must be at least 1.")
        if value > self.MAX_SEATS:
            raise serializers.ValidationError(
                f"Seats must be {self.MAX_SEATS} or fewer."
            )
        return value

    def create(self, validated_data):
        features_data = validated_data.pop("features", [])
        car = Car.objects.create(**validated_data)
        for feature in features_data:
            ListingFeature.objects.create(car=car, **feature)
        return car

    def update(self, instance, validated_data):
        features_data = validated_data.pop("features", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if features_data is not None:
            # Replace all features with new set
            instance.features.all().delete()
            for feature in features_data:
                ListingFeature.objects.create(car=instance, **feature)
        return instance

    def validate_title(self, value):
        return value.title()


class CarImageUploadSerializer(serializers.Serializer):
    front = serializers.ImageField(required=False)
    back = serializers.ImageField(required=False)
    left_side = serializers.ImageField(required=False)
    right_side = serializers.ImageField(required=False)
    interior = serializers.ImageField(required=False)


# ---------- Request serializers ----------


class RequestCarSummarySerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    owner = CarOwnerSummarySerializer(read_only=True)

    class Meta:
        model = Car
        fields = ["id", "title", "brand", "model", "year", "primary_image", "owner"]

    def get_primary_image(self, obj):
        images = obj.images.all()
        primary = next((img for img in images if img.is_primary), None)
        if primary is None and images:
            primary = images[0]
        if primary:
            image = primary.thumbnail or primary.image
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(image.url)
            return image.url
        return None


class RequestCustomerSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class RequestStatusEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = RequestStatusEvent
        fields = ["id", "from_status", "to_status", "actor_name", "note", "created_at"]

    def get_actor_name(self, obj):
        return f"{obj.actor.first_name} {obj.actor.last_name}"


class RequestListSerializer(serializers.ModelSerializer):
    car = RequestCarSummarySerializer(read_only=True)
    customer = RequestCustomerSerializer(read_only=True)

    class Meta:
        model = Request
        fields = [
            "id",
            "car",
            "customer",
            "request_type",
            "price_offered",
            "currency",
            "duration_days",
            "start_date",
            "status",
            "created_at",
        ]


class RequestDetailSerializer(serializers.ModelSerializer):
    car = CarDetailSerializer(read_only=True)
    customer = RequestCustomerSerializer(read_only=True)
    status_events = RequestStatusEventSerializer(many=True, read_only=True)

    class Meta:
        model = Request
        fields = [
            "id",
            "car",
            "customer",
            "request_type",
            "price_offered",
            "currency",
            "duration_days",
            "start_date",
            "message",
            "status",
            "owner_note",
            "payment_method_choice",
            "payment_receipt",
            "created_at",
            "updated_at",
            "status_events",
        ]


class RequestCreateSerializer(serializers.ModelSerializer):
    MAX_RENTAL_DAYS = 365

    class Meta:
        model = Request
        fields = [
            "car",
            "request_type",
            "price_offered",
            "duration_days",
            "start_date",
            "message",
        ]

    def validate_car(self, value):
        from .models import CarStatus

        if value.status != CarStatus.PUBLISHED:
            raise serializers.ValidationError("This car is not available for requests.")
        return value

    def validate_request_type(self, value):
        if value == "both":
            raise serializers.ValidationError(
                "Request type must be 'rent' or 'buy', not 'both'."
            )
        return value

    def validate_price_offered(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price offered must be greater than 0.")
        return value

    def validate(self, data):
        car = data.get("car")
        request = self.context.get("request")

        if request and car and car.owner == request.user:
            raise serializers.ValidationError(
                {"car": "You cannot request your own car."}
            )

        request_type = data.get("request_type")
        if car and request_type and car.listing_type != ListingType.BOTH:
            if request_type != car.listing_type:
                raise serializers.ValidationError(
                    {
                        "request_type": (
                            "This listing only accepts "
                            f"{car.get_listing_type_display().lower()} requests."
                        )
                    }
                )

        if request_type == ListingType.RENT:
            duration_days = data.get("duration_days")
            start_date = data.get("start_date")

            if not duration_days:
                raise serializers.ValidationError(
                    {"duration_days": "Duration is required for rental requests."}
                )
            if duration_days < 1:
                raise serializers.ValidationError(
                    {"duration_days": "Duration must be at least 1 day."}
                )
            if duration_days > self.MAX_RENTAL_DAYS:
                raise serializers.ValidationError(
                    {
                        "duration_days": (
                            f"Duration cannot exceed {self.MAX_RENTAL_DAYS} days."
                        )
                    }
                )
            if not start_date:
                raise serializers.ValidationError(
                    {"start_date": "Start date is required for rental requests."}
                )
            if start_date < timezone.localdate():
                raise serializers.ValidationError(
                    {"start_date": "Start date cannot be in the past."}
                )

            # Check for overlapping bookings
            if duration_days and start_date:
                new_end = start_date + timedelta(days=duration_days)
                blocking_rentals = Request.objects.filter(
                    car=car,
                    request_type="rent",
                    status__in=[
                        RequestStatus.APPROVED,
                        RequestStatus.PAYMENT_SUBMITTED,
                        RequestStatus.PAID,
                        RequestStatus.ACTIVE,
                    ],
                ).only("start_date", "duration_days")

                for existing in blocking_rentals:
                    if existing.start_date and existing.duration_days:
                        existing_end = existing.start_date + timedelta(
                            days=existing.duration_days
                        )
                        if start_date < existing_end and existing.start_date < new_end:
                            raise serializers.ValidationError(
                                {
                                    "start_date": (
                                        f"This car is already booked from "
                                        f"{existing.start_date.isoformat()} to "
                                        f"{existing_end.isoformat()}. "
                                        f"Please pick different dates."
                                    )
                                }
                            )

        return data

    def create(self, validated_data):
        car = validated_data["car"]
        return Request.objects.create(
            currency=car.currency or Currency.NGN,
            **validated_data,
        )


class RequestActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["approve", "reject", "mark_active", "complete"]
    )
    note = serializers.CharField(required=False, allow_blank=True, default="")


class TransactionListSerializer(serializers.ModelSerializer):
    car_detail = serializers.SerializerMethodField()
    payer_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    request_type = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "currency",
            "transaction_type",
            "payment_method",
            "car_detail",
            "payer_name",
            "receiver_name",
            "request_type",
            "status",
            "reference",
            "created_at",
        ]

    def get_car_detail(self, obj):

        return obj.request.car.title

    def get_payer_name(self, obj: Transaction):
        first_name = obj.payer.first_name
        last_name = obj.payer.last_name
        return f"{first_name} {last_name}"

    def get_receiver_name(self, obj: Transaction):
        first_name = obj.receiver.first_name
        last_name = obj.receiver.last_name
        return f" {first_name} {last_name}"

    def get_request_type(self, obj: Transaction):

        return obj.request.request_type


class TransactionDetailSerializer(serializers.ModelSerializer):
    car_detail = serializers.SerializerMethodField()
    payer_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    request_type = serializers.SerializerMethodField()
    request = RequestDetailSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "currency",
            "transaction_type",
            "payment_method",
            "car_detail",
            "payer_name",
            "receiver_name",
            "request_type",
            "request",
            "status",
            "reference",
            "created_at",
        ]

    def get_car_detail(self, obj):
        return obj.request.car.title

    def get_payer_name(self, obj: Transaction):
        first_name = obj.payer.first_name
        last_name = obj.payer.last_name
        return f" {first_name} {last_name}"

    def get_receiver_name(self, obj: Transaction):
        first_name = obj.receiver.first_name
        last_name = obj.receiver.last_name
        return f"{first_name} {last_name}"

    def get_request_type(self, obj: Transaction):

        return obj.request.request_type
