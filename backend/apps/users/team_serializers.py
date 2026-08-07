import secrets

from rest_framework import serializers

from apps.listings.models import Branch
from apps.users.models import TeamMembership, User


class TeamMemberSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    branches = serializers.SerializerMethodField()

    class Meta:
        model = TeamMembership
        fields = [
            "id", "email", "first_name", "last_name", "title",
            "branches", "is_active", "created_at",
        ]

    def get_branches(self, obj):
        return [{"id": b.id, "name": b.name} for b in obj.branches.all()]


class TeamMemberCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    title = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    branch_ids = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate_branch_ids(self, value):
        business = self.context["business"]
        owned = set(
            Branch.objects.filter(business=business, id__in=value).values_list(
                "id", flat=True
            )
        )
        if any(bid not in owned for bid in value):
            raise serializers.ValidationError("One or more branches aren't yours.")
        return value

    def create(self, validated):
        business = self.context["business"]
        # Members sign in passwordless (email → access code), so give them a
        # random password they'll never use — the manager requires a non-empty one.
        user = User.objects.create_user(
            email=validated["email"],
            first_name=validated["first_name"],
            last_name=validated["last_name"],
            role=User.Role.TEAM_MEMBER,
            is_active=True,
            password=secrets.token_urlsafe(24),
        )
        membership = TeamMembership.objects.create(
            user=user, business=business, title=validated.get("title", "")
        )
        membership.branches.set(validated["branch_ids"])
        return membership
