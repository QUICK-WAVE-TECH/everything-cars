"""Local dev seeder: creates an owner and 15 published cars, each with a photo.

Run:  uv run python manage.py shell -c "exec(open('seed_dev.py').read())"
Idempotent on the demo owner + car titles. Photos come from frontend/public/cars
and REPLACE any existing image on each car on every run.
"""
import os
from django.conf import settings
from django.core.files import File
from django.utils import timezone
from apps.users.models import User
from apps.listings.models import Car, CarImage, CarStatus, Currency

IMG_DIR = os.path.join(settings.BASE_DIR.parent, "frontend", "public", "cars")

owner, created = User.objects.get_or_create(
    email="owner@demo.test",
    defaults={"first_name": "Demo", "last_name": "Owner", "role": "owner", "is_active": True},
)
if created:
    owner.set_password("demopass123")
    owner.save()

# title, brand, model, year, body, state, city, listing_type, rent/day, sale, mileage, image
CARS = [
    ("Lexus NX 300h",      "Lexus",      "NX 300h",   2022, "suv",        "Lagos",  "Lekki",           "both", 35000,  35000000, 25000, "new-car-1.jpg"),
    ("Toyota RAV4",        "Toyota",     "RAV4",      2022, "suv",        "Abuja",  "Maitama",         "rent", 42000,  None,     28000, "Shop-6.jpg"),
    ("Mercedes C300",      "Mercedes",   "C300",      2023, "sedan",      "Lagos",  "Victoria Island", "buy",  None,   24000000, 12000, "Shop-3.jpg"),
    ("Honda Accord",       "Honda",      "Accord",    2020, "sedan",      "Rivers", "Port Harcourt",   "rent", 30000,  None,     41000, "Shop-4.jpg"),
    ("Range Rover Velar",  "Land Rover", "Velar",     2023, "suv",        "Lagos",  "Ikoyi",           "both", 150000, 78000000, 9000,  "Shop-5.jpg"),
    ("BMW X5",             "BMW",        "X5",        2024, "suv",        "Abuja",  "Wuse",            "buy",  None,   54000000, 0,     "Shop-7.jpg"),
    ("Toyota Corolla",     "Toyota",     "Corolla",   2021, "sedan",      "Oyo",    "Ibadan",          "rent", 25000,  None,     33000, "Shop-8.jpg"),
    ("Kia Sportage",       "Kia",        "Sportage",  2021, "crossover",  "Kano",   "Kano",            "both", 38000,  24000000, 30000, "Shop-9.jpg"),
    ("Audi Q7",            "Audi",       "Q7",        2024, "suv",        "Lagos",  "Lekki",           "buy",  None,   62000000, 0,     "Shop-10.jpg"),
    ("Ford Ranger",        "Ford",       "Ranger",    2022, "truck",      "Kaduna", "Kaduna",          "rent", 45000,  None,     22000, "Shop-1.jpg"),
    ("Hyundai Elantra",    "Hyundai",    "Elantra",   2019, "sedan",      "Lagos",  "Surulere",        "both", 28000,  15000000, 55000, "new-car-2.jpg"),
    ("Mercedes-Benz GLE",  "Mercedes",   "GLE",       2024, "suv",        "Abuja",  "Asokoro",         "both", 85000,  78000000, 0,     "new-car-4.jpg"),
    ("Toyota Camry",       "Toyota",     "Camry",     2021, "sedan",      "Enugu",  "Enugu",           "rent", 28000,  None,     32000, "new-car-6.jpg"),
    ("Honda CR-V",         "Honda",      "CR-V",      2024, "crossover",  "Lagos",  "Ikeja",           "buy",  None,   26000000, 0,     "Cars-5.jpg"),
    ("Lexus RX 350",       "Lexus",      "RX 350",    2024, "suv",        "Lagos",  "Victoria Island", "both", 60000,  52000000, 0,     "New-9.jpg"),
]

now = timezone.now()
attached = 0
for (title, brand, model, year, body, state, city, lt, rent, sale, mileage, img) in CARS:
    car, made = Car.objects.get_or_create(
        owner=owner,
        title=title,
        defaults=dict(
            listing_type=lt, brand=brand, model=model, year=year, body_type=body,
            state=state, city=city, country="NG", currency=Currency.NGN,
            rent_price_per_day=rent, sale_price=sale, mileage=mileage, seats=5,
            description=f"A well-maintained {year} {brand} {model} in great condition.",
            status=CarStatus.PUBLISHED, published_at=now,
        ),
    )
    if not made:
        car.status = CarStatus.PUBLISHED
        car.published_at = now
        car.save(update_fields=["status", "published_at"])

    # Replace any existing image (e.g. previous web placeholders)
    car.images.all().delete()
    img_path = os.path.join(IMG_DIR, img)
    if os.path.exists(img_path):
        with open(img_path, "rb") as fh:
            ci = CarImage(car=car, is_primary=True)
            ci.image.save(f"{brand.lower()}-{model.lower().replace(' ', '-')}.jpg", File(fh), save=True)
        attached += 1
    else:
        print(f"  MISSING image: {img_path}")

published = Car.objects.filter(status=CarStatus.PUBLISHED)
print(f"owner={owner.email}  published cars={published.count()}  images attached={attached}")
