from django.db.models import Q
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Deal
from .serializers import DealSerializer


def _deal_queryset():
    return Deal.objects.select_related(
        "car", "buyer", "seller", "offer", "seller__owner_profile",
    ).prefetch_related("car__images")


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
