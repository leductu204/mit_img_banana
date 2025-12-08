# deps.py
"""FastAPI dependency injection for authentication and database access."""

from typing import Optional
from fastapi import Header, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.utils.jwt_utils import decode_access_token, JWTError
from app.repositories import users_repo
from app.schemas.users import UserInDB


# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserInDB:
    """
    Extract and validate JWT token, return current user.
    
    This is the main authentication dependency for protected routes.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        Current authenticated user
        
    Raises:
        HTTPException 401: If token is missing, invalid, or expired
        HTTPException 403: If user is banned
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    
    try:
        payload = decode_access_token(token)
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Load user from database
    user_data = users_repo.get_by_id(user_id)
    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check if user is banned
    if user_data.get("is_banned", False):
        raise HTTPException(
            status_code=403,
            detail="User account is banned"
        )
    
    return UserInDB(**user_data)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UserInDB]:
    """
    Optional authentication - returns None if no token provided.
    
    Useful for endpoints that work with or without authentication.
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_credits(min_credits: int = 1):
    """
    Dependency factory that checks if user has sufficient credits.
    
    Usage:
        @router.post("/generate")
        async def generate(
            current_user: UserInDB = Depends(get_current_user),
            _: None = Depends(require_credits(5))
        ):
            ...
    """
    async def check_credits(
        current_user: UserInDB = Depends(get_current_user)
    ) -> UserInDB:
        if current_user.credits < min_credits:
            raise HTTPException(
                status_code=402,
                detail=f"Insufficient credits. Required: {min_credits}, Available: {current_user.credits}"
            )
        return current_user
    
    return check_credits


# ============================================
# Admin Authentication Dependencies
# ============================================

from app.services.admin_service import decode_admin_token, get_admin_by_id

# Admin schema
from pydantic import BaseModel

class AdminInDB(BaseModel):
    admin_id: str
    username: str
    email: str
    role: str
    is_active: bool
    created_at: str
    last_login_at: Optional[str] = None


async def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AdminInDB:
    """
    Extract and validate admin JWT token, return current admin.
    
    Uses a separate JWT secret and validates the token type is 'admin'.
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Admin authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    payload = decode_admin_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired admin token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    admin_id = payload.get("admin_id")
    if not admin_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Load admin from database
    admin_data = get_admin_by_id(admin_id)
    if not admin_data:
        raise HTTPException(
            status_code=401,
            detail="Admin not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check if admin is active
    if not admin_data.get("is_active", True):
        raise HTTPException(
            status_code=403,
            detail="Admin account is disabled"
        )
    
    return AdminInDB(**admin_data)
