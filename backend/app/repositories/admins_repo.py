# repositories/admins_repo.py
"""Repository for admin CRUD operations."""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from app.database.db import get_db_context, fetch_one, fetch_all, execute


class AdminCreate(BaseModel):
    username: str
    email: str
    password_hash: str
    role: str = "admin"


class AdminInDB(BaseModel):
    admin_id: str
    username: str
    email: str
    password_hash: str
    role: str
    is_active: bool
    created_at: str
    last_login_at: Optional[str] = None


def create(admin: AdminCreate) -> str:
    """Create a new admin and return admin_id."""
    admin_id = f"admin_{uuid.uuid4().hex[:12]}"
    
    with get_db_context() as conn:
        conn.execute(
            """
            INSERT INTO admins (admin_id, username, email, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
            """,
            (admin_id, admin.username, admin.email, admin.password_hash, admin.role)
        )
    
    return admin_id


def get_by_username(username: str) -> Optional[dict]:
    """Get admin by username."""
    return fetch_one(
        "SELECT * FROM admins WHERE username = ?",
        (username,)
    )


def get_by_id(admin_id: str) -> Optional[dict]:
    """Get admin by ID."""
    return fetch_one(
        "SELECT * FROM admins WHERE admin_id = ?",
        (admin_id,)
    )


def get_by_email(email: str) -> Optional[dict]:
    """Get admin by email."""
    return fetch_one(
        "SELECT * FROM admins WHERE email = ?",
        (email,)
    )


def update_last_login(admin_id: str) -> None:
    """Update admin's last login timestamp."""
    execute(
        "UPDATE admins SET last_login_at = ? WHERE admin_id = ?",
        (datetime.utcnow().isoformat(), admin_id)
    )


def set_active(admin_id: str, is_active: bool) -> None:
    """Enable or disable admin account."""
    execute(
        "UPDATE admins SET is_active = ? WHERE admin_id = ?",
        (is_active, admin_id)
    )


def list_all() -> List[dict]:
    """List all admins."""
    return fetch_all("SELECT admin_id, username, email, role, is_active, created_at, last_login_at FROM admins")
