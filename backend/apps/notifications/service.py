import logging
import time

from .models import Notification, NotificationType
from apps.users.models import User

logger = logging.getLogger("notifications")


def _create_notification(
    recipient,
    notification_type,
    title,
    message="",
    data=None,
):
    """Create a notification and push via WebSocket if available."""
    t0 = time.time()
    notif = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        data=data or {},
    )
    db_ms = (time.time() - t0) * 1000
    logger.info(
        "[NOTIF] Created %s for %s — '%s' (DB: %.0fms)",
        notification_type, recipient.email, title, db_ms,
    )
    _push_ws(notif)
    return notif


def _push_ws(notif):
    """Push notification to user's WebSocket group. No-op if Channels not configured."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.warning("[WS] No channel layer configured — skipping push")
            return

        t0 = time.time()
        group = f"user_{notif.recipient_id}"
        async_to_sync(channel_layer.group_send)(
            group,
            {
                "type": "notification.send",
                "payload": {
                    "id": str(notif.id),
                    "notification_type": notif.notification_type,
                    "title": notif.title,
                    "message": notif.message,
                    "data": notif.data,
                    "created_at": notif.created_at.isoformat(),
                },
            },
        )
        ws_ms = (time.time() - t0) * 1000
        logger.info(
            "[WS] Pushed to %s (Redis: %.0fms)", group, ws_ms,
        )
    except ImportError:
        logger.warning("[WS] Channels not installed — skipping push")
    except Exception as e:
        logger.error("[WS] Push failed: %s", e)


# ── Request notifications ──


def notify_new_request(request_obj):
    """Owner gets notified when customer creates a request."""
    _create_notification(
        recipient=request_obj.car.owner,
        notification_type=NotificationType.REQUEST_RECEIVED,
        title="New request received",
        message=f"{request_obj.customer.first_name} wants to {request_obj.request_type} your {request_obj.car.title}",
        data={
            "request_id": str(request_obj.id),
            "car_id": str(request_obj.car_id),
            "car_title": request_obj.car.title,
            "customer_name": f"{request_obj.customer.first_name} {request_obj.customer.last_name}",
        },
    )


def notify_request_approved(request_obj):
    """Customer gets notified when owner approves."""
    _create_notification(
        recipient=request_obj.customer,
        notification_type=NotificationType.REQUEST_APPROVED,
        title="Request approved",
        message=f"Your {request_obj.request_type} request for {request_obj.car.title} has been approved. Proceed to payment.",
        data={
            "request_id": str(request_obj.id),
            "car_id": str(request_obj.car_id),
            "car_title": request_obj.car.title,
        },
    )


def notify_request_rejected(request_obj):
    """Customer gets notified when owner rejects."""
    _create_notification(
        recipient=request_obj.customer,
        notification_type=NotificationType.REQUEST_REJECTED,
        title="Request declined",
        message=f"Your {request_obj.request_type} request for {request_obj.car.title} was declined.",
        data={
            "request_id": str(request_obj.id),
            "car_id": str(request_obj.car_id),
            "car_title": request_obj.car.title,
        },
    )


def notify_request_cancelled(request_obj):
    """Owner gets notified when customer cancels."""
    _create_notification(
        recipient=request_obj.car.owner,
        notification_type=NotificationType.REQUEST_CANCELLED,
        title="Request cancelled",
        message=f"{request_obj.customer.first_name} cancelled their {request_obj.request_type} request for {request_obj.car.title}.",
        data={
            "request_id": str(request_obj.id),
            "car_id": str(request_obj.car_id),
            "car_title": request_obj.car.title,
        },
    )


# ── Payment notifications ──


def notify_payment_submitted(request_obj):
    """All staff get notified when customer submits payment."""
    staff_users = User.objects.filter(is_staff=True, is_active=True)
    for staff in staff_users:
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.PAYMENT_SUBMITTED,
            title="Payment needs verification",
            message=f"{request_obj.customer.first_name} submitted payment for {request_obj.car.title}",
            data={
                "request_id": str(request_obj.id),
                "car_id": str(request_obj.car_id),
                "car_title": request_obj.car.title,
                "amount": str(request_obj.price_offered),
                "currency": request_obj.currency,
            },
        )


def notify_payment_confirmed(request_obj):
    """Customer + Owner get notified when staff confirms payment."""
    for recipient in [request_obj.customer, request_obj.car.owner]:
        _create_notification(
            recipient=recipient,
            notification_type=NotificationType.PAYMENT_CONFIRMED,
            title="Payment confirmed",
            message=f"Payment for {request_obj.car.title} has been verified and confirmed.",
            data={
                "request_id": str(request_obj.id),
                "car_id": str(request_obj.car_id),
                "car_title": request_obj.car.title,
            },
        )


# ── Rental lifecycle notifications ──


def notify_rental_active(request_obj):
    """Customer gets notified when rental/purchase becomes active."""
    is_buy = request_obj.request_type == "buy"
    _create_notification(
        recipient=request_obj.customer,
        notification_type=NotificationType.RENTAL_ACTIVE,
        title="Purchase is active" if is_buy else "Rental is active",
        message=(
            f"Your purchase of {request_obj.car.title} is now being processed. Ownership transfer in progress!"
            if is_buy
            else f"Your rental of {request_obj.car.title} is now active. Enjoy your drive!"
        ),
        data={
            "request_id": str(request_obj.id),
            "car_id": str(request_obj.car_id),
            "car_title": request_obj.car.title,
        },
    )


def notify_rental_completed(request_obj):
    """Customer gets notified when rental/purchase is complete."""
    is_buy = request_obj.request_type == "buy"
    _create_notification(
        recipient=request_obj.customer,
        notification_type=NotificationType.RENTAL_COMPLETED,
        title="Purchase completed" if is_buy else "Rental completed",
        message=(
            f"Your purchase of {request_obj.car.title} is complete. Congratulations on your new car!"
            if is_buy
            else f"Your rental of {request_obj.car.title} is now complete. Consider leaving a review!"
        ),
        data={
            "request_id": str(request_obj.id),
            "car_id": str(request_obj.car_id),
            "car_title": request_obj.car.title,
        },
    )


def notify_auto_rejected(request_obj, reason="Car has been sold"):
    """Customer gets notified their request was auto-rejected."""
    _create_notification(
        recipient=request_obj.customer,
        notification_type=NotificationType.REQUESTS_AUTO_REJECTED,
        title="Request auto-declined",
        message=f"Your request for {request_obj.car.title} was automatically declined — {reason}.",
        data={
            "request_id": str(request_obj.id),
            "car_id": str(request_obj.car_id),
            "car_title": request_obj.car.title,
        },
    )


def notify_listing_suspended(car):
    """Owner gets notified when staff suspends their listing."""
    _create_notification(
        recipient=car.owner,
        notification_type=NotificationType.LISTING_SUSPENDED,
        title="Listing suspended",
        message=f"Your listing '{car.title}' has been suspended by admin.",
        data={"car_id": str(car.id), "car_title": car.title},
    )


# ── Inspection notifications ──


def notify_inspection_booked(booking):
    """All staff get notified when owner books an inspection."""
    staff_users = User.objects.filter(is_staff=True, is_active=True)
    for staff in staff_users:
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.INSPECTION_BOOKED,
            title="New inspection booking",
            message=f"{booking.booked_by.first_name} {booking.booked_by.last_name} booked an inspection for {booking.car.title} on {booking.slot.date.strftime('%b %d')}, {booking.slot.start_time.strftime('%I:%M %p')}",
            data={
                "booking_id": str(booking.id),
                "car_id": str(booking.car_id),
                "car_title": booking.car.title,
                "owner_name": f"{booking.booked_by.first_name} {booking.booked_by.last_name}",
            },
        )


def notify_inspection_booking_approved(booking):
    """Owner gets notified when staff approves their inspection booking."""
    _create_notification(
        recipient=booking.booked_by,
        notification_type=NotificationType.INSPECTION_BOOKING_APPROVED,
        title="Inspection booking confirmed",
        message=f"Your inspection for {booking.car.title} has been confirmed for {booking.slot.date.strftime('%b %d')}, {booking.slot.start_time.strftime('%I:%M %p')}",
        data={
            "booking_id": str(booking.id),
            "car_id": str(booking.car_id),
            "car_title": booking.car.title,
        },
    )


def notify_inspection_booking_rejected(booking):
    """Owner gets notified when staff rejects their booking at review."""
    _create_notification(
        recipient=booking.booked_by,
        notification_type=NotificationType.INSPECTION_BOOKING_REJECTED,
        title="Inspection booking rejected",
        message=f"Your inspection booking for {booking.car.title} was rejected. Check your listing for details.",
        data={
            "booking_id": str(booking.id),
            "car_id": str(booking.car_id),
            "car_title": booking.car.title,
            "staff_note": booking.staff_note,
        },
    )


def notify_inspection_passed(booking):
    """Owner gets notified when car passes inspection — listing is now live."""
    _create_notification(
        recipient=booking.booked_by,
        notification_type=NotificationType.INSPECTION_PASSED,
        title="Inspection passed — listing is live!",
        message=f"Your {booking.car.title} passed inspection and is now visible to customers.",
        data={
            "booking_id": str(booking.id),
            "car_id": str(booking.car_id),
            "car_title": booking.car.title,
        },
    )


def notify_inspection_failed(booking):
    """Owner gets notified when car fails physical inspection."""
    _create_notification(
        recipient=booking.booked_by,
        notification_type=NotificationType.INSPECTION_FAILED,
        title="Inspection did not pass",
        message=f"Your {booking.car.title} did not pass inspection. See staff feedback for next steps.",
        data={
            "booking_id": str(booking.id),
            "car_id": str(booking.car_id),
            "car_title": booking.car.title,
            "staff_note": booking.staff_note,
        },
    )


def notify_inspection_no_show(booking):
    """Owner gets notified when staff marks them as no-show."""
    remaining = 2 - booking.reschedule_count
    _create_notification(
        recipient=booking.booked_by,
        notification_type=NotificationType.INSPECTION_NO_SHOW,
        title="Missed inspection appointment",
        message=f"You missed your inspection for {booking.car.title}. You can rebook ({remaining} reschedule{'s' if remaining != 1 else ''} remaining).",
        data={
            "booking_id": str(booking.id),
            "car_id": str(booking.car_id),
            "car_title": booking.car.title,
            "reschedules_remaining": str(remaining),
        },
    )


def notify_inspection_rescheduled(booking):
    """All staff get notified when owner reschedules inspection."""
    staff_users = User.objects.filter(is_staff=True, is_active=True)
    for staff in staff_users:
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.INSPECTION_RESCHEDULED,
            title="Inspection rescheduled",
            message=f"{booking.booked_by.first_name} {booking.booked_by.last_name} rescheduled inspection for {booking.car.title} to {booking.slot.date.strftime('%b %d')}, {booking.slot.start_time.strftime('%I:%M %p')}",
            data={
                "booking_id": str(booking.id),
                "car_id": str(booking.car_id),
                "car_title": booking.car.title,
                "owner_name": f"{booking.booked_by.first_name} {booking.booked_by.last_name}",
            },
        )
