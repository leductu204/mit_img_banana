# routers/users.py
"""User endpoints for profile, job history, and credit transactions."""

import math
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from app.deps import get_current_user
from app.schemas.users import UserInDB, UserProfile, UserCreditsResponse, UserLimitsResponse, ConcurrentLimitDetails
from app.schemas.jobs import JobListResponse, JobInfo
from app.schemas.transactions import TransactionListResponse, CreditTransaction
from app.repositories import users_repo, jobs_repo, transactions_repo
from app.services.concurrency_service import ConcurrencyService


router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_profile(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get current user's profile."""
    return UserProfile(
        user_id=current_user.user_id,
        username=current_user.username,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        credits=current_user.credits,
        created_at=current_user.created_at
    )


@router.get("/me/credits", response_model=UserCreditsResponse)
async def get_credits(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get current user's credit balance."""
    return UserCreditsResponse(
        user_id=current_user.user_id,
        credits=current_user.credits
    )


@router.get("/me/jobs", response_model=JobListResponse)
async def get_jobs(
    current_user: UserInDB = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status (pending, processing, completed, failed)"),
    type: Optional[str] = Query(None, description="Filter by type (t2i, i2i, t2v, i2v)")
):
    """
    Get current user's job history with pagination.
    
    Supports filtering by status and job type.
    """
    # Validate status if provided
    valid_statuses = ["pending", "processing", "completed", "failed"]
    if status and status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    # Validate type if provided
    valid_types = ["t2i", "i2i", "t2v", "i2v"]
    if type and type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type. Must be one of: {valid_types}"
        )
    
    jobs, total = jobs_repo.get_by_user(
        user_id=current_user.user_id,
        page=page,
        limit=limit,
        status=status,
        job_type=type
    )
    
    pages = math.ceil(total / limit) if total > 0 else 1
    
    return JobListResponse(
        jobs=[JobInfo(**job) for job in jobs],
        total=total,
        page=page,
        pages=pages,
        limit=limit
    )


@router.get("/me/transactions", response_model=TransactionListResponse)
async def get_transactions(
    current_user: UserInDB = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    type: Optional[str] = Query(None, description="Filter by type (deduct, refund, admin_add, initial)")
):
    """
    Get current user's credit transaction history with pagination.
    
    Supports filtering by transaction type.
    """
    # Validate type if provided
    valid_types = ["deduct", "refund", "admin_add", "admin_reset", "initial"]
    if type and type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type. Must be one of: {valid_types}"
        )
    
    transactions, total = transactions_repo.get_by_user(
        user_id=current_user.user_id,
        page=page,
        limit=limit,
        transaction_type=type
    )
    
    pages = math.ceil(total / limit) if total > 0 else 1
    
    return TransactionListResponse(
        transactions=[CreditTransaction(**t) for t in transactions],
        total=total,
        page=page,
        pages=pages,
        limit=limit
    )




@router.get("/me/limits", response_model=UserLimitsResponse)
async def get_limits(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get current user's concurrent limits and active usage."""
    plan_limits = ConcurrencyService.get_user_plan_limits(current_user.user_id)
    active_counts = ConcurrencyService.get_active_job_counts(current_user.user_id)
    
    return UserLimitsResponse(
        plan_id=str(plan_limits.get("plan_id", "1")),
        plan_name=plan_limits.get("plan_name", "Free"),
        plan_description=plan_limits.get("plan_description"),
        plan_expires_at=plan_limits.get("plan_expires_at"),
        limits=ConcurrentLimitDetails(
            total=plan_limits["total_concurrent_limit"],
            image=plan_limits["image_concurrent_limit"],
            video=plan_limits["video_concurrent_limit"]
        ),
        active_counts=ConcurrentLimitDetails(
            total=active_counts["total_active"],
            image=active_counts["image_active"],
            video=active_counts["video_active"]
        ),
        pending_counts=ConcurrentLimitDetails(
            total=active_counts.get("total_pending", 0),
            image=active_counts.get("image_pending", 0),
            video=active_counts.get("video_pending", 0)
        )
    )

@router.get("/me/stats")
async def get_stats(
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get current user's usage statistics.
    """
    total_jobs = jobs_repo.count_by_user(current_user.user_id)
    total_spent = transactions_repo.get_total_spent(current_user.user_id)
    total_refunded = transactions_repo.get_total_refunded(current_user.user_id)
    
    return {
        "user_id": current_user.user_id,
        "total_jobs": total_jobs,
        "credits_spent": total_spent,
        "credits_refunded": total_refunded,
        "current_balance": current_user.credits
    }
