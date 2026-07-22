from django.db import IntegrityError, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.db.models import Avg, Count
from common.pagination import StandardPagination
from apps.listings.models import Car, ListingType
from .models import Review
from .serializers import (
    ReviewCreateSerializer,
    ReviewSerializer,
    ReviewUpdateSerializer,
)


class CarReviewListCreateView(APIView):
    """
    GET  /cars/{car_id}/reviews — anyone can read reviews (public)
    POST /cars/{car_id}/reviews — customer or owner with completed request can write
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, car_id):
        reviews = Review.objects.filter(car_id=car_id).select_related("reviewer")
        car = Car.objects.filter(id=car_id).first()
        if car and car.listing_type != ListingType.RENT:
            paginator = StandardPagination()
            paginator.paginate_queryset(Review.objects.none(), request)
            response = paginator.get_paginated_response([])
            response.data["avg_rating"] = None
            response.data["review_count"] = 0
            return response
        paginator = StandardPagination()
        page = paginator.paginate_queryset(reviews, request)
        serializer = ReviewSerializer(page, many=True)

        # Add aggregate stats to response
        stats = Review.objects.filter(car_id=car_id).aggregate(
            avg_rating=Avg("rating"),
            count=Count("id"),
        )

        response = paginator.get_paginated_response(serializer.data)
        response.data["avg_rating"] = (
            round(stats["avg_rating"], 1) if stats["avg_rating"] else None
        )
        response.data["review_count"] = stats["count"]
        return response

    def post(self, request, car_id):
        try:
            car = Car.objects.get(id=car_id)
        except Car.DoesNotExist:
            return Response(
                {"detail": "Car not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if car.listing_type != ListingType.RENT:
            return Response(
                {"detail": "Reviews are only available on rental listings."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ReviewCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Verify the request belongs to this car
        if str(serializer.validated_data["request"].car_id) != str(car_id):
            return Response(
                {"detail": "This request does not belong to this car."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                review = serializer.save()
        except IntegrityError:
            return Response(
                {"detail": "You have already reviewed this request."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ReviewDetailView(APIView):
    """
    PATCH  /reviews/{id} — author can update rating/comment
    DELETE /reviews/{id} — author can delete
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, review_id):
        try:
            review = Review.objects.get(id=review_id, reviewer=request.user)
        except Review.DoesNotExist:
            return Response(
                {"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = ReviewUpdateSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ReviewSerializer(review).data)

    def delete(self, request, review_id):
        try:
            review = Review.objects.get(id=review_id, reviewer=request.user)
        except Review.DoesNotExist:
            return Response(
                {"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND
            )
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
