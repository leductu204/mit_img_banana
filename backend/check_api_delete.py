
import sys
import os
import requests
import json
from datetime import timedelta
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env variables BEFORE importing app config
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from app.database.db import get_db_connection
from app.utils.jwt_utils import create_access_token
from app.repositories import jobs_repo

def check_api_delete():
    print("--- Checking API Delete ---")
    
    conn = get_db_connection()
    try:
        # 1. Fetch User
        cursor = conn.execute("SELECT * FROM users WHERE email LIKE '%leduc%'")
        user = cursor.fetchone()
        if not user:
            print("User not found")
            return
            
        user_id = user['user_id']
        email = user['email']
        
        # 2. Fetch Job
        jobs, _ = jobs_repo.get_by_user(user_id, page=1, limit=1)
        if not jobs:
            print("No jobs to delete")
            return
            
        target_job = jobs[0]
        job_id = target_job['job_id']
        print(f"Target Job: {job_id} | Owner: {target_job['user_id']}")
        
        # 3. Generate Token matching the implementation in GoogleOAuthService
        token = create_access_token(
            user_id=user_id,
            email=email
        )
        print(f"Generated Token for {user_id}")
        
        # 4. Call API
        url = "http://127.0.0.1:8000/api/jobs/batch-delete"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = [job_id]
        
        print(f"Sending DELETE request to {url} with payload {payload}")
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            print(f"Response Status: {response.status_code}")
            print(f"Response Body: {response.text}")
        except Exception as e:
            print(f"Request failed: {e}")

    finally:
        conn.close()

if __name__ == "__main__":
    check_api_delete()
