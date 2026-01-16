from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from app.schemas.api_keys import APIKeyCreate, APIKeyResponse
from app.schemas.users import UserInDB
from app.services.api_keys_service import api_keys_service
from app.deps import get_current_user

router = APIRouter()

@router.post("", response_model=APIKeyResponse)
async def create_api_key(
    data: APIKeyCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Create a new API key.
    The response includes the 'secret_key' field ONLY this one time.
    """
    return api_keys_service.create_key(current_user.user_id, data)

@router.get("", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: UserInDB = Depends(get_current_user)
):
    """List all API keys belonging to the current user."""
    return api_keys_service.get_user_keys(current_user.user_id)

@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Revoke (delete) an API key."""
    success = api_keys_service.revoke_key(current_user.user_id, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"message": "Key revoked successfully"}

    return {"message": "Key revoked successfully"}
