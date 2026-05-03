"""
FILE: notifications/serializers.py
PURPOSE: Serializers for Notification and PushToken models

WHAT THIS FILE DOES:
- NotificationSerializer: read notifications with all fields
- PushTokenSerializer: write a device push token

CONNECTS TO:
- notifications/views.py — imported by all notification views
- notifications/models.py — source models
"""

from rest_framework import serializers
from .models import Notification, PushToken


class NotificationSerializer(serializers.ModelSerializer):
    """
    Read serializer for notifications.
    is_read is the only writable field — updated via PATCH on the mark-read endpoint.
    user is never exposed — every user only sees their own notifications.
    """

    class Meta:
        model  = Notification
        fields = [
            'id', 'type', 'title', 'body',
            'data', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'type', 'title', 'body', 'data', 'created_at']


class PushTokenSerializer(serializers.ModelSerializer):
    """
    Write serializer for registering a device push token.
    user is set from the authenticated user in the view — never from the client.
    Upsert logic (create-or-update) lives in the view.
    """

    class Meta:
        model  = PushToken
        fields = ['id', 'token', 'platform', 'created_at']
        read_only_fields = ['id', 'created_at']
