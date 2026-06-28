from rest_framework import serializers
from django.utils import timezone

from .models import InspectionSlot, InspectionBooking
from apps.listings.serializers import CarDetailSerializer


class InspectionSlotSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InspectionSlot
        fields = [
            "id",
            "date",
            "start_time",
            "end_time",
            "capacity",
            "location",
            "note",
            "is_active",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_by_name", "created_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}"


class InspectionSlotCreateSerializer(serializers.Serializer):
    """Supports batch creation: date_from + date_to + days + time_slots."""

    date_from = serializers.DateField()
    date_to = serializers.DateField()
    days = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        help_text="0=Monday, 6=Sunday",
    )
    time_slots = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
    )
    capacity = serializers.IntegerField(min_value=1, default=1)
    location = serializers.CharField(max_length=200)

    def validate(self, data):
        if data["date_from"] > data["date_to"]:
            raise serializers.ValidationError(
                {"date_to": "End date must be on or after start date."}
            )
        if data["date_from"] < timezone.localdate():
            raise serializers.ValidationError(
                {"date_from": "Start date cannot be in the past."}
            )
        for slot in data["time_slots"]:
            if "start_time" not in slot or "end_time" not in slot:
                raise serializers.ValidationError(
                    {"time_slots": "Each slot must have start_time and end_time."}
                )
        return data


class AvailableSlotSerializer(serializers.ModelSerializer):
    """Public-facing slot info for owners — no internal notes."""

    spots_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = InspectionSlot
        fields = [
            "id",
            "date",
            "start_time",
            "end_time",
            "location",
            "spots_remaining",
        ]


class InspectionBookingSerializer(serializers.ModelSerializer):
    slot = InspectionSlotSerializer(read_only=True)
    car_title = serializers.CharField(source="car.title", read_only=True)
    car_id = serializers.UUIDField(source="car.id", read_only=True)
    booked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InspectionBooking
        fields = [
            "id",
            "car_id",
            "car_title",
            "slot",
            "booked_by_name",
            "status",
            "reschedule_count",
            "staff_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_booked_by_name(self, obj):
        return f"{obj.booked_by.first_name} {obj.booked_by.last_name}"


class InspectionBookingDetailSerializer(InspectionBookingSerializer):
    """Includes full car detail for staff review."""

    car = CarDetailSerializer(read_only=True)

    class Meta(InspectionBookingSerializer.Meta):
        fields = [
            "id",
            "car",
            "slot",
            "booked_by_name",
            "status",
            "reschedule_count",
            "staff_note",
            "created_at",
            "updated_at",
        ]


class BookingCreateSerializer(serializers.Serializer):
    car_id = serializers.UUIDField()
    slot_id = serializers.UUIDField()


class StaffNoteSerializer(serializers.Serializer):
    staff_note = serializers.CharField(min_length=1)
