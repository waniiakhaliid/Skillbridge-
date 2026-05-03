"""
FILE: locations/migrations/0001_initial.py
PURPOSE: Create customer_addresses, gps_tracking, eta_snapshots tables

WHAT THIS FILE DOES:
- Creates CustomerAddress table (FK → CustomerProfile)
- Creates GPSTracking table (FK → WorkerProfile, Booking)  [BigAutoField PK]
- Creates ETASnapshot table (FK → Booking, WorkerProfile)

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
        # CustomerProfile, WorkerProfile already exist in accounts 0001
        ('accounts', '0001_initial'),
        # Booking already exists in bookings 0001
        ('bookings', '0001_initial'),
    ]

    operations = [

        # ── CustomerAddress ───────────────────────────────────────
        migrations.CreateModel(
            name='CustomerAddress',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('label',        models.CharField(max_length=50)),
                ('address_line', models.TextField()),
                # Plain DecimalField — no PostGIS required
                ('latitude',  models.DecimalField(
                    max_digits=9, decimal_places=6, null=True, blank=True
                )),
                ('longitude', models.DecimalField(
                    max_digits=9, decimal_places=6, null=True, blank=True
                )),
                ('is_default', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='addresses',
                    to='accounts.customerprofile'
                )),
            ],
            options={'db_table': 'customer_addresses'},
        ),

        # ── GPSTracking ───────────────────────────────────────────
        migrations.CreateModel(
            name='GPSTracking',
            fields=[
                # BigAutoField not UUID — high-frequency inserts (every few seconds
                # per active booking); integer PK avoids UUID generation overhead
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('latitude',  models.DecimalField(max_digits=9, decimal_places=6)),
                ('longitude', models.DecimalField(max_digits=9, decimal_places=6)),
                ('speed_kmh',   models.DecimalField(
                    max_digits=5, decimal_places=2, null=True, blank=True
                )),
                ('heading_deg', models.DecimalField(
                    max_digits=5, decimal_places=2, null=True, blank=True
                )),
                ('recorded_at', models.DateTimeField(auto_now_add=True)),
                ('worker_profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='gps_pings',
                    to='accounts.workerprofile'
                )),
                # SET_NULL — pings survive even if the booking is modified
                ('booking', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='gps_pings',
                    to='bookings.booking'
                )),
            ],
            options={'db_table': 'gps_tracking'},
        ),

        # ── ETASnapshot ───────────────────────────────────────────
        migrations.CreateModel(
            name='ETASnapshot',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('eta_minutes', models.PositiveIntegerField()),
                ('distance_km', models.DecimalField(max_digits=6, decimal_places=2)),
                ('calculated_at', models.DateTimeField(auto_now_add=True)),
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='eta_snapshots',
                    to='bookings.booking'
                )),
                ('worker_profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='accounts.workerprofile'
                )),
            ],
            options={'db_table': 'eta_snapshots'},
        ),
    ]
