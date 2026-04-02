"""
Bookings Models

FILE LOCATION: skillbridge/bookings/models.py

The Booking model is the core transaction of SkillBridge.
A booking connects a customer, a worker, a service, a location,
a time, and a price — all in one record.
"""

import uuid
from django.db import models
from django.conf import settings  # for settings.AUTH_USER_MODEL

from accounts.models import WorkerProfile, CustomerProfile, ServiceCategory


# -------------------------------------------------------
# CHOICES
# -------------------------------------------------------

class BookingStatus(models.TextChoices):
    PENDING              = 'pending',              'Pending'
    ACCEPTED             = 'accepted',             'Accepted'
    IN_PROGRESS          = 'in_progress',          'In Progress'
    COMPLETED            = 'completed',            'Completed'
    CANCELLED_CUSTOMER   = 'cancelled_customer',   'Cancelled by Customer'
    CANCELLED_WORKER     = 'cancelled_worker',     'Cancelled by Worker'
    DISPUTED             = 'disputed',             'Disputed'


class PaymentMethod(models.TextChoices):
    CASH      = 'cash',      'Cash on Delivery'
    JAZZCASH  = 'jazzcash',  'JazzCash'
    EASYPAISA = 'easypaisa', 'EasyPaisa'
    CARD      = 'card',      'Credit/Debit Card'


class PaymentStatus(models.TextChoices):
    PENDING   = 'pending',   'Pending'
    PAID      = 'paid',      'Paid'
    REFUNDED  = 'refunded',  'Refunded'
    FAILED    = 'failed',    'Failed'
    IN_ESCROW = 'in_escrow', 'In Escrow'


# -------------------------------------------------------
# BOOKING MODEL
# -------------------------------------------------------

