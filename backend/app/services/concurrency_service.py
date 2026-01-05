from app.database.db import get_db_context
from app.utils.logger import logger

class ConcurrencyService:
    @staticmethod
    def get_user_plan_limits(user_id: str):
        """
        Get the specific limits for a user based on their subscription plan.
        Returns default Free plan limits if no plan is found.
        """
        query = """
            SELECT 
                sp.plan_id,
                sp.total_concurrent_limit,
                sp.image_concurrent_limit,
                sp.video_concurrent_limit,
                sp.queue_limit,
                sp.name as plan_name,
                sp.description as plan_description,
                u.plan_expires_at
            FROM users u
            JOIN subscription_plans sp ON u.plan_id = sp.plan_id
            WHERE u.user_id = ?
        """
        
        with get_db_context() as conn:
            cursor = conn.execute(query, (user_id,))
            row = cursor.fetchone()
            
            if row:
                return dict(row)
            
            # Fallback to defaults (Free plan) if something is wrong
            # Ideally this shouldn't happen due to migration
            return {
                "total_concurrent_limit": 2,
                "image_concurrent_limit": 1,
                "video_concurrent_limit": 1,
                "queue_limit": 3,
                "plan_name": "Free"
            }

    @staticmethod
    def get_active_job_counts(user_id: str):
        """
        Count active PROCESSING and PENDING jobs for a user.
        """
        query = """
            SELECT 
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as total_active,
                SUM(CASE WHEN status = 'processing' AND type IN ('t2i', 'i2i') THEN 1 ELSE 0 END) as image_active,
                SUM(CASE WHEN status = 'processing' AND type IN ('t2v', 'i2v') THEN 1 ELSE 0 END) as video_active,
                
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pending,
                SUM(CASE WHEN status = 'pending' AND type IN ('t2i', 'i2i') THEN 1 ELSE 0 END) as image_pending,
                SUM(CASE WHEN status = 'pending' AND type IN ('t2v', 'i2v') THEN 1 ELSE 0 END) as video_pending
            FROM jobs
            WHERE user_id = ? 
            AND status IN ('processing', 'pending')
        """
        
        with get_db_context() as conn:
            cursor = conn.execute(query, (user_id,))
            row = cursor.fetchone()
            
            return {
                "total_active": row["total_active"] or 0,
                "image_active": row["image_active"] or 0,
                "video_active": row["video_active"] or 0,
                "total_pending": row["total_pending"] or 0,
                "image_pending": row["image_pending"] or 0,
                "video_pending": row["video_pending"] or 0
            }

    @staticmethod
    def check_can_start_job(user_id: str, job_type: str) -> dict:
        """
        Check if a user can start a new job of a specific type.
        Returns comprehensive status for both immediate start and queue options.
        
        Returns: {
            "can_start": bool,       # Can start immediately (processing)
            "can_queue": bool,       # Can be added to queue (pending)
            "reason": str,           # Rejection reason if neither allowed
            "current_usage": dict,
            "limits": dict
        }
        """
        limits = ConcurrencyService.get_user_plan_limits(user_id)
        usage = ConcurrencyService.get_active_job_counts(user_id)
        
        is_video = job_type in ['t2v', 'i2v']
        is_image = job_type in ['t2i', 'i2i']
        
        can_start = True
        can_queue = True
        reason = None
        
        # 1. Check Total Concurrent Limit (for immediate start)
        if usage["total_active"] >= limits["total_concurrent_limit"]:
            can_start = False
        
        # 2. Check Type-Specific Limit (for immediate start)
        elif is_image and usage["image_active"] >= limits["image_concurrent_limit"]:
            can_start = False
            
        elif is_video and usage["video_active"] >= limits["video_concurrent_limit"]:
            can_start = False
        
        # 3. Check Queue Limit (for queueing when can't start)
        queue_limit = limits.get("queue_limit", 5)
        if usage["total_pending"] >= queue_limit:
            can_queue = False
            reason = f"Queue full ({usage['total_pending']}/{queue_limit})"
        
        # If can start, queue is also implicitly allowed but not needed
        # If can't start but can queue, that's the fallback
        # If neither, job must be rejected
        
        if not can_start and not can_queue:
            reason = reason or f"Queue full ({usage['total_pending']}/{queue_limit})"
            
        return {
            "can_start": can_start,
            "can_queue": can_queue,
            "allowed": can_start or can_queue,  # Backward compatibility
            "reason": reason,
            "current_usage": usage,
            "limits": limits
        }
