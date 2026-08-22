from django.conf import settings
from django.db import transaction
from django.http import Http404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsOwner

from apps.listings.models import Branch
from apps.notifications.service import notify_team_member_added
from apps.users.models import PasswordResetToken, TeamMembership
from apps.users.team_serializers import (
    TeamMemberCreateSerializer,
    TeamMemberSerializer,
)

# Team-member invites live longer than a password reset — 7 days.
INVITE_TOKEN_MINUTES = 7 * 24 * 60


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
        with transaction.atomic():
            membership = serializer.save()
            # A set-your-password link (like a reset), so the new member can pick
            # a password and sign in — every account needs a username + password.
            token = PasswordResetToken.create_token(
                membership.user, expires_in_minutes=INVITE_TOKEN_MINUTES
            )
            setup_url = (
                settings.FRONTEND_URL.rstrip("/")
                + f"/reset-password?token={token.plain_token}"
            )
            transaction.on_commit(
                lambda m=membership, url=setup_url: notify_team_member_added(m, url)
            )
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

    def delete(self, request, member_id):
        membership = self._get(request, member_id)
        # Full account delete: removing the user cascades the membership, tokens
        # and notifications; history they authored is anonymised (SET_NULL).
        membership.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