class Booking(models.Model):
    """
    The central transaction record.
    Created when a customer submits a booking request.
    Goes through a status lifecycle:
    pending → accepted → in_progress → completed
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # -------------------------------------------------------
    # WHO IS INVOLVED
    # -------------------------------------------------------

    # The customer who made the booking
    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.PROTECT,  # PROTECT means we can't delete a customer who has bookings
        related_name='bookings'
    )

    # The worker who will do the job
    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.PROTECT,
        related_name='bookings'
    )

    # Which service is being requested
    service_category = models.CharField(
        max_length=20,
        choices=ServiceCategory.choices
    )

    # -------------------------------------------------------
    # WHEN AND WHERE
    # -------------------------------------------------------

    # When the job is scheduled to happen
    scheduled_at = models.DateTimeField()

    # True if booked more than 24 hours in advance (feature #8)
    is_advance_booking = models.BooleanField(default=False)

    # How long the job is expected to take
    estimated_duration_hrs = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True
    )

    # Where the job will happen (plain text for Phase 1)
    # In Phase 4 (locations app) we will add PostGIS coordinates
    service_address = models.TextField()

    # Snapshot of distance at booking time — used to calculate travel fee
    # Stored so it never changes even if the worker later moves
    distance_to_worker_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )

    # -------------------------------------------------------
    # PROBLEM DESCRIPTION
    # -------------------------------------------------------

    description = models.TextField(blank=True, null=True)

    # -------------------------------------------------------
    # STATUS LIFECYCLE
    # -------------------------------------------------------

    status = models.CharField(
        max_length=25,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING
    )

    # Timestamps for each status transition
    accepted_at   = models.DateTimeField(null=True, blank=True)
    started_at    = models.DateTimeField(null=True, blank=True)
    completed_at  = models.DateTimeField(null=True, blank=True)
    cancelled_at  = models.DateTimeField(null=True, blank=True)

    cancellation_reason = models.TextField(null=True, blank=True)

    # Who cancelled — could be the customer or the worker
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # references our custom User model
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancellations'
    )

    # -------------------------------------------------------
    # PRICING BREAKDOWN (all amounts in PKR)
    # Each component is stored separately for full transparency.
    # The customer can see exactly what they're paying for.
    # -------------------------------------------------------

    # Core service cost (base_hourly_rate × estimated_duration × service modifier)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Adjustment based on worker's tools (feature #1, added in later phase)
    tool_adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Distance-based travel fee (feature #6, added in Phase 4)
    travel_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Discount applied from a discount code (feature #3, added in Phase 2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Tax (if applicable)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Final amount the customer pays
    # total_price = base_price + tool_adjustment + travel_fee - discount_amount + tax_amount
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Fee charged if customer cancels after 10 minutes (feature #7)
    cancellation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # -------------------------------------------------------
    # PLATFORM COMMISSION
    # SkillBridge takes a cut from every completed booking.
    # We store both the % and the actual amount as a snapshot.
    # -------------------------------------------------------

    # Stored per-booking so historical records aren't affected
    # if the platform commission rate changes in the future
    platform_commission_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10.00  # 10% default
    )

    # Actual PKR amount = total_price × (platform_commission_pct / 100)
    # Calculated automatically in the save() method
    platform_commission_amt = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # -------------------------------------------------------
    # PAYMENT
    # -------------------------------------------------------

    payment_method = models.CharField(
        max_length=15,
        choices=PaymentMethod.choices,
        null=True,
        blank=True
    )

    payment_status = models.CharField(
        max_length=15,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )

    # True if the customer opted for 3-instalment payment (feature #2)
    # Instalment records will live in the payments app (Phase 2)
    is_instalment = models.BooleanField(default=False)

    # -------------------------------------------------------
    # TIMESTAMPS
    # -------------------------------------------------------

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-created_at']  # newest bookings first by default
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['worker_profile']),
            models.Index(fields=['status']),
            models.Index(fields=['scheduled_at']),
        ]

    def __str__(self):
        return f'Booking #{str(self.id)[:8]} — {self.customer} → {self.worker_profile}'

    def save(self, *args, **kwargs):
        """
        Override save() to auto-calculate platform_commission_amt
        every time the booking is saved.
        This replaces the PostgreSQL trigger from the schema.
        """
        self.platform_commission_amt = round(
            self.total_price * (self.platform_commission_pct / 100), 2
        )
        super().save(*args, **kwargs)

    @property
    def worker_net_earnings(self):
        """
        How much the worker actually receives after the platform cut.
        travel_fee goes fully to the worker (it's reimbursement, not revenue).
        """
        return round(
            self.total_price - self.platform_commission_amt + self.travel_fee, 2
        )

    @property
    def is_cancellable_by_customer(self):
        """
        A customer can cancel without a fee only within 10 minutes of booking.
        After that, a cancellation fee applies (feature #7).
        """
        from django.utils import timezone
        from datetime import timedelta

        if self.status not in [BookingStatus.PENDING, BookingStatus.ACCEPTED]:
            return False

        minutes_since_booking = (timezone.now() - self.created_at).total_seconds() / 60
        return minutes_since_booking <= 10


# -------------------------------------------------------
# BOOKING PHOTOS
# Photos uploaded by the customer to describe the problem.
# feature #10
# -------------------------------------------------------

class BookingPhoto(models.Model):
    """
    Problem description photos attached to a booking.
    A customer can upload multiple photos (e.g. leaking pipe, broken wire).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='photos'
    )

    # URL of the photo on S3/Cloudinary
    photo_url = models.TextField()

    # Who uploaded this photo (could be customer or worker later)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'booking_photos'

    def __str__(self):
        return f'Photo for Booking #{str(self.booking.id)[:8]}'


# -------------------------------------------------------
# REVIEW MODEL
# Post-job review left by the customer for the worker.
# Placed here in Phase 1 for simplicity.
# Will be moved to its own 'reviews' app in Phase 3.
# -------------------------------------------------------

class Review(models.Model):
    """
    A review left after a completed booking.
    One review per booking (enforced by unique_together).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Which booking this review is for
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='review'
    )

    # Who wrote the review
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews_given'
    )

    # Who is being reviewed
    reviewee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews_received'
    )

    # Rating from 1 to 5
    rating = models.PositiveSmallIntegerField()

    comment = models.TextField(blank=True, null=True)

    is_public    = models.BooleanField(default=True)
    admin_flagged = models.BooleanField(
        default=False,
        help_text='True if this review has been reported and needs admin attention'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        indexes = [
            models.Index(fields=['reviewee'])
        ]

    def __str__(self):
        return f'Review by {self.reviewer} → {self.reviewee} ({self.rating}/5)'

    def clean(self):
        """Validate that rating is between 1 and 5."""
        from django.core.exceptions import ValidationError
        if not (1 <= self.rating <= 5):
            raise ValidationError('Rating must be between 1 and 5.')