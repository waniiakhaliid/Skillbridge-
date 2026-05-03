"""
FILE: notifications/apps.py
PURPOSE: App configuration for the notifications app

WHAT THIS FILE DOES:
- Declares NotificationsConfig so Django recognises 'notifications' as installed

CONNECTS TO:
- skillbridge/settings.py — listed in INSTALLED_APPS as 'notifications'
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = 'notifications'
