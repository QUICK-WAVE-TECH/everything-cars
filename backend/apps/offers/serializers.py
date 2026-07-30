from django.utils import timezone
from datetime import timedelta

from rest_framework import serializers

from apps.listings.models import CarStatus, ListingType
from .models import (
    ACTIVE_OFFER_STATUSES,
    MAX_OFFERS_PER_CAR,
    OFFER_TTL_HOURS,
    Offer,
    OfferStatus,
)


class OfferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ["id", "amount", "message"]
        read_only_fields = ["id"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Enter an amount greater than zero.")
        return value

    def validate(self, data):
        car = self.context["car"]
        user = self.context["request"].user

        if car.owner_id == user.id:
            raise serializers.ValidationError(
                {"detail": "You cannot make an offer on your own listing."}
            )
        if car.listing_type != ListingType.BUY or not car.is_negotiable:
            raise serializers.ValidationError(
                {"detail": "This listing does not accept offers."}
            )
        if car.status != CarStatus.PUBLISHED:
            raise serializers.ValidationError(
                {"detail": "This listing is not available."}
            )

        existing = Offer.objects.filter(car=car, customer=user)
        if existing.filter(status__in=ACTIVE_OFFER_STATUSES).exists():
            raise serializers.ValidationError(
                {"detail": "You already have an active offer on this vehicle."}
            )
        # Counts every offer ever made, including withdrawn and expired ones —
        # otherwise withdraw-and-resubmit would bypass the cap entirely.
        if existing.count() >= MAX_OFFERS_PER_CAR:
            raise serializers.ValidationError(
                {
                    "detail": (
                        f"You have reached the maximum of {MAX_OFFERS_PER_CAR} offers "
                        "on this vehicle."
                    )
                }
            )
        return data

    def create(self, validated_data):
        car = self.context["car"]
        return Offer.objects.create(
            car=car,
            customer=self.context["request"].user,
            currency=car.currency,
            expires_at=timezone.now() + timedelta(hours=OFFER_TTL_HOURS),
            **validated_data,
        )


class OfferCarSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    sale_price = serializers.DecimalField(max_digits=14, decimal_places=2)
    primary_image = serializers.SerializerMethodField()

    def get_primary_image(self, obj):
        image = next((i for i in obj.images.all() if i.is_primary), None)
        image = image or next(iter(obj.images.all()), None)
        if not image:
            return None
        file = image.thumbnail or image.image
        request = self.context.get("request")
        return request.build_absolute_uri(file.url) if request else file.url


class OfferSerializer(serializers.ModelSerializer):
    """Customer-facing. Carries NOTHING about the owner's private range."""

    car = OfferCarSummarySerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    resulting_deal = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            "id",
            "car",
            "amount",
            "currency",
            "message",
            "status",
            "counter_amount",
            "counter_message",
            "countered_at",
            "expires_at",
            "responded_at",
            "resulting_request",
            "resulting_deal",
            "is_expired",
            "created_at",
        ]
        read_only_fields = fields

    def get_resulting_deal(self, offer):
        deal = getattr(offer, "deal", None)
        return str(deal.id) if deal else None


class OfferRespondSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["accept", "reject", "counter"])
    counter_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False
    )
    message = serializers.CharField(max_length=400, required=False, allow_blank=True)

    def validate(self, data):
        if data["action"] == "counter" and data.get("counter_amount") is None:
            raise serializers.ValidationError(
                {"counter_amount": "Enter the amount you're countering with."}
            )
        if data.get("counter_amount") is not None and data["counter_amount"] <= 0:
            raise serializers.ValidationError(
                {"counter_amount": "Enter an amount greater than zero."}
            )
        return data


class OwnerOfferSerializer(serializers.ModelSerializer):
    """Owner-facing offer row.

    The buyer's name is always shown; email and phone appear only once the
    offer is accepted — so a seller never gets a buyer's contact details for an
    offer they then decline. Like the customer serializer, it carries nothing
    about the owner's private range.
    """

    car = OfferCarSummarySerializer(read_only=True)
    customer = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    resulting_deal = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            "id",
            "car",
            "customer",
            "amount",
            "currency",
            "message",
            "status",
            "counter_amount",
            "counter_message",
            "countered_at",
            "expires_at",
            "responded_at",
            "resulting_request",
            "resulting_deal",
            "is_expired",
            "created_at",
        ]
        read_only_fields = fields

    def get_resulting_deal(self, offer):
        deal = getattr(offer, "deal", None)
        return str(deal.id) if deal else None

    def get_customer(self, obj):
        # Reveal is per-row: each offer decides on its own status, so this can't
        # be a shared-context flag on a list.
        revealed = obj.status == OfferStatus.ACCEPTED
        buyer = obj.customer
        return {
            "id": str(buyer.id),
            "first_name": buyer.first_name,
            "last_name": buyer.last_name,
            "email": buyer.email if revealed else None,
            "phone": (buyer.phone or None) if revealed else None,
        }
