from fastapi import APIRouter, HTTPException, Body, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import re
import requests
import base64

from app.services.providers.sora_client import sora_client_instance
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
        download_link = await sora_client_instance.get_watermark_free_url_sorai(post_id)
        
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

class SoraGenerateRequest(BaseModel):
    prompt: str
    duration: int = 15
    ratio: str = "landscape"
    model: str = "sy_8"
    image: Optional[str] = None # Base64 encoded image

@router.post("/generate")
async def generate_sora_video(
    request: SoraGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a Sora video using active tokens. Supports Text-to-Video and Image-to-Video.
    """
    try:
        # Determine n_frames based on duration
        n_frames = 450 # Default 15s
        if request.duration == 10:
             n_frames = 300 
        elif request.duration == 25:
             n_frames = 750
        
        # Handle Image Upload (I2V)
        media_id = None
        if request.image:
            # 1. Get active token (we need it to upload)
            # functionality of generate_video handles getting token, but we need it earlier for upload.
            # SoraClient.generate_video gets the token inside. We should probably refactor or expose getting token.
            # However, sora_client_instance.upload_image takes a token string.
            # We need to get a valid token first.
            
            # Use sora_service to get the active token directly
            from app.services.sora_service import sora_service
            account = sora_service.get_active_token()
            if not account:
                raise HTTPException(status_code=400, detail="No active Sora account found for image upload.")
            
            token = account['access_token']
            
            # 2. Decode Base64
            try:
                # Handle data URI scheme if present (e.g. "data:image/png;base64,...")
                image_str = request.image
                if "," in image_str:
                    image_str = image_str.split(",")[1]
                
                image_data = base64.b64decode(image_str)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid image base64: {str(e)}")

            # 3. Upload Image
            # We must pass the SAME token to generate_video to ensure consistency, 
            # OR rely on generate_video picking the SAME account if we don't pass explicit token_id.
            # Ideally, we should pass token_id to generate_video to be safe.
            # checking sora_client.py: generate_video DOES NOT take a token object, it calls get_active_token internally unless we change it.
            # IMPORTANT: SoraClient.generate_video calls sora_service.get_active_token() internally.
            # If we call it twice, we might get different accounts if load balancing is round-robin!
            # We should probably pass the token/token_id to generate_video.
            # Looking at sora_client.py, generate_video signature:
            # async def generate_video(self, prompt: str, model: str = "sy_8", n_frames: int = 450, orientation: str = "landscape", size: str = "small") -> str:
            # It DOES NOT accept token or media_id yet in the signature shown in line 209 of previous view_file.
            # Wait, I need to update SoraClient.generate_video signature to accept media_id and maybe explicit token.
            
            # Let's assume for now I will update SoraClient as well. This replace_file_content is for router.sw
            # I will modify this router assuming I WILL update SoraClient to take media_id and token.
            
            # For now in this step, I'll just write the router logic assuming client update comes next.
             
            media_id = await sora_client_instance.upload_image(image_data, token)
        
        # Note: I need to update SoraClient.generate_video to accept media_id and allow passing a specific token/account 
        # to ensure the upload and generation happen on the same account.
        
        # For this router change, I will assume sora_client_instance.generate_video will be updated to take `media_id`
        # and `pre_selected_token` (or similar).
        # Actually, looking at `sora_client.py`, it currently pulls a fresh token. 
        # I MUST update `sora_client.py` first or concurrently.
        # But this tool call is for `router.py`.
        
        # Let's change the plan slightly: Update router to use the new signature I AM ABOUT TO CREATE.
        
        gen_id = await sora_client_instance.generate_video(
            prompt=request.prompt,
            model=request.model,
            n_frames=n_frames,
            orientation=request.ratio,
            size="small",
            media_id=media_id # New parameter
        )
        return {"id": gen_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
