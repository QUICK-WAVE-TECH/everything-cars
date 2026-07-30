from datetime import time

from rest_framework import serializers
from django.utils import timezone

from .models import (
    AttendeeType,
    CarStatusHistory,
    InspectionBooking,
    InspectionCenter,
    InspectionDocument,
    InspectionResult,
    InspectionSlot,
    PhysicalInspection,
    AssistanceRequest,
)
from apps.listings.serializers import CarDetailSerializer
from apps.users.models import IDType


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


class InspectionSlotSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    center_name = serializers.CharField(source="center.company_name", read_only=True)
    center_city = serializers.CharField(source="center.city", read_only=True)
    center = InspectionCenterSerializer(read_only=True)

    class Meta:
        model = InspectionSlot
        fields = [
            "id",
            "date",
            "start_time",
            "end_time",
            "capacity",
            "center",
            "note",
            "is_active",
            "created_by_name",
            "center_name",
            "center_city",
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
        max_length=7,
        help_text="0=Monday, 6=Sunday",
    )
    time_slots = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=20,
    )
    capacity = serializers.IntegerField(min_value=1, default=1)

    # Bound a single batch so one request can't schedule an unbounded number of
    # slots (both a safety guard and a query-count cap).
    MAX_RANGE_DAYS = 300
    center = serializers.PrimaryKeyRelatedField(
        queryset=InspectionCenter.objects.filter(is_active=True)
    )

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
        if (data["date_to"] - data["date_from"]).days + 1 > self.MAX_RANGE_DAYS:
            raise serializers.ValidationError(
                {
                    "date_to": (
                        f"Date range cannot exceed {self.MAX_RANGE_DAYS} days."
                    )
                }
            )
        # Dedupe weekdays so a repeated list can't bloat the creation loop.
        data["days"] = set(data["days"])
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
            row = {"start_time": start, "end_time": end}
            # Optional per-row capacity — overrides the batch-level default.
            if slot.get("capacity") is not None:
                try:
                    row_capacity = int(slot["capacity"])
                except (TypeError, ValueError):
                    raise serializers.ValidationError(
                        {"time_slots": "Row capacity must be a number."}
                    )
                if row_capacity < 1:
                    raise serializers.ValidationError(
                        {"time_slots": "Row capacity must be at least 1."}
                    )
                row["capacity"] = row_capacity
            normalized_slots.append(row)
        data["time_slots"] = normalized_slots
        return data


class AvailableSlotSerializer(serializers.ModelSerializer):
    """Public-facing slot info for owners — no internal notes."""

    spots_remaining = serializers.IntegerField(read_only=True)
    center = InspectionCenterSerializer(read_only=True)

    class Meta:
        model = InspectionSlot
        fields = [
            "id",
            "date",
            "start_time",
            "end_time",
            "center",
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
            "attendee_type",
            "rep_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_booked_by_name(self, obj):
        return f"{obj.booked_by.first_name} {obj.booked_by.last_name}"


class InspectionBookingDetailSerializer(InspectionBookingSerializer):
    """Includes full car detail for staff review."""

    car = CarDetailSerializer(read_only=True)
    inspection = serializers.SerializerMethodField()

    class Meta(InspectionBookingSerializer.Meta):
        # Staff-only detail — rep_id_type/number are exposed here (never on the
        # owner-facing list serializer).
        fields = [
            "id",
            "car",
            "slot",
            "booked_by_name",
            "status",
            "reschedule_count",
            "staff_note",
            "attendee_type",
            "rep_name",
            "rep_id_type",
            "rep_id_number",
            "inspection",
            "created_at",
            "updated_at",
        ]

    def get_inspection(self, obj):
        # Reverse OneToOne — absent until the inspection is submitted.
        try:
            inspection = obj.inspection
        except PhysicalInspection.DoesNotExist:
            return None
        return StaffInspectionReadSerializer(inspection, context=self.context).data


class FeeQuoteSerializer(serializers.Serializer):
    inspection_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    listing_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2)
    vat_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField()
    bank_name = serializers.CharField()
    bank_account_name = serializers.CharField()
    bank_account_number = serializers.CharField()


class BookingCreateSerializer(serializers.Serializer):
    car_id = serializers.UUIDField()
    slot_id = serializers.UUIDField()
    attendee_type = serializers.ChoiceField(
        choices=AttendeeType.choices, default=AttendeeType.SELF
    )
    rep_name = serializers.CharField(
        required=False, allow_blank=True, max_length=200, default=""
    )
    rep_id_type = serializers.ChoiceField(
        choices=IDType.choices, required=False, allow_blank=True, default=""
    )
    rep_id_number = serializers.CharField(
        required=False, allow_blank=True, max_length=50, default=""
    )
    consent_accepted = serializers.BooleanField(default=False)

    def validate(self, data):
        if data["attendee_type"] == AttendeeType.REPRESENTATIVE:
            missing = [
                f
                for f in ("rep_name", "rep_id_type", "rep_id_number")
                if not data.get(f)
            ]
            if missing:
                raise serializers.ValidationError(
                    {f: "Required when a representative attends." for f in missing}
                )
            if not data.get("consent_accepted"):
                raise serializers.ValidationError(
                    {
                        "consent_accepted": (
                            "You must accept the authorization agreement."
                        )
                    }
                )
        return data


