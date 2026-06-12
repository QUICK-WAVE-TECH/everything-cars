from django.contrib import admin
from .models import Car, CarImage, ListingFeature


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
    list_display = ["car", "name", "value", "sort_order"]
