"""
Bookings Views

FILE LOCATION: skillbridge/bookings/views.py
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated

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


# =======================================================================
# PHASE-2 VIEWS — appended below, existing views above are untouched
# =======================================================================

from .models import Dispute, DisputeStatus
from .serializers import DisputeSerializer
from accounts.permissions import IsAdminRole
from rest_framework.decorators import action
from rest_framework import viewsets


# -------------------------------------------------------
# BOOKING VIEWSET
# Provides accept / reject / start / complete / cancel
# and photo management actions.
# list/create/retrieve are already handled by the existing
# class-based views above — the router for those paths is
# NOT registered so the existing routes take precedence.
# -------------------------------------------------------

class BookingViewSet(viewsets.GenericViewSet):
    """
    Mixin-only ViewSet — provides custom actions only.
    We do NOT inherit ModelViewSet because list/create/retrieve
    are already handled by the existing Phase-1 views and we
    cannot remove those without breaking existing URLs.
    """
    queryset = Booking.objects.all()

    def get_permissions(self):
        # Default: authenticated users only; actions refine further
        return [permissions.IsAuthenticated()]

    # ── accept ──────────────────────────────────────────────────────
    @action(detail=True, methods=['patch'], permission_classes=[IsWorker])
    def accept(self, request, pk=None):
        """PATCH /api/bookings/<pk>/accept/ — worker accepts a pending booking."""
        booking = get_object_or_404(
            Booking, pk=pk, worker_profile=request.user.worker_profile
        )
        if booking.status != BookingStatus.PENDING:
            return Response(
                {'error': 'Only pending bookings can be accepted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.status      = BookingStatus.ACCEPTED
        booking.accepted_at = timezone.now()
        booking.save()
        return Response({'status': booking.status, 'accepted_at': booking.accepted_at})

    # ── reject ──────────────────────────────────────────────────────
    @action(detail=True, methods=['patch'], permission_classes=[IsWorker])
    def reject(self, request, pk=None):
        """PATCH /api/bookings/<pk>/reject/ — worker rejects a pending booking."""
        booking = get_object_or_404(
            Booking, pk=pk, worker_profile=request.user.worker_profile
        )
        if booking.status != BookingStatus.PENDING:
            return Response(
                {'error': 'Only pending bookings can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        reason = request.data.get('cancellation_reason', '')
        if not reason:
            return Response(
                {'error': 'cancellation_reason is required when rejecting.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.status              = BookingStatus.CANCELLED_WORKER
        booking.cancelled_at        = timezone.now()
        booking.cancelled_by        = request.user
        booking.cancellation_reason = reason
        booking.save()
        return Response({'status': booking.status})

    # ── start ───────────────────────────────────────────────────────
    @action(detail=True, methods=['patch'], permission_classes=[IsWorker])
    def start(self, request, pk=None):
        """PATCH /api/bookings/<pk>/start/ — worker marks a job as in progress."""
        booking = get_object_or_404(
            Booking, pk=pk, worker_profile=request.user.worker_profile
        )
        if booking.status != BookingStatus.ACCEPTED:
            return Response(
                {'error': 'Only accepted bookings can be started.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.status     = BookingStatus.IN_PROGRESS
        booking.started_at = timezone.now()
        booking.save()
        return Response({'status': booking.status, 'started_at': booking.started_at})

    # ── complete ────────────────────────────────────────────────────
    @action(detail=True, methods=['patch'], permission_classes=[IsWorker])
    def complete(self, request, pk=None):
        """PATCH /api/bookings/<pk>/complete/ — worker marks a job as completed."""
        booking = get_object_or_404(
            Booking, pk=pk, worker_profile=request.user.worker_profile
        )
        if booking.status != BookingStatus.IN_PROGRESS:
            return Response(
                {'error': 'Only in-progress bookings can be completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.status       = BookingStatus.COMPLETED
        booking.completed_at = timezone.now()
        booking.save()
        return Response({'status': booking.status, 'completed_at': booking.completed_at})

    # ── cancel ──────────────────────────────────────────────────────
    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """
        PATCH /api/bookings/<pk>/cancel/
        Customer or worker can cancel.
        If the customer cancels more than 10 minutes after booking creation,
        a flat 200 PKR cancellation fee is applied.
        """
        booking = get_object_or_404(Booking, pk=pk)
        user    = request.user

        # Only the booking's customer or worker can cancel
        is_customer = (
            user.role == 'customer'
            and hasattr(user, 'customer_profile')
            and booking.customer.user == user
        )
        is_worker = (
            user.role == 'worker'
            and hasattr(user, 'worker_profile')
            and booking.worker_profile.user == user
        )
        if not (is_customer or is_worker):
            return Response(
                {'error': 'You are not a participant of this booking.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if booking.status not in [BookingStatus.PENDING, BookingStatus.ACCEPTED]:
            return Response(
                {'error': 'This booking cannot be cancelled at this stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        now              = timezone.now()
        minutes_elapsed  = (now - booking.created_at).total_seconds() / 60
        cancellation_fee = 0

        if is_customer and minutes_elapsed > 10:
            # 200 PKR flat fee if customer cancels after the 10-minute grace window
            cancellation_fee = 200

        booking.status              = (
            BookingStatus.CANCELLED_CUSTOMER if is_customer
            else BookingStatus.CANCELLED_WORKER
        )
        booking.cancelled_at        = now
        booking.cancelled_by        = user
        booking.cancellation_reason = request.data.get('cancellation_reason', '')
        booking.cancellation_fee    = cancellation_fee
        booking.save()

        return Response({
            'status':            booking.status,
            'cancellation_fee':  cancellation_fee,
        })

    # ── upload_photo ────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='photos')
    def upload_photo(self, request, pk=None):
        """
        POST /api/bookings/<pk>/photos/
        Customer or worker attached to this booking can upload a photo.
        """
        booking = get_object_or_404(Booking, pk=pk)
        user    = request.user

        if booking.customer.user != user and booking.worker_profile.user != user:
            return Response(
                {'error': 'You are not a participant of this booking.'},
                status=status.HTTP_403_FORBIDDEN
            )

        photo_url = request.data.get('photo_url')
        if not photo_url:
            return Response(
                {'error': 'photo_url is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        photo = BookingPhoto.objects.create(
            booking     = booking,
            photo_url   = photo_url,
            uploaded_by = user
        )
        from .serializers import BookingPhotoSerializer
        return Response(
            BookingPhotoSerializer(photo).data,
            status=status.HTTP_201_CREATED
        )

    # ── delete_photo ────────────────────────────────────────────────
    @action(
        detail=True, methods=['delete'],
        url_path=r'photos/(?P<photo_id>[0-9a-f-]+)'
    )
    def delete_photo(self, request, pk=None, photo_id=None):
        """
        DELETE /api/bookings/<pk>/photos/<photo_id>/
        Only the original uploader can delete their photo.
        """
        photo = get_object_or_404(
            BookingPhoto, pk=photo_id, booking__pk=pk
        )
        if photo.uploaded_by != request.user:
            return Response(
                {'error': 'You can only delete your own photos.'},
                status=status.HTTP_403_FORBIDDEN
            )
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -------------------------------------------------------
# REVIEW VIEWSET
# -------------------------------------------------------

class ReviewViewSet(viewsets.GenericViewSet):
    """
    Custom actions for reviews.
    ReviewCreateView in Phase 1 handles creation at
    /api/bookings/<booking_pk>/review/ — this ViewSet adds
    retrieve for admins and booking participants.
    """
    queryset           = Review.objects.all()
    serializer_class   = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, pk=None):
        """GET /api/bookings/reviews/<pk>/ — booking participant or admin."""
        review = get_object_or_404(Review, pk=pk)
        user   = request.user
        booking = review.booking

        is_participant = (
            booking.customer.user == user
            or booking.worker_profile.user == user
        )
        is_admin = (user.role == 'admin' and user.is_staff)

        if not (is_participant or is_admin):
            return Response(
                {'error': 'Access denied.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return Response(ReviewSerializer(review).data)

class CustomerReviewListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(reviewer=self.request.user)
# -------------------------------------------------------
# Reviews : This returns all reviews submitted by the logged-in customer
# -------------------------------------------------------
  

class CustomerReviewListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(reviewer=self.request.user)

# -------------------------------------------------------
# ADMIN BOOKING / DISPUTE VIEWS
# -------------------------------------------------------

class AdminBookingListView(generics.ListAPIView):
    """
    GET /api/bookings/admin/
    All bookings — admin sees everything.
    Filters: ?status=completed &start=2026-01-01 &end=2026-12-31
    """
    serializer_class   = BookingListSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = Booking.objects.all()\
                    .select_related('customer__user', 'worker_profile__user')\
                    .order_by('-created_at')

        status_filter = self.request.query_params.get('status')
        start         = self.request.query_params.get('start')
        end           = self.request.query_params.get('end')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if start:
            qs = qs.filter(created_at__date__gte=start)
        if end:
            qs = qs.filter(created_at__date__lte=end)

        return qs


class AdminDisputeListView(generics.ListAPIView):
    """
    GET /api/bookings/admin/disputes/
    All disputes ordered by oldest-open first so urgent ones surface.
    """
    serializer_class   = DisputeSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return Dispute.objects.all()\
                      .select_related('booking', 'raised_by', 'resolved_by')\
                      .order_by('created_at')


class AdminDisputeUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/bookings/admin/disputes/<uuid:pk>/
    Body: { "status": "resolved", "resolution": "Refund issued." }
    Sets resolved_by and resolved_at automatically.
    Notifies both booking parties of the outcome.
    """
    serializer_class   = DisputeSerializer
    permission_classes = [IsAdminRole]
    queryset           = Dispute.objects.all()
    http_method_names  = ['patch']

    def update(self, request, *args, **kwargs):
        dispute     = self.get_object()
        new_status  = request.data.get('status')
        resolution  = request.data.get('resolution', '')

        if new_status not in [
            DisputeStatus.RESOLVED, DisputeStatus.DISMISSED, DisputeStatus.UNDER_REVIEW
        ]:
            return Response(
                {'error': 'status must be under_review, resolved, or dismissed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dispute.status     = new_status
        dispute.resolution = resolution

        if new_status in [DisputeStatus.RESOLVED, DisputeStatus.DISMISSED]:
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()

        dispute.save()

        # Notify both parties — lazy import avoids circular dependency
        try:
            from notifications.services import send_notification
            outcome_msg = (
                f'Your dispute has been {new_status}. {resolution}'
            )
            send_notification(
                dispute.booking.customer.user,
                'booking_update', 'Dispute Update', outcome_msg,
                data={'booking_id': str(dispute.booking.id)}
            )
            send_notification(
                dispute.booking.worker_profile.user,
                'booking_update', 'Dispute Update', outcome_msg,
                data={'booking_id': str(dispute.booking.id)}
            )
        except Exception:
            pass

        return Response(DisputeSerializer(dispute).data)