class StaffNoteSerializer(serializers.Serializer):
    staff_note = serializers.CharField(min_length=1)


class PhysicalInspectionSerializer(serializers.ModelSerializer):
    inspector_name = serializers.SerializerMethodField()
    inspected_at = serializers.DateTimeField(required=False)

    class Meta:
        model = PhysicalInspection
        fields = [
            "id",
            "condition",
            "mileage",
            "fuel_type",
            "car_type",
            "features",
            "engine_condition",
            "chassis_condition",
            "ac_condition",
            "is_flooded",
            "has_accident_history",
            "staff_notes",
            "result",
            "inspected_at",
            "inspector_name",
            "presented_attendee",
            "presented_id_type",
            "presented_id_number",
            "presented_id_document",
            "created_at",
        ]
        read_only_fields = ["id", "inspector_name", "created_at"]

    def get_inspector_name(self, obj):
        if not obj.inspector_id:
            return ""
        return f"{obj.inspector.first_name} {obj.inspector.last_name}".strip()

    def validate(self, attrs):
        result = attrs.get("result")

        needs_note = attrs.get("result") in (
            InspectionResult.NEEDS_CLEARANCE,
            InspectionResult.FAILED,
        )
        if needs_note and not attrs.get("staff_notes", "").strip():
            raise serializers.ValidationError(
                {"staff_notes": "A reason is required for this result."}
            )
        # A non-failed inspection means someone attended — record whether it was
        # the owner or the declared representative.
        if result and result != InspectionResult.FAILED:
            if not attrs.get("presented_attendee"):
                raise serializers.ValidationError(
                    {
                        "presented_attendee": (
                            "Record who presented for the inspection."
                        )
                    }
                )
            # The owner's ID is already on file from sign-up; only capture an ID
            # when a representative attends in their place.
            if attrs.get("presented_attendee") == "representative":
                missing = [
                    f
                    for f in ("presented_id_type", "presented_id_number")
                    if not attrs.get(f)
                ]
                if missing:
                    raise serializers.ValidationError(
                        {
                            f: "Required when a representative attends."
                            for f in missing
                        }
                    )
        return attrs


class InspectionDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionDocument
        fields = [
            "id",
            "car_documents",
            "receipt_upload",
            "custom_duty_status",
            "receipt_type",
            "additional_notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class StaffInspectionReadSerializer(serializers.ModelSerializer):
    """Staff-only read view of a completed inspection, including the files the
    inspector uploaded (presented ID + sale documents)."""

    documents = InspectionDocumentSerializer(read_only=True)
    inspector_name = serializers.SerializerMethodField()
    inspector_email = serializers.EmailField(
        source="inspector.email", read_only=True, default=""
    )

    class Meta:
        model = PhysicalInspection
        fields = [
            "id",
            "result",
            "condition",
            "mileage",
            "fuel_type",
            "car_type",
            "features",
            "engine_condition",
            "chassis_condition",
            "ac_condition",
            "is_flooded",
            "has_accident_history",
            "staff_notes",
            "presented_attendee",
            "presented_id_type",
            "presented_id_number",
            "presented_id_document",
            "inspected_at",
            "inspector_name",
            "inspector_email",
            "documents",
        ]

    def get_inspector_name(self, obj):
        if not obj.inspector_id:
            return ""
        return f"{obj.inspector.first_name} {obj.inspector.last_name}".strip()


class CarStatusHistorySerializer(serializers.ModelSerializer):
    """Owner-facing timeline entries. `actor` is deliberately excluded —
    owners see the role (staff/owner/system) but never staff identity."""

    class Meta:
        model = CarStatusHistory
        fields = [
            "id",
            "from_status",
            "to_status",
            "actor_role",
            "note",
            "created_at",
        ]


class StaffCarStatusHistorySerializer(CarStatusHistorySerializer):
    """Staff-facing variant — adds the actor's name (from the audit snapshot,
    falling back to the live FK). Owners never receive this serializer."""

    actor_name = serializers.SerializerMethodField()

    class Meta(CarStatusHistorySerializer.Meta):
        fields = CarStatusHistorySerializer.Meta.fields + ["actor_name"]

    def get_actor_name(self, obj):
        if obj.actor_name:
            return obj.actor_name
        if obj.actor_id:
            return obj.actor.get_full_name()
        return ""


class AssistanceRequestCreateSerializer(serializers.Serializer):
    car_id = serializers.UUIDField(required=False, allow_null=True)
    country = serializers.CharField(
        required=False, allow_blank=True, max_length=100, default=""
    )
    state = serializers.CharField(
        required=False, allow_blank=True, max_length=250, default=""
    )
    message = serializers.CharField(required=False, allow_blank=True, default="")


class AssistanceRequestSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_phone = serializers.CharField(source="owner.phone", read_only=True)
    car_title = serializers.SerializerMethodField()

    class Meta:
        model = AssistanceRequest
        fields = [
            "id",
            "owner_name",
            "owner_email",
            "owner_phone",
            "car",
            "car_title",
            "country",
            "state",
            "message",
            "status",
            "created_at",
            "handled_at",
        ]

    def get_owner_name(self, obj):
        return obj.owner.get_full_name()

    def get_car_title(self, obj):
        return obj.car.title if obj.car_id else ""
