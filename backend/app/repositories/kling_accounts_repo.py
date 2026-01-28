"""
Repository for managing Kling provider accounts.
Handles CRUD operations for multiple Kling accounts.
"""

from typing import Optional, Dict, List
from app.database.db import get_db_context, fetch_one, fetch_all, execute_returning_id


class KlingAccountsRepository:
    """Repository for Kling provider accounts."""
    
    def create_account(
        self,
        name: str,
        cookie: str,
        priority: int = 100,
        is_active: bool = True
    ) -> int:
        """
        Create a new Kling account.
        
        Returns:
            account_id of the created account
        """
        # Clean credentials
        if cookie: cookie = cookie.strip()

        query = """
            INSERT INTO kling_accounts 
            (name, cookie, priority, is_active)
            VALUES (?, ?, ?, ?)
        """
        return execute_returning_id(query, (name, cookie, priority, is_active))
    
    def get_account(self, account_id: int) -> Optional[Dict]:
        """Get account by ID."""
        query = "SELECT * FROM kling_accounts WHERE account_id = ?"
        return fetch_one(query, (account_id,))
    
    def get_by_id(self, account_id: int) -> Optional[Dict]:
        """Get account by ID (alias for get_account)."""
        return self.get_account(account_id)
    
    def list_accounts(self, active_only: bool = False) -> List[Dict]:
        """
        List all accounts, ordered by priority descending.
        
        Args:
            active_only: If True, only return active accounts
        """
        if active_only:
            query = """
                SELECT * FROM kling_accounts 
                WHERE is_active = TRUE
                ORDER BY priority DESC, account_id ASC
            """
        else:
            query = """
                SELECT * FROM kling_accounts 
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
        
        Supported fields: name, cookie, priority, is_active
        """
        allowed_fields = {'name', 'cookie', 'priority', 'is_active'}
        
        # Filter out invalid fields
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        # Clean credentials if present
        if 'cookie' in updates and updates['cookie']:
            updates['cookie'] = updates['cookie'].strip()
        
        if not updates:
            return False
        
        # Build SET clause
        set_clause = ', '.join([f"{field} = ?" for field in updates.keys()])
        set_clause += ", updated_at = CURRENT_TIMESTAMP"
        
        query = f"UPDATE kling_accounts SET {set_clause} WHERE account_id = ?"
        params = list(updates.values()) + [account_id]
        
        with get_db_context() as conn:
            cursor = conn.execute(query, params)
            return cursor.rowcount > 0
    
    def delete_account(self, account_id: int) -> bool:
        """
        Delete (deactivate) an account.
        We soft-delete by setting is_active = FALSE instead of removing from DB.
        """
        query = "UPDATE kling_accounts SET is_active = FALSE WHERE account_id = ?"
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
            query = "DELETE FROM kling_accounts WHERE account_id = ?"
            cursor = conn.execute(query, (account_id,))
            return cursor.rowcount > 0


# Singleton instance
kling_accounts_repo = KlingAccountsRepository()
