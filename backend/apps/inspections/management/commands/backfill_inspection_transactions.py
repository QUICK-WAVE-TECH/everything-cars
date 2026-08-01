from django.core.management.base import BaseCommand

from apps.inspections.models import InspectionPayment, InspectionPaymentStatus
from apps.listings.models import Transaction, TransactionStatus, TransactionType


class Command(BaseCommand):
    help = (
        "Write a ledger Transaction for any confirmed inspection payment that "
        "predates the transactions-ledger feature. Idempotent."
    )

    def handle(self, *args, **options):
        confirmed = InspectionPayment.objects.filter(
            status=InspectionPaymentStatus.CONFIRMED
        ).select_related("booking", "booking__booked_by")

        created = 0
        skipped = 0
        for payment in confirmed:
            booking = payment.booking
            if Transaction.objects.filter(
                inspection_booking=booking,
                transaction_type=TransactionType.INSPECTION,
            ).exists():
                skipped += 1
                continue
            Transaction.objects.create(
                inspection_booking=booking,
                payer=booking.booked_by,
                amount=payment.total,
                currency=payment.currency,
                transaction_type=TransactionType.INSPECTION,
                payment_method=payment.payment_method,
                status=TransactionStatus.COMPLETED,
                reference=f"INSP-{booking.id.hex[:12].upper()}",
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Backfilled {created} inspection transaction(s); skipped {skipped}."
            )
        )
