"""
FILE: chatbot/views.py
PURPOSE: API views for chatbot session and message management

WHAT THIS FILE DOES:
- ChatbotSessionListCreateView: list own sessions or start a new one
- ChatbotMessageListCreateView: get message history or send a new message
  (sending a message saves the user message, calls get_chatbot_reply,
   saves the assistant message, and returns both)

CONNECTS TO:
- chatbot/urls.py — wires these views to URL patterns
- chatbot/serializers.py — serializes sessions and messages
- chatbot/services.py — get_chatbot_reply generates the response
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import ChatbotSession, ChatbotMessage
from .serializers import ChatbotSessionSerializer, ChatbotMessageSerializer
from .services import get_chatbot_reply


class ChatbotSessionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/chatbot/sessions/ — list own sessions, newest first
    POST /api/chatbot/sessions/ — start a new support session
    """
    serializer_class   = ChatbotSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Scoped to own sessions only — users cannot read each other's chats
        return ChatbotSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # user is always the authenticated user — cannot create sessions for others
        serializer.save(user=self.request.user)


class ChatbotMessageListCreateView(generics.GenericAPIView):
    """
    GET  /api/chatbot/sessions/<uuid:pk>/messages/
         Returns the full message history for a session (oldest first).
         The requesting user must own the session.

    POST /api/chatbot/sessions/<uuid:pk>/messages/
         Accepts the user's message, generates an assistant reply, saves both,
         and returns both in the response so the UI can append them immediately.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_session(self, pk):
        """Returns the session only if it belongs to the requesting user."""
        return get_object_or_404(
            ChatbotSession,
            pk=pk,
            user=self.request.user   # enforces ownership — no session hijacking
        )

    def get(self, request, pk):
        session  = self._get_session(pk)
        messages = ChatbotMessage.objects.filter(
            session=session
        ).order_by('sent_at')
        return Response(ChatbotMessageSerializer(messages, many=True).data)

    def post(self, request, pk):
        session = self._get_session(pk)
        content = request.data.get('content', '').strip()

        if not content:
            return Response(
                {'error': 'Message content cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Save the user's message
        user_message = ChatbotMessage.objects.create(
            session = session,
            role    = ChatbotMessage.Role.USER,
            content = content,
        )

        # 2. Generate the assistant reply via the service layer
        reply_text = get_chatbot_reply(session, content)

        # 3. Save the assistant's reply
        assistant_message = ChatbotMessage.objects.create(
            session = session,
            role    = ChatbotMessage.Role.ASSISTANT,
            content = reply_text,
        )

        # 4. Return both messages so the frontend can render them immediately
        return Response(
            {
                'user_message':      ChatbotMessageSerializer(user_message).data,
                'assistant_message': ChatbotMessageSerializer(assistant_message).data,
            },
            status=status.HTTP_201_CREATED
        )
