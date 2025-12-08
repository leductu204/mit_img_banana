# routers/admin_stats.py
"""Admin dashboard statistics endpoints."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from app.deps import get_current_admin, AdminInDB
from app.database.db import fetch_one, fetch_all


router = APIRouter(prefix="/admin/stats", tags=["admin-stats"])


# ============================================
# Schemas
# ============================================

class DashboardStats(BaseModel):
    total_users: int
    new_users_today: int
    total_credits_issued: int
    jobs_today: int
    jobs_success_rate: float
    failed_jobs_today: int
    pending_jobs: int


class RecentUser(BaseModel):
    user_id: str
    email: str
    username: Optional[str]
    avatar_url: Optional[str]
    credits: int
    created_at: str


class RecentJob(BaseModel):
    job_id: str
    user_email: str
    model: str
    type: str
    status: str
    credits_cost: int
    created_at: str


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_users: List[RecentUser]
    recent_jobs: List[RecentJob]


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=DashboardResponse)
async def get_dashboard_stats(
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Get dashboard overview statistics."""
    today = datetime.utcnow().date().isoformat()
    
    # Total users
    total_users = fetch_one("SELECT COUNT(*) as count FROM users")["count"]
    
    # New users today
    new_users_today = fetch_one(
        "SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE(?)",
        (today,)
    )["count"]
    
    # Total credits (sum of all user credits)
    total_credits = fetch_one("SELECT SUM(credits) as total FROM users")
    total_credits_issued = total_credits["total"] or 0
    
    # Jobs today
    jobs_today_result = fetch_one(
        "SELECT COUNT(*) as count FROM jobs WHERE DATE(created_at) = DATE(?)",
        (today,)
    )
    jobs_today = jobs_today_result["count"] if jobs_today_result else 0
    
    # Success rate today
    success_rate_result = fetch_one(
        """
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 100.0
                ELSE (COUNT(CASE WHEN status='completed' THEN 1 END) * 100.0 / COUNT(*))
            END as rate
        FROM jobs 
        WHERE DATE(created_at) = DATE(?)
        """,
        (today,)
    )
    success_rate = round(success_rate_result["rate"], 1) if success_rate_result else 100.0
    
    # Failed jobs today
    failed_result = fetch_one(
        "SELECT COUNT(*) as count FROM jobs WHERE status='failed' AND DATE(created_at) = DATE(?)",
        (today,)
    )
    failed_jobs = failed_result["count"] if failed_result else 0
    
    # Pending jobs
    pending_result = fetch_one(
        "SELECT COUNT(*) as count FROM jobs WHERE status IN ('pending', 'processing')"
    )
    pending_jobs = pending_result["count"] if pending_result else 0
    
    # Recent users (last 10)
    recent_users_data = fetch_all(
        """
        SELECT user_id, email, username, avatar_url, credits, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 10
        """
    )
    recent_users = [
        RecentUser(
            user_id=u["user_id"],
            email=u["email"],
            username=u.get("username"),
            avatar_url=u.get("avatar_url"),
            credits=u["credits"],
            created_at=u["created_at"]
        )
        for u in recent_users_data
    ]
    
    # Recent jobs (last 10)
    recent_jobs_data = fetch_all(
        """
        SELECT j.job_id, u.email as user_email, j.model, j.type, j.status, 
               j.credits_cost, j.created_at
        FROM jobs j
        LEFT JOIN users u ON j.user_id = u.user_id
        ORDER BY j.created_at DESC
        LIMIT 10
        """
    )
    recent_jobs = [
        RecentJob(
            job_id=j["job_id"],
            user_email=j["user_email"] or "Unknown",
            model=j["model"],
            type=j["type"],
            status=j["status"],
            credits_cost=j["credits_cost"],
            created_at=j["created_at"]
        )
        for j in recent_jobs_data
    ]
    
    return DashboardResponse(
        stats=DashboardStats(
            total_users=total_users,
            new_users_today=new_users_today,
            total_credits_issued=total_credits_issued,
            jobs_today=jobs_today,
            jobs_success_rate=success_rate,
            failed_jobs_today=failed_jobs,
            pending_jobs=pending_jobs
        ),
        recent_users=recent_users,
        recent_jobs=recent_jobs
    )


@router.get("/jobs")
async def get_all_jobs(
    current_admin: AdminInDB = Depends(get_current_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    user_search: Optional[str] = Query(None)
):
    """Get all jobs with filtering."""
    offset = (page - 1) * limit
    
    conditions = []
    params = []
    
    if status:
        conditions.append("j.status = ?")
        params.append(status)
    
    if model:
        conditions.append("j.model = ?")
        params.append(model)
    
    if user_search:
        conditions.append("u.email LIKE ?")
        params.append(f"%{user_search}%")
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get total count
    count_query = f"""
        SELECT COUNT(*) as count 
        FROM jobs j
        LEFT JOIN users u ON j.user_id = u.user_id
        WHERE {where_clause}
    """
    total = fetch_one(count_query, tuple(params))["count"]
    
    # Get jobs
    query = f"""
        SELECT j.*, u.email as user_email
        FROM jobs j
        LEFT JOIN users u ON j.user_id = u.user_id
        WHERE {where_clause}
        ORDER BY j.created_at DESC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    
    jobs = fetch_all(query, tuple(params))
    pages = (total + limit - 1) // limit
    
    return {
        "jobs": [dict(j) for j in jobs],
        "total": total,
        "page": page,
        "pages": pages
    }
