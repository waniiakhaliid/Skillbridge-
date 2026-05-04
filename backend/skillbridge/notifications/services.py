"""
FILE: notifications/services.py
PURPOSE: Business logic for creating and delivering notifications

WHAT THIS FILE DOES:
- send_notification: creates a DB Notification row and calls send_push_notification
- send_push_notification: placeholder for real FCM/APNs delivery

CONNECTS TO:
- notifications/models.py — Notification, PushToken
- bookings/signals.py — calls send_notification on booking events
- payments/signals.py — calls send_notification on payment events
- accounts/views.py  — calls send_notification on admin verification actions
"""


def send_notification(user, notif_type: str, title: str, body: str, data=None):
    """
    Creates an in-app Notification DB record and attempts a push notification.

    Args:
        user:       The User instance to notify.
        notif_type: One of 'booking_update', 'payment', 'review', 'system', 'promo'.
        title:      Short notification title (shown in the bell icon).
        body:       Full notification body text.
        data:       Optional dict for frontend deep-linking (e.g. booking_id).

    Returns:
        The saved Notification object.
    """
    from .models import Notification

    notification = Notification.objects.create(
        user  = user,
        type  = notif_type,
        title = title,
        body  = body,
        data  = data or {},
    )

    # Best-effort push notification — failure here must never block the caller
    try:
        send_push_notification(user, title, body)
    except Exception:
        pass

    return notification


def send_push_notification(user, title: str, body: str):
    """
    Placeholder push notification dispatcher.

    No real push gateway is integrated yet.
    In production: replace this body with real FCM (Android) / APNs (iOS) API calls.
    The device tokens are already stored in PushToken — just iterate and POST to the SDK.

    For now: prints to console so developers can confirm the signal chain fired
    during manual testing without needing a real device.
    """
    # PLACEHOLDER — replace with FCM/APNs call in production
    print(f'[PUSH] → {user.email} | {title}: {body}')
