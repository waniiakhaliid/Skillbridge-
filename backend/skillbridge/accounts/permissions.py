"""
FILE: accounts/permissions.py
PURPOSE: Custom DRF permission classes used across accounts and other apps

WHAT THIS FILE DOES:
- IsWorker — authenticated + role == 'worker'
- IsCustomer — authenticated + role == 'customer'
- IsAdminRole — authenticated + role == 'admin' + is_staff
- IsOwnerOrAdmin — object owner OR any admin
- IsBookingParticipant — booking customer or worker (object-level)

CONNECTS TO:
- imported by accounts/views.py, bookings/views.py, locations/views.py,
  payments/views.py, notifications/views.py
"""

from rest_framework import permissions


class IsWorker(permissions.BasePermission):
    """
    Grants access only to authenticated users whose role is 'worker'.
    Used on endpoints that are exclusively for workers (manage services,
    accept bookings, post GPS pings, etc.).
    """

    def has_permission(self, request, view):
        # Must be logged in AND carry the worker role
        return (
            request.user.is_authenticated
            and request.user.role == 'worker'
        )


class IsCustomer(permissions.BasePermission):
    """
    Grants access only to authenticated users whose role is 'customer'.
    Used on endpoints that are exclusively for customers (create bookings,
    manage favourites, pay invoices, etc.).
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'customer'
        )


class IsAdminRole(permissions.BasePermission):
    """
    Grants access only to admin users.
    Requires both role == 'admin' AND is_staff=True so that
    someone who sets their own role to 'admin' via the API
    cannot bypass Django's staff gate.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'admin'
            and request.user.is_staff
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission: the object's owning user OR any admin.
    The object is expected to have a .user attribute pointing to User.
    Used on profile update endpoints and similar.
    """

    def has_object_permission(self, request, view, obj):
        # Admin can always access any object
        if request.user.role == 'admin' and request.user.is_staff:
            return True
        # Otherwise must be the object's owner
        return obj.user == request.user


class IsBookingParticipant(permissions.BasePermission):
    """
    Object-level permission: only the customer or worker tied to a booking.
    Prevents a third party from reading or mutating someone else's booking.
    Admins bypass this check — they can see all bookings.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admins can see everything
        if user.role == 'admin' and user.is_staff:
            return True

        # Check if user is the customer on this booking
        is_the_customer = (obj.customer.user == user)

        # Check if user is the worker on this booking
        is_the_worker = (obj.worker_profile.user == user)

        return is_the_customer or is_the_worker
