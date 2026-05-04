"""
FILE: locations/serializers.py
PURPOSE: Serializers for CustomerAddress, GPSTracking, and ETASnapshot

WHAT THIS FILE DOES:
- CustomerAddressSerializer: full CRUD for a customer's saved address
- GPSTrackingSerializer: write-only ping from a worker device
- ETASnapshotSerializer: read/write ETA estimate for a booking

CONNECTS TO:
- locations/views.py — imported by all location views
- locations/models.py — source models
"""

from rest_framework import serializers
from .models import CustomerAddress, GPSTracking, ETASnapshot


class CustomerAddressSerializer(serializers.ModelSerializer):
    """
    Full serializer for a customer's saved address.
    customer is set from the authenticated user in the view —
    never exposed as a writable field to prevent data-ownership attacks.
    """

    class Meta:
        model  = CustomerAddress
        fields = [
            'id', 'label', 'address_line',
            'latitude', 'longitude',
            'is_default', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class GPSTrackingSerializer(serializers.ModelSerializer):
    """
    Write-only ping serializer — workers POST their current position.
    worker_profile and booking are set in the view from the authenticated user.
    recorded_at is auto-set by the model — never accept it from the client.
    """

    class Meta:
        model  = GPSTracking
        fields = [
            'id', 'booking',
            'latitude', 'longitude',
            'speed_kmh', 'heading_deg',
            'recorded_at',
        ]
        read_only_fields = ['id', 'recorded_at']
        # booking is optional — worker may ping while travelling to a job
        extra_kwargs = {'booking': {'required': False}}


class ETASnapshotSerializer(serializers.ModelSerializer):
    """
    ETA estimate for a specific booking.
    calculated_at is auto-set — worker provides eta_minutes and distance_km.
    """

    class Meta:
        model  = ETASnapshot
        fields = [
            'id', 'booking', 'worker_profile',
            'eta_minutes', 'distance_km',
            'calculated_at',
        ]
        read_only_fields = ['id', 'calculated_at', 'worker_profile']
