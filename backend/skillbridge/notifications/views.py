"""
FILE: notifications/views.py
PURPOSE: API views for notification management

WHAT THIS FILE DOES:
- NotificationListView: list own notifications, unread first, paginated
- NotificationMarkReadView: mark a single notification as read
- NotificationMarkAllReadView: bulk mark all unread as read
- NotificationDeleteView: delete a single notification
- PushTokenCreateView: register / upsert a device push token
- PushTokenDeleteView: unregister a push token

CONNECTS TO:
- notifications/urls.py — wires these views to URL patterns
- notifications/serializers.py — serializes notification data
- notifications/models.py — Notification, PushToken
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Notification, PushToken
from .serializers import NotificationSerializer, PushTokenSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Returns own notifications, unread first, then newest.
    Paginated to 20 per page by the global PAGE_SIZE setting.
    """
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Scoped to own notifications only — no user can read another's
        return Notification.objects.filter(
            user=self.request.user
        )  # ordering defined on the model: ['is_read', '-created_at']


class NotificationMarkReadView(generics.UpdateAPIView):
    """
    PATCH /api/notifications/<uuid:pk>/read/
    Sets is_read=True on a single notification.
    """
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['patch']

    def get_queryset(self):
        # Scope to own notifications — prevents marking another user's as read
        return Notification.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        notification         = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/read-all/
    Bulk-sets is_read=True for all unread notifications of the current user.
    Cheaper than N individual PATCH requests when the bell badge shows many unread.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)

        return Response({'marked_read': updated})


class NotificationDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/notifications/<uuid:pk>/
    Deletes a single notification for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class PushTokenCreateView(generics.CreateAPIView):
    """
    POST /api/notifications/push-tokens/
    Registers a device push token.
    Upsert behaviour: if the token already exists for this user, update
    the platform field; if it doesn't exist, create it.
    This handles the common case where a user reinstalls the app and
    the OS assigns the same token to the same device.
    """
    serializer_class   = PushTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        token    = request.data.get('token')
        platform = request.data.get('platform')

        # Upsert — one token string across all users is fine (token is unique),
        # but we want to update the user association if it changed
        push_token, created = PushToken.objects.update_or_create(
            token    = token,
            defaults = {'user': request.user, 'platform': platform}
        )

        return Response(
            PushTokenSerializer(push_token).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class PushTokenDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/notifications/push-tokens/<uuid:pk>/
    Unregisters a push token (e.g. user logs out on this device).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Scope to own tokens — prevents deleting another user's token
        return PushToken.objects.filter(user=self.request.user)
