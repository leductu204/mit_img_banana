# routers/users.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/profile")
async def get_profile():
    return {"username": "example_user", "credits": 0}

@router.post("/credits/add")
async def add_credits(amount: int):
    return {"status": "success", "added": amount}
