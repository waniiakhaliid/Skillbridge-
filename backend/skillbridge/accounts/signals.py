"""
FILE: accounts/signals.py
PURPOSE: Auto-create profile rows when a User is created

WHAT THIS FILE DOES:
- post_save on User (created=True, role='worker')  → create WorkerProfile if missing
- post_save on User (created=True, role='customer') → create CustomerProfile if missing
- These are a safety net — the registration serializers also create profiles
  explicitly, so this handler only fires if a User is created by other means
  (e.g. createsuperuser, fixtures, admin panel)

CONNECTS TO:
- accounts/apps.py calls ready() which imports and connects these signals
- accounts/models.py — User, WorkerProfile, CustomerProfile
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile_on_user_creation(sender, instance, created, **kwargs):
    """
    Safety-net signal: if a User row is newly created and has no profile yet,
    auto-create the appropriate profile type.

    The registration serializers already create profiles explicitly, so this
    only fires for edge cases (createsuperuser, admin panel, test fixtures).
    Using get_or_create rather than create to avoid duplicate-profile IntegrityError
    in case the serializer already ran.
    """

    if not created:
        # Only act on new User rows, not on every profile save
        return

    # Import here (not at module top) to avoid AppRegistryNotReady errors
    # that can occur if this module is imported before Django finishes setup
    from .models import WorkerProfile, CustomerProfile

    if instance.role == 'worker':
        # get_or_create — idempotent, won't raise IntegrityError if
        # the registration serializer already created the profile
        WorkerProfile.objects.get_or_create(
            user=instance,
            defaults={'base_hourly_rate': 0}  # placeholder; worker updates via profile PATCH
        )

    elif instance.role == 'customer':
        CustomerProfile.objects.get_or_create(user=instance)
