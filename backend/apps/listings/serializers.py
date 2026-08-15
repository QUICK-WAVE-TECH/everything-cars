from datetime import date, timedelta
import re
from rest_framework import serializers
from django.utils import timezone

from apps.sales.models import DealStatus
from .models import (
    Brand,
    Car,
    CarImage,
    CarStatus,
    Currency,
    ListingFeature,
    ListingType,
    Request,
    RequestStatus,
    RequestStatusEvent,
    Transaction,
    Branch,
)


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug"]


def _latest_passed_inspection(car):
    """The car's most recent passed physical inspection, or None.

    Uses the view's `_passed_inspections` prefetch when present (no N+1); falls
    back to a query for single-object views that don't prefetch. Uses the string
    "passed" rather than importing InspectionResult to avoid an import cycle.
    """
    passed = getattr(car, "_passed_inspections", None)
    if passed is not None:
        return passed[0] if passed else None
    return (
        car.physical_inspections.filter(result="passed")
        .order_by("-inspected_at")
        .first()
    )


class CarImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = CarImage
        fields = ["id", "image", "thumbnail", "image_type", "is_primary", "created_at"]
        read_only_fields = fields

    def _absolute_file_url(self, file):
        if not file:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(file.url)
        return file.url

    def get_image(self, obj):
        return self._absolute_file_url(obj.image)

    def get_thumbnail(self, obj):
        return self._absolute_file_url(obj.thumbnail)


class ListingFeatureSerializer(serializers.ModelSerializer):

    class Meta:
        model = ListingFeature
        fields = ["id", "name", "description", "sort_order"]
        read_only_fields = ["id"]


class CarOwnerSummarySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField()
    date_joined = serializers.DateTimeField()
    is_verified = serializers.SerializerMethodField()
    business_name = serializers.SerializerMethodField()

    def get_is_verified(self, obj):
        owner_profile = getattr(obj, "owner_profile", None)
        return owner_profile.is_verified if owner_profile else False

    def get_business_name(self, obj):
        owner_profile = getattr(obj, "owner_profile", None)
        if owner_profile and owner_profile.owner_type == "fleet":
            return owner_profile.fleet_name
        return ""


class CarOwnerSerializer(CarOwnerSummarySerializer):
    listing_count = serializers.SerializerMethodField()

    def get_listing_count(self, obj):
        return obj.cars.count()


class CarListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    owner = CarOwnerSummarySerializer(read_only=True)
    availability_status = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()
    # brand is a FK internally; the API contract keeps it as the canonical name
    # string ("" for an "Other" brand pending review).
    brand = serializers.SerializerMethodField()

    def get_brand(self, obj):
        return obj.brand.name if obj.brand_id else ""

    class Meta:
        model = Car
        fields = [
            "id",
            "title",
            "listing_type",
            "rent_price_per_day",
            "sale_price",
            # Public on purpose: drives the "Negotiable" badge on cards and
            # public detail. The min/max range behind it stays private.
            "is_negotiable",
            "currency",
            "brand",
            "model",
            "year",
            "body_type",
            "state",
            "city",
            "status",
            "owner",
            "primary_image",
            "availability_status",
            "is_verified",
            "created_at",
        ]

    def get_is_verified(self, obj):
        return _latest_passed_inspection(obj) is not None

    def get_primary_image(self, obj):
        # prefetch related("images") should be used in view
        images = obj.images.all()
        primary = next((img for img in images if img.is_primary), None)
        if primary is None and images:
            primary = images[0]

        if primary:
            image = primary.thumbnail or primary.image
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(image.url)
            return image.url
        return None

    def get_availability_status(self, obj):
        if obj.status == CarStatus.ARCHIVED:
            # "Sold" only when a purchase actually completed; an owner can
            # archive (withdraw) a listing that was never sold.
            is_sold = getattr(obj, "_is_sold", None)
            if is_sold is None:
                is_sold = obj.deals.filter(status=DealStatus.COMPLETED).exists()
            return "sold" if is_sold else "archived"

        has_buy_in_progress = getattr(obj, "_has_buy_in_progress", None)
        has_active_current_rental = getattr(obj, "_has_active_current_rental", None)
        has_reserved_future_rental = getattr(obj, "_has_reserved_future_rental", None)
        if has_buy_in_progress is not None:
            if has_buy_in_progress:
                return "reserved"
            if has_active_current_rental:
                return "rented"
            if has_reserved_future_rental:
                return "reserved"
            return "available"

        if obj.deals.filter(status=DealStatus.ACTIVE).exists():
            return "reserved"

        in_progress = getattr(obj, "_in_progress_requests", None)
        if in_progress is None:
            in_progress = obj.requests.filter(
                request_type=ListingType.RENT,
                status__in=[
                    RequestStatus.APPROVED,
                    RequestStatus.PAYMENT_SUBMITTED,
                    RequestStatus.PAID,
                    RequestStatus.ACTIVE,
                ],
            )

        today = date.today()
        for req in in_progress:
            # Active rental currently in period → rented
            if (
                req.status == RequestStatus.ACTIVE
                and req.start_date
                and req.duration_days
            ):
                end = req.start_date + timedelta(days=req.duration_days)
                if req.start_date <= today < end:
                    return "rented"
            # Future rental bookings → still "available" (other dates are open)

        return "available"


