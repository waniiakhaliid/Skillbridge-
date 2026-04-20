"""
Seed dummy worker accounts from data.js worker list.

FILE LOCATION:
  backend/skillbridge/accounts/management/commands/seed_workers.py

You also need these two empty __init__.py files if they don't exist:
  backend/skillbridge/accounts/management/__init__.py
  backend/skillbridge/accounts/management/commands/__init__.py

USAGE (run from backend/ folder):
  python manage.py seed_workers

  # Wipe all previously seeded workers and re-seed:
  python manage.py seed_workers --clear

IMAGES:
  Worker photos are copied from frontend/static/images/ into backend/media/profile_photos/.
  The path resolution assumes this folder layout:

  SKILLBRIDGE_2/
    backend/
      manage.py
      skillbridge/
        accounts/
          management/
            commands/
              seed_workers.py   ← this file
    frontend/
      static/
        images/
          hasnain.jpeg
          mehreen.jpeg
          ...etc

  If your layout differs, adjust FRONTEND_IMAGES_DIR below.
"""

import os
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings
from accounts.models import (
    User, UserRole, AccountStatus,
    WorkerProfile, WorkerService,
    VerificationStatus, ServiceCategory,
)

# ---------------------------------------------------------------------------
# Path to the frontend images folder — adjust if your layout differs
# ---------------------------------------------------------------------------
# BASE_DIR is typically backend/skillbridge/ so we go up two levels to reach
# the repo root, then into frontend/static/images/
FRONTEND_IMAGES_DIR = r"C:\Fast\Sem4\FSE\SkillBridge_2\frontend\static\images"

# Where copied images will live inside Django's media folder
MEDIA_PROFILE_DIR = os.path.join(settings.MEDIA_ROOT, 'profile_photos')

DEFAULT_PASSWORD = '123456'

