from django.http import Http404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsOwner

from apps.listings.models import Branch
from apps.users.models import TeamMembership
from apps.users.team_serializers import (
    TeamMemberCreateSerializer,
    TeamMemberSerializer,
)


def _verified_fleet_profile(user):
    """The user's OwnerProfile iff it's a verified fleet, else None."""
    profile = getattr(user, "owner_profile", None)
    if profile and profile.is_verified and profile.owner_type == "fleet":
        return profile
    return None


_FORBIDDEN = {"detail": "Team management is for verified business accounts."}


class TeamListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            return Response(_FORBIDDEN, status=status.HTTP_403_FORBIDDEN)
        members = (
            TeamMembership.objects.filter(business=profile)
            .select_related("user")
            .prefetch_related("branches")
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(members, request)
        return paginator.get_paginated_response(
            TeamMemberSerializer(page, many=True).data
        )

    def post(self, request):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            return Response(_FORBIDDEN, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamMemberCreateSerializer(
            data=request.data, context={"business": profile}
        )
        serializer.is_valid(raise_exception=True)
        membership = serializer.save()
        return Response(
            TeamMemberSerializer(membership).data, status=status.HTTP_201_CREATED
        )


class TeamDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def _get(self, request, member_id):
        profile = _verified_fleet_profile(request.user)
        if not profile:
            raise Http404
        try:
            return TeamMembership.objects.get(id=member_id, business=profile)
        except TeamMembership.DoesNotExist:
            raise Http404

    def get(self, request, member_id):
        return Response(TeamMemberSerializer(self._get(request, member_id)).data)

    def patch(self, request, member_id):
        membership = self._get(request, member_id)
        if "title" in request.data:
            membership.title = request.data["title"]
            membership.save(update_fields=["title", "updated_at"])
        if "branch_ids" in request.data:
            ids = request.data["branch_ids"]
            owned = set(
                Branch.objects.filter(
                    business=membership.business, id__in=ids
                ).values_list("id", flat=True)
            )
            if not ids or len(owned) != len(set(str(i) for i in ids)):
                return Response(
                    {"branch_ids": ["Invalid branch selection."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            membership.branches.set(ids)
        return Response(TeamMemberSerializer(membership).data)


class TeamDeactivateView(TeamDetailView):
    def post(self, request, member_id):
        m = self._get(request, member_id)
        m.is_active = False
        m.save(update_fields=["is_active", "updated_at"])
        return Response(TeamMemberSerializer(m).data)


class TeamReactivateView(TeamDetailView):
    def post(self, request, member_id):
        m = self._get(request, member_id)
        m.is_active = True
        m.save(update_fields=["is_active", "updated_at"])
        return Response(TeamMemberSerializer(m).data)
