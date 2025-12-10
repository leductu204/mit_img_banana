import asyncio
import logging
from app.repositories import jobs_repo
from app.services.credits_service import credits_service

logger = logging.getLogger(__name__)

async def run_pending_jobs_cleanup(check_interval_seconds: int = 60, stale_minutes: int = 45):
    """
    Background task to cleanup stale pending jobs.
    
    Checks for jobs that have been in 'pending' state for longer than 
    stale_minutes. Marks them as 'failed' and refunds credits.
    """
    logger.info(f"Starting pending jobs cleanup task (interval={check_interval_seconds}s, stale={stale_minutes}m)")
    
    while True:
        try:
            # Find stale jobs
            stale_jobs = jobs_repo.get_stale_pending_jobs(minutes=stale_minutes)
            
            if stale_jobs:
                logger.info(f"Found {len(stale_jobs)} stale pending jobs")
                
                for job in stale_jobs:
                    job_id = job["job_id"]
                    user_id = job["user_id"]
                    
                    try:
                        # 1. Update status to failed
                        logger.info(f"Timing out stale job {job_id}")
                        jobs_repo.update_status(
                            job_id, 
                            "failed", 
                            error_message=f"Job timeout (pending > {stale_minutes}m)"
                        )
                        
                        # 2. Refund credits
                        logger.info(f"Refunding credits for stale job {job_id}")
                        new_balance = credits_service.refund_credits(user_id, job_id)
                        
                        if new_balance is not None:
                            logger.info(f"Refunded job {job_id}. New balance for user {user_id}: {new_balance}")
                        else:
                            logger.info(f"Job {job_id} already refunded or no cost.")
                            
                    except Exception as e:
                        logger.error(f"Error processing stale job {job_id}: {e}")
            
        except Exception as e:
            logger.error(f"Error in pending jobs cleanup loop: {e}")
            
        # Sleep until next check
        await asyncio.sleep(check_interval_seconds)
