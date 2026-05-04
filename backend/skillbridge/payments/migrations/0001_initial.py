"""
FILE: payments/migrations/0001_initial.py
PURPOSE: Create all payments app tables

WHAT THIS FILE DOES:
- Creates discount_codes table
- Creates customer_discount_uses table
- Creates instalments table
- Creates payments table
- Creates worker_earnings table
- Creates commission_periods table

CONNECTS TO:
- depends on accounts/0001_initial (CustomerProfile, WorkerProfile)
- depends on bookings/0001_initial (Booking)
"""

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        # CustomerProfile, WorkerProfile from accounts 0001
        ('accounts', '0001_initial'),
        # Booking from bookings 0001
        ('bookings', '0001_initial'),
    ]

    operations = [

        # ── DiscountCode ──────────────────────────────────────────
        migrations.CreateModel(
            name='DiscountCode',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('code',          models.CharField(max_length=50, unique=True)),
                ('discount_pct',  models.DecimalField(
                    max_digits=5, decimal_places=2, null=True, blank=True
                )),
                ('discount_flat', models.DecimalField(
                    max_digits=8, decimal_places=2, null=True, blank=True
                )),
                ('max_uses',   models.PositiveIntegerField(null=True, blank=True)),
                ('used_count', models.PositiveIntegerField(default=0)),
                ('valid_until', models.DateTimeField(null=True, blank=True)),
                ('is_active',   models.BooleanField(default=True)),
            ],
            options={'db_table': 'discount_codes'},
        ),

        # ── CustomerDiscountUse ───────────────────────────────────
        migrations.CreateModel(
            name='CustomerDiscountUse',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('used_at', models.DateTimeField(auto_now_add=True)),
                # PROTECT — discount use records are financial evidence
                ('customer', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='accounts.customerprofile'
                )),
                ('discount', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='payments.discountcode'
                )),
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='bookings.booking'
                )),
            ],
            options={'db_table': 'customer_discount_uses'},
        ),
        migrations.AlterUniqueTogether(
            name='customerdiscountuse',
            unique_together={('customer', 'discount')},
        ),

        # ── Instalment ────────────────────────────────────────────
        migrations.CreateModel(
            name='Instalment',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('instalment_no', models.PositiveSmallIntegerField()),
                ('amount',   models.DecimalField(max_digits=10, decimal_places=2)),
                ('due_date', models.DateTimeField()),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('paid',    'Paid'),
                        ('overdue', 'Overdue'),
                    ],
                    default='pending',
                    max_length=10
                )),
                ('transaction_ref', models.CharField(
                    max_length=100, null=True, blank=True
                )),
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='instalments',
                    to='bookings.booking'
                )),
            ],
            options={'db_table': 'instalments'},
        ),
        migrations.AlterUniqueTogether(
            name='instalment',
            unique_together={('booking', 'instalment_no')},
        ),

        # ── Payment ───────────────────────────────────────────────
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('amount', models.DecimalField(max_digits=10, decimal_places=2)),
                ('method', models.CharField(
                    choices=[
                        ('cash',      'Cash'),
                        ('jazzcash',  'JazzCash'),
                        ('easypaisa', 'EasyPaisa'),
                        ('card',      'Card'),
                    ],
                    max_length=15
                )),
                ('status', models.CharField(
                    choices=[
                        ('pending',  'Pending'),
                        ('paid',     'Paid'),
                        ('failed',   'Failed'),
                        ('refunded', 'Refunded'),
                    ],
                    default='pending',
                    max_length=10
                )),
                ('gateway_ref',     models.CharField(max_length=100, null=True, blank=True)),
                ('gateway_payload', models.JSONField(null=True, blank=True)),
                ('paid_at',         models.DateTimeField(null=True, blank=True)),
                # PROTECT — never lose payment records
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='payments',
                    to='bookings.booking'
                )),
                # SET_NULL — payment record survives even if instalment is deleted
                ('instalment', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='payments.instalment'
                )),
            ],
            options={'db_table': 'payments'},
        ),

        # ── WorkerEarning ─────────────────────────────────────────
        migrations.CreateModel(
            name='WorkerEarning',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('gross_amount',      models.DecimalField(max_digits=10, decimal_places=2)),
                ('commission_amt',    models.DecimalField(max_digits=10, decimal_places=2)),
                ('travel_fee_earned', models.DecimalField(
                    max_digits=10, decimal_places=2, default=0
                )),
                ('net_amount',        models.DecimalField(max_digits=10, decimal_places=2)),
                ('is_bonus_eligible', models.BooleanField(default=False)),
                ('bonus_amount',      models.DecimalField(
                    max_digits=10, decimal_places=2, default=0
                )),
                ('commission_period', models.CharField(
                    choices=[('standard', 'Standard'), ('elevated', 'Elevated')],
                    default='standard',
                    max_length=10
                )),
                ('settled_at', models.DateTimeField(null=True, blank=True)),
                # PROTECT — earnings are financial records
                ('worker_profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='accounts.workerprofile'
                )),
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='bookings.booking'
                )),
            ],
            options={'db_table': 'worker_earnings'},
        ),

        # ── CommissionPeriod ──────────────────────────────────────
        migrations.CreateModel(
            name='CommissionPeriod',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('period', models.CharField(
                    choices=[('standard', 'Standard'), ('elevated', 'Elevated')],
                    max_length=10
                )),
                ('month',           models.DateField()),
                ('jobs_completed',  models.PositiveIntegerField(default=0)),
                ('bonus_threshold', models.PositiveIntegerField()),
                ('bonus_pct',       models.DecimalField(max_digits=5, decimal_places=2)),
                ('bonus_paid',      models.BooleanField(default=False)),
                ('worker_profile',  models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='accounts.workerprofile'
                )),
            ],
            options={'db_table': 'commission_periods'},
        ),
        migrations.AlterUniqueTogether(
            name='commissionperiod',
            unique_together={('worker_profile', 'month')},
        ),
    ]
