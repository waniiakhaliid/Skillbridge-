"""
Bookings Views

FILE LOCATION: skillbridge/bookings/views.py
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import Booking, BookingPhoto, Review, BookingStatus
from .serializers import (
    BookingCreateSerializer,
    BookingListSerializer,
    BookingDetailSerializer,
    BookingStatusUpdateSerializer,
    ReviewSerializer,
)


# -------------------------------------------------------
# CUSTOM PERMISSION CLASSES
# These control who can do what with bookings.
# -------------------------------------------------------

class IsCustomer(permissions.BasePermission):
    """Only customers can use this endpoint."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'customer'


class IsWorker(permissions.BasePermission):
    """Only workers can use this endpoint."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'worker'


class IsBookingParticipant(permissions.BasePermission):
    """
    Only the customer or worker involved in a booking
    can view its full details.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        is_the_customer = obj.customer.user == user
        is_the_worker   = obj.worker_profile.user == user
        return is_the_customer or is_the_worker


# -------------------------------------------------------
# BOOKING VIEWS
# -------------------------------------------------------

class BookingCreateView(generics.CreateAPIView):
    """
    POST /api/bookings/
    Customer submits a new booking request.

    Body: {
        id:id
        worker_profile: uuid,
        service_category: "plumber",
        scheduled_at: "2026-03-25T14:00:00Z",
        service_address: "House 12, Street 4, F-7/2, Islamabad",
        description: "Kitchen pipe is leaking badly",
        payment_method: "cash",
        estimated_duration_hrs: 2
    }
    """
    serializer_class   = BookingCreateSerializer
    permission_classes = [IsCustomer]

    def perform_create(self, serializer):
        # serializer.save() triggers BookingCreateSerializer.create()
        # We pass request via context so the serializer can access the logged-in user
        serializer.save()


class CustomerBookingListView(generics.ListAPIView):
    """
    GET /api/bookings/my/
    Returns all bookings for the logged-in customer.
    Optionally filter by status: /api/bookings/my/?status=pending
    """
    serializer_class   = BookingListSerializer
    permission_classes = [IsCustomer]

    def get_queryset(self):
        customer = self.request.user.customer_profile
        queryset = Booking.objects.filter(customer=customer)\
                          .select_related('worker_profile__user')

        # Optional status filter from URL query param
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset


class WorkerBookingListView(generics.ListAPIView):
    """
    GET /api/bookings/worker/
    Returns all bookings assigned to the logged-in worker.
    GET /api/bookings/worker/?status=pending  → incoming requests
    GET /api/bookings/worker/?status=accepted → accepted jobs
    """
    serializer_class   = BookingListSerializer
    permission_classes = [IsWorker]

    def get_queryset(self):
        worker = self.request.user.worker_profile
        queryset = Booking.objects.filter(worker_profile=worker)\
                          .select_related('customer__user')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset


class BookingDetailView(generics.RetrieveAPIView):
    """
    GET /api/bookings/<uuid:pk>/
    Returns full details of a single booking.
    Only the customer or worker involved can access it.
    """
    serializer_class   = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsBookingParticipant]
    queryset           = Booking.objects.all()\
                                .select_related('customer__user', 'worker_profile__user')\
                                .prefetch_related('photos')\
                                .select_related('review')


class BookingStatusUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/bookings/<uuid:pk>/status/
    Updates the status of a booking.

    Workers use this to:
    - Accept a booking:    { "status": "accepted" }
    - Start a job:         { "status": "in_progress" }
    - Complete a job:      { "status": "completed" }
    - Decline a booking:   { "status": "cancelled_worker" }
    """
    serializer_class   = BookingStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset           = Booking.objects.all()
    http_method_names  = ['patch']  # only allow PATCH, not PUT

    def perform_update(self, serializer):
        booking    = self.get_object()
        new_status = serializer.validated_data['status']
        now        = timezone.now()

        # Record the timestamp for this specific transition
        extra_fields = {}
        if new_status == BookingStatus.ACCEPTED:
            extra_fields['accepted_at'] = now
        elif new_status == BookingStatus.IN_PROGRESS:
            extra_fields['started_at'] = now
        elif new_status == BookingStatus.COMPLETED:
            extra_fields['completed_at'] = now
            # Update customer's total_bookings count
            self._on_booking_completed(booking)
        elif new_status in [BookingStatus.CANCELLED_CUSTOMER, BookingStatus.CANCELLED_WORKER]:
            extra_fields['cancelled_at']     = now
            extra_fields['cancelled_by']     = self.request.user
            # Calculate cancellation fee if applicable (feature #7)
            extra_fields['cancellation_fee'] = self._calculate_cancellation_fee(booking, new_status)

        serializer.save(**extra_fields)

    def _on_booking_completed(self, booking):
        """
        When a booking is completed:
        1. Increment customer's total_bookings count
        2. Increment worker's total_jobs_completed count
        3. Mark customer as repeat if they have > 1 booking
        """
        customer = booking.customer
        customer.total_bookings += 1
        if customer.total_bookings > 1:
            customer.is_repeat_customer = True
        customer.save(update_fields=['total_bookings', 'is_repeat_customer'])

        worker = booking.worker_profile
        worker.total_jobs_completed += 1
        worker.save(update_fields=['total_jobs_completed'])

    def _calculate_cancellation_fee(self, booking, new_status):
        """
        Feature #7: If a customer cancels more than 10 minutes
        after the booking was accepted, charge a cancellation fee.
        Fee = 10% of the booking's base price.
        """
        # Only charge the customer, not the worker
        if new_status != BookingStatus.CANCELLED_CUSTOMER:
            return 0

        # Only charge if booking was already accepted
        if not booking.accepted_at:
            return 0

        minutes_elapsed = (timezone.now() - booking.created_at).total_seconds() / 60
        if minutes_elapsed > 10:
            return round(float(booking.base_price) * 0.10, 2)

        return 0


class BookingCancelView(APIView):
    """
    POST /api/bookings/<uuid:pk>/cancel/
    Customer cancels their own booking.
    Body: { "reason": "Changed my mind" }
    """
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, customer=request.user.customer_profile)

        # Can only cancel pending or accepted bookings
        if booking.status not in [BookingStatus.PENDING, BookingStatus.ACCEPTED]:
            return Response(
                {'error': 'This booking cannot be cancelled at this stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        now            = timezone.now()
        minutes_elapsed = (now - booking.created_at).total_seconds() / 60

        # Calculate cancellation fee if past the 10-minute window
        cancellation_fee = 0
        if minutes_elapsed > 10 and booking.status == BookingStatus.ACCEPTED:
            cancellation_fee = round(float(booking.base_price) * 0.10, 2)

        booking.status             = BookingStatus.CANCELLED_CUSTOMER
        booking.cancelled_at       = now
        booking.cancelled_by       = request.user
        booking.cancellation_reason = request.data.get('reason', '')
        booking.cancellation_fee   = cancellation_fee
        booking.save()

        return Response({
            'message': 'Booking cancelled successfully.',
            'cancellation_fee': cancellation_fee,
            'booking_id': booking.id
        })


# -------------------------------------------------------
# REVIEW VIEWS
# -------------------------------------------------------

class ReviewCreateView(generics.CreateAPIView):
    """
    POST /api/bookings/<uuid:booking_pk>/review/
    Customer leaves a review after a completed booking.
    """
    serializer_class   = ReviewSerializer
    permission_classes = [IsCustomer]

    def perform_create(self, serializer):
        booking_id = self.kwargs['booking_pk']
        booking    = get_object_or_404(
            Booking,
            pk=booking_id,
            customer=self.request.user.customer_profile,
            status=BookingStatus.COMPLETED   # can only review completed bookings
        )

        # Check a review doesn't already exist for this booking
        if hasattr(booking, 'review'):
            from rest_framework.exceptions import ValidationError
            raise ValidationError('You have already reviewed this booking.')

        review = serializer.save(
            booking  = booking,
            reviewer = self.request.user,
            reviewee = booking.worker_profile.user
        )

        # Update the worker's average rating
        self._update_worker_rating(booking.worker_profile)

        return review

    def _update_worker_rating(self, worker_profile):
        """
        Recalculate the worker's average rating after a new review.
        This replaces the PostgreSQL trigger from the schema.
        """
        from django.db.models import Avg, Count
        from .models import Review

        stats = Review.objects.filter(
            reviewee=worker_profile.user,
            is_public=True
        ).aggregate(avg=Avg('rating'), count=Count('id'))

        worker_profile.avg_rating    = stats['avg'] or 0
        worker_profile.total_reviews = stats['count']
        worker_profile.save(update_fields=['avg_rating', 'total_reviews'])


class WorkerReviewListView(generics.ListAPIView):
    """
    GET /api/bookings/workers/<uuid:worker_pk>/reviews/
    Returns all public reviews for a specific worker.
    Used on the worker profile page.
    """
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Review.objects.filter(
            reviewee__worker_profile__id=self.kwargs['worker_pk'],
            is_public=True
        ).select_related('reviewer').order_by('-created_at')