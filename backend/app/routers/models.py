from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class ModelCapability(BaseModel):
    aspect_ratios: Optional[List[str]] = None
    qualities: Optional[List[str]] = None
    resolutions: Optional[List[str]] = None
    durations: Optional[List[str]] = None
    audio: bool = False

class Model(BaseModel):
    id: str
    name: str
    type: str  # 'image' or 'video'
    description: str
    provider: str
    capabilities: ModelCapability
    badge: Optional[str] = None

class ModelsResponse(BaseModel):
    data: List[Model]

# Static Data (Mirrors frontend/lib/models-config.ts)
MODELS_DATA = [
    # --- Image Models ---
    {
        "id": "nano-banana",
        "name": "Nano Banana",
        "type": "image",
        "description": "Google Nano Banana Version",
        "provider": "Higgsfield",
        "capabilities": {
            "aspect_ratios": ['auto', '1:1', '4:3', '16:9', '21:9', '5:4', '3:2', '2:3', '9:16', '3:4', '4:5']
        }
    },
    {
        "id": "nano-banana-pro",
        "name": "Nano Banana PRO",
        "type": "image",
        "description": "Google Nano Banana PRO Version",
        "provider": "Higgsfield",
        "badge": "HOT",
        "capabilities": {
            "aspect_ratios": ['auto', '1:1', '4:3', '16:9', '21:9', '5:4', '3:2', '2:3', '9:16', '3:4', '4:5'],
            "resolutions": ['1k', '2k', '4k']
        }
    },
    {
        "id": "nano-banana-cheap",
        "name": "Nano Banana Fast",
        "type": "image",
        "description": "Google Nano Banana Fast Version",
        "provider": "Google",
        "capabilities": {
            "aspect_ratios": ['9:16', '16:9']
        }
    },
    {
        "id": "nano-banana-pro-cheap",
        "name": "Nano Banana PRO Fast",
        "type": "image",
        "description": "Google Nano Banana PRO Fast Version",
        "provider": "Google",
        "badge": "HOT",
        "capabilities": {
            "aspect_ratios": ['9:16', '16:9']
        }
    },
    {
        "id": "image-4.0",
        "name": "Imagen 4.0",
        "type": "image",
        "description": "Latest Imagen 4.0 Model",
        "provider": "Google",
        "badge": "NEW",
        "capabilities": {
            "aspect_ratios": ['9:16', '16:9']
        }
    },
    
    # --- Video Models ---
    {
        "id": "kling-2.5-turbo",
        "name": "Kling 2.5 Turbo",
        "type": "video",
        "description": "Fast I2V Only",
        "provider": "Kling",
        "badge": "FAST",
        "capabilities": {
            "durations": ['5s', '10s'],
            "qualities": ['720p', '1080p']
        }
    },
    {
        "id": "kling-o1-video",
        "name": "Kling O1 Video",
        "type": "video",
        "description": "High Quality I2V Only",
        "provider": "Kling",
        "capabilities": {
            "durations": ['5s', '10s'],
            "aspect_ratios": ['9:16', '16:9', '1:1']
        }
    },
    {
        "id": "kling-2.6",
        "name": "Kling 2.6",
        "type": "video",
        "description": "Flagship model with Audio (T2V & I2V)",
        "provider": "Kling",
        "badge": "CHEAP",
        "capabilities": {
            "durations": ['5s', '10s'],
            "aspect_ratios": ['9:16', '16:9', '1:1'],
            "audio": True
        }
    },
    {
        "id": "veo3.1-low",
        "name": "Veo 3.1",
        "type": "video",
        "description": "Economy Google Veo Model",
        "provider": "Google",
        "badge": "HOT - CHEAP",
        "capabilities": {
            "aspect_ratios": ['9:16', '16:9'],
            "durations": ['8s']
        }
    },
    {
        "id": "veo3.1-fast",
        "name": "Veo 3.1 FAST",
        "type": "video",
        "description": "Fast Google Veo Model",
        "provider": "Google",
        "badge": "FAST",
        "capabilities": {
            "aspect_ratios": ['9:16', '16:9'],
            "durations": ['8s']
        }
    },
    {
        "id": "veo3.1-high",
        "name": "Veo 3.1 HIGH",
        "type": "video",
        "description": "High Quality Google Veo Model",
        "provider": "Google",
        "capabilities": {
            "aspect_ratios": ['9:16', '16:9'],
            "durations": ['8s']
        }
    },
    {
        "id": "sora-2.0",
        "name": "Sora 2.0",
        "type": "video",
        "description": "OpenAI Sora 2.0 (Hyper-realistic)",
        "provider": "OpenAI",
        "badge": "NEW",
        "capabilities": {
            "durations": ['10s', '15s'],
            "aspect_ratios": ['16:9', '9:16']
        }
    }
]

@router.get("/models", response_model=ModelsResponse)
async def list_models():
    """
    List all available AI models (Image & Video).
    Returns capabilities and metadata for each.
    """
    return {"data": MODELS_DATA}
