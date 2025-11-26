# repositories/jobs_repo.py
"""Placeholder repository for job persistence (e.g., Supabase/Postgres)."""

def create_job_record(data: dict):
    # Insert into DB – placeholder
    return {"job_id": "dummy-id", "data": data}

def get_job_record(job_id: str):
    # Retrieve from DB – placeholder
    return {"job_id": job_id, "status": "pending"}
