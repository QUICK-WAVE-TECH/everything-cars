from django.db import transaction
from django.db.models import Count, Q
from django.http import Http404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsOwner

from apps.listings.models import Branch, CarStatus
from apps.listings.serializers import BranchSerializer

# A car worth keeping for records: it has sale/rental history (a deal or a
# request). Everything else attached to a branch is a disposable listing.
# Car-queryset form (branch.cars.filter(...)):
RECORD_CAR_FILTER = Q(deals__isnull=False) | Q(requests__isnull=False)
# Branch-queryset form, for annotating a Count over the reverse "cars" relation:
_BRANCH_RECORD_FILTER = Q(cars__deals__isnull=False) | Q(cars__requests__isnull=False)


def _branches_with_car_counts(profile):
    """Branches for a business, annotated with total_cars / record_cars so the
    serializer can report delete impact without an N+1."""
    return (
        Branch.objects.filter(business=profile)
        .annotate(
            total_cars=Count("cars", distinct=True),
            record_cars=Count("cars", filter=_BRANCH_RECORD_FILTER, distinct=True),
        )
        .order_by("-is_active", "name")
    )


def _verified_fleet_profile(user):
    """Return the user's OwnerProfile iff it's a verified fleet, else None."""
    profile = getattr(user, "owner_profile", None)
    if profile and profile.is_verified and profile.owner_type == "fleet":
        return profile
    return None


class BranchListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            return Response(
                {"detail": "Branch management is for verified business accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        branches = _branches_with_car_counts(profile)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(branches, request)
        return paginator.get_paginated_response(BranchSerializer(page, many=True).data)

    def post(self, request):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            return Response(
                {"detail": "Branch management is for verified business accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = BranchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if Branch.objects.filter(
            business=profile, name=serializer.validated_data["name"]
        ).exists():
            return Response(
                {"name": ["You already have a branch with this name."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save(business=profile)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BranchDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def _get_branch(self, request, branch_id):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            raise Http404
        try:
            return _branches_with_car_counts(profile).get(id=branch_id)
        except Branch.DoesNotExist:
            raise Http404

    def get(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        return Response(BranchSerializer(branch).data)

    def patch(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        serializer = BranchSerializer(branch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_name = serializer.validated_data.get("name")
        if (
            new_name
            and Branch.objects.filter(business=branch.business, name=new_name)
            .exclude(id=branch.id)
            .exists()
        ):
            return Response(
                {"name": ["You already have a branch with this name."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        cars = branch.cars.all()
        # Cars with sale/rental history are kept for records: archive them and
        # detach from the branch (Car.branch is PROTECT, so they'd otherwise
        # block the delete; archiving frees their VIN/plate too). Everything else
        # is a disposable listing and is removed with the branch.
        retained = list(cars.filter(RECORD_CAR_FILTER).distinct().values_list("id", flat=True))
        with transaction.atomic():
            archived_records = (
                branch.cars.filter(id__in=retained).update(
                    branch=None, status=CarStatus.ARCHIVED
                )
                if retained
                else 0
            )
            disposable = branch.cars.exclude(id__in=retained)
            # Count cars first — .delete() returns the full cascade tally, not
            # the number of listings removed.
            deleted_listings = disposable.count()
            disposable.delete()
            # Drop the branch from every team member's assignments, then remove it.
            branch.team_memberships.clear()
            branch.delete()
        return Response(
            {
                "deleted_listings": deleted_listings,
                "archived_records": archived_records,
            },
            status=status.HTTP_200_OK,
        )


class BranchDeactivateView(BranchDetailView):
    def post(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        branch.is_active = False
        branch.save(update_fields=["is_active", "updated_at"])
        # Drop the retired branch from any team member's assignments; a member
        # left with no active branch simply sees an empty dashboard.
        branch.team_memberships.clear()
        return Response(BranchSerializer(branch).data)


class BranchReactivateView(BranchDetailView):
    def post(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        branch.is_active = True
        branch.save(update_fields=["is_active", "updated_at"])
        return Response(BranchSerializer(branch).data)
