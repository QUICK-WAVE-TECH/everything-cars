from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOwnerOrTeamMember

from apps.listings.models import Branch
from apps.users.services import NoBusinessAccess, resolve_business_scope


class MyScopeView(APIView):
    """The caller's effective scope, for the frontend: which branches they can
    use for listing, and whether they may manage the team."""

    permission_classes = [IsAuthenticated, IsOwnerOrTeamMember]

    def get(self, request):
        try:
            business_owner, branch_ids = resolve_business_scope(request.user)
        except NoBusinessAccess:
            return Response(
                {
                    "is_team_member": request.user.role == "team_member",
                    "can_manage_team": False,
                    "business_name": "",
                    "branches": [],
                }
            )
        profile = getattr(business_owner, "owner_profile", None)
        branches = Branch.objects.filter(business=profile, is_active=True)
        if branch_ids is not None:
            branches = branches.filter(id__in=branch_ids)
        return Response(
            {
                "is_team_member": request.user.role == "team_member",
                "can_manage_team": request.user.role == "owner",
                "business_name": profile.fleet_name if profile else "",
                "branches": [{"id": b.id, "name": b.name} for b in branches],
            }
        )
