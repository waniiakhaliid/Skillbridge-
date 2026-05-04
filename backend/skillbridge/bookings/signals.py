"""
FILE: bookings/signals.py
PURPOSE: React to Booking and Review status changes with side-effects

WHAT THIS FILE DOES:
- post_save on Booking: sends notifications on status transitions and
  updates worker/customer aggregate counters when a job completes
- post_save on Review (created=True): recalculates WorkerProfile.avg_rating
  and total_reviews after every new review

CONNECTS TO:
- bookings/apps.py calls ready() which registers these handlers
- notifications/services.py send_notification() — lazy import to avoid
  circular dependency (notifications imports accounts, not bookings)
- accounts/models.py WorkerProfile, CustomerProfile
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='bookings.Booking')
def on_booking_status_change(sender, instance, created, **kwargs):
    """
    Fires every time a Booking row is saved.
    We only care about status transitions (not brand-new bookings
    and not unrelated field updates), so we inspect instance.status
    and send the right notification for each transition.
    """

    if created:
        # A new booking was just placed — no status transition to handle yet
        return

    # Lazy import — notifications app imports accounts for User FK;
    # importing at module top here would cause a circular import
    try:
        from notifications.services import send_notification
    except ImportError:
        # notifications app may not be installed during early migrations
        return

    status = instance.status

    if status == 'accepted':
        # Tell the customer their booking was accepted
        send_notification(
            instance.customer.user,
            'booking_update',
            'Booking Accepted',
            'Your booking has been accepted by the worker.',
            data={'booking_id': str(instance.id)}
        )

    elif status == 'completed':
        # Update aggregate counters — these live on the profile models
        # so listing queries don't need to aggregate bookings on the fly
        worker   = instance.worker_profile
        customer = instance.customer

        worker.total_jobs_completed += 1
        worker.save(update_fields=['total_jobs_completed'])

        customer.total_bookings += 1
        # A customer who has completed at least one booking is a repeat customer
        if customer.total_bookings >= 1:
            customer.is_repeat_customer = True
        customer.save(update_fields=['total_bookings', 'is_repeat_customer'])

        # Notify worker that payment will follow shortly
        send_notification(
            worker.user,
            'payment',
            'Job Completed',
            'Payment for your completed job will be processed shortly.',
            data={'booking_id': str(instance.id)}
        )

        # Prompt customer to leave a review while the job is fresh
        send_notification(
            customer.user,
            'review',
            'Leave a Review',
            'How was your experience? Share your feedback.',
            data={'booking_id': str(instance.id)}
        )

    elif status == 'cancelled_worker':
        # Worker cancelled — inform the customer so they can rebook
        send_notification(
            instance.customer.user,
            'booking_update',
            'Booking Cancelled',
            'The worker has cancelled your booking. You can search for another worker.',
            data={'booking_id': str(instance.id)}
        )

    elif status == 'cancelled_customer':
        # Customer cancelled — inform the worker so they can free the slot
        send_notification(
            instance.worker_profile.user,
            'booking_update',
            'Booking Cancelled',
            'The customer has cancelled their booking.',
            data={'booking_id': str(instance.id)}
        )


@receiver(post_save, sender='bookings.Review')
def on_review_created(sender, instance, created, **kwargs):
    """
    Fires when a new Review row is saved.
    Recalculates WorkerProfile.avg_rating as the true arithmetic mean
    of all public reviews for that worker.
    Storing the pre-calculated average on the profile avoids an aggregate
    query every time the worker listing page loads.
    """

    if not created:
        # Only recalculate on new reviews — edits to existing reviews
        # are not supported, so this branch should never fire in practice
        return

    from django.db.models import Avg, Count
    from .models import Review

    worker_user = instance.reviewee

    # Aggregate over all public reviews for this worker's user account
    stats = Review.objects.filter(
        reviewee=worker_user,
        is_public=True
    ).aggregate(avg=Avg('rating'), count=Count('id'))

    try:
        profile = worker_user.worker_profile
        profile.avg_rating    = stats['avg'] or 0
        profile.total_reviews = stats['count']
        profile.save(update_fields=['avg_rating', 'total_reviews'])
    except Exception:
        # worker_profile may not exist in edge cases (test data, admin accounts)
        pass