class CarDetailSerializer(serializers.ModelSerializer):
    owner = CarOwnerSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    images = CarImageSerializer(many=True, read_only=True)
    features = ListingFeatureSerializer(many=True, read_only=True)
    availability_status = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()

    def get_brand(self, obj):
        return obj.brand.name if obj.brand_id else ""

    branch = serializers.SerializerMethodField()

    def get_branch(self, obj):
        b = obj.branch
        if not b:
            return None
        return {
            "id": b.id,
            "name": b.name,
            "city": b.city,
            "state": b.state,
            "phone": b.phone,
            "email": b.email,
        }

    booked_periods = serializers.SerializerMethodField()
    available_from = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    mileage = serializers.SerializerMethodField()
    fuel_type = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()
    verified_report = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = [
            "id",
            "title",
            "listing_type",
            "rent_price_per_day",
            "sale_price",
            "is_negotiable",
            "currency",
            "brand",
            "brand_other",
            "model",
            "color",
            "year",
            "body_type",
            "transmission",
            "fuel_type",
            "seats",
            "mileage",
            "country",
            "state",
            "city",
            "branch",
            "description",
            "status",
            "tracking_id",
            "admin_note",
            "published_at",
            "created_at",
            "updated_at",
            "owner",
            "primary_image",
            "images",
            "features",
            "availability_status",
            "booked_periods",
            "available_from",
            "features",
            "is_verified",
            "vin",
            "plate_number",
            "verified_report",
            "availability_status",
        ]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get("public"):
            for key in (
                "vin",
                "plate_number",
            ):
                data.pop(key, None)
        return data

    def get_primary_image(self, obj):
        return CarListSerializer(context=self.context).get_primary_image(obj)

    def _get_booked_requests(self, obj):
        """Get booked requests — use prefetched if available."""
        booked = getattr(obj, "_booked_requests", None)
        if booked is None:
            booked = obj.requests.filter(
                request_type="rent",
                status__in=[
                    RequestStatus.APPROVED,
                    RequestStatus.PAYMENT_SUBMITTED,
                    RequestStatus.PAID,
                    RequestStatus.ACTIVE,
                ],
            )
        return booked

    def get_availability_status(self, obj):
        if obj.status == CarStatus.ARCHIVED:
            # "Sold" only when a purchase actually completed; an owner can
            # archive (withdraw) a listing that was never sold.
            is_sold = getattr(obj, "_is_sold", None)
            if is_sold is None:
                is_sold = obj.deals.filter(status=DealStatus.COMPLETED).exists()
            return "sold" if is_sold else "archived"

        has_buy_in_progress = getattr(obj, "_has_buy_in_progress", None)
        has_active_current_rental = getattr(obj, "_has_active_current_rental", None)
        has_reserved_future_rental = getattr(obj, "_has_reserved_future_rental", None)
        if has_buy_in_progress is not None:
            if has_buy_in_progress:
                return "reserved"
            if has_active_current_rental:
                return "rented"
            if has_reserved_future_rental:
                return "reserved"
            return "available"

        # A buy sale in progress is an active Deal.
        if obj.deals.filter(status=DealStatus.ACTIVE).exists():
            return "reserved"

        today = date.today()
        for req in self._get_booked_requests(obj):
            # Active rental currently in period → rented
            if (
                req.status == RequestStatus.ACTIVE
                and req.start_date
                and req.duration_days
            ):
                end = req.start_date + timedelta(days=req.duration_days)
                if req.start_date <= today < end:
                    return "rented"
            # Future rental bookings → still "available" (other dates are open)

        return "available"

    def get_booked_periods(self, obj):
        if obj.status == CarStatus.ARCHIVED:
            return []

        periods = []
        for req in self._get_booked_requests(obj):
            if req.start_date and req.duration_days:
                periods.append(
                    {
                        "start_date": req.start_date.isoformat(),
                        "end_date": (
                            req.start_date + timedelta(days=req.duration_days)
                        ).isoformat(),
                        "status": req.status,
                    }
                )
        periods.sort(key=lambda p: p["start_date"])
        return periods

    def get_available_from(self, obj):
        if obj.status == CarStatus.ARCHIVED:
            return None

        today = date.today()
        latest_end = None
        for req in self._get_booked_requests(obj):
            if req.start_date and req.duration_days:
                end = req.start_date + timedelta(days=req.duration_days)
                if end > today:
                    if latest_end is None or end > latest_end:
                        latest_end = end

        if latest_end is None:
            return None
        return latest_end.isoformat()

    def _verified_source(self, obj):
        """Inspection that overrides owner input — ONLY in public context, so the
        owner keeps seeing their own values on their own pages."""
        if not self.context.get("public"):
            return None
        return _latest_passed_inspection(obj)

    def get_description(self, obj):
        # Always the owner's own description. The inspector's notes are surfaced
        # separately in the verified report (`verified_report.notes`), so the
        # description no longer needs to be overwritten with them.
        return obj.description

    def get_mileage(self, obj):
        insp = self._verified_source(obj)
        return insp.mileage if insp else obj.mileage

    def get_fuel_type(self, obj):
        insp = self._verified_source(obj)
        return insp.fuel_type if insp else obj.fuel_type

    def get_is_verified(self, obj):
        return _latest_passed_inspection(obj) is not None

    def get_verified_report(self, obj):
        insp = _latest_passed_inspection(obj)
        if not insp:
            return None
        # NOTE: deliberately excludes presented_id_* and inspector identity —
        # the verified report is public and must never leak those.
        return {
            "condition": insp.condition,
            "car_type": insp.car_type,
            "mileage": insp.mileage,
            "fuel_type": insp.fuel_type,
            "features": insp.features,
            "engine_condition": insp.engine_condition,
            "chassis_condition": insp.chassis_condition,
            "ac_condition": insp.ac_condition,
            "is_flooded": insp.is_flooded,
            "has_accident_history": insp.has_accident_history,
            "notes": insp.staff_notes,
            "inspected_at": insp.inspected_at,
        }


