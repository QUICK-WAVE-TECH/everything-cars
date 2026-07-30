from django.contrib import admin

from .models import Deal


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = (
        "car",
        "buyer",
        "seller",
        "status",
        "agreed_amount",
        "currency",
        "created_at",
    )
    list_filter = ("status", "currency", "created_at")
    search_fields = ("car__title", "buyer__email", "seller__email", "id")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    raw_id_fields = ("car", "buyer", "seller", "offer")
    readonly_fields = ("created_at",)
