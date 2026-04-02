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
from .models import WorkerProfile, WorkerService, CustomerProfile

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
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'account_status']