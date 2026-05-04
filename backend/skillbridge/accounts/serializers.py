"""
Accounts Serializers

FILE LOCATION: skillbridge/accounts/serializers.py

Serializers do two things:
1. Convert model instances → JSON (for API responses)
2. Validate and convert incoming JSON → model instances (for saving)

Think of them as the translation layer between your Django models
and the outside world (your frontend or mobile app).
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    WorkerProfile, WorkerService, CustomerProfile,
    Tool, WorkerTool, WorkerPortfolioPhoto, Favorite, WorkerAvailability,
)

# get_user_model() returns our custom User model safely
# Always use this instead of importing User directly
User = get_user_model()


# -------------------------------------------------------
# REGISTRATION SERIALIZERS
# Used when a new user signs up
# -------------------------------------------------------

class CustomerRegisterSerializer(serializers.ModelSerializer):
    """
    Handles customer signup.
    Accepts: first_name, last_name, email, phone, password
    Creates: User (role=customer) + CustomerProfile
    """

    # password is write-only — it goes in but never comes back out in responses
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'password']

    def create(self, validated_data):
        """
        Called when serializer.save() is called in the view.
        Creates the User and their CustomerProfile together.
        """
        # Pop password out before creating user (handled separately)
        password = validated_data.pop('password')

        # Create the user with role=customer
        user = User.objects.create_user(
            password=password,
            role='customer',
            **validated_data
        )

        # Automatically create a CustomerProfile for this user
        CustomerProfile.objects.create(user=user)

        return user


class WorkerRegisterSerializer(serializers.ModelSerializer):
    """
    Handles Step 1 + Step 2 of the signup wizard.
    Creates: User (role=worker) + WorkerProfile + WorkerService rows
    Does NOT handle files — that's WorkerDocumentSerializer's job
    """

    password          = serializers.CharField(write_only=True, min_length=6)
    bio               = serializers.CharField(required=False, allow_blank=True)
    years_experience  = serializers.IntegerField(min_value=0)
    base_hourly_rate  = serializers.DecimalField(max_digits=10, decimal_places=2)
    service_radius_km = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    city              = serializers.CharField(required=False, allow_blank=True)

    # ListField because worker can select multiple categories
    # e.g. ["plumber", "electrician"]
    categories = serializers.ListField(
        child=serializers.ChoiceField(choices=['plumber', 'electrician', 'carpenter', 'mechanic']),
        write_only=True
    )

    class Meta:
        model  = User
        fields = [
            'first_name', 'last_name', 'email', 'phone', 'password',
            'bio', 'years_experience', 'base_hourly_rate',
            'service_radius_km', 'city', 'categories'
        ]

    def create(self, validated_data):
        # Pop fields that belong to WorkerProfile, not User
        bio               = validated_data.pop('bio', '')
        years_experience  = validated_data.pop('years_experience')
        base_hourly_rate  = validated_data.pop('base_hourly_rate')
        service_radius_km = validated_data.pop('service_radius_km', 10.0)
        city              = validated_data.pop('city', '')
        categories        = validated_data.pop('categories')
        password          = validated_data.pop('password')

        # Create the User row (role=worker)
        user = User.objects.create_user(
            password=password,
            role='worker',
            **validated_data   # first_name, last_name, email, phone
        )

        # Create the WorkerProfile row
        # verification_status defaults to pending — admin approves later
        profile = WorkerProfile.objects.create(
            user              = user,
            bio               = bio,
            years_experience  = years_experience,
            base_hourly_rate  = base_hourly_rate,
            service_radius_km = service_radius_km,
            city              = city,
            verification_status = 'pending'
        )

        # Create one WorkerService row per selected category
        for category in categories:
            WorkerService.objects.create(
                worker_profile = profile,
                category       = category
            )

        return user


class WorkerDocumentSerializer(serializers.Serializer):
    """
    Handles Step 3 of the signup wizard — file uploads only.
    Updates: WorkerProfile (cnic urls) + User (profile photo url)

    Uses plain Serializer not ModelSerializer because
    we're manually handling file saving via save_file_locally()
    """

    # These fields accept uploaded files from the request
    cnic_front    = serializers.FileField()
    cnic_back     = serializers.FileField(required=False)
    profile_photo = serializers.FileField(required=False)





# -------------------------------------------------------
# PROFILE SERIALIZERS
# Used for reading and updating profile data
# -------------------------------------------------------

class WorkerServiceSerializer(serializers.ModelSerializer):
    """Serializes a single service offering by a worker."""

    # effective_rate is a property on the model, not a DB field
    # We use SerializerMethodField to include computed values
    effective_rate = serializers.SerializerMethodField()

    class Meta:
        model = WorkerService
        fields = ['id', 'category', 'price_modifier_pct', 'effective_rate']

    def get_effective_rate(self, obj):
        return obj.effective_rate


class WorkerProfileSerializer(serializers.ModelSerializer):
    """
    Full worker profile — used for the worker profile page
    and the listing page cards.
    """

    # Nest the user's basic info inside the profile response
    full_name         = serializers.CharField(source='user.full_name', read_only=True)
    email             = serializers.EmailField(source='user.email', read_only=True)
    profile_photo_url = serializers.CharField(source='user.profile_photo_url', read_only=True)

    # Include all services this worker offers as a nested list
    services = WorkerServiceSerializer(many=True, read_only=True)

    class Meta:
        model = WorkerProfile
        fields = [
            'id', 'full_name', 'email', 'profile_photo_url',
            'bio', 'years_experience', 'verification_status',
            'base_hourly_rate', 'service_radius_km', 'city',
            'is_available', 'avg_rating', 'total_reviews',
            'total_jobs_completed', 'services',
            'created_at', 'updated_at'
        ]
        # These fields can be read but not changed via this serializer
        read_only_fields = [
            'verification_status', 'avg_rating',
            'total_reviews', 'total_jobs_completed'
        ]


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Customer profile — used in the customer dashboard."""

    full_name         = serializers.CharField(source='user.full_name', read_only=True)
    email             = serializers.EmailField(source='user.email', read_only=True)
    phone             = serializers.CharField(source='user.phone', read_only=True)
    profile_photo_url = serializers.CharField(source='user.profile_photo_url', read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            'id', 'full_name', 'email', 'phone',
            'profile_photo_url', 'default_address',
            'total_bookings', 'is_repeat_customer'
        ]
        read_only_fields = ['total_bookings', 'is_repeat_customer']


