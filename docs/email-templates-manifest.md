# EverythingCars — Email Template Manifest

Handoff for design. Each entry = one HTML template (`emails/<key>.html`) with a
plain-text fallback (`emails/<key>.txt`). `{{ }}` shows the dynamic context each
template receives. Recipient and trigger noted for context.

Brand: solid white surfaces, brc design tokens (primary green, rounded), logo header,
footer with support contact + unsubscribe (for non-critical). Mobile-first.

---

## 🔐 Account & Auth

| key | subject | recipient | context |
|-----|---------|-----------|---------|
| `auth_login_code` | Your EverythingCars login code | user | `{{ code }}`, `{{ expires_minutes }}` |
| `auth_signup_code` | Verify your email — your code inside | new user | `{{ code }}`, `{{ expires_minutes }}` |
| `auth_password_reset` | Reset your EverythingCars password | user | `{{ reset_url }}`, `{{ expires_minutes }}` |
| `welcome_owner` | Welcome to EverythingCars | owner | `{{ first_name }}` |
| `welcome_customer` | Welcome to EverythingCars | customer | `{{ first_name }}` |
| `owner_verified` | You're verified — start listing | owner | `{{ first_name }}` |

## 🚗 Owner — Listing & Inspection

| key | subject | recipient | context |
|-----|---------|-----------|---------|
| `listing_submitted` | We received your listing | owner | `{{ first_name }}`, `{{ car_title }}` |
| `listing_approved` | Your listing is approved — book an inspection | owner | `{{ car_title }}`, `{{ booking_url }}` |
| `changes_requested` | Action needed: changes to your listing | owner | `{{ car_title }}`, `{{ admin_note }}` |
| `inspection_booking_confirmed` | Inspection confirmed — bring a valid ID | owner | `{{ car_title }}`, `{{ date }}`, `{{ time }}`, `{{ center }}`, `{{ address }}`, `{{ tracking_id }}`, `{{ attendee_name }}`, `{{ is_representative }}` |
| `inspection_booking_approved` | Your inspection booking is approved | owner | `{{ car_title }}`, `{{ date }}`, `{{ time }}`, `{{ center }}` |
| `inspection_booking_rejected` | Your inspection booking was declined | owner | `{{ car_title }}`, `{{ reason }}` |
| `inspection_rescheduled` | Your inspection has been rescheduled | owner | `{{ car_title }}`, `{{ date }}`, `{{ time }}`, `{{ center }}` |
| `inspection_reminder` | Reminder: inspection tomorrow | owner | `{{ car_title }}`, `{{ date }}`, `{{ time }}`, `{{ center }}`, `{{ address }}` |
| `inspection_started` | Your inspection has started | owner | `{{ car_title }}` |
| `inspection_passed` | Passed! Your car is now live | owner | `{{ car_title }}`, `{{ listing_url }}` |
| `inspection_needs_clearance` | Your inspection needs further clearance | owner | `{{ car_title }}`, `{{ clearance_note }}`, `{{ respond_url }}` |
| `inspection_failed` | Inspection outcome for your car | owner | `{{ car_title }}`, `{{ reason }}`, `{{ resubmit_url }}` |
| `inspection_no_show` | You missed your inspection appointment | owner | `{{ car_title }}`, `{{ rebook_url }}` |
| `listing_suspended` | Your listing has been suspended | owner | `{{ car_title }}`, `{{ reason }}` |
| `car_sold` | Your car has sold 🎉 | owner | `{{ car_title }}` |

## 🛒 Customer — Buy / Rent Requests

| key | subject | recipient | context |
|-----|---------|-----------|---------|
| `request_submitted` | We received your request | customer | `{{ first_name }}`, `{{ car_title }}` |
| `request_approved` | Your request was approved | customer | `{{ car_title }}`, `{{ next_steps_url }}` |
| `request_rejected` | Update on your request | customer | `{{ car_title }}`, `{{ reason }}` |
| `request_cancelled` | Your request was cancelled | customer | `{{ car_title }}` |
| `request_auto_rejected` | This car is no longer available | customer | `{{ car_title }}`, `{{ reason }}` |
| `payment_submitted` | We received your payment | customer | `{{ car_title }}`, `{{ amount }}` |
| `payment_confirmed` | Payment confirmed | customer | `{{ car_title }}`, `{{ amount }}` |
| `rental_active` | Your rental is now active | customer | `{{ car_title }}`, `{{ start_date }}`, `{{ end_date }}` |
| `rental_completed` | Your rental is complete | customer | `{{ car_title }}` |

## 🧑‍💼 Staff / Admin

| key | subject | recipient | context |
|-----|---------|-----------|---------|
| `staff_new_listing` | New listing needs review | staff | `{{ car_title }}`, `{{ owner_name }}`, `{{ review_url }}` |
| `staff_new_booking` | New inspection booked | staff | `{{ car_title }}`, `{{ date }}`, `{{ center }}` |
| `staff_new_request` | New buy/rent request | staff | `{{ car_title }}`, `{{ customer_name }}` |
| `staff_payment_pending` | Payment awaiting confirmation | staff | `{{ car_title }}`, `{{ amount }}` |
| `staff_clearance_response` | Owner responded to clearance | staff | `{{ car_title }}`, `{{ owner_message }}` |
| `staff_assistance_request` | Owner needs booking assistance | staff | `{{ owner_name }}`, `{{ state }}`, `{{ message }}` |

## 🆕 Assistance (Phase 2)

| key | subject | recipient | context |
|-----|---------|-----------|---------|
| `assistance_received` | We got your request for help | owner | `{{ first_name }}`, `{{ state }}` |
| `assistance_booked_for_you` | We booked your inspection | owner | `{{ car_title }}`, `{{ date }}`, `{{ time }}`, `{{ center }}`, `{{ address }}`, `{{ tracking_id }}` |

---

**Total: 38 templates.** All render inside a shared layout wrapper
(`emails/base.html`) — header logo, body block, footer — so designers build one
shell + 38 body partials.
