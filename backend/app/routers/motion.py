from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from typing import Optional, List
from pydantic import BaseModel
import logging
import json
import uuid

from app.services.providers.kling_client import KlingClient
from app.repositories.kling_accounts_repo import kling_accounts_repo
from app.repositories import jobs_repo
from app.repositories import model_costs_repo
from app.services.account_scheduler import account_scheduler
from app.services.concurrency_service import ConcurrencyService

from app.deps import get_current_user
from app.schemas.users import UserInDB
from app.schemas.jobs import JobCreate

router = APIRouter(prefix="/motion", tags=["Motion Control"])

logger = logging.getLogger(__name__)

@router.post("/estimate-cost")
async def estimate_motion_cost(
    motion_video: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Upload video to provider and return fixed costs from configuration.
    Returns video ID, URL, and configured cost per resolution.
    """
    try:
        # Select Kling account
        accounts = kling_accounts_repo.list_accounts(active_only=True)
        if not accounts:
            raise HTTPException(status_code=503, detail="No active Kling accounts available")
        selected_account_id = accounts[0]['account_id']
        client = KlingClient.create_from_account(selected_account_id)

        # Upload video using Kling
        video_bytes = await motion_video.read()
        logger.info(f"Uploading video to Kling ({len(video_bytes)} bytes)...")
        upload_result = client.upload_video_bytes(video_bytes, "motion_video.mp4")
        
        if not upload_result:
            raise HTTPException(status_code=500, detail="Failed to upload video")
        
        video_url, video_cover_url = upload_result
        
        # Get configurable fixed costs
        cost_720p = model_costs_repo.get_cost("motion-control", "720p") or 500
        cost_1080p = model_costs_repo.get_cost("motion-control", "1080p") or 800

        return {
            "video_url": video_url,
            "video_cover_url": video_cover_url,
            "costs": {
                "720p": cost_720p,
                "1080p": cost_1080p
            },
            "account_id": selected_account_id
        }
    except Exception as e:
        logger.error(f"Estimation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_motion(
    motion_video: Optional[UploadFile] = File(None),
    motion_video_id: Optional[str] = Form(None),
    motion_video_url: Optional[str] = Form(None),
    video_cover_url: Optional[str] = Form(None),
    duration: Optional[float] = Form(None),
    character_image: UploadFile = File(...),
    mode: str = Form("std"),
    background_source: str = Form("input_image"),
    account_id: Optional[int] = Form(None),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate motion control video.
    Supports either uploading a new video OR providing an existing video_id (from estimate-cost).
    """
    try:
        # Get Kling client
        if account_id:
            client = KlingClient.create_from_account(account_id)
        else:
            accounts = kling_accounts_repo.list_accounts(active_only=True)
            if not accounts:
                raise HTTPException(status_code=503, detail="No active Kling accounts available")
            selected_account_id = accounts[0]['account_id']
            client = KlingClient.create_from_account(selected_account_id)

        # Get video URL and cover from form parameters
        if not motion_video_url:
            raise HTTPException(status_code=400, detail="motion_video_url is required (from estimate-cost)")
        
        video_url = motion_video_url
        video_cover_url = motion_video_url  # Placeholder - ideally frontend passes this

        # 3. Get Configurable Fixed Cost
        config_key = "1080p" if mode == "pro" else "720p"
        cost = model_costs_repo.get_cost("motion-control", config_key)
        
        # Fallback if not configured
        if cost is None:
            cost = 800 if mode == "pro" else 500
            
        logger.info(f"Motion Control Cost: {cost} credits (Mode: {mode})")

        # 4. Check Credits
        from app.services.credits_service import credits_service, InsufficientCreditsError
        try:
            has_enough, current_balance = credits_service.check_credits(
                current_user.user_id, cost
            )
            
            if not has_enough:
                 raise InsufficientCreditsError(cost, current_balance)
        
        except InsufficientCreditsError as e:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "Insufficient credits",
                    "required": cost,
                    "available": e.available
                }
            )

        # 5. Check Concurrent Limits
        job_type = "i2v" # Motion Control is treat as Image-to-Video
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
            
        # 6. Upload Character Image to Kling (Required for queuing)
        # We must do this BEFORE creating the job so we can store the URL
        image_bytes = await character_image.read()
        logger.info(f"Uploading character image to Kling ({len(image_bytes)} bytes)...")
        image_url = client.upload_image_bytes(image_bytes, "character.png")
        
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to upload character image")
            
        logger.info(f"Image uploaded: {image_url}")

        # Prepare Job ID (Local UUID)
        job_id = str(uuid.uuid4())
        status = "pending"
        
        # 7. Create Job Record (PENDING)
        job_create = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type=job_type,
            model="motion-control",
            status="pending",
            prompt="Motion Control Generation",
            input_params=json.dumps({
                "mode": mode,
                "background_source": background_source,
                "video_url": video_url,
                "video_cover_url": video_cover_url or video_url, # Store cover url too
                "modal_id": KlingClient.DEFAULT_MODAL_ID
            }),
            input_images=json.dumps([{"url": image_url}]), # Store character image for Dispatcher
            credits_cost=cost,
            provider_job_id=None
        )
        jobs_repo.create(job_create, status="pending")

        # 8. Trigger Generation (Only if allowed to start)
        if can_start:
            try:
                logger.info("Triggering Kling motion control generation...")
                
                result = client.generate_motion_control(
                    image_url=image_url,
                    video_url=video_url,
                    video_cover_url=video_cover_url,
                    mode=mode
                )
                
                if not result:
                    raise Exception("Failed to start generation (provider returned None)")
                
                task_id, creative_id = result
                provider_job_id = task_id
                
                if not provider_job_id:
                    raise Exception("Failed to start generation job (no task_id)")
                    
                # Update to PROCESSING
                jobs_repo.set_provider_id(job_id, provider_job_id)
                jobs_repo.update_status(job_id, "processing")
                
            except Exception as e:
                # Update to FAILED
                jobs_repo.update_status(job_id, "failed", error_message=str(e))
                logger.error(f"Motion control processing failed for job {job_id}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to create motion job: {str(e)}")

        # 9. Deduct Credits
        reason = f"Motion Control: {mode} (Kling)"
        credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=reason
        )
            
        return {"job_id": job_id, "status": "processing" if can_start else "pending"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Motion control processing failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
