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


@router.get("/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: Optional[UserInDB] = Depends(get_current_user_optional)
):
    """
    Get job status with automatic refund on failure.
    
    If authenticated, also checks job ownership and triggers refund for failed jobs.
    """
    try:
        # Determine which client to use based on job_id format
        # Veo3 jobs have format: "operation_name|scene_id"
        if "|" in job_id:
            # Veo3 job - use Google client
            result = google_veo_client.get_job_status(job_id)
        else:
            # Kling job - use Higgsfield client
            result = higgsfield_client.get_job_status(job_id)
        
        # If user is authenticated, update our database
        if current_user:
            # Try to load job from our database
            job = jobs_repo.get_by_id(job_id)
            
            if job:
                # Check ownership
                if job["user_id"] != current_user.user_id:
                    raise HTTPException(
                        status_code=403,
                        detail="You don't have access to this job"
                    )
                
                # Map external status to our internal values
                external_status = result.get("status", "processing")
                new_status = map_external_status(external_status)
                output_url = result.get("result")
                
                if new_status != job["status"]:
                    # Status changed - update database
                    if new_status == "completed":
                        jobs_repo.update_status(job_id, new_status, output_url=output_url)
                    elif new_status == "failed":
                        error_msg = result.get("error", "Generation failed")
                        jobs_repo.update_status(job_id, new_status, error_message=error_msg)
                        
                        # Trigger refund if not already refunded
                        if not job.get("credits_refunded", False):
                            refund_result = credits_service.refund_credits(
                                user_id=current_user.user_id,
                                job_id=job_id
                            )
                            if refund_result is not None:
                                result["refunded"] = True
                                result["new_balance"] = refund_result
                    else:
                        jobs_repo.update_status(job_id, new_status)
                
                # Add credits info to response
                result["credits_cost"] = job["credits_cost"]
                result["job_id"] = job_id
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Job status error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to get job status")
