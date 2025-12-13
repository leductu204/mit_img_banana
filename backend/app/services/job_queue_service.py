
"""
Service to manage job queue and promotion.
Handles FIFO promotion of pending jobs when concurrent slots become available.
"""
import logging
from datetime import datetime
from typing import Optional, List

from app.services.concurrency_service import ConcurrencyService
from app.services.dispatcher import Dispatcher
from app.repositories import jobs_repo

logger = logging.getLogger(__name__)

class JobQueueService:
    """Manages the job queue and promotion logic."""

    @staticmethod
    def promote_next_job(user_id: str) -> Optional[str]:
        """
        Attempts to promote the oldest pending job for a user to processing state.
        
        Args:
            user_id: The user ID to check promotion for.
            
        Returns:
            The job_id of the promoted job if successful, None otherwise.
        """
        try:
            # 1. Get user's plan limits and usage
            # We need to know which TYPE of job can be promoted.
            # However, simpler approach: Get oldest pending job, check if it can run.
            # If not, maybe check next oldest? Strict FIFO usually blocks if head is blocked.
            # Let's try strict FIFO for simplicity first: head of line must clear checks.
            
            # Fetch pending jobs for user (sorted by created_at ASC)
            pending_jobs, count = jobs_repo.get_by_user(
                user_id=user_id, 
                page=1, 
                limit=10, 
                status="pending"
            )
            
            if not pending_jobs:
                return None
                
            # Try to promote the first job that fits limits
            # (Or strict FIFO: check first, if blocked, return None)
            # "Hybrid" implies we might have total slots free but image slots full.
            # If head is image and image full, but video free, should we skip to video?
            # Standard queues usually don't skip to avoid starvation or complexity.
            # Users might prefer their video to start if image is blocked.
            # Let's iterate through the first few pending jobs and try to start one.
            
            for job in pending_jobs:
                job_id = job["job_id"]
                job_type = job["type"]
                
                # Check limits
                limit_check = ConcurrencyService.check_can_start_job(user_id, job_type)
                
                if limit_check["allowed"]:
                    # Can start!
                    logger.info(f"Promoting job {job_id} for user {user_id}")
                    
                    # 1. Execute via Dispatcher (External API call)
                    # This might take a few seconds, ideally async background task.
                    # For now we do it synchronously to ensure it works before updating DB.
                    provider_job_id = Dispatcher.execute_job(job)
                    
                    if provider_job_id:
                        # 2. Update DB status to processing
                        # We use a specialized update in jobs_repo or just update_status
                        # We also need to set provider_job_id
                        jobs_repo.set_provider_id(job_id, provider_job_id)
                        
                        # Update status + started_processing_at (we need a repo method for this)
                        # For now, update_status sets 'completed_at' for completion/failure. 
                        # We need to handle 'started_processing_at'. 
                        # I'll update the repo update_status or add a new one.
                        # For now, let's just use update_status('processing').
                        jobs_repo.update_status(job_id, "processing")
                        
                        return job_id
                    else:
                        logger.error(f"Failed to dispatch job {job_id} during promotion.")
                        # Should we mark it failed? Or leave pending to retry?
                        # Leave pending for retry is safer but might block queue if persistent error.
                        # Convert to failed after N attempts? 
                        # For now, leave pending.
                else:
                    # Job blocked by limit. 
                    # If we implement Skip logic (allow video if image blocked), continue loop.
                    # If Strict FIFO, break.
                    # Let's ALLOW Skip logic for better UX (Hybrid limits).
                    continue
                    
            return None

        except Exception as e:
            logger.error(f"Error promoting job for user {user_id}: {str(e)}")
            return None

    @staticmethod
    def try_promote_jobs_for_all_users():
        """
        Background task helper to sweep users with pending jobs.
        (Optional, if we want periodic sweeps)
        """
        pass
