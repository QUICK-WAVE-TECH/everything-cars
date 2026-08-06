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
    vin = serializers.CharField(allow_null=True)
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
    can_relist = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id", "status", "agreed_amount", "currency",
            "created_at", "expires_at", "completed_at", "cancelled_at",
            "disputed_at",
            "car", "seller", "buyer", "viewer_role", "can_relist",
        ]
        read_only_fields = fields

    def get_viewer_role(self, deal):
        user = self.context["request"].user
        return "seller" if deal.seller_id == user.id else "buyer"

    def get_can_relist(self, deal):
        from .services import completed_deal_is_final

        user = self.context["request"].user
        return deal.buyer_id == user.id and completed_deal_is_final(deal)


class DisputePartySerializer(serializers.Serializer):
    name = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()
    phone = serializers.CharField()
    email = serializers.EmailField()

    def get_name(self, user):
        return user.get_full_name() or user.email

    def get_business_name(self, user):
        profile = getattr(user, "owner_profile", None)
        if profile and profile.owner_type == "fleet":
            return profile.fleet_name
        return ""


class DisputeCarSerializer(serializers.Serializer):
    title = serializers.CharField()
    subtitle = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()

    def get_subtitle(self, car):
        parts = []
        if car.year:
            parts.append(str(car.year))
        if car.mileage:
            parts.append(f"{car.mileage:,} km")
        if car.transmission:
            parts.append(car.get_transmission_display())
        location = car.city or car.state
        if location:
            parts.append(location)
        return " · ".join(parts)

    def get_primary_image(self, car):
        image = next((i for i in car.images.all() if i.is_primary), None)
        image = image or next(iter(car.images.all()), None)
        if not image:
            return None
        file = image.thumbnail or image.image
        request = self.context.get("request")
        return request.build_absolute_uri(file.url) if request else file.url


class DisputeDealSerializer(serializers.ModelSerializer):
    ref = serializers.SerializerMethodField()
    car = DisputeCarSerializer(read_only=True)
    buyer = DisputePartySerializer(read_only=True)
    seller = DisputePartySerializer(read_only=True)
    amount = serializers.DecimalField(
        source="agreed_amount", max_digits=14, decimal_places=2
    )
    dispute_status = serializers.CharField(source="dispute_state", read_only=True)
    resolution_note = serializers.CharField(source="dispute_resolution_note")
    resolved_at = serializers.DateTimeField(source="dispute_resolved_at")
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id", "ref", "car", "buyer", "seller", "amount", "currency",
            "created_at", "completed_at", "disputed_at", "dispute_reason",
            "dispute_status", "resolution_note", "resolved_at", "resolved_by_name",
        ]
        read_only_fields = fields

    def get_ref(self, deal):
        return f"DSP-{str(deal.id).replace('-', '')[:6].upper()}"

    def get_resolved_by_name(self, deal):
        by = deal.dispute_resolved_by
        return (by.get_full_name() or by.email) if by else ""
