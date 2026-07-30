from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.db.models import Q


from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination

from apps.listings.models import Car
from apps.notifications.notifications import schedule_notification
from apps.notifications.service import (
    notify_offer_received,
    notify_offer_submitted,
)
from .models import Offer, OfferStatus
from .serializers import (
    OfferCreateSerializer,
    OfferRespondSerializer,
    OfferSerializer,
    OwnerOfferSerializer,
)
from .services import customer_respond, owner_respond, withdraw_offer

# Statuses a filter may target, so a bad ?status= is a clean empty page rather
# than a 500.
_VALID_STATUSES = {s.value for s in OfferStatus}


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
            Offer.objects.select_related("car", "car__owner", "customer")
            .prefetch_related("car__images")
            .get(id=offer.id)
        )
        # Both sides hear about it once the row is safely committed.
        schedule_notification(notify_offer_submitted, lambda o=offer: o)
        schedule_notification(notify_offer_received, lambda o=offer: o)
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


def _apply_offer_filters(qs, request):
    """Shared query params: ?status= and ?car=. Unknown values yield nothing
    rather than an error, so a stale filter link never 500s."""
    status_param = request.query_params.get("status")
    if status_param is not None:
        if status_param in _VALID_STATUSES:
            qs = qs.filter(status=status_param)
        else:
            qs = qs.none()
    car_param = request.query_params.get("car")
    if car_param:
        qs = qs.filter(car_id=car_param)
    return qs


class MyOfferListView(APIView):
    """A customer's own offers."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        offers = (
            Offer.objects.filter(customer=request.user)
            .select_related("car", "resulting_request")
            .prefetch_related("car__images")
        )
        offers = _apply_offer_filters(offers, request)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(offers, request)
        serializer = OfferSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class OwnerOfferListView(APIView):
    """Offers on the authenticated owner's cars."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        offers = (
            Offer.objects.filter(car__owner=request.user)
            .select_related("car", "customer", "resulting_request")
            .prefetch_related("car__images")
        )
        offers = _apply_offer_filters(offers, request)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(offers, request)
        serializer = OwnerOfferSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)
