# repositories/settings_repo.py
"""Repository for system settings."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from app.database.db import get_db_context, fetch_all, fetch_one

def get_all_settings(public_only: bool = False) -> List[Dict[str, Any]]:
    """Get all settings."""
    query = "SELECT * FROM system_settings"
    if public_only:
        query += " WHERE is_public = 1"
    
    return fetch_all(query)

def get_setting(key: str) -> Optional[Dict[str, Any]]:
    """Get a single setting by key."""
    return fetch_one("SELECT * FROM system_settings WHERE setting_key = ?", (key,))

def update_setting(key: str, value: str, admin_id: Optional[str] = None) -> bool:
    """Update a setting value."""
    with get_db_context() as conn:
        cursor = conn.execute(
            """
            UPDATE system_settings 
            SET setting_value = ?, updated_at = ?, updated_by = ?
            WHERE setting_key = ?
            """,
            (value, datetime.utcnow().isoformat(), admin_id, key)
        )
        return cursor.rowcount > 0

def get_public_settings_dict() -> Dict[str, str]:
    """Get all public settings as a simple key-value dictionary."""
    rows = fetch_all("SELECT setting_key, setting_value FROM system_settings WHERE is_public = 1")
    return {row["setting_key"]: row["setting_value"] for row in rows}
