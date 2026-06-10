from django.urls import path
from apps.users.views import (
    ForgotPasswordView,
    ResendCodeView,
    ResetPasswordView,
    SignUpView,
    SignInView,
    VerifyView,
    RefreshView,
    SignOutView,
)

urlpatterns = [
    path("sign-up", SignUpView.as_view(), name="auth-sign-up"),
    path("sign-in", SignInView.as_view(), name="auth-sign-in"),
    path("verify", VerifyView.as_view(), name="auth-verify"),
    path("refresh", RefreshView.as_view(), name="auth-refresh"),
    path("sign-out", SignOutView.as_view(), name="auth-sign-out"),
    path("resend", ResendCodeView.as_view(), name="auth-resend"),
    path("forgot-password", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password", ResetPasswordView.as_view(), name="auth-reset-password"),
]
