from django.contrib import admin

from .models import (
    CarStatusHistory,
    FeeSetting,
    InspectionBooking,
    InspectionCenter,
    InspectionDocument,
    InspectionSlot,
    PhysicalInspection,
)


@admin.register(FeeSetting)
class FeeSettingAdmin(admin.ModelAdmin):
    list_display = ("inspection_fee", "listing_fee", "vat_rate", "updated_at")

    def has_add_permission(self, request):
        # Singleton — edit the one row, never add more.
        return not FeeSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(InspectionCenter)
class InspectionCenterAdmin(admin.ModelAdmin):
    list_display = [
        "company_name",
        "city",
        "state",
        "country_code",
        "city_code",
        "max_reschedules",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_active", "state", "city"]
    search_fields = ["company_name", "city", "state"]


@admin.register(InspectionSlot)
class InspectionSlotAdmin(admin.ModelAdmin):
    list_display = ["date", "start_time", "end_time", "center", "capacity", "is_active"]
    list_filter = ["is_active", "date", "center"]
    search_fields = ["center__company_name", "center__city"]
    list_select_related = ["center"]


@admin.register(InspectionBooking)
class InspectionBookingAdmin(admin.ModelAdmin):
    list_display = [
        "car",
        "slot",
        "booked_by",
        "status",
        "reschedule_count",
        "created_at",
    ]
    list_filter = ["status"]
    search_fields = ["car__title", "car__tracking_id", "booked_by__email"]
    list_select_related = ["car", "slot", "slot__center", "booked_by"]


@admin.register(PhysicalInspection)
class PhysicalInspectionAdmin(admin.ModelAdmin):
    list_display = ["car", "inspector", "result", "mileage", "inspected_at"]
    list_filter = ["result", "fuel_type", "car_type"]
    search_fields = ["car__title", "car__tracking_id", "inspector__email"]
    list_select_related = ["car", "inspector"]


@admin.register(InspectionDocument)
class InspectionDocumentAdmin(admin.ModelAdmin):
    list_display = ["inspection", "custom_duty_status", "receipt_type", "created_at"]
    list_filter = ["custom_duty_status", "receipt_type"]
    list_select_related = ["inspection", "inspection__car"]


@admin.register(CarStatusHistory)
class CarStatusHistoryAdmin(admin.ModelAdmin):
    """Read-only audit trail — history rows are written by the application,
    never edited by hand."""

    list_display = [
        "car",
        "from_status",
        "to_status",
        "actor",
        "actor_role",
        "created_at",
    ]
    list_filter = ["actor_role", "to_status"]
    search_fields = ["car__title", "car__tracking_id"]
    list_select_related = ["car", "actor"]
    readonly_fields = [
        "car",
        "from_status",
        "to_status",
        "actor",
        "actor_role",
        "note",
        "created_at",
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
