"""
Django settings for SkillBridge project.

FILE LOCATION: skillbridge/skillbridge/settings.py
"""

from importlib.resources import path
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-change-this-in-production'

DEBUG = True

ALLOWED_HOSTS = ['*']


# -------------------------------------------------------
# JAZZMIN — SkillBridge branded admin dashboard
# -------------------------------------------------------
JAZZMIN_SETTINGS = {
    # ── Branding ──────────────────────────────────────────────────────────
    'site_title':        'SkillBridge Admin',
    'site_header':       'SkillBridge',
    'site_brand':        'SkillBridge',
    'welcome_sign':      'Welcome to SkillBridge Admin',
    'copyright':         'SkillBridge © 2025',
    'site_logo':         'admin/img/logo.gif',
    'login_logo':        'admin/img/logo.gif',
    'site_logo_classes': 'img-circle',
    'site_icon':         'admin/img/logo.gif',

    # ── Theme & Colors ─────────────────────────────────────────────────────
    # Uses AdminLTE skins — closest to SkillBridge green
    'theme':             'darkly',     # dark elegant base
    'dark_mode_theme':   'darkly',
    'button_classes': {
        'primary':   'btn-primary',
        'secondary': 'btn-secondary',
        'info':      'btn-info',
        'warning':   'btn-warning',
        'danger':    'btn-danger',
        'success':   'btn-success',
    },

    # ── Navigation Sidebar ─────────────────────────────────────────────────
    'topmenu_links': [
        {'name': 'View Site',  'url': 'http://127.0.0.1:5500/frontend/templates/home.html', 'new_window': True},
        {'name': 'Dashboard',  'url': 'admin:index'},
    ],
    'usermenu_links': [
        {'name': 'View Site',  'url': 'http://127.0.0.1:5500/frontend/templates/home.html', 'new_window': True},
    ],

    # ── Sidebar App Ordering ───────────────────────────────────────────────
    'order_with_respect_to': [
        'accounts', 'bookings', 'auth', 'notifications', 'payments',
        'locations', 'chatbot', 'token_blacklist',
    ],

    # ── App Icons ─────────────────────────────────────────────────────────
    'icons': {
        'auth':                             'fas fa-users-cog',
        'auth.user':                        'fas fa-user',
        'auth.Group':                       'fas fa-users',
        'accounts.User':                    'fas fa-user-circle',
        'accounts.CustomerProfile':         'fas fa-user-tie',
        'accounts.WorkerProfile':           'fas fa-hard-hat',
        'accounts.Favorites':               'fas fa-heart',
        'bookings.Booking':                 'fas fa-calendar-check',
        'bookings.Review':                  'fas fa-star',
        'notifications.Notification':       'fas fa-bell',
        'payments.Payment':                 'fas fa-credit-card',
        'locations.Location':               'fas fa-map-marker-alt',
        'chatbot.ChatSession':              'fas fa-comments',
        'token_blacklist.BlacklistedToken': 'fas fa-ban',
        'token_blacklist.OutstandingToken': 'fas fa-key',
    },
    'default_icon_parents':  'fas fa-folder',
    'default_icon_children': 'fas fa-circle',

    # ── UI Tweaks ──────────────────────────────────────────────────────────
    'show_sidebar':              True,
    'navigation_expanded':       True,
    'hide_apps':                 [],
    'hide_models':               [],
    'related_modal_active':      True,
    'custom_css':                'admin/css/skillbridge_admin.css',
    'custom_js':                 None,
    'use_google_fonts_cdn':      True,
    'show_ui_builder':           False,
}

JAZZMIN_UI_TWEAKS = {
    'navbar_small_text':        False,
    'footer_small_text':        False,
    'body_small_text':          False,
    'brand_small_text':         False,
    'brand_colour':             'navbar-success',   # SkillBridge green navbar
    'accent':                   'accent-success',
    'navbar':                   'navbar-dark',
    'no_navbar_border':         True,
    'navbar_fixed':             True,
    'layout_boxed':             False,
    'footer_fixed':             False,
    'sidebar_fixed':            True,
    'sidebar':                  'sidebar-dark-success',  # green sidebar
    'sidebar_nav_small_text':   False,
    'sidebar_disable_expand':   False,
    'sidebar_nav_child_indent': True,
    'sidebar_nav_compact_style':False,
    'sidebar_nav_legacy_style': False,
    'sidebar_nav_flat_style':   False,
    'theme':                    'darkly',
    'default_theme_mode':       'dark',
    'button_classes': {
        'primary':   'btn-outline-primary',
        'secondary': 'btn-outline-secondary',
        'info':      'btn-outline-info',
        'warning':   'btn-warning',
        'danger':    'btn-danger',
        'success':   'btn-success',
    },
}


# -------------------------------------------------------
# INSTALLED APPS
# We list Django built-ins first, then third-party packages,
# then our own SkillBridge apps.
# -------------------------------------------------------
INSTALLED_APPS = [
    # jazzmin MUST come before django.contrib.admin to override its templates
    'jazzmin',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'rest_framework_simplejwt.token_blacklist',

    # SkillBridge apps
    'accounts',
    'bookings',
    'django_filters',
    'locations',
    'payments',
    'notifications',
    'chatbot',
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
    # Phase-2 additions — django-filters for ?field=value URL params on list views
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    # Global pagination — prevents unbounded list responses on all endpoints
    'DEFAULT_PAGINATION_CLASS': None,
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

# Phase-2 — rotate refresh tokens so a stolen refresh token cannot be reused
# after it has been exchanged for a new access+refresh pair
SIMPLE_JWT['ROTATE_REFRESH_TOKENS']    = True
SIMPLE_JWT['BLACKLIST_AFTER_ROTATION'] = True


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
STATICFILES_DIRS = [BASE_DIR / 'static']

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# BASE_DIR already exists in your settings.py — it points to the backend/skillbridge/ folder
# where manage.py lives. Don't change it, just check it looks like this:
BASE_DIR = Path(__file__).resolve().parent.parent

# Add these two lines — media folder will be created inside backend/skillbridge/
MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# CORS settings to allow frontend JS to call our API
CORS_ALLOWED_ORIGINS = ["http://127.0.0.1:5500", "http://localhost:5500"]
