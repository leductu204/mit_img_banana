# routers/settings.py
from fastapi import APIRouter
from app.repositories import settings_repo

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/public")
async def get_public_settings():
    """Get public system settings (e.g. notifications)."""
    return settings_repo.get_public_settings_dict()
