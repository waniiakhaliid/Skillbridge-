"""
Accounts Views
FILE LOCATION: skillbridge/accounts/views.py
"""

# ── DRF imports ──
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

# ── SimpleJWT imports ──
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication

# ── Django imports ──
from django.contrib.auth import get_user_model

# ── Local imports ──
from .utils import save_file_locally
from .models import WorkerProfile, CustomerProfile
from .serializers import (
    CustomerRegisterSerializer,
    WorkerRegisterSerializer,
    WorkerDocumentSerializer,
    WorkerProfileSerializer,
    CustomerProfileSerializer,
    UserSerializer,
)

User = get_user_model()


# -------------------------------------------------------
# REGISTRATION VIEWS
# -------------------------------------------------------

class CustomerRegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/customer/
    Body: { first_name, last_name, email, phone, password }
    Creates a User (role=customer) + CustomerProfile.
    Public endpoint — no login required.
    """
    serializer_class   = CustomerRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                'message': 'Customer account created successfully.',
                'user':    UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )


class WorkerRegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/worker/
    Body: { first_name, last_name, email, phone, password,
            bio, years_experience, base_hourly_rate,
            service_radius_km, city, categories }
    Creates User (role=worker) + WorkerProfile + WorkerService rows.
    Returns JWT token so frontend can authenticate Step 3 document upload.
    Public endpoint — no login required.
    """
    serializer_class   = WorkerRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate JWT token pair for the newly created worker
        # Frontend stores the access token and sends it with Step 3
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'message' : 'Worker account created. Pending admin verification.',
                'token'   : str(refresh.access_token),
                'refresh' : str(refresh),
                'user'    : UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )


class WorkerDocumentUploadView(APIView):
    """
    PATCH /api/accounts/worker/documents/
    Body: multipart/form-data { cnic_front, cnic_back, profile_photo }
    Saves files to local media/ folder, stores URL strings in TextFields.
    Requires JWT token from WorkerRegisterView in Authorization header.
    """
    permission_classes     = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        serializer = WorkerDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user    = request.user
        profile = user.worker_profile

        if 'cnic_front' in request.FILES:
            profile.cnic_front_url = save_file_locally(request.FILES['cnic_front'], 'cnics')

        if 'cnic_back' in request.FILES:
            profile.cnic_back_url = save_file_locally(request.FILES['cnic_back'], 'cnics')

        # Profile photo lives on User not WorkerProfile so save separately
        if 'profile_photo' in request.FILES:
            user.profile_photo_url = save_file_locally(request.FILES['profile_photo'], 'profiles')
            user.save()

        profile.save()

        return Response(
            {'message': 'Documents uploaded. Pending admin verification.'},
            status=status.HTTP_200_OK
        )


# -------------------------------------------------------
# CURRENT USER VIEW
# -------------------------------------------------------

class MeView(APIView):
    """
    GET /api/accounts/me/
    Returns the logged-in user's info + their profile.
    Requires a valid JWT token in the Authorization header.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = UserSerializer(user).data

        # Attach the relevant profile based on role
        if user.is_worker:
            try:
                data['profile'] = WorkerProfileSerializer(user.worker_profile).data
            except WorkerProfile.DoesNotExist:
                data['profile'] = None

        elif user.is_customer:
            try:
                data['profile'] = CustomerProfileSerializer(user.customer_profile).data
            except CustomerProfile.DoesNotExist:
                data['profile'] = None

        return Response(data)


# -------------------------------------------------------
# WORKER VIEWS
# -------------------------------------------------------

class WorkerListView(generics.ListAPIView):
    """
    GET /api/accounts/workers/
    GET /api/accounts/workers/?category=plumber
    Lists all approved, active workers.
    Public endpoint — anyone can browse workers.
    """
    serializer_class   = WorkerProfileSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = WorkerProfile.objects.filter(
            verification_status='approved',
            user__account_status='active'
        ).select_related('user').prefetch_related('services')

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(services__category=category)

        return queryset


class WorkerDetailView(generics.RetrieveAPIView):
    """
    GET /api/accounts/workers/<uuid:pk>/
    Returns the full profile of a single approved worker.
    Public endpoint.
    """
    serializer_class   = WorkerProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset           = WorkerProfile.objects.filter(
        verification_status='approved'
    ).select_related('user').prefetch_related('services')


# -------------------------------------------------------
# PROFILE UPDATE VIEWS
# -------------------------------------------------------

class WorkerProfileUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/accounts/worker/profile/
    Logged-in worker updates their own profile.
    """
    serializer_class   = WorkerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['patch']

    def get_object(self):
        return self.request.user.worker_profile


class CustomerProfileUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/accounts/customer/profile/
    Logged-in customer updates their own profile.
    """
    serializer_class   = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['patch']

    def get_object(self):
        return self.request.user.customer_profile


# -------------------------------------------------------
# LOGOUT VIEW
# -------------------------------------------------------

class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { "refresh": "your_refresh_token_here" }
    Blacklists the refresh token so it can't generate new access tokens.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'message': 'Logged out successfully.'},
                status=status.HTTP_200_OK
            )

        except TokenError:
            return Response(
                {'error': 'Invalid or already expired token.'},
                status=status.HTTP_400_BAD_REQUEST
            )