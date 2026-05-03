"""
FILE: chatbot/models.py
PURPOSE: Session and message models for the SkillBridge support chatbot

WHAT THIS FILE DOES:
- ChatbotSession: one support conversation per user per session start
- ChatbotMessage: individual messages within a session (user or assistant)

CONNECTS TO:
- accounts/models.py — User (FK target)
- chatbot/views.py — reads/writes sessions and messages
- chatbot/services.py — get_chatbot_reply called per user message
"""

import uuid
from django.db import models
from django.conf import settings


class ChatbotSession(models.Model):
    """
    One support chat session.
    A user may have multiple sessions over time (each new chat is a new session).
    context stores metadata like the last topic discussed or a related booking_id
    so a future LLM integration can resume with context.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chatbot_sessions'
    )

    started_at = models.DateTimeField(auto_now_add=True)

    # Stores session metadata for future LLM integration
    # e.g. {'last_topic': 'payment', 'booking_id': 'abc-123'}
    context = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'chatbot_sessions'
        ordering = ['-started_at']

    def __str__(self):
        return f'ChatSession #{str(self.id)[:8]} — {self.user.email}'


class ChatbotMessage(models.Model):
    """
    A single message in a chatbot session.
    BigAutoField PK because a session can have hundreds of messages —
    integer IDs are faster to insert and index at this volume than UUIDs.
    """

    class Role(models.TextChoices):
        USER      = 'user',      'User'
        ASSISTANT = 'assistant', 'Assistant'

    # BigAutoField not UUID — a session can have hundreds of messages;
    # integer IDs are faster to insert and index at this volume
    id = models.BigAutoField(primary_key=True)

    session = models.ForeignKey(
        ChatbotSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    role    = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()

    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chatbot_messages'
        ordering = ['sent_at']

    def __str__(self):
        return f'[{self.role}] {self.content[:40]}…'
