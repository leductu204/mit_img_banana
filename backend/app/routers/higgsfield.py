# routers/higgsfield.py
"""Higgsfield API endpoints for image and video generation with auth and credits."""

import json
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from app.services.providers.higgsfield_client import higgsfield_client, HiggsfieldClient
from app.schemas.higgsfield import (
    UploadURLResponse,
    UploadCheckRequest,
    UploadCheckResponse,
    GenerateImageRequest,
    GenerateVideoRequest,
    JobStatusResponse,
    UploadImageResponse
)
from app.schemas.jobs import GenerateResponse, JobCreate
from app.schemas.users import UserInDB
from app.deps import get_current_user, get_current_user_optional
from app.services.credits_service import credits_service, InsufficientCreditsError
from app.services.cost_calculator import CostCalculationError
from app.repositories import jobs_repo
from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["higgsfield"])

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_higgsfield_client():
    """
    Get Higgsfield client using active account from DB (highest priority).
    Falls back to default .env client if no active accounts found.
    """
    try:
        accounts = higgsfield_accounts_repo.list_accounts(active_only=True)
        if accounts:
            # Accounts are already ordered by priority DESC in repo
            # Pick the first one (highest priority)
            account_id = accounts[0]['account_id']
            return HiggsfieldClient.create_from_account(account_id)
    except Exception as e:
        logger.error(f"Error fetching Higgsfield account: {e}")
    
    # Fallback to default
    return higgsfield_client


# ============================================
# PUBLIC ENDPOINTS (no auth required)
# ============================================

@router.get("/token")
async def get_token():
    """Get JWT token for Higgsfield API (internal use)"""
    try:
        client = get_higgsfield_client()
        token = client.get_jwt_token_with_retry()
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# UPLOAD ENDPOINTS (auth required)
# ============================================

