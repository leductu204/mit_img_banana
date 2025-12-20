# routers/admin_users.py
"""Admin endpoints for user management."""

import json
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.deps import get_current_admin, AdminInDB
from app.repositories import users_repo, jobs_repo
from app.repositories.admin_audit_repo import log_action, AuditLogCreate
from app.services.credits_service import credits_service
from app.database.db import get_db_context, fetch_one, fetch_all, execute


router = APIRouter(prefix="/admin/users", tags=["admin-users"])


# ============================================
# Schemas
# ============================================

class UserListItem(BaseModel):
    user_id: str
    google_id: str
    email: str
    username: Optional[str]
    avatar_url: Optional[str]
    credits: int
    is_banned: bool
    plan_id: Optional[int] = 1  # Default to Free plan
    created_at: str
    last_login_at: Optional[str]


class UserListResponse(BaseModel):
    users: List[UserListItem]
    total: int
    page: int
    pages: int


class UserDetailResponse(BaseModel):
    user: UserListItem
    jobs: List[dict]
    transactions: List[dict]


class AddCreditsRequest(BaseModel):
    amount: int
    reason: str


class SetCreditsRequest(BaseModel):
    amount: int
    reason: str


class BanUserRequest(BaseModel):
    reason: str


class DeductCreditsRequest(BaseModel):
    amount: int
    reason: str


class BulkCreditsRequest(BaseModel):
    operation: str  # "set" or "add"
    amount: int
    reason: str


class CreditsActionResponse(BaseModel):
    user_id: str
    new_balance: int
    message: str


class BulkCreditsResponse(BaseModel):
    affected_users: int
    operation: str
    amount: int
    message: str


class UpdateTierRequest(BaseModel):
    plan_id: int
    reason: str = "Admin changed subscription tier"


# ============================================
# User Management Endpoints
# ============================================

