from django.contrib import admin

from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("car", "reviewer", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("car__title", "reviewer__email", "comment")
    readonly_fields = ("created_at", "updated_at")
