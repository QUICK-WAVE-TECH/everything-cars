def delete_non_rent_reviews(Review):
    """Remove reviews attached to anything other than a rent listing.

    Reviews are a rental-only concept. Rows predating that rule were written
    against buy listings and have no meaning now, so they are deleted rather
    than merely hidden — a hidden row still surfaces in aggregates, exports and
    anything that queries Review directly.
    """
    return Review.objects.exclude(car__listing_type="rent").delete()
