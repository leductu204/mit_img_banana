# schemas/generate.py
"""Pydantic models for generation requests and responses."""

from pydantic import BaseModel
from typing import Any, Dict

class TextToImageRequest(BaseModel):
    prompt: str
    model_key: str = "nano"
    parameters: Dict[str, Any] = {}

class ImageToImageRequest(BaseModel):
    image_url: str
    prompt: str
    model_key: str = "nano"
    parameters: Dict[str, Any] = {}

class TextToVideoRequest(BaseModel):
    prompt: str
    model_key: str = "kling"
    parameters: Dict[str, Any] = {}

class ImageToVideoRequest(BaseModel):
    image_url: str
    prompt: str
    model_key: str = "kling"
    parameters: Dict[str, Any] = {}

class GenerationResponse(BaseModel):
    job_id: str
    status: str = "queued"
