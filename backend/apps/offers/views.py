from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.db.models import Q


from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.listings.models import Car
from .models import Offer
from .serializers import OfferCreateSerializer, OfferSerializer
from .serializers import OfferRespondSerializer
from .services import customer_respond, owner_respond, withdraw_offer


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


class OfferRespondView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, offer_id):
        # A user may only ever see their own offers or offers on their own cars;
        # anything else is a 404, not a 403 — we don't confirm the offer exists.
        offer = get_object_or_404(
            Offer.objects.select_related("car", "customer").filter(
                Q(customer=request.user) | Q(car__owner=request.user)
            ),
            id=offer_id,
        )
        serializer = OfferRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]

        if offer.is_expired:
            return Response(
                {"detail": "This offer has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_owner = offer.car.owner_id == request.user.id
        try:
            if is_owner:
                offer = owner_respond(offer, action, serializer.validated_data)
            else:
                offer = customer_respond(offer, action)
        except ValidationError as exc:
            return Response(
                {"detail": str(exc.message)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(OfferSerializer(offer, context={"request": request}).data)


class OfferWithdrawView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, offer_id):
        offer = get_object_or_404(
            Offer.objects.select_related("car"), id=offer_id, customer=request.user
        )
        try:
            offer = withdraw_offer(offer)
        except ValidationError as exc:
            return Response(
                {"detail": str(exc.message)}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(OfferSerializer(offer, context={"request": request}).data)
