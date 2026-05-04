"""
FILE: bookings/migrations/0002_dispute.py
PURPOSE: Create the disputes table only

WHAT THIS FILE DOES:
- Creates disputes table with status lifecycle choices
- Does NOT touch any existing table from 0001_initial

CONNECTS TO:
- depends on bookings/0001_initial (Booking already exists)
- depends on accounts/0001_initial (User AUTH_USER_MODEL already exists)
"""

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # Booking already exists in bookings 0001
        ('bookings', '0001_initial'),
        # User (AUTH_USER_MODEL) already exists in accounts 0001
        ('accounts', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Dispute',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('reason', models.TextField()),
                ('status', models.CharField(
                    choices=[
                        ('open',         'Open'),
                        ('under_review', 'Under Review'),
                        ('resolved',     'Resolved'),
                        ('dismissed',    'Dismissed'),
                    ],
                    default='open',
                    max_length=20
                )),
                # Admin writes this when closing the dispute
                ('resolution', models.TextField(blank=True, null=True)),
                ('created_at',  models.DateTimeField(auto_now_add=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                # PROTECT — never lose the link to the booking that caused this dispute
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='disputes',
                    to='bookings.booking'
                )),
                # PROTECT — must know who raised it, even if their account is suspended
                ('raised_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='disputes_raised',
                    to=settings.AUTH_USER_MODEL
                )),
                # SET_NULL — dispute record survives if admin account is deactivated
                ('resolved_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='disputes_resolved',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={'db_table': 'disputes'},
        ),
    ]
