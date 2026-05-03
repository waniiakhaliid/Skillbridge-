"""
FILE: notifications/models.py
PURPOSE: In-app notification and push token models

WHAT THIS FILE DOES:
- Notification: stores every notification sent to a user so they can
  read it in-app (bell icon, notification centre)
- PushToken: stores device tokens for future real push notification delivery

CONNECTS TO:
- accounts/models.py — User (FK target)
- notifications/services.py — creates Notification rows
- notifications/views.py — exposes notifications to the API
"""

import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    One in-app notification for a single user.
    Created by send_notification() whenever a booking event or payment
    event fires. Displayed in the notification centre / bell icon.
    """

    class NotificationType(models.TextChoices):
        BOOKING_UPDATE = 'booking_update', 'Booking Update'
        PAYMENT        = 'payment',        'Payment'
        REVIEW         = 'review',         'Review'
        SYSTEM         = 'system',         'System'
        PROMO          = 'promo',          'Promo'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    type  = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    body  = models.TextField()

    # Optional JSON payload for frontend deep-linking
    # e.g. {'booking_id': 'abc-123'} so the app can navigate on tap
    data = models.JSONField(null=True, blank=True)

    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        # Unread first, then newest — standard notification centre order
        ordering = ['is_read', '-created_at']

    def __str__(self):
        return f'[{self.type}] {self.title} → {self.user.email}'


class PushToken(models.Model):
    """
    A device push token registered by a user for their mobile/web app.
    Used to send push notifications via FCM (Android) or APNs (iOS).
    Currently stored but not yet sent — placeholder for future integration.
    """

    class Platform(models.TextChoices):
        ANDROID = 'android', 'Android'
        IOS     = 'ios',     'iOS'
        WEB     = 'web',     'Web'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_tokens'
    )

    # The raw FCM/APNs token string — unique across all users and devices
    token    = models.TextField(unique=True)
    platform = models.CharField(max_length=10, choices=Platform.choices)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'push_tokens'

    def __str__(self):
        return f'PushToken ({self.platform}) — {self.user.email}'
