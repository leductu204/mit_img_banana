from fastapi import APIRouter, HTTPException, Depends, File
from app.services.providers.higgsfield_client import higgsfield_client
from app.schemas.higgsfield import (
    UploadURLResponse,
    UploadCheckRequest,
    UploadCheckResponse,
    GenerateImageRequest,
    GenerateImageResponse,
    GenerateVideoRequest,
    JobStatusResponse,
    UploadImageResponse
)

router = APIRouter(tags=["higgsfield"])

@router.get("/token")
async def get_token():
    """Get JWT token for Higgsfield API"""
    try:
        token = higgsfield_client.get_jwt_token_with_retry()
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/media", response_model=UploadURLResponse)
async def create_media_upload():
    """
    Create upload link for media (images/videos).
    Frontend will upload directly to the returned upload_url.
    """
    try:
        jwt_token = higgsfield_client.get_jwt_token_with_retry()
        url = f"{higgsfield_client.base_url}/media?require_consent=true"
        headers = higgsfield_client._get_headers(jwt_token)
        headers['content-length'] = '0'
        
        import requests
        response = requests.post(url, headers=headers, data={})
        response.raise_for_status()
        
        data = response.json()
        return {
            "id": data.get("id"),
            "url": data.get("url"),
            "upload_url": data.get("upload_url")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/url", response_model=UploadURLResponse)
async def get_upload_url():
    try:
        result = higgsfield_client.get_upload_url()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/reference", response_model=UploadURLResponse)
async def create_reference_media():
    try:
        result = higgsfield_client.create_reference_media()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/batch", response_model=UploadURLResponse)
async def batch_media():
    try:
        result = higgsfield_client.batch_media()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/check", response_model=UploadCheckResponse)
async def check_upload(request: UploadCheckRequest):
    try:
        response_text = higgsfield_client.check_upload(request.img_id)
        return {"status": "success", "message": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest):
    """Generate image using Nano Banana or Nano Banana Pro based on model parameter"""
    try:
        job_id = higgsfield_client.generate_image(
            prompt=request.prompt,
            input_images=request.input_images or [],
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            model=request.model
        )
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create job")
        return {"job_id": job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-video", response_model=GenerateImageResponse)
async def generate_video(request: GenerateVideoRequest):
    try:
        job_id = higgsfield_client.generate_video(
            prompt=request.prompt,
            model=request.model,
            duration=request.duration,
            resolution=request.resolution or "720p",
            aspect_ratio=request.aspect_ratio or "16:9",
            audio=request.audio if request.audio is not None else True,
            input_images=request.input_images or []
        )
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create video job")
        return {"job_id": job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    try:
        result = higgsfield_client.get_job_status(job_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
