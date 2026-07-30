from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsStaff
from .models import Deal, DealCancelledBy
from .serializers import DealSerializer, DisputeDealSerializer
from .services import cancel_deal, complete_deal, dismiss_dispute, dispute_deal, reverse_deal


def _deal_queryset():
    return Deal.objects.select_related(
        "car", "buyer", "seller", "offer", "seller__owner_profile",
    ).prefetch_related("car__images")


def _dispute_queryset():
    return Deal.objects.select_related(
        "car",
        "buyer",
        "seller",
        "seller__owner_profile",
        "dispute_resolved_by",
    ).prefetch_related("car__images").filter(disputed_at__isnull=False)


def _participant_deal_or_404(user, deal_id):
    return (
        _deal_queryset()
        .filter(Q(buyer=user) | Q(seller=user))
        .filter(id=deal_id)
        .first()
    )


class DealDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, deal_id):
        deal = _participant_deal_or_404(request.user, deal_id)
        if deal is None:
            return Response({"detail": "Deal not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DealSerializer(deal, context={"request": request}).data)


class MyDealListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DealSerializer

    def get_queryset(self):
        u = self.request.user
        return _deal_queryset().filter(Q(buyer=u) | Q(seller=u))

    def get_serializer_context(self):
        return {"request": self.request}


class DealCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deal_id):
        deal = _participant_deal_or_404(request.user, deal_id)
        if deal is None:
            return Response({"detail": "Deal not found."}, status=status.HTTP_404_NOT_FOUND)
        if deal.seller_id != request.user.id:
            return Response(
                {"detail": "Only the seller can mark the sale complete."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            complete_deal(deal)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DealSerializer(deal, context={"request": request}).data)


class DealCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deal_id):
        deal = _participant_deal_or_404(request.user, deal_id)
        if deal is None:
            return Response({"detail": "Deal not found."}, status=status.HTTP_404_NOT_FOUND)
        by = (
            DealCancelledBy.SELLER
            if deal.seller_id == request.user.id
            else DealCancelledBy.BUYER
        )
        try:
            cancel_deal(deal, cancelled_by=by)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DealSerializer(deal, context={"request": request}).data)


class DealDisputeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deal_id):
        deal = _participant_deal_or_404(request.user, deal_id)
        if deal is None:
            return Response({"detail": "Deal not found."}, status=status.HTTP_404_NOT_FOUND)
        if deal.buyer_id != request.user.id:
            return Response(
                {"detail": "Only the buyer can dispute a completed sale."},
                status=status.HTTP_403_FORBIDDEN,
            )
        reason = (request.data or {}).get("reason", "")
        try:
            dispute_deal(deal, reason=reason)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DealSerializer(deal, context={"request": request}).data)


# ── Staff dispute resolution ──


class StaffDisputeListView(ListAPIView):
    """Disputed deals for the staff console. Filter by ?status=open|upheld|
    dismissed|all (default open) and ?search= car/buyer/seller."""

    permission_classes = [IsStaff]
    serializer_class = DisputeDealSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = _dispute_queryset()
        status_filter = self.request.query_params.get("status", "open")
        if status_filter == "open":
            qs = qs.filter(dispute_resolution="")
        elif status_filter in ("upheld", "dismissed"):
            qs = qs.filter(dispute_resolution=status_filter)
        # "all" → no status filter
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(car__title__icontains=search)
                | Q(buyer__first_name__icontains=search)
                | Q(buyer__last_name__icontains=search)
                | Q(seller__first_name__icontains=search)
                | Q(seller__last_name__icontains=search)
                | Q(seller__owner_profile__fleet_name__icontains=search)
            )
        return qs.order_by("-disputed_at")

    def get_serializer_context(self):
        return {"request": self.request}


def _open_dispute_or_404(deal_id):
    return (
        _dispute_queryset()
        .filter(id=deal_id, dispute_resolution="")
        .first()
    )


class StaffDisputeUpholdView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, deal_id):
        deal = _open_dispute_or_404(deal_id)
        if deal is None:
            return Response(
                {"detail": "Open dispute not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            reverse_deal(deal, by=request.user)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            DisputeDealSerializer(deal, context={"request": request}).data
        )


class StaffDisputeDismissView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, deal_id):
        deal = _open_dispute_or_404(deal_id)
        if deal is None:
            return Response(
                {"detail": "Open dispute not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        note = (request.data or {}).get("note", "")
        try:
            dismiss_dispute(deal, note=note, by=request.user)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            DisputeDealSerializer(deal, context={"request": request}).data
        )
