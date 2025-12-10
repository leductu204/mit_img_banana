from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from typing import Optional
from app.middleware.api_key_auth import verify_api_key_dependency
from app.repositories import api_keys_repo, jobs_repo, model_costs_repo
from app.schemas.jobs import JobCreate
from app.services.providers.higgsfield_client import higgsfield_client
from app.services.providers.google_client import google_veo_client

router = APIRouter()

@router.get("/balance")
async def check_balance(
    key_record: dict = Depends(verify_api_key_dependency)
):
    """Check current balance for the API key."""
    return {
        "balance": key_record["balance"],
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
    current_balance = key_record["balance"]
    if current_balance < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient balance. Required: {cost}, Available: {current_balance}"
        )

    # 3. Call Provider (Higgsfield)
    try:
        result = higgsfield_client.generate_image(
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
            credits_cost=cost
        )
        
        jobs_repo.create(job_data)
        
        # 5. Deduct Balance & Log Usage
        # Use execute_in_transaction for atomicity
        new_balance = api_keys_repo.deduct_balance(key_record["key_id"], cost)
        
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
    # Detect provider based on ID format
    if "|" in job_id:
        # Google Veo ID format: operation_name|scene_id
        return google_veo_client.get_job_status(job_id)
    else:
        # Default to Higgsfield (Kling/Nano)
        return higgsfield_client.get_job_status(job_id)

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
    current_balance = key_record["balance"]
    if current_balance < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient balance. Required: {cost}, Available: {current_balance}"
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

            result_str = google_veo_client.generate_video(
                model=model,
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                input_image=veo_input_image
            )
            job_id = result_str
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
             
             hf_res = higgsfield_client.generate_video(
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
            credits_cost=cost
        )
        
        jobs_repo.create(job_data)
        
        # 5. Deduct & Log
        new_balance = api_keys_repo.deduct_balance(key_record["key_id"], cost)
        
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
            
        result = higgsfield_client.upload_image_complete(content)
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
