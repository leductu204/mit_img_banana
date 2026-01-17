# repositories/users_repo.py
"""Repository for user database operations."""

import uuid
from datetime import datetime
from typing import Optional
from app.database.db import fetch_one, fetch_all, execute, get_db_context
from app.schemas.users import UserCreate, UserUpdate, UserInDB


def get_by_google_id(google_id: str) -> Optional[dict]:
    """Find user by Google ID."""

    user = fetch_one(
        "SELECT * FROM users WHERE google_id = ?",
        (google_id,)
    )
    return check_and_reset_plan(user)


def get_by_id(user_id: str) -> Optional[dict]:
    """Find user by internal user ID."""

    user = fetch_one(
        "SELECT * FROM users WHERE user_id = ?",
        (user_id,)
    )
    return check_and_reset_plan(user)


def get_by_email(email: str) -> Optional[dict]:
    """Find user by email."""

    user = fetch_one(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    )
    return check_and_reset_plan(user)


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


def check_and_reset_plan(user: Optional[dict]) -> Optional[dict]:
    """
    Check if user's plan has expired and reset to Free/0 credits if so.
    PERFORMS A WRITE OPERATION if expired.
    
    Args:
        user: User record (as dict/Row) or None
        
    Returns:
        Updated user record or original if no change
    """
    if not user:
        return None
        
    # Check for plan expiration
    expires_at_str = user.get("plan_expires_at")
    if not expires_at_str:
        return user
        
    try:
        # Parse expiration time
        # Handle ISO format and potential variants
        if isinstance(expires_at_str, str):
            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
        elif isinstance(expires_at_str, datetime):
            expires_at = expires_at_str
        else:
            # Unknown format, ignore
            return user
            
        # Check against UTC now
        now = datetime.utcnow()
        if expires_at < now:
            print(f"PLAN EXPIRED for user {user['user_id']}: {expires_at} < {now}. Resetting...")
            
            # Reset Plan Implementation (Lazy)
            user_id = user["user_id"]
            
            with get_db_context() as conn:
                # 1. Update User: Free Plan (1), 0 Credits, Remove Expiry
                conn.execute(
                    """
                    UPDATE users 
                    SET plan_id = 1, 
                        credits = 0, 
                        plan_expires_at = NULL, 
                        updated_at = ?
                    WHERE user_id = ?
                    """,
                    (now.isoformat(), user_id)
                )
                
                # 2. Log Transaction
                conn.execute(
                    """
                    INSERT INTO credit_transactions (user_id, type, amount, balance_before, balance_after, reason, created_at)
                    VALUES (?, 'admin_reset', 0, ?, 0, 'Plan Expired: Reset to Free', ?)
                    """,
                    (user_id, user["credits"], now.isoformat())
                )
            
            # 3. Return updated user object
            # Ideally fetch again or patch the dict
            # Since fetch_one returns sqlite3.Row which is read-only-ish, let's fetch fresh
            return fetch_one("SELECT * FROM users WHERE user_id = ?", (user_id,))
            
    except Exception as e:
        print(f"Error checking plan expiration for user {user.get('user_id')}: {e}")
        # Return original on error to generic fail-open or fail-safe? 
        # Fail-safe: return original (allow access, maybe log error)
        pass
        
    return user
