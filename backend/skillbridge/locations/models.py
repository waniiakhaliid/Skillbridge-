"""
FILE: locations/models.py
PURPOSE: GPS tracking, customer address book, and ETA snapshot models

WHAT THIS FILE DOES:
- CustomerAddress: address book entries for customers (lat/lng optional)
- GPSTracking: high-frequency worker location pings during active bookings
- ETASnapshot: calculated ETA from worker to job site, stored per calculation

CONNECTS TO:
- accounts/models.py — CustomerProfile, WorkerProfile
- bookings/models.py — Booking
- locations/utils.py — haversine_distance used to populate distance_km
"""

import uuid
from django.db import models
from django.conf import settings

from accounts.models import CustomerProfile, WorkerProfile


class CustomerAddress(models.Model):
    """
    An address saved by a customer (Home, Office, etc.).
    lat/lng are optional — customers may not always have a GPS device.
    Plain DecimalField, not PostGIS — standard PostgreSQL backend only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    customer = models.ForeignKey(
        CustomerProfile,
        on_delete=models.CASCADE,
        related_name='addresses'
    )

    # Human label — 'Home', 'Office', 'Parents' etc.
    label = models.CharField(max_length=50)

    # Full street address as a text string for display
    address_line = models.TextField()

    # Plain decimal coordinates — no PostGIS dependency
    latitude  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Only one default address allowed per customer — enforced in the view
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'customer_addresses'

    def __str__(self):
        return f'{self.customer.user.full_name} — {self.label}'


class GPSTracking(models.Model):
    """
    A single GPS ping from a worker's device.
    Inserted at high frequency during active bookings — sometimes every 5-10 seconds.
    BigAutoField (integer PK) instead of UUID because:
    - UUID generation adds ~microsecond overhead per insert
    - At 1 ping/5s per active booking, a busy platform inserts thousands/minute
    - Integer PKs are also cheaper to index and JOIN on
    """

    # BigAutoField not UUID — GPS pings are inserted constantly during active
    # bookings; UUID generation overhead would slow high-frequency inserts
    id = models.BigAutoField(primary_key=True)

    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE,
        related_name='gps_pings'
    )

    # Null allowed — worker may ping their location while not on a booking
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gps_pings'
    )

    # Plain decimal coordinates — no PostGIS dependency
    latitude  = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    # Null when the device doesn't report speed (e.g. browser geolocation API)
    speed_kmh   = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    heading_deg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gps_tracking'

    def __str__(self):
        return f'GPS ping — {self.worker_profile.user.full_name} @ {self.recorded_at}'


class ETASnapshot(models.Model):
    """
    A point-in-time ETA estimate from worker to service location.
    Stored per calculation so the customer can see ETA history
    and the system can detect if a worker is running significantly late.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='eta_snapshots'
    )

    worker_profile = models.ForeignKey(
        WorkerProfile,
        on_delete=models.CASCADE
    )

    # Positive integer minutes — cleaner than a float for display
    eta_minutes = models.PositiveIntegerField()

    # Distance in km, stored with 2 decimal places for display precision
    distance_km = models.DecimalField(max_digits=6, decimal_places=2)

    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'eta_snapshots'

    def __str__(self):
        return (
            f'ETA for Booking #{str(self.booking.id)[:8]} — '
            f'{self.eta_minutes} min ({self.distance_km} km)'
        )
