# repositories/admin_audit_repo.py
"""Repository for admin audit log operations."""

import json
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.database.db import get_db_context, fetch_all, execute_returning_id


class AuditLogCreate(BaseModel):
    admin_id: str
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


def log_action(log: AuditLogCreate) -> int:
    """Log an admin action and return log ID."""
    details_json = json.dumps(log.details) if log.details else None
    
    return execute_returning_id(
        """
        INSERT INTO admin_audit_logs 
        (admin_id, action, target_type, target_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            log.admin_id,
            log.action,
            log.target_type,
            log.target_id,
            details_json,
            log.ip_address,
            log.user_agent
        )
    )


def get_logs(
    page: int = 1,
    limit: int = 50,
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> tuple[List[dict], int]:
    """
    Get audit logs with filtering and pagination.
    Returns (logs, total_count).
    """
    conditions = []
    params = []
    
    if admin_id:
        conditions.append("admin_id = ?")
        params.append(admin_id)
    
    if action:
        conditions.append("action = ?")
        params.append(action)
    
    if start_date:
        conditions.append("created_at >= ?")
        params.append(start_date)
    
    if end_date:
        conditions.append("created_at <= ?")
        params.append(end_date)
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get total count
    count_query = f"SELECT COUNT(*) as count FROM admin_audit_logs WHERE {where_clause}"
    count_result = fetch_all(count_query, tuple(params))
    total = count_result[0]["count"] if count_result else 0
    
    # Get paginated results
    offset = (page - 1) * limit
    query = f"""
        SELECT 
            aal.*, 
            a.username as admin_username
        FROM admin_audit_logs aal
        LEFT JOIN admins a ON aal.admin_id = a.admin_id
        WHERE {where_clause}
        ORDER BY aal.created_at DESC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    
    logs = fetch_all(query, tuple(params))
    
    # Parse JSON details
    for log in logs:
        if log.get("details"):
            try:
                log["details"] = json.loads(log["details"])
            except json.JSONDecodeError:
                pass
    
    return logs, total
