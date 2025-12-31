from fastapi import APIRouter, HTTPException, Body, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import re
import requests
from app.services.providers.sorai_client import sorai_client
from app.deps import get_current_user

router = APIRouter(tags=["sora"])

class SoraDownloadRequest(BaseModel):
    url: str

class SoraDownloadResponse(BaseModel):
    download_url: str

@router.post("/download", response_model=SoraDownloadResponse)
async def download_sora_video(
    request: SoraDownloadRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Get direct download link for a Sora video.
    """
    try:
        # Extract post_id from URL
        post_id = request.url
        
        if "sora.chatgpt.com/p/" in request.url:
            match = re.search(r'sora\.chatgpt\.com/p/([^/?#]+)', request.url)
            if match:
                post_id = match.group(1)
            else:
                raise ValueError("Invalid Sora URL format")
        
        # Call provider
        download_link = await sorai_client.get_download_link(post_id)
        
        return {"download_url": download_link}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/proxy-download")
def proxy_download_sora_video(
    url: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Proxy the video download to enforce 'Save As' behavior and avoid new tab playback.
    """
    try:
        # Stream the content
        # We use a normal def (sync) so FastAPI runs this in a threadpool, preventing blocking
        r = requests.get(url, stream=True, timeout=60)
        r.raise_for_status()
        
        # Extract filename from headers or url, or default
        filename = "sora_video.mp4"
        if "content-disposition" in r.headers:
            # Try to parse filename from header (simplified)
            import cgi
            _, params = cgi.parse_header(r.headers["content-disposition"])
            if "filename" in params:
                filename = params["filename"]

        return StreamingResponse(
            r.iter_content(chunk_size=8192),
            media_type=r.headers.get("content-type", "video/mp4"),
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy download failed: {str(e)}")
