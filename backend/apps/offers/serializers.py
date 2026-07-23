from django.utils import timezone
from datetime import timedelta

from rest_framework import serializers

from apps.listings.models import CarStatus, ListingType
from .models import (
    ACTIVE_OFFER_STATUSES,
    MAX_OFFERS_PER_CAR,
    OFFER_TTL_HOURS,
    Offer,
)

# One fixed sentence for every rejected-too-low offer. Never interpolate the
# actual minimum, and never vary the wording by how far off the amount is —
# either would let a buyer binary-search the owner's private floor.
BELOW_RANGE_MESSAGE = (
    "Your offer is below the acceptable range for this vehicle. "
    "Please submit a higher amount to continue."
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

        if car.min_price is not None and data["amount"] < car.min_price:
            raise serializers.ValidationError({"amount": BELOW_RANGE_MESSAGE})
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
            "is_expired",
            "created_at",
        ]
        read_only_fields = fields


from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.listings.models import Car
from .models import Offer
from .serializers import OfferCreateSerializer, OfferSerializer


class CarOfferCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, car_id):
        car = get_object_or_404(Car, id=car_id)
        serializer = OfferCreateSerializer(
            data=request.data, context={"request": request, "car": car}
        )
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        offer = (
            Offer.objects.select_related("car")
            .prefetch_related("car__images")
            .get(id=offer.id)
        )
        return Response(
            OfferSerializer(offer, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
