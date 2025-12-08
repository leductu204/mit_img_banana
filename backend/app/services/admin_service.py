# services/admin_service.py
"""Admin authentication and management service."""

import bcrypt
import jwt
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple
from pydantic import BaseModel

from app.config import settings
from app.repositories import admins_repo
from app.repositories.admin_audit_repo import log_action, AuditLogCreate


# Separate secret for admin JWT
ADMIN_JWT_SECRET = settings.JWT_SECRET + "_admin"
ADMIN_JWT_EXPIRY_HOURS = 12


class AdminLoginResponse(BaseModel):
    token: str
    admin_id: str
    username: str
    email: str
    role: str


class AdminAuthError(Exception):
    """Raised when admin authentication fails."""
    pass


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'),
            password_hash.encode('utf-8')
        )
    except Exception:
        return False


def create_admin_token(admin_id: str, username: str, role: str) -> str:
    """Create a JWT token for admin authentication."""
    payload = {
        "admin_id": admin_id,
        "username": username,
        "role": role,
        "type": "admin",  # Distinguish from user tokens
        "exp": datetime.utcnow() + timedelta(hours=ADMIN_JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, ADMIN_JWT_SECRET, algorithm="HS256")


def decode_admin_token(token: str) -> Optional[dict]:
    """Decode and verify an admin JWT token."""
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
        
        # Verify this is an admin token
        if payload.get("type") != "admin":
            return None
        
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def login(username: str, password: str, ip_address: str = None, user_agent: str = None) -> AdminLoginResponse:
    """
    Authenticate admin and return token.
    
    Raises:
        AdminAuthError: If authentication fails
    """
    # Get admin by username
    admin = admins_repo.get_by_username(username)
    
    if not admin:
        raise AdminAuthError("Invalid username or password")
    
    # Check if account is active
    if not admin.get("is_active", True):
        raise AdminAuthError("Account is disabled")
    
    # Verify password
    if not verify_password(password, admin["password_hash"]):
        raise AdminAuthError("Invalid username or password")
    
    # Update last login
    admins_repo.update_last_login(admin["admin_id"])
    
    # Log login action
    log_action(AuditLogCreate(
        admin_id=admin["admin_id"],
        action="login",
        target_type="admin",
        target_id=admin["admin_id"],
        ip_address=ip_address,
        user_agent=user_agent
    ))
    
    # Generate token
    token = create_admin_token(
        admin["admin_id"],
        admin["username"],
        admin["role"]
    )
    
    return AdminLoginResponse(
        token=token,
        admin_id=admin["admin_id"],
        username=admin["username"],
        email=admin["email"],
        role=admin["role"]
    )


def create_initial_admin(username: str, email: str, password: str) -> str:
    """
    Create the initial admin account.
    Returns admin_id.
    """
    # Check if any admin exists
    existing_admins = admins_repo.list_all()
    if existing_admins:
        raise ValueError("Admin accounts already exist. Use admin panel to create more.")
    
    # Hash password and create admin
    password_hash = hash_password(password)
    
    admin_data = admins_repo.AdminCreate(
        username=username,
        email=email,
        password_hash=password_hash,
        role="super_admin"  # First admin is super_admin
    )
    
    admin_id = admins_repo.create(admin_data)
    print(f"Created initial admin: {username} ({admin_id})")
    
    return admin_id


def get_admin_by_id(admin_id: str) -> Optional[dict]:
    """Get admin by ID (without password hash)."""
    admin = admins_repo.get_by_id(admin_id)
    if admin:
        # Remove sensitive data
        admin_dict = dict(admin)
        admin_dict.pop("password_hash", None)
        return admin_dict
    return None
