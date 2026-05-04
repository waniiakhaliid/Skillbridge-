"""
FILE: payments/signals.py
PURPOSE: React to Payment status changes to update booking payment status

WHAT THIS FILE DOES:
- post_save on Payment where status → 'paid':
  - If instalment payment: marks that instalment paid, checks if all paid
  - If full payment: directly marks booking.payment_status = 'paid'
  - Sends payment confirmation notification to the worker

CONNECTS TO:
- payments/apps.py — calls ready() which registers these signals
- payments/models.py — Payment, Instalment
- bookings/models.py — Booking (updated via FK from payment)
- notifications/services.py — lazy import to avoid circular dependency
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='payments.Payment')
def on_payment_paid(sender, instance, created, **kwargs):
    """
    Fires every time a Payment row is saved.
    Acts only when status has just become 'paid' — we check paid_at
    to avoid reacting to every other field change.
    """

    # Only act when the payment is paid and has a timestamp
    if instance.status != 'paid' or not instance.paid_at:
        return

    # Lazy import — payments imports bookings (Booking FK);
    # importing notifications at module top would require notifications to
    # be installed before payments, which we cannot guarantee
    try:
        from notifications.services import send_notification
        has_notifications = True
    except ImportError:
        has_notifications = False

    booking = instance.booking

    if instance.instalment:
        # This payment settled a specific instalment — mark it paid
        instalment         = instance.instalment
        instalment.status  = 'paid'
        instalment.transaction_ref = instance.gateway_ref or ''
        instalment.save(update_fields=['status', 'transaction_ref'])

        # Check if all instalments for this booking are now paid
        all_paid = not booking.instalments.filter(
            status__in=['pending', 'overdue']
        ).exists()

        if all_paid:
            booking.payment_status = 'paid'
            booking.save(update_fields=['payment_status'])
    else:
        # Full single payment — mark booking paid directly
        booking.payment_status = 'paid'
        booking.save(update_fields=['payment_status'])

    # Notify the worker that they will receive payment
    if has_notifications:
        try:
            send_notification(
                booking.worker_profile.user,
                'payment',
                'Payment Received',
                'Payment for your completed booking has been confirmed.',
                data={'booking_id': str(booking.id)}
            )
        except Exception:
            # Notification failure must never block payment confirmation
            pass
