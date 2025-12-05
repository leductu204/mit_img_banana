# routers/jobs.py
from fastapi import APIRouter, HTTPException
from app.services.providers.higgsfield_client import higgsfield_client
from app.schemas.higgsfield import JobStatusResponse

router = APIRouter()

@router.get("/")
async def list_jobs():
    return []

@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str):
    """Get job status by ID"""
    try:
        result = higgsfield_client.get_job_status(job_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
