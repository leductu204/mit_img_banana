from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from typing import Optional, List
from pydantic import BaseModel
import logging

from app.services.providers.higgsfield_client import HiggsfieldClient
from app.repositories.higgsfield_accounts_repo import higgsfield_accounts_repo
from app.repositories import jobs_repo
from app.services.account_scheduler import account_scheduler

from app.deps import get_current_user
from app.schemas.users import UserInDB
from app.schemas.jobs import JobCreate
import json

router = APIRouter(prefix="/motion", tags=["Motion Control"])

logger = logging.getLogger(__name__)

@router.post("/estimate-cost")
async def estimate_motion_cost(
    motion_video: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Upload video to provider and calculate estimated cost based on duration.
    Returns video ID, URL, duration, and cost per resolution.
    """
    try:
        # Select account
        selected_account_id = account_scheduler.select_account_for_job('t2v', 'motion-control')
        if not selected_account_id:
            raise HTTPException(status_code=503, detail="No active Higgsfield accounts available")
        client = HiggsfieldClient.create_from_account(selected_account_id)

        # Upload
        video_bytes = await motion_video.read()
        logger.info(f"Uploading video for estimation ({len(video_bytes)} bytes)...")
        video_details = client.upload_video_complete(video_bytes)
        
        duration = video_details.get("duration", 0) or 0
        from app.services.cost_calculator import calculate_cost
        
        cost_720p = calculate_cost(model="motion-control", duration=f"{duration}s", resolution="720p")
        cost_1080p = calculate_cost(model="motion-control", duration=f"{duration}s", resolution="1080p")
        
        return {
            "id": video_details["id"],
            "url": video_details["url"],
            "width": video_details["width"],
            "height": video_details["height"],
            "duration": duration,
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
        # Get client
        if account_id:
            client = HiggsfieldClient.create_from_account(account_id)
        else:
            selected_account_id = account_scheduler.select_account_for_job('t2v', 'motion-control')
            if not selected_account_id:
                raise HTTPException(status_code=503, detail="No active Higgsfield accounts available")
            client = HiggsfieldClient.create_from_account(selected_account_id)

        video_details = {}
        
        if motion_video_id:
            logger.info(f"Using existing video ID: {motion_video_id}")
            # Skip check_video_status because it fails on 2nd call (404)
            # Use duration passed from frontend (calculated during estimation)
            
            video_details = {
                "id": motion_video_id,
                "width": 576, # Default/Fallback - Ideally should also pass these or re-fetch if possible (but we can't)
                "height": 1024,
                "duration": duration if duration else 5,
                "url": motion_video_url 
            }
            
            if not video_details.get("url"):
                raise HTTPException(status_code=400, detail="Could not determine video URL. Please re-upload.")

        elif motion_video:
            # Upload new
            video_bytes = await motion_video.read()
            logger.info(f"Uploading motion video ({len(video_bytes)} bytes)...")
            video_details = client.upload_video_complete(video_bytes)
            logger.info(f"Video uploaded: {video_details['id']}")
        else:
             raise HTTPException(status_code=400, detail="Either motion_video or motion_video_id must be provided")

        # 1b. If using ID, we need URL. Let's add motion_video_url to params if missing.
        # But wait, I can't modify the function signature inside the function.
        # I'll add motion_video_url to the signature below (re-writing the chunk).

        # 3. Calculate Cost
        duration = video_details.get("duration", 0) or 0
        resolution = "1080p" if mode == "pro" else "720p"
        
        from app.services.cost_calculator import calculate_cost
        cost = calculate_cost(
            model="motion-control",
            duration=f"{duration}s",
            resolution=resolution
        )
        logger.info(f"Video duration: {duration}s -> Cost: {cost} credits (Model: motion-control, Res: {resolution})")

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

        # 5. Upload Image
        image_bytes = await character_image.read()
        logger.info(f"Uploading character image ({len(image_bytes)} bytes)...")
        image_details = client.upload_image_complete(image_bytes)
        logger.info(f"Image uploaded: {image_details['id']}")
        
        # 6. Trigger Generation
        logger.info("Triggering motion control generation...")
        
        # Ensure we have a URL for the video
        video_url = video_details.get("url")
        # If we didn't get it from check_status or upload (impossible for upload), we might need it from form.
        # I will hack: If URL is missing and we have ID, assume frontend passed it in a generic way?
        # No, better: I will require motion_video_url in the form if motion_video_id is used.
        
        job_id = client.generate_motion_control(
            mode=mode,
            background_source=background_source,
            video_info={
                "id": video_details["id"],
                "url": video_url, # Check NOTE below
                "type": "video_input", 
                "width": video_details.get("width", 576),
                "height": video_details.get("height", 1024)
            },
            image_info={
                "id": image_details["id"],
                "url": image_details["url"], 
                "type": "media_input"
            }
        )
        
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
                "duration": duration,
                "background_source": background_source,
                "resolution": resolution,
                "motion_video_id": video_details.get("id"),
                "character_image_id": image_details.get("id")
            }),
            credits_cost=cost,
            provider_job_id=job_id
        )
        jobs_repo.create(job_create, status="processing")

        # 8. Deduct Credits
        reason = f"Motion Control: {mode} ({duration}s)"
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
