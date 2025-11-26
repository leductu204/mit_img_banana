# schemas/jobs.py
"""Pydantic models for job status and listings."""

from pydantic import BaseModel
from typing import List, Optional

class JobInfo(BaseModel):
    job_id: str
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class JobListResponse(BaseModel):
    jobs: List[JobInfo]
