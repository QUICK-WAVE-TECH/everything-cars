import logging
import time

from django.conf import settings

from .models import Notification, NotificationType
from .email_service import send_email
from apps.users.models import User

logger = logging.getLogger("notifications")


def _fe(path=""):
    """Absolute frontend URL for email CTA buttons."""
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


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
            "[WS] Pushed to %s (Redis: %.0fms)",
            group,
            ws_ms,
        )
    except ImportError:
        logger.warning("[WS] Channels not installed — skipping push")
    except Exception as e:
        logger.error("[WS] Push failed: %s", e)


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
        notification_type,
        recipient.email,
        title,
        db_ms,
    )
    _push_ws(notif)
    return notif


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
    send_email(
        recipient=request_obj.customer.email,
        subject="Your request was approved",
        template_key="request_approved",
        context={
            "car_title": request_obj.car.title,
            "action_url": _fe(f"/customer/requests/{request_obj.id}"),
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

    send_email(
        recipient=request_obj.customer.email,
        subject="Payment confirmed",
        template_key="payment_confirmed",
        context={
            "car_title": request_obj.car.title,
            "amount": f"{request_obj.currency} {request_obj.price_offered}",
            "action_url": _fe(f"/customer/requests/{request_obj.id}"),
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


def notify_listing_submitted(car, resubmitted=False):
    """All staff get notified when a listing enters the review queue —
    either a brand-new listing or one resubmitted after changes."""
    staff_users = User.objects.filter(is_staff=True, is_active=True)
    title = (
        "Listing resubmitted for review"
        if resubmitted
        else "New listing awaiting review"
    )
    message = (
        f"The owner of {car.title} has made the requested changes — ready for re-review."
        if resubmitted
        else f"A new listing '{car.title}' is awaiting review."
    )
    owner_name = car.owner.get_full_name() or car.owner.email
    review_url = _fe("/admin/approvals")
    for staff in staff_users:
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.LISTING_SUBMITTED,
            title=title,
            message=message,
            data={"car_id": str(car.id), "car_title": car.title},
        )
        send_email(
            recipient=staff.email,
            subject=title,
            template_key="staff_new_listing",
            context={
                "car_title": car.title,
                "owner_name": owner_name,
                "review_url": review_url,
            },
        )


def notify_changes_requested(car):
    """Owner gets notified when staff requests changes to their listing."""
    _create_notification(
        recipient=car.owner,
        notification_type=NotificationType.CHANGES_REQUESTED,
        title="Changes requested on your listing",
        message=(
            f"Our team reviewed '{car.title}' and requested changes"
            + (f": {car.admin_note}" if car.admin_note else ".")
        ),
        data={"car_id": str(car.id), "car_title": car.title},
    )
    send_email(
        recipient=car.owner.email,
        subject="Action needed: changes to your listing",
        template_key="changes_requested",
        context={
            "car_title": car.title,
            "admin_note": car.admin_note or "",
            "action_url": _fe(f"/owner/my-cars/{car.id}"),
        },
    )


def notify_listing_approved(car):
    """Owner gets notified when staff approves their listing for inspection."""
    _create_notification(
        recipient=car.owner,
        notification_type=NotificationType.LISTING_APPROVED,
        title="Listing approved",
        message=(
            f"Your listing '{car.title}' has been approved — "
            "you can now book an inspection."
        ),
        data={"car_id": str(car.id), "car_title": car.title},
    )
    send_email(
        recipient=car.owner.email,
        subject="Your listing is approved — book an inspection",
        template_key="listing_approved",
        context={
            "car_title": car.title,
            "action_url": _fe(f"/owner/my-cars/{car.id}"),
        },
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


def notify_inspection_started(booking):
    """Owner gets notified when staff begins the physical inspection."""
    _create_notification(
        recipient=booking.booked_by,
        notification_type=NotificationType.INSPECTION_STARTED,
        title="Inspection in progress",
        message=f"The physical inspection of your {booking.car.title} has started.",
        data={
            "booking_id": str(booking.id),
            "car_id": str(booking.car_id),
            "car_title": booking.car.title,
        },
    )


def notify_needs_clearance(booking):
    """Owner gets notified when the inspection needs further clearance."""
    _create_notification(
        recipient=booking.booked_by,
        notification_type=NotificationType.NEEDS_CLEARANCE,
        title="Inspection needs further clearance",
        message=(
            f"Your {booking.car.title} needs further clearance before it can be "
            "published. Check your listing for what's required."
        ),
        data={
            "booking_id": str(booking.id),
            "car_id": str(booking.car_id),
            "car_title": booking.car.title,
            "staff_note": booking.staff_note,
        },
    )
    send_email(
        recipient=booking.booked_by.email,
        subject="Your inspection needs further clearance",
        template_key="inspection_needs_clearance",
        context={
            "car_title": booking.car.title,
            "clearance_note": booking.staff_note or "",
            "action_url": _fe(f"/owner/my-cars/{booking.car_id}"),
        },
    )


def notify_clearance_response(booking, response_message=""):
    """All staff get notified when an owner responds to a clearance request."""
    staff_users = User.objects.filter(is_staff=True, is_active=True)
    detail = (
        f': "{response_message}"' if response_message else " — ready for re-review."
    )
    for staff in staff_users:
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.CLEARANCE_RESPONSE,
            title="Clearance response received",
            message=(f"The owner of {booking.car.title} responded{detail}"),
            data={
                "booking_id": str(booking.id),
                "car_id": str(booking.car_id),
                "car_title": booking.car.title,
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
    send_email(
        recipient=booking.booked_by.email,
        subject="Passed! Your car is now live",
        template_key="inspection_passed",
        context={
            "first_name": booking.booked_by.first_name,
            "car_title": booking.car.title,
            "action_url": _fe(f"/cars/{booking.car_id}"),
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
    send_email(
        recipient=booking.booked_by.email,
        subject="Inspection outcome for your car",
        template_key="inspection_failed",
        context={
            "car_title": booking.car.title,
            "reason": booking.staff_note or "",
            "action_url": _fe(f"/owner/my-cars/{booking.car_id}"),
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


def notify_inspection_cancelled(booking):
    """All staff get notified when an owner cancels an inspection booking, so
    their queue and slot calendar free the slot in real time."""
    staff_users = User.objects.filter(is_staff=True, is_active=True)
    for staff in staff_users:
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.INSPECTION_CANCELLED,
            title="Inspection cancelled",
            message=f"{booking.booked_by.first_name} {booking.booked_by.last_name} cancelled the inspection for {booking.car.title} on {booking.slot.date.strftime('%b %d')}, {booking.slot.start_time.strftime('%I:%M %p')}",
            data={
                "booking_id": str(booking.id),
                "car_id": str(booking.car_id),
                "car_title": booking.car.title,
                "owner_name": f"{booking.booked_by.first_name} {booking.booked_by.last_name}",
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

    # Updated-appointment email to the owner.
    send_email(
        recipient=booking.booked_by.email,
        subject="Your inspection has been rescheduled",
        template_key="inspection_rescheduled",
        context={
            "car_title": booking.car.title,
            "date": booking.slot.date.strftime("%a, %d %b %Y"),
            "time": booking.slot.start_time.strftime("%I:%M %p").lstrip("0"),
            "center": booking.slot.center.company_name,
        },
    )


def notify_assistance_requested(assistance):
    """All staff get notified when an owner requests booking assistance"""
    staff_users = User.objects.filter(is_staff=True, is_active=True)
    car_title = assistance.car.title if assistance.car_id else "A vechile"
    for staff in staff_users:
        _create_notification(
            recipient=staff,
            notification_type=NotificationType.ASSISTANCE_REQUESTED,
            title="Booking request received",
            message=(
                f"{assistance.owner.get_full_name()} needs help booking an "
                f"inspection for {car_title} in {assistance.state or 'their area'}."
            ),
            data={
                "assistance_id": str(assistance.id),
                "owner_id": str(assistance.owner_id),
                "state": assistance.state,
            },
        )
        send_email(
            recipient=staff.email,
            subject="Owner needs booking assistance",
            template_key="staff_assistance_request",
            context={
                "owner_name": assistance.owner.get_full_name(),
                "state": assistance.state or "—",
                # Empty → the template hides the whole Message block.
                "message": assistance.message or "",
            },
        )


def notify_owner_verified(user):
    """Owner is notified (and emailed) when staff verifies their account."""
    _create_notification(
        recipient=user,
        notification_type=NotificationType.SYSTEM,
        title="Your account is verified",
        message="Your account has been verified — you can now list cars.",
        data={},
    )
    send_email(
        recipient=user.email,
        subject="You're verified — start listing",
        template_key="owner_verified",
        context={
            "first_name": user.first_name,
            "action_url": _fe("/owner/my-cars/new"),
        },
    )
