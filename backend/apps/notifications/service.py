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
    """Customer gets notified when rental becomes active."""
    _create_notification(
        recipient=request_obj.customer,
        notification_type=NotificationType.RENTAL_ACTIVE,
        title="Rental is active",
        message=f"Your rental of {request_obj.car.title} is now active. Enjoy your drive!",
        data={
            "request_id": str(request_obj.id),
            "car_id": str(request_obj.car_id),
            "car_title": request_obj.car.title,
        },
    )


def notify_rental_completed(request_obj):
    """Customer gets notified when rental is complete."""
    _create_notification(
        recipient=request_obj.customer,
        notification_type=NotificationType.RENTAL_COMPLETED,
        title="Rental completed",
        message=f"Your rental of {request_obj.car.title} is now complete. Consider leaving a review!",
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


def notify_listing_submitted(car):
    """Staff gets notified when owner submits car for review."""
    staff_users = User.objects.filter(is_staff=True, is_active=True)
    for staff in staff_users:
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.LISTING_SUBMITTED,
            title="New listing for review",
            message=f"{car.owner.first_name} submitted '{car.title}' for review.",
            data={
                "car_id": str(car.id),
                "car_title": car.title,
                "owner_name": f"{car.owner.first_name} {car.owner.last_name}",
            },
        )


def notify_listing_approved(car):
    """Owner gets notified when staff approves their listing."""
    _create_notification(
        recipient=car.owner,
        notification_type=NotificationType.LISTING_APPROVED,
        title="Listing published",
        message=f"Your listing '{car.title}' has been approved and is now live!",
        data={"car_id": str(car.id), "car_title": car.title},
    )


def notify_listing_rejected(car):
    """Owner gets notified when staff suspends their listing."""
    _create_notification(
        recipient=car.owner,
        notification_type=NotificationType.LISTING_REJECTED,
        title="Listing suspended",
        message=f"Your listing '{car.title}' has been suspended by admin.",
        data={"car_id": str(car.id), "car_title": car.title},
    )


def notify_listing_needs_changes(car):
    """Owner gets notified when staff requests changes."""
    _create_notification(
        recipient=car.owner,
        notification_type=NotificationType.LISTING_NEEDS_CHANGES,
        title="Changes requested on listing",
        message=f"Admin has requested changes to '{car.title}': {car.admin_note}",
        data={
            "car_id": str(car.id),
            "car_title": car.title,
            "admin_note": car.admin_note,
        },
    )
