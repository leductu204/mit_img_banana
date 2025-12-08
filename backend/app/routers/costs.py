# routers/costs.py
"""Public endpoint for fetching model costs."""

from fastapi import APIRouter
from app.services.cost_calculator import get_model_costs

router = APIRouter(tags=["costs"])


@router.get("/costs")
async def get_costs():
    """
    Get all model costs in structured format.
    Public endpoint - no authentication required.
    """
    return get_model_costs()
