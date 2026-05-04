"""
Accounts Views
FILE LOCATION: skillbridge/accounts/views.py
"""

# ── DRF imports ──
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes

# ── SimpleJWT imports ──
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication

# ── Django imports ──
from django.contrib.auth import get_user_model
from django.db.models import Max

# ── Local imports ──
from .models import WorkerProfile, CustomerProfile
from .serializers import (
    CustomerRegisterSerializer,
    WorkerRegisterSerializer,
    WorkerDocumentSerializer,
    WorkerProfileSerializer,
    WorkerDetailSerializer,
    WorkerServiceSerializer,
    CustomerProfileSerializer,
    UserSerializer,
    WorkerCardSerializer,
)

User = get_user_model()


# -------------------------------------------------------
# REGISTRATION VIEWS
# -------------------------------------------------------

class CustomerRegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/customer/
    """
    serializer_class   = CustomerRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'message': 'Customer account created successfully.', 'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED
        )


class WorkerRegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/worker/
    """
    serializer_class   = WorkerRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user    = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'message' : 'Worker account created. Pending admin verification.',
                'token'   : str(refresh.access_token),
                'refresh' : str(refresh),
                'user'    : UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED
        )


class WorkerDocumentUploadView(APIView):
    """
    PATCH /api/accounts/worker/documents/
    Body: multipart/form-data { cnic_front, cnic_back, profile_photo }

    Now uses ImageField — Django handles file saving and path organization.
    Files land at:
      media/workers/{user_id}/profile/profile.{ext}
      media/workers/{user_id}/documents/cnic_front.{ext}
      media/workers/{user_id}/documents/cnic_back.{ext}
    """
    permission_classes     = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        user    = request.user
        profile = user.worker_profile

        # ── CNIC front ──
        if 'cnic_front' in request.FILES:
            profile.cnic_front = request.FILES['cnic_front']  # ImageField saves automatically

        # ── CNIC back ──
        if 'cnic_back' in request.FILES:
            profile.cnic_back = request.FILES['cnic_back']

        # ── Profile photo — lives on User model ──
        if 'profile_photo' in request.FILES:
            user.profile_photo = request.FILES['profile_photo']
            user.save(update_fields=['profile_photo'])

        profile.save()

        return Response(
            {
                'message':           'Documents uploaded successfully.',
                'profile_photo_url': user.profile_photo_url,
            },
            status=status.HTTP_200_OK
        )


# -------------------------------------------------------
# CURRENT USER VIEW
# -------------------------------------------------------

class MeView(APIView):
    """GET /api/accounts/me/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = UserSerializer(user).data

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
    """GET /api/accounts/workers/"""
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
    """GET /api/accounts/workers/<uuid:pk>/"""
    serializer_class   = WorkerDetailSerializer
    permission_classes = [permissions.AllowAny]
    queryset           = WorkerProfile.objects.filter(
        verification_status='approved'
    ).select_related('user').prefetch_related('services', 'portfolio_photos', 'availability')


# -------------------------------------------------------
# PROFILE UPDATE VIEWS
# -------------------------------------------------------

class WorkerProfileUpdateView(generics.UpdateAPIView):
    """PATCH /api/accounts/worker/profile/"""
    serializer_class   = WorkerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['patch']

    def get_object(self):
        return self.request.user.worker_profile

    def partial_update(self, request, *args, **kwargs):
        # Handle profile photo upload — ImageField handles path and saving
        if 'profile_photo' in request.FILES:
            request.user.profile_photo = request.FILES['profile_photo']
            request.user.save(update_fields=['profile_photo'])

        return super().partial_update(request, *args, **kwargs)


class CustomerProfileUpdateView(generics.UpdateAPIView):
    """PATCH /api/accounts/customer/profile/"""
    serializer_class   = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['patch']

    def get_object(self):
        return self.request.user.customer_profile


# -------------------------------------------------------
# LOGOUT VIEW
# -------------------------------------------------------

class LogoutView(APIView):
    """POST /api/auth/logout/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({'error': 'Invalid or already expired token.'}, status=status.HTTP_400_BAD_REQUEST)


# =======================================================================
# PHASE-2 VIEWS
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
from django.db.models import Sum
from django.utils import timezone


# -------------------------------------------------------
# UNIFIED REGISTER VIEW
# -------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """POST /api/accounts/register/"""
    serializer_class   = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user    = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'message': 'Account created successfully.',
                'access':  str(refresh.access_token),
                'refresh': str(refresh),
                'user': {'id': str(user.id), 'email': user.email, 'role': user.role},
            },
            status=status.HTTP_201_CREATED
        )


# -------------------------------------------------------
# CHANGE PASSWORD
# -------------------------------------------------------

