# schemas/users.py
"""Pydantic models for user profile and credit operations."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    """Base user fields."""
    email: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    """Data for creating a new user from Google OAuth."""
    google_id: str
    credits: int = 1000


class UserUpdate(BaseModel):
    """Data for updating user fields."""
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    credits: Optional[int] = None
    is_banned: Optional[bool] = None


class UserInDB(UserBase):
    """Full user record as stored in database."""
    user_id: str
    google_id: str
    credits: int = 0
    is_banned: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    """Public user profile (excludes sensitive fields)."""
    user_id: str
    username: Optional[str] = None
    email: str
    avatar_url: Optional[str] = None
    credits: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CreditUpdateRequest(BaseModel):
    """Request to update user credits (admin only)."""
    amount: int
    reason: Optional[str] = None


class CreditUpdateResponse(BaseModel):
    """Response after credit update."""
    status: str
    amount: int  # Amount changed (positive or negative)
    balance: int  # New balance


class UserCreditsResponse(BaseModel):
    """Response with user's current credits."""
    user_id: str
    credits: int


class ConcurrentLimitDetails(BaseModel):
    """Details for concurrent limits or usage."""
    total: int
    image: int
    video: int


class UserLimitsResponse(BaseModel):
    """Response with user's concurrent limits and usage."""
    plan_id: str
    plan_name: str
    plan_description: Optional[str] = None
    plan_expires_at: Optional[str] = None
    limits: ConcurrentLimitDetails
    active_counts: ConcurrentLimitDetails
    pending_counts: ConcurrentLimitDetails
