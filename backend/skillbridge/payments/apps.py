"""
FILE: payments/apps.py
PURPOSE: App configuration — connects payment signals when Django is ready

WHAT THIS FILE DOES:
- Declares PaymentsConfig as the app config class
- ready() imports payments/signals.py so post_save handlers are registered

CONNECTS TO:
- payments/signals.py — signal handlers loaded here
- skillbridge/settings.py — listed in INSTALLED_APPS as 'payments'
"""

from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    name = 'payments'

    def ready(self):
        # Import signals here so @receiver decorators are registered at startup.
        # Must be inside ready() to avoid AppRegistryNotReady errors.
        import payments.signals  # noqa: F401