class ChangePasswordView(APIView):
    """POST /api/accounts/me/change-password/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user         = request.user
        old_password = request.data.get('old_password', '') or request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not old_password or not new_password:
            return Response({'error': 'Both old_password and new_password are required.'}, status=400)

        if not user.check_password(old_password):
            return Response({'error': 'Incorrect current password.'}, status=400)

        if len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters.'}, status=400)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully.'})


# -------------------------------------------------------
# WORKER SELF-MANAGEMENT VIEWS
# -------------------------------------------------------

class WorkerAvailabilityView(generics.ListCreateAPIView):
    serializer_class   = WorkerAvailabilitySerializer
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerAvailability.objects.filter(worker_profile=self.request.user.worker_profile)

    def perform_create(self, serializer):
        serializer.save(worker_profile=self.request.user.worker_profile)


class WorkerAvailabilityDeleteView(generics.DestroyAPIView):
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerAvailability.objects.filter(worker_profile=self.request.user.worker_profile)


class WorkerServiceView(generics.CreateAPIView):
    serializer_class   = WorkerServiceSerializer
    permission_classes = [IsWorker]

    def perform_create(self, serializer):
        serializer.save(worker_profile=self.request.user.worker_profile)


class WorkerServiceDeleteView(generics.DestroyAPIView):
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerService.objects.filter(worker_profile=self.request.user.worker_profile)


class WorkerToolView(generics.CreateAPIView):
    serializer_class   = WorkerToolSerializer
    permission_classes = [IsWorker]

    def perform_create(self, serializer):
        serializer.save(worker_profile=self.request.user.worker_profile)


class WorkerToolDeleteView(generics.DestroyAPIView):
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerTool.objects.filter(worker_profile=self.request.user.worker_profile)


# -------------------------------------------------------
# PORTFOLIO VIEWS
# -------------------------------------------------------

class WorkerPortfolioView(generics.ListCreateAPIView):
    """
    GET  /api/accounts/workers/me/portfolio/  — list own photos (ordered)
    POST /api/accounts/workers/me/portfolio/  — upload a new photo

    Files saved to: media/workers/{user_id}/portfolio/{uuid12}.{ext}
    Django ImageField handles the actual file saving — no manual path logic needed.
    """
    serializer_class   = WorkerPortfolioPhotoSerializer
    permission_classes = [IsWorker]

    def get_queryset(self):
        # Returns photos in display order (order field, then upload date)
        return WorkerPortfolioPhoto.objects.filter(
            worker_profile=self.request.user.worker_profile
        ).order_by('order', 'uploaded_at')

    def create(self, request, *args, **kwargs):
        if 'photo' not in request.FILES:
            return Response({'error': 'photo file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.worker_profile

        # Put new photo at the end of the list
        max_order = WorkerPortfolioPhoto.objects.filter(
            worker_profile=profile
        ).aggregate(Max('order'))['order__max']
        next_order = (max_order or 0) + 1

        # ImageField (upload_to=portfolio_photo_path) handles saving the file
        # to media/workers/{user_id}/portfolio/{uuid12}.{ext} automatically
        photo = WorkerPortfolioPhoto.objects.create(
            worker_profile = profile,
            photo          = request.FILES['photo'],
            caption        = request.data.get('caption', ''),
            order          = next_order,
        )

        return Response(
            WorkerPortfolioPhotoSerializer(photo).data,
            status=status.HTTP_201_CREATED
        )


class WorkerPortfolioDeleteView(generics.DestroyAPIView):
    """DELETE /api/accounts/workers/me/portfolio/<uuid:pk>/"""
    permission_classes = [IsWorker]

    def get_queryset(self):
        return WorkerPortfolioPhoto.objects.filter(
            worker_profile=self.request.user.worker_profile
        )


class WorkerPortfolioReorderView(APIView):
    """
    POST /api/accounts/workers/me/portfolio/reorder/
    Body: { "order": ["uuid1", "uuid2", "uuid3"] }

    Saves the drag-and-drop order from the frontend.
    First ID in the list becomes order=0 (the cover photo).
    """
    permission_classes = [IsWorker]

    def post(self, request):
        order = request.data.get('order', [])
        if not isinstance(order, list) or not order:
            return Response({'detail': 'order list required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = request.user.worker_profile
        except Exception:
            return Response({'detail': 'Worker profile not found'}, status=status.HTTP_404_NOT_FOUND)

        photos    = WorkerPortfolioPhoto.objects.filter(worker_profile=profile)
        photo_map = {str(p.id): p for p in photos}

        updated = []
        for index, photo_id in enumerate(order):
            if photo_id in photo_map:
                photo_map[photo_id].order = index
                updated.append(photo_map[photo_id])

        # Bulk update is much faster than individual saves
        WorkerPortfolioPhoto.objects.bulk_update(updated, ['order'])

        return Response({
            'detail': 'Order saved successfully.',
            'count':  len(updated),
        })


# -------------------------------------------------------
# FAVOURITES
# -------------------------------------------------------

class FavoriteListCreateView(generics.ListCreateAPIView):
    serializer_class   = FavoriteSerializer
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return Favorite.objects.filter(
            customer=self.request.user.customer_profile
        ).select_related('worker_profile__user')

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user.customer_profile)


class FavoriteDeleteView(generics.DestroyAPIView):
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return Favorite.objects.filter(customer=self.request.user.customer_profile)


# -------------------------------------------------------
# WORKER REVIEWS (public)
# -------------------------------------------------------

class WorkerReviewListView(generics.ListAPIView):
    """GET /api/accounts/workers/<uuid:pk>/reviews/"""
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        from bookings.serializers import ReviewSerializer
        return ReviewSerializer

    def get_queryset(self):
        from bookings.models import Review
        return Review.objects.filter(
            reviewee__worker_profile__id=self.kwargs['pk'],
            is_public=True
        ).select_related('reviewer').order_by('-created_at')