from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class APIKeyCreate(BaseModel):
    """Schema for creating a new API key."""
    name: str = Field(..., description="Friendly name for the key")
    mode: str = Field("live", pattern="^(live|test)$", description="Key mode: 'live' or 'test'")
    expires_at: Optional[datetime] = None
    initial_balance: int = Field(0, ge=0, description="Initial credit balance")

class APIKeyResponse(BaseModel):
    """Schema for returning API key details (without the secret)."""
    key_id: str
    key_prefix: str
    user_id: Optional[str]
    balance: int
    is_active: bool
    created_at: str
    expires_at: Optional[str]
    last_used_at: Optional[str]
    mode: str = "live"  # Helper field derived from prefix
    
    # Only include full key on creation
    secret_key: Optional[str] = None

class APIKeyUpdate(BaseModel):
    """Schema for updating key properties."""
    is_active: Optional[bool] = None
    name: Optional[str] = None

class APIKeyUsageBase(BaseModel):
    """Base schema for usage logs."""
    endpoint: str
    cost: int
    status: str
    response_time_ms: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]

class APIKeyUsage(APIKeyUsageBase):
    """Schema for returning usage logs."""
    id: int
    key_id: str
    job_id: Optional[str]
    balance_before: int
    balance_after: int
    created_at: str

class APIKeyTopUp(BaseModel):
    """Schema for adding credits to a key."""
    amount: int = Field(..., gt=0, description="Amount of credits to add")
