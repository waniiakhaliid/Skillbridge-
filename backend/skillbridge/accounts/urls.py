"""
Accounts URL Configuration

FILE LOCATION: skillbridge/accounts/urls.py

All URLs here are prefixed with /api/accounts/
(that prefix is set in the main skillbridge/urls.py)
"""

from django.urls import path
from .views import (
    CustomerRegisterView,
    WorkerDocumentUploadView,
    WorkerRegisterView,
    MeView,
    WorkerListView,
    WorkerDetailView,
    WorkerProfileUpdateView,
    CustomerProfileUpdateView,
  
)

urlpatterns = [
    # -------------------------------------------------------
    # AUTH / REGISTRATION
    # POST /api/accounts/register/customer/
    # POST /api/accounts/register/worker/
    # -------------------------------------------------------
    path('register/customer/', CustomerRegisterView.as_view(),  name='customer-register'),
    # Step 1+2 — create account
    path('register/worker/', WorkerRegisterView.as_view()),
    # Step 3 — upload documents
    path('worker/documents/', WorkerDocumentUploadView.as_view()),


    # -------------------------------------------------------
    # CURRENT USER
    # GET /api/accounts/me/
    # -------------------------------------------------------
    path('me/', MeView.as_view(), name='me'),

    # -------------------------------------------------------
    # WORKERS
    # GET /api/accounts/workers/               → list all
    # GET /api/accounts/workers/?category=...  → filtered list
    # GET /api/accounts/workers/<uuid>/        → single worker
    # -------------------------------------------------------
    path('workers/',           WorkerListView.as_view(),   name='worker-list'),
    path('workers/<uuid:pk>/', WorkerDetailView.as_view(), name='worker-detail'),

    # -------------------------------------------------------
    # PROFILE UPDATES (logged-in users only)
    # PATCH /api/accounts/worker/profile/
    # PATCH /api/accounts/customer/profile/
    # -------------------------------------------------------
    path('worker/profile/',   WorkerProfileUpdateView.as_view(),   name='worker-profile-update'),
    path('customer/profile/', CustomerProfileUpdateView.as_view(), name='customer-profile-update'),
]