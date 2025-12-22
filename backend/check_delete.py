
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.db import get_db_connection
from app.repositories import jobs_repo, users_repo

def check_delete():
    print("--- Checking Delete Job Logic ---")
    
    conn = get_db_connection()
    try:
        # 1. Fetch the user 'Tu'
        cursor = conn.execute("SELECT * FROM users WHERE email LIKE '%leduc%'")
        user = cursor.fetchone()
        
        if not user:
            print("User 'Tu' not found")
            return

        user_id = user['user_id']
        email = user['email']
        print(f"Target User: {email} | ID: {user_id} (Type: {type(user_id)})")

        # 2. Fetch one job from this user
        jobs, total = jobs_repo.get_by_user(user_id, page=1, limit=1)
        
        if not jobs:
            print("No jobs found for this user to test deletion.")
            return

        job = jobs[0]
        job_id = job['job_id']
        job_user_id = job['user_id']
        
        print(f"Target Job: {job_id}")
        print(f"Job User ID: {job_user_id} (Type: {type(job_user_id)})")
        
        # 3. Verify Match
        match = (job_user_id == user_id)
        print(f"IDs Match? {match}")
        
        if not match:
            print(f"MISMATCH! '{job_user_id}' vs '{user_id}'")
            print(f"Lengths: {len(job_user_id)} vs {len(user_id)}")
            
        # 4. Simulate Repo Delete call
        print("Simulating delete_job call...")
        
        rows = conn.execute(
            "SELECT count(*) as c FROM jobs WHERE job_id = ? AND user_id = ?",
            (job_id, user_id)
        ).fetchone()
        
        print(f"Rows found by DELETE WHERE clause: {rows['c']}")

    finally:
        conn.close()

if __name__ == "__main__":
    check_delete()
