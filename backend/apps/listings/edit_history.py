"""Field-level edit history for car listings.

An owner/team-member edit to a listing is recorded as an annotation row on
`CarStatusHistory` (same status in and out) carrying the fields that changed,
old → new. Status transitions keep using `record_status_change`; this is the
edit companion so the two share one timeline.
"""

from apps.inspections.models import ActorRole, CarStatusHistory

# Tracked listing fields and their display labels. VIN/plate are locked identity
# and deliberately excluded.
LISTING_FIELD_LABELS = {
    "title": "Title",
    "listing_type": "Listing type",
    "rent_price_per_day": "Rent price/day",
    "sale_price": "Sale price",
    "is_negotiable": "Negotiable",
    "brand": "Brand",
    "model": "Model",
    "color": "Color",
    "year": "Year",
    "body_type": "Body type",
    "transmission": "Transmission",
    "fuel_type": "Fuel",
    "seats": "Seats",
    "mileage": "Mileage",
    "branch": "Branch",
    "country": "Country",
    "state": "State",
    "city": "City",
    "description": "Description",
    "features": "Features",
}

_DESCRIPTION_CAP = 200


def _money(value):
    return "" if value is None else str(value)


def listing_snapshot(car):
    """A display-string snapshot of the tracked fields, for diffing."""
    return {
        "title": car.title or "",
        "listing_type": car.get_listing_type_display(),
        "rent_price_per_day": _money(car.rent_price_per_day),
        "sale_price": _money(car.sale_price),
        "is_negotiable": "Yes" if car.is_negotiable else "No",
        "brand": car.brand.name if car.brand_id else (car.brand_other or ""),
        "model": car.model or "",
        "color": car.color or "",
        "year": str(car.year) if car.year is not None else "",
        "body_type": car.body_type or "",
        "transmission": car.transmission or "",
        "fuel_type": car.fuel_type or "",
        "seats": str(car.seats) if car.seats is not None else "",
        "mileage": str(car.mileage) if car.mileage is not None else "",
        "branch": car.branch.name if car.branch_id else "",
        "country": str(car.country) if car.country else "",
        "state": car.state or "",
        "city": car.city or "",
        "description": (car.description or "")[:_DESCRIPTION_CAP],
        "features": ", ".join(f.name for f in car.features.all()),
    }


def diff_snapshots(before, after):
    """List of {field, label, old, new} for fields whose value changed."""
    changed = []
    for field, label in LISTING_FIELD_LABELS.items():
        old = before.get(field, "")
        new = after.get(field, "")
        if old != new:
            changed.append({"field": field, "label": label, "old": old, "new": new})
    return changed


def _client_ip(request):
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_listing_edit(car, before, after, actor, request=None):
    """Write an edit annotation row if any tracked field changed. Returns the
    created history row, or None when nothing changed."""
    changed = diff_snapshots(before, after)
    if not changed:
        return None
    return CarStatusHistory.objects.create(
        car=car,
        from_status=car.status,
        to_status=car.status,
        actor=actor,
        # A listing edit is always a business-side action (owner or team member);
        # staff have no listing-edit path.
        actor_role=ActorRole.OWNER,
        actor_name=actor.get_full_name() if actor else "",
        actor_email=actor.email if actor else "",
        actor_phone=getattr(actor, "phone", "") if actor else "",
        ip_address=_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
        changed_fields=changed,
    )
