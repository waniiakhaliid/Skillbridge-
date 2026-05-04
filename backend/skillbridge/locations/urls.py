"""
FILE: locations/urls.py
PURPOSE: URL routing for the locations app

WHAT THIS FILE DOES:
- Registers CustomerAddressViewSet via DefaultRouter (full CRUD)
- Wires GPS ping endpoint
- Wires ETA snapshot GET/POST endpoint

CONNECTS TO:
- skillbridge/urls.py — included at path('api/locations/', ...)
- locations/views.py — all view classes
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CustomerAddressViewSet,
    GPSTrackingCreateView,
    ETASnapshotView,
)

router = DefaultRouter()
# Registers: GET/POST /api/locations/addresses/
#            GET/PUT/PATCH/DELETE /api/locations/addresses/<uuid>/
router.register('addresses', CustomerAddressViewSet, basename='address')

urlpatterns = [
    path('', include(router.urls)),

    # POST /api/locations/gps/ — worker live location ping
    path('gps/', GPSTrackingCreateView.as_view(), name='gps-create'),

    # GET/POST /api/locations/bookings/<booking_id>/eta/
    path(
        'bookings/<uuid:booking_id>/eta/',
        ETASnapshotView.as_view(),
        name='eta-snapshot'
    ),
]
