# routers/jobs.py
"""Job status and management endpoints with authentication."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from app.services.providers.higgsfield_client import higgsfield_client
from app.services.providers.google_client import google_veo_client
from app.schemas.higgsfield import JobStatusResponse
from app.schemas.users import UserInDB
from app.deps import get_current_user, get_current_user_optional
from app.services.credits_service import credits_service
from app.repositories import jobs_repo


router = APIRouter(tags=["jobs"])


def map_external_status(external_status: str) -> str:
    """
    Map external API status to our internal status values.
    
    Our database only allows: 'pending', 'processing', 'completed', 'failed'
    """
    status_lower = external_status.lower() if external_status else "processing"
    
    # Map to completed
    if status_lower in ("completed", "complete", "done", "success", "finished"):
        return "completed"
    
    # Map to failed
    if status_lower in ("failed", "error", "cancelled", "canceled", "timeout"):
        return "failed"
    
    # Map to pending
    if status_lower in ("pending", "queued", "waiting"):
        return "pending"
    
    # Default to processing for any other status
    # (in_progress, running, generating, etc.)
    return "processing"


@router.get("", response_model=dict)
async def list_jobs(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    type: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    List jobs for the current user.
    """
    jobs, total = jobs_repo.get_by_user(
        user_id=current_user.user_id,
        page=page,
        limit=limit,
        status=status,
        job_type=type
    )
    
    return {
        "items": jobs,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.get("/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: Optional[UserInDB] = Depends(get_current_user_optional)
):
    """
    Get job status from our database.
    
    The job_monitor background task is responsible for polling external APIs
    and updating the database. This endpoint just returns the current DB status.
    """
    try:
        # 1. First, get job from our database
        job = jobs_repo.get_by_id(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # 2. Check ownership if authenticated
        if current_user and job["user_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="You don't have access to this job")
        
        # 3. Build response from database state
        result = {
            "status": job["status"],
            "result": job.get("output_url"),
            "error_message": job.get("error_message"),
            "job_id": job_id,
            "credits_cost": job.get("credits_cost"),
            "created_at": job.get("created_at"),
            "completed_at": job.get("completed_at"),
        }
        
        # 4. Add refund info if job failed
        if job["status"] == "failed" and job.get("credits_refunded"):
            result["refunded"] = True
            if current_user:
                result["new_balance"] = users_repo.get_credits(current_user.user_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Job status error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to get job status")


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Cancel a job that is still pending or processing.
    
    Only the job owner can cancel. Credits are NOT refunded for cancelled jobs.
    """
    # Check if job exists and belongs to user
    job = jobs_repo.get_by_id(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="You don't have access to this job")
    
    if job["status"] not in ("pending", "processing"):
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot cancel job with status '{job['status']}'"
        )
    
    # Cancel the job (no refund)
    cancelled = jobs_repo.cancel_job(job_id, current_user.user_id)
    
    if not cancelled:
        raise HTTPException(status_code=500, detail="Failed to cancel job")
    
    return {
        "job_id": job_id,
        "status": "cancelled",
        "message": "Job cancelled successfully"
    }