# class UserSerializer(serializers.ModelSerializer):
#     """
#     Lightweight user info serializer.
#     Used to return basic profile info after login.
#     """

#     class Meta:
#         model = User
#         fields = [
#             'id', 'first_name', 'last_name', 'email',
#             'phone', 'role', 'profile_photo_url', 'account_status'
#         ]
#         read_only_fields = ['id', 'role', 'account_status']

class UserSerializer(serializers.ModelSerializer):
    """
    Read-only serializer — formats User object as JSON to send back.
    Used in responses after registration/login.
    write_only fields like password are excluded automatically.
    """

    class Meta:
        model  = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'account_status','profile_photo_url']


# -------------------------------------------------------
# WORKER CARD SERIALIZER
# Used for the frontend listing/home page
# Returns data in the exact shape that SKILLBRIDGE_DATA.workers expects
# -------------------------------------------------------

class WorkerCardSerializer(serializers.ModelSerializer):
    """
    Flattened worker serializer for frontend listing cards.
    
    Combines data from 3 tables:
      - User          → name, photo
      - WorkerProfile → experience, rating, bio, price, location, availability
      - WorkerService → service category
    
    Output shape matches the old hardcoded data.js exactly so
    all existing frontend JS works without changes.
    """

    # 'name' = first_name + last_name from User model
    name = serializers.CharField(source='user.full_name', read_only=True)

    # 'photo' = profile_photo_url from User model
    # e.g. '/media/profile_photos/hasnain.jpeg'
    photo = serializers.CharField(source='user.profile_photo_url', read_only=True)

    # Rename 'years_experience' → 'experience' for frontend
    experience = serializers.IntegerField(source='years_experience', read_only=True)

    # Rename 'avg_rating' → 'rating' for frontend
    rating = serializers.FloatField(source='avg_rating', read_only=True)

    # Rename 'base_hourly_rate' → 'price' for frontend
    price = serializers.DecimalField(
        source='base_hourly_rate',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    # Rename 'city' → 'location' for frontend
    location = serializers.CharField(source='city', read_only=True)

    # 'verified' = True if verification_status is 'approved'
    verified = serializers.SerializerMethodField()

    # 'service' = first service category, capitalized
    # e.g. 'plumber' → 'Plumber'
    service = serializers.SerializerMethodField()

    # 'availability' = list like ['Today', 'Tomorrow'] that frontend expects
    # Our DB stores a simple boolean is_available
    # We convert it to a list for frontend compatibility
    availability = serializers.SerializerMethodField()

    class Meta:
        model = WorkerProfile
        fields = [
            'id',           # WorkerProfile UUID
            'name',         # from User
            'service',      # from WorkerService (first one)
            'experience',   # years_experience renamed
            'rating',       # avg_rating renamed
            'bio',          # from WorkerProfile
            'availability', # converted from boolean → list
            'photo',        # from User
            'verified',     # converted from status string → boolean
            'price',        # base_hourly_rate renamed
            'location',     # city renamed
        ]

    def get_verified(self, obj):
        """
        Frontend expects a boolean.
        Convert 'approved' status string → True, anything else → False
        """
        return obj.verification_status == 'approved'

    def get_service(self, obj):
        """
        Frontend expects a capitalized string like 'Plumber'.
        Get the first service from the worker's services list.
        Uses prefetch_related so no extra DB query per worker.
        """
        # obj.services comes from prefetch_related('services') in the view
        first_service = obj.services.first()
        if first_service:
            return first_service.category.capitalize()  # 'plumber' → 'Plumber'
        return None

    def get_availability(self, obj):
        """
        Frontend expects a list like ['Today', 'Tomorrow', 'Weekend'].
        Our DB only stores a boolean is_available.

        For now: if available → return ['Today', 'Tomorrow']
                 if not      → return ['Weekend']

        TODO: Replace with a proper availability schedule model later
        """
        if obj.is_available:
            return ['Today', 'Tomorrow']
        return ['Weekend']


# =======================================================================
# PHASE-2 SERIALIZERS
# Appended below — all existing serializers above are untouched.
# =======================================================================


# -------------------------------------------------------
# USER REGISTRATION (unified single endpoint)
# -------------------------------------------------------

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Unified registration serializer for both roles via POST /api/accounts/register/.
    Role must be 'customer' or 'worker' — 'admin' is rejected at the API boundary
    so attackers cannot self-promote.
    Workers additionally require base_hourly_rate and city.
    """

    password         = serializers.CharField(write_only=True, min_length=6)
    # Worker-only fields — optional for customers, validated below
    base_hourly_rate = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )
    city             = serializers.CharField(required=False, allow_blank=True)
    categories       = serializers.ListField(
        child=serializers.ChoiceField(
            choices=['plumber', 'electrician', 'carpenter', 'mechanic']
        ),
        write_only=True,
        required=False
    )

    class Meta:
        model  = User
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'password', 'role',
            'base_hourly_rate', 'city', 'categories',
        ]

    def validate_role(self, value):
        # Reject 'admin' at the API level — admins are created via manage.py only
        if value == 'admin':
            raise serializers.ValidationError(
                'Admin accounts cannot be created via the API.'
            )
        return value

    def validate_email(self, value):
        # Unique email check — gives a friendlier error than the DB constraint
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'A user with this email address already exists.'
            )
        return value

    def validate_phone(self, value):
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError(
                'A user with this phone number already exists.'
            )
        return value

    def validate(self, data):
        # Workers must supply base_hourly_rate — customers don't need it
        if data.get('role') == 'worker' and not data.get('base_hourly_rate'):
            raise serializers.ValidationError(
                {'base_hourly_rate': 'This field is required for workers.'}
            )
        return data

    def create(self, validated_data):
        role             = validated_data.pop('role', 'customer')
        password         = validated_data.pop('password')
        base_hourly_rate = validated_data.pop('base_hourly_rate', None)
        city             = validated_data.pop('city', '')
        categories       = validated_data.pop('categories', [])

        user = User.objects.create_user(
            password=password,
            role=role,
            **validated_data
        )

        if role == 'worker':
            profile = WorkerProfile.objects.create(
                user             = user,
                base_hourly_rate = base_hourly_rate or 0,
                city             = city,
                verification_status = 'pending',
            )
            for cat in categories:
                WorkerService.objects.create(worker_profile=profile, category=cat)
        else:
            # role == 'customer'
            CustomerProfile.objects.create(user=user)

        return user


# -------------------------------------------------------
# USER PROFILE SERIALIZERS
# -------------------------------------------------------

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Full read-only user profile — returns user fields plus nested
    role-specific profile. Used for GET /api/accounts/me/.
    """

    # Computed property from the model — not a DB column
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'role', 'account_status',
            'profile_photo_url', 'email_verified', 'phone_verified',
            'created_at',
        ]
        read_only_fields = fields  # this serializer is read-only


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Write serializer for PATCH /api/accounts/me/.
    Only allows the safe subset of fields — role, account_status,
    and all internal flags are immutable from this endpoint.
    """

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile_photo_url']


# -------------------------------------------------------
# WORKER PUBLIC SERIALIZERS
# -------------------------------------------------------

class WorkerAvailabilitySerializer(serializers.ModelSerializer):
    """
    Availability slot for a worker. Explicit fields only —
    worker_profile is set from the authenticated user in the view.
    """

    class Meta:
        model  = WorkerAvailability
        fields = ['id', 'day_of_week', 'start_time', 'end_time']
        read_only_fields = ['id']


class WorkerToolSerializer(serializers.ModelSerializer):
    """
    A tool a worker owns with its price adjustment.
    tool_name is read-only — shows the tool's name on read responses.
    """

    # Denormalise tool name so the frontend doesn't need a second request
    tool_name     = serializers.CharField(source='tool.name', read_only=True)
    tool_category = serializers.CharField(source='tool.category', read_only=True)

    class Meta:
        model  = WorkerTool
        fields = ['id', 'tool', 'tool_name', 'tool_category', 'price_adjustment_pct']
        read_only_fields = ['id', 'tool_name', 'tool_category']


class WorkerPortfolioPhotoSerializer(serializers.ModelSerializer):
    """
    Portfolio photo uploaded by a worker to showcase past work.
    worker_profile is set from the authenticated user in the view.
    """

    class Meta:
        model  = WorkerPortfolioPhoto
        fields = ['id', 'photo_url', 'caption', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class WorkerListSerializer(serializers.ModelSerializer):
    """
    Compact public worker listing used by WorkerListView.
    Returns only the fields needed for browse/search cards.
    Keeps the response small on the listing page where dozens
    of workers are returned at once.
    """

    full_name         = serializers.CharField(source='user.full_name', read_only=True)
    profile_photo_url = serializers.CharField(source='user.profile_photo_url', read_only=True)
    # List of category strings e.g. ['plumber', 'electrician']
    services          = serializers.SerializerMethodField()

    class Meta:
        model  = WorkerProfile
        fields = [
            'id', 'full_name', 'profile_photo_url',
            'city', 'avg_rating', 'base_hourly_rate',
            'is_available', 'verification_status', 'services',
        ]

    def get_services(self, obj):
        # Uses prefetch_related('services') from the view — no extra query
        return list(obj.services.values_list('category', flat=True))


class WorkerDetailSerializer(serializers.ModelSerializer):
    """
    Full public worker profile — used by WorkerDetailView.
    Includes portfolio photos, availability schedule, services,
    and aggregate stats. Heavier than WorkerListSerializer
    because it's loaded only on the single-worker profile page.
    """

    full_name         = serializers.CharField(source='user.full_name', read_only=True)
    email             = serializers.EmailField(source='user.email', read_only=True)
    profile_photo_url = serializers.CharField(source='user.profile_photo_url', read_only=True)

    services         = WorkerServiceSerializer(many=True, read_only=True)
    portfolio_photos = WorkerPortfolioPhotoSerializer(many=True, read_only=True)
    availability     = WorkerAvailabilitySerializer(many=True, read_only=True)

    class Meta:
        model  = WorkerProfile
        fields = [
            'id', 'full_name', 'email', 'profile_photo_url',
            'bio', 'years_experience', 'city',
            'base_hourly_rate', 'service_radius_km',
            'is_available', 'verification_status',
            'avg_rating', 'total_reviews', 'total_jobs_completed',
            'services', 'portfolio_photos', 'availability',
            'created_at',
        ]
        read_only_fields = [
            'verification_status', 'avg_rating',
            'total_reviews', 'total_jobs_completed',
        ]


# -------------------------------------------------------
# FAVORITE SERIALIZER
# -------------------------------------------------------

class FavoriteSerializer(serializers.ModelSerializer):
    """
    On read: nested worker summary so the favourites list is self-contained.
    On write: only worker_profile id is needed — customer is set from the
    authenticated user in the view, avoiding any user impersonation.
    """

    # Nested on read — not required on write
    worker = WorkerListSerializer(source='worker_profile', read_only=True)

    class Meta:
        model  = Favorite
        fields = ['id', 'worker_profile', 'worker', 'created_at']
        read_only_fields = ['id', 'worker', 'created_at']
        # worker_profile is write-only (just the UUID) — 'worker' is the read view
        extra_kwargs = {'worker_profile': {'write_only': True}}