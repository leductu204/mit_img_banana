# tasks/job_monitor.py
"""Background task for actively polling and updating job statuses."""

import asyncio
import logging
from app.repositories import jobs_repo
from app.services.credits_service import credits_service
from app.services.providers.higgsfield_client import higgsfield_client, HiggsfieldClient
from app.services.providers.google_client import google_veo_client
from app.services.job_queue_service import JobQueueService
from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo

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


def get_higgsfield_client():
    """
    Get Higgsfield client using active account from DB (highest priority).
    Falls back to default .env client if no active accounts found.
    """
    try:
        accounts = higgsfield_accounts_repo.list_accounts(active_only=True)
        if accounts:
            # Accounts are already ordered by priority DESC in repo
            # Pick the first one (highest priority)
            account_id = accounts[0]['account_id']
            return HiggsfieldClient.create_from_account(account_id)
    except Exception as e:
        logger.error(f"Error fetching Higgsfield account: {e}")
    
    # Fallback to default
    return higgsfield_client


async def run_job_monitor(check_interval_seconds: int = 30):
    """
    Background task to actively monitor all pending/processing jobs.
    
    This ensures jobs are updated even if the user closes their browser.
    Runs every check_interval_seconds.
    """
    logger.info(f"Starting job monitor task (interval={check_interval_seconds}s)")
    
    while True:
        try:
            # Get active higgsfield client for this iteration
            # We fetch it fresh each loop in case credentials updated
            client = get_higgsfield_client()
            
            # Get all active jobs (only ones that have been submitted to provider)
            active_jobs = jobs_repo.get_active_jobs()
            
            if active_jobs:
                logger.debug(f"Job monitor: checking {len(active_jobs)} active jobs")
                
                for job in active_jobs:
                    job_id = job["job_id"]
                    # Use provider_job_id for external API calls, fallback to job_id if None (migration)
                    provider_job_id = job.get("provider_job_id") or job_id
                    
                    user_id = job["user_id"]
                    current_status = job["status"]
                    
                    try:
                        # Determine provider based on job_id format (legacy) or provider_id format
                        # Assuming Veo3 IDs might still be identifiable, or we just trust the provider_id
                        if "|" in provider_job_id:
                            # Veo3 job
                            result = google_veo_client.get_job_status(provider_job_id)
                        else:
                            # Kling job - Use dynamic client
                            result = client.get_job_status(provider_job_id)
                        
                        # Debug (commented out)
                        # print(f"[JobMonitor] Job {job_id[:8]}... Higgsfield returned: {result}")
                        
                        external_status = result.get("status", "processing")
                        new_status = map_external_status(external_status)
                        output_url = result.get("result")
                        
                        # Define active (non-terminal) states
                        active_states = {"pending", "processing"}
                        terminal_states = {"completed", "failed"}
                        
                        # Only update if status changed
                        # Debug (commented out)
                        # print(f"[JobMonitor] Job {job_id[:8]}... current_status={current_status}, new_status={new_status}")
                        if new_status != current_status:
                            logger.info(f"Job {job_id}: {current_status} -> {new_status}")
                            
                            # Prevent downgrading from processing to pending
                            # Both are active states, no need to update
                            if current_status in active_states and new_status in active_states:
                                logger.debug(f"Job {job_id}: Skipping status update (both active states)")
                                continue
                            
                            if new_status == "completed":
                                # Debug (commented out)
                                # print(f"[JobMonitor] Updating job {job_id} to COMPLETED with URL: {output_url[:50]}...")
                                success = jobs_repo.update_status(job_id, new_status, output_url=output_url)
                                # Debug (commented out)
                                # print(f"[JobMonitor] Job {job_id} update returned: {success}")
                                
                                # Verify the update (debug - commented out)
                                # verify_job = jobs_repo.get_by_id(job_id)
                                # print(f"[JobMonitor] Verified DB status: {verify_job['status'] if verify_job else 'NOT FOUND'}")
                                
                                # Job finished, free up slot -> promote next
                                JobQueueService.promote_next_job(user_id)
                                
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
                                
                                # Job failed (but finished), free up slot -> promote next
                                JobQueueService.promote_next_job(user_id)
                                        
                            else:
                                # Other status changes (e.g., pending -> processing)
                                jobs_repo.update_status(job_id, new_status)
                                
                    except Exception as e:
                        logger.error(f"Error checking job {job_id}: {e}")
                    
                    # Wait between each job check to avoid rate limiting
                    await asyncio.sleep(2)
                        
        except Exception as e:
            logger.error(f"Error in job monitor loop: {e}")
        
        # Sleep until next check
        await asyncio.sleep(check_interval_seconds)

