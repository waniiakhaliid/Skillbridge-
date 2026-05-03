"""
FILE: chatbot/apps.py
PURPOSE: App configuration for the chatbot app

WHAT THIS FILE DOES:
- Declares ChatbotConfig so Django recognises 'chatbot' as an installed app

CONNECTS TO:
- skillbridge/settings.py — listed in INSTALLED_APPS as 'chatbot'
"""

from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    name = 'chatbot'
