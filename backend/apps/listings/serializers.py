from rest_framework import serializers
from django.utils import timezone
from .models import (
    Car,
    CarImage,
    Currency,
    ListingFeature,
    ListingType,
    Request,
    RequestStatusEvent,
    Transaction,
)


class CarImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = CarImage
        fields = ["id", "image", "is_primary", "created_at"]
        read_only_fields = fields


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
    listing_count = serializers.SerializerMethodField()

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
            "created_at",
        ]

    def get_primary_image(self, obj):
        # prefetch related("images") should be used in view
        images = obj.images.all()
        primary = next((img for img in images if img.is_primary), None)
        if primary is None and images:
            primary = images[0]

        if primary:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        return None


class CarDetailSerializer(serializers.ModelSerializer):
    owner = CarOwnerSerializer(read_only=True)
    images = CarImageSerializer(many=True, read_only=True)
    features = ListingFeatureSerializer(many=True, read_only=True)

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
            "admin_note",
            "published_at",
            "created_at",
            "updated_at",
            "owner",
            "images",
            "features",
        ]


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
    images = serializers.ListField(
        child=serializers.ImageField(),
        allow_empty=False,
    )


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
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
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

        return data

    def create(self, validated_data):
        car = validated_data["car"]
        return Request.objects.create(
            currency=car.currency or Currency.NGN,
            **validated_data,
        )


class RequestActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["approve", "reject", "confirm_payment", "mark_active", "complete"]
    )
    note = serializers.CharField(required=False, allow_blank=True, default="")
