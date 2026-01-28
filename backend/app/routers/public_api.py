from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from typing import Optional
import uuid
from app.middleware.api_key_auth import verify_api_key_dependency
from app.repositories import api_keys_repo, jobs_repo, model_costs_repo, users_repo
from app.schemas.jobs import JobCreate
from app.services.credits_service import credits_service
from app.services.providers.higgsfield_client import get_best_client
from app.services.providers.google_client import google_veo_client
from app.services.providers.sora_client import sora_client_instance as sora_client
from app.services.providers.kling_client import KlingClient
from app.repositories.kling_accounts_repo import kling_accounts_repo

router = APIRouter()

@router.get("/balance")
async def check_balance(
    key_record: dict = Depends(verify_api_key_dependency)
):
    """Check current balance for the API key (returns user's global credits)."""
    user_id = key_record["user_id"]
    current_credits = users_repo.get_credits(user_id) or 0
    
    return {
        "balance": current_credits,
        "key_prefix": key_record["key_prefix"],
        "created_at": key_record["created_at"]
    }

@router.post("/image/generate")
async def public_generate_image(
    prompt: str = Form(...),
    model: str = Form("nano-banana-pro"),
    resolution: str = Form("2k"),
    aspect_ratio: str = Form("16:9"),
    negative_prompt: Optional[str] = Form(None),
    num_inference_steps: Optional[int] = Form(None),
    guidance_scale: Optional[float] = Form(None),
    seed: Optional[int] = Form(None),
    key_record: dict = Depends(verify_api_key_dependency)
):
    """
    Public Image Generation Endpoint.
    Uses API Key balance.
    """
    # 1. Cost Calculation
    try:
        if "pro" in model:
            # nano-banana-pro cost: e.g. "2k-16:9"
            cost = model_costs_repo.get_cost(model, f"{resolution}-{aspect_ratio}")
        else:
            # nano-banana cost: e.g. "1:1"
            cost = model_costs_repo.get_cost(model, aspect_ratio)
            
        if cost is None:
            # Fallback if DB lookup fails
            cost = 6 if "pro" in model else 2
    except Exception:
        cost = 6 if "pro" in model else 2
        
    # 2. Check Balance
    # 2. Check Balance (User's Global Credits)
    user_id = key_record["user_id"]
    has_credits, current_balance = credits_service.check_credits(user_id, cost)
    
    if not has_credits:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient user balance. Required: {cost}, Available: {current_balance}"
        )

    # 3. Call Provider
    try:
        # Check if this is a Google Model (Nano Banana Cheap/Pro Cheap/Imagen 4.0)
        GOOGLE_MODELS = ["nano-banana-cheap", "nano-banana-pro-cheap", "image-4.0"]
        
        if model in GOOGLE_MODELS:
            # === GOOGLE GENERATION LOGIC ===
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            from app.services.providers.playwright_solver import get_token_isolated
            
            # 1. Get Recaptcha Token
            loop = asyncio.get_event_loop()
            recaptcha_token, user_agent = await loop.run_in_executor(
                ThreadPoolExecutor(), 
                get_token_isolated,
                '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV',
                'https://labs.google',
                'IMAGE_GENERATION'
            )
            
            if not recaptcha_token:
                raise ValueError("Failed to retrieve reCAPTCHA token for Google generation")

            # 2. Call Google Client
            # generate_image returns "image|URL"
            result_str = google_veo_client.generate_image(
                prompt=prompt,
                recaptchaToken=recaptcha_token,
                model=model,
                aspect_ratio=aspect_ratio,
                user_agent=user_agent
            )
            
            if not result_str or not result_str.startswith("image|"):
                 raise ValueError("Invalid response from Google provider")
                 
            # Extract URL (removes "image|" prefix)
            job_id = result_str.split("|")[1] 
            
            # Google generation is synchronous/immediate
            status_for_db = "completed"
            
            # NOTE: job_id here is actually the URL for Google models in this implementation
            # We should probably store a UUID as job_id and valid URL as output
            # But to match existing flow, let's generate a UUID for the system job_id
            # and use the URL as the result.
            
            final_image_url = job_id # The "job_id" from logic above is actually the URL
            system_job_id = str(uuid.uuid4())
            
            # 4. Create Job Record
            real_user_id = key_record.get("user_id")
            user_id = real_user_id if real_user_id else "system_public_api"
            
            job_data = JobCreate(
                job_id=system_job_id,
                user_id=user_id,
                type="t2i",
                model=model,
                prompt=prompt,
                credits_cost=cost
            )
            
            jobs_repo.create(job_data, status=status_for_db)
            jobs_repo.update_status(system_job_id, "completed", output_url=final_image_url)
            
            # 5. Deduct Balance
            new_balance = credits_service.deduct_credits(
                user_id=user_id,
                amount=cost,
                job_id=system_job_id,
                reason=f"API Image Gen: {model}"
            )
            
            # Log Usage
            api_keys_repo.log_usage(
                key_id=key_record["key_id"],
                endpoint="/v1/image/generate",
                cost=cost,
                balance_before=current_balance,
                balance_after=new_balance,
                status="success",
                job_id=system_job_id
            )
            
            return {
                "job_id": system_job_id,
                "status": "completed",
                "cost": cost,
                "balance_remaining": new_balance,
                "result": final_image_url
            }

        else:
            # === HIGGSFIELD GENERATION LOGIC (Existing) ===
            # Use dynamic client to favor DB accounts
            client = get_best_client()
            result = client.generate_image(
                prompt=prompt,
                model=model,
                resolution=resolution,
                aspect_ratio=aspect_ratio
            )
            
            if isinstance(result, dict):
                job_id = result.get("job_id", "unknown")
            else:
                job_id = result if result else "unknown"
            
            # 4. Create Job Record
            real_user_id = key_record.get("user_id")
            user_id = real_user_id if real_user_id else "system_public_api"
            
            job_data = JobCreate(
                job_id=job_id,
                user_id=user_id,
                type="t2i",
                model=model,
                prompt=prompt,
                credits_cost=cost,
                provider_job_id=job_id
            )
            
            jobs_repo.create(job_data)
            
            # 5. Deduct Balance & Log Usage
            # Use credits_service to deduct from user wallet
            new_balance = credits_service.deduct_credits(
                user_id=user_id,
                amount=cost,
                job_id=job_id,
                reason=f"API Image Gen: {model}"
            )
            
            # Still log specific API key usage for tracking/analytics (optional but good)
            api_keys_repo.log_usage(
                key_id=key_record["key_id"],
                endpoint="/v1/image/generate",
                cost=cost,
                balance_before=current_balance,
                balance_after=new_balance,
                status="success",
                job_id=job_id
            )
            
            return {
                "job_id": job_id,
                "status": "pending",
                "cost": cost,
                "balance_remaining": new_balance
            }
        
    except Exception as e:
        api_keys_repo.log_usage(
            key_id=key_record["key_id"],
            endpoint="/v1/image/generate",
            cost=0,
            balance_before=current_balance,
            balance_after=current_balance,
            status=f"failed: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
async def check_public_job(
    job_id: str,
    key_record: dict = Depends(verify_api_key_dependency)
):
    """Check status of a job created via API."""
    
    # 1. Check DB first (Source of truth for processed/clean results)
    job = jobs_repo.get_by_id(job_id)
    if job:
        status = job["status"]
        result_url = job.get("output_url")
        error = job.get("error_message")
        
        # If completed, return successful response (likely has clean URL)
        if status == "completed":
            return {
                "status": "completed",
                "result": result_url,
                "progress": 100
            }
        
        # If failed
        if status == "failed":
            return {
                "status": "failed",
                "result": None,
                "error": error
            }

        # If processing/pending, we return that status.
        # We rely on Background JobMonitor to update status and handle watermark removal.
        # This prevents returning a raw/watermarked URL prematurely.
        return {
            "status": status,
            "result": None,
            "progress": 0 # TODO: Store progress in DB if needed
        }

    # 2. Fallback: Detect provider based on ID format (Legacy/Direct)
    if "|" in job_id:
        # Google Veo ID format: operation_name|scene_id
        return google_veo_client.get_job_status(job_id)
    else:
        # Default to Higgsfield (Kling/Nano)
        # Use dynamic client to check status using correct credentials
        try:
            return get_best_client().get_job_status(job_id)
        except Exception as e:
            # If provider check fails (e.g. Job set not found, Token invalid)
            # Return failed status instead of 500 Error
            return {
                "status": "failed",
                "result": None,
                "error": str(e)
            }

@router.post("/video/generate")
async def public_generate_video(
    prompt: str = Form(...),
    model: str = Form("veo3.1-low"), # veo, kling, etc.
    mode: str = Form("t2v", pattern="^(t2v|i2v)$"),
    aspect_ratio: str = Form("16:9"),
    duration: Optional[str] = Form("5s"), # Kling only: 5s, 10s
    resolution: Optional[str] = Form("720p"), # Kling only: 720p, 1080p
    negative_prompt: Optional[str] = Form(None),
    img_url: Optional[str] = Form(None), # for i2v (legacy)
    img_id: Optional[str] = Form(None), # for Kling i2v (new)
    media_id: Optional[str] = Form(None), # for Veo i2v (new)
    key_record: dict = Depends(verify_api_key_dependency)
):
    """
    Public Video Generation Endpoint.
    Uses API Key balance.
    Support: Veo 3.1, Kling 2.5/2.6
    """
    # 1. Cost Calculation
    try:
        # Normalize duration for cost lookup
        # Veo is fixed 8s. Kling can be 5s or 10s.
        if "veo" in model:
             duration_key = "8s"
        elif "kling" in model:
             duration_key = duration if duration in ["5s", "10s"] else "5s"
        else:
             duration_key = "5s"
        
        # Simplified dynamic lookup
        if "veo" in model:
             cost = model_costs_repo.get_cost(model, "8s")
        else:
             # Kling uses resolution-duration keys mostly
             # e.g. "720p-5s" or just "5s" depending on schema. 
             # Assuming schema maps "model" + "720p-5s" -> cost
             cost = model_costs_repo.get_cost(model, f"{resolution}-{duration_key}")

        if cost is None:
            # Fallbacks
            if "veo3.1-high" in model: cost = 20
            elif "veo3.1-fast" in model: cost = 10
            elif "veo" in model: cost = 15
            elif "kling" in model: cost = 5
            else: cost = 10
            
            # Adjust cost for 10s Kling (usually double)
            if "kling" in model and duration_key == "10s":
                cost *= 2
                
    except Exception:
         cost = 10 
        
    # 2. Check Balance
    # 2. Check Balance (User's Global Credits)
    user_id = key_record["user_id"]
    has_credits, current_balance = credits_service.check_credits(user_id, cost)

    if not has_credits:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient user balance. Required: {cost}, Available: {current_balance}"
        )
        
    # 3. Call Provider
    try:
        result = {}
        if "veo" in model:
            # Google Veo Logic
            veo_input_image = None
            if mode == "i2v":
                # Check for explicit media_id (new flow) or img_url (legacy flow)
                if media_id:
                     veo_input_image = {"media_id": media_id}
                elif img_url:
                     veo_input_image = {"url": img_url}
                else:
                    raise HTTPException(400, "For Veo I2V, provide 'media_id' (preferred) or 'img_url'")

            # Use synchronous Google Client (same as image gen, it handles recaptcha internall if configured, 
            # or uses valid cookie).
            # Note: We need to ensure google_veo_client is ready.
            # However, for VIDEO, google_client.py uses `generate_video` which returns "operation|scene".
            
            # We need to solve recaptcha if not using just cookie?
            # The current google_client.generate_video DOES require a recaptchaToken argument.
            # But public_api.py is not passing it!
            # FIX: We need to solve recaptcha here too, just like for image gen.
            
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            from app.services.providers.playwright_solver import get_token_isolated
            
            loop = asyncio.get_event_loop()
            recaptcha_token, user_agent = await loop.run_in_executor(
                ThreadPoolExecutor(), 
                get_token_isolated,
                '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV',
                'https://labs.google',
                'VIDEO_GENERATION'
            )
            
            if not recaptcha_token:
                raise ValueError("Failed to retrieve reCAPTCHA token")

            result_str = google_veo_client.generate_video(
                prompt=prompt,
                recaptchaToken=recaptcha_token,
                model=model,
                aspect_ratio=aspect_ratio,
                input_image=veo_input_image,
                user_agent=user_agent
            )
            job_id = result_str
            result = {"job_id": job_id}
            
        elif "sora" in model:
             # Sora Logic
             # Map aspect_ratio to orientation
             orientation = "landscape"
             if aspect_ratio == "9:16":
                 orientation = "portrait"
             elif aspect_ratio == "1:1":
                 orientation = "square"
             
             # Sora Client is Async
             sora_res = await sora_client.generate_video(
                 prompt=prompt,
                 model=model,
                 orientation=orientation
                 # TODO: map duration to n_frames if needed
             )
             
             job_id = sora_res
             result = {"job_id": job_id}

        elif "kling" in model:
             # Kling Logic
             kling_input_images = None
             if mode == "i2v":
                 if img_id and img_url:
                     # New flow: explicit ID + URL
                     kling_input_images = [{
                         "id": img_id,
                         "url": img_url,
                         "width": 1024, # Default fallback
                         "height": 1024 
                     }]
                 elif img_url:
                     # Legacy flow: URL only
                     kling_input_images = [{"url": img_url}]
                 else:
                     raise HTTPException(400, "For Kling I2V, provide 'img_id' & 'img_url' (preferred) or 'img_url'")
              
             client = get_best_client()
             hf_res = client.generate_video(
                 prompt=prompt,
                 model=model,
                 duration=duration,
                 resolution=resolution,
                 aspect_ratio=aspect_ratio,
                 input_images=kling_input_images
             )
             job_id = hf_res if hf_res else "unknown"
             result = {"job_id": job_id}
             
        else:
            raise HTTPException(400, f"Unsupported model: {model}")
            
        
        # 4. Job Record
        real_user_id = key_record.get("user_id")
        user_id = real_user_id if real_user_id else "system_public_api"
        
        job_data = JobCreate(
            job_id=job_id,
            user_id=user_id,
            type=mode,
            model=model,
            prompt=prompt,
            credits_cost=cost,
            provider_job_id=job_id
        )
        
        jobs_repo.create(job_data)
        
        # 5. Deduct & Log
        new_balance = credits_service.deduct_credits(
            user_id=user_id,
            amount=cost,
            job_id=job_id,
            reason=f"API Video Gen: {model}"
        )
        
        api_keys_repo.log_usage(
            key_id=key_record["key_id"],
            endpoint="/v1/video/generate",
            cost=cost,
            balance_before=current_balance,
            balance_after=new_balance,
            status="success",
            job_id=job_id
        )
        
        return {
            "job_id": job_id,
            "status": "pending",
            "cost": cost,
            "balance_remaining": new_balance,
            "result": result.get("result")
        }
        
    except Exception as e:
        api_keys_repo.log_usage(
            key_id=key_record["key_id"],
            endpoint="/v1/video/generate",
            cost=0,
            balance_before=current_balance,
            balance_after=current_balance,
            status=f"failed: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/files/upload/kling")
