# Create your views here.
import logging

from django.conf import settings
from django.db import transaction

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, CustomerProfile, OwnerProfile, AccessCode
from .serializers import (
    CustomerProfileWriteSerializer,
    OwnerProfileSerializer,
    SignInSerializer,
    SignUpSerializer,
    VerifySerializer,
    MeSerializer,
    UserProfileSerializer,
)
from .services import (
    generate_and_send_code,
    issue_tokens,
    verify_refresh_token,
    blacklist_token,
)

logger = logging.getLogger(__name__)


class SignUpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Sign-up request data keys: %s", list(request.data.keys()))
        serializer = SignUpSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Sign-up validation errors: %s", serializer.errors)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            user = User.objects.create_user(
                email=data["email"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                password=data["password"],
                phone=data.get("phone", ""),
                role=data["role"],
            )

            if data["role"] == "customer":
                profile_serializer = CustomerProfileWriteSerializer(data=data)
                profile_serializer.is_valid(raise_exception=True)
                CustomerProfile.objects.create(
                    user=user, **profile_serializer.validated_data
                )
            elif data["role"] == "owner":
                OwnerProfile.objects.create(
                    user=user,
                    owner_type=data["owner_type"],
                    fleet_name=data.get("fleet_name", ""),
                    national_id=data.get("national_id", ""),
                    location=data.get("location", ""),
                    rc_number=data.get("rc_number", ""),
                    country=data.get("country", ""),
                    state=data.get("state", ""),
                    city=data.get("city", ""),
                    address=data.get("address", ""),
                    bank_account=data["bank_account"],
                    bank_name=data["bank_name"],
                    document=data.get("document"),
                )
            transaction.on_commit(
                lambda: generate_and_send_code(
                    email=user.email, purpose="sign_up_verify", user=user
                )
            )
        return Response(
            {
                "message": "Verification code sent to your email.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class SignInView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):

        serializer = SignInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(email__iexact=email, is_active=True)

        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.check_password(password):
            return Response(
                {"detail": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        generate_and_send_code(email=user.email, purpose="sign_in", user=user)

        return Response(
            {"message": "Access code sent to your email.", "email": user.email},
            status=status.HTTP_200_OK,
        )


class VerifyView(APIView):
    """
    Verify the user email, then proceed to check if the user exists in the system
    after which we verify the purpose for which they're coming, sign up or sign in and provide tokens
    """
    throttle_scope = "verify_code"

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        code_obj = AccessCode.verify_code(
            email=data["email"], code=data["code"], purpose=data["purpose"]
        )
        if code_obj is None:
            return Response(
                {"detail": "Invalid or expired access code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email__iexact=data["email"])

        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"}, status=status.HTTP_400_BAD_REQUEST
            )
        if data["purpose"] == "sign_up_verify" and not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])

        tokens = issue_tokens(user)

        response = Response(
            {
                "accessToken": tokens["access_token"],
                "userId": str(user.id),
                "role": user.role,
                "expiresIn": tokens["expires_in"],
            },
            status=status.HTTP_200_OK,
        )
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            secure=not settings.DEBUG,
            samesite="None" if not settings.DEBUG else "Lax",
            max_age=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS * 86400,
            path="/",
        )
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.COOKIES.get("refresh_token")
        if not token:
            return Response(
                {"detail": "Refresh token not provided"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        payload = verify_refresh_token(token)
        if payload is None:
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        blacklist_token(payload["jti"])

        try:
            user = User.objects.get(id=payload["sub"], is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_401_UNAUTHORIZED
            )
        tokens = issue_tokens(user)
        response = Response(
            {
                "accessToken": tokens["access_token"],
                "expiresIn": tokens["expires_in"],
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            secure=not settings.DEBUG,
            samesite="None" if not settings.DEBUG else "Lax",
            max_age=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS * 86400,
            path="/",
        )

        return response


class SignOutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.COOKIES.get("refresh_token")
        if token:
            payload = verify_refresh_token(token)
            if payload:
                blacklist_token(payload["jti"])

        response = Response({"message": "Signed out."}, status=status.HTTP_200_OK)
        response.delete_cookie("refresh_token", path="/")
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_user(self, request):
        """Fetch user with profiles in a single query."""
        return User.objects.select_related("customer_profile", "owner_profile").get(
            id=request.user.id
        )

    def get(self, request):
        user = self._get_user(request)
        serializer = MeSerializer(user)
        return Response(serializer.data)

    def patch(self, request):
        user = self._get_user(request)
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Re-fetch with profiles for the response
        user = self._get_user(request)
        return Response(MeSerializer(user).data)


class ResendCodeView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "resend_code"

    def post(self, request):
        email = request.data.get("email", "")
        purpose = request.data.get("purpose", "sign_in")

        if purpose not in ("sign_in", "sign_up_verify"):
            return Response(
                {"detail": "Invalid purpose"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist():
            # Do not reveal if the email exists
            return Response(
                {"message": "If this email is registered, a new code has been sent."},
                status=status.HTTP_200_OK,
            )

        generate_and_send_code(email=user.email, purpose=purpose, user=user)

        return Response(
            {"message": "If this email is registered, a new code has been sent."},
            status=status.HTTP_200_OK,
        )
