from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from typing import Optional, List
from pydantic import BaseModel
import logging
import json

from app.services.providers.kling_client import KlingClient
from app.repositories.kling_accounts_repo import kling_accounts_repo
from app.repositories import jobs_repo
from app.repositories import model_costs_repo
from app.services.account_scheduler import account_scheduler

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

        # 5. Upload Image (Kling)
        image_bytes = await character_image.read()
        logger.info(f"Uploading character image to Kling ({len(image_bytes)} bytes)...")
        image_url = client.upload_image_bytes(image_bytes, "character.png")
        
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to upload image")
        
        logger.info(f"Image uploaded: {image_url}")
        
        # 6. Trigger Generation (Kling with default modal ID)
        logger.info("Triggering Kling motion control generation...")
        
        result = client.generate_motion_control(
            image_url=image_url,
            video_url=video_url,
            video_cover_url=video_cover_url,
            mode=mode
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to start generation")
        
        task_id, creative_id = result
        job_id = task_id
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to start generation job")

        # 7. Create Job Record
        # We must create the job first because credit transaction references it (Foreign Key)
        job_create = JobCreate(
            job_id=job_id,
            user_id=current_user.user_id,
            type="i2v",  # Motion Control is Image-to-Video
            model="motion-control",
            status="processing",
            prompt="Motion Control Generation",
            input_params=json.dumps({
                "mode": mode,
                "background_source": background_source,
                "video_url": video_url,
                "image_url": image_url,
                "modal_id": KlingClient.DEFAULT_MODAL_ID
            }),
            credits_cost=cost,
            provider_job_id=job_id
        )
        jobs_repo.create(job_create, status="processing")

        # 8. Deduct Credits
        reason = f"Motion Control: {mode} (Kling)"
        credits_service.deduct_credits(
            user_id=current_user.user_id,
            amount=cost,
            job_id=job_id,
            reason=reason
        )
            
        return {"job_id": job_id, "status": "processing"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Motion control processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
