from rest_framework import serializers
from .models import Car, CarImage, ListingFeature


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


class CarOwnerSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    is_verified = serializers.SerializerMethodField()

    def get_is_verified(self, obj):
        owner_profile = getattr(obj, "owner_profile", None)
        return owner_profile.is_verified if owner_profile else False


class CarListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    owner = CarOwnerSerializer(read_only=True)

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
            "published_at",
            "created_at",
            "updated_at",
            "owner",
            "images",
            "features",
        ]


class CarCreateSerializer(serializers.ModelSerializer):
    features = ListingFeatureSerializer(many=True, required=False)

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
