"""
FILE: notifications/migrations/0001_initial.py
PURPOSE: Create notifications and push_tokens tables

WHAT THIS FILE DOES:
- Creates notifications table (FK → User)
- Creates push_tokens table (FK → User)

CONNECTS TO:
- depends on accounts/0001_initial (User AUTH_USER_MODEL)
"""

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        # User (AUTH_USER_MODEL) from accounts 0001
        ('accounts', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [

        # ── Notification ──────────────────────────────────────────
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('type', models.CharField(
                    choices=[
                        ('booking_update', 'Booking Update'),
                        ('payment',        'Payment'),
                        ('review',         'Review'),
                        ('system',         'System'),
                        ('promo',          'Promo'),
                    ],
                    max_length=20
                )),
                ('title', models.CharField(max_length=200)),
                ('body',  models.TextField()),
                # JSON payload for frontend deep-linking — null when no link needed
                ('data',       models.JSONField(null=True, blank=True)),
                ('is_read',    models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'db_table': 'notifications',
                # Unread first, then newest — standard notification centre order
                'ordering': ['is_read', '-created_at'],
            },
        ),

        # ── PushToken ─────────────────────────────────────────────
        migrations.CreateModel(
            name='PushToken',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                # unique=True — one token string maps to exactly one device globally
                ('token',      models.TextField(unique=True)),
                ('platform', models.CharField(
                    choices=[
                        ('android', 'Android'),
                        ('ios',     'iOS'),
                        ('web',     'Web'),
                    ],
                    max_length=10
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='push_tokens',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={'db_table': 'push_tokens'},
        ),
    ]
