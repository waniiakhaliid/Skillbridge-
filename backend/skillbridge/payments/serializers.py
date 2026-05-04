"""
FILE: payments/serializers.py
PURPOSE: Serializers for all payments app models

WHAT THIS FILE DOES:
- DiscountCodeSerializer: read-only view of a discount code (validate endpoint)
- InstalmentSerializer: read instalment schedule for a booking
- PaymentSerializer: create and read payment records
- WorkerEarningSerializer: read-only earnings for a worker
- CommissionPeriodSerializer: read-only monthly commission summary

CONNECTS TO:
- payments/views.py — imported by all payment views
- payments/models.py — source models
"""

from rest_framework import serializers
from .models import (
    DiscountCode,
    CustomerDiscountUse,
    Instalment,
    Payment,
    WorkerEarning,
    CommissionPeriod,
)


class DiscountCodeSerializer(serializers.ModelSerializer):
    """
    Read-only — used by the discount validation endpoint to return
    code details to the frontend. Never exposes used_count or
    backend-only fields like max_uses to public callers.
    """

    class Meta:
        model  = DiscountCode
        fields = [
            'id', 'code', 'discount_pct', 'discount_flat',
            'valid_until', 'is_active',
        ]
        read_only_fields = fields


class InstalmentSerializer(serializers.ModelSerializer):
    """
    Read-only instalment schedule for a booking.
    transaction_ref is returned so the customer can verify a settled instalment.
    """

    class Meta:
        model  = Instalment
        fields = [
            'id', 'booking', 'instalment_no',
            'amount', 'due_date', 'status', 'transaction_ref',
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    """
    Used for both creating a payment (customer POSTs) and reading
    payment history. gateway_payload and gateway_ref are read-only —
    they are set by process_payment() not by the client.
    """

    class Meta:
        model  = Payment
        fields = [
            'id', 'booking', 'instalment',
            'amount', 'method', 'status',
            'gateway_ref', 'gateway_payload',
            'paid_at',
        ]
        read_only_fields = [
            'id', 'status', 'gateway_ref', 'gateway_payload', 'paid_at',
        ]


class WorkerEarningSerializer(serializers.ModelSerializer):
    """
    Read-only earnings record for a worker.
    Includes all the breakdown fields so workers can see exactly
    what was deducted and why.
    """

    # Denormalise booking ID so the frontend can deep-link to the booking
    booking_id = serializers.UUIDField(source='booking.id', read_only=True)

    class Meta:
        model  = WorkerEarning
        fields = [
            'id', 'booking_id',
            'gross_amount', 'commission_amt', 'travel_fee_earned',
            'net_amount',
            'is_bonus_eligible', 'bonus_amount',
            'commission_period', 'settled_at',
        ]
        read_only_fields = fields


class CommissionPeriodSerializer(serializers.ModelSerializer):
    """
    Read-only monthly commission summary for a worker.
    Admin uses this to determine bonus payouts; worker uses it to
    track their progress toward the bonus threshold.
    """

    class Meta:
        model  = CommissionPeriod
        fields = [
            'id', 'period', 'month',
            'jobs_completed', 'bonus_threshold', 'bonus_pct',
            'bonus_paid',
        ]
        read_only_fields = fields
