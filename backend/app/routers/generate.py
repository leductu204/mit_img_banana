# routers/generate.py
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from app.services.providers.higgsfield_client import higgsfield_client
from app.schemas.higgsfield import GenerateImageResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# ============================================
# IMAGE UPLOAD ENDPOINT
# ============================================
class UploadResponse(BaseModel):
    id: str
    url: str
    width: int
    height: int

@router.post("/upload-image", response_model=UploadResponse)
async def upload_image(image: UploadFile = File(...)):
    """
    Upload image to Higgsfield and return image metadata.
    Step 1 in the I2V workflow.
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
        error_detail = f"Upload failed: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # Log to console
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# KLING 2.5 TURBO - I2V ONLY
# ============================================
@router.post("/kling-2.5-turbo/i2v", response_model=GenerateImageResponse)
async def generate_kling_2_5_turbo_i2v(
    prompt: str = Form(...),
    duration: int = Form(5),
    resolution: str = Form("720p"),
    img_id: str = Form(...),
    img_url: str = Form(...),
    width: int = Form(...),
    height: int = Form(...)
):
    """
    Kling 2.5 Turbo Image-to-Video
    Step 2: Use img_id/url from upload endpoint
    """
    try:
        print(f"[DEBUG] Kling 2.5 Turbo I2V request:")
        print(f"  - prompt: {prompt}")
        print(f"  - duration: {duration}")
        print(f"  - resolution: {resolution}")
        print(f"  - img_id: {img_id}")
        print(f"  - img_url: {img_url}")
        print(f"  - width: {width}, height: {height}")
        
        job_id = higgsfield_client.send_job_kling_2_5_turbo_i2v(
            prompt=prompt,
            duration=duration,
            resolution=resolution,
            img_id=img_id,
            img_url=img_url,
            width=width,
            height=height
        )
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create video job")
        return {"job_id": job_id}
    except Exception as e:
        import traceback
        error_detail = f"Error: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# KLING O1 - I2V ONLY
# ============================================
@router.post("/kling-o1/i2v", response_model=GenerateImageResponse)
async def generate_kling_o1_i2v(
    prompt: str = Form(...),
    duration: int = Form(5),
    aspect_ratio: str = Form("16:9"),
    img_id: str = Form(...),
    img_url: str = Form(...),
    width: int = Form(...),
    height: int = Form(...)
):
    """
    Kling O1 Video Image-to-Video
    Step 2: Use img_id/url from upload endpoint
    """
    try:
        job_id = higgsfield_client.send_job_kling_o1_i2v(
            prompt=prompt,
            duration=duration,
            aspect_ratio=aspect_ratio,
            img_id=img_id,
            img_url=img_url,
            width=width,
            height=height
        )
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create video job")
        return {"job_id": job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# KLING 2.6 - T2V
# ============================================
@router.post("/kling-2.6/t2v", response_model=GenerateImageResponse)
async def generate_kling_2_6_t2v(
    prompt: str = Form(...),
    duration: int = Form(5),
    aspect_ratio: str = Form("16:9"),
    sound: bool = Form(True)
):
    """
    Kling 2.6 Text-to-Video (no image needed)
    """
    try:
        job_id = higgsfield_client.send_job_kling_2_6_t2v(
            prompt=prompt,
            duration=duration,
            aspect_ratio=aspect_ratio,
            sound=sound
        )
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create video job")
        return {"job_id": job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# KLING 2.6 - I2V
# ============================================
@router.post("/kling-2.6/i2v", response_model=GenerateImageResponse)
async def generate_kling_2_6_i2v(
    prompt: str = Form(...),
    duration: int = Form(5),
    sound: bool = Form(True),
    img_id: str = Form(...),
    img_url: str = Form(...),
    width: int = Form(...),
    height: int = Form(...)
):
    """
    Kling 2.6 Image-to-Video
    Step 2: Use img_id/url from upload endpoint
    """
    try:
        job_id = higgsfield_client.send_job_kling_2_6_i2v(
            prompt=prompt,
            duration=duration,
            sound=sound,
            img_id=img_id,
            img_url=img_url,
            width=width,
            height=height
        )
        
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create video job")
        return {"job_id": job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# LEGACY IMAGE ENDPOINTS
# ============================================
@router.post("/t2i")
async def generate_text_to_image(payload: dict):
    return {"status": "queued", "task_id": "dummy-id"}

@router.post("/i2i")
async def generate_image_to_image(payload: dict):
    return {"status": "queued", "task_id": "dummy-id"}
