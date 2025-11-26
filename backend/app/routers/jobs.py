# routers/jobs.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_jobs():
    return []

@router.get("/{job_id}")
async def get_job(job_id: str):
    return {"job_id": job_id, "status": "pending"}
