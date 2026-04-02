"""
Accounts Models — Users, Worker Profiles, Customer Profiles

FILE LOCATION: skillbridge/accounts/models.py

These are the three core models for Phase 1.
All other apps (bookings, payments etc.) will import from here.
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


# -------------------------------------------------------
# CHOICES (replaces PostgreSQL enums in Django)
# Using TextChoices stores human-readable strings in the DB
# e.g. role column stores 'customer', 'worker', or 'admin'
# -------------------------------------------------------

class UserRole(models.TextChoices):
    CUSTOMER = 'customer', 'Customer'
    WORKER   = 'worker',   'Worker'
    ADMIN    = 'admin',    'Admin'


class AccountStatus(models.TextChoices):
    ACTIVE               = 'active',               'Active'
    SUSPENDED            = 'suspended',            'Suspended'
    BANNED               = 'banned',               'Banned'
    PENDING_VERIFICATION = 'pending_verification', 'Pending Verification'


class VerificationStatus(models.TextChoices):
    PENDING      = 'pending',      'Pending'
    APPROVED     = 'approved',     'Approved'
    REJECTED     = 'rejected',     'Rejected'
    UNDER_REVIEW = 'under_review', 'Under Review'


class ServiceCategory(models.TextChoices):
    PLUMBER     = 'plumber',     'Plumber'
    ELECTRICIAN = 'electrician', 'Electrician'
    CARPENTER   = 'carpenter',   'Carpenter'
    MECHANIC    = 'mechanic',    'Mechanic'


# -------------------------------------------------------
# CUSTOM USER MANAGER
# Django requires a Manager class when you use a custom
# User model. It tells Django HOW to create users.
# We use email as the login field instead of username.
# -------------------------------------------------------

class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        """
        Creates a regular user.
        Called when a customer or worker signs up.
        """
        if not email:
            raise ValueError('Email address is required')

        # Normalise email: converts FOO@BAR.COM → foo@bar.com
        email = self.normalize_email(email)

        user = self.model(email=email, **extra_fields)

        # hash_password hashes the plain text password before saving.
        # NEVER store plain text passwords.
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Creates an admin/superuser.
        Called via: python manage.py createsuperuser
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        return self.create_user(email, password, **extra_fields)


# -------------------------------------------------------
# USER MODEL
# This replaces Django's default User model entirely.
# We use UUID as the primary key instead of integer IDs
# — harder to guess, safer for public-facing APIs.
# -------------------------------------------------------

class User(AbstractBaseUser, PermissionsMixin):
    """
    The single unified user table for all roles.
    A customer, worker, and admin are all rows in this table.
    The 'role' field tells them apart.
    """

    # UUID primary key — more secure than sequential integers
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Core identity fields
    first_name = models.CharField(max_length=80)
    last_name  = models.CharField(max_length=80)

    # Email is used as the login username (not 'username')
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True)

    # Profile photo stored as a URL string (actual file lives on S3/Cloudinary)
    profile_photo_url = models.TextField(blank=True, null=True)

    # Role determines what this user can do
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER
    )

    # Account health
    account_status = models.CharField(
        max_length=30,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE
    )

    # Verification flags
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)

    # OTP fields for phone/email verification
    # otp_secret holds the 6-digit code, otp_expires_at is its expiry time
    otp_secret     = models.TextField(blank=True, null=True)
    otp_expires_at = models.DateTimeField(blank=True, null=True)

    # Timestamps
    last_login_at = models.DateTimeField(blank=True, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)  # set once on creation
    updated_at    = models.DateTimeField(auto_now=True)      # updated on every save

    # Required by Django's permission system
    is_staff  = models.BooleanField(default=False)   # can access /admin/
    is_active = models.BooleanField(default=True)    # False = soft delete

    # Tell Django to use our custom manager
    objects = UserManager()

    # Use email as the login field instead of username
    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'phone']

    class Meta:
        db_table = 'users'  # exact table name in PostgreSQL
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.email})'

    @property
    def full_name(self):
        """Convenience property used in serializers and templates."""
        return f'{self.first_name} {self.last_name}'

    @property
    def is_worker(self):
        return self.role == UserRole.WORKER

    @property
    def is_customer(self):
        return self.role == UserRole.CUSTOMER


# -------------------------------------------------------
# WORKER PROFILE
# Extra data specific to workers.
# One-to-one with User — every worker has exactly one profile.
# -------------------------------------------------------

class WorkerProfile(models.Model):
    """
    Stores professional details for workers.
    Created automatically when a worker completes signup.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # One worker user → one worker profile
    # on_delete=CASCADE means if the user is deleted, their profile is too
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='worker_profile'
        # related_name lets you do: user.worker_profile from a User instance
    )

    bio              = models.TextField(blank=True, null=True)
    years_experience = models.PositiveSmallIntegerField(default=0)

    # Admin must approve a worker before they appear in listings
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )

    # Pricing
    base_hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Base rate in PKR per hour'
    )

    # How far the worker is willing to travel (in km)
    service_radius_km = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        default=10.0
    )

    # Worker's home/base city (plain text for Phase 1)
    # In Phase 4 (locations app) we will replace this with PostGIS coordinates
    city = models.CharField(max_length=100, blank=True, null=True)

    # Document uploads for verification (stored as URLs)
    cnic_front_url = models.TextField(blank=True, null=True)
    cnic_back_url  = models.TextField(blank=True, null=True)

    # Availability toggle — worker can turn this on/off from their dashboard
    is_available = models.BooleanField(default=True)

    # Aggregated stats — updated by signals after each review/booking
    # Storing these here avoids recalculating them on every listing request
    avg_rating           = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_reviews        = models.PositiveIntegerField(default=0)
    total_jobs_completed = models.PositiveIntegerField(default=0)

    # Admin notes (only visible in the admin panel)
    admin_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'worker_profiles'
        indexes = [
            models.Index(fields=['verification_status']),
            models.Index(fields=['is_available']),
        ]

    def __str__(self):
        return f'{self.user.full_name} — Worker Profile'


