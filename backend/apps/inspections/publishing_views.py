from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsPublisher

from apps.listings.models import Car, CarStatus
from apps.inspections.models import ActorRole
from apps.inspections.services import record_status_change
from apps.notifications.service import notify_changes_requested, notify_listing_approved

from apps.inspections.publishing_serializers import (
    PendingPublishingDetailSerializer,
    PendingPublishingRowSerializer,
)

MIN_SENDBACK_NOTE = 15


def _queue_qs():
    """Cars awaiting a publisher, oldest-waiting first (FIFO)."""
    return (
        Car.objects.filter(status=CarStatus.PENDING_PUBLISHING)
        .select_related("owner__owner_profile", "brand", "branch")
        .prefetch_related("images", "physical_inspections__inspector")
        .order_by("updated_at")
    )


class PendingPublishingListView(APIView):
    permission_classes = [IsAuthenticated, IsPublisher]

    def get(self, request):
        qs = _queue_qs()
        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(owner__owner_profile__fleet_name__icontains=search)
                | Q(branch__name__icontains=search)
            )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            PendingPublishingRowSerializer(
                page, many=True, context={"request": request}
            ).data
        )


class PendingPublishingDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPublisher]

    def get(self, request, car_id):
        try:
            car = _queue_qs().get(id=car_id)
        except Car.DoesNotExist:
            return Response(
                {"detail": "This car isn't awaiting publishing."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            PendingPublishingDetailSerializer(car, context={"request": request}).data
        )


class PublishCarView(APIView):
    permission_classes = [IsAuthenticated, IsPublisher]

    def post(self, request, car_id):
        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(
                    id=car_id, status=CarStatus.PENDING_PUBLISHING
                )
            except Car.DoesNotExist:
                return Response(
                    {"detail": "This car isn't awaiting publishing."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            car.published_at = timezone.now()
            car.admin_note = ""
            record_status_change(
                car,
                CarStatus.PUBLISHED,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                extra_update_fields=["published_at", "admin_note"],
                request=request,
            )
            transaction.on_commit(lambda: notify_listing_approved(car))
        return Response({"status": car.status})


class SendBackCarView(APIView):
    permission_classes = [IsAuthenticated, IsPublisher]

    def post(self, request, car_id):
        note = (request.data.get("note") or "").strip()
        if len(note) < MIN_SENDBACK_NOTE:
            return Response(
                {"note": [f"Add a note of at least {MIN_SENDBACK_NOTE} characters."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            try:
                car = Car.objects.select_for_update().get(
                    id=car_id, status=CarStatus.PENDING_PUBLISHING
                )
            except Car.DoesNotExist:
                return Response(
                    {"detail": "This car isn't awaiting publishing."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            car.admin_note = note
            record_status_change(
                car,
                CarStatus.NEEDS_CHANGES,
                actor=request.user,
                actor_role=ActorRole.STAFF,
                note=note,
                extra_update_fields=["admin_note"],
                request=request,
            )
            transaction.on_commit(lambda: notify_changes_requested(car))
        return Response({"status": car.status})
