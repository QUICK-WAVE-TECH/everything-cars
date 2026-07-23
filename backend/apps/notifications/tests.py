# Create your tests here.
class OfferNotificationTest(APITestCase):
    def test_placing_an_offer_notifies_both_sides(self):
        owner = create_user("t7-owner@test.com", "owner")
        customer = create_user("t7-cust@test.com")
        car = create_negotiable_car(owner)
        self.client.force_authenticate(user=customer)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(
                f"/api/v1/offers/cars/{car.id}/offers",
                {"amount": "16500000.00"},
                format="json",
            )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(
            Notification.objects.filter(
                recipient=owner, notification_type="offer_received"
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=customer, notification_type="offer_submitted"
            ).exists()
        )
