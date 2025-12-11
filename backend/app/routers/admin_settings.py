# routers/admin_settings.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.deps import get_current_admin, AdminInDB
from app.repositories import settings_repo

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])

class SettingResponse(BaseModel):
    setting_key: str
    setting_value: str
    description: Optional[str]
    is_public: bool
    updated_at: Optional[str]

class UpdateSettingRequest(BaseModel):
    value: str

@router.get("", response_model=List[SettingResponse])
async def get_all_settings(
    admin: AdminInDB = Depends(get_current_admin)
):
    """List all system settings."""
    settings = settings_repo.get_all_settings()
    return [SettingResponse(**dict(s)) for s in settings]

@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    body: UpdateSettingRequest,
    admin: AdminInDB = Depends(get_current_admin)
):
    """Update a specific setting."""
    setting = settings_repo.get_setting(key)
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    success = settings_repo.update_setting(key, body.value, admin.admin_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update setting")
        
    updated = settings_repo.get_setting(key)
    return SettingResponse(**dict(updated))


# Environment Variable Management
class EnvSettingsResponse(BaseModel):
    HIGGSFIELD_SSES: str
    HIGGSFIELD_COOKIE: str
    GOOGLE_VEO_COOKIE: str

class UpdateEnvRequest(BaseModel):
    HIGGSFIELD_SSES: Optional[str] = None
    HIGGSFIELD_COOKIE: Optional[str] = None
    GOOGLE_VEO_COOKIE: Optional[str] = None

@router.get("/env", response_model=EnvSettingsResponse)
async def get_env_settings(
    admin: AdminInDB = Depends(get_current_admin)
):
    """Get critical environment variables."""
    from dotenv import get_key
    env_path = ".env"
    
    return {
        "HIGGSFIELD_SSES": get_key(env_path, "HIGGSFIELD_SSES") or "",
        "HIGGSFIELD_COOKIE": get_key(env_path, "HIGGSFIELD_COOKIE") or "",
        "GOOGLE_VEO_COOKIE": get_key(env_path, "GOOGLE_VEO_COOKIE") or ""
    }

@router.put("/env")
async def update_env_settings(
    body: UpdateEnvRequest,
    admin: AdminInDB = Depends(get_current_admin)
):
    """Update critical environment variables."""
    from dotenv import set_key
    env_path = ".env"
    
    updates = {
        "HIGGSFIELD_SSES": body.HIGGSFIELD_SSES,
        "HIGGSFIELD_COOKIE": body.HIGGSFIELD_COOKIE,
        "GOOGLE_VEO_COOKIE": body.GOOGLE_VEO_COOKIE
    }
    
    updated_keys = []
    
    try:
        for key, value in updates.items():
            if value is not None:
                # Update both .env file and os.environ immediately
                set_key(env_path, key, value)
                updated_keys.append(key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update .env: {str(e)}")

    return {"message": "Settings updated successfully", "updated": updated_keys}
