# routers/generate.py
from fastapi import APIRouter

router = APIRouter()

@router.post("/t2i")
async def generate_text_to_image(payload: dict):
    return {"status": "queued", "task_id": "dummy-id"}

@router.post("/i2i")
async def generate_image_to_image(payload: dict):
    return {"status": "queued", "task_id": "dummy-id"}

@router.post("/t2v")
async def generate_text_to_video(payload: dict):
    return {"status": "queued", "task_id": "dummy-id"}

@router.post("/i2v")
async def generate_image_to_video(payload: dict):
    return {"status": "queued", "task_id": "dummy-id"}
