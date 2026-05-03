"""
FILE: locations/apps.py
PURPOSE: App configuration for the locations app

WHAT THIS FILE DOES:
- Declares LocationsConfig so Django recognises 'locations' as an installed app

CONNECTS TO:
- skillbridge/settings.py — listed in INSTALLED_APPS as 'locations'
"""

from django.apps import AppConfig


class LocationsConfig(AppConfig):
    name = 'locations'
