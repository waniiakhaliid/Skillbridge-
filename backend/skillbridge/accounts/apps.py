"""
FILE: accounts/apps.py
PURPOSE: App configuration — connects signals when Django is ready

WHAT THIS FILE DOES:
- Declares AccountsConfig as the app config class
- ready() imports accounts/signals.py so the post_save handlers are registered
  before any request is served

CONNECTS TO:
- accounts/signals.py — the signal handlers loaded here
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        # Import signals here so the @receiver decorators fire when Django starts.
        # Must be inside ready() — importing at module level causes AppRegistryNotReady.
        import accounts.signals  # noqa: F401