# ---------------------------------------------------------------------------
# Worker data — mirrors data.js exactly
# Split 'name' into first_name / last_name
# 'photo' is just the filename (e.g. 'hasnain.jpeg')
# ---------------------------------------------------------------------------
WORKERS = [
    # --- Plumbers ---
    dict(id=1,  first='Hasnain',   last='Afkar',     email='hasnain.afkar@skillbridge.test',     phone='03001000001', service='plumber',     experience=5,  rating=5.0, bio='Experienced in residential plumbing.',                                              availability=True, price=25,  location='Lahore',     verified=True,  photo='hasnain.jpeg'),
    dict(id=2,  first='Mehreen',   last='Sajid',     email='mehreen.sajid@skillbridge.test',     phone='03001000002', service='plumber',     experience=6,  rating=4.8, bio='Expert in residential plumbing and advanced leak detection.',                       availability=False, price=30, location='Islamabad',  verified=True,  photo='mehreen.jpeg'),
    dict(id=3,  first='Shaheer',   last='Khalid',    email='shaheer.khalid@skillbridge.test',    phone='03001000003', service='plumber',     experience=4,  rating=4.5, bio='Dedicated plumber known for quick and efficient emergency services.',               availability=True, price=20,  location='Rawalpindi', verified=False, photo='shaheer.jpeg'),
    dict(id=4,  first='Ayesha',    last='Hassan',    email='ayesha.hassan@skillbridge.test',     phone='03001000004', service='plumber',     experience=7,  rating=4.7, bio='Renovation and installation expert.',                                               availability=False, price=40, location='Lahore',     verified=True,  photo='ayesha.jpeg'),
    dict(id=5,  first='Sohaib',    last='Khalid',    email='sohaib.khalid@skillbridge.test',     phone='03001000005', service='plumber',     experience=3,  rating=4.3, bio='Affordable and quick fixes.',                                                       availability=False, price=15, location='Islamabad',  verified=False, photo='sohaib.jpeg'),
    dict(id=6,  first='Ayza',      last='Khan',      email='ayza.khan@skillbridge.test',         phone='03001000006', service='plumber',     experience=8,  rating=4.7, bio='Commercial plumbing and maintenance.',                                              availability=True, price=45,  location='Karachi',    verified=True,  photo='ayza.jpeg'),
    dict(id=7,  first='Talal',     last='Amer',      email='talal.amer@skillbridge.test',        phone='03001000007', service='plumber',     experience=5,  rating=5.0, bio='Bathroom and kitchen plumbing.',                                                    availability=False, price=25, location='Lahore',     verified=True,  photo='talal.jpeg'),
    dict(id=8,  first='Eshaal',    last='Hussain',   email='eshaal.hussain@skillbridge.test',    phone='03001000008', service='plumber',     experience=2,  rating=5.0, bio='Small jobs and maintenance.',                                                       availability=True, price=12,  location='Wah Cantt',  verified=False, photo='eshaal.jpeg'),

    # --- Electricians ---
    dict(id=9,  first='Fizza',     last='Ali',       email='fizza.ali@skillbridge.test',         phone='03001000009', service='electrician', experience=7,  rating=4.7, bio='Licensed electrician, fast troubleshooting.',                                       availability=True, price=35,  location='Islamabad',  verified=True,  photo='fizza.jpeg'),
    dict(id=10, first='Samreen',   last='Sajid',     email='samreen.sajid@skillbridge.test',     phone='03001000010', service='electrician', experience=12, rating=4.9, bio='Specialist in industrial wiring and smart power management.',                       availability=False, price=50, location='Lahore',     verified=True,  photo='samreen.jpeg'),
    dict(id=11, first='Heba',      last='Raza',      email='heba.raza@skillbridge.test',         phone='03001000011', service='electrician', experience=5,  rating=4.7, bio='Certified electrician for high-voltage systems and panel upgrades.',                availability=False, price=30, location='Karachi',    verified=True,  photo='heba.jpeg'),
    dict(id=12, first='Abdurrahman', last='Roy',     email='abdurrahman.roy@skillbridge.test',   phone='03001000012', service='electrician', experience=8,  rating=4.7, bio='Panel upgrades and lighting.',                                                      availability=True, price=40,  location='Rawalpindi', verified=True,  photo='maan.jpeg'),
    dict(id=16, first='Sumreen',   last='Umer Khan', email='sumreen.umer@skillbridge.test',      phone='03001000016', service='electrician', experience=9,  rating=4.7, bio='Specialist in outdoor and security lighting.',                                      availability=False, price=45, location='Rawalpindi', verified=True,  photo='sumer.jpeg'),
    dict(id=17, first='Summaya',   last='Khalid',    email='summaya.khalid@skillbridge.test',    phone='03001000017', service='electrician', experience=3,  rating=4.3, bio='Quick troubleshooting and repairs.',                                                availability=True, price=18,  location='Islamabad',  verified=False, photo='summaya.jpeg'),
    dict(id=37, first='Wania',     last='Khalid',    email='wania.khalid@skillbridge.test',      phone='03001000037', service='electrician', experience=4,  rating=5.0, bio='Specialist in residential wiring and smart home devices.',                          availability=True, price=35,  location='Islamabad',  verified=True,  photo='wania.jpeg'),
    dict(id=40, first='Hoorain',   last='Umar',      email='hoorain.umar@skillbridge.test',      phone='03001000040', service='electrician', experience=4,  rating=4.8, bio='Specialist in solar panel installations and smart home energy management.',        availability=False, price=40, location='Islamabad',  verified=True,  photo='hoorain.jpeg'),

    # --- Carpenters ---
    dict(id=18, first='Areeba',    last='Hassan',    email='areeba.hassan@skillbridge.test',     phone='03001000018', service='carpenter',   experience=4,  rating=4.4, bio='Expert furniture designer with a focus on modern aesthetics.',                      availability=False, price=25, location='Lahore',     verified=True,  photo='areeba.jpeg'),
    dict(id=26, first='Hasham',    last='Khalid',    email='hasham.khalid@skillbridge.test',     phone='03001000026', service='carpenter',   experience=4,  rating=4.2, bio='Specialist in wood restoration and antique repair.',                               availability=False, price=15, location='Rawalpindi', verified=False, photo='hasham.jpeg'),
    dict(id=38, first='Hafsa',     last='Tanveer',   email='hafsa.tanveer@skillbridge.test',     phone='03001000038', service='carpenter',   experience=3,  rating=5.0, bio='Custom furniture maker with a keen eye for detail.',                               availability=False, price=30, location='Rawalpindi', verified=True,  photo='hafsa.jpeg'),
    dict(id=42, first='Hareem',    last='Fatima',    email='hareem.fatima@skillbridge.test',     phone='03001000042', service='carpenter',   experience=5,  rating=4.9, bio='Expert in custom cabinetry, fine woodwork, and luxury interior design.',           availability=True, price=45,  location='Lahore',     verified=True,  photo='hareem.jpeg'),
    dict(id=44, first='Fatima',    last='Iqbal',     email='fatima.iqbal@skillbridge.test',      phone='03001000044', service='carpenter',   experience=6,  rating=4.8, bio='Master craftsman in wood finishing and bespoke cabinet work.',                     availability=True, price=40,  location='Karachi',    verified=True,  photo='fatima.jpeg'),
    dict(id=47, first='Sameen',    last='Irshad',    email='sameen.irshad@skillbridge.test',     phone='03001000047', service='carpenter',   experience=4,  rating=4.7, bio='Expert in custom furniture and intricate interior woodwork.',                       availability=True, price=35,  location='Karachi',    verified=True,  photo='sameen.jpeg'),
    dict(id=48, first='Izza',      last='Musaddir',  email='izza.musaddir@skillbridge.test',     phone='03001000048', service='carpenter',   experience=6,  rating=4.8, bio='Specialist in structural woodwork and handcrafted timber furniture.',              availability=False, price=40, location='Rawalpindi', verified=True,  photo='izza.jpeg'),

    # --- Mechanics ---
    dict(id=35, first='Maheen',    last='Khalid',    email='maheen.khalid@skillbridge.test',     phone='03001000035', service='mechanic',    experience=6,  rating=4.6, bio='Reliable mechanic with 6 years of experience in engine diagnostics.',             availability=True, price=30,  location='Rawalpindi', verified=True,  photo='maheen.jpeg'),
    dict(id=39, first='Naveen',    last='Ahmed',     email='naveen.ahmed@skillbridge.test',      phone='03001000039', service='mechanic',    experience=5,  rating=4.7, bio='Expert in luxury car maintenance and performance tuning.',                          availability=True, price=45,  location='Lahore',     verified=True,  photo='naveen.jpeg'),
    dict(id=41, first='Humayl',    last='Abdullah',  email='humayl.abdullah@skillbridge.test',   phone='03001000041', service='mechanic',    experience=6,  rating=4.6, bio='Experienced in heavy commercial vehicle mechanics and diesel engines.',            availability=True, price=35,  location='Karachi',    verified=True,  photo='humayl.jpeg'),
    dict(id=43, first='Nawal',     last='Hassan',    email='nawal.hassan@skillbridge.test',      phone='03001000043', service='mechanic',    experience=4,  rating=4.7, bio='Specialist in precision engine tuning and modern vehicle diagnostics.',            availability=False, price=30, location='Islamabad',  verified=True,  photo='nawal.jpeg'),
    dict(id=45, first='Shawana',   last='Khan',      email='shawana.khan@skillbridge.test',      phone='03001000045', service='mechanic',    experience=5,  rating=4.8, bio='Expert in light vehicle maintenance and advanced brake systems.',                  availability=True, price=30,  location='Lahore',     verified=True,  photo='shawana.jpeg'),
    dict(id=46, first='Ahmed',     last='Nadeem',    email='ahmed.nadeem@skillbridge.test',      phone='03001000046', service='mechanic',    experience=7,  rating=4.9, bio='Specialist in high-performance engine tuning and track diagnostics.',              availability=False, price=50, location='Islamabad',  verified=True,  photo='ahmed.jpeg'),
    dict(id=49, first='Hassan',    last='Khalid',    email='hassan.khalid2@skillbridge.test',    phone='03001000049', service='mechanic',    experience=8,  rating=4.7, bio='Seasoned mechanic with a focus on transmission and hybrid engine systems.',        availability=True, price=35,  location='Lahore',     verified=True,  photo='hassan.jpeg'),
    dict(id=50, first='Anabna',    last='Shah',      email='anabna.shah@skillbridge.test',       phone='03001000050', service='carpenter', experience=5,  rating=4.8,  bio='Skilled carpenter specializing in residential wiring and quick fault diagnosis.', availability=True, price=35, location='Islamabad', verified=True, photo='anabna.jpeg'),

]

