from rest_framework import serializers

from .models import Deal


class DealPartySerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    business_name = serializers.SerializerMethodField()

    def get_business_name(self, user):
        profile = getattr(user, "owner_profile", None)
        if profile and profile.owner_type == "fleet":
            return profile.fleet_name
        return ""


class DealCarSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    primary_image = serializers.SerializerMethodField()

    def get_primary_image(self, car):
        image = next((i for i in car.images.all() if i.is_primary), None)
        image = image or next(iter(car.images.all()), None)
        if not image:
            return None
        file = image.thumbnail or image.image
        request = self.context.get("request")
        return request.build_absolute_uri(file.url) if request else file.url


class DealSerializer(serializers.ModelSerializer):
    car = DealCarSerializer(read_only=True)
    seller = DealPartySerializer(read_only=True)
    buyer = DealPartySerializer(read_only=True)
    viewer_role = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id", "status", "agreed_amount", "currency",
            "created_at", "expires_at", "completed_at", "cancelled_at",
            "car", "seller", "buyer", "viewer_role",
        ]
        read_only_fields = fields

    def get_viewer_role(self, deal):
        user = self.context["request"].user
        return "seller" if deal.seller_id == user.id else "buyer"
