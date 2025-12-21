
import sys
import os
import json
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.db import get_db_connection
from app.repositories import jobs_repo
from app.schemas.jobs import JobInfo

def check_history():
    print("--- Checking History Validation ---")
    
    conn = get_db_connection()
    try:
        # Find user
        cursor = conn.execute("SELECT user_id, email FROM users WHERE email LIKE '%leduc%'")
        user = cursor.fetchone()
        
        if not user:
            print("User not found")
            return

        user_id = user['user_id']
        email = user['email']
        print(f"Checking jobs for {email} ({user_id})")
        
        # Get jobs
        jobs, total = jobs_repo.get_by_user(user_id, page=1, limit=50)
        print(f"Fetched {len(jobs)} jobs (Total: {total})")
        
        for i, job in enumerate(jobs):
            try:
                # Mimic Pydantic validation
                job_model = JobInfo(**job)
                # print(f"✅ Job {job['job_id'][:8]} valid")
            except Exception as e:
                print(f"❌ Job {job.get('job_id', 'Unknown')} FALIED validation:")
                print(f"Error: {e}")
                print(f"Data: {json.dumps(dict(job), default=str, indent=2)}")
                return # Stop at first error
        
        print("All fetched jobs passed validation!")

    finally:
        conn.close()

if __name__ == "__main__":
    check_history()