# Map data.js service strings to Django's ServiceCategory choices
SERVICE_MAP = {
    'plumber':     ServiceCategory.PLUMBER,
    'electrician': ServiceCategory.ELECTRICIAN,
    'carpenter':   ServiceCategory.CARPENTER,
    'mechanic':    ServiceCategory.MECHANIC,
}


class Command(BaseCommand):
    help = 'Seeds dummy worker accounts from the data.js worker list.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all previously seeded dummy workers before re-seeding.',
        )

    def handle(self, *args, **options):
        # ------------------------------------------------------------------
        # Optional: wipe previously seeded accounts
        # We identify them by the @skillbridge.test email domain
        # ------------------------------------------------------------------
        if options['clear']:
            deleted, _ = User.objects.filter(
                email__endswith='@skillbridge.test'
            ).delete()
            self.stdout.write(self.style.WARNING(
                f'Cleared {deleted} previously seeded user(s).'
            ))

        # ------------------------------------------------------------------
        # Make sure the media/profile_photos directory exists
        # ------------------------------------------------------------------
        os.makedirs(MEDIA_PROFILE_DIR, exist_ok=True)

        created_count = 0
        skipped_count = 0

        for w in WORKERS:
            email = w['email']

            # Skip if already exists (idempotent — safe to run multiple times)
            if User.objects.filter(email=email).exists():
                self.stdout.write(f'  SKIP  {email} (already exists)')
                skipped_count += 1
                continue

            # --------------------------------------------------------------
            # 1. Copy photo from frontend/static/images/ → media/profile_photos/
            # --------------------------------------------------------------
            photo_relative_path = None
            src = os.path.normpath(
                os.path.join(FRONTEND_IMAGES_DIR, w['photo'])
            )
            if os.path.isfile(src):
                dest = os.path.join(MEDIA_PROFILE_DIR, w['photo'])
                shutil.copy2(src, dest)
                # Store relative path from MEDIA_ROOT (what Django saves in DB)
                photo_relative_path = f'/media/profile_photos/{w["photo"]}'
            else:
                self.stdout.write(self.style.WARNING(
                    f'  WARN  Photo not found: {src} — skipping photo for {email}'
                ))

            # --------------------------------------------------------------
            # 2. Create the User row
            # --------------------------------------------------------------
            user = User.objects.create_user(
                email=email,
                password=DEFAULT_PASSWORD,
                first_name=w['first'],
                last_name=w['last'],
                phone=w['phone'],
                role=UserRole.WORKER,
                account_status=AccountStatus.ACTIVE,
                email_verified=True,
                phone_verified=True,
                profile_photo_url=photo_relative_path,
            )

            # --------------------------------------------------------------
            # 3. Create the WorkerProfile row
            # --------------------------------------------------------------
            verification = (
                VerificationStatus.APPROVED
                if w['verified']
                else VerificationStatus.PENDING
            )

            profile = WorkerProfile.objects.create(
                user=user,
                bio=w['bio'],
                years_experience=w['experience'],
                verification_status=verification,
                base_hourly_rate=w['price'],
                service_radius_km=15,           # sensible default
                city=w['location'],
                is_available=w['availability'],
                avg_rating=w['rating'],
                total_reviews=0,
                total_jobs_completed=0,
            )

            # --------------------------------------------------------------
            # 4. Create the WorkerService row (one service per worker for now)
            # --------------------------------------------------------------
            WorkerService.objects.create(
                worker_profile=profile,
                category=SERVICE_MAP[w['service']],
                price_modifier_pct=0,
            )

            self.stdout.write(self.style.SUCCESS(
                f'  OK    {user.full_name} ({w["service"]}, {w["location"]})'
            ))
            created_count += 1

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. {created_count} worker(s) created, {skipped_count} skipped.'
        ))
        self.stdout.write(
            f'Password for all accounts: {DEFAULT_PASSWORD}'
        )