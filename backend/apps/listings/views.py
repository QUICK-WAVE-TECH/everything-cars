from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser

from common.permissions import IsOwner
from .models import Car, CarImage, CarStatus
from .serializers import (
    CarListSerializer,
    CarDetailSerializer,
    CarCreateSerializer,
    CarImageSerializer,
)


# Create your views here.
class MyCarListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        obj = (
            Car.objects.filter(owner=request.user)
            .select_related("owner__owner_profile")
            .prefetch_related("images")
        )
        serializer = CarListSerializer(obj, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        owner_profile = getattr(request.user, "owner_profile", None)
        if not owner_profile or not owner_profile.is_verified:
            return Response(
                {"detail": "Account must be verified to list cars. "},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CarCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        car = serializer.save(owner=request.user)

        car = (
            Car.objects.select_related("owner__owner_profile")
            .prefetch_related("images", "features")
            .get(id=car.id)
        )
        return Response(
            CarDetailSerializer(car, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyCarDetailView(APIView):
    permission_classes = [IsOwner]

    def _get_car(self, car_id, user):
        try:
            return (
                Car.objects.select_related("owner__owner_profile")
                .prefetch_related("images", "features")
                .get(id=car_id, owner=user)
            )
        except Car.DoesNotExist:
            return None

    def get(self, request, car_id):
        car = self._get_car(car_id, request.user)
        if not car:
            return Response(
                {"detail": "Car not found"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(CarDetailSerializer(car, context={"request": request}).data)

    def patch(self, request, car_id):
        car = self._get_car(car_id, request.user)
        if not car:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )
        if car.status == CarStatus.ARCHIVED:
            return Response(
                {"detail": "Archived cars cannot be updated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        was_published = car.status == CarStatus.PUBLISHED
        serializer = CarCreateSerializer(car, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        car = serializer.save()

        if was_published:
            car.status = CarStatus.PENDING_REVIEW
            car.published_at = None
            car.save(update_fields=["status", "published_at", "updated_at"])

        car.refresh_from_db()
        car = self._get_car(car_id, request.user)
        return Response(CarDetailSerializer(car, context={"request": request}).data)

    def delete(self, request, car_id):
        car = self._get_car(car_id, request.user)
        if not car:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )

        car.status = CarStatus.ARCHIVED
        car.save(update_fields=["status", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CarImageUploadView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser]

    def post(self, request, car_id):
        files = request.FILES.getlist("images")
        if not files:
            return Response(
                {
                    "detail": "No images provided",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                car = Car.objects.select_for_update().get(id=car_id, owner=request.user)
                if car.status == CarStatus.ARCHIVED:
                    return Response(
                        {"detail": "Archived cars cannot receive new images."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                has_existing_images = car.images.exists()
                created_images = []

                for i, file in enumerate(files):
                    image = CarImage.objects.create(
                        car=car,
                        image=file,
                        is_primary=(not has_existing_images and i == 0),
                    )
                    created_images.append(image)

                if car.status == CarStatus.PUBLISHED:
                    car.status = CarStatus.PENDING_REVIEW
                    car.published_at = None
                    car.save(update_fields=["status", "published_at", "updated_at"])
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(
            CarImageSerializer(
                created_images, many=True, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class PublicCarListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cars = (
            Car.objects.filter(status=CarStatus.PUBLISHED)
            .select_related("owner__owner_profile")
            .prefetch_related("images")
        )
        serializer = CarListSerializer(cars, many=True, context={"request": request})
        return Response(serializer.data)


class PublicCarDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, car_id):
        try:
            car = (
                Car.objects.select_related("owner__owner_profile")
                .prefetch_related("images", "features")
                .get(id=car_id, status=CarStatus.PUBLISHED)
            )
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car does not exist"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(CarDetailSerializer(car, context={"request": request}).data)
