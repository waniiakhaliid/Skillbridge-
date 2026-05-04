"""
Accounts Models — Users, Worker Profiles, Customer Profiles

FILE LOCATION: skillbridge/accounts/models.py
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


# -------------------------------------------------------
# FILE UPLOAD PATH FUNCTIONS
# These tell Django WHERE to save uploaded files.
# Result: media/workers/{user_id}/profile/profile.jpg
#         media/workers/{user_id}/portfolio/{uuid}.jpg
#         media/workers/{user_id}/documents/cnic_front.jpg
# -------------------------------------------------------

def user_profile_photo_path(instance, filename):
    """Profile photo → media/workers/{user_id}/profile/profile.{ext}"""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    return f'workers/{instance.id}/profile/profile.{ext}'


def portfolio_photo_path(instance, filename):
    """Portfolio photo → media/workers/{user_id}/portfolio/{uuid12}.{ext}"""
    import uuid as _uuid
    ext  = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    name = _uuid.uuid4().hex[:12]
    return f'workers/{instance.worker_profile.user.id}/portfolio/{name}.{ext}'


def cnic_front_path(instance, filename):
    """CNIC front → media/workers/{user_id}/documents/cnic_front.{ext}"""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    return f'workers/{instance.user.id}/documents/cnic_front.{ext}'


def cnic_back_path(instance, filename):
    """CNIC back → media/workers/{user_id}/documents/cnic_back.{ext}"""
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    return f'workers/{instance.user.id}/documents/cnic_back.{ext}'


# -------------------------------------------------------
# CHOICES
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
# -------------------------------------------------------

class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        return self.create_user(email, password, **extra_fields)


# -------------------------------------------------------
# USER MODEL
# -------------------------------------------------------

class User(AbstractBaseUser, PermissionsMixin):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    first_name = models.CharField(max_length=80)
    last_name  = models.CharField(max_length=80)
    email      = models.EmailField(unique=True)
    phone      = models.CharField(max_length=20, unique=True)

    # ── CHANGED: TextField → ImageField with organized upload path ──
    # Files saved to: media/workers/{user_id}/profile/profile.{ext}
    # Old TextField is kept as a property for full backward compatibility
    profile_photo = models.ImageField(
        upload_to=user_profile_photo_path,
        blank=True,
        null=True
    )

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER
    )

    account_status = models.CharField(
        max_length=30,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE
    )

    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)

    otp_secret     = models.TextField(blank=True, null=True)
    otp_expires_at = models.DateTimeField(blank=True, null=True)

    last_login_at = models.DateTimeField(blank=True, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    is_staff  = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = UserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'phone']

    class Meta:
        db_table = 'users'
        indexes  = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.email})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'

    @property
    def is_worker(self):
        return self.role == UserRole.WORKER

    @property
    def is_customer(self):
        return self.role == UserRole.CUSTOMER

    # ── BACKWARD COMPAT PROPERTY ──
    # All serializers and views that read profile_photo_url still work.
    # Returns the relative URL like /media/workers/uuid/profile/profile.jpg
    @property
    def profile_photo_url(self):
        return self.profile_photo.url if self.profile_photo else ''

    # Setter so old code like `user.profile_photo_url = path` still works
    # during migration period — it's a no-op (ImageField handles saving)
    @profile_photo_url.setter
    def profile_photo_url(self, value):
        pass  # ImageField saves the file — this setter is intentionally empty


# -------------------------------------------------------
# WORKER PROFILE
# -------------------------------------------------------

class WorkerProfile(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='worker_profile'
    )

    bio              = models.TextField(blank=True, null=True)
    years_experience = models.PositiveSmallIntegerField(default=0)

    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )

    base_hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Base rate in PKR per hour'
    )

    service_radius_km = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        default=10.0
    )

    city = models.CharField(max_length=100, blank=True, null=True)

    # ── CHANGED: TextField → ImageField with organized upload paths ──
    # Files saved to: media/workers/{user_id}/documents/cnic_front.{ext}
    cnic_front = models.ImageField(
        upload_to=cnic_front_path,
        blank=True,
        null=True
    )
    cnic_back = models.ImageField(
        upload_to=cnic_back_path,
        blank=True,
        null=True
    )

    # ── BACKWARD COMPAT PROPERTIES ──
    @property
    def cnic_front_url(self):
        return self.cnic_front.url if self.cnic_front else ''

    @cnic_front_url.setter
    def cnic_front_url(self, value):
        pass  # intentionally empty — ImageField handles saving

    @property
    def cnic_back_url(self):
        return self.cnic_back.url if self.cnic_back else ''

    @cnic_back_url.setter
    def cnic_back_url(self, value):
        pass  # intentionally empty

    is_available = models.BooleanField(default=True)

    avg_rating           = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_reviews        = models.PositiveIntegerField(default=0)
    total_jobs_completed = models.PositiveIntegerField(default=0)

    admin_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'worker_profiles'
        indexes  = [
            models.Index(fields=['verification_status']),
            models.Index(fields=['is_available']),
        ]

    def __str__(self):
        return f'{self.user.full_name} — Worker Profile'


# -------------------------------------------------------
# WORKER SERVICES
# -------------------------------------------------------

class WorkerService(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE,
        related_name='services'
    )

    category = models.CharField(max_length=20, choices=ServiceCategory.choices)

    price_modifier_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    class Meta:
        db_table      = 'worker_services'
        unique_together = ('worker_profile', 'category')

    def __str__(self):
        return f'{self.worker_profile.user.full_name} — {self.category}'

    @property
    def effective_rate(self):
        base     = self.worker_profile.base_hourly_rate
        modifier = self.price_modifier_pct / 100
        return round(base * (1 + modifier), 2)


# -------------------------------------------------------
# CUSTOMER PROFILE
# -------------------------------------------------------

class CustomerProfile(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )

    default_address    = models.TextField(blank=True, null=True)
    total_bookings     = models.PositiveIntegerField(default=0)
    is_repeat_customer = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customer_profiles'

    def __str__(self):
        return f'{self.user.full_name} — Customer Profile'


# -------------------------------------------------------
# AUDIT LOG
# -------------------------------------------------------

class AuditLog(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    admin = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_actions'
    )

    action_type = models.CharField(max_length=50)

    target_user = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_targets'
    )

    details    = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'

    def __str__(self):
        return f'AuditLog: {self.action_type} by {self.admin}'


# -------------------------------------------------------
# TOOL MODELS
# -------------------------------------------------------

class Tool(models.Model):

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name     = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=ServiceCategory.choices)

    class Meta:
        db_table = 'tools'

    def __str__(self):
        return f'{self.name} ({self.category})'


class WorkerTool(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE,
        related_name='tools'
    )

    tool = models.ForeignKey(Tool, on_delete=models.CASCADE)

    price_adjustment_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    class Meta:
        db_table        = 'worker_tools'
        unique_together = ('worker_profile', 'tool')

    def __str__(self):
        return f'{self.worker_profile.user.full_name} — {self.tool.name}'


# -------------------------------------------------------
# WORKER PORTFOLIO PHOTO
# -------------------------------------------------------

class WorkerPortfolioPhoto(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE,
        related_name='portfolio_photos'
    )

    # ── CHANGED: TextField → ImageField with organized upload path ──
    # Files saved to: media/workers/{user_id}/portfolio/{uuid12}.{ext}
    photo = models.ImageField(upload_to=portfolio_photo_path, blank=True, null=True)

    # ── NEW: order field for drag-and-drop reordering ──
    # Lower number = shown first. First photo (order=0) = cover photo.
    order = models.PositiveIntegerField(default=0)

    caption     = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'worker_portfolio_photos'
        ordering = ['order', 'uploaded_at']  # always returned in display order

    def __str__(self):
        return f'Portfolio photo for {self.worker_profile.user.full_name}'

    # ── BACKWARD COMPAT PROPERTY ──
    # All serializers that read photo_url still work unchanged.
    @property
    def photo_url(self):
        return self.photo.url if self.photo else ''


# -------------------------------------------------------
# FAVORITE
# -------------------------------------------------------

class Favorite(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name='favorites'
    )

    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'favorites'
        unique_together = ('customer', 'worker_profile')

    def __str__(self):
        return f'{self.customer.user.full_name} → {self.worker_profile.user.full_name}'


# -------------------------------------------------------
# WORKER AVAILABILITY
# -------------------------------------------------------

class WorkerAvailability(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE,
        related_name='availability'
    )

    day_of_week = models.IntegerField()
    start_time  = models.TimeField()
    end_time    = models.TimeField()

    class Meta:
        db_table        = 'worker_availability'
        unique_together = ('worker_profile', 'day_of_week')

    def __str__(self):
        return (
            f'{self.worker_profile.user.full_name} — '
            f'Day {self.day_of_week} {self.start_time}–{self.end_time}'
        )