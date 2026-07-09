from datetime import time

from rest_framework import serializers
from django.utils import timezone

from .models import InspectionSlot, InspectionBooking, InspectionCenter
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

    def _parse_time(self, value):
        if isinstance(value, time):
            return value
        if not isinstance(value, str):
            raise serializers.ValidationError("Time must be a string.")

        raw = value.strip().upper()
        is_pm = "PM" in raw
        is_am = "AM" in raw
        cleaned = raw.replace("AM", "").replace("PM", "").strip()
        parts = cleaned.split(":")

        try:
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
        except (TypeError, ValueError, IndexError):
            raise serializers.ValidationError("Use HH:MM format.")

        if is_pm and hour != 12:
            hour += 12
        if is_am and hour == 12:
            hour = 0

        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            raise serializers.ValidationError("Use a valid time.")

        return time(hour, minute)

    def validate(self, data):
        if data["date_from"] > data["date_to"]:
            raise serializers.ValidationError(
                {"date_to": "End date must be on or after start date."}
            )
        if data["date_from"] < timezone.localdate():
            raise serializers.ValidationError(
                {"date_from": "Start date cannot be in the past."}
            )
        normalized_slots = []
        for slot in data["time_slots"]:
            if "start_time" not in slot or "end_time" not in slot:
                raise serializers.ValidationError(
                    {"time_slots": "Each slot must have start_time and end_time."}
                )
            try:
                start = self._parse_time(slot["start_time"])
                end = self._parse_time(slot["end_time"])
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({"time_slots": exc.detail})
            if start >= end:
                raise serializers.ValidationError(
                    {"time_slots": "End time must be after start time."}
                )
            normalized_slots.append({"start_time": start, "end_time": end})
        data["time_slots"] = normalized_slots
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


class InspectionCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionCenter
        fields = [
            "id",
            "company_name",
            "address",
            "country",
            "country_code",
            "state",
            "city",
            "city_code",
            "phone",
            "email",
            "max_reschedules",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_city_code(self, value):
        value = value.strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError(
                "City code must be exactly 3 letters, e.g LOS."
            )

        return value

    def validate_country_code(self, value):
        value = value.strip().upper()
        if not (2 <= len(value) <= 3) or not value.isalpha():
            raise serializers.ValidationError("Country Code must be 2-3 letters")
        return value
