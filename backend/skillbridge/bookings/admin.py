"""
Bookings Admin Configuration

FILE LOCATION: skillbridge/bookings/admin.py
"""

from django.contrib import admin
from .models import Booking, BookingPhoto, Review


class BookingPhotoInline(admin.TabularInline):
    """Shows booking photos inline on the booking detail page."""
    model  = BookingPhoto
    extra  = 0
    fields = ['photo_url', 'uploaded_by', 'uploaded_at']
    readonly_fields = ['uploaded_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = [
        'id', 'customer', 'worker_profile', 'service_category',
        'status', 'scheduled_at', 'total_price', 'payment_status'
    ]
    list_filter   = ['status', 'service_category', 'payment_status', 'payment_method']
    search_fields = [
        'customer__user__email', 'worker_profile__user__email',
        'service_address'
    ]
    ordering      = ['-created_at']
    readonly_fields = [
        'platform_commission_amt', 'created_at', 'updated_at',
        'accepted_at', 'started_at', 'completed_at', 'cancelled_at'
    ]
    inlines       = [BookingPhotoInline]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ['booking', 'reviewer', 'reviewee', 'rating', 'is_public', 'admin_flagged']
    list_filter   = ['rating', 'is_public', 'admin_flagged']
    search_fields = ['reviewer__email', 'reviewee__email', 'comment']
    ordering      = ['-created_at']

    # Admin action to clear the flag on a reported review
    actions = ['clear_flag']

    def clear_flag(self, request, queryset):
        queryset.update(admin_flagged=False)
        self.message_user(request, 'Flags cleared on selected reviews.')
    clear_flag.short_description = 'Clear admin flag on selected reviews'