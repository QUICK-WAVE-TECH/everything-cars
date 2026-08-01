# Notification tests live with their fixtures in apps/offers/tests.py
# (offer notifications) and alongside each feature that emits them.

from decimal import Decimal

from django.test import TestCase

from apps.notifications.models import Notification, NotificationType


class InspectionPaymentNotificationTest(TestCase):
    def test_notify_submitted_pings_all_staff(self):
        from apps.inspections.models import (
            BookingStatus,
            InspectionBooking,
            InspectionPayment,
        )
        from apps.inspections.tests import make_booking_ctx
        from apps.notifications.service import notify_inspection_payment_submitted
        from apps.users.models import User

        staff = User.objects.create_user(
            email="pay-notif-staff@t.com",
            first_name="S",
            last_name="T",
            password="pw12345678",
            role="customer",
            is_active=True,
            is_staff=True,
        )
        ctx = make_booking_ctx()
        booking = InspectionBooking.objects.create(
            car=ctx["car"],
            slot=ctx["slot"],
            booked_by=ctx["owner"],
            status=BookingStatus.AWAITING_PAYMENT,
        )
        InspectionPayment.objects.create(
            booking=booking,
            inspection_fee=Decimal("1"),
            listing_fee=Decimal("1"),
            vat_amount=Decimal("0"),
            total=Decimal("2"),
            receipt="x.pdf",
        )
        notify_inspection_payment_submitted(booking)
        self.assertTrue(
            Notification.objects.filter(
                recipient=staff,
                notification_type=NotificationType.INSPECTION_PAYMENT_SUBMITTED,
            ).exists()
        )
