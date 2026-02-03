# routers/admin_stats.py
"""Admin dashboard statistics endpoints."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import asyncio
import time

from app.deps import get_current_admin, AdminInDB
from app.database.db import fetch_one, fetch_all


router = APIRouter(prefix="/admin/stats", tags=["admin-stats"])

# ============================================
# Cache Mechanism (Simple In-Memory)
# ============================================

_stats_cache = {
    "data": None,
    "timestamp": 0
}
CACHE_TTL = 60  # Reduced to 1 minute for "real-time" feel with 24h rolling

def get_cached_stats():
    now = time.time()
    if _stats_cache["data"] and (now - _stats_cache["timestamp"] < CACHE_TTL):
        return _stats_cache["data"]
    return None

def set_cached_stats(data):
    _stats_cache["data"] = data
    _stats_cache["timestamp"] = time.time()

# ============================================
# Schemas
# ============================================

class DashboardStats(BaseModel):
    # Total Users
    total_users: int
    users_24h: int
    
    # Credits
    credits_used_24h: int
    credits_growth_pct: float # vs previous 24h
    avg_credits_per_user_24h: int # based on active users in 24h (approx)
    
    # Jobs
    jobs_24h: int
    jobs_growth_pct: float # vs previous 24h
    jobs_success_rate: float # in last 24h
    
    # Failed Jobs
    failed_jobs_24h: int
    failed_rate: float
    pending_jobs: int


class LineChartPoint(BaseModel):
    date: str
    value: int
    
class ServiceDistributionItem(BaseModel):
    service: str
    count: int
    percentage: float

class ActivityItem(BaseModel):
    id: str
    type: str  # 'job', 'user', 'credit', 'error'
    title: str
    subtitle: str
    timestamp: str 
    value: str # e.g., "-90", "+10"
    value_type: str # 'success', 'danger', 'neutral', 'warning'
    user_email: Optional[str]

class TopUserItem(BaseModel):
    email: str
    credits_used: int
    job_count: int

class TopServiceItem(BaseModel):
    name: str
    usage_count: int
    
class DashboardResponse(BaseModel):
    stats: DashboardStats
    credit_usage_history: List[LineChartPoint] # Last 7-30 days
    # service_distribution: List[ServiceDistributionItem] # Removed as per request
    recent_activity: List[ActivityItem]
    top_users: List[TopUserItem]
    top_services: List[TopServiceItem] # Top 1 for widget


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=DashboardResponse)
async def get_dashboard_stats(
    current_admin: AdminInDB = Depends(get_current_admin),
    refresh: bool = False,
    days: int = Query(7, ge=7, le=90)  # Support 7 to 90 days
):
    """Get enhanced dashboard overview statistics."""
    
    # Check cache first (cache key needs to include 'days')
    # For simplicity in this edit, we'll skip cache check if days != 7 
    # or ideally update cache key logic. Let's rely on refresh=True behavior 
    # or just bypass cache for non-default days for now to keep it simple.
    if not refresh and days == 7:
        cached = get_cached_stats()
        if cached:
            return cached

    now = datetime.utcnow()
    one_day_ago = now - timedelta(hours=24)
    two_days_ago = now - timedelta(hours=48)
    
    # --- 1. User Metrics ---
    # Total Users
    total_users = fetch_one("SELECT COUNT(*) as count FROM users")["count"]
    
    # Users last 24h
    users_24h = fetch_one(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= ?",
        (one_day_ago,)
    )["count"]
    
    
    # --- 2. Credit Metrics ---
    # Credits consumed last 24h
    credits_24h_res = fetch_one(
        "SELECT SUM(credits_cost) as total FROM jobs WHERE created_at >= ?",
        (one_day_ago,)
    )
    credits_used_24h = credits_24h_res["total"] or 0
    
    # Credits consumed previous 24h (for growth)
    credits_prev_24h_res = fetch_one(
        "SELECT SUM(credits_cost) as total FROM jobs WHERE created_at >= ? AND created_at < ?",
        (two_days_ago, one_day_ago)
    )
    credits_used_prev_24h = credits_prev_24h_res["total"] or 0
    
    credits_growth_pct = 0.0
    if credits_used_prev_24h > 0:
        credits_growth_pct = round(((credits_used_24h - credits_used_prev_24h) / credits_used_prev_24h) * 100, 1)
    elif credits_used_24h > 0:
        credits_growth_pct = 100.0
        
    # Avg credits per active user (approximate using job submitters)
    active_users_24h_res = fetch_one(
        "SELECT COUNT(DISTINCT user_id) as count FROM jobs WHERE created_at >= ?",
        (one_day_ago,)
    )
    active_users_count = active_users_24h_res["count"] if active_users_24h_res else 0
    avg_credits_per_user_24h = round(credits_used_24h / max(active_users_count, 1))


    # --- 3. Job Metrics ---
    # Jobs last 24h
    jobs_24h_res = fetch_one(
        "SELECT COUNT(*) as count FROM jobs WHERE created_at >= ?",
        (one_day_ago,)
    )
    jobs_24h = jobs_24h_res["count"] if jobs_24h_res else 0
    
    # Jobs previous 24h
    jobs_prev_24h_res = fetch_one(
        "SELECT COUNT(*) as count FROM jobs WHERE created_at >= ? AND created_at < ?",
        (two_days_ago, one_day_ago)
    )
    jobs_prev_24h = jobs_prev_24h_res["count"] if jobs_prev_24h_res else 0
    
    jobs_growth_pct = 0.0
    if jobs_prev_24h > 0:
        jobs_growth_pct = round(((jobs_24h - jobs_prev_24h) / jobs_prev_24h) * 100, 1)
    elif jobs_24h > 0:
        jobs_growth_pct = 100.0
    
    # Success Rate (Last 24h)
    success_rate_res = fetch_one(
        """
        SELECT 
            CASE 
                WHEN COUNT(*) = 0 THEN 100.0
                ELSE (COUNT(CASE WHEN status='completed' THEN 1 END) * 100.0 / COUNT(*))
            END as rate
        FROM jobs 
        WHERE created_at >= ?
        """,
        (one_day_ago,)
    )
    jobs_success_rate = round(success_rate_res["rate"], 1) if success_rate_res else 100.0
    
    # Failed Jobs (Last 24h)
    failed_result = fetch_one(
        "SELECT COUNT(*) as count FROM jobs WHERE status='failed' AND created_at >= ?",
        (one_day_ago,)
    )
    failed_jobs_24h = failed_result["count"] if failed_result else 0
    failed_rate = round((failed_jobs_24h / max(jobs_24h, 1)) * 100, 1)
    
    # Pending Jobs (Current)
    pending_result = fetch_one(
        "SELECT COUNT(*) as count FROM jobs WHERE status IN ('pending', 'processing')"
    )
    pending_jobs = pending_result["count"] if pending_result else 0

    # --- 4. Charts Data ---
    
    # Credit Usage History (Dynamic Days)
    start_date = now.date() - timedelta(days=days - 1)
    
    credit_history_data = fetch_all(
        """
        SELECT DATE(created_at) as date, SUM(credits_cost) as value
        FROM jobs
        WHERE DATE(created_at) >= DATE(?)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
        """,
        (start_date.isoformat(),)
    )
    
    # Fill in missing dates
    credit_usage_history = []
    history_map = {row["date"]: row["value"] or 0 for row in credit_history_data}
    
    for i in range(days):
        date_obj = start_date + timedelta(days=i)
        val = history_map.get(str(date_obj), 0)
        credit_usage_history.append(LineChartPoint(date=date_obj.strftime("%b %d"), value=val))


    # --- 5. Activity Feed ---
    
    recent_jobs_raw = fetch_all(
        """
        SELECT j.job_id, u.email, j.model, j.status, j.credits_cost, j.created_at
        FROM jobs j
        LEFT JOIN users u ON j.user_id = u.user_id
        ORDER BY j.created_at DESC
        LIMIT 15
        """
    )
    
    recent_users_raw = fetch_all(
        """
        SELECT user_id, email, credits, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
        """
    )
    
    activity_items = []
    
    for j in recent_jobs_raw:
        val_type = 'neutral'
        if j['status'] == 'completed': val_type = 'success'
        elif j['status'] == 'failed': val_type = 'danger'
        
        activity_items.append(ActivityItem(
            id=f"job_{j['job_id']}",
            type='job' if j['status'] != 'failed' else 'error',
            title=j['email'] or 'Unknown User',
            subtitle=f"{j['model']} job {j['status']}",
            timestamp=j['created_at'],
            value=f"-{j['credits_cost']}",
            value_type=val_type,
            user_email=j['email']
        ))
        
    for u in recent_users_raw:
        activity_items.append(ActivityItem(
            id=f"user_{u['user_id']}",
            type='user',
            title=u['email'],
            subtitle="New user registered",
            timestamp=u['created_at'],
            value="+10", 
            value_type='neutral', 
            user_email=u['email']
        ))
        
    # Sort by timestamp desc and slice
    activity_items.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activity = activity_items[:15]
    
    # --- 6. Top Lists ---
    top_users_data = fetch_all(
        """
        SELECT u.email, SUM(j.credits_cost) as credits_used, COUNT(j.job_id) as job_count
        FROM jobs j
        JOIN users u ON j.user_id = u.user_id
        WHERE j.created_at >= ?
        GROUP BY u.user_id
        ORDER BY credits_used DESC
        LIMIT 5
        """,
        (one_day_ago,)
    )
    
    top_users = [
        TopUserItem(email=u['email'], credits_used=u['credits_used'] or 0, job_count=u['job_count'])
        for u in top_users_data
    ]
    
    # Top Service by usage count (24h)
    top_service_res = fetch_one(
        """
        SELECT model, COUNT(*) as count
        FROM jobs
        WHERE created_at >= ?
        GROUP BY model
        ORDER BY count DESC
        LIMIT 1
        """,
        (one_day_ago,)
    )
    
    top_services = []
    if top_service_res:
         top_services.append(TopServiceItem(name=top_service_res["model"], usage_count=top_service_res["count"]))


    # --- Construct Response ---
    
    stats = DashboardStats(
        total_users=total_users,
        users_24h=users_24h,
        credits_used_24h=credits_used_24h,
        credits_growth_pct=credits_growth_pct,
        avg_credits_per_user_24h=avg_credits_per_user_24h,
        jobs_24h=jobs_24h,
        jobs_growth_pct=jobs_growth_pct,
        jobs_success_rate=jobs_success_rate,
        failed_jobs_24h=failed_jobs_24h,
        failed_rate=failed_rate,
        pending_jobs=pending_jobs
    )
    
    response_data = DashboardResponse(
        stats=stats,
        credit_usage_history=credit_usage_history,
        recent_activity=recent_activity,
        top_users=top_users,
        top_services=top_services
    )
    
    # Update cache (only for default view)
    if days == 7:
        set_cached_stats(response_data)
    
    return response_data


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
    
    # Params for main query need to be a new list to avoid modifying the one used for count
    query_params = params.copy()
    query_params.extend([limit, offset])
    
    jobs = fetch_all(query, tuple(query_params))
    pages = (total + limit - 1) // limit
    
    return {
        "jobs": [dict(j) for j in jobs],
        "total": total,
        "page": page,
        "pages": pages
    }
