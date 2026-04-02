"""
Accounts Admin Configuration

FILE LOCATION: skillbridge/accounts/admin.py

Registers our models with Django's built-in admin panel at /admin/
This is where admins approve workers, manage users etc.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, WorkerProfile, WorkerService, CustomerProfile


# -------------------------------------------------------
# USER ADMIN
# We extend Django's built-in UserAdmin to accommodate
# our custom fields (role, phone, account_status etc.)
# -------------------------------------------------------

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Columns shown in the user list table
    list_display  = ['email', 'first_name', 'last_name', 'role', 'account_status', 'created_at']
    list_filter   = ['role', 'account_status', 'email_verified']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering      = ['-created_at']

    # Fields shown on the user detail/edit page
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone', 'profile_photo_url')}),
        ('Role & Status', {'fields': ('role', 'account_status', 'email_verified', 'phone_verified')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'is_active')}),
        ('Timestamps', {'fields': ('last_login_at', 'created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at', 'last_login_at']

    # Fields shown when creating a new user via admin
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'phone', 'role', 'password1', 'password2'),
        }),
    )


# -------------------------------------------------------
# WORKER PROFILE ADMIN
# This is where admins approve or reject worker applications
# -------------------------------------------------------

class WorkerServiceInline(admin.TabularInline):
    """
    Shows worker services inline on the WorkerProfile page.
    Admin can see and edit all services a worker offers
    without navigating away.
    """
    model  = WorkerService
    extra  = 0  # don't show blank extra rows by default


@admin.register(WorkerProfile)
class WorkerProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'city', 'verification_status', 'base_hourly_rate', 'avg_rating', 'is_available']
    list_filter   = ['verification_status', 'is_available']
    search_fields = ['user__email', 'user__first_name', 'city']
    ordering      = ['-created_at']
    readonly_fields = ['avg_rating', 'total_reviews', 'total_jobs_completed', 'created_at', 'updated_at']

    # Show services inline on the profile edit page
    inlines = [WorkerServiceInline]

    # Admin actions — select workers and bulk approve them
    actions = ['approve_workers', 'reject_workers']

    def approve_workers(self, request, queryset):
        """Bulk approve selected worker applications."""
        updated = queryset.update(verification_status='approved')
        self.message_user(request, f'{updated} worker(s) approved.')
    approve_workers.short_description = 'Approve selected workers'

    def reject_workers(self, request, queryset):
        """Bulk reject selected worker applications."""
        updated = queryset.update(verification_status='rejected')
        self.message_user(request, f'{updated} worker(s) rejected.')
    reject_workers.short_description = 'Reject selected workers'


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'total_bookings', 'is_repeat_customer', 'created_at']
    search_fields = ['user__email', 'user__first_name']
    readonly_fields = ['total_bookings', 'is_repeat_customer']