class CarCreateSerializer(serializers.ModelSerializer):
    features = ListingFeatureSerializer(many=True, required=False)
    # Accept the brand as a name string (the picker sends the canonical name, or
    # nothing when "Other" is chosen). validate() resolves it to the Brand FK.
    brand = serializers.CharField(required=False, allow_blank=True)
    # The branch this car is physically at. Required for fleet listers; ownership
    # + team-member assignment are checked in validate().
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), required=False, allow_null=True
    )
    # A fleet car inherits its location from the branch, so fleet listers don't
    # send state; it's required for individual owners (enforced in validate()).
    state = serializers.CharField(required=False, allow_blank=True)
    MIN_MODEL_YEAR = 1900
    MAX_SEATS = 60
    VIN_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")

    def validate_vin(self, value):
        if value in (None, ""):
            raise serializers.ValidationError("VIN is required.")
        v = value.strip().upper()
        if not self.VIN_RE.match(v):
            raise serializers.ValidationError("Enter a valid 17-character VIN.")

        others = Car.objects.filter(vin=v)
        if self.instance:
            others = others.exclude(pk=self.instance.pk)
        if not others.exists():
            return v  # brand-new VIN

        # A live (non-archived) listing already holds it → hard reject.
        if others.exclude(status=CarStatus.ARCHIVED).exists():
            raise serializers.ValidationError(
                "This vehicle is already registered on the platform."
            )

        # All matches are archived (sold) → only the proven buyer may relist.
        from apps.sales.services import (
            completed_deal_is_final,
            latest_completed_deal_for_vin,
        )

        request = self.context.get("request")
        user = getattr(request, "user", None)
        deal = latest_completed_deal_for_vin(v)
        if deal is not None and user is not None and deal.buyer_id == user.id:
            if completed_deal_is_final(deal):
                return v
            raise serializers.ValidationError(
                "This sale is still within its dispute review period. You can "
                "relist the vehicle after the transfer is finalized."
            )
        raise serializers.ValidationError(
            "You can only relist a vehicle you bought through the platform."
        )

    def validate_plate_number(self, value):
        if value in (None, ""):
            raise serializers.ValidationError("Plate number is required.")
        p = re.sub(r"[\s-]", "", value).upper()
        if not (5 <= len(p) <= 12 and p.isalnum()):
            raise serializers.ValidationError(
                "Enter a valid plate number (5–12 letters/numbers)."
            )
        others = Car.objects.filter(plate_number=p)
        if self.instance:
            others = others.exclude(pk=self.instance.pk)
        # Only a live listing blocks the plate — relist authorization is carried
        # entirely by validate_vin (same physical car).
        if others.exclude(status=CarStatus.ARCHIVED).exists():
            raise serializers.ValidationError(
                "This vehicle is already registered on the platform."
            )
        return p

    class Meta:
        model = Car
        fields = [
            "title",
            "listing_type",
            "rent_price_per_day",
            "sale_price",
            "currency",
            "brand",
            "brand_other",
            "model",
            "color",
            "year",
            "body_type",
            "transmission",
            "fuel_type",
            "seats",
            "mileage",
            "vin",
            "plate_number",
            "is_negotiable",
            "branch",
            "country",
            "state",
            "city",
            "description",
            "features",
        ]
        extra_kwargs = {
            "vin": {"validators": []},
            "plate_number": {"validators": []},
            "brand_other": {"required": False, "allow_blank": True},
        }

    def validate(self, data):
        # Resolve the brand name to the canonical Brand FK. If "Other" is chosen
        # the typed value goes to brand_other (flagged) and the FK is nulled;
        # an unrecognised brand with no "Other" is rejected.
        from apps.listings.brands_data import match_brand

        brand_other = (data.get("brand_other") or "").strip()
        brand_name = (data.get("brand") or "").strip()
        if brand_other:
            data["brand"] = None
            data["brand_other"] = brand_other
        elif brand_name:
            canonical = match_brand(brand_name)
            if canonical is None:
                raise serializers.ValidationError(
                    {"brand": "Pick a brand from the list, or choose 'Other'."}
                )
            data["brand"] = Brand.objects.get(name=canonical)
            data["brand_other"] = ""
        elif not self.instance:
            raise serializers.ValidationError({"brand": "Brand is required."})
        else:
            # Edit with neither field touched — leave the existing brand as-is.
            data.pop("brand", None)

        lt = data.get("listing_type", getattr(self.instance, "listing_type", None))
        rent = data.get(
            "rent_price_per_day", getattr(self.instance, "rent_price_per_day", None)
        )
        sale = data.get("sale_price", getattr(self.instance, "sale_price", None))
        neg = data.get("is_negotiable", getattr(self.instance, "is_negotiable", None))

        if lt == ListingType.RENT:
            if rent is None:
                raise serializers.ValidationError(
                    "Rent price per day is required for rental listings."
                )
            data["sale_price"] = None
            data["is_negotiable"] = None
        elif lt == ListingType.BUY:
            if sale is None:
                raise serializers.ValidationError(
                    {"sale_price": "Required for a buy listing."}
                )
            if self.instance is None and neg is None:
                raise serializers.ValidationError(
                    {"is_negotiable": "Choose negotiable or non-negotiable."}
                )

            data["rent_price_per_day"] = None

        self._validate_branch(data)
        return data

    def _validate_branch(self, data):
        """Fleet listers (owner or team member) must tag the car with a branch
        they're allowed to use; individual owners never carry a branch."""
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None:
            return

        from apps.users.services import NoBusinessAccess, resolve_business_scope

        try:
            business_owner, branch_ids = resolve_business_scope(user)
        except NoBusinessAccess:
            return
        profile = getattr(business_owner, "owner_profile", None)
        is_fleet = bool(profile and profile.owner_type == "fleet")

        if not is_fleet:
            # Individual owners pick their own location; state is required.
            data["branch"] = None
            if not self.instance and not (data.get("state") or "").strip():
                raise serializers.ValidationError({"state": "State is required."})
            return

        branch = data.get("branch")
        # On edit with the field omitted, leave the existing branch untouched.
        if branch is None and self.instance is not None and "branch" not in data:
            return
        if branch is None:
            raise serializers.ValidationError(
                {"branch": "Select the branch this vehicle is at."}
            )
        if branch.business_id != profile.id:
            raise serializers.ValidationError(
                {"branch": "That branch isn't part of your business."}
            )
        if branch_ids is not None and branch.id not in branch_ids:
            raise serializers.ValidationError(
                {"branch": "You aren't assigned to that branch."}
            )
        # A fleet car inherits its location from the branch (business country).
        data["state"] = branch.state
        data["city"] = branch.city
        if profile.country:
            data["country"] = profile.country

    def validate_year(self, value):
        max_year = timezone.now().year + 1
        if value < self.MIN_MODEL_YEAR or value > max_year:
            raise serializers.ValidationError(
                f"Year must be between {self.MIN_MODEL_YEAR} and {max_year}."
            )
        return value

    def validate_seats(self, value):
        if value < 1:
            raise serializers.ValidationError("Seats must be at least 1.")
        if value > self.MAX_SEATS:
            raise serializers.ValidationError(
                f"Seats must be {self.MAX_SEATS} or fewer."
            )
        return value

    def create(self, validated_data):
        features_data = validated_data.pop("features", [])
        car = Car.objects.create(**validated_data)
        for feature in features_data:
            ListingFeature.objects.create(car=car, **feature)
        return car

    def update(self, instance, validated_data):
        features_data = validated_data.pop("features", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if features_data is not None:
            # Replace all features with new set
            instance.features.all().delete()
            for feature in features_data:
                ListingFeature.objects.create(car=instance, **feature)
        return instance

    def validate_title(self, value):
        return value.title()


class CarImageUploadSerializer(serializers.Serializer):
    front = serializers.ImageField(required=False)
    back = serializers.ImageField(required=False)
    left_side = serializers.ImageField(required=False)
    right_side = serializers.ImageField(required=False)
    interior = serializers.ImageField(required=False)


# ---------- Request serializers ----------


class RequestCarSummarySerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    owner = CarOwnerSummarySerializer(read_only=True)
    brand = serializers.SerializerMethodField()

    class Meta:
        model = Car
        fields = ["id", "title", "brand", "model", "year", "primary_image", "owner"]

    def get_brand(self, obj):
        return obj.brand.name if obj.brand_id else ""

    def get_primary_image(self, obj):
        images = obj.images.all()
        primary = next((img for img in images if img.is_primary), None)
        if primary is None and images:
            primary = images[0]
        if primary:
            image = primary.thumbnail or primary.image
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(image.url)
            return image.url
        return None


class RequestCustomerSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class RequestStatusEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = RequestStatusEvent
        fields = ["id", "from_status", "to_status", "actor_name", "note", "created_at"]

    def get_actor_name(self, obj):
        return f"{obj.actor.first_name} {obj.actor.last_name}"


class RequestListSerializer(serializers.ModelSerializer):
    car = RequestCarSummarySerializer(read_only=True)
    customer = RequestCustomerSerializer(read_only=True)

    class Meta:
        model = Request
        fields = [
            "id",
            "car",
            "customer",
            "request_type",
            "price_offered",
            "currency",
            "duration_days",
            "start_date",
            "status",
            "created_at",
        ]


class RequestDetailSerializer(serializers.ModelSerializer):
    car = CarDetailSerializer(read_only=True)
    customer = RequestCustomerSerializer(read_only=True)
    status_events = RequestStatusEventSerializer(many=True, read_only=True)
    originating_offer = serializers.SerializerMethodField()

    class Meta:
        model = Request
        fields = [
            "id",
            "car",
            "customer",
            "request_type",
            "price_offered",
            "currency",
            "duration_days",
            "start_date",
            "message",
            "status",
            "owner_note",
            "payment_method_choice",
            "payment_receipt",
            "created_at",
            "updated_at",
            "status_events",
            "originating_offer",
        ]

    def get_originating_offer(self, obj):
        """The accepted offer this purchase request grew out of, if any — lets
        the request page show 'created from your offer of ₦X' provenance."""
        offer = obj.originating_offers.first()
        if offer is None:
            return None
        return {
            "id": str(offer.id),
            "amount": str(offer.amount),
            "counter_amount": (
                str(offer.counter_amount) if offer.counter_amount is not None else None
            ),
            "created_at": offer.created_at.isoformat(),
        }


class RequestCreateSerializer(serializers.ModelSerializer):
    MAX_RENTAL_DAYS = 365

    class Meta:
        model = Request
        fields = [
            "car",
            "request_type",
            "price_offered",
            "duration_days",
            "start_date",
            "message",
        ]

    def validate_car(self, value):
        from .models import CarStatus

        if value.status != CarStatus.PUBLISHED:
            raise serializers.ValidationError("This car is not available for requests.")
        return value

    def validate_request_type(self, value):
        if value == "both":
            raise serializers.ValidationError(
                "Request type must be 'rent' or 'buy', not 'both'."
            )
        return value

    def validate_price_offered(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price offered must be greater than 0.")
        return value

    def validate(self, data):
        car = data.get("car")
        request = self.context.get("request")

        if request and car and car.owner == request.user:
            raise serializers.ValidationError(
                {"car": "You cannot request your own car."}
            )

        request_type = data.get("request_type")
        if car and request_type and request_type != car.listing_type:
            raise serializers.ValidationError(
                {
                    "request_type": (
                        "This listing only accepts "
                        f"{car.get_listing_type_display().lower()} requests."
                    )
                }
            )

        if request_type == ListingType.RENT:
            duration_days = data.get("duration_days")
            start_date = data.get("start_date")

            if not duration_days:
                raise serializers.ValidationError(
                    {"duration_days": "Duration is required for rental requests."}
                )
            if duration_days < 1:
                raise serializers.ValidationError(
                    {"duration_days": "Duration must be at least 1 day."}
                )
            if duration_days > self.MAX_RENTAL_DAYS:
                raise serializers.ValidationError(
                    {
                        "duration_days": (
                            f"Duration cannot exceed {self.MAX_RENTAL_DAYS} days."
                        )
                    }
                )
            if not start_date:
                raise serializers.ValidationError(
                    {"start_date": "Start date is required for rental requests."}
                )
            if start_date < timezone.localdate():
                raise serializers.ValidationError(
                    {"start_date": "Start date cannot be in the past."}
                )

            # Check for overlapping bookings
            if duration_days and start_date:
                new_end = start_date + timedelta(days=duration_days)
                blocking_rentals = Request.objects.filter(
                    car=car,
                    request_type="rent",
                    status__in=[
                        RequestStatus.APPROVED,
                        RequestStatus.PAYMENT_SUBMITTED,
                        RequestStatus.PAID,
                        RequestStatus.ACTIVE,
                    ],
                ).only("start_date", "duration_days")

                for existing in blocking_rentals:
                    if existing.start_date and existing.duration_days:
                        existing_end = existing.start_date + timedelta(
                            days=existing.duration_days
                        )
                        if start_date < existing_end and existing.start_date < new_end:
                            raise serializers.ValidationError(
                                {
                                    "start_date": (
                                        f"This car is already booked from "
                                        f"{existing.start_date.isoformat()} to "
                                        f"{existing_end.isoformat()}. "
                                        f"Please pick different dates."
                                    )
                                }
                            )

        if (
            car
            and request_type == ListingType.BUY
            and car.is_negotiable
            and self.instance is None
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "This vehicle accepts offers. Submit an offer instead of a "
                        "direct purchase request."
                    )
                }
            )
        return data

    def create(self, validated_data):
        car = validated_data["car"]
        return Request.objects.create(
            currency=car.currency or Currency.NGN,
            **validated_data,
        )


class RequestActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["approve", "reject", "mark_active", "complete"]
    )
    note = serializers.CharField(required=False, allow_blank=True, default="")


class TransactionListSerializer(serializers.ModelSerializer):
    car_detail = serializers.SerializerMethodField()
    payer_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    request_type = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "currency",
            "transaction_type",
            "payment_method",
            "car_detail",
            "payer_name",
            "receiver_name",
            "request_type",
            "status",
            "reference",
            "created_at",
        ]

    def get_car_detail(self, obj):
        if obj.request_id:
            return obj.request.car.title
        if obj.inspection_booking_id:
            return obj.inspection_booking.car.title
        return "—"

    def get_payer_name(self, obj: Transaction):
        first_name = obj.payer.first_name
        last_name = obj.payer.last_name
        return f"{first_name} {last_name}"

    def get_receiver_name(self, obj: Transaction):
        if not obj.receiver_id:
            return "EverythingCars"
        first_name = obj.receiver.first_name
        last_name = obj.receiver.last_name
        return f" {first_name} {last_name}"

    def get_request_type(self, obj: Transaction):
        if obj.request_id:
            return obj.request.request_type
        return obj.transaction_type


class TransactionDetailSerializer(serializers.ModelSerializer):
    car_detail = serializers.SerializerMethodField()
    payer_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    request_type = serializers.SerializerMethodField()
    request = RequestDetailSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "currency",
            "transaction_type",
            "payment_method",
            "car_detail",
            "payer_name",
            "receiver_name",
            "request_type",
            "request",
            "status",
            "reference",
            "created_at",
        ]

    def get_car_detail(self, obj):
        if obj.request_id:
            return obj.request.car.title
        if obj.inspection_booking_id:
            return obj.inspection_booking.car.title
        return "—"

    def get_payer_name(self, obj: Transaction):
        first_name = obj.payer.first_name
        last_name = obj.payer.last_name
        return f" {first_name} {last_name}"

    def get_receiver_name(self, obj: Transaction):
        if not obj.receiver_id:
            return "EverythingCars"
        first_name = obj.receiver.first_name
        last_name = obj.receiver.last_name
        return f"{first_name} {last_name}"

    def get_request_type(self, obj: Transaction):
        if obj.request_id:
            return obj.request.request_type
        return obj.transaction_type


class BranchSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source="business.fleet_name", read_only=True)
    # Deleting a branch removes its disposable listings (no deals/requests) and
    # archives the record-bearing ones. These counts drive the delete confirm
    # dialog. Read the annotations set by the branch list/detail views when
    # present, otherwise fall back to a query (single-object responses).
    record_car_count = serializers.SerializerMethodField()
    deletable_car_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "business_name",
            "state",
            "city",
            "street_address",
            "phone",
            "email",
            "is_active",
            "created_at",
            "record_car_count",
            "deletable_car_count",
        ]
        read_only_fields = ["id", "is_active", "created_at"]

    def get_record_car_count(self, obj):
        from django.db.models import Q

        if hasattr(obj, "record_cars"):
            return obj.record_cars
        return (
            obj.cars.filter(Q(deals__isnull=False) | Q(requests__isnull=False))
            .distinct()
            .count()
        )

    def get_deletable_car_count(self, obj):
        total = obj.total_cars if hasattr(obj, "total_cars") else obj.cars.count()
        return total - self.get_record_car_count(obj)
