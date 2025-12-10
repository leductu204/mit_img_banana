from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.services.api_keys_service import api_keys_service
from app.schemas.api_keys import APIKeyCreate, APIKeyResponse
from app.repositories import api_keys_repo
from app.deps import get_current_admin

router = APIRouter()

@router.get("/admin/keys", response_model=List[APIKeyResponse])
async def admin_list_keys(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """
    List all API keys (paginated).
    Admin only.
    """
    # For MVP, we'll just fetch all and filter in python if search is needed,
    # or implement a repo method later. 
    # Current repo doesn't support pagination/search properly for ALL keys.
    # We will implement a quick raw SQL query here for efficiency or update repo.
    
    # Let's use direct SQL for Admin listing to support basic search
    from app.database.db import fetch_all
    
    query = "SELECT * FROM api_keys"
    params = []
    
    if search:
        query += " WHERE key_prefix LIKE ? OR name LIKE ?"
        search_term = f"%{search}%"
        params.extend([search_term, search_term])
        
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    rows = fetch_all(query, tuple(params))
    return [APIKeyResponse(**dict(r)) for r in rows]

@router.post("/admin/keys", response_model=APIKeyResponse)
async def admin_create_key(
    key_data: APIKeyCreate,
    admin: dict = Depends(get_current_admin)
):
    """
    Create a standalone API key (no user account).
    Admin only.
    """
    # Create key with no user_id
    response = api_keys_service.create_key(user_id=None, data=key_data)
    return response

@router.delete("/admin/keys/{key_id}")
async def admin_revoke_key(
    key_id: str,
    admin: dict = Depends(get_current_admin)
):
    """
    Revoke an API key (Hard Delete).
    Admin only.
    """
    success = api_keys_repo.delete(key_id)
    if not success:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"status": "success", "message": "Key deleted"}
