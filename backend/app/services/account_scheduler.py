"""
Account scheduler for distributing jobs across multiple Higgsfield accounts.
Handles account selection based on capacity and priority.
"""

from typing import Optional, Dict
import time
from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo


class AccountScheduler:
    """
    Scheduler for selecting the best available Higgsfield account for a job.
    """
    
    # Model classification for "slow" jobs
    SLOW_IMAGE_MODELS = {
        'nano-banana-2',  # Nano Banana PRO
        'nano-banana-pro',
    }
    
    SLOW_VIDEO_MODELS = {
        'kling-2.6',      # Kling 2.6 is slower/higher quality
    }
    
    def classify_job_as_slow(
        self,
        job_type: str,
        model: str,
        **params
    ) -> bool:
        """
        Determine if a job should count against "slow job" limits.
        
        Args:
            job_type: 't2i', 'i2i', 't2v', 'i2v'
            model: Model name
            **params: Additional parameters (resolution, duration, etc.)
        
        Returns:
            True if this is a "slow" job
        """
        if job_type in ('t2i', 'i2i'):
            # Image job
            model_lower = model.lower()
            
            # Check if it's a known slow model
            if any(slow_model in model_lower for slow_model in self.SLOW_IMAGE_MODELS):
                return True
            
            # Check resolution - 4k is slower
            resolution = params.get('resolution', '1k')
            if resolution and '4k' in str(resolution).lower():
                return True
                
        elif job_type in ('t2v', 'i2v'):
            # Video job
            model_lower = model.lower()
            
            # Check if it's a known slow model
            if any(slow_model in model_lower for slow_model in self.SLOW_VIDEO_MODELS):
                return True
            
            # Check resolution - higher than 720p is slower
            resolution = params.get('resolution', '720p')
            if resolution and ('1080p' in str(resolution) or '4k' in str(resolution)):
                return True
            
            # Check duration - longer videos are slower
            duration = params.get('duration', '5s')
            if duration:
                duration_int = int(str(duration).replace('s', ''))
                if duration_int >= 10:
                    return True
        
        return False
    
    def can_start_job(
        self,
        account_id: int,
        job_type: str,
        is_slow: bool
    ) -> bool:
        """
        Check if an account has capacity to start a new job.
        
        Args:
            account_id: The account to check
            job_type: 't2i', 'i2i', 't2v', 'i2v'
            is_slow: Whether this is a slow job
        
        Returns:
            True if the account can accept the job
        """
        account = higgsfield_accounts_repo.get_account(account_id)
        if not account or not account['is_active']:
            return False
        
        stats = higgsfield_accounts_repo.get_account_stats(account_id)
        
        # Check if it's an image or video job
        is_image = job_type in ('t2i', 'i2i')
        
        if is_image:
            # Check image limits
            if stats['image_jobs'] >= account['max_parallel_images']:
                return False
            
            if is_slow and stats['slow_image_jobs'] >= account['max_slow_images']:
                return False
        else:
            # Check video limits
            if stats['video_jobs'] >= account['max_parallel_videos']:
                return False
            
            if is_slow and stats['slow_video_jobs'] >= account['max_slow_videos']:
                return False
        
        return True
    
    def select_account_for_job(
        self,
        job_type: str,
        model: str,
        **params
    ) -> Optional[int]:
        """
        Select the best available account for a job.
        
        Args:
            job_type: 't2i', 'i2i', 't2v', 'i2v'
            model: Model name
            **params: Additional job parameters
        
        Returns:
            account_id if an account is available, None otherwise
        """
        # Classify job
        is_slow = self.classify_job_as_slow(job_type, model, **params)
        
        # Get active accounts ordered by priority
        accounts = higgsfield_accounts_repo.list_accounts(active_only=True)
        
        if not accounts:
            print("No active Higgsfield accounts configured")
            return None
        
        # Find first account with capacity
        for account in accounts:
            if self.can_start_job(account['account_id'], job_type, is_slow):
                return account['account_id']
        
        # No account available
        return None
    
    def wait_for_available_account(
        self,
        job_type: str,
        model: str,
        timeout: int = 30,
        poll_interval: int = 2,
        **params
    ) -> Optional[int]:
        """
        Wait for an account to become available.
        
        Args:
            job_type: 't2i', 'i2i', 't2v', 'i2v'
            model: Model name
            timeout: Maximum seconds to wait
            poll_interval: Seconds between checks
            **params: Additional job parameters
        
        Returns:
            account_id when available, None if timeout reached
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            account_id = self.select_account_for_job(job_type, model, **params)
            if account_id is not None:
                return account_id
            
            # Wait before next check
            time.sleep(poll_interval)
        
        return None
    
    def get_account_credentials(self, account_id: int) -> Optional[Dict[str, str]]:
        """
        Get SSES and Cookie credentials for an account.
        
        Returns:
            Dict with 'sses' and 'cookie' keys, or None if account not found
        """
        account = higgsfield_accounts_repo.get_account(account_id)
        if not account:
            return None
        
        return {
            'sses': account['sses'],
            'cookie': account['cookie']
        }


# Singleton instance
account_scheduler = AccountScheduler()
