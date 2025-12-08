# routers/admin_logs.py
"""Admin audit logs viewing endpoints."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Optional

from app.deps import get_current_admin, AdminInDB
from app.repositories.admin_audit_repo import get_logs


router = APIRouter(prefix="/admin/audit-logs", tags=["admin-logs"])


# ============================================
# Schemas
# ============================================

class AuditLog(BaseModel):
    id: int
    admin_id: str
    admin_username: Optional[str]
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: str


class AuditLogsResponse(BaseModel):
    logs: List[AuditLog]
    total: int
    page: int
    pages: int


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=AuditLogsResponse)
async def get_audit_logs(
    current_admin: AdminInDB = Depends(get_current_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """
    Get admin audit logs with filtering.
    
    Filters:
    - admin_id: Filter by specific admin
    - action: Filter by action type (login, add_credits, ban_user, etc.)
    - start_date/end_date: Filter by date range (ISO format)
    """
    logs_data, total = get_logs(
        page=page,
        limit=limit,
        admin_id=admin_id,
        action=action,
        start_date=start_date,
        end_date=end_date
    )
    
    logs = [
        AuditLog(
            id=log["id"],
            admin_id=log["admin_id"],
            admin_username=log.get("admin_username"),
            action=log["action"],
            target_type=log.get("target_type"),
            target_id=log.get("target_id"),
            details=log.get("details"),
            ip_address=log.get("ip_address"),
            user_agent=log.get("user_agent"),
            created_at=log["created_at"]
        )
        for log in logs_data
    ]
    
    pages = (total + limit - 1) // limit
    
    return AuditLogsResponse(
        logs=logs,
        total=total,
        page=page,
        pages=pages
    )


@router.get("/actions")
async def get_available_actions(
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Get list of available action types for filtering."""
    return {
        "actions": [
            "login",
            "add_credits",
            "set_credits",
            "ban_user",
            "unban_user",
            "update_cost",
            "reset_all_credits"
        ]
    }
