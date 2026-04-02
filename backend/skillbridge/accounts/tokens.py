# FILE LOCATION: skillbridge/accounts/tokens.py

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class SkillBridgeTokenSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to include
    user info in the login response.
    """

    def validate(self, attrs):
        # Get the default token data (access + refresh)
        data = super().validate(attrs)

        # Add user info to the response
        data['user'] = {
            'id':         str(self.user.id),
            'first_name': self.user.first_name,
            'last_name':  self.user.last_name,
            'email':      self.user.email,
            'role':       self.user.role,
        }

        return data


class SkillBridgeTokenView(TokenObtainPairView):
    serializer_class = SkillBridgeTokenSerializer