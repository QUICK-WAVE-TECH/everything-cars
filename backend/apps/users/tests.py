import pytest
from apps.users.models import User


@pytest.mark.django_db
class TestUserModel:
    def test_create_customer(self):
        user = User.objects.create_user(
            email="customer@test.com",
            name="Test Customer",
            password="testpass123",
            role="customer",
        )
        assert user.email == "customer@test.com"
        assert user.role == "customer"
        assert user.is_active is False
        assert user.check_password("testpass123")

    def test_create_owner(self):
        user = User.objects.create_user(
            email="owner@test.com",
            name="Test Owner",
            password="testpass123",
            role="owner",
        )
        assert user.role == "owner"

    def test_email_required(self):
        with pytest.raises(ValueError, match="email"):
            User.objects.create_user(email="", name="No Email", password="testpass123")

    def test_password_required(self):
        with pytest.raises(ValueError, match="password"):
            User.objects.create_user(email="x@test.com", name="No Pass", password=None)
