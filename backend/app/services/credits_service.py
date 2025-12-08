# services/credits_service.py
"""Credits service for managing user credits with transactional safety."""

from typing import Optional, Tuple
from datetime import datetime

from app.database.db import get_db_connection, execute_in_transaction
from app.repositories import users_repo, jobs_repo, transactions_repo
from app.schemas.transactions import TransactionCreate
from app.services.cost_calculator import calculate_cost, CostCalculationError


class InsufficientCreditsError(Exception):
    """Exception raised when user doesn't have enough credits."""
    def __init__(self, required: int, available: int):
        self.required = required
        self.available = available
        super().__init__(f"Insufficient credits. Required: {required}, Available: {available}")


class CreditsService:
    """Service for managing user credits with atomic transactions."""
    
    def calculate_generation_cost(
        self,
        model: str,
        aspect_ratio: str = "1:1",
        resolution: Optional[str] = None,
        duration: Optional[str] = None,
        audio: bool = False
    ) -> int:
        """
        Calculate the credit cost for a generation request.
        
        Args:
            model: Model name
            aspect_ratio: Aspect ratio
            resolution: Resolution (for applicable models)
            duration: Duration (for video models)
            audio: Audio enabled (for kling-2.6)
            
        Returns:
            Credit cost as integer
            
        Raises:
            CostCalculationError: If parameters are invalid
        """
        return calculate_cost(
            model=model,
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            duration=duration,
            audio=audio
        )
    
    def check_credits(self, user_id: str, required: int) -> Tuple[bool, int]:
        """
        Check if user has sufficient credits.
        
        Args:
            user_id: User ID
            required: Required credit amount
            
        Returns:
            Tuple of (has_enough, current_balance)
        """
        current = users_repo.get_credits(user_id)
        if current is None:
            return False, 0
        return current >= required, current
    
    def deduct_credits(
        self,
        user_id: str,
        amount: int,
        job_id: str,
        reason: str
    ) -> int:
        """
        Deduct credits from user account with transaction logging.
        
        This operation is atomic - either both the credit deduction
        and transaction log succeed, or neither does.
        
        Args:
            user_id: User ID
            amount: Amount to deduct (positive number)
            job_id: Associated job ID
            reason: Human-readable reason
            
        Returns:
            New credit balance
            
        Raises:
            InsufficientCreditsError: If user doesn't have enough credits
        """
        def do_deduction(conn):
            # Get current balance
            cursor = conn.execute(
                "SELECT credits FROM users WHERE user_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"User not found: {user_id}")
            
            balance_before = row["credits"]
            balance_after = balance_before - amount
            
            if balance_after < 0:
                raise InsufficientCreditsError(amount, balance_before)
            
            # Deduct credits
            conn.execute(
                "UPDATE users SET credits = ?, updated_at = ? WHERE user_id = ?",
                (balance_after, datetime.utcnow().isoformat(), user_id)
            )
            
            # Log transaction
            conn.execute(
                """
                INSERT INTO credit_transactions 
                (user_id, job_id, type, amount, balance_before, balance_after, reason, created_at)
                VALUES (?, ?, 'deduct', ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    job_id,
                    -amount,  # Negative for deduction
                    balance_before,
                    balance_after,
                    reason,
                    datetime.utcnow().isoformat()
                )
            )
            
            return balance_after
        
        return execute_in_transaction(do_deduction)
    
    def refund_credits(self, user_id: str, job_id: str) -> Optional[int]:
        """
        Refund credits for a failed job.
        
        This operation is atomic and idempotent - calling it multiple
        times for the same job will only refund once.
        
        Args:
            user_id: User ID
            job_id: Job ID to refund
            
        Returns:
            New credit balance, or None if already refunded
        """
        def do_refund(conn):
            # Get job details and check if already refunded
            cursor = conn.execute(
                "SELECT credits_cost, credits_refunded FROM jobs WHERE job_id = ?",
                (job_id,)
            )
            job = cursor.fetchone()
            
            if not job:
                raise ValueError(f"Job not found: {job_id}")
            
            if job["credits_refunded"]:
                # Already refunded - return None to indicate no action taken
                return None
            
            amount = job["credits_cost"]
            
            # Get current balance
            cursor = conn.execute(
                "SELECT credits FROM users WHERE user_id = ?",
                (user_id,)
            )
            user = cursor.fetchone()
            if not user:
                raise ValueError(f"User not found: {user_id}")
            
            balance_before = user["credits"]
            balance_after = balance_before + amount
            
            # Add credits back
            conn.execute(
                "UPDATE users SET credits = ?, updated_at = ? WHERE user_id = ?",
                (balance_after, datetime.utcnow().isoformat(), user_id)
            )
            
            # Mark job as refunded
            conn.execute(
                "UPDATE jobs SET credits_refunded = TRUE WHERE job_id = ?",
                (job_id,)
            )
            
            # Log transaction
            conn.execute(
                """
                INSERT INTO credit_transactions 
                (user_id, job_id, type, amount, balance_before, balance_after, reason, created_at)
                VALUES (?, ?, 'refund', ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    job_id,
                    amount,  # Positive for refund
                    balance_before,
                    balance_after,
                    "Job failed - automatic refund",
                    datetime.utcnow().isoformat()
                )
            )
            
            return balance_after
        
        return execute_in_transaction(do_refund)
    
    def add_credits(
        self,
        user_id: str,
        amount: int,
        reason: str,
        transaction_type: str = "admin_add"
    ) -> int:
        """
        Add credits to user account (admin operation).
        
        Args:
            user_id: User ID
            amount: Amount to add (positive number)
            reason: Human-readable reason
            transaction_type: Transaction type (admin_add, initial, etc.)
            
        Returns:
            New credit balance
        """
        def do_addition(conn):
            # Get current balance
            cursor = conn.execute(
                "SELECT credits FROM users WHERE user_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"User not found: {user_id}")
            
            balance_before = row["credits"]
            balance_after = balance_before + amount
            
            # Add credits
            conn.execute(
                "UPDATE users SET credits = ?, updated_at = ? WHERE user_id = ?",
                (balance_after, datetime.utcnow().isoformat(), user_id)
            )
            
            # Log transaction
            conn.execute(
                """
                INSERT INTO credit_transactions 
                (user_id, job_id, type, amount, balance_before, balance_after, reason, created_at)
                VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    transaction_type,
                    amount,
                    balance_before,
                    balance_after,
                    reason,
                    datetime.utcnow().isoformat()
                )
            )
            
            return balance_after
        
        return execute_in_transaction(do_addition)
    
    def log_initial_credits(self, user_id: str, amount: int) -> None:
        """
        Log the initial credit grant for a new user.
        
        Called after user creation to record the welcome bonus.
        """
        def do_log(conn):
            conn.execute(
                """
                INSERT INTO credit_transactions 
                (user_id, job_id, type, amount, balance_before, balance_after, reason, created_at)
                VALUES (?, NULL, 'initial', ?, 0, ?, 'Welcome bonus', ?)
                """,
                (
                    user_id,
                    amount,
                    amount,
                    datetime.utcnow().isoformat()
                )
            )
        
        execute_in_transaction(do_log)


# Singleton instance
credits_service = CreditsService()


# Convenience functions for backward compatibility
def deduct_credits(user_id: str, amount: int, job_id: str = None, reason: str = ""):
    """Deduct credits from user account."""
    if not job_id:
        job_id = "unknown"
    return credits_service.deduct_credits(user_id, amount, job_id, reason)


def add_credits(user_id: str, amount: int, reason: str = "Admin credit"):
    """Add credits to user account."""
    return credits_service.add_credits(user_id, amount, reason)
