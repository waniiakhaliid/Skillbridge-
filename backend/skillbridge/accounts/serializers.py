"""
Accounts Serializers

FILE LOCATION: skillbridge/accounts/serializers.py
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    WorkerProfile, WorkerService, CustomerProfile,
    Tool, WorkerTool, WorkerPortfolioPhoto, Favorite, WorkerAvailability,
)

User = get_user_model()


# -------------------------------------------------------
# REGISTRATION SERIALIZERS
# -------------------------------------------------------

class CustomerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model  = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user     = User.objects.create_user(password=password, role='customer', **validated_data)
        CustomerProfile.objects.create(user=user)
        return user


class WorkerRegisterSerializer(serializers.ModelSerializer):
    password          = serializers.CharField(write_only=True, min_length=6)
    bio               = serializers.CharField(required=False, allow_blank=True)
    years_experience  = serializers.IntegerField(min_value=0)
    base_hourly_rate  = serializers.DecimalField(max_digits=10, decimal_places=2)
    service_radius_km = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    city              = serializers.CharField(required=False, allow_blank=True)
    categories        = serializers.ListField(
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
        bio               = validated_data.pop('bio', '')
        years_experience  = validated_data.pop('years_experience')
        base_hourly_rate  = validated_data.pop('base_hourly_rate')
        service_radius_km = validated_data.pop('service_radius_km', 10.0)
        city              = validated_data.pop('city', '')
        categories        = validated_data.pop('categories')
        password          = validated_data.pop('password')

        user = User.objects.create_user(password=password, role='worker', **validated_data)

        profile = WorkerProfile.objects.create(
            user=user, bio=bio, years_experience=years_experience,
            base_hourly_rate=base_hourly_rate, service_radius_km=service_radius_km,
            city=city, verification_status='pending'
        )

        for category in categories:
            WorkerService.objects.create(worker_profile=profile, category=category)

        return user


class WorkerDocumentSerializer(serializers.Serializer):
    cnic_front    = serializers.FileField()
    cnic_back     = serializers.FileField(required=False)
    profile_photo = serializers.FileField(required=False)


# -------------------------------------------------------
# PORTFOLIO PHOTO SERIALIZER
# ── FIX: photo_url is a @property on the model (not a DB field)
#         so it must be SerializerMethodField, not a plain field.
#         Also exposes 'order' so frontend can maintain sort order.
# -------------------------------------------------------

class WorkerPortfolioPhotoSerializer(serializers.ModelSerializer):

    # photo_url is a @property that returns self.photo.url
    # It cannot be auto-serialized — must be explicit
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model  = WorkerPortfolioPhoto
        fields = ['id', 'photo_url', 'caption', 'order', 'uploaded_at']
        read_only_fields = ['id', 'photo_url', 'uploaded_at']

    def get_photo_url(self, obj):
        """
        Returns the full relative URL for the photo.
        e.g. /media/workers/uuid/portfolio/abc123.jpg
        Returns empty string if no photo is saved yet.
        """
        if obj.photo:
            return obj.photo.url   # Django ImageField .url returns /media/...
        return ''


# -------------------------------------------------------
# PROFILE SERIALIZERS
# -------------------------------------------------------

class WorkerServiceSerializer(serializers.ModelSerializer):
    effective_rate = serializers.SerializerMethodField()

    class Meta:
        model  = WorkerService
        fields = ['id', 'category', 'price_modifier_pct', 'effective_rate']

    def get_effective_rate(self, obj):
        return obj.effective_rate


class WorkerProfileSerializer(serializers.ModelSerializer):
    """
    Full worker profile — used for the worker profile page and listing cards.
    ── FIX: now includes portfolio_photos so profile.js gets real photos.
    """

    full_name         = serializers.CharField(source='user.full_name', read_only=True)
    email             = serializers.EmailField(source='user.email', read_only=True)
    profile_photo_url = serializers.SerializerMethodField()

    services         = WorkerServiceSerializer(many=True, read_only=True)

    # ── ADDED: portfolio photos included in worker profile response ──
    portfolio_photos  = WorkerPortfolioPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = WorkerProfile
        fields = [
            'id', 'full_name', 'email', 'profile_photo_url',
            'bio', 'years_experience', 'verification_status',
            'base_hourly_rate', 'service_radius_km', 'city',
            'is_available', 'avg_rating', 'total_reviews',
            'total_jobs_completed', 'services', 'portfolio_photos',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'verification_status', 'avg_rating',
            'total_reviews', 'total_jobs_completed',
        ]

    def get_profile_photo_url(self, obj):
        """
        Returns the profile photo URL from the related User.
        Uses ImageField .url property — works with the new organized structure.
        """
        if obj.user.profile_photo:
            return obj.user.profile_photo.url
        return ''


class CustomerProfileSerializer(serializers.ModelSerializer):
    full_name         = serializers.CharField(source='user.full_name', read_only=True)
    email             = serializers.EmailField(source='user.email', read_only=True)
    phone             = serializers.CharField(source='user.phone', read_only=True)
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            'id', 'full_name', 'email', 'phone',
            'profile_photo_url', 'default_address',
            'total_bookings', 'is_repeat_customer',
        ]
        read_only_fields = ['total_bookings', 'is_repeat_customer']

    def get_profile_photo_url(self, obj):
        if obj.user.profile_photo:
            return obj.user.profile_photo.url
        return ''


class UserSerializer(serializers.ModelSerializer):

    # ── FIX: profile_photo_url is a @property — use SerializerMethodField ──
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'first_name', 'last_name', 'email',
            'phone', 'role', 'account_status', 'profile_photo_url',
        ]

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            return obj.profile_photo.url
        return ''


# -------------------------------------------------------
# WORKER CARD SERIALIZER (for data.js / listing page)
# -------------------------------------------------------

class WorkerCardSerializer(serializers.ModelSerializer):

    name         = serializers.CharField(source='user.full_name', read_only=True)
    photo        = serializers.SerializerMethodField()
    experience   = serializers.IntegerField(source='years_experience', read_only=True)
    rating       = serializers.FloatField(source='avg_rating', read_only=True)
    price        = serializers.DecimalField(source='base_hourly_rate', max_digits=10, decimal_places=2, read_only=True)
    location     = serializers.CharField(source='city', read_only=True)
    verified     = serializers.SerializerMethodField()
    service      = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    class Meta:
        model  = WorkerProfile
        fields = [
            'id', 'name', 'service', 'experience', 'rating',
            'bio', 'availability', 'photo', 'verified', 'price', 'location',
        ]

    def get_photo(self, obj):
        if obj.user.profile_photo:
            return obj.user.profile_photo.url
        return ''

    def get_verified(self, obj):
        return obj.verification_status == 'approved'

    def get_service(self, obj):
        first = obj.services.first()
        return first.category.capitalize() if first else None

    def get_availability(self, obj):
        return ['Today', 'Tomorrow'] if obj.is_available else ['Weekend']


# =======================================================================
# PHASE-2 SERIALIZERS
# =======================================================================

class UserRegistrationSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=6)
    base_hourly_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    city             = serializers.CharField(required=False, allow_blank=True)
    categories       = serializers.ListField(
        child=serializers.ChoiceField(choices=['plumber', 'electrician', 'carpenter', 'mechanic']),
        write_only=True, required=False
    )

    class Meta:
        model  = User
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'password', 'role', 'base_hourly_rate', 'city', 'categories',
        ]

    def validate_role(self, value):
        if value == 'admin':
            raise serializers.ValidationError('Admin accounts cannot be created via the API.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_phone(self, value):
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError('A user with this phone number already exists.')
        return value

    def validate(self, data):
        if data.get('role') == 'worker' and not data.get('base_hourly_rate'):
            raise serializers.ValidationError({'base_hourly_rate': 'Required for workers.'})
        return data

    def create(self, validated_data):
        role             = validated_data.pop('role', 'customer')
        password         = validated_data.pop('password')
        base_hourly_rate = validated_data.pop('base_hourly_rate', None)
        city             = validated_data.pop('city', '')
        categories       = validated_data.pop('categories', [])

        user = User.objects.create_user(password=password, role=role, **validated_data)

        if role == 'worker':
            profile = WorkerProfile.objects.create(
                user=user, base_hourly_rate=base_hourly_rate or 0,
                city=city, verification_status='pending',
            )
            for cat in categories:
                WorkerService.objects.create(worker_profile=profile, category=cat)
        else:
            CustomerProfile.objects.create(user=user)

        return user


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model        = User
        fields       = [
            'id', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'role', 'account_status',
            'profile_photo_url', 'email_verified', 'phone_verified', 'created_at',
        ]
        read_only_fields = fields


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['first_name', 'last_name', 'phone', 'profile_photo_url']


class WorkerAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model            = WorkerAvailability
        fields           = ['id', 'day_of_week', 'start_time', 'end_time']
        read_only_fields = ['id']


class WorkerToolSerializer(serializers.ModelSerializer):
    tool_name     = serializers.CharField(source='tool.name', read_only=True)
    tool_category = serializers.CharField(source='tool.category', read_only=True)

    class Meta:
        model            = WorkerTool
        fields           = ['id', 'tool', 'tool_name', 'tool_category', 'price_adjustment_pct']
        read_only_fields = ['id', 'tool_name', 'tool_category']


class WorkerListSerializer(serializers.ModelSerializer):
    full_name         = serializers.CharField(source='user.full_name', read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    services          = serializers.SerializerMethodField()

    class Meta:
        model  = WorkerProfile
        fields = [
            'id', 'full_name', 'profile_photo_url',
            'city', 'avg_rating', 'base_hourly_rate',
            'is_available', 'verification_status', 'services',
        ]

    def get_profile_photo_url(self, obj):
        if obj.user.profile_photo:
            return obj.user.profile_photo.url
        return ''

    def get_services(self, obj):
        return list(obj.services.values_list('category', flat=True))


class WorkerDetailSerializer(serializers.ModelSerializer):
    """
    Full public worker profile — used by WorkerDetailView.
    Includes portfolio photos, availability, services, and stats.
    This is what profile.js receives when loading a worker page.
    """

    full_name         = serializers.CharField(source='user.full_name', read_only=True)
    email             = serializers.EmailField(source='user.email', read_only=True)
    profile_photo_url = serializers.SerializerMethodField()

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

    def get_profile_photo_url(self, obj):
        if obj.user.profile_photo:
            return obj.user.profile_photo.url
        return ''


class FavoriteSerializer(serializers.ModelSerializer):
    worker = WorkerListSerializer(source='worker_profile', read_only=True)

    class Meta:
        model        = Favorite
        fields       = ['id', 'worker_profile', 'worker', 'created_at']
        read_only_fields = ['id', 'worker', 'created_at']
        extra_kwargs = {'worker_profile': {'write_only': True}}