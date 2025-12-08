# routers/admin.py
"""Admin authentication and management endpoints."""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from app.services.admin_service import (
    login, 
    AdminLoginResponse, 
    AdminAuthError,
    create_initial_admin
)
from app.deps import get_current_admin, AdminInDB


router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================
# Schemas
# ============================================

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminSetupRequest(BaseModel):
    username: str
    email: str
    password: str


class AdminResponse(BaseModel):
    admin_id: str
    username: str
    email: str
    role: str
    is_active: bool
    created_at: str
    last_login_at: Optional[str] = None


# ============================================
# Auth Endpoints
# ============================================

@router.post("/auth/login", response_model=AdminLoginResponse)
async def admin_login(
    request: Request,
    credentials: AdminLoginRequest
):
    """
    Admin login with username and password.
    
    Returns JWT token for admin authentication.
    Token expires in 12 hours.
    """
    try:
        # Get IP and user agent for audit log
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        result = login(
            username=credentials.username,
            password=credentials.password,
            ip_address=ip_address,
            user_agent=user_agent
        )
        return result
        
    except AdminAuthError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )


@router.get("/me", response_model=AdminResponse)
async def get_current_admin_info(
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Get current authenticated admin info."""
    return AdminResponse(
        admin_id=current_admin.admin_id,
        username=current_admin.username,
        email=current_admin.email,
        role=current_admin.role,
        is_active=current_admin.is_active,
        created_at=current_admin.created_at,
        last_login_at=current_admin.last_login_at
    )


@router.post("/auth/setup", response_model=AdminResponse)
async def setup_initial_admin(
    request: AdminSetupRequest
):
    """
    Create the first admin account.
    
    This endpoint only works when no admin accounts exist.
    The first admin is automatically granted super_admin role.
    """
    try:
        admin_id = create_initial_admin(
            username=request.username,
            email=request.email,
            password=request.password
        )
        
        # Return created admin info
        from app.services.admin_service import get_admin_by_id
        admin = get_admin_by_id(admin_id)
        
        return AdminResponse(
            admin_id=admin["admin_id"],
            username=admin["username"],
            email=admin["email"],
            role=admin["role"],
            is_active=admin["is_active"],
            created_at=admin["created_at"],
            last_login_at=None
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
