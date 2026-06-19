from django.urls import path
from .views import CarReviewListCreateView, ReviewDetailView

urlpatterns = [
    path(
        "cars/<uuid:car_id>/reviews",
        CarReviewListCreateView.as_view(),
        name="car-reviews",
    ),
    path(
        "reviews/<uuid:review_id>",
        ReviewDetailView.as_view(),
        name="review-detail",
    ),
]
