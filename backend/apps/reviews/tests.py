from rest_framework import status
from rest_framework.test import APITestCase

from apps.listings.models import Car, CarStatus, ListingType, Request, RequestStatus
from apps.reviews.models import Review
from apps.reviews.migration_helpers import delete_non_rent_reviews
from apps.users.models import CustomerProfile, OwnerProfile, User


def create_user(email, role, **extra):
    return User.objects.create_user(
        email=email,
        first_name=extra.pop("first_name", role.title()),
        last_name=extra.pop("last_name", "User"),
        password="securepass123",
        role=role,
        is_active=True,
        **extra,
    )


def create_owner_profile(user):
    return OwnerProfile.objects.create(
        user=user,
        owner_type=OwnerProfile.OwnerType.INDIVIDUAL,
        bank_account="1234567890",
        bank_name="Test Bank",
        is_verified=True,
    )


def create_customer_profile(user):
    return CustomerProfile.objects.create(user=user)


def create_car(owner):
    return Car.objects.create(
        owner=owner,
        title="Mercedes GLK 350",
        listing_type=ListingType.RENT,
        rent_price_per_day="40000.00",
        brand="Mercedes",
        model="GLK 350",
        year=2021,
        state="Lagos",
        city="Ikeja",
        status=CarStatus.PUBLISHED,
    )


class ReviewApiTests(APITestCase):
    def setUp(self):
        self.owner = create_user("review-owner@test.com", User.Role.OWNER)
        create_owner_profile(self.owner)
        self.customer = create_user("review-customer@test.com", User.Role.CUSTOMER)
        create_customer_profile(self.customer)
        self.other_customer = create_user("review-other@test.com", User.Role.CUSTOMER)
        create_customer_profile(self.other_customer)
        self.car = create_car(self.owner)
        self.completed_request = Request.objects.create(
            car=self.car,
            customer=self.customer,
            request_type=ListingType.RENT,
            price_offered="40000.00",
            duration_days=3,
            status=RequestStatus.COMPLETED,
        )

    def reviews_url(self):
        return f"/api/v1/listings/cars/{self.car.id}/reviews"

    def test_same_user_cannot_review_same_completed_request_twice(self):
        self.client.force_authenticate(user=self.customer)
        payload = {
            "request": str(self.completed_request.id),
            "rating": 5,
            "comment": "Smooth rental experience.",
        }

        first_response = self.client.post(self.reviews_url(), payload, format="json")
        second_response = self.client.post(self.reviews_url(), payload, format="json")

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            Review.objects.filter(
                request=self.completed_request,
                reviewer=self.customer,
            ).count(),
            1,
        )

    def test_customer_and_owner_in_completed_request_can_review(self):
        payload = {
            "request": str(self.completed_request.id),
            "rating": 5,
            "comment": "Great experience.",
        }

        self.client.force_authenticate(user=self.customer)
        customer_response = self.client.post(self.reviews_url(), payload, format="json")

        self.client.force_authenticate(user=self.owner)
        owner_response = self.client.post(
            self.reviews_url(),
            {
                **payload,
                "rating": 4,
                "comment": "Responsible customer.",
            },
            format="json",
        )

        self.assertEqual(customer_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(owner_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Review.objects.filter(request=self.completed_request).count(), 2
        )

    def test_uninvolved_user_cannot_review_request(self):
        self.client.force_authenticate(user=self.other_customer)

        response = self.client.post(
            self.reviews_url(),
            {
                "request": str(self.completed_request.id),
                "rating": 5,
                "comment": "I was not part of this request.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 0)

    def test_request_must_be_completed_before_review(self):
        pending_request = Request.objects.create(
            car=self.car,
            customer=self.customer,
            request_type=ListingType.RENT,
            price_offered="40000.00",
            duration_days=3,
            status=RequestStatus.ACTIVE,
        )
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            self.reviews_url(),
            {
                "request": str(pending_request.id),
                "rating": 5,
                "comment": "Too early.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 0)


class RentOnlyReviewTest(APITestCase):
    def setUp(self):
        self.owner = create_user("ro-owner@test.com", User.Role.OWNER)
        create_owner_profile(self.owner)
        self.customer = create_user("ro-customer@test.com", User.Role.CUSTOMER)
        create_customer_profile(self.customer)
        self.buy_car = Car.objects.create(
            owner=self.owner,
            title="Buy Car",
            listing_type=ListingType.BUY,
            sale_price="5000000.00",
            is_negotiable=False,
            brand="Toyota",
            model="Camry",
            year=2021,
            state="Lagos",
            city="Ikeja",
            status=CarStatus.PUBLISHED,
        )
        self.buy_request = Request.objects.create(
            car=self.buy_car,
            customer=self.customer,
            request_type=ListingType.BUY,
            price_offered="5000000.00",
            status=RequestStatus.COMPLETED,
        )

    def _url(self, car):
        return f"/api/v1/listings/cars/{car.id}/reviews"

    def test_buy_car_reviews_get_returns_empty(self):
        res = self.client.get(self._url(self.buy_car))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["results"], [])
        self.assertEqual(res.data["review_count"], 0)

    def test_review_post_on_buy_car_400(self):
        self.client.force_authenticate(user=self.customer)
        res = self.client.post(
            self._url(self.buy_car),
            {
                "request": str(self.buy_request.id),
                "rating": 5,
                "comment": "Nice car.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rental listings", str(res.data))

    def test_review_post_on_rent_car_ok(self):
        rent_car = create_car(self.owner)  # helper builds a rent car
        req = Request.objects.create(
            car=rent_car,
            customer=self.customer,
            request_type=ListingType.RENT,
            price_offered="40000.00",
            duration_days=3,
            status=RequestStatus.COMPLETED,
        )
        self.client.force_authenticate(user=self.customer)
        res = self.client.post(
            self._url(rent_car),
            {
                "request": str(req.id),
                "rating": 5,
                "comment": "Great.",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)


class DeleteNonRentReviewsMigrationTest(APITestCase):
    """Pins the data-migration behaviour: reviews only survive on rent cars."""

    def test_non_rent_reviews_deleted_rent_kept(self):
        owner = create_user("purge-owner@test.com", User.Role.OWNER)
        create_owner_profile(owner)
        customer = create_user("purge-customer@test.com", User.Role.CUSTOMER)
        create_customer_profile(customer)

        rent_car = create_car(owner)
        buy_car = Car.objects.create(
            owner=owner, title="Buy Car", listing_type=ListingType.BUY,
            sale_price="5000000.00", brand="Toyota", model="Land Cruiser",
            year=2023, state="Lagos", city="Ikeja", status=CarStatus.PUBLISHED,
        )

        def make_review(car, request_type, **extra):
            req = Request.objects.create(
                car=car, customer=customer, request_type=request_type,
                price_offered="40000.00", status=RequestStatus.COMPLETED, **extra,
            )
            return Review.objects.create(
                car=car, request=req, reviewer=customer, rating=4, comment="ok",
            )

        rent_review = make_review(rent_car, ListingType.RENT, duration_days=3)
        buy_review = make_review(buy_car, ListingType.BUY)

        delete_non_rent_reviews(Review)

        self.assertTrue(Review.objects.filter(id=rent_review.id).exists())
        self.assertFalse(Review.objects.filter(id=buy_review.id).exists())