@router.get("", response_model=UserListResponse)
async def list_users(
    current_admin: AdminInDB = Depends(get_current_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),  # active, banned, all
    plan_id: Optional[int] = Query(None),
    sort_by: Optional[str] = Query("created_at"), # created_at, credits, last_login_at
    order: Optional[str] = Query("desc") # asc, desc
):
    """
    List all users with search, filtering, and sorting.
    """
    offset = (page - 1) * limit
    
    # Build query
    conditions = []
    params = []
    
    if search:
        conditions.append("(email LIKE ? OR username LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])
    
    if status == "active":
        conditions.append("(is_banned = FALSE OR is_banned IS NULL)")
    elif status == "banned":
        conditions.append("is_banned = TRUE")
        
    if plan_id is not None:
        conditions.append("plan_id = ?")
        params.append(plan_id)
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Validate sort_by
    allowed_sorts = ["created_at", "credits", "last_login_at", "email"]
    if sort_by not in allowed_sorts:
        sort_by = "created_at"
        
    # Validate order
    if order.lower() not in ["asc", "desc"]:
        order = "desc"
        
    order_clause = f"{sort_by} {order.upper()}"
    
    # Get total count
    count_result = fetch_one(
        f"SELECT COUNT(*) as count FROM users WHERE {where_clause}",
        tuple(params)
    )
    total = count_result["count"] if count_result else 0
    
    # Get paginated users
    query = f"""
        SELECT user_id, google_id, email, username, avatar_url, credits, 
               COALESCE(is_banned, FALSE) as is_banned, plan_id, created_at, last_login_at
        FROM users 
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    
    users_data = fetch_all(query, tuple(params))
    
    users = [
        UserListItem(
            user_id=u["user_id"],
            google_id=u["google_id"],
            email=u["email"],
            username=u.get("username"),
            avatar_url=u.get("avatar_url"),
            credits=u["credits"],
            is_banned=u.get("is_banned", False),
            plan_id=u.get("plan_id", 1),
            created_at=u["created_at"],
            last_login_at=u.get("last_login_at")
        )
        for u in users_data
    ]
    
    pages = (total + limit - 1) // limit
    
    return UserListResponse(
        users=users,
        total=total,
        page=page,
        pages=pages
    )


# ============================================
# Subscription Tier Management
# Must be BEFORE /{user_id} to avoid route collision
# ============================================

@router.get("/subscription-plans")
async def get_subscription_plans(
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Get all subscription plans for tier management dropdown."""
    plans = fetch_all("""
        SELECT plan_id, name, price, total_concurrent_limit, 
               image_concurrent_limit, video_concurrent_limit, description
        FROM subscription_plans
        ORDER BY plan_id
    """)
    return {"plans": [dict(p) for p in plans]}


@router.post("/{user_id}/tier")
async def update_user_tier(
    user_id: str,
    request: Request,
    body: UpdateTierRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Update a user's subscription tier."""
    # Verify user exists
    user_data = users_repo.get_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify plan exists
    plan = fetch_one("SELECT * FROM subscription_plans WHERE plan_id = ?", (body.plan_id,))
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    old_plan_id = user_data.get("plan_id", 1)
    
    # Update user's plan
    execute(
        "UPDATE users SET plan_id = ? WHERE user_id = ?",
        (body.plan_id, user_id)
    )
    
    # Log admin action
    log_action(AuditLogCreate(
        admin_id=current_admin.admin_id,
        action="update_user_tier",
        target_type="user",
        target_id=user_id,
        details={
            "old_plan_id": old_plan_id,
            "new_plan_id": body.plan_id,
            "new_plan_name": plan["name"],
            "reason": body.reason
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))
    
    return {
        "message": f"User tier updated to {plan['name']}",
        "user_id": user_id,
        "old_plan_id": old_plan_id,
        "new_plan_id": body.plan_id,
        "new_plan_name": plan["name"]
    }


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: str,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Get user details including recent jobs and transactions."""
    user_data = users_repo.get_by_id(user_id)
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = UserListItem(
        user_id=user_data["user_id"],
        google_id=user_data["google_id"],
        email=user_data["email"],
        username=user_data.get("username"),
        avatar_url=user_data.get("avatar_url"),
        credits=user_data["credits"],
        is_banned=user_data.get("is_banned", False),
        plan_id=user_data.get("plan_id", 1),
        created_at=user_data["created_at"],
        last_login_at=user_data.get("last_login_at")
    )
    
    # Get recent jobs
    jobs = fetch_all(
        """
        SELECT job_id, type, model, prompt, status, credits_cost, 
               credits_refunded, output_url, created_at
        FROM jobs 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (user_id,)
    )
    
    # Get recent transactions
    transactions = fetch_all(
        """
        SELECT id, type, amount, balance_before, balance_after, reason, created_at
        FROM credit_transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (user_id,)
    )
    
    return UserDetailResponse(
        user=user,
        jobs=[dict(j) for j in jobs],
        transactions=[dict(t) for t in transactions]
    )


@router.post("/{user_id}/credits/add", response_model=CreditsActionResponse)
async def add_credits_to_user(
    user_id: str,
    request: Request,
    body: AddCreditsRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Add credits to a user's account."""
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    user_data = users_repo.get_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_balance = user_data["credits"]
    new_balance = old_balance + body.amount
    
    # Update user credits and log transaction
    with get_db_context() as conn:
        conn.execute(
            "UPDATE users SET credits = ? WHERE user_id = ?",
            (new_balance, user_id)
        )
        
        conn.execute(
            """
            INSERT INTO credit_transactions 
            (user_id, type, amount, balance_before, balance_after, reason, created_at)
            VALUES (?, 'admin_add', ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                body.amount,
                old_balance,
                new_balance,
                f"Admin: {body.reason}",
                datetime.utcnow().isoformat()
            )
        )
    
    # Log admin action
    log_action(AuditLogCreate(
        admin_id=current_admin.admin_id,
        action="add_credits",
        target_type="user",
        target_id=user_id,
        details={
            "amount": body.amount,
            "reason": body.reason,
            "old_balance": old_balance,
            "new_balance": new_balance
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))
    
    return CreditsActionResponse(
        user_id=user_id,
        new_balance=new_balance,
        message=f"Added {body.amount} credits"
    )


@router.post("/{user_id}/credits/set", response_model=CreditsActionResponse)
async def set_user_credits(
    user_id: str,
    request: Request,
    body: SetCreditsRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Set a user's credits to a specific amount."""
    if body.amount < 0:
        raise HTTPException(status_code=400, detail="Amount cannot be negative")
    
    user_data = users_repo.get_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_balance = user_data["credits"]
    new_balance = body.amount
    delta = new_balance - old_balance
    
    # Update user credits and log transaction
    with get_db_context() as conn:
        conn.execute(
            "UPDATE users SET credits = ? WHERE user_id = ?",
            (new_balance, user_id)
        )
        
        tx_type = "admin_add" if delta >= 0 else "deduct"
        conn.execute(
            """
            INSERT INTO credit_transactions 
            (user_id, type, amount, balance_before, balance_after, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                tx_type,
                abs(delta),
                old_balance,
                new_balance,
                f"Admin set: {body.reason}",
                datetime.utcnow().isoformat()
            )
        )
    
    # Log admin action
    log_action(AuditLogCreate(
        admin_id=current_admin.admin_id,
        action="set_credits",
        target_type="user",
        target_id=user_id,
        details={
            "new_amount": body.amount,
            "reason": body.reason,
            "old_balance": old_balance,
            "delta": delta
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))
    
    return CreditsActionResponse(
        user_id=user_id,
        new_balance=new_balance,
        message=f"Set credits to {body.amount}"
    )


@router.post("/{user_id}/ban")
async def ban_user(
    user_id: str,
    request: Request,
    body: BanUserRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Ban a user account."""
    user_data = users_repo.get_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    execute(
        "UPDATE users SET is_banned = TRUE WHERE user_id = ?",
        (user_id,)
    )
    
    # Log admin action
    log_action(AuditLogCreate(
        admin_id=current_admin.admin_id,
        action="ban_user",
        target_type="user",
        target_id=user_id,
        details={"reason": body.reason},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))
    
    return {"message": f"User {user_id} has been banned", "reason": body.reason}


@router.post("/{user_id}/unban")
async def unban_user(
    user_id: str,
    request: Request,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Unban a user account."""
    user_data = users_repo.get_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    execute(
        "UPDATE users SET is_banned = FALSE WHERE user_id = ?",
        (user_id,)
    )
    
    # Log admin action
    log_action(AuditLogCreate(
        admin_id=current_admin.admin_id,
        action="unban_user",
        target_type="user",
        target_id=user_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))
    
    return {"message": f"User {user_id} has been unbanned"}


@router.post("/{user_id}/credits/deduct", response_model=CreditsActionResponse)
async def deduct_credits_from_user(
    user_id: str,
    request: Request,
    body: DeductCreditsRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Deduct credits from a user's account."""
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    user_data = users_repo.get_by_id(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_balance = user_data["credits"]
    new_balance = max(0, old_balance - body.amount)  # Don't allow negative credits
    actual_deducted = old_balance - new_balance
    
    # Update user credits and log transaction
    with get_db_context() as conn:
        conn.execute(
            "UPDATE users SET credits = ? WHERE user_id = ?",
            (new_balance, user_id)
        )
        
        conn.execute(
            """
            INSERT INTO credit_transactions 
            (user_id, type, amount, balance_before, balance_after, reason, created_at)
            VALUES (?, 'deduct', ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                actual_deducted,
                old_balance,
                new_balance,
                f"Admin: {body.reason}",
                datetime.utcnow().isoformat()
            )
        )
    
    # Log admin action
    log_action(AuditLogCreate(
        admin_id=current_admin.admin_id,
        action="deduct_credits",
        target_type="user",
        target_id=user_id,
        details={
            "amount": body.amount,
            "actual_deducted": actual_deducted,
            "reason": body.reason,
            "old_balance": old_balance,
            "new_balance": new_balance
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))
    
    return CreditsActionResponse(
        user_id=user_id,
        new_balance=new_balance,
        message=f"Deducted {actual_deducted} credits"
    )


@router.post("/bulk-credits", response_model=BulkCreditsResponse)
async def bulk_update_credits(
    request: Request,
    body: BulkCreditsRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """
    Bulk update credits for all users.
    - operation: "set" (set all users to exact amount) or "add" (add amount to all users)
    - amount: The credit amount
    - reason: Admin reason for the bulk update
    """
    if body.operation not in ["set", "add"]:
        raise HTTPException(status_code=400, detail="Operation must be 'set' or 'add'")
    
    if body.amount < 0:
        raise HTTPException(status_code=400, detail="Amount cannot be negative")
    
    affected_users = 0
    
    with get_db_context() as conn:
        # Get all users
        users = conn.execute("SELECT user_id, credits FROM users").fetchall()
        
        for user in users:
            user_id = user["user_id"]
            old_balance = user["credits"]
            
            if body.operation == "set":
                new_balance = body.amount
            else:  # add
                new_balance = old_balance + body.amount
            
            delta = new_balance - old_balance
            
            # Update credits
            conn.execute(
                "UPDATE users SET credits = ? WHERE user_id = ?",
                (new_balance, user_id)
            )
            
            # Log transaction
            tx_type = "admin_add" if body.operation == "add" else "admin_reset"
            conn.execute(
                """
                INSERT INTO credit_transactions 
                (user_id, type, amount, balance_before, balance_after, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    tx_type,
                    abs(delta),
                    old_balance,
                    new_balance,
                    f"Bulk {body.operation}: {body.reason}",
                    datetime.utcnow().isoformat()
                )
            )
            
            affected_users += 1
    
    # Log admin action
    log_action(AuditLogCreate(
        admin_id=current_admin.admin_id,
        action="bulk_credits",
        target_type="users",
        target_id="all",
        details={
            "operation": body.operation,
            "amount": body.amount,
            "reason": body.reason,
            "affected_users": affected_users
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))
    
    operation_text = f"Set all users to {body.amount}" if body.operation == "set" else f"Added {body.amount} to all users"
    
    return BulkCreditsResponse(
        affected_users=affected_users,
        operation=body.operation,
        amount=body.amount,
        message=f"{operation_text} ({affected_users} users updated)"
    )


