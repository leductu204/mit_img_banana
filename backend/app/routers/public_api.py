from fastapi import APIRouter, Depends, HTTPException, Form
from typing import Optional
from app.middleware.api_key_auth import verify_api_key_dependency
from app.repositories import api_keys_repo, jobs_repo
from app.services.providers.higgsfield_client import higgsfield_client
from app.services.providers.google_client import google_veo_client
from app.repositories.model_costs_repo import get_cost
from app.schemas.jobs import JobCreate

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
    # Simplified mapping for now, ideally strictly matches generic router
    if "pro" in model:
        cost = 6
    else:
        cost = 1 if aspect_ratio == "1:1" else 2
        
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
            aspect_ratio=aspect_ratio,
            negative_prompt=negative_prompt,
            seed=seed
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
    result = higgsfield_client.get_job_status(job_id)
    return result

@router.post("/video/generate")
async def public_generate_video(
    prompt: str = Form(...),
    model: str = Form("veo3.1-low"), # veo, kling, etc.
    mode: str = Form("t2v", pattern="^(t2v|i2v)$"),
    aspect_ratio: str = Form("16:9"),
    negative_prompt: Optional[str] = Form(None),
    img_url: Optional[str] = Form(None), # for i2v
    key_record: dict = Depends(verify_api_key_dependency)
):
    """
    Public Video Generation Endpoint.
    Uses API Key balance.
    """
    # 1. Cost Calculation
    if "veo" in model:
        cost = 10 if "high" in model else 5
    elif "kling" in model:
        cost = 5
    else:
        cost = 5
        
    # 2. Check Balance
    current_balance = key_record["balance"]
    if current_balance < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient balance. Required: {cost}, Available: {current_balance}"
        )
        
    # 3. Call Provider
    try:
        if "veo" in model:
            if mode == "t2v":
                result = google_veo_client.generate_video(
                    model=model,
                    mode="t2v",
                    prompt=prompt,
                    aspect_ratio=aspect_ratio
                )
            else:
                if not img_url:
                    raise HTTPException(400, "img_url required for i2v")
                result = google_veo_client.generate_video(
                    model=model,
                    mode="i2v",
                    prompt=prompt,
                    aspect_ratio=aspect_ratio,
                    img_url=img_url
                )
        else:
            raise HTTPException(400, "Only Veo models supported in this endpoint version")
            
        job_id = result.get("job_id", "unknown")
        
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
