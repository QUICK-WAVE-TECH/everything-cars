"""Reusable transactional-email layer.

One entry point — ``send_email`` — renders an ``emails/<template_key>.html``
design template with the given context, sends it as a multipart (HTML + plain
text) message, and records the attempt in ``EmailLog``. Feature-specific helpers
(e.g. ``send_booking_confirmation``) just assemble a context and delegate here, so
adding a new email is one helper + one template, no new plumbing.

Sending never raises: a mail-server hiccup must not roll back the action that
triggered the email (a booking, an approval, …). Failures are logged to
``EmailLog`` and the application logger instead.
"""

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from .models import EmailLog

logger = logging.getLogger("notifications")


def _brand_context():
    """Context every email gets — the header logo, served from the frontend."""
    base = settings.FRONTEND_URL.rstrip("/")
    return {"logo_url": f"{base}/logo.png"}


def _plain_text(html):
    """Best-effort plain-text alternative from the rendered HTML.

    Mail clients that refuse HTML fall back to this. strip_tags leaves a lot of
    blank lines behind, so collapse them into something readable.
    """
    text = strip_tags(html)
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def send_email(*, recipient, subject, template_key, context, booking=None):
    """Render ``emails/<template_key>.html``, send it, and log the attempt.

    Returns the saved :class:`EmailLog` row. Never raises.
    """
    log = EmailLog(
        recipient=recipient,
        subject=subject,
        template_key=template_key,
        booking=booking,
    )
    try:
        html_body = render_to_string(
            f"emails/{template_key}.html", {**_brand_context(), **context}
        )
        message = EmailMultiAlternatives(
            subject=subject,
            body=_plain_text(html_body),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
        )
        message.attach_alternative(html_body, "text/html")
        message.send()
        log.success = True
    except Exception as exc:  # noqa: BLE001 — email must never break the caller
        log.error = str(exc)
        logger.error(
            "[EMAIL] Failed sending %s to %s: %s", template_key, recipient, exc
        )
    log.save()
    return log


def send_assistance_received(assistance):
    """Owner confirmation that their booking-assistance request was received."""
    return send_email(
        recipient=assistance.owner.email,
        subject="We got your request for help",
        template_key="assistance_received",
        context={
            "first_name": assistance.owner.first_name,
            "state": assistance.state or "your area",
        },
    )


def send_assistance_booked(booking):
    """Owner email when staff books an inspection on their behalf."""
    slot = booking.slot
    center = slot.center
    return send_email(
        recipient=booking.booked_by.email,
        subject="We booked your inspection",
        template_key="assistance_booked_for_you",
        context={
            "first_name": booking.booked_by.first_name,
            "car_title": booking.car.title,
            "date": slot.date.strftime("%a, %d %b %Y"),
            "time": slot.start_time.strftime("%I:%M %p").lstrip("0"),
            "center": center.company_name,
            "address": center.address,
            "tracking_id": booking.car.tracking_id,
        },
        booking=booking,
    )


def send_booking_confirmation(booking):
    """Inspection booking confirmed — tells the attendee to bring a valid ID.

    ``attendee_type``/``rep_name`` are read defensively via ``getattr`` so this
    works before the attendee fields land (Task 4) and afterward.
    """
    slot = booking.slot
    center = slot.center

    attendee_type = getattr(booking, "attendee_type", "self")
    if attendee_type == "representative":
        attendee_display = f"{getattr(booking, 'rep_name', '')} (representative)"
    else:
        attendee_display = f"{booking.booked_by.get_full_name()} (owner)"

    context = {
        "car_title": booking.car.title,
        "date": slot.date.strftime("%a, %d %b %Y"),
        "time": slot.start_time.strftime("%I:%M %p").lstrip("0"),
        "center": center.company_name,
        "address": center.address,
        "tracking_id": booking.car.tracking_id,
        "attendee_display": attendee_display,
    }
    return send_email(
        recipient=booking.booked_by.email,
        subject="Your inspection is confirmed — bring a valid ID",
        template_key="inspection_booking_confirmed",
        context=context,
        booking=booking,
    )
