from fastapi import APIRouter, HTTPException, Body, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import re
import requests
import base64

from app.services.providers.sora_client import sora_client_instance
from app.deps import get_current_user
from app.schemas.users import UserInDB
from app.schemas.jobs import JobCreate
from app.services.credits_service import credits_service, InsufficientCreditsError
from app.services.concurrency_service import ConcurrencyService
from app.repositories import jobs_repo, model_costs_repo
import uuid
import json

router = APIRouter(tags=["sora"])

class SoraDownloadRequest(BaseModel):
    url: str

class SoraDownloadResponse(BaseModel):
    download_url: str

@router.post("/download", response_model=SoraDownloadResponse)
async def download_sora_video(
    request: SoraDownloadRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get direct download link for a Sora video.
    """
    try:
        # Extract post_id from URL
        post_id = request.url
        
        if "sora.chatgpt.com/p/" in request.url:
            match = re.search(r'sora\.chatgpt\.com/p/([^/?#]+)', request.url)
            if match:
                post_id = match.group(1)
            else:
                raise ValueError("Invalid Sora URL format")
        
        # Call provider
        download_link = await sora_client_instance.get_watermark_free_url_sorai(post_id)
        
        return {"download_url": download_link}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/proxy-download")
def proxy_download_sora_video(
    url: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Proxy the video download to enforce 'Save As' behavior and avoid new tab playback.
    """
    try:
        # Stream the content
        # We use a normal def (sync) so FastAPI runs this in a threadpool, preventing blocking
        r = requests.get(url, stream=True, timeout=60)
        r.raise_for_status()
        
        # Extract filename from headers or url, or default
        filename = "sora_video.mp4"
        if "content-disposition" in r.headers:
            # Try to parse filename from header (simplified)
            import cgi
            _, params = cgi.parse_header(r.headers["content-disposition"])
            if "filename" in params:
                filename = params["filename"]

        return StreamingResponse(
            r.iter_content(chunk_size=8192),
            media_type=r.headers.get("content-type", "video/mp4"),
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy download failed: {str(e)}")

class SoraGenerateRequest(BaseModel):
    prompt: str
    duration: int = 15
    ratio: str = "landscape"
    model: str = "sy_8"
    image: Optional[str] = None # Base64 encoded image

@router.post("/generate")
async def generate_sora_video(
    request: SoraGenerateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate a Sora video using active tokens. Supports Text-to-Video and Image-to-Video.
    Requires authentication and sufficient credits.
    """
    try:
        # 0. Determine proper billing key/duration
        billing_duration = f"{request.duration}s"
        # Since repo has 10s and 15s. If 25s requested, we probably lack a cost entry.
        # Let's map to existing costs or fallback.
        if request.duration not in [10, 15]:
            # Maybe fallback to highest cost?
            billing_duration = "15s" # fallback
        
        # 1. Calculate Cost
        # We assume "sora-2.0" is the model key in DB for billing
        billing_model = "sora-2.0" 
        cost_key = f"{billing_duration}-fast" # Assuming standard/fast speed for now
        
        cost = model_costs_repo.get_cost(billing_model, cost_key)
        if cost is None:
            # Fallback costs if DB missing entries
            if request.duration == 10: cost = 20
            elif request.duration >= 15: cost = 30
            else: cost = 30
            
        # 2. Check Credits
        from app.services.credits_service import credits_service, InsufficientCreditsError
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

        # 3. Check Concurrency
        from app.services.concurrency_service import ConcurrencyService
        job_type = "i2v" if request.image else "t2v"
        limit_check = ConcurrencyService.check_can_start_job(current_user.user_id, job_type)
        can_start = limit_check.get("can_start", limit_check["allowed"])
        can_queue = limit_check.get("can_queue", True)
        
        if not can_start and not can_queue:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Queue full",
                    "message": limit_check.get("reason", "Queue limit reached."),
                    "current_usage": limit_check.get("current_usage")
                }
            )

        # Determine n_frames based on duration
        n_frames = 450 # Default 15s
        if request.duration == 10:
             n_frames = 300 
        elif request.duration == 25:
             n_frames = 750
        
        # Prepare Job ID
        job_id = str(uuid.uuid4())
        status = "pending"
        
        # 4. Create Job Record
        job_data = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type=job_type,
            model=request.model, # "sy_8" or similar
            prompt=request.prompt,
            input_params=json.dumps({
                "duration": request.duration, 
                "ratio": request.ratio,
                "n_frames": n_frames
            }),
            input_images=json.dumps([{"base64_truncated": True}]) if request.image else None,
            credits_cost=cost,
            provider_job_id=None
        )
        jobs_repo.create(job_data, status=status)
        
        if can_start:
            try:
                # Handle Image Upload (I2V)
                media_id = None
                if request.image:
                    from app.services.sora_service import sora_service
                    
                    # 1. Get active token (we need it to upload)
                    account = sora_service.get_active_token()
                    if not account:
                        raise HTTPException(status_code=500, detail="No active Sora account found for image upload.")
                    
                    token = account['access_token']
                    
                    # 2. Decode Base64
                    try:
                        image_str = request.image
                        if "," in image_str:
                            image_str = image_str.split(",")[1]
                        
                        image_data = base64.b64decode(image_str)
                    except Exception as e:
                        raise ValueError(f"Invalid image base64: {str(e)}")

                    # 3. Upload Image
                    media_id = await sora_client_instance.upload_image(image_data, token)

                # Generate
                gen_id = await sora_client_instance.generate_video(
                    prompt=request.prompt,
                    model=request.model,
                    n_frames=n_frames,
                    orientation=request.ratio,
                    size="small",
                    media_id=media_id
                )
                
                if not gen_id:
                     raise Exception("No provider job ID returned")
                
                jobs_repo.set_provider_id(job_id, gen_id)
                jobs_repo.update_status(job_id, "processing")
                
            except Exception as e:
                jobs_repo.update_status(job_id, "failed", error_message=str(e))
                raise HTTPException(status_code=500, detail=str(e))
        
        # 5. Deduct Credits
        reason = f"Sora Video: {request.model} {request.duration}s {request.ratio}"
        new_balance = credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=reason
        )
        
        return {"id": job_id, "status": "processing" if can_start else "pending", "credits_remaining": new_balance}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
