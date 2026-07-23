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
