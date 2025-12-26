"""
Repository for managing Higgsfield provider accounts.
Handles CRUD operations and job statistics for multiple accounts.
"""

from typing import Optional, Dict, List
from app.database.db import get_db_context, fetch_one, fetch_all, execute_returning_id


class HiggsfieldAccountsRepository:
    """Repository for Higgsfield provider accounts."""
    
    def create_account(
        self,
        name: str,
        sses: str,
        cookie: str,
        max_parallel_images: int = 8,
        max_parallel_videos: int = 8,
        max_slow_images: int = 4,
        max_slow_videos: int = 4,
        priority: int = 100,
        is_active: bool = True
    ) -> int:
        """
        Create a new Higgsfield account.
        
        Returns:
            account_id of the created account
        """
        # Clean credentials
        if sses: sses = sses.strip()
        if cookie: cookie = cookie.strip()

        query = """
            INSERT INTO higgsfield_accounts 
            (name, sses, cookie, max_parallel_images, max_parallel_videos, 
             max_slow_images, max_slow_videos, priority, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        return execute_returning_id(query, (
            name, sses, cookie, max_parallel_images, max_parallel_videos,
            max_slow_images, max_slow_videos, priority, is_active
        ))
    
    def get_account(self, account_id: int) -> Optional[Dict]:
        """Get account by ID."""
        query = "SELECT * FROM higgsfield_accounts WHERE account_id = ?"
        return fetch_one(query, (account_id,))
    
    def list_accounts(self, active_only: bool = False) -> List[Dict]:
        """
        List all accounts, ordered by priority descending.
        
        Args:
            active_only: If True, only return active accounts
        """
        if active_only:
            query = """
                SELECT * FROM higgsfield_accounts 
                WHERE is_active = TRUE
                ORDER BY priority DESC, account_id ASC
            """
        else:
            query = """
                SELECT * FROM higgsfield_accounts 
                ORDER BY priority DESC, account_id ASC
            """
        return fetch_all(query)
    
    def update_account(
        self,
        account_id: int,
        **kwargs
    ) -> bool:
        """
        Update account settings.
        
        Supported fields: name, sses, cookie, max_parallel_images,
        max_parallel_videos, max_slow_images, max_slow_videos, priority, is_active
        """
        allowed_fields = {
            'name', 'sses', 'cookie', 'max_parallel_images',
            'max_parallel_videos', 'max_slow_images', 'max_slow_videos',
            'priority', 'is_active'
        }
        
        # Filter out invalid fields
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        # Clean credentials if present
        if 'sses' in updates and updates['sses']:
            updates['sses'] = updates['sses'].strip()
        if 'cookie' in updates and updates['cookie']:
            updates['cookie'] = updates['cookie'].strip()
        
        if not updates:
            return False
        
        # Build SET clause
        set_clause = ', '.join([f"{field} = ?" for field in updates.keys()])
        set_clause += ", updated_at = CURRENT_TIMESTAMP"
        
        query = f"UPDATE higgsfield_accounts SET {set_clause} WHERE account_id = ?"
        params = list(updates.values()) + [account_id]
        
        with get_db_context() as conn:
            cursor = conn.execute(query, params)
            return cursor.rowcount > 0
    
    def delete_account(self, account_id: int) -> bool:
        """
        Delete (deactivate) an account.
        We soft-delete by setting is_active = FALSE instead of removing from DB.
        """
        query = "UPDATE higgsfield_accounts SET is_active = FALSE WHERE account_id = ?"
        with get_db_context() as conn:
            cursor = conn.execute(query, (account_id,))
            return cursor.rowcount > 0
    
    def hard_delete_account(self, account_id: int) -> bool:
        """
        Permanently delete an account from database.
        Also deletes all associated jobs to prevent FK errors.
        """
        with get_db_context() as conn:
            # First delete associated jobs to prevent FK violations
            conn.execute("DELETE FROM jobs WHERE account_id = ?", (account_id,))
            
            # Then delete the account
            query = "DELETE FROM higgsfield_accounts WHERE account_id = ?"
            cursor = conn.execute(query, (account_id,))
            return cursor.rowcount > 0
    
    def get_account_stats(self, account_id: int) -> Dict:
        """
        Get current job statistics for an account.
        
        Returns dict with:
        - total_jobs: Total active jobs (pending + processing)
        - image_jobs: Active image jobs
        - video_jobs: Active video jobs
        - slow_image_jobs: Active slow/high-quality image jobs
        - slow_video_jobs: Active slow/high-quality video jobs
        """
        # TODO: Implement slow job detection logic
        # For now, we count all jobs as potentially slow
        # In production, this should check model names/parameters
        
        query = """
            SELECT 
                COUNT(*) as total_jobs,
                SUM(CASE WHEN type IN ('t2i', 'i2i') THEN 1 ELSE 0 END) as image_jobs,
                SUM(CASE WHEN type IN ('t2v', 'i2v') THEN 1 ELSE 0 END) as video_jobs
            FROM jobs
            WHERE account_id = ? 
            AND status IN ('pending', 'processing')
        """
        
        result = fetch_one(query, (account_id,))
        
        if not result:
            return {
                'total_jobs': 0,
                'image_jobs': 0,
                'video_jobs': 0,
                'slow_image_jobs': 0,
                'slow_video_jobs': 0
            }
        
        # TODO: Add slow job counting when we have model classification
        # For now, assume up to half of jobs could be slow
        return {
            'total_jobs': result['total_jobs'] or 0,
            'image_jobs': result['image_jobs'] or 0,
            'video_jobs': result['video_jobs'] or 0,
            'slow_image_jobs': 0,  # Placeholder
            'slow_video_jobs': 0   # Placeholder
        }
    
    def get_all_account_stats(self) -> List[Dict]:
        """
        Get statistics for all accounts.
        
        Returns list of dicts with account info + current stats.
        """
        accounts = self.list_accounts()
        result = []
        
        for account in accounts:
            stats = self.get_account_stats(account['account_id'])
            result.append({
                **account,
                'stats': stats
            })
        
        return result


# Singleton instance
higgsfield_accounts_repo = HiggsfieldAccountsRepository()
