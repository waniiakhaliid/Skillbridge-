"""
Bookings URL Configuration

FILE LOCATION: skillbridge/bookings/urls.py

All URLs here are prefixed with /api/bookings/
"""

from django.urls import path
from .views import (
    BookingCreateView,
    CustomerBookingListView,
    WorkerBookingListView,
    BookingDetailView,
    BookingStatusUpdateView,
    BookingCancelView,
    ReviewCreateView,
    WorkerReviewListView,
)

urlpatterns = [
    # -------------------------------------------------------
    # BOOKINGS
    # POST   /api/bookings/           → create new booking (customer)
    # GET    /api/bookings/my/        → customer's own bookings
    # GET    /api/bookings/worker/    → worker's assigned bookings
    # GET    /api/bookings/<uuid>/    → single booking detail
    # PATCH  /api/bookings/<uuid>/status/  → update status (worker)
    # POST   /api/bookings/<uuid>/cancel/  → cancel booking (customer)
    # -------------------------------------------------------
    path('',                         BookingCreateView.as_view(),        name='booking-create'),
    path('my/',                      CustomerBookingListView.as_view(),   name='customer-bookings'),
    path('worker/',                  WorkerBookingListView.as_view(),     name='worker-bookings'),
    path('<uuid:pk>/',               BookingDetailView.as_view(),         name='booking-detail'),
    path('<uuid:pk>/status/',        BookingStatusUpdateView.as_view(),   name='booking-status'),
    path('<uuid:pk>/cancel/',        BookingCancelView.as_view(),         name='booking-cancel'),

    # -------------------------------------------------------
    # REVIEWS
    # POST /api/bookings/<uuid>/review/               → leave a review
    # GET  /api/bookings/workers/<uuid>/reviews/      → all reviews for a worker
    # -------------------------------------------------------
    path('<uuid:booking_pk>/review/',           ReviewCreateView.as_view(),     name='review-create'),
    path('workers/<uuid:worker_pk>/reviews/',   WorkerReviewListView.as_view(), name='worker-reviews'),
]