async def upload_file_kling(
    file: UploadFile = File(...),
    key_record: dict = Depends(verify_api_key_dependency)
):
    """
    Upload image for Kling I2V (via Higgsfield).
    Returns: {id, url, width, height}
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(400, "Empty file")
            
        if not content:
            raise HTTPException(400, "Empty file")
            
        result = get_best_client().upload_image_complete(content)
        return result
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")

@router.post("/files/upload/veo")
async def upload_file_veo(
    file: UploadFile = File(...),
    aspect_ratio: str = Form("9:16"),
    key_record: dict = Depends(verify_api_key_dependency)
):
    """
    Upload image for Veo I2V (via Google).
    Returns: {media_id}
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(400, "Empty file")
            
        media_id = google_veo_client.upload_image_bytes(content, aspect_ratio)
        return {"media_id": media_id}
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")

@router.post("/motion/estimate-cost")
async def public_estimate_motion_cost(
    motion_video: UploadFile = File(...),
    mode: str = Form("std"),
    key_record: dict = Depends(verify_api_key_dependency)
):
    """
    Public Estimate Cost for Motion Control.
    Uploads the reference video and returns valid URL + cost info.
    """
    try:
        # Get Kling client (System Account)
        accounts = kling_accounts_repo.list_accounts(active_only=True)
        if not accounts:
             raise HTTPException(status_code=503, detail="No active Kling accounts available")
        # Use first account directly
        selected_account_id = accounts[0]['account_id']
        client = KlingClient.create_from_account(selected_account_id)
        
        # Read video bytes
        video_content = await motion_video.read()
        if not video_content:
             raise HTTPException(400, "Empty video file")
             
        # Upload
        upload_result = client.upload_video_bytes(
            video_content, 
            file_name=motion_video.filename or "motion.mp4"
        )
        
        if not upload_result:
             raise HTTPException(500, "Failed to upload motion video to provider")
             
        video_url, video_cover_url = upload_result
        
        # Return same structure as internal API
        return {
            "video_url": video_url,
            "video_cover_url": video_cover_url,
            "costs": {
                "720p": 120,
                "1080p": 150
            },
            "account_id": selected_account_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/motion/generate")
async def public_generate_motion(
    character_image: UploadFile = File(...),
    motion_video_url: str = Form(...),
    video_cover_url: str = Form(...),
    mode: str = Form("std"),
    key_record: dict = Depends(verify_api_key_dependency)
):
    """
    Public Generate Motion Control Video.
    """
    cost = 150 if mode == "pro" else 120
    
    # 1. Check Balance
    user_id = key_record["user_id"]
    has_credits, current_balance = credits_service.check_credits(user_id, cost)
    
    if not has_credits:
         raise HTTPException(
            status_code=402,
            detail=f"Insufficient user balance. Required: {cost}, Available: {current_balance}"
        )
        
    try:
        # 2. Get Client
        accounts = kling_accounts_repo.list_accounts(active_only=True)
        if not accounts:
             raise HTTPException(503, "No active Kling accounts available")
        selected_account_id = accounts[0]['account_id']
        client = KlingClient.create_from_account(selected_account_id)

        # 3. Upload Character Image
        img_content = await character_image.read()
        if not img_content:
             raise HTTPException(400, "Empty image file")
             
        # Note: we need just the URL, but internal method returns URL. 
        # But wait, original code uses `upload_image_bytes`.
        image_url = client.upload_image_bytes(img_content, character_image.filename or "char.png")
        if not image_url:
             raise HTTPException(500, "Failed to upload character image")

        # 4. Generate
        # Using self.DEFAULT_MODAL_ID internally in client now.
        task = client.generate_motion_control(
             image_url=image_url,
             video_url=motion_video_url,
             video_cover_url=video_cover_url,
             mode=mode
        )
        
        if not task:
             raise HTTPException(500, "Failed to start motion generation task")
             
        # Unpack tuple (task_id, creative_id)
        task_id, creative_id = task
        
        # Use task_id as the primary identifier
        job_id = task_id
        if not job_id:
             raise HTTPException(500, "Provider returned no Job ID")
             
        # 5. Create Job Record
        real_user_id = key_record.get("user_id")
        user_id = real_user_id if real_user_id else "system_public_api"
        
        from app.schemas.jobs import JobCreate
        job_data = JobCreate(
            job_id=job_id,
            user_id=user_id,
            type="motion",
            model="kling-motion",
            prompt="motion control",
            credits_cost=cost,
            provider_job_id=job_id
        )
        
        jobs_repo.create(job_data)
        
        # 6. Deduct Balance
        new_balance = credits_service.deduct_credits(
            user_id=user_id,
            amount=cost,
            job_id=job_id,
            reason="API Motion Control"
        )
        
        api_keys_repo.log_usage(
            key_id=key_record["key_id"],
            endpoint="/v1/motion/generate",
            cost=cost,
            balance_before=current_balance,
            balance_after=new_balance,
            status="success",
            job_id=job_id
        )
        
        return {
            "job_id": job_id,
            "status": "pending",
            "cost": cost,
            "balance_remaining": new_balance
        }
        
    except Exception as e:
         api_keys_repo.log_usage(
            key_id=key_record["key_id"],
            endpoint="/v1/motion/generate",
            cost=0,
            balance_before=current_balance,
            balance_after=current_balance,
            status=f"failed: {str(e)}"
        )
         raise HTTPException(status_code=500, detail=str(e))
