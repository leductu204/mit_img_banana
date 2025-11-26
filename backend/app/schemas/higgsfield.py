from pydantic import BaseModel
from typing import Optional, List

class UploadURLResponse(BaseModel):
    id: str
    url: str
    upload_url: str

class UploadCheckRequest(BaseModel):
    img_id: str

class UploadCheckResponse(BaseModel):
    status: str
    message: str

class GenerateImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "9:16"
    resolution: str = "1k"
    input_images: Optional[List[dict]] = []
    model: str = "nano-banana"

class GenerateImageResponse(BaseModel):
    job_id: str

class JobStatusResponse(BaseModel):
    status: str
    result: Optional[str] = None
