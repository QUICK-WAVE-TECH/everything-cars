# apps/listings/migration_helpers.py
def delete_both_cars(Car):
    """Remove legacy dual-listing cars; FK cascades take their dependents."""
    Car.objects.filter(listing_type="both").delete()
