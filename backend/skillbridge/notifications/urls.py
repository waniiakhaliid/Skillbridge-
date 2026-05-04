"""
FILE: notifications/urls.py
PURPOSE: URL routing for the notifications app

WHAT THIS FILE DOES:
- Lists all notification management endpoints
- Push token registration and deletion endpoints

CONNECTS TO:
- skillbridge/urls.py — included at path('api/notifications/', ...)
- notifications/views.py — all view classes
"""

from django.urls import path
from .views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationDeleteView,
    PushTokenCreateView,
    PushTokenDeleteView,
)

urlpatterns = [
    # GET  /api/notifications/ — list own notifications (unread first)
    path('',                       NotificationListView.as_view(),       name='notification-list'),

    # POST /api/notifications/read-all/ — bulk mark all as read
    # Must be before <uuid:pk>/ so Django matches 'read-all' as a literal
    path('read-all/',              NotificationMarkAllReadView.as_view(), name='notification-read-all'),

    # PATCH  /api/notifications/<uuid>/read/    — mark one as read
    path('<uuid:pk>/read/',        NotificationMarkReadView.as_view(),    name='notification-mark-read'),

    # DELETE /api/notifications/<uuid>/         — delete one
    path('<uuid:pk>/',             NotificationDeleteView.as_view(),      name='notification-delete'),

    # POST   /api/notifications/push-tokens/     — register device token
    path('push-tokens/',           PushTokenCreateView.as_view(),         name='push-token-create'),

    # DELETE /api/notifications/push-tokens/<uuid>/ — unregister device token
    path('push-tokens/<uuid:pk>/', PushTokenDeleteView.as_view(),         name='push-token-delete'),
]
