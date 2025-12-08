# services/auth_service.py
"""Google OAuth authentication service."""

import httpx
from urllib.parse import urlencode
from typing import Optional
from datetime import datetime

from app.config import settings
from app.repositories import users_repo
from app.schemas.auth import GoogleUserInfo, UserResponse
from app.schemas.users import UserCreate
from app.utils.jwt_utils import create_access_token, get_token_expiry_seconds
from app.services.credits_service import credits_service


class AuthError(Exception):
    """Exception raised for authentication errors."""
    pass


class GoogleOAuthService:
    """Service for handling Google OAuth authentication flow."""
    
    # Google OAuth endpoints
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
    GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI
        self.frontend_url = settings.FRONTEND_URL
        self.default_credits = settings.DEFAULT_USER_CREDITS
    
    def get_auth_url(self, state: Optional[str] = None) -> str:
        """
        Generate Google OAuth authorization URL.
        
        Args:
            state: Optional state parameter for CSRF protection
            
        Returns:
            Full authorization URL to redirect user to
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account"
        }
        
        if state:
            params["state"] = state
        
        return f"{self.GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    async def exchange_code_for_tokens(self, code: str) -> dict:
        """
        Exchange authorization code for access and ID tokens.
        
        Args:
            code: Authorization code from Google callback
            
        Returns:
            Dict containing access_token, id_token, etc.
            
        Raises:
            AuthError: If token exchange fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise AuthError(f"Token exchange failed: {error_data.get('error_description', 'Unknown error')}")
            
            return response.json()
    
    async def get_user_info(self, access_token: str) -> GoogleUserInfo:
        """
        Get user information from Google using access token.
        
        Args:
            access_token: Google access token
            
        Returns:
            GoogleUserInfo with user's profile data
            
        Raises:
            AuthError: If userinfo request fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise AuthError("Failed to get user info from Google")
            
            data = response.json()
            
            return GoogleUserInfo(
                sub=data["sub"],
                email=data["email"],
                email_verified=data.get("email_verified", True),
                name=data.get("name"),
                picture=data.get("picture"),
                given_name=data.get("given_name"),
                family_name=data.get("family_name")
            )
    
    def get_or_create_user(self, google_user: GoogleUserInfo) -> dict:
        """
        Find existing user or create new one from Google profile.
        
        Args:
            google_user: User info from Google
            
        Returns:
            User record from database
        """
        # Try to find existing user by Google ID
        existing_user = users_repo.get_by_google_id(google_user.sub)
        
        if existing_user:
            # User exists - update profile if needed
            update_data = {}
            
            if google_user.picture and existing_user.get("avatar_url") != google_user.picture:
                update_data["avatar_url"] = google_user.picture
            
            if google_user.name and existing_user.get("username") != google_user.name:
                update_data["username"] = google_user.name
            
            if update_data:
                from app.schemas.users import UserUpdate
                users_repo.update(existing_user["user_id"], UserUpdate(**update_data))
                existing_user = users_repo.get_by_id(existing_user["user_id"])
            
            return existing_user
        
        # Create new user
        new_user = UserCreate(
            google_id=google_user.sub,
            email=google_user.email,
            username=google_user.name or google_user.email.split("@")[0],
            avatar_url=google_user.picture,
            credits=self.default_credits
        )
        
        created_user = users_repo.create(new_user)
        
        # Log initial credits
        credits_service.log_initial_credits(
            user_id=created_user["user_id"],
            amount=self.default_credits
        )
        
        return created_user
    
    def generate_jwt_token(self, user: dict) -> str:
        """
        Generate JWT token for authenticated user.
        
        Args:
            user: User record from database
            
        Returns:
            JWT token string
        """
        return create_access_token(
            user_id=user["user_id"],
            email=user["email"]
        )
    
    async def authenticate(self, code: str) -> tuple[str, dict]:
        """
        Complete OAuth flow: exchange code, get user info, create/get user, return JWT.
        
        This is the main authentication method called from the callback endpoint.
        
        Args:
            code: Authorization code from Google
            
        Returns:
            Tuple of (jwt_token, user_data)
            
        Raises:
            AuthError: If any step fails
        """
        # Exchange code for tokens
        tokens = await self.exchange_code_for_tokens(code)
        access_token = tokens.get("access_token")
        
        if not access_token:
            raise AuthError("No access token in response")
        
        # Get user info from Google
        google_user = await self.get_user_info(access_token)
        
        # Get or create user in our database
        user = self.get_or_create_user(google_user)
        
        # Generate our JWT token
        jwt_token = self.generate_jwt_token(user)
        
        return jwt_token, user
    
    def get_frontend_callback_url(self, token: str) -> str:
        """
        Generate frontend callback URL with token.
        
        Args:
            token: JWT token
            
        Returns:
            Full URL to redirect user to frontend
        """
        return f"{self.frontend_url}/auth/callback?token={token}"


# Singleton instance
google_oauth = GoogleOAuthService()
