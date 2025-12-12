# tasks/job_monitor.py
"""Background task for actively polling and updating job statuses."""

import asyncio
import logging
from app.repositories import jobs_repo
from app.services.credits_service import credits_service
from app.services.providers.higgsfield_client import higgsfield_client
from app.services.providers.google_client import google_veo_client

logger = logging.getLogger(__name__)


def map_external_status(external_status: str) -> str:
    """Map external API status to our internal status values."""
    status_lower = external_status.lower() if external_status else "processing"
    
    if status_lower in ("completed", "complete", "done", "success", "finished"):
        return "completed"
    if status_lower in ("failed", "error", "cancelled", "canceled", "timeout"):
        return "failed"
    if status_lower in ("pending", "queued", "waiting"):
        return "pending"
    
    return "processing"


async def run_job_monitor(check_interval_seconds: int = 30):
    """
    Background task to actively monitor all pending/processing jobs.
    
    This ensures jobs are updated even if the user closes their browser.
    Runs every check_interval_seconds.
    """
    logger.info(f"Starting job monitor task (interval={check_interval_seconds}s)")
    
    while True:
        try:
            # Get all active jobs
            active_jobs = jobs_repo.get_active_jobs()
            
            if active_jobs:
                logger.debug(f"Job monitor: checking {len(active_jobs)} active jobs")
                
                for job in active_jobs:
                    job_id = job["job_id"]
                    user_id = job["user_id"]
                    current_status = job["status"]
                    
                    try:
                        # Determine provider based on job_id format
                        if "|" in job_id:
                            # Veo3 job
                            result = google_veo_client.get_job_status(job_id)
                        else:
                            # Kling job
                            result = higgsfield_client.get_job_status(job_id)
                        
                        external_status = result.get("status", "processing")
                        new_status = map_external_status(external_status)
                        output_url = result.get("result")
                        
                        # Only update if status changed
                        if new_status != current_status:
                            logger.info(f"Job {job_id}: {current_status} -> {new_status}")
                            
                            if new_status == "completed":
                                jobs_repo.update_status(job_id, new_status, output_url=output_url)
                                
                            elif new_status == "failed":
                                error_msg = result.get("error", "Generation failed")
                                jobs_repo.update_status(job_id, new_status, error_message=error_msg)
                                
                                # Refund credits if not already refunded
                                if not job.get("credits_refunded", False):
                                    refund_result = credits_service.refund_credits(
                                        user_id=user_id,
                                        job_id=job_id
                                    )
                                    if refund_result is not None:
                                        logger.info(f"Refunded job {job_id}. New balance: {refund_result}")
                                        
                            else:
                                # processing or other intermediate status
                                jobs_repo.update_status(job_id, new_status)
                                
                    except Exception as e:
                        logger.error(f"Error checking job {job_id}: {e}")
                    
                    # Wait between each job check to avoid rate limiting
                    await asyncio.sleep(2)
                        
        except Exception as e:
            logger.error(f"Error in job monitor loop: {e}")
        
        # Sleep until next check
        await asyncio.sleep(check_interval_seconds)

