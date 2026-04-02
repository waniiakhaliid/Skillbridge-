"""
Django settings for SkillBridge project.

FILE LOCATION: skillbridge/skillbridge/settings.py
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-change-this-in-production'

DEBUG = True

ALLOWED_HOSTS = ['*']  # Restrict this in production


# -------------------------------------------------------
# INSTALLED APPS
# We list Django built-ins first, then third-party packages,
# then our own SkillBridge apps.
# -------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',            # Django REST Framework for building APIs
    'rest_framework_simplejwt',  # JWT authentication (token-based login)
    'corsheaders',               # Allow frontend JS to call our API
    'rest_framework_simplejwt.token_blacklist',
    # SkillBridge apps (Phase 1)
    'accounts',
    'bookings',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be at the top
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'skillbridge.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'skillbridge.wsgi.application'


# -------------------------------------------------------
# DATABASE
# Using PostgreSQL. Make sure you have created a database
# named 'skillbridge_db' in your local PostgreSQL.
# -------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'skillbridge_db',
        'USER': 'postgres',       # your PostgreSQL username
        'PASSWORD': '1234',   # your PostgreSQL password
        'HOST': 'localhost',
        'PORT': '5432',
    }
}


# -------------------------------------------------------
# CUSTOM USER MODEL
# This is the most important setting in the entire project.
# It tells Django to use OUR User model (in the accounts app)
# instead of Django's default one.
# YOU MUST SET THIS BEFORE RUNNING ANY MIGRATIONS.
# Changing this later breaks everything.
# -------------------------------------------------------
AUTH_USER_MODEL = 'accounts.User'


# -------------------------------------------------------
# DJANGO REST FRAMEWORK SETTINGS
# -------------------------------------------------------
REST_FRAMEWORK = {
    # All API endpoints require login by default
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
   
}


# -------------------------------------------------------
# JWT SETTINGS (Simple JWT)
# -------------------------------------------------------
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),    # access token valid for 1 day
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),  # refresh token valid for 30 days
    'AUTH_HEADER_TYPES': ('Bearer',),              # Authorization: Bearer <token>
}


# -------------------------------------------------------
# CORS SETTINGS
# Allows the SkillBridge frontend (HTML files) to call
# our Django API without being blocked by the browser.
# -------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = True  # Lock this down in production


# -------------------------------------------------------
# PASSWORD VALIDATION
# -------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# -------------------------------------------------------
# INTERNATIONALISATION
# -------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Karachi'   # Pakistan Standard Time
USE_I18N = True
USE_TZ = True                # Store all datetimes as UTC in the DB


# -------------------------------------------------------
# STATIC FILES
# -------------------------------------------------------
STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# BASE_DIR already exists in your settings.py — it points to the backend/skillbridge/ folder
# where manage.py lives. Don't change it, just check it looks like this:
BASE_DIR = Path(__file__).resolve().parent.parent

# Add these two lines — media folder will be created inside backend/skillbridge/
MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'