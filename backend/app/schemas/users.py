# schemas/users.py
"""Pydantic models for user profile and credit operations."""

from pydantic import BaseModel
from typing import Optional

class UserProfile(BaseModel):
    user_id: str
    username: str
    credits: int = 0

class CreditUpdateRequest(BaseModel):
    amount: int

class CreditUpdateResponse(BaseModel):
    status: str
    added: Optional[int] = None
    deducted: Optional[int] = None
    total: int
