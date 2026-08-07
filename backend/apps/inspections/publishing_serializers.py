from rest_framework import serializers

from apps.listings.models import Car
from apps.inspections.models import PhysicalInspection


def _latest_inspection(car):
    """Newest inspection for the car (the passed one that queued it). Uses the
    prefetched cache — PhysicalInspection.Meta orders by -created_at."""
    return next(iter(car.physical_inspections.all()), None)


class InspectionReportSerializer(serializers.ModelSerializer):
    inspector_name = serializers.SerializerMethodField()

    class Meta:
        model = PhysicalInspection
        fields = [
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
            "inspector_name",
            "inspected_at",
        ]

    def get_inspector_name(self, obj):
        return obj.inspector.get_full_name()


class PendingPublishingRowSerializer(serializers.ModelSerializer):
    car_id = serializers.UUIDField(source="id")
    brand = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    inspector_name = serializers.SerializerMethodField()
    inspected_at = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            "car_id",
            "title",
            "brand",
            "model",
            "year",
            "thumbnail",
            "business_name",
            "branch_name",
            "inspector_name",
            "inspected_at",
        ]

    def get_brand(self, obj):
        return obj.brand.name if obj.brand_id else (obj.brand_other or "")

    def get_thumbnail(self, obj):
        images = list(obj.images.all())
        img = next((i for i in images if i.is_primary), images[0] if images else None)
        if not img:
            return None
        url = None
        if getattr(img, "thumbnail", None):
            url = img.thumbnail.url
        elif getattr(img, "image", None):
            url = img.image.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if (request and url) else url

    def get_business_name(self, obj):
        profile = getattr(obj.owner, "owner_profile", None)
        return profile.fleet_name if profile and profile.owner_type == "fleet" else ""

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch_id else ""

    def get_inspector_name(self, obj):
        insp = _latest_inspection(obj)
        return insp.inspector.get_full_name() if insp else ""

    def get_inspected_at(self, obj):
        insp = _latest_inspection(obj)
        return insp.inspected_at if insp else None


class PendingPublishingDetailSerializer(serializers.Serializer):
    """The full listing (staff view) plus the inspection report, for the
    publisher's review drawer."""

    def to_representation(self, car):
        from apps.listings.serializers import CarDetailSerializer

        data = CarDetailSerializer(car, context=self.context).data
        insp = _latest_inspection(car)
        data["inspection"] = InspectionReportSerializer(insp).data if insp else None
        return data
