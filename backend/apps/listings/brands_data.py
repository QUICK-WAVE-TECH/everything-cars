import re

# Curated set that should sort to the top of the picker (common on NG roads).
POPULAR_NG = [
    "Toyota", "Lexus", "Honda", "Mercedes-Benz", "Hyundai", "Kia", "Ford",
    "Nissan", "Volkswagen", "BMW", "Peugeot", "Land Rover", "Mazda",
    "Mitsubishi", "Acura", "Innoson", "IVM",
]

# Broad world make-list (majors + a wide long tail). Staff can add more in admin.
WORLD_MAKES = [
    "Toyota", "Lexus", "Honda", "Acura", "Nissan", "Infiniti", "Mazda",
    "Mitsubishi", "Subaru", "Suzuki", "Isuzu", "Daihatsu", "Hyundai", "Kia",
    "Genesis", "Ssangyong", "Daewoo", "Ford", "Lincoln", "Chevrolet", "GMC",
    "Cadillac", "Buick", "Dodge", "Ram", "Chrysler", "Jeep", "Tesla", "Rivian",
    "Lucid", "Volkswagen", "Audi", "Porsche", "BMW", "Mini", "Mercedes-Benz",
    "Smart", "Maybach", "Opel", "Volvo", "Polestar", "Saab", "Peugeot",
    "Citroen", "DS", "Renault", "Dacia", "Alpine", "Fiat", "Alfa Romeo",
    "Lancia", "Ferrari", "Maserati", "Lamborghini", "Pagani", "Iveco",
    "Land Rover", "Range Rover", "Jaguar", "Aston Martin", "Bentley",
    "Rolls-Royce", "Lotus", "McLaren", "MG", "Vauxhall", "Seat", "Cupra",
    "Skoda", "Koenigsegg", "Bugatti", "Abarth", "Chery", "Geely", "BYD",
    "Great Wall", "Haval", "GAC", "JAC", "Changan", "Dongfeng", "Foton",
    "Baic", "Hongqi", "Nio", "Xpeng", "Li Auto", "Wuling", "Tata", "Mahindra",
    "Maruti Suzuki", "Proton", "Perodua", "VinFast", "Innoson", "IVM",
    "Nord", "Holden", "Hummer", "Pontiac", "Saturn", "Scion", "Fisker",
    "Rimac", "Zotye", "Brilliance", "Lifan", "Roewe", "Datsun", "Morgan",
    "Caterham", "TVR", "Noble", "Spyker", "Ariel", "Rezvani",
    # Electric / newer Chinese
    "Ora", "Zeekr", "Leapmotor", "Aiways", "Seres", "Maxus", "LDV", "Wey",
    "Lynk & Co", "Jetour", "Bestune", "Venucia", "Denza", "Voyah", "Neta",
    "Aion", "Tank", "Skywell", "IM Motors", "Livan", "Kaiyi", "Soueast",
    "Landwind", "Weltmeister", "Karry",
    # Boutique / performance
    "Hennessey", "SSC", "Saleen", "Callaway", "Roush", "Panoz", "Mosler",
    "Karma", "Bollinger", "Canoo", "Faraday Future", "Czinger", "Drako",
    "Aptera", "Zenvo", "Donkervoort", "De Tomaso", "Wiesmann", "Apollo",
    "Artega", "Isdera", "Alpina", "Brabus", "Ruf", "Gemballa", "Bristol",
    "Marcos", "Jensen", "AC Cars", "Ginetta", "Westfield", "Radical", "BAC",
    "David Brown", "W Motors", "Hispano-Suiza", "Automobili Pininfarina",
    "Praga",
    # Russia / CIS
    "Lada", "UAZ", "GAZ", "Aurus", "Moskvich",
    # India
    "Force Motors", "Ashok Leyland", "Hindustan Motors", "Premier",
    # Africa
    "Kiira", "Mobius", "Wallyscar", "Kantanka",
    # Iran / SE Asia
    "Iran Khodro", "SAIPA", "Bufori",
    # Discontinued but still on the road
    "Plymouth", "Oldsmobile", "Mercury", "Eagle", "Geo", "Austin", "Rover",
    "Triumph", "Riley", "Sunbeam", "Hillman", "Simca", "Talbot", "Borgward",
    "DAF", "Trabant", "Wartburg", "Yugo", "Zastava", "Autobianchi",
    "Innocenti", "Facel Vega", "Monteverdi", "Bizzarrini", "Iso", "Cizeta",
]


def seed_brand_rows(brand_model):
    """Idempotently upsert the canonical brand list into the given Brand model.
    Accepts the real model (command) or a historical one (migration)."""
    from django.utils.text import slugify

    popular = {name: i * 10 for i, name in enumerate(POPULAR_NG, start=1)}
    seen = set()
    created = 0
    for name in WORLD_MAKES:
        if name in seen:
            continue
        seen.add(name)
        _, was_created = brand_model.objects.get_or_create(
            slug=slugify(name),
            defaults={"name": name, "display_order": popular.get(name, 1000)},
        )
        created += int(was_created)
    return created

BRAND_ALIASES = {
    "benz": "Mercedes-Benz",
    "mercedes": "Mercedes-Benz",
    "mercedes benz": "Mercedes-Benz",
    "merc": "Mercedes-Benz",
    "vw": "Volkswagen",
    "chevy": "Chevrolet",
    "range rover": "Land Rover",
    "landrover": "Land Rover",
    "rangerover": "Land Rover",
    "rolls royce": "Rolls-Royce",
    "alfa": "Alfa Romeo",
    "toyata": "Toyota",
    "innoson motors": "Innoson",
    "ivm": "IVM",
}


def normalize(raw):
    """Lowercase, trim, and collapse internal whitespace."""
    return re.sub(r"\s+", " ", (raw or "").strip().lower())


def match_brand(raw):
    """Return the canonical Brand.name for a free-text value, or None.

    Tries the alias map, then an exact (case-insensitive) name, then slug. Brand
    is imported lazily so this module has no app-loading side effects.
    """
    from django.utils.text import slugify

    from apps.listings.models import Brand

    key = normalize(raw)
    if not key:
        return None
    alias = BRAND_ALIASES.get(key)
    if alias:
        return alias
    brand = (
        Brand.objects.filter(name__iexact=key).first()
        or Brand.objects.filter(slug=slugify(key)).first()
    )
    return brand.name if brand else None


def canonicalize_car_brand(raw):
    """Map an existing free-text car brand to (brand, brand_other): a canonical
    match → (canonical, ""); no match → ("", raw); empty → ("", "")."""
    raw = (raw or "").strip()
    if not raw:
        return "", ""
    canonical = match_brand(raw)
    if canonical:
        return canonical, ""
    return "", raw
