# routers/video.py
"""Video generation endpoints with authentication and credits."""

import json
import uuid
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from typing import Optional, List

from app.services.providers.higgsfield_client import higgsfield_client
from app.services.providers.google_client import google_veo_client
from app.services.providers.selenium_solver import solve_recaptcha_v3_enterprise
from app.schemas.higgsfield import GenerateVideoRequest
from app.schemas.jobs import GenerateResponse, JobCreate
from app.schemas.users import UserInDB
from app.deps import get_current_user
from app.services.credits_service import credits_service, InsufficientCreditsError
from app.services.cost_calculator import CostCalculationError
from app.services.concurrency_service import ConcurrencyService
from app.repositories import jobs_repo
from pydantic import BaseModel


router = APIRouter(tags=["video"])




# ============================================
# SCHEMAS
# ============================================

class UploadResponse(BaseModel):
    id: str
    url: str
    width: int
    height: int


# ============================================
# UPLOAD ENDPOINT (for I2V)
# ============================================

@router.post("/upload", response_model=UploadResponse)
async def upload_image_for_video(
    image: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Upload image for Image-to-Video generation.
    Returns image metadata needed for I2V request.
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
# GENERATION ENDPOINT (JSON body)
# ============================================

@router.post("/generate", response_model=GenerateResponse)
async def generate_video(
    request: GenerateVideoRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate video using Kling models.
    
    Models:
    - kling-2.5-turbo: Fast video generation (5-8 credits)
    - kling-o1-video: Higher quality with aspect ratio options (6-20 credits)
    - kling-2.6: Latest model with audio support (8-22 credits)
    
    Requires authentication and sufficient credits.
    """
    try:
        # 1. Calculate cost
        cost = credits_service.calculate_generation_cost(
            model=request.model,
            aspect_ratio=request.aspect_ratio or "16:9",
            resolution=request.resolution or "720p",
            duration=request.duration,
            audio=request.audio if request.audio is not None else False,
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
        job_type = "i2v" if request.input_images else "t2v"
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, job_type)
        can_start = limit_check["allowed"]
        
        # Prepare Job ID (Local UUID)
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            # 4. Generate video via appropriate API
            veo_models = ["veo3.1-low", "veo3.1-fast", "veo3.1-high"]
            
            if request.model in veo_models:
                # Route to Google Veo 3.1 API
                input_image = None
                if request.input_images and len(request.input_images) > 0:
                    input_image = request.input_images[0]
                
                # Fetch recaptcha token for Google Veo
                SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
                SITE_URL = 'https://labs.google'
                try:
                    recaptcha_token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL)
                except ValueError as captcha_error:
                    # CAPTCHA solving failed - create failed job without charging credits
                    print(f"[CAPTCHA ERROR] Failed to get token: {captcha_error}")
                    
                    # Create failed job (no credits deducted)
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
                        input_images=json.dumps([img if isinstance(img, dict) else img for img in (request.input_images or [])]),
                        credits_cost=0,  # No charge for failed CAPTCHA
                        provider_job_id=None
                    )
                    jobs_repo.create(job_data, status="failed")
                    jobs_repo.update_status(
                        job_id=job_id,
                        status="failed",
                        error_message=f"CAPTCHA verification failed: {str(captcha_error)}"
                    )
                    
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to verify CAPTCHA. Please try again."
                    )
                
                provider_job_id = google_veo_client.generate_video(
                    prompt=request.prompt,
                    model=request.model,
                    aspect_ratio=request.aspect_ratio or "9:16",
                    input_image=input_image,
                    recaptchaToken=recaptcha_token
                )
            else:
                # Route to Higgsfield (Kling models)
                use_unlim = True if request.speed == "slow" else False
                
                provider_job_id = higgsfield_client.generate_video(
                    prompt=request.prompt,
                    model=request.model,
                    duration=request.duration,
                    resolution=request.resolution or "720p",
                    aspect_ratio=request.aspect_ratio or "16:9",
                    audio=request.audio if request.audio is not None else True,
                    input_images=request.input_images or [],
                    use_unlim=use_unlim
                )
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        # 5. Create job in database
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
            input_images=json.dumps([img if isinstance(img, dict) else img for img in (request.input_images or [])]),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        # 6. Deduct credits (creates credit_transaction with FK to job)
        reason = f"Video generation: {request.model} {request.duration}"
        if request.resolution:
            reason += f" {request.resolution}"
        
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
    except ValueError as e:
        # Client errors (like missing cookie or validation)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Video generation error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")


# ============================================
# FORM-BASED ENDPOINTS (for specific models)
# ============================================

@router.post("/kling-2.5-turbo/i2v", response_model=GenerateResponse)
async def generate_kling_turbo_i2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    duration: int = Form(5),
    resolution: str = Form("720p"),
    img_id: str = Form(...),
    img_url: str = Form(...),
    width: int = Form(...),
    height: int = Form(...),
    # Optional End Frame parameters
    end_img_id: Optional[str] = Form(None),
    end_img_url: Optional[str] = Form(None),
    end_width: Optional[int] = Form(None),
    end_height: Optional[int] = Form(None),
    speed: str = Form("fast")
):
    """Kling 2.5 Turbo Image-to-Video (form-based)."""
    try:
        # Calculate cost
        cost = credits_service.calculate_generation_cost(
            model="kling-2.5-turbo",
            duration=f"{duration}s",
            resolution=resolution,
            speed=speed
        )
        
        # Check credits
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "i2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        input_images_data = [{"id": img_id, "url": img_url, "width": width, "height": height}]
        
        if can_start:
            # Determine unlimited usage
            use_unlim = True if speed == "slow" else False

            # Determine mode and end frame
            mode = "std"
            input_image_end = None
            
            if resolution == "1080p":
                mode = "pro"
                if end_img_id and end_img_url:
                    input_image_end = {
                        "type": "media_input",
                        "id": end_img_id,
                        "url": end_img_url,
                        "width": end_width if end_width else width,
                        "height": end_height if end_height else height
                    }
                    input_images_data.append({"id": end_img_id, "url": end_img_url, "width": end_width, "height": end_height})

            # Generate
            provider_job_id = higgsfield_client.send_job_kling_2_5_turbo_i2v(
                prompt=prompt,
                duration=duration,
                resolution=resolution,
                img_id=img_id,
                img_url=img_url,
                width=width,
                height=height,
                input_image_end=input_image_end,
                mode=mode,
                use_unlim=use_unlim
            )
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        # Create job record FIRST
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="i2v",
            model="kling-2.5-turbo",
            prompt=prompt,
            input_params=json.dumps({"duration": duration, "resolution": resolution, "speed": speed, "mode": mode}),
            input_images=json.dumps(input_images_data),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        # Deduct credits AFTER job exists
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: kling-2.5-turbo {duration}s ({speed})"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Kling 2.5 Turbo I2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")


@router.post("/kling-o1/i2v", response_model=GenerateResponse)
async def generate_kling_o1_i2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    duration: int = Form(5),
    aspect_ratio: str = Form("16:9"),
    img_id: str = Form(...),
    img_url: str = Form(...),
    width: int = Form(...),
    height: int = Form(...),
    # Optional End Frame parameters
    end_img_id: Optional[str] = Form(None),
    end_img_url: Optional[str] = Form(None),
    end_width: Optional[int] = Form(None),
    end_height: Optional[int] = Form(None),
    speed: str = Form("fast")
):
    """Kling O1 Video Image-to-Video (form-based)."""
    try:
        cost = credits_service.calculate_generation_cost(
            model="kling-o1-video",
            duration=f"{duration}s",
            aspect_ratio=aspect_ratio,
            resolution="1080p",
            speed=speed
        )
        
        has_enough, current_balance = credits_service.check_credits(current_user.user_id, cost)
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "i2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        input_images_data = [{"id": img_id, "url": img_url, "width": width, "height": height}]
        
        if can_start:
            use_unlim = True if speed == "slow" else False

            # Prepare end frame
            input_image_end = None
            if end_img_id and end_img_url:
                input_image_end = {
                    "type": "media_input",
                    "id": end_img_id,
                    "url": end_img_url,
                    # Fallback to start image dims if end image dims missing
                    "width": end_width if end_width else width,
                    "height": end_height if end_height else height
                }
                input_images_data.append({"id": end_img_id, "url": end_img_url, "width": end_width, "height": end_height})

            provider_job_id = higgsfield_client.send_job_kling_o1_i2v(
                prompt=prompt,
                duration=duration,
                aspect_ratio=aspect_ratio,
                img_id=img_id,
                img_url=img_url,
                width=width,
                height=height,
                input_image_end=input_image_end,
                use_unlim=use_unlim
            )
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        # Create job record FIRST
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="i2v",
            model="kling-o1-video",
            prompt=prompt,
            input_params=json.dumps({"duration": duration, "aspect_ratio": aspect_ratio, "speed": speed}),
            input_images=json.dumps(input_images_data),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        # Deduct credits AFTER job exists
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: kling-o1 {duration}s {aspect_ratio} ({speed})"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Kling O1 I2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")


@router.post("/kling-2.6/t2v", response_model=GenerateResponse)
async def generate_kling_2_6_t2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    duration: int = Form(5),
    aspect_ratio: str = Form("16:9"),
    sound: bool = Form(True),
    speed: str = Form("fast")
):
    """Kling 2.6 Text-to-Video (form-based)."""
    try:
        cost = credits_service.calculate_generation_cost(
            model="kling-2.6",
            duration=f"{duration}s",
            audio=sound,
            speed=speed
        )
        
        has_enough, current_balance = credits_service.check_credits(current_user.user_id, cost)
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "t2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            use_unlim = True if speed == "slow" else False

            provider_job_id = higgsfield_client.send_job_kling_2_6_t2v(
                prompt=prompt,
                duration=duration,
                aspect_ratio=aspect_ratio,
                sound=sound,
                use_unlim=use_unlim
            )
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        # Create job record FIRST
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="t2v",
            model="kling-2.6",
            prompt=prompt,
            input_params=json.dumps({"duration": duration, "aspect_ratio": aspect_ratio, "sound": sound, "speed": speed}),
            input_images=None,
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        # Deduct credits AFTER job exists
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: kling-2.6 {duration}s {'with' if sound else 'no'} audio ({speed})"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Kling 2.6 T2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")


@router.post("/kling-2.6/i2v", response_model=GenerateResponse)
async def generate_kling_2_6_i2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    duration: int = Form(5),
    sound: bool = Form(True),
    img_id: str = Form(...),
    img_url: str = Form(...),
    width: int = Form(...),
    height: int = Form(...),
    speed: str = Form("fast")
):
    """Kling 2.6 Image-to-Video (form-based)."""
    try:
        cost = credits_service.calculate_generation_cost(
            model="kling-2.6",
            duration=f"{duration}s",
            audio=sound,
            speed=speed
        )
        
        has_enough, current_balance = credits_service.check_credits(current_user.user_id, cost)
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "i2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            use_unlim = True if speed == "slow" else False

            provider_job_id = higgsfield_client.send_job_kling_2_6_i2v(
                prompt=prompt,
                duration=duration,
                sound=sound,
                img_id=img_id,
                img_url=img_url,
                width=width,
                height=height,
                use_unlim=use_unlim
            )
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        # Create job record FIRST
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="i2v",
            model="kling-2.6",
            prompt=prompt,
            input_params=json.dumps({"duration": duration, "sound": sound, "speed": speed}),
            input_images=json.dumps([{"id": img_id, "url": img_url, "width": width, "height": height}]),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        # Deduct credits AFTER job exists
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: kling-2.6 i2v {duration}s ({speed})"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Kling 2.6 I2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")


# ============================================
# VEO 3.1 ENDPOINTS
# ============================================

@router.post("/veo3_1-low/t2v", response_model=GenerateResponse)
async def generate_veo31_low_t2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    aspect_ratio: str = Form("9:16")
):
    """Veo 3.1 LOW Text-to-Video (form-based)."""
    try:
        # Calculate cost
        cost = credits_service.calculate_generation_cost(
            model="veo3.1-low",
            duration="8s",  # Veo models are fixed 8s
            aspect_ratio=aspect_ratio
        )
        
        # Check credits
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "t2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            # Fetch recaptcha token
            SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
            SITE_URL = 'https://labs.google'
            recaptcha_token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL)
            
            # Generate via Google Veo client
            provider_job_id = google_veo_client.generate_video(
                prompt=prompt,
                model="veo3.1-low",
                aspect_ratio=aspect_ratio,
                input_image=None,  # T2V mode
                recaptchaToken=recaptcha_token
            )
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        # Create job record FIRST
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="t2v",
            model="veo3.1-low",
            prompt=prompt,
            input_params=json.dumps({"aspect_ratio": aspect_ratio}),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        # Deduct credits AFTER job exists
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: veo3.1-low t2v {aspect_ratio}"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Veo 3.1 LOW T2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")


@router.post("/veo3_1-low/i2v", response_model=GenerateResponse)
async def generate_veo31_low_i2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    aspect_ratio: str = Form("9:16"),
    img_url: str = Form(...)
):
    """Veo 3.1 LOW Image-to-Video (form-based)."""
    try:
        # Calculate cost
        cost = credits_service.calculate_generation_cost(
            model="veo3.1-low",
            duration="8s",
            aspect_ratio=aspect_ratio
        )
        
        # Check credits
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "i2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            # Fetch recaptcha token
            SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
            SITE_URL = 'https://labs.google'
            recaptcha_token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL)
            
            # Generate via Google Veo client with image
            provider_job_id = google_veo_client.generate_video(
                prompt=prompt,
                model="veo3.1-low",
                aspect_ratio=aspect_ratio,
                input_image={"url": img_url},
                recaptchaToken=recaptcha_token
            )
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        # Create job record FIRST
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="i2v",
            model="veo3.1-low",
            prompt=prompt,
            input_params=json.dumps({"aspect_ratio": aspect_ratio}),
            input_images=json.dumps([{"url": img_url}]),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        # Deduct credits AFTER job exists
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: veo3.1-low i2v {aspect_ratio}"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Veo 3.1 LOW I2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")


@router.post("/veo3_1-fast/t2v", response_model=GenerateResponse)
async def generate_veo31_fast_t2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    aspect_ratio: str = Form("9:16")
):
    """Veo 3.1 FAST Text-to-Video (form-based)."""
    try:
        cost = credits_service.calculate_generation_cost(
            model="veo3.1-fast",
            duration="8s",
            aspect_ratio=aspect_ratio
        )
        
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "t2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            # Fetch recaptcha token
            SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
            SITE_URL = 'https://labs.google'
            recaptcha_token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL)
            
            job_id = google_veo_client.generate_video(
                prompt=prompt,
                model="veo3.1-fast",
                aspect_ratio=aspect_ratio,
                input_image=None,
                recaptchaToken=recaptcha_token
            )
            provider_job_id = job_id
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="t2v",
            model="veo3.1-fast",
            prompt=prompt,
            input_params=json.dumps({"aspect_ratio": aspect_ratio}),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: veo3.1-fast t2v {aspect_ratio}"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Veo 3.1 FAST T2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {str(e)}")


@router.post("/veo3_1-fast/i2v", response_model=GenerateResponse)
async def generate_veo31_fast_i2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    aspect_ratio: str = Form("9:16"),
    img_url: str = Form(...)
):
    """Veo 3.1 FAST Image-to-Video (form-based)."""
    try:
        cost = credits_service.calculate_generation_cost(
            model="veo3.1-fast",
            duration="8s",
            aspect_ratio=aspect_ratio
        )
        
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "i2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            # Fetch recaptcha token
            SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
            SITE_URL = 'https://labs.google'
            recaptcha_token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL)
            
            job_id = google_veo_client.generate_video(
                prompt=prompt,
                model="veo3.1-fast",
                aspect_ratio=aspect_ratio,
                input_image={"url": img_url},
                recaptchaToken=recaptcha_token
            )
            provider_job_id = job_id
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="i2v",
            model="veo3.1-fast",
            prompt=prompt,
            input_params=json.dumps({"aspect_ratio": aspect_ratio}),
            input_images=json.dumps([{"url": img_url}]),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: veo3.1-fast i2v {aspect_ratio}"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Veo 3.1 FAST I2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to generate video")


@router.post("/veo3_1-high/t2v", response_model=GenerateResponse)
async def generate_veo31_high_t2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    aspect_ratio: str = Form("9:16")
):
    """Veo 3.1 HIGH Text-to-Video (form-based)."""
    try:
        cost = credits_service.calculate_generation_cost(
            model="veo3.1-high",
            duration="8s",
            aspect_ratio=aspect_ratio
        )
        
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
            
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "t2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            # Fetch recaptcha token
            SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
            SITE_URL = 'https://labs.google'
            recaptcha_token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL)
            
            job_id = google_veo_client.generate_video(
                prompt=prompt,
                model="veo3.1-high",
                aspect_ratio=aspect_ratio,
                input_image=None,
                recaptchaToken=recaptcha_token
            )
            provider_job_id = job_id
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="t2v",
            model="veo3.1-high",
            prompt=prompt,
            input_params=json.dumps({"aspect_ratio": aspect_ratio}),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: veo3.1-high t2v {aspect_ratio}"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Veo 3.1 HIGH T2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to generate video")


@router.post("/veo3_1-high/i2v", response_model=GenerateResponse)
async def generate_veo31_high_i2v(
    current_user: UserInDB = Depends(get_current_user),
    prompt: str = Form(...),
    aspect_ratio: str = Form("9:16"),
    img_url: str = Form(...)
):
    """Veo 3.1 HIGH Image-to-Video (form-based)."""
    try:
        cost = credits_service.calculate_generation_cost(
            model="veo3.1-high",
            duration="8s",
            aspect_ratio=aspect_ratio
        )
        
        has_enough, current_balance = credits_service.check_credits(
            current_user.user_id, cost
        )
        if not has_enough:
            raise HTTPException(status_code=402, detail="Insufficient credits")
            
        # Check Concurrent limits
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, "i2v")
        can_start = limit_check["allowed"]
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        provider_job_id = None
        status = "pending"
        
        if can_start:
            # Fetch recaptcha token
            SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
            SITE_URL = 'https://labs.google'
            recaptcha_token = solve_recaptcha_v3_enterprise(SITE_KEY, SITE_URL)
            
            job_id = google_veo_client.generate_video(
                prompt=prompt,
                model="veo3.1-high",
                aspect_ratio=aspect_ratio,
                input_image={"url": img_url},
                recaptchaToken=recaptcha_token
            )
            provider_job_id = job_id
            
            if not provider_job_id:
                raise HTTPException(status_code=500, detail="Failed to create video job on provider")
            
            status = "processing"
        
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="i2v",
            model="veo3.1-high",
            prompt=prompt,
            input_params=json.dumps({"aspect_ratio": aspect_ratio}),
            input_images=json.dumps([{"url": img_url}]),
            credits_cost=cost,
            provider_job_id=provider_job_id
        )
        jobs_repo.create(job_data, status=status)
        
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=f"Video: veo3.1-high i2v {aspect_ratio}"
        )
        
        return GenerateResponse(job_id=job_id, credits_cost=cost, credits_remaining=new_balance)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Veo 3.1 HIGH I2V error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to generate video")

