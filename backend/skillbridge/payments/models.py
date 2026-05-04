"""
FILE: payments/models.py
PURPOSE: All payment-related models for SkillBridge

WHAT THIS FILE DOES:
- DiscountCode: platform-issued promo codes with usage limits
- CustomerDiscountUse: one-per-customer-per-code usage tracking
- Instalment: splits a booking total into up to 3 scheduled payments
- Payment: individual payment transaction record
- WorkerEarning: net payout record created after a booking completes
- CommissionPeriod: monthly commission tier tracking per worker

CONNECTS TO:
- accounts/models.py — CustomerProfile, WorkerProfile
- bookings/models.py — Booking
- payments/services.py — business logic for validation and processing
- payments/signals.py — auto-marks instalments paid when payment succeeds
"""

import uuid
from django.db import models
from django.conf import settings

from accounts.models import CustomerProfile, WorkerProfile


# -------------------------------------------------------
# DISCOUNT CODES
# -------------------------------------------------------

class DiscountCode(models.Model):
    """
    A platform-issued discount code.
    Either percentage off (discount_pct) or flat PKR off (discount_flat) —
    the two fields are mutually exclusive, enforced in services.py validation.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Unique code string the customer enters at checkout (e.g. 'WELCOME50')
    code = models.CharField(max_length=50, unique=True)

    # Percentage off — mutually exclusive with discount_flat
    discount_pct = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )

    # Flat PKR off — mutually exclusive with discount_pct
    discount_flat = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )

    # null = unlimited uses; set to a positive integer to cap total redemptions
    max_uses = models.PositiveIntegerField(null=True, blank=True)

    # Incremented atomically each time the code is redeemed
    used_count = models.PositiveIntegerField(default=0)

    # null = never expires
    valid_until = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'discount_codes'

    def __str__(self):
        return f'DiscountCode {self.code}'


class CustomerDiscountUse(models.Model):
    """
    Records which customer used which discount code on which booking.
    The unique_together constraint enforces one-use-per-customer-per-code.
    PROTECT on all FKs — we never want to lose financial history.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # PROTECT — discount use records must outlive their FK targets
    customer = models.ForeignKey(CustomerProfile, on_delete=models.PROTECT)
    discount = models.ForeignKey(DiscountCode,    on_delete=models.PROTECT)
    booking  = models.ForeignKey('bookings.Booking', on_delete=models.PROTECT)

    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'customer_discount_uses'
        # One use per customer per code — prevents reuse even across different bookings
        unique_together = ('customer', 'discount')

    def __str__(self):
        return f'{self.customer.user.full_name} used {self.discount.code}'


# -------------------------------------------------------
# INSTALMENTS
# -------------------------------------------------------

class Instalment(models.Model):
    """
    One of up to three scheduled payment instalments for a booking.
    SkillBridge splits the total into equal parts due over 60 days.
    """

    class InstalmentStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID    = 'paid',    'Paid'
        OVERDUE = 'overdue', 'Overdue'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='instalments'
    )

    # 1, 2, or 3 — SkillBridge splits into maximum 3 instalments
    instalment_no = models.PositiveSmallIntegerField()

    amount   = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateTimeField()

    status = models.CharField(
        max_length=10,
        choices=InstalmentStatus.choices,
        default=InstalmentStatus.PENDING
    )

    # Gateway reference from the payment that settled this instalment
    transaction_ref = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'instalments'
        # A booking can only have one record per instalment number
        unique_together = ('booking', 'instalment_no')

    def __str__(self):
        return (
            f'Instalment {self.instalment_no} for Booking '
            f'#{str(self.booking.id)[:8]} — {self.status}'
        )


# -------------------------------------------------------
# PAYMENT
# -------------------------------------------------------

