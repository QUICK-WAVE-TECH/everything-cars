# Create your views here.
import logging

from django.conf import settings
from django.db import transaction

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPagination
from common.permissions import IsStaff
from .models import PasswordResetToken, User, CustomerProfile, OwnerProfile, AccessCode
from .serializers import (
    AdminOwnerSerializer,
    ChangePasswordSerializer,
    CustomerProfileSerializer,
    CustomerProfileWriteSerializer,
    ForgotPasswordSerializer,
    OwnerProfileSerializer,
    ResetPasswordSerializer,
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
    is_suspended_team_member,
    SUSPENDED_MESSAGE,
)

logger = logging.getLogger(__name__)

LOCKED_OWNER_IDENTITY_FIELDS = {"id_type", "national_id", "id_document"}


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
                    document=data.get("document"),
                    id_type=data.get("id_type", ""),
                    id_document=data.get("id_document"),
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
            user = User.objects.get(email__iexact=email)
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

        # A suspended team member cannot sign in — no access code is sent.
        if is_suspended_team_member(user):
            return Response(
                {"detail": SUSPENDED_MESSAGE},
                status=status.HTTP_403_FORBIDDEN,
            )

        # User exists and password is correct but account not verified
        if not user.is_active:
            generate_and_send_code(
                email=user.email, purpose="sign_up_verify", user=user
            )
            return Response(
                {
                    "detail": "Account not verified. A new verification code has been sent.",
                    "email": user.email,
                    "requires_verification": True,
                },
                status=status.HTTP_403_FORBIDDEN,
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

        if is_suspended_team_member(user):
            return Response(
                {"detail": SUSPENDED_MESSAGE},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        if is_suspended_team_member(user):
            return Response(
                {"detail": SUSPENDED_MESSAGE},
                status=status.HTTP_401_UNAUTHORIZED,
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
        if user.role == "owner" and hasattr(user, "owner_profile"):
            locked_fields = LOCKED_OWNER_IDENTITY_FIELDS.intersection(request.data)
            if locked_fields:
                return Response(
                    {
                        field: "Means of identity cannot be edited from profile."
                        for field in sorted(locked_fields)
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Update the profile fields based on th role
        # # Re-fetch with profiles for the response
        if user.role == "customer" and hasattr(user, "customer_profile"):
            profile_serializer = CustomerProfileSerializer(
                user.customer_profile, data=request.data, partial=True
            )
            profile_serializer.is_valid(raise_exception=True)
            profile_serializer.save()

        elif user.role == "owner" and hasattr(user, "owner_profile"):
            profile_serializer = OwnerProfileSerializer(
                user.owner_profile, data=request.data, partial=True
            )
            profile_serializer.is_valid(raise_exception=True)
            profile_serializer.save()

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


class ForgotPasswordView(APIView):

    permission_classes = [AllowAny]
    throttle_scope = "resend_code"

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email__iexact=email)

        except User.DoesNotExist:
            # Don't reveal if email exists
            pass
        else:
            token_obj = PasswordResetToken.create_token(user)
            # ? In prod we'll turn this to an email instead of printing with console
            frontend_url = settings.FRONTEND_URL.rstrip("/")
            reset_url = f"{frontend_url}/reset-password?token={token_obj.plain_token}"
            if settings.RESEND_API_KEY:
                try:
                    import resend

                    resend.api_key = settings.RESEND_API_KEY
                    resend.Emails.send(
                        {
                            "from": settings.DEFAULT_FROM_EMAIL,
                            "to": [email],
                            "subject": "Reset your EverythingCars Password",
                            "text": (
                                "Click this link to reset your password:\n\n"
                                f"{reset_url}\n\n"
                                "This link expires in 30 minutes."
                            ),
                        }
                    )
                except Exception:
                    logger.exception(
                        "Failed to send password reset email for user %s", user.id
                    )
            else:
                # No Resend key (dev / self-hosted): send through the app's
                # email service so it goes wherever EMAIL_BACKEND points —
                # Mailpit in dev — instead of only printing to the console.
                from apps.notifications.email_service import send_email

                send_email(
                    recipient=email,
                    subject="Reset your EverythingCars Password",
                    template_key="auth_password_reset",
                    context={"reset_url": reset_url},
                )

        return Response(
            {"message": "If this email is registered, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_obj = PasswordResetToken.verify_token(serializer.validated_data["token"])
        if token_obj is None:
            return Response(
                {
                    "detail": "Invalid or expired reset link..",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = token_obj.user
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password reset successfully. You can now sign in."},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"detail": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        return Response(
            {"message": "Password changed successfully"},
            status=status.HTTP_200_OK,
        )


class AdminOwnerListView(APIView):
    """Staff review queue for owner KYC verification."""

    permission_classes = [IsStaff]

    def get(self, request):
        qs = OwnerProfile.objects.select_related("user").order_by(
            "is_verified", "-created_at"
        )
        verified = request.query_params.get("verified")
        if verified is not None:
            qs = qs.filter(is_verified=verified.lower() == "true")

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AdminOwnerSerializer(
            page, many=True, context={"request": request}
        )
        return paginator.get_paginated_response(serializer.data)


class AdminOwnerVerifyView(APIView):
    """Staff mark an owner verified (or revoke verification)."""

    permission_classes = [IsStaff]

    def post(self, request, user_id):
        from apps.notifications.service import notify_owner_verified

        try:
            profile = OwnerProfile.objects.select_related("user").get(user_id=user_id)
        except OwnerProfile.DoesNotExist:
            return Response(
                {"detail": "Owner not found."}, status=status.HTTP_404_NOT_FOUND
            )

        verify = request.data.get("verify", True)
        was_verified = profile.is_verified
        profile.is_verified = bool(verify)
        profile.save(update_fields=["is_verified"])

        # Notify + email only on a fresh verification (not on re-saves or revokes).
        if profile.is_verified and not was_verified:
            transaction.on_commit(
                lambda: notify_owner_verified(profile.user), robust=True
            )

        return Response(
            AdminOwnerSerializer(profile, context={"request": request}).data
        )
