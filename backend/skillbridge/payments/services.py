"""
FILE: payments/services.py
PURPOSE: Business logic for discount validation, payment processing, and earnings

WHAT THIS FILE DOES:
- validate_discount_code: checks code validity and per-customer uniqueness
- process_payment: simulates gateway, marks payment paid
- create_instalments: splits booking total into 3 equal scheduled payments
- create_worker_earning: creates the net payout record after job completion

CONNECTS TO:
- payments/models.py — DiscountCode, CustomerDiscountUse, Payment, Instalment, WorkerEarning
- payments/views.py — calls these functions
- payments/signals.py — calls create_worker_earning on booking completion
"""

import uuid
from datetime import timedelta
from django.utils import timezone


def validate_discount_code(code: str, customer):
    """
    Checks whether a discount code is valid for a specific customer.

    Checks:
    1. Code exists and is_active=True
    2. valid_until not expired (null = no expiry)
    3. max_uses not exceeded (null = unlimited)
    4. Customer has not already used this code

    Returns:
        (DiscountCode, None)   on success
        (None, error_string)   on failure
    """
    from .models import DiscountCode, CustomerDiscountUse

    try:
        discount = DiscountCode.objects.get(code=code, is_active=True)
    except DiscountCode.DoesNotExist:
        return None, 'Discount code not found or inactive.'

    # Expiry check — null valid_until means never expires
    if discount.valid_until and discount.valid_until < timezone.now():
        return None, 'This discount code has expired.'

    # Usage cap check — null max_uses means unlimited
    if discount.max_uses is not None and discount.used_count >= discount.max_uses:
        return None, 'This discount code has reached its usage limit.'

    # Per-customer uniqueness — one use per code per customer
    already_used = CustomerDiscountUse.objects.filter(
        customer=customer,
        discount=discount
    ).exists()
    if already_used:
        return None, 'You have already used this discount code.'

    return discount, None


def process_payment(payment):
    """
    Simulates a payment gateway response.

    In production: replace this function body with a real JazzCash / EasyPaisa
    API call. The interface (accepts a Payment, returns a dict) stays the same.

    Sets status='paid', gateway_ref='MOCK-REF-XXXX', paid_at=now().
    Saves the payment record and returns the result dict.
    """
    # MOCK — in production this would call the real gateway SDK
    mock_ref = f'MOCK-REF-{str(uuid.uuid4())[:8].upper()}'

    payment.status          = 'paid'
    payment.gateway_ref     = mock_ref
    payment.gateway_payload = {
        'provider':   'mock',
        'ref':        mock_ref,
        'status':     'SUCCESS',
        'amount':     str(payment.amount),
        'currency':   'PKR',
        'processed_at': str(timezone.now()),
    }
    payment.paid_at = timezone.now()
    payment.save()

    return {'status': 'paid', 'gateway_ref': mock_ref}


def create_instalments(booking):
    """
    Splits booking.total_price into 3 equal instalments.

    Due dates: today, today+30 days, today+60 days.
    The third instalment absorbs any rounding remainder so the
    sum of all three always equals total_price exactly.

    Returns:
        List of 3 saved Instalment objects.
    """
    from .models import Instalment

    total    = booking.total_price
    base_amt = round(total / 3, 2)

    # Remainder goes to instalment 3 to ensure exact sum
    remainder = round(total - base_amt * 2, 2)

    now      = timezone.now()
    amounts  = [base_amt, base_amt, remainder]
    offsets  = [0, 30, 60]  # days from today
    created  = []

    for i, (amount, offset) in enumerate(zip(amounts, offsets), start=1):
        inst = Instalment.objects.create(
            booking       = booking,
            instalment_no = i,
            amount        = amount,
            due_date      = now + timedelta(days=offset),
        )
        created.append(inst)

    return created


def create_worker_earning(booking):
    """
    Creates a WorkerEarning record after a booking is completed.

    net = total_price - commission_amt + travel_fee

    Called automatically by bookings/signals.py when booking status → completed.

    Returns:
        The saved WorkerEarning instance.
    """
    from .models import WorkerEarning

    gross_amount   = booking.total_price
    commission_amt = booking.platform_commission_amt
    travel_fee     = booking.travel_fee

    # Net = what the worker receives: service revenue minus platform cut,
    # plus full travel reimbursement (travel fee is pass-through, not split)
    net_amount = round(
        float(gross_amount) - float(commission_amt) + float(travel_fee),
        2
    )

    earning = WorkerEarning.objects.create(
        worker_profile    = booking.worker_profile,
        booking           = booking,
        gross_amount      = gross_amount,
        commission_amt    = commission_amt,
        travel_fee_earned = travel_fee,
        net_amount        = net_amount,
    )

    return earning
