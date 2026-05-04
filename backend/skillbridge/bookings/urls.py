"""
FILE LOCATION: skillbridge/bookings/urls.py
"""

from django.urls import path
from .views import (
    # ── Phase-1 views (unchanged) ────────────────────────────────────
    BookingCreateView,
    CustomerBookingListView,
    WorkerBookingListView,
    BookingDetailView,
    BookingStatusUpdateView,
    BookingCancelView,
    ReviewCreateView,
    WorkerReviewListView,
    CustomerReviewListView,
    # ── Phase-2 views ────────────────────────────────────────────────
    BookingViewSet,
    ReviewViewSet,
    AdminBookingListView,
    AdminDisputeListView,
    AdminDisputeUpdateView,

)

urlpatterns = [

    # -------------------------------------------------------
    # BOOKINGS
    # POST   /api/bookings/              → create booking
    # GET    /api/bookings/my/           → customer's bookings
    # GET    /api/bookings/worker/       → worker's bookings
    # GET    /api/bookings/<uuid>/       → single booking detail
    # PATCH  /api/bookings/<uuid>/status/ → update status
    # POST   /api/bookings/<uuid>/cancel/ → cancel booking
    # -------------------------------------------------------

    path('',                          BookingCreateView.as_view(),        name='booking-create'),
    path('my/',                       CustomerBookingListView.as_view(),   name='customer-bookings'),
    path('worker/',                   WorkerBookingListView.as_view(),     name='worker-bookings'),
    path('<uuid:pk>/',                BookingDetailView.as_view(),         name='booking-detail'),
    path('<uuid:pk>/status/',         BookingStatusUpdateView.as_view(),   name='booking-status'),
    path('<uuid:pk>/cancel/',         BookingCancelView.as_view(),         name='booking-cancel'),

    # -------------------------------------------------------
    # REVIEWS
    # POST /api/bookings/<uuid>/review/
    # GET  /api/bookings/workers/<uuid>/reviews/
    # GET  /api/bookings/my/reviews/
    # -------------------------------------------------------

    path('<uuid:booking_pk>/review/',              ReviewCreateView.as_view(),     name='review-create'),
    path('workers/<uuid:worker_pk>/reviews/',      WorkerReviewListView.as_view(), name='worker-reviews'),
    path('my/reviews/', CustomerReviewListView.as_view(), name='customer-reviews'),

    # -------------------------------------------------------
    # PHASE-2 ROUTES (appended — no existing route is changed)
    # BookingViewSet actions wired explicitly to avoid router
    # conflicts with existing Phase-1 paths above.
    # -------------------------------------------------------

    # Worker lifecycle actions
    path('<uuid:pk>/accept/',   BookingViewSet.as_view({'patch': 'accept'}),   name='booking-accept'),
    path('<uuid:pk>/reject/',   BookingViewSet.as_view({'patch': 'reject'}),   name='booking-reject'),
    path('<uuid:pk>/start/',    BookingViewSet.as_view({'patch': 'start'}),    name='booking-start'),
    path('<uuid:pk>/complete/', BookingViewSet.as_view({'patch': 'complete'}), name='booking-complete'),

    # Cancel action (customer or worker) — separate from Phase-1 BookingCancelView
    # which is POST; this is PATCH for API consistency
    path('<uuid:pk>/cancel-v2/', BookingViewSet.as_view({'patch': 'cancel'}),  name='booking-cancel-v2'),

    # Photo management
    path('<uuid:pk>/photos/',                          BookingViewSet.as_view({'post': 'upload_photo'}),   name='booking-photo-upload'),
    path('<uuid:pk>/photos/<uuid:photo_id>/',          BookingViewSet.as_view({'delete': 'delete_photo'}), name='booking-photo-delete'),

    # Review retrieve (participant or admin)
    path('reviews/<uuid:pk>/', ReviewViewSet.as_view({'get': 'retrieve'}), name='review-detail'),

    # Admin booking + dispute views
    path('admin/',                       AdminBookingListView.as_view(),   name='admin-booking-list'),
    path('admin/disputes/',              AdminDisputeListView.as_view(),   name='admin-dispute-list'),
    path('admin/disputes/<uuid:pk>/',    AdminDisputeUpdateView.as_view(), name='admin-dispute-update'),
]