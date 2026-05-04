"""
FILE: chatbot/migrations/0001_initial.py
PURPOSE: Create chatbot_sessions and chatbot_messages tables

WHAT THIS FILE DOES:
- Creates chatbot_sessions table (FK → User)
- Creates chatbot_messages table (FK → ChatbotSession) with BigAutoField PK

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

        # ── ChatbotSession ────────────────────────────────────────
        migrations.CreateModel(
            name='ChatbotSession',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False,
                    primary_key=True, serialize=False
                )),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                # JSON session context for future LLM multi-turn memory
                ('context', models.JSONField(null=True, blank=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='chatbot_sessions',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'db_table': 'chatbot_sessions',
                'ordering': ['-started_at'],
            },
        ),

        # ── ChatbotMessage ────────────────────────────────────────
        migrations.CreateModel(
            name='ChatbotMessage',
            fields=[
                # BigAutoField not UUID — a session can have hundreds of messages;
                # integer IDs are faster to insert and index at this volume
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('role', models.CharField(
                    choices=[('user', 'User'), ('assistant', 'Assistant')],
                    max_length=10
                )),
                ('content', models.TextField()),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='messages',
                    to='chatbot.chatbotsession'
                )),
            ],
            options={
                'db_table': 'chatbot_messages',
                'ordering': ['sent_at'],
            },
        ),
    ]
