from rest_framework import serializers
from django_countries.serializer_fields import CountryField
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import AccessCode, User, CustomerProfile, OwnerProfile, IDType

# Ownership documents and ID uploads accept only these types.
ALLOWED_UPLOAD_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",  # some browsers report jpg as image/jpg
]


def validate_upload_file(value):
    """Shared validator for document/ID uploads: PDF, PNG, or JPEG, under 9MB."""
    if value:
        if value.size > 9 * 1024 * 1024:
            raise serializers.ValidationError("File size must be under 9MB.")
        if getattr(value, "content_type", None) not in ALLOWED_UPLOAD_TYPES:
            raise serializers.ValidationError(
                "Only PDF, PNG, and JPEG files are allowed."
            )
    return value


class SignUpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(min_length=2, max_length=150)
    last_name = serializers.CharField(min_length=2, max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    phone = serializers.CharField(max_length=20, required=False, default="")
    role = serializers.ChoiceField(choices=User.Role.choices)
    id_type = serializers.ChoiceField(choices=IDType.choices, required=False)
    id_document = serializers.FileField(required=False)
    # Customer fields
    national_id = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    drivers_license = serializers.CharField(max_length=50, required=False, default="")
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    address = serializers.CharField(max_length=250, required=False, default="")
    city = serializers.CharField(max_length=200, required=False, default="")
    state = serializers.CharField(max_length=200, required=False, default="")
    country = CountryField(required=False)

    # Owner fields
    owner_type = serializers.ChoiceField(
        choices=OwnerProfile.OwnerType.choices, required=False
    )
    fleet_name = serializers.CharField(max_length=200, required=False, default="")
    location = serializers.CharField(max_length=200, required=False, default="")
    rc_number = serializers.CharField(max_length=50, required=False, default="")
    bank_account = serializers.CharField(max_length=20, required=False, default="")
    bank_name = serializers.CharField(max_length=100, required=False, default="")
    document = serializers.FileField(required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_document(self, value):
        return validate_upload_file(value)

    def validate_id_document(self, value):
        return validate_upload_file(value)

    def validate_country(self, value):
        if value:
            return value.upper()
        return value

    def validate_national_id(self, value):
        value = value.strip()
       
        return value

    def validate(self, data):
        if not data.get("national_id"):
            raise serializers.ValidationError({"national_id": "ID number is required."})

        if data["role"] == "owner":
            if not data.get("id_type"):
                raise serializers.ValidationError(
                    {"id_type": "Select a means of identification."}
                )
            if not data.get("id_document"):
                raise serializers.ValidationError(
                    {"id_document": "Upload a photo of your ID document."}
                )
            if data["id_type"] == IDType.NIN and not data["national_id"].isdigit():
                raise serializers.ValidationError(
                    {"national_id": "NIN must contain digits only."}
                )
            if not data.get("owner_type"):
                raise serializers.ValidationError(
                    {"owner_type": "Required for owner accounts."}
                )
            if not data.get("bank_account") or not data.get("bank_name"):
                raise serializers.ValidationError(
                    {"bank_account": "Bank details are required for owner accounts."}
                )
            if not data.get("document"):
                raise serializers.ValidationError(
                    {"document": "Document upload is required for owner accounts."}
                )
        else:
            # Customers identify with their NIN — keep the digits-only rule.
            if not data["national_id"].isdigit():
                raise serializers.ValidationError(
                    {"national_id": "NIN must contain digits only."}
                )
        return data


class SignInSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class VerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)
    purpose = serializers.ChoiceField(choices=AccessCode.Purpose.choices)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "role", "date_joined"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    country = serializers.CharField(source="country.code", default="", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "national_id",
            "drivers_license",
            "date_of_birth",
            "address",
            "state",
            "city",
            "country",
        ]

    def validate_country(self, value):
        if value:
            return value.upper()
        return value


class CustomerProfileWriteSerializer(serializers.ModelSerializer):
    country = CountryField(required=False)

    class Meta:
        model = CustomerProfile
        fields = [
            "national_id",
            "drivers_license",
            "date_of_birth",
            "address",
            "state",
            "city",
            "country",
        ]

    def validate_country(self, value):
        if value:
            return value.upper()
        return value


class OwnerProfileSerializer(serializers.ModelSerializer):
    country = serializers.CharField(source="country.code", default="", read_only=True)

    class Meta:
        model = OwnerProfile
        fields = [
            "owner_type",
            "fleet_name",
            "id_type",
            "id_document",
            "national_id",
            "location",
            "rc_number",
            "country",
            "state",
            "city",
            "address",
            "bank_account",
            "bank_name",
            "is_verified",
        ]
        read_only_fields = ["is_verified"]

    def validate_id_document(self, value):
        return validate_upload_file(value)

    def validate_country(self, value):
        if value:
            return value.upper()
        return value


class MeSerializer(serializers.ModelSerializer):
    customer_profile = CustomerProfileSerializer(read_only=True)
    owner_profile = OwnerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "is_staff",
            "date_joined",
            "customer_profile",
            "owner_profile",
        ]
        read_only_fields = ["id", "email", "role", "is_staff", "date_joined"]


class AdminOwnerSerializer(serializers.ModelSerializer):
    """Staff-facing owner record for KYC review + verification."""

    user_id = serializers.UUIDField(source="user.id", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    id_type_display = serializers.CharField(source="get_id_type_display", read_only=True)
    country = serializers.CharField(source="country.code", default="", read_only=True)

    class Meta:
        model = OwnerProfile
        fields = [
            "user_id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "owner_type",
            "fleet_name",
            "rc_number",
            "id_type",
            "id_type_display",
            "national_id",
            "id_document",
            "document",
            "country",
            "state",
            "city",
            "address",
            "is_verified",
            "created_at",
        ]


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(min_length=8)

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc

        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
