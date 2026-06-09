from rest_framework import serializers
from django_countries.serializer_fields import CountryField
from .models import AccessCode, User, CustomerProfile, OwnerProfile


class SignUpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(min_length=2, max_length=150)
    last_name = serializers.CharField(min_length=2, max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    phone = serializers.CharField(max_length=20, required=False, default="")
    role = serializers.ChoiceField(choices=User.Role.choices)

    # Customer fields
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
    national_id = serializers.CharField(max_length=50, required=False, default="")
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
        if value:
            if value.size > 9 * 1024 * 1024:
                raise serializers.ValidationError("File size must be under 9MB.")
            allowed = [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/heic",
                "image/heif",
            ]
            if value.content_type not in allowed:
                raise serializers.ValidationError(
                    "Only PDF, DOC, DOCX, JPG, PNG, and WEBP files are allowed."
                )
        return value

    def validate_country(self, value):
        if value:
            return value.upper()
        return value

    def validate(self, data):
        if data["role"] == "owner":
            if not data.get("owner_type"):
                raise serializers.ValidationError(
                    {"owner_type": "Required for owner accounts."}
                )
            if not data.get("bank_account") or not data.get("bank_name"):
                raise serializers.ValidationError(
                    {"bank_account": "Bank details are required for owner accounts."}
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
        fields = ["id", "email", "first_name", "last_name", "phone", "role", "date_joined"]
        read_only_fields = ["id", "email", "role", "date_joined"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    country = serializers.CharField(source="country.code", default="", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "drivers_license",
            "date_of_birth",
            "address",
            "state",
            "city",
            "country",
        ]


class CustomerProfileWriteSerializer(serializers.ModelSerializer):
    country = CountryField(required=False)

    class Meta:
        model = CustomerProfile
        fields = [
            "drivers_license",
            "date_of_birth",
            "address",
            "state",
            "city",
            "country",
        ]


class OwnerProfileSerializer(serializers.ModelSerializer):
    country = serializers.CharField(source="country.code", default="", read_only=True)

    class Meta:
        model = OwnerProfile
        fields = [
            "owner_type",
            "fleet_name",
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
            "date_joined",
            "customer_profile",
            "owner_profile",
        ]
        read_only_fields = ["id", "email", "role", "date_joined"]
