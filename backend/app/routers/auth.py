# routers/auth.py
"""Authentication endpoints for Google OAuth and user info."""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from typing import Optional

from app.deps import get_current_user
from app.services.auth_service import google_oauth, AuthError
from app.schemas.auth import (
    UserResponse,
    GoogleAuthURLResponse,
    TokenResponse
)
from app.schemas.users import UserInDB
from app.utils.jwt_utils import get_token_expiry_seconds


router = APIRouter(tags=["auth"])


@router.get("/google/login", response_model=GoogleAuthURLResponse)
async def google_login(
    redirect: bool = Query(True, description="If true, redirect to Google. If false, return URL."),
    state: Optional[str] = Query(None, description="Optional state for CSRF protection")
):
    """
    Initiate Google OAuth login flow.
    
    - If redirect=true (default): Redirects user to Google login page
    - If redirect=false: Returns the auth URL for frontend to handle
    """
    auth_url = google_oauth.get_auth_url(state=state)
    
    if redirect:
        return RedirectResponse(url=auth_url)
    
    return GoogleAuthURLResponse(auth_url=auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: Optional[str] = Query(None, description="State parameter for CSRF verification"),
    error: Optional[str] = Query(None, description="Error from Google OAuth")
):
    """
    Handle Google OAuth callback.
    
    This endpoint receives the authorization code from Google,
    exchanges it for tokens, creates/updates the user, and
    redirects to the frontend with a JWT token.
    """
    if error:
        # Google returned an error (user cancelled, etc.)
        error_url = f"{google_oauth.frontend_url}/auth/error?error={error}"
        return RedirectResponse(url=error_url)
    
    try:
        # Complete authentication flow
        jwt_token, user = await google_oauth.authenticate(code)
        
        # Redirect to frontend with token
        callback_url = google_oauth.get_frontend_callback_url(jwt_token)
        return RedirectResponse(url=callback_url)
        
    except AuthError as e:
        error_url = f"{google_oauth.frontend_url}/auth/error?error={str(e)}"
        return RedirectResponse(url=error_url)
    except Exception as e:
        error_url = f"{google_oauth.frontend_url}/auth/error?error=Authentication failed"
        return RedirectResponse(url=error_url)


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback_api(
    code: str = Query(..., description="Authorization code from Google")
):
    """
    API-based Google OAuth callback (for mobile apps or SPAs).
    
    Instead of redirecting, returns the JWT token directly in the response.
    """
    try:
        jwt_token, user = await google_oauth.authenticate(code)
        
        return TokenResponse(
            access_token=jwt_token,
            token_type="bearer",
            expires_in=get_token_expiry_seconds()
        )
        
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Authentication failed")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get current authenticated user's profile.
    
    Requires valid JWT token in Authorization header.
    """
    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        credits=current_user.credits,
        is_banned=current_user.is_banned,
        created_at=current_user.created_at
    )


@router.post("/logout")
async def logout(
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Logout endpoint (placeholder).
    
    Since we use stateless JWTs, actual logout is handled client-side
    by deleting the token. This endpoint exists for API completeness
    and could be extended to implement token blacklisting.
    """
    return {
        "status": "success",
        "message": "Logged out successfully. Please delete your token."
    }


@router.get("/verify")
async def verify_token(
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Verify that the current token is valid.
    
    Returns basic user info if token is valid, otherwise 401.
    """
    return {
        "valid": True,
        "user_id": current_user.user_id,
        "email": current_user.email
    }
