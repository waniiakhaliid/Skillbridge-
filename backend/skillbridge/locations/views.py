"""
FILE: locations/views.py
PURPOSE: API views for address book, GPS tracking, and ETA

WHAT THIS FILE DOES:
- CustomerAddressViewSet: CRUD on own addresses, enforces single default
- GPSTrackingCreateView: worker posts a live GPS ping
- ETASnapshotView: GET latest ETA or POST new ETA for a booking

CONNECTS TO:
- locations/urls.py — wires these views to URL patterns
- locations/serializers.py — serializes/validates request data
- accounts/permissions.py — IsWorker, IsCustomer, IsBookingParticipant
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import CustomerAddress, GPSTracking, ETASnapshot
from .serializers import (
    CustomerAddressSerializer,
    GPSTrackingSerializer,
    ETASnapshotSerializer,
)
from accounts.permissions import IsWorker, IsCustomer, IsBookingParticipant


class CustomerAddressViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for a customer's saved addresses.
    Scoped to the authenticated customer — no customer can read
    or modify another customer's addresses.

    On create/update with is_default=True, all other addresses for this
    customer are first set to is_default=False so only one default exists.
    """
    serializer_class   = CustomerAddressSerializer
    permission_classes = [IsCustomer]

    def get_queryset(self):
        # Filter to own addresses only — prevents cross-customer data leaks
        return CustomerAddress.objects.filter(
            customer=self.request.user.customer_profile
        )

    def perform_create(self, serializer):
        self._clear_default_if_needed(serializer.validated_data)
        serializer.save(customer=self.request.user.customer_profile)

    def perform_update(self, serializer):
        self._clear_default_if_needed(serializer.validated_data)
        serializer.save()

    def _clear_default_if_needed(self, validated_data):
        """
        If the incoming address is marked is_default=True, unset that flag
        on all existing addresses for this customer first.
        Ensures only one default address exists at any time.
        """
        if validated_data.get('is_default'):
            CustomerAddress.objects.filter(
                customer=self.request.user.customer_profile,
                is_default=True
            ).update(is_default=False)


class GPSTrackingCreateView(generics.CreateAPIView):
    """
    POST /api/locations/gps/
    Worker posts their current GPS position.
    worker_profile is always set from the authenticated user — the client
    does not send it, preventing a worker from spoofing another worker's location.
    """
    serializer_class   = GPSTrackingSerializer
    permission_classes = [IsWorker]

    def perform_create(self, serializer):
        serializer.save(worker_profile=self.request.user.worker_profile)


class ETASnapshotView(APIView):
    """
    GET  /api/locations/bookings/<booking_id>/eta/
         Returns the most recent ETASnapshot for the booking.
         Only the booking's customer or worker can access it.

    POST /api/locations/bookings/<booking_id>/eta/
         Worker creates a new ETA snapshot.
         worker_profile and booking are set from the URL and auth token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_booking(self, booking_id):
        from bookings.models import Booking
        return get_object_or_404(Booking, pk=booking_id)

    def _check_participant(self, request, booking):
        """Raises 403 if the user is neither the customer nor the worker."""
        user         = request.user
        is_customer  = (booking.customer.user == user)
        is_worker    = (booking.worker_profile.user == user)
        is_admin     = (user.role == 'admin' and user.is_staff)
        if not (is_customer or is_worker or is_admin):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You are not a participant of this booking.')

    def get(self, request, booking_id):
        booking = self._get_booking(booking_id)
        self._check_participant(request, booking)

        # Return the most recent snapshot — cheapest query is latest by PK
        snapshot = ETASnapshot.objects.filter(
            booking=booking
        ).order_by('-calculated_at').first()

        if not snapshot:
            return Response(
                {'detail': 'No ETA snapshot available yet.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(ETASnapshotSerializer(snapshot).data)

    def post(self, request, booking_id):
        """Only the booking's worker creates a new ETA snapshot."""
        booking = self._get_booking(booking_id)

        if not hasattr(request.user, 'worker_profile'):
            return Response(
                {'error': 'Only workers can post ETA updates.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if booking.worker_profile.user != request.user:
            return Response(
                {'error': 'You are not the worker on this booking.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ETASnapshotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            booking        = booking,
            worker_profile = request.user.worker_profile
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
