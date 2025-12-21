# tasks/old_jobs_cleanup.py
"""Background task to delete jobs older than 7 days."""

import asyncio
from app.repositories import jobs_repo


async def run_old_jobs_cleanup():
    """
    Background task that runs every 24 hours to delete jobs older than 7 days.
    """
    while True:
        try:
            # Wait 24 hours (86400 seconds)
            await asyncio.sleep(86400)
            
            # Delete jobs older than 7 days
            print("🗑️  Running scheduled cleanup of old jobs...")
            deleted_count = jobs_repo.delete_old_jobs(days=7)
            
            if deleted_count == 0:
                print("✓ No old jobs to clean up")
                
        except asyncio.CancelledError:
            print("Old jobs cleanup task cancelled")
            raise
        except Exception as e:
            print(f"Error in old jobs cleanup task: {e}")
            # Continue running even if there's an error
            await asyncio.sleep(3600)  # Wait 1 hour before retrying