@router.post("/media", response_model=UploadURLResponse)
async def create_media_upload(
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Create upload link for media (images/videos).
    Frontend will upload directly to the returned upload_url.
    """
    try:
        client = get_higgsfield_client()
        jwt_token = client.get_jwt_token_with_retry()
        url = f"{client.base_url}/media?require_consent=true"
        headers = client._get_headers(jwt_token)
        headers['content-length'] = '0'
        
        import requests
        response = requests.post(url, headers=headers, data={})
        response.raise_for_status()
        
        data = response.json()
        return {
            "id": data.get("id"),
            "url": data.get("url"),
            "upload_url": data.get("upload_url")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/url", response_model=UploadURLResponse)
async def get_upload_url(
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        client = get_higgsfield_client()
        result = client.get_upload_url()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/reference", response_model=UploadURLResponse)
async def create_reference_media(
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        client = get_higgsfield_client()
        result = client.create_reference_media()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/batch", response_model=UploadURLResponse)
async def batch_media(
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        client = get_higgsfield_client()
        result = client.batch_media()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/check", response_model=UploadCheckResponse)
async def check_upload(
    request: UploadCheckRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    try:
        client = get_higgsfield_client()
        response_text = client.check_upload(request.img_id)
        return {"status": "success", "message": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# GENERATION ENDPOINTS (auth + credits)
# ============================================

@router.post("/generate", response_model=GenerateResponse)
async def generate_image(
    request: GenerateImageRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate image using Nano Banana or Nano Banana Pro.
    
    Requires authentication and sufficient credits.
    Credits are deducted before generation and refunded if job fails.
    """
    try:
        # 1. Calculate cost
        cost = credits_service.calculate_generation_cost(
            model=request.model,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution
        )
        
        # 2. Check credits
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        
        if not has_enough:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "Insufficient credits",
                    "required": cost,
                    "available": current_balance
                }
            )
        
        # 3. Generate image via Higgsfield API
        client = get_higgsfield_client()
        job_id = client.generate_image(
            prompt=request.prompt,
            input_images=request.input_images or [],
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            model=request.model
        )
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create job")
        
        # 4. Determine job type
        job_type = "i2i" if request.input_images else "t2i"
        
        # 5. Deduct credits and create job record
        reason = f"Generated image {request.model} {request.aspect_ratio}"
        if request.resolution:
            reason += f" {request.resolution}"
        
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=reason
        )
        
        # 6. Create job in database
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type=job_type,
            model=request.model,
            prompt=request.prompt,
            input_params=json.dumps({
                "aspect_ratio": request.aspect_ratio,
                "resolution": request.resolution
            }),
            input_images=json.dumps([img.dict() if hasattr(img, 'dict') else img for img in (request.input_images or [])]),
            credits_cost=cost
        )
        jobs_repo.create(job_data)
        
        return GenerateResponse(
            job_id=job_id,
            credits_cost=cost,
            credits_remaining=new_balance
        )
        
    except CostCalculationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InsufficientCreditsError as e:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Insufficient credits",
                "required": e.required,
                "available": e.available
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-video", response_model=GenerateResponse)
async def generate_video(
    request: GenerateVideoRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate video using Kling models.
    
    Requires authentication and sufficient credits.
    Credits are deducted before generation and refunded if job fails.
    """
    try:
        # 1. Calculate cost
        cost = credits_service.calculate_generation_cost(
            model=request.model,
            aspect_ratio=request.aspect_ratio or "16:9",
            resolution=request.resolution or "720p",
            duration=request.duration,
            audio=request.audio if request.audio is not None else False
        )
        
        # 2. Check credits
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        
        if not has_enough:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "Insufficient credits",
                    "required": cost,
                    "available": current_balance
                }
            )
        
        # 3. Generate video via Higgsfield API
        client = get_higgsfield_client()
        job_id = client.generate_video(
            prompt=request.prompt,
            model=request.model,
            duration=request.duration,
            resolution=request.resolution or "720p",
            aspect_ratio=request.aspect_ratio or "16:9",
            audio=request.audio if request.audio is not None else True,
            input_images=request.input_images or []
        )
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create video job")
        
        # 4. Determine job type
        job_type = "i2v" if request.input_images else "t2v"
        
        # 5. Deduct credits and create job record
        reason = f"Generated video {request.model} {request.duration}"
        if request.resolution:
            reason += f" {request.resolution}"
        
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=reason
        )
        
        # 6. Create job in database
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type=job_type,
            model=request.model,
            prompt=request.prompt,
            input_params=json.dumps({
                "aspect_ratio": request.aspect_ratio,
                "resolution": request.resolution,
                "duration": request.duration,
                "audio": request.audio
            }),
            input_images=json.dumps([img.dict() if hasattr(img, 'dict') else img for img in (request.input_images or [])]),
            credits_cost=cost
        )
        jobs_repo.create(job_data)
        
        return GenerateResponse(
            job_id=job_id,
            credits_cost=cost,
            credits_remaining=new_balance
        )
        
    except CostCalculationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InsufficientCreditsError as e:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Insufficient credits",
                "required": e.required,
                "available": e.available
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# JOB STATUS ENDPOINT (auth + refund logic)
# ============================================

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    current_user: Optional[UserInDB] = Depends(get_current_user_optional)
):
    """
    Get job status with automatic refund on failure.
    
    If authenticated, also checks job ownership and triggers refund for failed jobs.
    """
    try:
        # Get latest status from Higgsfield API
        client = get_higgsfield_client()
        result = client.get_job_status(job_id)
        
        # If user is authenticated, update our database
        if current_user:
            # Try to load job from our database
            job = jobs_repo.get_by_id(job_id)
            
            if job:
                # Check ownership
                if job["user_id"] != current_user.user_id:
                    raise HTTPException(
                        status_code=403,
                        detail="You don't have access to this job"
                    )
                
                # Update status in database
                new_status = result.get("status", "processing")
                output_url = result.get("result")
                
                if new_status != job["status"]:
                    # Status changed - update database
                    if new_status == "completed":
                        jobs_repo.update_status(job_id, new_status, output_url=output_url)
                    elif new_status == "failed":
                        error_msg = result.get("error", "Generation failed")
                        jobs_repo.update_status(job_id, new_status, error_message=error_msg)
                        
                        # Trigger refund if not already refunded
                        if not job.get("credits_refunded", False):
                            refund_result = credits_service.refund_credits(
                                user_id=current_user.user_id,
                                job_id=job_id
                            )
                            if refund_result is not None:
                                result["refunded"] = True
                                result["new_balance"] = refund_result
                    else:
                        jobs_repo.update_status(job_id, new_status)
                
                # Add credits info to response
                result["credits_cost"] = job["credits_cost"]
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
