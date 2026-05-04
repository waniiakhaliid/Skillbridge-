"""
Migrates existing worker profile photos from the flat media/profile_photos/
folder into the new organized structure: media/workers/{user_id}/profile/

FILE LOCATION:
  backend/skillbridge/accounts/management/commands/migrate_photos.py

USAGE (run from backend/skillbridge/ folder):
  python manage.py migrate_photos

  # Dry run — shows what would happen without moving anything:
  python manage.py migrate_photos --dry-run

This command:
  1. Finds all workers whose profile_photo is empty (not yet migrated)
  2. Looks up their old photo in media/profile_photos/ using the seed file mapping
  3. Copies the file to media/workers/{user_id}/profile/profile.{ext}
  4. Saves the ImageField so Django tracks it properly

Run this ONCE after replacing models.py and running migrations.
Does NOT delete bookings, profiles, or any other data.
"""

import os
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files import File
from accounts.models import User, UserRole

# Same image directory as seed_workers.py
FRONTEND_IMAGES_DIR = r"C:\Fast\Sem4\FSE\SkillBridge_2\frontend\static\images"

# Old flat folder where seed_workers.py put the photos
OLD_PROFILE_DIR = os.path.join(settings.MEDIA_ROOT, 'profile_photos')

# Map worker email → photo filename (copied from seed_workers.py)
EMAIL_TO_PHOTO = {
    'hasnain.afkar@skillbridge.test':     'hasnain.jpeg',
    'mehreen.sajid@skillbridge.test':     'mehreen.jpeg',
    'shaheer.khalid@skillbridge.test':    'shaheer.jpeg',
    'ayesha.hassan@skillbridge.test':     'ayesha.jpeg',
    'sohaib.khalid@skillbridge.test':     'sohaib.jpeg',
    'ayza.khan@skillbridge.test':         'ayza.jpeg',
    'talal.amer@skillbridge.test':        'talal.jpeg',
    'eshaal.hussain@skillbridge.test':    'eshaal.jpeg',
    'fizza.ali@skillbridge.test':         'fizza.jpeg',
    'samreen.sajid@skillbridge.test':     'samreen.jpeg',
    'heba.raza@skillbridge.test':         'heba.jpeg',
    'abdurrahman.roy@skillbridge.test':   'maan.jpeg',
    'sumreen.umer@skillbridge.test':      'sumer.jpeg',
    'summaya.khalid@skillbridge.test':    'summaya.jpeg',
    'wania.khalid@skillbridge.test':      'wania.jpeg',
    'hoorain.umar@skillbridge.test':      'hoorain.jpeg',
    'areeba.hassan@skillbridge.test':     'areeba.jpeg',
    'hasham.khalid@skillbridge.test':     'hasham.jpeg',
    'hafsa.tanveer@skillbridge.test':     'hafsa.jpeg',
    'hareem.fatima@skillbridge.test':     'hareem.jpeg',
    'fatima.iqbal@skillbridge.test':      'fatima.jpeg',
    'sameen.irshad@skillbridge.test':     'sameen.jpeg',
    'izza.musaddir@skillbridge.test':     'izza.jpeg',
    'maheen.khalid@skillbridge.test':     'maheen.jpeg',
    'naveen.ahmed@skillbridge.test':      'naveen.jpeg',
    'humayl.abdullah@skillbridge.test':   'humayl.jpeg',
    'nawal.hassan@skillbridge.test':      'nawal.jpeg',
    'shawana.khan@skillbridge.test':      'shawana.jpeg',
    'ahmed.nadeem@skillbridge.test':      'ahmed.jpeg',
    'hassan.khalid2@skillbridge.test':    'hassan.jpeg',
    'anabna.shah@skillbridge.test':       'anabna.jpeg',
}


class Command(BaseCommand):
    help = 'Migrates existing worker photos to organized media/workers/{id}/profile/ structure.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without actually moving files.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no files will be moved.\n'))

        workers = User.objects.filter(role=UserRole.WORKER)
        migrated = 0
        skipped  = 0
        missing  = 0

        for user in workers:
            email = user.email

            # Already has a proper ImageField photo — skip
            if user.profile_photo:
                self.stdout.write(f'  SKIP  {email} — already has ImageField photo')
                skipped += 1
                continue

            # Find the photo filename for this worker
            photo_filename = EMAIL_TO_PHOTO.get(email)
            if not photo_filename:
                self.stdout.write(self.style.WARNING(
                    f'  WARN  {email} — not in EMAIL_TO_PHOTO map, skipping'
                ))
                missing += 1
                continue

            # Try old flat folder first, then frontend images
            old_path      = os.path.join(OLD_PROFILE_DIR, photo_filename)
            frontend_path = os.path.join(FRONTEND_IMAGES_DIR, photo_filename)

            src_path = None
            if os.path.isfile(old_path):
                src_path = old_path
            elif os.path.isfile(frontend_path):
                src_path = frontend_path
            else:
                self.stdout.write(self.style.WARNING(
                    f'  WARN  {email} — photo file not found at:\n'
                    f'         {old_path}\n'
                    f'         {frontend_path}'
                ))
                missing += 1
                continue

            # Build new organized path: media/workers/{user_id}/profile/
            ext         = photo_filename.rsplit('.', 1)[-1].lower()
            new_rel     = f'workers/{user.id}/profile/profile.{ext}'
            new_abs     = os.path.join(settings.MEDIA_ROOT, new_rel)
            new_dir     = os.path.dirname(new_abs)

            if dry_run:
                self.stdout.write(
                    f'  WOULD MOVE  {src_path}\n'
                    f'          TO  {new_abs}'
                )
                migrated += 1
                continue

            # Create directory if needed
            os.makedirs(new_dir, exist_ok=True)

            # Copy file to new location
            shutil.copy2(src_path, new_abs)

            # Save to ImageField — open the file and assign it
            # Django will track the path correctly in the database
            with open(new_abs, 'rb') as f:
                user.profile_photo.save(
                    f'profile.{ext}',   # filename Django stores
                    File(f),
                    save=True           # calls user.save() automatically
                )

            self.stdout.write(self.style.SUCCESS(
                f'  OK    {user.first_name} {user.last_name} ({email})\n'
                f'        → media/{new_rel}'
            ))
            migrated += 1

        # Summary
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'Dry run complete. {migrated} would be migrated, '
                f'{skipped} already done, {missing} photos not found.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Done. {migrated} migrated, {skipped} already done, {missing} not found.'
            ))

        if missing > 0:
            self.stdout.write(self.style.WARNING(
                f'\n{missing} worker(s) had no photo found. '
                f'Their profile_photo field remains empty.'
            ))