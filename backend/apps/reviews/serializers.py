from rest_framework import serializers
from .models import Review
from apps.listings.models import RequestStatus


class ReviewerSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class ReviewSerializer(serializers.ModelSerializer):
    reviewer = ReviewerSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "car",
            "reviewer",
            "request",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "car",
            "reviewer",
            "request",
            "created_at",
            "updated_at",
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["request", "rating", "comment"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_request(self, value):
        user = self.context["request"].user

        # Must be the customer OR the car owner
        is_customer = value.customer == user
        is_owner = value.car.owner == user
        if not is_customer and not is_owner:
            raise serializers.ValidationError(
                "You can only review requests you are involved in."
            )

        # Must be completed
        if value.status != RequestStatus.COMPLETED:
            raise serializers.ValidationError(
                "You can only review after the transaction is completed."
            )

        # One review per request per user
        if Review.objects.filter(request=value, reviewer=user).exists():
            raise serializers.ValidationError(
                "You have already reviewed this request."
            )

        return value

    def create(self, validated_data):
        req = validated_data["request"]
        return Review.objects.create(
            car=req.car,
            reviewer=self.context["request"].user,
            **validated_data,
        )


class ReviewUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["rating", "comment"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