# -------------------------------------------------------
# WORKER SERVICES
# A worker can offer multiple service categories.
# e.g. Hasnain offers both Plumber and Carpenter services.
# Each category can have its own price modifier.
# -------------------------------------------------------

class WorkerService(models.Model):
    """
    Junction table between WorkerProfile and service categories.
    One row per service a worker offers.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Which worker offers this service
    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE,
        related_name='services'
        # related_name lets you do: worker_profile.services.all()
    )

    category = models.CharField(
        max_length=20,
        choices=ServiceCategory.choices
    )

    # % adjustment on top of the worker's base_hourly_rate for this service.
    # 0 = no change, 20 = 20% more expensive, -10 = 10% cheaper
    price_modifier_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    class Meta:
        db_table = 'worker_services'
        # A worker can only offer each category once
        unique_together = ('worker_profile', 'category')

    def __str__(self):
        return f'{self.worker_profile.user.full_name} — {self.category}'

    @property
    def effective_rate(self):
        """
        Calculates the actual rate for this specific service.
        e.g. base=1000, modifier=20% → effective=1200 PKR/hr
        """
        base = self.worker_profile.base_hourly_rate
        modifier = self.price_modifier_pct / 100
        return round(base * (1 + modifier), 2)


# -------------------------------------------------------
# CUSTOMER PROFILE
# Extra data specific to customers.
# One-to-one with User — every customer has exactly one profile.
# -------------------------------------------------------

class CustomerProfile(models.Model):
    """
    Stores details specific to customers.
    Created automatically when a customer completes signup.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )

    # Default address (plain text for Phase 1)
    # In Phase 3 (locations app) we will add a proper address book
    default_address = models.TextField(blank=True, null=True)

    # Running count of how many bookings this customer has made
    # Used to determine if they qualify for repeat-customer discounts (Phase 2)
    total_bookings = models.PositiveIntegerField(default=0)

    # True once the customer has made at least one completed booking
    is_repeat_customer = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customer_profiles'

    def __str__(self):
        return f'{self.user.full_name} — Customer Profile'