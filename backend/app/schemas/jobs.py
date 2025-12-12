# schemas/jobs.py
"""Pydantic models for job status and listings."""

from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime


JobType = Literal["t2i", "i2i", "t2v", "i2v"]
JobStatus = Literal["pending", "processing", "completed", "failed", "cancelled"]


class InputImage(BaseModel):
    """Reference image used in generation."""
    id: str
    url: str
    width: Optional[int] = None
    height: Optional[int] = None
    type: str = "media_input"


class JobBase(BaseModel):
    """Base job fields."""
    type: JobType
    model: str
    prompt: str
    input_params: Optional[str] = None  # JSON string
    input_images: Optional[str] = None  # JSON array string


class JobCreate(JobBase):
    """Data for creating a new job record."""
    job_id: str
    user_id: str
    credits_cost: int


class JobInDB(JobBase):
    """Full job record as stored in database."""
    job_id: str
    user_id: str
    status: JobStatus = "pending"
    output_url: Optional[str] = None
    credits_cost: int
    credits_refunded: bool = False
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobInfo(BaseModel):
    """Job info for listings (simplified)."""
    job_id: str
    type: JobType
    model: str
    prompt: str
    status: JobStatus
    output_url: Optional[str] = None
    credits_cost: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    input_params: Optional[str] = None
    input_images: Optional[str] = None

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    """Paginated list of jobs."""
    jobs: List[JobInfo]
    total: int
    page: int
    pages: int
    limit: int


class JobStatusResponse(BaseModel):
    """Response from job status check."""
    job_id: str
    status: JobStatus
    result: Optional[str] = None  # Output URL when completed
    error_message: Optional[str] = None
    credits_cost: Optional[int] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class GenerateResponse(BaseModel):
    """Response from generate endpoint."""
    job_id: str
    credits_cost: int
    credits_remaining: int
