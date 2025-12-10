import secrets
import bcrypt
from datetime import datetime
from typing import Optional, List, Tuple
from app.database.db import fetch_one, fetch_all, execute, execute_returning_id, get_db_context
from app.schemas.api_keys import APIKeyCreate

def generate_key(mode: str = "live") -> Tuple[str, str, str]:
    """
    Generate a new API key.
    Returns: (full_key, key_hash, key_prefix)
    """
    # 1. Generate random part (24 chars)
    random_part = secrets.token_urlsafe(18)[:24]
    
    # 2. Construct full key: sk_live_xxx
    full_key = f"sk_{mode}_{random_part}"
    
    # 3. Hash for storage
    key_hash = bcrypt.hashpw(full_key.encode(), bcrypt.gensalt()).decode()
    
    # 4. Prefix for display/lookup optimization
    key_prefix = full_key[:15] + "..."
    
    return full_key, key_hash, key_prefix

def create(data: APIKeyCreate, user_id: Optional[str] = None) -> dict:
    """Create a new API key record."""
    full_key, key_hash, key_prefix = generate_key(data.mode)
    
    # Generate unique ID for the record
    key_id = f"key_{secrets.token_hex(8)}"
    now = datetime.utcnow().isoformat()
    
    with get_db_context() as conn:
        conn.execute(
            """
            INSERT INTO api_keys (
                key_id, user_id, key_hash, key_prefix, balance, 
                is_active, created_at, expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                key_id, 
                user_id, 
                key_hash, 
                key_prefix, 
                data.initial_balance,
                True,
                now,
                data.expires_at.isoformat() if data.expires_at else None
            )
        )
    
    # Return record with full secret key (only time it's available)
    record = get_by_id(key_id)
    record["secret_key"] = full_key
    return record

def get_by_id(key_id: str) -> Optional[dict]:
    """Get key by ID."""
    return fetch_one("SELECT * FROM api_keys WHERE key_id = ?", (key_id,))

def get_by_user(user_id: str) -> List[dict]:
    """Get all keys for a user."""
    return fetch_all(
        "SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC", 
        (user_id,)
    )

def delete(key_id: str) -> bool:
    """Delete a key (hard delete)."""
    # This will cascade delete usage logs if ON DELETE CASCADE is set
    affected = execute(
        "DELETE FROM api_keys WHERE key_id = ?",
        (key_id,)
    )
    return affected > 0

def add_balance(key_id: str, amount: int) -> int:
    """Add credits to key balance."""
    with get_db_context() as conn:
        # Atomic update
        conn.execute(
            "UPDATE api_keys SET balance = balance + ? WHERE key_id = ?",
            (amount, key_id)
        )
        # Fetch new balance
        row = conn.execute(
            "SELECT balance FROM api_keys WHERE key_id = ?", 
            (key_id,)
        ).fetchone()
        return row["balance"] if row else 0

def deduct_balance(key_id: str, amount: int) -> int:
    """Deduct credits from key balance. Raises error if insufficient."""
    with get_db_context() as conn:
        # Check balance first
        row = conn.execute(
            "SELECT balance FROM api_keys WHERE key_id = ?", 
            (key_id,)
        ).fetchone()
        
        if not row:
            raise ValueError("Key not found")
            
        current = row["balance"]
        if current < amount:
            raise ValueError(f"Insufficient balance. Required: {amount}, Available: {current}")
            
        new_balance = current - amount
        
        # Update
        conn.execute(
            "UPDATE api_keys SET balance = ?, last_used_at = ? WHERE key_id = ?",
            (new_balance, datetime.utcnow().isoformat(), key_id)
        )
        return new_balance

def log_usage(
    key_id: str, 
    endpoint: str, 
    cost: int, 
    balance_before: int, 
    balance_after: int,
    status: str = "success",
    job_id: Optional[str] = None
):
    """Log API usage."""
    execute(
        """
        INSERT INTO api_key_usage (
            key_id, endpoint, job_id, cost, 
            balance_before, balance_after, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            key_id, endpoint, job_id, cost,
            balance_before, balance_after, status,
            datetime.utcnow().isoformat()
        )
    )

def verify_key_hash(api_key_str: str) -> Optional[dict]:
    """
    Verify an incoming API key string against database.
    This is computationally expensive (bcrypt), so implementation
    should optimize by filtering by prefix/active status first.
    """
    # 1. Parse mode from key to filter candidates if needed, 
    # but for now just check all active keys.
    # Optimization: If we had thousands of keys, we'd want to store 
    # the 'random_part' hash separately or use a faster lookup mechanism.
    # Given the scale, iterating active keys is acceptable for MVP, 
    # or better: we can store the "sk_live_" prefix in DB to filter.
    
    # Retrieve all keys to distinguish between invalid and revoked
    active_keys = fetch_all("SELECT * FROM api_keys")
    
    for record in active_keys:
        if bcrypt.checkpw(api_key_str.encode(), record["key_hash"].encode()):
            return record
            
    return None
