# routers/image.py
"""Image generation endpoints with model-specific routes."""

import json
import uuid
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from typing import Optional, List

from app.services.providers.higgsfield_client import higgsfield_client, HiggsfieldClient
from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo
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
from app.services.concurrency_service import ConcurrencyService
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
    speed: Optional[str] = "fast"  # fast (standard) or slow (unlimited)


class NanoBananaProRequest(BaseModel):
    """Request for nano-banana-pro model"""
    prompt: str
    input_images: Optional[List[dict]] = []
    aspect_ratio: str = "9:16"
    resolution: str = "1k"  # 1k, 2k, 4k
    speed: Optional[str] = "fast"  # fast (standard) or slow (unlimited)


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
        print(f"Error fetching Higgsfield account: {e}")
    
    # Fallback to default
    return higgsfield_client


# ============================================
# UPLOAD ENDPOINTS
# ============================================

@router.post("/upload", response_model=UploadURLResponse)
async def create_upload_url(
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a presigned URL for image upload."""
    try:
        client = get_higgsfield_client()
        result = client.create_reference_media()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create reference media")


@router.post("/upload/batch", response_model=UploadURLResponse)
async def create_batch_upload_url(
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a presigned URL for batch image upload."""
    try:
        client = get_higgsfield_client()
        result = client.batch_media()
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
        client = get_higgsfield_client()
        response_text = client.check_upload(request.img_id)
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
        client = get_higgsfield_client()
        result = client.upload_image_complete(image_data)
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
    job_type = "i2i" if request.input_images else "t2i"
    
    try:
        # 1. Calculate cost
        cost = credits_service.calculate_generation_cost(
            model=model,
            aspect_ratio=request.aspect_ratio,
            speed=request.speed
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
            
        # 3. Check Concurrent limits (Plan Limits)
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, job_type)
        can_start = limit_check.get("can_start", limit_check["allowed"])
        can_queue = limit_check.get("can_queue", True)
        
        # If neither start nor queue is possible, reject with 429
        if not can_start and not can_queue:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Queue full",
                    "message": limit_check.get("reason", "Queue limit reached. Please wait for existing jobs to complete."),
                    "current_usage": limit_check.get("current_usage"),
                    "limits": limit_check.get("limits")
                }
            )
        
        # Prepare Job ID (Local UUID)
        job_id = str(uuid.uuid4())
        status = "pending"
        
        # 4. Create job in database (PENDING)
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type=job_type,
            model=model,
            prompt=request.prompt,
            input_params=json.dumps({
                "aspect_ratio": request.aspect_ratio,
                "speed": request.speed
            }),
            input_images=json.dumps([img if isinstance(img, dict) else img for img in (request.input_images or [])]),
            credits_cost=cost,
            provider_job_id=None
        )
        jobs_repo.create(job_data, status=status)
        
        provider_job_id = None
        
        if can_start:
            try:
                # 5. Generate image via Higgsfield API (Only if allowed)
                # fast -> use_unlim=False (standard queue)
                # slow -> use_unlim=True (relaxed queue)
                use_unlim = True if request.speed == "slow" else False
                
                client = get_higgsfield_client()
                provider_job_id = client.generate_image(
                    prompt=request.prompt,
                    input_images=request.input_images or [],
                    aspect_ratio=request.aspect_ratio,
                    model=model,
                    use_unlim=use_unlim
                )
                
                if not provider_job_id:
                     raise Exception("No provider job ID returned")
                
                # Update job with provider ID and set to Processing
                start_status = "processing"
                jobs_repo.set_provider_id(job_id, provider_job_id)
                jobs_repo.update_status(job_id, start_status)
                
            except Exception as e:
                # Update Logic: Mark as failed if provider call fails
                jobs_repo.update_status(job_id, "failed", error_message=str(e))
                print(f"Provider call failed for job {job_id}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to create job on provider: {str(e)}")

        
        # 6. Deduct credits (creates credit_transaction with FK to job)
        # Only deduct if we successfully reached here (meaning provider call didn't raise exception)
        reason = f"Image generation: {model} {request.aspect_ratio} ({request.speed})"
        
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
        # Check if job was already created (by checking if we likely passed that stage)
        # But difficult to know here without variable scope. 
        # Ideally robust error handling is inside the specific block.
        # Global catch-all
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
    job_type = "i2i" if request.input_images else "t2i"
    
    try:
        # 1. Calculate cost
        cost = credits_service.calculate_generation_cost(
            model=model,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            speed=request.speed
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
            
        # 3. Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, job_type)
        can_start = limit_check.get("can_start", limit_check["allowed"])
        can_queue = limit_check.get("can_queue", True)
        
        # If neither start nor queue is possible, reject with 429
        if not can_start and not can_queue:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Queue full",
                    "message": limit_check.get("reason", "Queue limit reached. Please wait for existing jobs to complete."),
                    "current_usage": limit_check.get("current_usage"),
                    "limits": limit_check.get("limits")
                }
            )
        
        # Prepare Job ID (Local UUID)
        job_id = str(uuid.uuid4())
        status = "pending"
        
        # 4. Create job in database (PENDING)
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
            credits_cost=cost,
            provider_job_id=None
        )
        jobs_repo.create(job_data, status=status)

        provider_job_id = None
        
        if can_start:
            try:
                # 5. Generate image via Higgsfield API
                use_unlim = True if request.speed == "slow" else False
                
                client = get_higgsfield_client()
                provider_job_id = client.generate_image(
                    prompt=request.prompt,
                    input_images=request.input_images or [],
                    aspect_ratio=request.aspect_ratio,
                    resolution=request.resolution,
                    model=model,
                    use_unlim=use_unlim
                )
                
                if not provider_job_id:
                     raise Exception("No provider job ID returned")

                # Update job
                start_status = "processing"
                jobs_repo.set_provider_id(job_id, provider_job_id)
                jobs_repo.update_status(job_id, start_status)
                
            except Exception as e:
                jobs_repo.update_status(job_id, "failed", error_message=str(e))
                print(f"Provider call failed for job {job_id}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to create job on provider: {str(e)}")
        
        
        # 6. Deduct credits
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


