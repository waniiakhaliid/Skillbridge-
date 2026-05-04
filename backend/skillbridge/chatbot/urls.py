# """
# FILE: chatbot/urls.py
# PURPOSE: URL routing for the chatbot app

# WHAT THIS FILE DOES:
# - Session list/create endpoint
# - Per-session message list/create endpoint
# - Gemini AI proxy endpoint for the frontend chatbot widget

# CONNECTS TO:
# - skillbridge/urls.py — included at path('api/chatbot/', ...)
# - chatbot/views.py — view classes
# """

# from django.urls import path
# from .views import (
#     ChatbotSessionListCreateView,
#     ChatbotMessageListCreateView,
#     gemini_proxy,
# )

# urlpatterns = [
#     # GET  /api/chatbot/sessions/           — list own sessions
#     # POST /api/chatbot/sessions/           — start a new session
#     path('sessions/', ChatbotSessionListCreateView.as_view(), name='chatbot-session-list'),

#     # GET  /api/chatbot/sessions/<uuid>/messages/ — message history
#     # POST /api/chatbot/sessions/<uuid>/messages/ — send a message
#     path(
#         'sessions/<uuid:pk>/messages/',
#         ChatbotMessageListCreateView.as_view(),
#         name='chatbot-message-list'
#     ),

#     # POST /api/chatbot/chat/ — Gemini AI proxy for the frontend widget
#     path('chat/', gemini_proxy, name='chatbot-gemini-proxy'),
# ]
"""
FILE: chatbot/urls.py
"""

from django.urls import path
from .views import gemini_proxy

urlpatterns = [
    # POST /api/chatbot/chat/ — Gemini AI proxy for the Bridget widget
    path('chat/', gemini_proxy, name='chatbot-gemini-proxy'),
]