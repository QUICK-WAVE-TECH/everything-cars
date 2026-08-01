from django.contrib import admin
from .models import (
    Brand,
    Car,
    CarImage,
    ListingFeature,
    Request,
    RequestStatusEvent,
    Transaction,
)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "display_order")
    list_editable = ("is_active", "display_order")
    search_fields = ("name", "slug")
    ordering = ("display_order", "name")


class CarImageInline(admin.TabularInline):
    model = CarImage
    extra = 0


class ListingFeatureInline(admin.TabularInline):
    model = ListingFeature
    extra = 0


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "listing_type", "status", "created_at"]
    list_filter = ["status", "listing_type", "body_type"]
    search_fields = ["title", "brand", "model"]
    inlines = [CarImageInline, ListingFeatureInline]


@admin.register(CarImage)
class CarImageAdmin(admin.ModelAdmin):
    list_display = ["car", "is_primary", "created_at"]


@admin.register(ListingFeature)
class ListingFeatureAdmin(admin.ModelAdmin):
    list_display = ["car", "name", "description", "sort_order"]


class RequestStatusEventInline(admin.TabularInline):
    model = RequestStatusEvent
    extra = 0
    readonly_fields = ["from_status", "to_status", "actor", "note", "created_at"]


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "car",
        "customer",
        "request_type",
        "price_offered",
        "status",
        "created_at",
    ]
    list_filter = ["status", "request_type"]
    search_fields = [
        "car__title",
        "car__brand",
        "customer__first_name",
        "customer__last_name",
    ]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [RequestStatusEventInline]


@admin.register(RequestStatusEvent)
class RequestStatusEventAdmin(admin.ModelAdmin):
    list_display = ["request", "from_status", "to_status", "actor", "created_at"]
    readonly_fields = [
        "request",
        "from_status",
        "to_status",
        "actor",
        "note",
        "created_at",
    ]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "request",
        "payer",
        "receiver",
        "amount",
        "currency",
        "transaction_type",
        "payment_method",
        "status",
        "reference",
        "idempotency_key",
        "created_at",
    ]
    readonly_fields = [
        "id",
        "request",
        "payer",
        "receiver",
        "created_at",
        "idempotency_key",
        "transaction_type",
    ]
    list_filter = ["status", "request"]
    search_fields = [
        "reference",
        "payer__first_name",
        "payer__last_name",
        "receiver__first_name",
        "receiver__last_name",
    ]
