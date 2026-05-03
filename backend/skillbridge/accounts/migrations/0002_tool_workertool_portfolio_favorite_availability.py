"""
FILE: accounts/migrations/0002_tool_workertool_portfolio_favorite_availability.py
PURPOSE: Create the five new Phase-2 tables for accounts app

WHAT THIS FILE DOES:
- Creates audit_logs table
- Creates tools table
- Creates worker_tools junction table
- Creates worker_portfolio_photos table
- Creates favorites table
- Creates worker_availability table
- Does NOT touch any existing table from 0001_initial

CONNECTS TO:
- depends on accounts/0001_initial (WorkerProfile, CustomerProfile, User already exist)
"""

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # All six new tables FK into models created in 0001
        ('accounts', '0001_initial'),
    ]

    operations = [

        # ── AuditLog ──────────────────────────────────────────────
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('action_type', models.CharField(max_length=50)),
                ('details', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                # SET_NULL so log rows survive admin account deactivation
                ('admin', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='audit_actions',
                    to=settings.AUTH_USER_MODEL
                )),
                ('target_user', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='audit_targets',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={'db_table': 'audit_logs'},
        ),

        # ── Tool ──────────────────────────────────────────────────
        migrations.CreateModel(
            name='Tool',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('name', models.CharField(max_length=100)),
                ('category', models.CharField(
                    choices=[
                        ('plumber',     'Plumber'),
                        ('electrician', 'Electrician'),
                        ('carpenter',   'Carpenter'),
                        ('mechanic',    'Mechanic'),
                    ],
                    max_length=20
                )),
            ],
            options={'db_table': 'tools'},
        ),

        # ── WorkerTool ────────────────────────────────────────────
        migrations.CreateModel(
            name='WorkerTool',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('price_adjustment_pct', models.DecimalField(
                    decimal_places=2, default=0, max_digits=5
                )),
                ('tool', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='accounts.tool'
                )),
                ('worker_profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tools',
                    to='accounts.workerprofile'
                )),
            ],
            options={'db_table': 'worker_tools'},
        ),

        # ── WorkerPortfolioPhoto ──────────────────────────────────
        migrations.CreateModel(
            name='WorkerPortfolioPhoto',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('photo_url', models.TextField()),
                ('caption', models.TextField(blank=True, null=True)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('worker_profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='portfolio_photos',
                    to='accounts.workerprofile'
                )),
            ],
            options={'db_table': 'worker_portfolio_photos'},
        ),

        # ── Favorite ──────────────────────────────────────────────
        migrations.CreateModel(
            name='Favorite',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='favorites',
                    to='accounts.customerprofile'
                )),
                ('worker_profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='favorited_by',
                    to='accounts.workerprofile'
                )),
            ],
            options={'db_table': 'favorites'},
        ),

        # ── WorkerAvailability ────────────────────────────────────
        migrations.CreateModel(
            name='WorkerAvailability',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                # 0=Monday … 6=Sunday — matches Python weekday()
                ('day_of_week', models.IntegerField()),
                ('start_time', models.TimeField()),
                ('end_time',   models.TimeField()),
                ('worker_profile', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='availability',
                    to='accounts.workerprofile'
                )),
            ],
            options={'db_table': 'worker_availability'},
        ),

        # ── Unique-together constraints ───────────────────────────
        migrations.AlterUniqueTogether(
            name='workertool',
            unique_together={('worker_profile', 'tool')},
        ),
        migrations.AlterUniqueTogether(
            name='favorite',
            unique_together={('customer', 'worker_profile')},
        ),
        migrations.AlterUniqueTogether(
            name='workeravailability',
            unique_together={('worker_profile', 'day_of_week')},
        ),
    ]
