from django.http import Http404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsOwner

from apps.listings.models import Branch
from apps.listings.serializers import BranchSerializer


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
        branches = Branch.objects.filter(business=profile)
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
            return Branch.objects.get(id=branch_id, business=profile)
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


class BranchDeactivateView(BranchDetailView):
    def post(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        branch.is_active = False
        branch.save(update_fields=["is_active", "updated_at"])
        return Response(BranchSerializer(branch).data)


class BranchReactivateView(BranchDetailView):
    def post(self, request, branch_id):
        branch = self._get_branch(request, branch_id)
        branch.is_active = True
        branch.save(update_fields=["is_active", "updated_at"])
        return Response(BranchSerializer(branch).data)
