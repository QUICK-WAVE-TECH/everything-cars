from django.contrib import admin, messages

from .models import Deal, DealStatus
from .services import reverse_deal


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = (
        "car",
        "buyer",
        "seller",
        "status",
        "is_disputed",
        "agreed_amount",
        "currency",
        "created_at",
    )
    list_filter = ("status", "currency", "created_at", ("disputed_at", admin.EmptyFieldListFilter))
    search_fields = ("car__title", "buyer__email", "seller__email", "id")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    raw_id_fields = ("car", "buyer", "seller", "offer")
    readonly_fields = ("created_at", "disputed_at", "dispute_reason")
    actions = ("reverse_completed_deal",)

    @admin.display(boolean=True, description="Disputed")
    def is_disputed(self, obj):
        return obj.disputed_at is not None

    @admin.action(description="Reverse completed deal & relist the car")
    def reverse_completed_deal(self, request, queryset):
        reversed_count = 0
        for deal in queryset:
            if deal.status != DealStatus.COMPLETED:
                self.message_user(
                    request,
                    f"Skipped {deal}: only completed deals can be reversed.",
                    level=messages.WARNING,
                )
                continue
            reverse_deal(deal)
            reversed_count += 1
        if reversed_count:
            self.message_user(
                request,
                f"Reversed {reversed_count} deal(s); the car(s) are back on the market.",
                level=messages.SUCCESS,
            )
