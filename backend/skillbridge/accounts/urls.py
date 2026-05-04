"""
Accounts URL Configuration

FILE LOCATION: skillbridge/accounts/urls.py
"""

from django.urls import path
from .views import (
    # ── Phase-1 views ──
    CustomerRegisterView,
    WorkerDocumentUploadView,
    WorkerRegisterView,
    MeView,
    WorkerListView,
    WorkerDetailView,
    WorkerProfileUpdateView,
    CustomerProfileUpdateView,
    # ── Phase-2 views ──
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
    WorkerPortfolioReorderView,
    FavoriteListCreateView,
    FavoriteDeleteView,
    WorkerReviewListView,
)

urlpatterns = [
    # ── AUTH / REGISTRATION ──
    path('register/customer/',  CustomerRegisterView.as_view(),  name='customer-register'),
    path('register/worker/',    WorkerRegisterView.as_view(),    name='worker-register'),
    path('register/',           RegisterView.as_view(),          name='register'),
    path('worker/documents/',   WorkerDocumentUploadView.as_view(), name='worker-documents'),

    # ── CURRENT USER ──
    path('me/',                 MeView.as_view(),                name='me'),
    path('me/change-password/', ChangePasswordView.as_view(),    name='change-password'),

    # ── WORKERS (public) ──
    path('workers/',            WorkerListView.as_view(),        name='worker-list'),
    path('workers/<uuid:pk>/',  WorkerDetailView.as_view(),      name='worker-detail'),
    path('workers/<uuid:pk>/reviews/', WorkerReviewListView.as_view(), name='worker-reviews-accounts'),

    # ── PROFILE UPDATES ──
    path('worker/profile/',     WorkerProfileUpdateView.as_view(),   name='worker-profile-update'),
    path('customer/profile/',   CustomerProfileUpdateView.as_view(), name='customer-profile-update'),

    # ── WORKER SELF-MANAGEMENT ──
    path('workers/me/availability/',            WorkerAvailabilityView.as_view(),       name='worker-availability-list'),
    path('workers/me/availability/<uuid:pk>/',  WorkerAvailabilityDeleteView.as_view(), name='worker-availability-delete'),
    path('workers/me/services/',                WorkerServiceView.as_view(),            name='worker-service-create'),
    path('workers/me/services/<uuid:pk>/',      WorkerServiceDeleteView.as_view(),      name='worker-service-delete'),
    path('workers/me/tools/',                   WorkerToolView.as_view(),               name='worker-tool-create'),
    path('workers/me/tools/<uuid:pk>/',         WorkerToolDeleteView.as_view(),         name='worker-tool-delete'),

    # ── PORTFOLIO ──
    # NOTE: reorder/ must come BEFORE <uuid:pk>/ so Django doesn't try to
    # parse "reorder" as a UUID
    path('workers/me/portfolio/',               WorkerPortfolioView.as_view(),          name='worker-portfolio'),
    path('workers/me/portfolio/reorder/',       WorkerPortfolioReorderView.as_view(),   name='worker-portfolio-reorder'),
    path('workers/me/portfolio/<uuid:pk>/',     WorkerPortfolioDeleteView.as_view(),    name='worker-portfolio-delete'),

    # ── FAVOURITES ──
    path('favorites/',          FavoriteListCreateView.as_view(), name='favorite-list'),
    path('favorites/<uuid:pk>/', FavoriteDeleteView.as_view(),    name='favorite-delete'),
]