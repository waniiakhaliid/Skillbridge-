"""
Accounts URL Configuration

FILE LOCATION: skillbridge/accounts/urls.py

All URLs here are prefixed with /api/accounts/
(that prefix is set in the main skillbridge/urls.py)
"""

from django.urls import path
from .views import (
    # ── existing Phase-1 views ──────────────────────────────────────
    CustomerRegisterView,
    WorkerDocumentUploadView,
    WorkerRegisterView,
    MeView,
    WorkerListView,
    WorkerDetailView,
    WorkerProfileUpdateView,
    CustomerProfileUpdateView,
    # ── Phase-2 views ───────────────────────────────────────────────
    RegisterView,
    ChangePasswordView,
    WorkerAvailabilityView,
    WorkerAvailabilityDeleteView,
    WorkerServiceView,
    WorkerServiceDeleteView,
    WorkerToolView,
    WorkerToolDeleteView,
    WorkerPortfolioView,
    WorkerPortfolioDeleteView,
    FavoriteListCreateView,
    FavoriteDeleteView,
    WorkerReviewListView,
    # AdminUserListView,
    # AdminUserStatusView,
    # AdminWorkerPendingView,
    # AdminWorkerVerifyView,
    # AdminDashboardView,
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

    # -------------------------------------------------------
    # PHASE-2 ROUTES (appended — no existing route above is changed)
    # -------------------------------------------------------

    # Unified registration (role in body)
    path('register/',                          RegisterView.as_view(),              name='register'),

    # Password management
    path('me/change-password/',                ChangePasswordView.as_view(),         name='change-password'),

    # Public worker endpoints
    path('workers/<uuid:pk>/reviews/',         WorkerReviewListView.as_view(),       name='worker-reviews-accounts'),

    # Worker self-management (requires IsWorker)
    path('workers/me/availability/',           WorkerAvailabilityView.as_view(),     name='worker-availability-list'),
    path('workers/me/availability/<uuid:pk>/', WorkerAvailabilityDeleteView.as_view(), name='worker-availability-delete'),
    path('workers/me/services/',               WorkerServiceView.as_view(),          name='worker-service-create'),
    path('workers/me/services/<uuid:pk>/',     WorkerServiceDeleteView.as_view(),    name='worker-service-delete'),
    path('workers/me/tools/',                  WorkerToolView.as_view(),             name='worker-tool-create'),
    path('workers/me/tools/<uuid:pk>/',        WorkerToolDeleteView.as_view(),       name='worker-tool-delete'),
    path('workers/me/portfolio/',              WorkerPortfolioView.as_view(),        name='worker-portfolio-create'),
    path('workers/me/portfolio/<uuid:pk>/',    WorkerPortfolioDeleteView.as_view(),  name='worker-portfolio-delete'),

    # Customer favourites (requires IsCustomer)
    path('favorites/',                         FavoriteListCreateView.as_view(),     name='favorite-list'),
    path('favorites/<uuid:pk>/',               FavoriteDeleteView.as_view(),         name='favorite-delete'),

    # # Admin-only endpoints (require IsAdminRole)
    # path('admin/users/',                       AdminUserListView.as_view(),          name='admin-user-list'),
    # path('admin/users/<uuid:pk>/status/',      AdminUserStatusView.as_view(),        name='admin-user-status'),
    # path('admin/workers/pending/',             AdminWorkerPendingView.as_view(),     name='admin-worker-pending'),
    # path('admin/workers/<uuid:pk>/verify/',    AdminWorkerVerifyView.as_view(),      name='admin-worker-verify'),
    # path('admin/dashboard/',                   AdminDashboardView.as_view(),         name='admin-dashboard'),
]