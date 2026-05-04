"""
FILE: payments/urls.py
PURPOSE: URL routing for the payments app

WHAT THIS FILE DOES:
- Discount validation endpoint
- Booking payment creation endpoint
- Instalment list and pay endpoints
- Worker earnings and commission endpoints
- Admin earnings and commission admin endpoints

CONNECTS TO:
- skillbridge/urls.py — included at path('api/payments/', ...)
- payments/views.py — all view classes
"""

from django.urls import path
from .views import (
    DiscountValidateView,
    PaymentCreateView,
    InstalmentListView,
    InstalmentPayView,
    WorkerEarningsView,
    CommissionView,
    AdminEarningsView,
    AdminCommissionView,
)

urlpatterns = [
    # GET  /api/payments/discount/<code>/ — validate a promo code
    path('discount/<str:code>/',            DiscountValidateView.as_view(),  name='discount-validate'),

    # POST /api/payments/bookings/<pk>/pay/ — pay a booking
    path('bookings/<uuid:pk>/pay/',         PaymentCreateView.as_view(),     name='payment-create'),

    # GET  /api/payments/bookings/<pk>/instalments/ — list instalment schedule
    path('bookings/<uuid:pk>/instalments/', InstalmentListView.as_view(),    name='instalment-list'),

    # POST /api/payments/instalments/<pk>/pay/ — pay a single instalment
    path('instalments/<uuid:pk>/pay/',      InstalmentPayView.as_view(),     name='instalment-pay'),

    # GET  /api/payments/workers/me/earnings/ — own earnings history
    path('workers/me/earnings/',            WorkerEarningsView.as_view(),    name='worker-earnings'),

    # GET  /api/payments/workers/me/commission/ — own commission periods
    path('workers/me/commission/',          CommissionView.as_view(),        name='worker-commission'),

    # Admin endpoints
    path('admin/earnings/',                 AdminEarningsView.as_view(),     name='admin-earnings'),
    path('admin/commission/',               AdminCommissionView.as_view(),   name='admin-commission'),
]
