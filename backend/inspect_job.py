
import sys
import os
from pathlib import Path
import sqlite3

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from app.database.db import get_db_connection

def inspect():
    job_id = '922ffbe3-b59f-4c25-954e-d8779f6822cf'
    print(f"Inspecting job: {job_id}")
    try:
        conn = get_db_connection()
        job = conn.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
        conn.close()
        
        if not job:
            print("Job NOT FOUND!")
            return

        print(f"Status: {job['status']}")
        print(f"Error Message: {job['error_message']}")
        print(f"Created At: {job['created_at']}")
        provider_id = job['provider_job_id']
        print(f"Provider Job ID: {provider_id}")
        print(f"Provider ID Length: {len(provider_id) if provider_id else 0}")
        print(f"Provider ID Segments: {provider_id.split('-') if provider_id else []}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
