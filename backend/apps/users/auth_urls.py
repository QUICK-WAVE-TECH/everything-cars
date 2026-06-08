from django.urls import path
from apps.users.views import (
    ResendCodeView,
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
]
