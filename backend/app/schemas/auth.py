# schemas/auth.py
"""Pydantic models for authentication (OAuth, JWT)."""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class GoogleUserInfo(BaseModel):
    """User information extracted from Google ID token."""
    sub: str  # Google user ID (unique, never changes)
    email: str
    email_verified: bool = True
    name: Optional[str] = None
    picture: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None


class TokenPayload(BaseModel):
    """JWT token payload structure."""
    user_id: str
    email: str
    exp: int  # Expiry timestamp
    iat: int  # Issued at timestamp


class TokenResponse(BaseModel):
    """Response containing JWT token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds until expiry


class AuthCallbackResponse(BaseModel):
    """Response from OAuth callback (for API clients)."""
    token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    """Current user profile response."""
    user_id: str
    email: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    credits: int
    is_banned: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class GoogleAuthURLResponse(BaseModel):
    """Response containing Google OAuth URL."""
    auth_url: str


# Update forward references
AuthCallbackResponse.model_rebuild()
