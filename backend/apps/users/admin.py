from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User,
    CustomerProfile,
    OwnerProfile,
    AccessCode,
    RefreshTokenBlacklist,
)


class CustomerProfileInline(admin.StackedInline):
    model = CustomerProfile
    can_delete = False
    extra = 0


class OwnerProfileInline(admin.StackedInline):
    model = OwnerProfile
    can_delete = False
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
        "staff_role",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_staff", "staff_role")
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering = ("-date_joined",)
    inlines = [CustomerProfileInline, OwnerProfileInline]

    fieldsets = (
        (None, {"fields": ("email", "first_name", "last_name", "phone", "role")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "staff_role",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Dates", {"fields": ("date_joined",)}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "state", "city", "country", "created_at")
    list_select_related = ("user",)
    search_fields = ("user__email", "user__name")


@admin.register(OwnerProfile)
class OwnerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "owner_type", "is_verified", "created_at")
    list_filter = ("owner_type", "is_verified")
    list_select_related = ("user",)
    search_fields = ("user__email", "user__name", "fleet_name")


@admin.register(AccessCode)
class AccessCodeAdmin(admin.ModelAdmin):
    list_display = ("email", "purpose", "is_used", "expires_at", "created_at")
    list_filter = ("purpose", "is_used")
    search_fields = ("email",)
    readonly_fields = ("code_hash",)


@admin.register(RefreshTokenBlacklist)
class RefreshTokenBlacklistAdmin(admin.ModelAdmin):
    list_display = ("jti", "blacklisted_at")
    search_fields = ("jti",)
    readonly_fields = ("jti", "blacklisted_at")