class Payment(models.Model):
    """
    Individual payment transaction.
    Can be a full single payment or one of several instalment payments.
    All gateway interaction is simulated — see payments/services.py.
    """

    class PaymentMethod(models.TextChoices):
        CASH      = 'cash',      'Cash'
        JAZZCASH  = 'jazzcash',  'JazzCash'
        EASYPAISA = 'easypaisa', 'EasyPaisa'
        CARD      = 'card',      'Card'

    class PaymentStatus(models.TextChoices):
        PENDING  = 'pending',  'Pending'
        PAID     = 'paid',     'Paid'
        FAILED   = 'failed',   'Failed'
        REFUNDED = 'refunded', 'Refunded'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # PROTECT — we never want to lose payment records even if booking is disputed
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.PROTECT,
        related_name='payments'
    )

    # null for full single payments, populated for instalment payments
    instalment = models.ForeignKey(
        Instalment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)

    method = models.CharField(max_length=15, choices=PaymentMethod.choices)

    status = models.CharField(
        max_length=10,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )

    # Reference returned by the simulated gateway (MOCK-REF-XXXX in dev)
    gateway_ref = models.CharField(max_length=100, null=True, blank=True)

    # Raw simulated gateway response — stored for debugging and audit
    gateway_payload = models.JSONField(null=True, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payments'

    def __str__(self):
        return f'Payment {self.id} — {self.status} ({self.amount} PKR)'


# -------------------------------------------------------
# WORKER EARNINGS
# -------------------------------------------------------

class WorkerEarning(models.Model):
    """
    Net payout record for a worker after a booking is completed.
    Created automatically by payments/services.create_worker_earning()
    when a booking transitions to 'completed'.
    PROTECT on all FKs — earnings records are financial evidence.
    """

    class CommissionPeriodChoice(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        ELEVATED = 'elevated', 'Elevated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    worker_profile = models.ForeignKey(WorkerProfile, on_delete=models.PROTECT)
    booking        = models.ForeignKey('bookings.Booking', on_delete=models.PROTECT)

    # What the customer paid for the service (before platform cut)
    gross_amount      = models.DecimalField(max_digits=10, decimal_places=2)

    # Platform's share — snapshot at time of completion so future rate changes
    # don't retroactively alter past earnings records
    commission_amt    = models.DecimalField(max_digits=10, decimal_places=2)

    # Travel reimbursement goes entirely to the worker, not split with platform
    travel_fee_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # net = gross_amount - commission_amt + travel_fee_earned
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)

    is_bonus_eligible = models.BooleanField(default=False)
    bonus_amount      = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    commission_period = models.CharField(
        max_length=10,
        choices=CommissionPeriodChoice.choices,
        default=CommissionPeriodChoice.STANDARD
    )

    # null until admin runs the settlement batch
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'worker_earnings'

    def __str__(self):
        return (
            f'Earning for {self.worker_profile.user.full_name} — '
            f'{self.net_amount} PKR net'
        )


# -------------------------------------------------------
# COMMISSION PERIOD
# -------------------------------------------------------

class CommissionPeriod(models.Model):
    """
    Tracks monthly commission tier and bonus eligibility per worker.
    If a worker completes enough jobs in a month they move to the
    'elevated' tier and may earn a bonus on top.
    """

    class PeriodType(models.TextChoices):
        STANDARD = 'standard', 'Standard'
        ELEVATED = 'elevated', 'Elevated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE
    )

    period = models.CharField(max_length=10, choices=PeriodType.choices)

    # First day of the calendar month this record covers
    month = models.DateField()

    jobs_completed = models.PositiveIntegerField(default=0)

    # How many jobs needed to earn the bonus this month
    bonus_threshold = models.PositiveIntegerField()

    # Percentage bonus applied to net earnings above the threshold
    bonus_pct = models.DecimalField(max_digits=5, decimal_places=2)

    bonus_paid = models.BooleanField(default=False)

    class Meta:
        db_table = 'commission_periods'
        # One record per worker per calendar month
        unique_together = ('worker_profile', 'month')

    def __str__(self):
        return (
            f'CommissionPeriod {self.month} — '
            f'{self.worker_profile.user.full_name} ({self.period})'
        )
