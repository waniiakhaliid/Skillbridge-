"""
FILE: bookings/apps.py
PURPOSE: App configuration — connects signals when Django is ready

WHAT THIS FILE DOES:
- Declares BookingsConfig as the app config class
- ready() imports bookings/signals.py so the post_save handlers are registered
  before any request is served

CONNECTS TO:
- bookings/signals.py — the signal handlers loaded here
"""

from django.apps import AppConfig


class BookingsConfig(AppConfig):
    name = 'bookings'

    def ready(self):
        # Import signals here so @receiver decorators fire when Django starts.
        # Must be inside ready() — importing at module level causes AppRegistryNotReady.
        import bookings.signals  # noqa: F401
