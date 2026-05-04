"""
FILE: chatbot/serializers.py
PURPOSE: Serializers for ChatbotSession and ChatbotMessage

WHAT THIS FILE DOES:
- ChatbotSessionSerializer: list and create sessions
- ChatbotMessageSerializer: list messages and accept new user messages

CONNECTS TO:
- chatbot/views.py — imported by all chatbot views
- chatbot/models.py — source models
"""

from rest_framework import serializers
from .models import ChatbotSession, ChatbotMessage


class ChatbotSessionSerializer(serializers.ModelSerializer):
    """
    Session serializer.
    user is set from the authenticated request in the view — never from the client.
    context is read-only via the API; it's updated internally by the service layer.
    """

    class Meta:
        model  = ChatbotSession
        fields = ['id', 'started_at', 'context']
        read_only_fields = ['id', 'started_at', 'context']


class ChatbotMessageSerializer(serializers.ModelSerializer):
    """
    Message serializer.
    On write: client sends only 'content' — role and session are set by the view.
    On read: returns id, role, content, sent_at for display in the chat UI.
    """

    class Meta:
        model  = ChatbotMessage
        fields = ['id', 'role', 'content', 'sent_at']
        read_only_fields = ['id', 'role', 'sent_at']
