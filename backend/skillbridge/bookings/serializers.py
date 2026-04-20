"""
Bookings Serializers

FILE LOCATION: skillbridge/bookings/serializers.py
"""

from rest_framework import serializers
from django.utils import timezone
from .models import Booking, BookingPhoto, Review, BookingStatus


class BookingPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BookingPhoto
        fields = ['id', 'photo_url', 'uploaded_at']


class ReviewSerializer(serializers.ModelSerializer):
    """Used for both creating and reading reviews."""

    # Show reviewer's name in the response (read-only)
    reviewer_name = serializers.CharField(
        source='reviewer.full_name',
        read_only=True
    )

    class Meta:
        model  = Review
        fields = [
            'id', 'booking', 'reviewer_name',
            'rating', 'comment', 'is_public', 'created_at'
        ]
        read_only_fields = ['id', 'booking', 'reviewer_name', 'created_at']

    def validate_rating(self, value):
        """Ensure rating is between 1 and 5."""
        if not (1 <= value <= 5):
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Used when a customer submits a new booking request.
    Calculates the total price automatically.
    """

    class Meta:
        model  = Booking
        fields = [
            'id',
            'worker_profile', 'service_category',
            'scheduled_at', 'service_address',
            'description', 'payment_method',
            'is_advance_booking', 'estimated_duration_hrs',
        ]

    def validate_scheduled_at(self, value):
        """Booking must be in the future."""
        if value <= timezone.now():
            raise serializers.ValidationError('Scheduled time must be in the future.')
        return value

    def validate(self, data):
        """
        Cross-field validation.
        Check that the worker actually offers the requested service category.
        """
        worker  = data.get('worker_profile')
        category = data.get('service_category')

        if worker and category:
            offers_service = worker.services.filter(category=category).exists()
            if not offers_service:
                raise serializers.ValidationError(
                    f'This worker does not offer {category} services.'
                )

        return data

    def create(self, validated_data):
        """
        Calculate pricing and create the booking.
        The customer is automatically set from the logged-in user.
        """
        request        = self.context['request']
        customer       = request.user.customer_profile
        worker         = validated_data['worker_profile']
        category       = validated_data['service_category']
        duration       = validated_data.get('estimated_duration_hrs', 1)

        # -------------------------------------------------------
        # PRICE CALCULATION
        # base_price = worker's effective rate for this category
        #              multiplied by estimated hours
        # -------------------------------------------------------
        try:
            service = worker.services.get(category=category)
            hourly_rate = service.effective_rate
        except Exception:
            hourly_rate = worker.base_hourly_rate

        base_price = round(float(hourly_rate) * float(duration), 2)

        # total_price for Phase 1 = just base_price
        # travel_fee, discounts, tool_adjustment added in later phases
        total_price = base_price

        # Mark as advance booking if scheduled more than 24 hours out
        from datetime import timedelta
        scheduled_at = validated_data['scheduled_at']
        is_advance   = (scheduled_at - timezone.now()) > timedelta(hours=24)

        booking = Booking.objects.create(
            customer=customer,
            base_price=base_price,
            total_price=total_price,
            is_advance_booking=is_advance,
            **validated_data
        )

        return booking


class BookingListSerializer(serializers.ModelSerializer):
    """
    Compact booking info for list views (dashboard, history).
    We don't need every field in a list — keep it lightweight.
    """

    worker_name       = serializers.CharField(source='worker_profile.user.full_name', read_only=True)
    worker_photo      = serializers.CharField(source='worker_profile.user.profile_photo_url', read_only=True)
    customer_name     = serializers.CharField(source='customer.user.full_name', read_only=True)

    class Meta:
        model  = Booking
        fields = [
            'id', 'worker_name', 'worker_photo', 'customer_name',
            'service_category', 'scheduled_at', 'status',
            'total_price', 'payment_method', 'payment_status',
            'created_at'
        ]


class BookingDetailSerializer(serializers.ModelSerializer):
    """
    Full booking info for the booking detail page.
    Includes pricing breakdown, photos, and review if available.
    """

    worker_name       = serializers.CharField(source='worker_profile.user.full_name', read_only=True)
    worker_photo      = serializers.CharField(source='worker_profile.user.profile_photo_url', read_only=True)
    customer_name     = serializers.CharField(source='customer.user.full_name', read_only=True)
    photos            = BookingPhotoSerializer(many=True, read_only=True)
    review            = ReviewSerializer(read_only=True)
    worker_net_earnings     = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_cancellable_by_customer = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Booking
        fields = [
            'id', 'worker_name', 'worker_photo', 'customer_name',
            'service_category', 'scheduled_at', 'is_advance_booking',
            'estimated_duration_hrs', 'service_address',
            'description', 'status',
            'accepted_at', 'started_at', 'completed_at', 'cancelled_at',
            'cancellation_reason',
            # Pricing breakdown
            'base_price', 'tool_adjustment', 'travel_fee',
            'discount_amount', 'tax_amount', 'total_price',
            'cancellation_fee',
            # Commission
            'platform_commission_pct', 'platform_commission_amt',
            'worker_net_earnings',
            # Payment
            'payment_method', 'payment_status', 'is_instalment',
            # Related
            'photos', 'review',
            'is_cancellable_by_customer',
            'created_at', 'updated_at',
        ]


class BookingStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Used when updating only the status of a booking.
    e.g. Worker accepts a booking, marks it started, or completed.
    """

    class Meta:
        model  = Booking
        fields = ['status']

    def validate_status(self, new_status):
        """
        Enforce valid status transitions.
        e.g. you can't go from 'pending' directly to 'completed'.
        """
        current_status = self.instance.status

        # Define which transitions are allowed
        valid_transitions = {
            BookingStatus.PENDING:    [BookingStatus.ACCEPTED, BookingStatus.CANCELLED_WORKER],
            BookingStatus.ACCEPTED:   [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED_WORKER, BookingStatus.CANCELLED_CUSTOMER],
            BookingStatus.IN_PROGRESS:[BookingStatus.COMPLETED, BookingStatus.DISPUTED],
        }

        allowed = valid_transitions.get(current_status, [])

        if new_status not in allowed:
            raise serializers.ValidationError(
                f'Cannot transition from {current_status} to {new_status}.'
            )

        return new_status