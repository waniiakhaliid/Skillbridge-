"""
FILE: locations/utils.py
PURPOSE: Pure-Python geographic utility functions

WHAT THIS FILE DOES:
- haversine_distance: calculates straight-line distance between two lat/lng
  points using the Haversine formula
- No external libraries required — standard math module only
- No PostGIS or GeoDjango — plain PostgreSQL backend

CONNECTS TO:
- locations/views.py — used when creating ETASnapshot records
"""

import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Returns the great-circle distance in kilometres between two points
    on Earth given their latitude and longitude in decimal degrees.

    Uses the Haversine formula — standard spherical geometry, accurate to
    within ~0.3% for distances up to a few hundred km (more than enough
    for city-level travel distance calculations).

    No external library needed — math is part of the Python standard library.
    Used when calculating travel distance between worker and service location
    to populate ETASnapshot.distance_km and Booking.travel_fee.

    Args:
        lat1, lon1: decimal degrees of point A (e.g. worker's current position)
        lat2, lon2: decimal degrees of point B (e.g. customer's service address)

    Returns:
        Distance in kilometres as a float.
    """

    # Earth's mean radius in kilometres
    R = 6371.0

    # Convert decimal degrees to radians — Haversine expects radians
    lat1_r = math.radians(float(lat1))
    lon1_r = math.radians(float(lon1))
    lat2_r = math.radians(float(lat2))
    lon2_r = math.radians(float(lon2))

    # Differences in coordinates
    d_lat = lat2_r - lat1_r
    d_lon = lon2_r - lon1_r

    # Haversine formula
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(R * c, 3)  # rounded to metre precision
