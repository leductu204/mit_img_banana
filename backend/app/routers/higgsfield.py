from fastapi import APIRouter, HTTPException, Depends
from app.services.providers.higgsfield_client import higgsfield_client
from app.schemas.higgsfield import (
    UploadURLResponse,
    UploadCheckRequest,
    UploadCheckResponse,
    GenerateImageRequest,
    GenerateImageResponse,
    JobStatusResponse
)

router = APIRouter(tags=["higgsfield"])

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
    try:
        job_id = higgsfield_client.generate_image(
            prompt=request.prompt,
            input_images=request.input_images,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            model=request.model
        )
        if not job_id:
            raise HTTPException(status_code=500, detail="Failed to create job")
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
