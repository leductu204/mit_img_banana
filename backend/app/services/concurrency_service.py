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
                sp.total_concurrent_limit,
                sp.image_concurrent_limit,
                sp.video_concurrent_limit,
                sp.name as plan_name
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
        Returns: {
            "allowed": bool,
            "reason": str (if not allowed),
            "current_usage": dict,
            "limits": dict
        }
        """
        limits = ConcurrencyService.get_user_plan_limits(user_id)
        usage = ConcurrencyService.get_active_job_counts(user_id)
        
        is_video = job_type in ['t2v', 'i2v']
        is_image = job_type in ['t2i', 'i2i']
        
        allowed = True
        reason = None
        
        # 1. Check Total Limit
        if usage["total_active"] >= limits["total_concurrent_limit"]:
            allowed = False
            reason = f"Total concurrent limit reached ({usage['total_active']}/{limits['total_concurrent_limit']})"
        
        # 2. Check Type Limit
        elif is_image and usage["image_active"] >= limits["image_concurrent_limit"]:
            allowed = False
            reason = f"Image concurrent limit reached ({usage['image_active']}/{limits['image_concurrent_limit']})"
            
        elif is_video and usage["video_active"] >= limits["video_concurrent_limit"]:
            allowed = False
            reason = f"Video concurrent limit reached ({usage['video_active']}/{limits['video_concurrent_limit']})"
            
        return {
            "allowed": allowed,
            "reason": reason,
            "current_usage": usage,
            "limits": limits
        }
