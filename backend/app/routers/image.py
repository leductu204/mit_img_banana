# routers/image.py
"""Image generation endpoints with model-specific routes."""

import json
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from typing import Optional, List

from app.services.providers.higgsfield_client import higgsfield_client
from app.schemas.higgsfield import (
    UploadURLResponse,
    UploadCheckRequest,
    UploadCheckResponse,
)
from app.schemas.jobs import GenerateResponse, JobCreate
from app.schemas.users import UserInDB
from app.deps import get_current_user
from app.services.credits_service import credits_service, InsufficientCreditsError
from app.services.cost_calculator import CostCalculationError
from app.repositories import jobs_repo
from pydantic import BaseModel


router = APIRouter(tags=["image"])


# ============================================
# SCHEMAS
# ============================================

class UploadResponse(BaseModel):
    id: str
    url: str
    width: int
    height: int


class NanoBananaRequest(BaseModel):
    """Request for nano-banana model (standard)"""
    prompt: str
    input_images: Optional[List[dict]] = []
    aspect_ratio: str = "9:16"


class NanoBananaProRequest(BaseModel):
    """Request for nano-banana-pro model"""
    prompt: str
    input_images: Optional[List[dict]] = []
    aspect_ratio: str = "9:16"
    resolution: str = "1k"  # 1k, 2k, 4k


# ============================================
# UPLOAD ENDPOINTS
# ============================================

@router.post("/upload", response_model=UploadURLResponse)
async def create_upload_url(
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a presigned URL for image upload."""
    try:
        result = higgsfield_client.create_reference_media()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create reference media")


@router.post("/upload/batch", response_model=UploadURLResponse)
async def create_batch_upload_url(
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a presigned URL for batch image upload."""
    try:
        result = higgsfield_client.batch_media()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create batch media")


@router.post("/upload/check", response_model=UploadCheckResponse)
async def check_upload(
    request: UploadCheckRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Verify that an image has been successfully uploaded."""
    try:
        response_text = higgsfield_client.check_upload(request.img_id)
        return {"status": "success", "message": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to check upload")


@router.post("/upload/complete", response_model=UploadResponse)
async def upload_image_complete(
    image: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Upload image directly (server-side upload).
    Returns image metadata including dimensions.
    """
    try:
        image_data = await image.read()
        result = higgsfield_client.upload_image_complete(image_data)
        return UploadResponse(
            id=result["id"],
            url=result["url"],
            width=result["width"],
            height=result["height"]
        )
    except Exception as e:
        import traceback
        print(f"Upload failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to upload image")


# ============================================
# NANO BANANA (STANDARD) ENDPOINT
# ============================================

@router.post("/nano-banana/generate", response_model=GenerateResponse)
async def generate_nano_banana(
    request: NanoBananaRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate image using Nano Banana (standard model).
    
    Cost: 1-2 credits based on aspect ratio.
    """
    model = "nano-banana"
    
    try:
        # 1. Calculate cost
        cost = credits_service.calculate_generation_cost(
            model=model,
            aspect_ratio=request.aspect_ratio
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
        job_id = higgsfield_client.generate_image(
            prompt=request.prompt,
            input_images=request.input_images or [],
            aspect_ratio=request.aspect_ratio,
            model=model
        )
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create job")
        
        # 4. Determine job type
        job_type = "i2i" if request.input_images else "t2i"
        
        # 5. Create job in database FIRST (before credit transaction to satisfy FK)
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type=job_type,
            model=model,
            prompt=request.prompt,
            input_params=json.dumps({
                "aspect_ratio": request.aspect_ratio
            }),
            input_images=json.dumps([img if isinstance(img, dict) else img for img in (request.input_images or [])]),
            credits_cost=cost
        )
        jobs_repo.create(job_data)
        
        # 6. Deduct credits (creates credit_transaction with FK to job)
        reason = f"Image generation: {model} {request.aspect_ratio}"
        
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=reason
        )
        
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
        import traceback
        print(f"Generation error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to generate image")


# ============================================
# NANO BANANA PRO ENDPOINT
# ============================================

@router.post("/nano-banana-pro/generate", response_model=GenerateResponse)
async def generate_nano_banana_pro(
    request: NanoBananaProRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate image using Nano Banana Pro (high quality model).
    
    Cost: 3-12 credits based on resolution and aspect ratio.
    """
    model = "nano-banana-pro"
    
    try:
        # 1. Calculate cost
        cost = credits_service.calculate_generation_cost(
            model=model,
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
        job_id = higgsfield_client.generate_image(
            prompt=request.prompt,
            input_images=request.input_images or [],
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            model=model
        )
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create job")
        
        # 4. Determine job type
        job_type = "i2i" if request.input_images else "t2i"
        
        # 5. Create job in database FIRST (before credit transaction to satisfy FK)
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type=job_type,
            model=model,
            prompt=request.prompt,
            input_params=json.dumps({
                "aspect_ratio": request.aspect_ratio,
                "resolution": request.resolution
            }),
            input_images=json.dumps([img if isinstance(img, dict) else img for img in (request.input_images or [])]),
            credits_cost=cost
        )
        jobs_repo.create(job_data)
        
        # 6. Deduct credits (creates credit_transaction with FK to job)
        reason = f"Image generation: {model} {request.aspect_ratio} {request.resolution}"
        
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=reason
        )
        
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
        import traceback
        print(f"Generation error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to generate image")
