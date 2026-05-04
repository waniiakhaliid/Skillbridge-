"""
FILE: payments/views.py
PURPOSE: API views for discount validation, payments, instalments, and earnings

WHAT THIS FILE DOES:
- DiscountValidateView: validates a code for the current customer
- PaymentCreateView: creates a payment and runs simulated gateway
- InstalmentListView: lists instalment schedule for a booking
- InstalmentPayView: pays a specific instalment
- WorkerEarningsView: lists a worker's own earnings history
- CommissionView: lists a worker's commission period summaries
- AdminEarningsView: admin view of all earnings (filterable)
- AdminCommissionView: admin view of all commission periods

CONNECTS TO:
- payments/urls.py — wired to URL patterns
- payments/services.py — validate_discount_code, process_payment, create_instalments
- payments/serializers.py — all serializers
- accounts/permissions.py — IsWorker, IsCustomer, IsAdminRole
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import DiscountCode, Payment, Instalment, WorkerEarning, CommissionPeriod
from .serializers import (
    DiscountCodeSerializer,
    InstalmentSerializer,
    PaymentSerializer,
    WorkerEarningSerializer,
    CommissionPeriodSerializer,
)
from .services import validate_discount_code, process_payment, create_instalments
from accounts.permissions import IsWorker, IsCustomer, IsAdminRole


class DiscountValidateView(APIView):
    """
    GET /api/payments/discount/<code>/
    Validates a discount code for the authenticated customer.
    Returns the discount details if valid, or an error message if not.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, code):
        # Only customers apply discounts — workers don't book services
        if not hasattr(request.user, 'customer_profile'):
            return Response(
                {'error': 'Only customers can validate discount codes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        discount, error = validate_discount_code(code, request.user.customer_profile)

        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DiscountCodeSerializer(discount).data)


class PaymentCreateView(generics.CreateAPIView):
    """
    POST /api/payments/bookings/<pk>/pay/
    Creates a Payment and runs the simulated gateway via process_payment().
    If booking.is_instalment=True, also creates the 3-instalment schedule.
    """
    serializer_class   = PaymentSerializer
    permission_classes = [IsCustomer]

    def create(self, request, *args, **kwargs):
        from bookings.models import Booking

        booking = get_object_or_404(
            Booking,
            pk=self.kwargs['pk'],
            customer=request.user.customer_profile
        )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create the payment record (starts as 'pending')
        payment = serializer.save(booking=booking)

        # Run simulated gateway — sets status='paid' and saves
        result = process_payment(payment)

        # If this is an instalment booking, create the 3 instalment records
        instalments = []
        if booking.is_instalment:
            instalments = create_instalments(booking)

        return Response(
            {
                'payment':    PaymentSerializer(payment).data,
                'gateway':    result,
                'instalments': InstalmentSerializer(instalments, many=True).data,
            },
            status=status.HTTP_201_CREATED
        )


class InstalmentListView(generics.ListAPIView):
    """
    GET /api/payments/bookings/<pk>/instalments/
    Returns the instalment schedule for a booking.
    Only booking participants can see it.
    """
    serializer_class   = InstalmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from bookings.models import Booking

        booking = get_object_or_404(Booking, pk=self.kwargs['pk'])
        user    = self.request.user

        is_participant = (
            booking.customer.user == user
            or booking.worker_profile.user == user
            or (user.role == 'admin' and user.is_staff)
        )
        if not is_participant:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You are not a participant of this booking.')

        return Instalment.objects.filter(booking=booking).order_by('instalment_no')


class InstalmentPayView(APIView):
    """
    POST /api/payments/instalments/<pk>/pay/
    Pays a specific instalment by creating a Payment linked to it
    and running the simulated gateway.
    """
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        instalment = get_object_or_404(
            Instalment,
            pk=pk,
            booking__customer=request.user.customer_profile
        )

        if instalment.status == 'paid':
            return Response(
                {'error': 'This instalment has already been paid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        method = request.data.get('method', 'cash')

        # Create a payment record tied to this instalment
        payment = Payment.objects.create(
            booking    = instalment.booking,
            instalment = instalment,
            amount     = instalment.amount,
            method     = method,
        )

        # Run simulated gateway — marks payment paid and fires post_save signal
        result = process_payment(payment)

        return Response({
            'payment': PaymentSerializer(payment).data,
            'gateway': result,
        })


class WorkerEarningsView(generics.ListAPIView):
    """
    GET /api/payments/workers/me/earnings/
    A worker's own earnings, newest first.
    """
    serializer_class   = WorkerEarningSerializer
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerEarning.objects.filter(
            worker_profile=self.request.user.worker_profile
        ).order_by('-id')


class CommissionView(generics.ListAPIView):
    """
    GET /api/payments/workers/me/commission/
    A worker's own monthly commission periods.
    """
    serializer_class   = CommissionPeriodSerializer
    permission_classes = [IsWorker]

    def get_queryset(self):
        return CommissionPeriod.objects.filter(
            worker_profile=self.request.user.worker_profile
        ).order_by('-month')


# -------------------------------------------------------
# ADMIN VIEWS
# -------------------------------------------------------

class AdminEarningsView(generics.ListAPIView):
    """
    GET /api/payments/admin/earnings/
    All worker earnings. Filters: ?worker=<uuid> &start=YYYY-MM-DD &end=YYYY-MM-DD
    """
    serializer_class   = WorkerEarningSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = WorkerEarning.objects.all()\
                          .select_related('worker_profile__user', 'booking')\
                          .order_by('-id')

        worker = self.request.query_params.get('worker')
        start  = self.request.query_params.get('start')
        end    = self.request.query_params.get('end')

        if worker:
            qs = qs.filter(worker_profile__id=worker)
        if start:
            qs = qs.filter(booking__completed_at__date__gte=start)
        if end:
            qs = qs.filter(booking__completed_at__date__lte=end)

        return qs


class AdminCommissionView(generics.ListAPIView):
    """
    GET /api/payments/admin/commission/
    All commission periods across all workers.
    """
    serializer_class   = CommissionPeriodSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return CommissionPeriod.objects.all()\
                               .select_related('worker_profile__user')\
                               .order_by('-month')
