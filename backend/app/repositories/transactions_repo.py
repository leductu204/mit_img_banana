# repositories/transactions_repo.py
"""Repository for credit transaction database operations."""

from datetime import datetime
from typing import Optional, List
from app.database.db import fetch_one, fetch_all, execute_returning_id, get_db_context
from app.schemas.transactions import TransactionCreate


def create(transaction_data: TransactionCreate) -> dict:
    """
    Create a new credit transaction record.
    
    Args:
        transaction_data: Transaction data
        
    Returns:
        Created transaction record as dictionary
    """
    now = datetime.utcnow().isoformat()
    
    with get_db_context() as conn:
        cursor = conn.execute(
            """
            INSERT INTO credit_transactions (
                user_id, job_id, type, amount, 
                balance_before, balance_after, reason, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                transaction_data.user_id,
                transaction_data.job_id,
                transaction_data.type,
                transaction_data.amount,
                transaction_data.balance_before,
                transaction_data.balance_after,
                transaction_data.reason,
                now
            )
        )
        transaction_id = cursor.lastrowid
    
    return get_by_id(transaction_id)


def get_by_id(transaction_id: int) -> Optional[dict]:
    """Find transaction by ID."""
    return fetch_one(
        "SELECT * FROM credit_transactions WHERE id = ?",
        (transaction_id,)
    )


def get_by_user(
    user_id: str,
    page: int = 1,
    limit: int = 50,
    transaction_type: Optional[str] = None
) -> tuple[List[dict], int]:
    """
    Get transactions for a user with pagination and filters.
    
    Args:
        user_id: User ID
        page: Page number (1-indexed)
        limit: Items per page
        transaction_type: Optional type filter (deduct, refund, etc.)
        
    Returns:
        Tuple of (transactions list, total count)
    """
    offset = (page - 1) * limit
    
    # Build query with optional filters
    where_clauses = ["user_id = ?"]
    params = [user_id]
    
    if transaction_type:
        where_clauses.append("type = ?")
        params.append(transaction_type)
    
    where_sql = " AND ".join(where_clauses)
    
    # Get paginated transactions
    transactions = fetch_all(
        f"""
        SELECT * FROM credit_transactions 
        WHERE {where_sql}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
        """,
        tuple(params + [limit, offset])
    )
    
    # Get total count
    total_result = fetch_one(
        f"SELECT COUNT(*) as count FROM credit_transactions WHERE {where_sql}",
        tuple(params)
    )
    total = total_result["count"] if total_result else 0
    
    return transactions, total


def get_by_job(job_id: str) -> List[dict]:
    """Get all transactions for a specific job."""
    return fetch_all(
        """
        SELECT * FROM credit_transactions 
        WHERE job_id = ?
        ORDER BY created_at DESC
        """,
        (job_id,)
    )


def get_user_balance_history(user_id: str, limit: int = 30) -> List[dict]:
    """
    Get recent balance history for charting.
    
    Returns transactions with balance_after for plotting.
    """
    return fetch_all(
        """
        SELECT created_at, balance_after, type, amount
        FROM credit_transactions 
        WHERE user_id = ?
        ORDER BY created_at DESC 
        LIMIT ?
        """,
        (user_id, limit)
    )


def get_total_spent(user_id: str) -> int:
    """Get total credits spent by user (sum of deductions)."""
    result = fetch_one(
        """
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM credit_transactions 
        WHERE user_id = ? AND type = 'deduct'
        """,
        (user_id,)
    )
    return result["total"] if result else 0


def get_total_refunded(user_id: str) -> int:
    """Get total credits refunded to user."""
    result = fetch_one(
        """
        SELECT COALESCE(SUM(amount), 0) as total
        FROM credit_transactions 
        WHERE user_id = ? AND type = 'refund'
        """,
        (user_id,)
    )
    return result["total"] if result else 0
