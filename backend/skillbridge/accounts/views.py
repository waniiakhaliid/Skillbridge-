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
    WorkerServiceSerializer,
    CustomerProfileSerializer,
    UserSerializer,
    WorkerCardSerializer,
)

User = get_user_model()



# # -------------------------------------------------------
# # WORKER LISTING VIEWS (used by frontend data.js)
# # -------------------------------------------------------

# class WorkerListView(generics.ListAPIView):
#     """
#     GET /api/accounts/workers/
#     GET /api/accounts/workers/?category=plumber

#     Returns all approved, active workers formatted for
#     the frontend listing/home page cards.

#     Uses WorkerCardSerializer which flattens the data into
#     the same shape as the old hardcoded SKILLBRIDGE_DATA.workers.

#     Public endpoint — no login required.
#     """
#     serializer_class   = WorkerCardSerializer   # ← CHANGED from WorkerProfileSerializer
#     permission_classes = [permissions.AllowAny]

#     def get_queryset(self):
#         queryset = WorkerProfile.objects.filter(
#             verification_status='approved',
#             user__account_status='active'
#         ).select_related(
#             'user'          # JOIN User table — needed for name, photo
#         ).prefetch_related(
#             'services'      # JOIN WorkerService — needed for category
#         )

#         # Optional filter by category: ?category=plumber
#         category = self.request.query_params.get('category')
#         if category:
#             queryset = queryset.filter(services__category=category.lower())

#         return queryset

#     def list(self, request, *args, **kwargs):
#         """
#         Override list() to wrap response in { workers: [...] }
#         so frontend can do: data.workers.forEach(...)
#         """
#         queryset    = self.get_queryset()
#         serializer  = self.get_serializer(queryset, many=True)
#         return Response({'workers': serializer.data})


# class WorkerDetailView(generics.RetrieveAPIView):
#     """
#     GET /api/accounts/workers/<uuid:pk>/

#     Returns a single worker's card data by their WorkerProfile UUID.
#     Used by profile.html?worker=<id>

#     Public endpoint — no login required.
#     """
#     serializer_class   = WorkerCardSerializer   # ← CHANGED from WorkerProfileSerializer
#     permission_classes = [permissions.AllowAny]
#     queryset           = WorkerProfile.objects.filter(
#         verification_status='approved'
#     ).select_related(
#         'user'
#     ).prefetch_related(
#         'services'
#     )

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


# =======================================================================
# PHASE-2 VIEWS — appended below, existing views above are untouched
# =======================================================================

from .permissions import IsWorker, IsCustomer, IsAdminRole
from .models import (
    WorkerService, WorkerAvailability, WorkerTool,
    WorkerPortfolioPhoto, Favorite, AuditLog,
)
from .serializers import (
    UserRegistrationSerializer,
    UserUpdateSerializer,
    WorkerDetailSerializer,
    WorkerAvailabilitySerializer,
    WorkerToolSerializer,
    WorkerPortfolioPhotoSerializer,
    FavoriteSerializer,
    WorkerServiceSerializer,
)
# ReviewSerializer lives in the bookings app — imported lazily inside the view
# to avoid a circular import (bookings imports accounts, not the other way round)
from django.db.models import Sum
from django.utils import timezone
from datetime import datetime


