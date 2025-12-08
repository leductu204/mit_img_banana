# repositories/users_repo.py
"""Repository for user database operations."""

import uuid
from datetime import datetime
from typing import Optional
from app.database.db import fetch_one, fetch_all, execute, get_db_context
from app.schemas.users import UserCreate, UserUpdate, UserInDB


def get_by_google_id(google_id: str) -> Optional[dict]:
    """Find user by Google ID."""
    return fetch_one(
        "SELECT * FROM users WHERE google_id = ?",
        (google_id,)
    )


def get_by_id(user_id: str) -> Optional[dict]:
    """Find user by internal user ID."""
    return fetch_one(
        "SELECT * FROM users WHERE user_id = ?",
        (user_id,)
    )


def get_by_email(email: str) -> Optional[dict]:
    """Find user by email."""
    return fetch_one(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    )


def create(user_data: UserCreate) -> dict:
    """
    Create a new user.
    
    Args:
        user_data: User creation data from Google OAuth
        
    Returns:
        Created user record as dictionary
    """
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    with get_db_context() as conn:
        conn.execute(
            """
            INSERT INTO users (user_id, google_id, email, username, avatar_url, credits, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                user_data.google_id,
                user_data.email,
                user_data.username,
                user_data.avatar_url,
                user_data.credits,
                now,
                now
            )
        )
    
    return get_by_id(user_id)


def update(user_id: str, data: UserUpdate) -> Optional[dict]:
    """
    Update user fields.
    
    Args:
        user_id: User ID to update
        data: Fields to update (only non-None values)
        
    Returns:
        Updated user record or None if not found
    """
    # Build dynamic update query
    updates = []
    params = []
    
    if data.username is not None:
        updates.append("username = ?")
        params.append(data.username)
    
    if data.avatar_url is not None:
        updates.append("avatar_url = ?")
        params.append(data.avatar_url)
    
    if data.credits is not None:
        updates.append("credits = ?")
        params.append(data.credits)
    
    if data.is_banned is not None:
        updates.append("is_banned = ?")
        params.append(data.is_banned)
    
    if not updates:
        return get_by_id(user_id)
    
    updates.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(user_id)
    
    query = f"UPDATE users SET {', '.join(updates)} WHERE user_id = ?"
    execute(query, tuple(params))
    
    return get_by_id(user_id)


def update_credits(user_id: str, amount: int) -> bool:
    """
    Atomically update user credits.
    
    Args:
        user_id: User ID
        amount: Amount to add (positive) or subtract (negative)
        
    Returns:
        True if update succeeded
    """
    affected = execute(
        """
        UPDATE users 
        SET credits = credits + ?, updated_at = ?
        WHERE user_id = ? AND credits + ? >= 0
        """,
        (amount, datetime.utcnow().isoformat(), user_id, amount)
    )
    return affected > 0


def get_credits(user_id: str) -> Optional[int]:
    """Get user's current credit balance."""
    result = fetch_one(
        "SELECT credits FROM users WHERE user_id = ?",
        (user_id,)
    )
    return result["credits"] if result else None


def set_banned(user_id: str, is_banned: bool) -> bool:
    """Set user's banned status."""
    affected = execute(
        "UPDATE users SET is_banned = ?, updated_at = ? WHERE user_id = ?",
        (is_banned, datetime.utcnow().isoformat(), user_id)
    )
    return affected > 0


def list_users(page: int = 1, limit: int = 50) -> tuple[list[dict], int]:
    """
    List users with pagination.
    
    Returns:
        Tuple of (users list, total count)
    """
    offset = (page - 1) * limit
    
    users = fetch_all(
        """
        SELECT * FROM users 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
        """,
        (limit, offset)
    )
    
    total_result = fetch_one("SELECT COUNT(*) as count FROM users")
    total = total_result["count"] if total_result else 0
    
    return users, total
