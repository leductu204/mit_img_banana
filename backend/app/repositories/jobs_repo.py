# repositories/jobs_repo.py
"""Repository for job database operations."""

import json
from datetime import datetime
from typing import Optional, List, Literal
from app.database.db import fetch_one, fetch_all, execute, get_db_context
from app.schemas.jobs import JobCreate, JobInDB


def create(job_data: JobCreate) -> dict:
    """
    Create a new job record.
    
    Args:
        job_data: Job creation data
        
    Returns:
        Created job record as dictionary
    """
    now = datetime.utcnow().isoformat()
    
    with get_db_context() as conn:
        conn.execute(
            """
            INSERT INTO jobs (
                job_id, user_id, type, model, status, prompt,
                input_params, input_images, credits_cost, created_at
            )
            VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
            """,
            (
                job_data.job_id,
                job_data.user_id,
                job_data.type,
                job_data.model,
                job_data.prompt,
                job_data.input_params,
                job_data.input_images,
                job_data.credits_cost,
                now
            )
        )
    
    return get_by_id(job_data.job_id)


def get_by_id(job_id: str) -> Optional[dict]:
    """Find job by job ID."""
    return fetch_one(
        "SELECT * FROM jobs WHERE job_id = ?",
        (job_id,)
    )


def get_by_user(
    user_id: str,
    page: int = 1,
    limit: int = 50,
    status: Optional[str] = None,
    job_type: Optional[str] = None
) -> tuple[List[dict], int]:
    """
    Get jobs for a user with pagination and filters.
    
    Args:
        user_id: User ID
        page: Page number (1-indexed)
        limit: Items per page
        status: Optional status filter
        job_type: Optional type filter (t2i, i2i, t2v, i2v)
        
    Returns:
        Tuple of (jobs list, total count)
    """
    offset = (page - 1) * limit
    
    # Build query with optional filters
    where_clauses = ["user_id = ?"]
    params = [user_id]
    
    if status:
        where_clauses.append("status = ?")
        params.append(status)
    
    if job_type:
        where_clauses.append("type = ?")
        params.append(job_type)
    
    where_sql = " AND ".join(where_clauses)
    
    # Get paginated jobs
    jobs = fetch_all(
        f"""
        SELECT * FROM jobs 
        WHERE {where_sql}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
        """,
        tuple(params + [limit, offset])
    )
    
    # Get total count
    total_result = fetch_one(
        f"SELECT COUNT(*) as count FROM jobs WHERE {where_sql}",
        tuple(params)
    )
    total = total_result["count"] if total_result else 0
    
    return jobs, total


def update_status(
    job_id: str,
    status: str,
    output_url: Optional[str] = None,
    error_message: Optional[str] = None
) -> bool:
    """
    Update job status and related fields.
    
    Args:
        job_id: Job ID
        status: New status
        output_url: Result URL (for completed jobs)
        error_message: Error message (for failed jobs)
        
    Returns:
        True if update succeeded
    """
    now = datetime.utcnow().isoformat()
    
    if status == "completed":
        affected = execute(
            """
            UPDATE jobs 
            SET status = ?, output_url = ?, completed_at = ?
            WHERE job_id = ?
            """,
            (status, output_url, now, job_id)
        )
    elif status == "failed":
        affected = execute(
            """
            UPDATE jobs 
            SET status = ?, error_message = ?, completed_at = ?
            WHERE job_id = ?
            """,
            (status, error_message, now, job_id)
        )
    else:
        affected = execute(
            "UPDATE jobs SET status = ? WHERE job_id = ?",
            (status, job_id)
        )
    
    return affected > 0


def mark_refunded(job_id: str) -> bool:
    """
    Mark job as refunded to prevent double refunds.
    
    Args:
        job_id: Job ID
        
    Returns:
        True if update succeeded
    """
    affected = execute(
        "UPDATE jobs SET credits_refunded = TRUE WHERE job_id = ? AND credits_refunded = FALSE",
        (job_id,)
    )
    return affected > 0


def get_pending_refunds() -> List[dict]:
    """
    Get failed jobs that haven't been refunded yet.
    
    Returns:
        List of jobs needing refund
    """
    return fetch_all(
        """
        SELECT * FROM jobs 
        WHERE status = 'failed' AND credits_refunded = FALSE
        ORDER BY created_at DESC
        """
    )


def count_by_user(user_id: str) -> int:
    """Get total job count for a user."""
    result = fetch_one(
        "SELECT COUNT(*) as count FROM jobs WHERE user_id = ?",
        (user_id,)
    )
    return result["count"] if result else 0


def count_pending_by_user(user_id: str) -> int:
    """Get count of pending/processing jobs for a user (for concurrency limiting)."""
    result = fetch_one(
        """
        SELECT COUNT(*) as count FROM jobs 
        WHERE user_id = ? AND status IN ('pending', 'processing')
        """,
        (user_id,)
    )
    return result["count"] if result else 0

def get_recent_by_user(user_id: str, limit: int = 10) -> List[dict]:
    """Get most recent jobs for a user."""
    return fetch_all(
        """
        SELECT * FROM jobs 
        WHERE user_id = ?
        ORDER BY created_at DESC 
        LIMIT ?
        """,
        (user_id, limit)
    )


def get_stale_pending_jobs(minutes: int = 30) -> List[dict]:
    """
    Get job IDs that have been pending for longer than the specified minutes.
    
    Args:
        minutes: Number of minutes to consider a job stale
        
    Returns:
        List of stale jobs
    """
    # SQLite datetime calculation: datetime('now', '-30 minutes')
    # But since we store created_at as ISO string, we can use datetime comparison
    # generated in Python or rely on SQLite functions if dates are standard.
    # We use ISO format in Python, so standard string comparison works IF purely ISO.
    # However, 'now' in SQLite is UTC, our app uses UTC.
    
    # Let's use Python to calculate the cutoff time string to be safe and consistent
    
    from datetime import timedelta
    cutoff = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
    
    return fetch_all(
        """
        SELECT * FROM jobs 
        WHERE status = 'pending' 
        AND created_at < ?
        """,
        (cutoff,)
    )


def get_active_jobs() -> List[dict]:
    """
    Get all jobs that are currently pending or processing.
    Used by the job monitor background task.
    
    Returns:
        List of active jobs
    """
    return fetch_all(
        """
        SELECT * FROM jobs 
        WHERE status IN ('pending', 'processing')
        ORDER BY created_at ASC
        """
    )


def cancel_job(job_id: str, user_id: str) -> bool:
    """
    Cancel a job if it belongs to the user and is still active.
    
    Args:
        job_id: Job ID to cancel
        user_id: User ID (for ownership check)
        
    Returns:
        True if cancelled successfully, False otherwise
    """
    now = datetime.utcnow().isoformat()
    
    affected = execute(
        """
        UPDATE jobs 
        SET status = 'cancelled', completed_at = ?
        WHERE job_id = ? 
        AND user_id = ? 
        AND status IN ('pending', 'processing')
        """,
        (now, job_id, user_id)
    )
    return affected > 0