# ============================================
# GOOGLE IMAGE ENDPOINTS (Veo/Gemini/Imagen)
# ============================================

from app.services.providers.google_client import google_veo_client
from app.services.providers.playwright_solver import solve_recaptcha_playwright
import asyncio
from concurrent.futures import ProcessPoolExecutor

async def _generate_google_image(
    model: str,
    request: NanoBananaRequest,
    current_user: UserInDB
) -> GenerateResponse:
    """
    Helper for Google image generation models.
    """
    job_type = "t2i" # Google models currently T2I only for this endpoints
    
    try:
        # 1. Calculate cost
        cost = credits_service.calculate_generation_cost(
            model=model,
            aspect_ratio=request.aspect_ratio,
            speed="default" 
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
            
        # 3. Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, job_type)
        can_start = limit_check.get("can_start", limit_check["allowed"])
        
        if not can_start:
             raise HTTPException(
                status_code=429,
                detail={
                    "error": "Queue limit reached",
                    "message": "Please wait for your other generations to finish."
                }
            )
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        status = "pending"
        
        # 4. Create Job in DB (PENDING)
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type=job_type,
            model=model,
            prompt=request.prompt,
            input_params=json.dumps({
                "aspect_ratio": request.aspect_ratio
            }),
            input_images=json.dumps([]),
            credits_cost=cost,
            provider_job_id=None
        )
        jobs_repo.create(job_data, status=status)
        
        # 5. Generate immediately
        try:
            # Use Isolated Solver in a separate thread
            from app.services.providers.playwright_solver import get_token_isolated
            from concurrent.futures import ThreadPoolExecutor
            
            loop = asyncio.get_event_loop()
            
            recaptcha_token, user_agent = await loop.run_in_executor(
                ThreadPoolExecutor(), 
                get_token_isolated,
                '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV',
                'https://labs.google',
                'IMAGE_GENERATION'
            )
            
            if not recaptcha_token:
                raise ValueError("Failed to retrieve reCAPTCHA token")

            # Call Google Client
            result_str = google_veo_client.generate_image(
                prompt=request.prompt,
                recaptchaToken=recaptcha_token,
                model=model,
                aspect_ratio=request.aspect_ratio,
                input_images=request.input_images,
                user_agent=user_agent
            )
            
            if not result_str or not result_str.startswith("image|"):
                 raise ValueError("Invalid response from provider")
                 
            image_url = result_str.split("|")[1]
            
            # Update to COMPLETED
            jobs_repo.update_status(job_id, "completed", output_url=image_url)
            
        except Exception as e:
            # Update to FAILED
            print(f"Google Generation Failed: {e}")
            jobs_repo.update_status(job_id, "failed", error_message=str(e))
            raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")
        
        # 6. Deduct credits
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

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Google Image Generation error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")


@router.post("/nano-banana-cheap/generate", response_model=GenerateResponse)
async def generate_nano_banana_cheap(
    request: NanoBananaRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate image using Nano Banana Cheap (Google Gemini)."""
    return await _generate_google_image("nano-banana-cheap", request, current_user)


@router.post("/nano-banana-pro-cheap/generate", response_model=GenerateResponse)
async def generate_nano_banana_pro_cheap(
    request: NanoBananaRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate image using Nano Banana Pro Cheap (Google Gemini Pro)."""
    return await _generate_google_image("nano-banana-pro-cheap", request, current_user)


@router.post("/image-4.0/generate", response_model=GenerateResponse)
async def generate_image_4_0(
    request: NanoBananaRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate image using Imagen 4.0 (Google Imagen)."""
    return await _generate_google_image("image-4.0", request, current_user)


@router.post("/google/upload", response_model=UploadResponse)
async def google_upload_image(
    image: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Upload image to Google for use with Google Client models (Nano Banana Cheap/Fast).
    Returns mediaId as 'id'.
    """
    try:
        image_data = await image.read()
        
        # No Recaptcha needed for upload
        user_agent = None 
        
        media_id = google_veo_client.upload_image_bytes(
            image_data, 
            aspect_ratio="9:16",
            mime_type=image.content_type or "image/jpeg",
            user_agent=user_agent
        )
        
        if not media_id:
            raise HTTPException(status_code=500, detail="Failed to upload to Google (No Media ID)")
            
        return UploadResponse(
            id=media_id,
            url="", # No public URL
            width=0, # Dimensions not returned by upload
            height=0
        )

    except Exception as e:
        import traceback
        print(f"Google Upload failed: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image to Google: {str(e)}")
