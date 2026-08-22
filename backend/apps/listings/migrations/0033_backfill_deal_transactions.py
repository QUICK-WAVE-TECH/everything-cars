from django.db import migrations


def backfill(apps, schema_editor):
    """Record a completed purchase transaction for each existing completed deal
    that doesn't already have one, so negotiated sales count toward revenue.
    Skips cars that already have a completed purchase transaction (no double
    counting), and back-dates the row to the deal's completion time."""
    Deal = apps.get_model("sales", "Deal")
    Transaction = apps.get_model("listings", "Transaction")

    for deal in Deal.objects.filter(status="completed"):
        if Transaction.objects.filter(deal_id=deal.id).exists():
            continue
        if Transaction.objects.filter(
            request__car_id=deal.car_id,
            transaction_type="purchase",
            status="completed",
        ).exists():
            continue
        txn = Transaction.objects.create(
            deal_id=deal.id,
            payer_id=deal.buyer_id,
            receiver_id=deal.seller_id,
            amount=deal.agreed_amount,
            currency=deal.currency,
            transaction_type="purchase",
            status="completed",
            payment_method="manual",
            reference=f"DEAL-{deal.id.hex[:12].upper()}",
        )
        stamp = deal.completed_at or deal.created_at
        if stamp:
            Transaction.objects.filter(pk=txn.pk).update(created_at=stamp)


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0032_transaction_deal"),
        ("sales", "0003_deal_dispute_resolution_deal_dispute_resolution_note_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
