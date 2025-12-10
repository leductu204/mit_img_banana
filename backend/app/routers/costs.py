# routers/costs.py
"""Public endpoint for fetching model costs."""

from fastapi import APIRouter
from app.services.cost_calculator import get_model_costs
from datetime import datetime

router = APIRouter(tags=["costs"])

# Simple in-memory cache
_costs_cache = None
_cache_timestamp = None
CACHE_TTL_SECONDS = 300  # 5 minutes


def invalidate_cache():
    """Invalidate the costs cache (called when admin updates costs)"""
    global _costs_cache, _cache_timestamp
    _costs_cache = None
    _cache_timestamp = None


@router.get("/costs")
async def get_costs():
    """
    Get all model costs in structured format.
    Public endpoint - no authentication required.
    Cached for 5 minutes to reduce database load.
    """
    global _costs_cache, _cache_timestamp
    
    now = datetime.utcnow()
    
    # Return cached data if still valid
    if _costs_cache and _cache_timestamp:
        if (now - _cache_timestamp).total_seconds() < CACHE_TTL_SECONDS:
            return _costs_cache
    
    # Fetch fresh data and cache it
    costs = get_model_costs()
    _costs_cache = costs
    _cache_timestamp = now
    
    return costs