# -------------------------------------------------------
# UNIFIED REGISTER VIEW
# -------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/
    Unified endpoint that creates customer or worker based on the
    'role' field in the request body.
    Replaces the older customer-specific and worker-specific routes
    and is the canonical registration endpoint going forward.
    """
    serializer_class   = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Return a token pair immediately so the client is logged in right away
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'message': 'Account created successfully.',
                'access':  str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id':    str(user.id),
                    'email': user.email,
                    'role':  user.role,
                }
            },
            status=status.HTTP_201_CREATED
        )


# -------------------------------------------------------
# CHANGE PASSWORD
# -------------------------------------------------------

class ChangePasswordView(APIView):
    """
    POST /api/accounts/me/change-password/
    Body: { "old_password": "...", "new_password": "..." }
    Validates the current password before setting the new one so that
    a stolen access token alone cannot change the password.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user        = request.user
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not old_password or not new_password:
            return Response(
                {'error': 'Both old_password and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # check_password hashes and compares — never compare plain text directly
        if not user.check_password(old_password):
            return Response(
                {'error': 'Incorrect current password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {'error': 'New password must be at least 6 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully.'})


# -------------------------------------------------------
# WORKER SELF-MANAGEMENT VIEWS
# -------------------------------------------------------

class WorkerAvailabilityView(generics.ListCreateAPIView):
    """
    GET  /api/accounts/workers/me/availability/ — list own slots
    POST /api/accounts/workers/me/availability/ — add a slot
    """
    serializer_class   = WorkerAvailabilitySerializer
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerAvailability.objects.filter(
            worker_profile=self.request.user.worker_profile
        )

    def perform_create(self, serializer):
        # Automatically attach the authenticated worker's profile — prevents
        # a worker from creating availability for a different worker
        serializer.save(worker_profile=self.request.user.worker_profile)


class WorkerAvailabilityDeleteView(generics.DestroyAPIView):
    """DELETE /api/accounts/workers/me/availability/<uuid:pk>/"""
    permission_classes = [IsWorker]

    def get_queryset(self):
        # Scope to own profile so a worker cannot delete another worker's slot
        return WorkerAvailability.objects.filter(
            worker_profile=self.request.user.worker_profile
        )


class WorkerServiceView(generics.CreateAPIView):
    """POST /api/accounts/workers/me/services/ — add a service category"""
    serializer_class   = WorkerServiceSerializer
    permission_classes = [IsWorker]

    def perform_create(self, serializer):
        serializer.save(worker_profile=self.request.user.worker_profile)


class WorkerServiceDeleteView(generics.DestroyAPIView):
    """DELETE /api/accounts/workers/me/services/<uuid:pk>/"""
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerService.objects.filter(
            worker_profile=self.request.user.worker_profile
        )


class WorkerToolView(generics.CreateAPIView):
    """POST /api/accounts/workers/me/tools/ — add a tool"""
    serializer_class   = WorkerToolSerializer
    permission_classes = [IsWorker]

    def perform_create(self, serializer):
        serializer.save(worker_profile=self.request.user.worker_profile)


class WorkerToolDeleteView(generics.DestroyAPIView):
    """DELETE /api/accounts/workers/me/tools/<uuid:pk>/"""
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerTool.objects.filter(
            worker_profile=self.request.user.worker_profile
        )


class WorkerPortfolioView(generics.CreateAPIView):
    """POST /api/accounts/workers/me/portfolio/ — upload a portfolio photo"""
    serializer_class   = WorkerPortfolioPhotoSerializer
    permission_classes = [IsWorker]

    def perform_create(self, serializer):
        serializer.save(worker_profile=self.request.user.worker_profile)


class WorkerPortfolioDeleteView(generics.DestroyAPIView):
    """DELETE /api/accounts/workers/me/portfolio/<uuid:pk>/"""
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerPortfolioPhoto.objects.filter(
            worker_profile=self.request.user.worker_profile
        )


# -------------------------------------------------------
# FAVOURITES
# -------------------------------------------------------

class FavoriteListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/accounts/favorites/ — list own favourites
    POST /api/accounts/favorites/ — add a worker to favourites
    Body: { "worker_profile": "<uuid>" }
    """
    serializer_class   = FavoriteSerializer
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return Favorite.objects.filter(
            customer=self.request.user.customer_profile
        ).select_related('worker_profile__user')

    def perform_create(self, serializer):
        # customer is always the logged-in user — prevents favouriting on behalf of another
        serializer.save(customer=self.request.user.customer_profile)


class FavoriteDeleteView(generics.DestroyAPIView):
    """DELETE /api/accounts/favorites/<uuid:pk>/"""
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return Favorite.objects.filter(
            customer=self.request.user.customer_profile
        )


# -------------------------------------------------------
# WORKER REVIEWS (public)
# -------------------------------------------------------

class WorkerReviewListView(generics.ListAPIView):
    """
    GET /api/accounts/workers/<uuid:pk>/reviews/
    All public reviews for a specific worker.
    Placed here so the accounts app is self-contained for worker data.
    """
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        # Lazy import — bookings imports accounts (for User FK), so importing
        # bookings at accounts module level would create a circular dependency
        from bookings.serializers import ReviewSerializer
        return ReviewSerializer

    def get_queryset(self):
        from bookings.models import Review
        return Review.objects.filter(
            reviewee__worker_profile__id=self.kwargs['pk'],
            is_public=True
        ).select_related('reviewer').order_by('-created_at')


