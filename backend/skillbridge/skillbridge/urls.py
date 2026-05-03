"""
Main URL configuration for SkillBridge.

FILE LOCATION: skillbridge/skillbridge/urls.py

This file is the entry point for ALL API routes.
Each app registers its own urls here with a prefix.
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    
    TokenRefreshView,      # POST /api/auth/refresh/ → returns new access token
)

from accounts.tokens import SkillBridgeTokenView  # POST /api/auth/login/  → returns access + refresh token
from accounts.views import LogoutView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django's built-in admin panel at /admin/
    path('admin/', admin.site.urls),

    # -------------------------------------------------------
    # AUTH ENDPOINTS
    # These come from Simple JWT, not our own views.
    # POST /api/auth/login/   { "email": ..., "password": ... }
    # POST /api/auth/refresh/ { "refresh": ... }
    # -------------------------------------------------------
    path('api/auth/login/', SkillBridgeTokenView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(),   name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    # -------------------------------------------------------
    # APP ROUTES
    # Each app handles its own URLs internally.
    # accounts app → /api/accounts/...
    # bookings app → /api/bookings/...
    # -------------------------------------------------------
    path('api/accounts/', include('accounts.urls')),
    path('api/bookings/', include('bookings.urls')),

    # -------------------------------------------------------
    # PHASE-2 APP ROUTES (appended — existing paths above untouched)
    # -------------------------------------------------------
    path('api/locations/',     include('locations.urls')),
    path('api/payments/',      include('payments.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/chatbot/',       include('chatbot.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)