"""
Admin API endpoints for managing Higgsfield provider accounts.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from app.deps import get_current_admin
from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo
from app.services.providers.higgsfield_client import HiggsfieldClient


router = APIRouter()


# Schemas
class HiggsfieldAccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    sses: str = Field(..., min_length=1)
    cookie: str = Field(..., min_length=1)
    max_parallel_images: int = Field(default=8, ge=1, le=50)
    max_parallel_videos: int = Field(default=8, ge=1, le=50)
    max_slow_images: int = Field(default=4, ge=0, le=50)
    max_slow_videos: int = Field(default=4, ge=0, le=50)
    priority: int = Field(default=100, ge=1, le=1000)
    is_active: bool = Field(default=True)


class HiggsfieldAccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    sses: Optional[str] = Field(None, min_length=1)
    cookie: Optional[str] = Field(None, min_length=1)
    max_parallel_images: Optional[int] = Field(None, ge=1, le=50)
    max_parallel_videos: Optional[int] = Field(None, ge=1, le=50)
    max_slow_images: Optional[int] = Field(None, ge=0, le=50)
    max_slow_videos: Optional[int] = Field(None, ge=0, le=50)
    priority: Optional[int] = Field(None, ge=1, le=1000)
    is_active: Optional[bool] = None


class HiggsfieldAccountResponse(BaseModel):
    account_id: int
    name: str
    max_parallel_images: int
    max_parallel_videos: int
    max_slow_images: int
    max_slow_videos: int
    priority: int
    is_active: bool
    created_at: str
    updated_at: str
    # Don't expose credentials in list responses


class HiggsfieldAccountDetailResponse(HiggsfieldAccountResponse):
    sses: str
    cookie: str


# Endpoints
@router.get("/accounts", response_model=List[HiggsfieldAccountResponse])
async def list_accounts(
    active_only: bool = False,
    admin=Depends(get_current_admin)
):
    """List all Higgsfield accounts."""
    accounts = higgsfield_accounts_repo.list_accounts(active_only=active_only)
    return accounts


@router.get("/accounts/stats")
async def get_all_account_stats(admin=Depends(get_current_admin)):
    """Get statistics for all accounts including current job counts."""
    stats = higgsfield_accounts_repo.get_all_account_stats()
    return {"accounts": stats}


@router.post("/accounts", response_model=HiggsfieldAccountDetailResponse, status_code=201)
async def create_account(
    data: HiggsfieldAccountCreate,
    admin=Depends(get_current_admin)
):
    """Create a new Higgsfield account."""
    try:
        account_id = higgsfield_accounts_repo.create_account(
            name=data.name,
            sses=data.sses,
            cookie=data.cookie,
            max_parallel_images=data.max_parallel_images,
            max_parallel_videos=data.max_parallel_videos,
            max_slow_images=data.max_slow_images,
            max_slow_videos=data.max_slow_videos,
            priority=data.priority,
            is_active=data.is_active
        )
        
        account = higgsfield_accounts_repo.get_account(account_id)
        return account
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/accounts/{account_id}", response_model=HiggsfieldAccountDetailResponse)
async def get_account(
    account_id: int,
    admin=Depends(get_current_admin)
):
    """Get detailed information for a specific account."""
    account = higgsfield_accounts_repo.get_account(account_id)
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return account


@router.put("/accounts/{account_id}", response_model=HiggsfieldAccountDetailResponse)
async def update_account(
    account_id: int,
    data: HiggsfieldAccountUpdate,
    admin=Depends(get_current_admin)
):
    """Update an existing Higgsfield account."""
    # Check if account exists
    account = higgsfield_accounts_repo.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Prepare update data (exclude None values)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Update account
    success = higgsfield_accounts_repo.update_account(account_id, **update_data)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update account")
    
    # Return updated account
    updated_account = higgsfield_accounts_repo.get_account(account_id)
    return updated_account


@router.delete("/accounts/{account_id}", status_code=204)
async def delete_account(
    account_id: int,
    hard_delete: bool = False,
    admin=Depends(get_current_admin)
):
    """
    Delete (deactivate) a Higgsfield account.
    
    Args:
        account_id: ID of the account to delete
        hard_delete: If True, permanently delete from database (use with caution)
    """
    account = higgsfield_accounts_repo.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if hard_delete:
        success = higgsfield_accounts_repo.hard_delete_account(account_id)
    else:
        success = higgsfield_accounts_repo.delete_account(account_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete account")
    
    return None


@router.post("/accounts/{account_id}/test")
async def test_account_credentials(
    account_id: int,
    admin=Depends(get_current_admin)
):
    """
    Test if account credentials are valid by attempting to get a JWT token.
    """
    account = higgsfield_accounts_repo.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        # Create client instance and test authentication
        client = HiggsfieldClient.create_from_account(account_id)
        jwt_token = client.get_jwt_token()
        
        return {
            "success": True,
            "message": "Credentials are valid",
            "authenticated": bool(jwt_token)
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Authentication failed: {str(e)}",
            "authenticated": False
        }


@router.get("/accounts/{account_id}/stats")
async def get_account_stats(
    account_id: int,
    admin=Depends(get_current_admin)
):
    """Get current job statistics for a specific account."""
    account = higgsfield_accounts_repo.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    stats = higgsfield_accounts_repo.get_account_stats(account_id)
    
    return {
        "account_id": account_id,
        "account_name": account['name'],
        "stats": stats,
        "limits": {
            "max_parallel_images": account['max_parallel_images'],
            "max_parallel_videos": account['max_parallel_videos'],
            "max_slow_images": account['max_slow_images'],
            "max_slow_videos": account['max_slow_videos']
        }
    }
