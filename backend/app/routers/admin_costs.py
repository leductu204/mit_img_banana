# routers/admin_costs.py
"""Admin endpoints for model costs management."""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional

from app.deps import get_current_admin, AdminInDB
from app.repositories import model_costs_repo
from app.repositories.admin_audit_repo import log_action, AuditLogCreate


router = APIRouter(prefix="/admin/model-costs", tags=["admin-costs"])


# ============================================
# Schemas
# ============================================

class ModelCost(BaseModel):
    model: str
    config_key: str
    credits: int
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class ModelCostsResponse(BaseModel):
    costs: List[ModelCost]


class UpdateCostRequest(BaseModel):
    model: str
    config_key: str
    credits: int


class UpdateCostResponse(BaseModel):
    model: str
    config_key: str
    old_credits: Optional[int]
    new_credits: int
    message: str


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=ModelCostsResponse)
async def get_all_model_costs(
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Get all model costs configuration."""
    costs_data = model_costs_repo.get_all_costs()
    
    costs = [
        ModelCost(
            model=c["model"],
            config_key=c["config_key"],
            credits=c["credits"],
            updated_at=c.get("updated_at"),
            updated_by=c.get("updated_by")
        )
        for c in costs_data
    ]
    
    return ModelCostsResponse(costs=costs)


@router.get("/{model}")
async def get_model_costs(
    model: str,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Get costs for a specific model."""
    costs_data = model_costs_repo.get_costs_by_model(model)
    
    return {
        "model": model,
        "costs": [dict(c) for c in costs_data]
    }


from app.routers.costs import invalidate_cache

@router.put("", response_model=UpdateCostResponse)
async def update_model_cost(
    request: Request,
    body: UpdateCostRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Update a model cost configuration."""
    if body.credits < 0:
        raise HTTPException(status_code=400, detail="Credits cannot be negative")
    
    # Get old value for audit
    old_credits = model_costs_repo.get_cost(body.model, body.config_key)
    
    # Update or insert
    model_costs_repo.upsert_cost(
        model=body.model,
        config_key=body.config_key,
        credits=body.credits,
        admin_id=current_admin.admin_id
    )
    
    # Invalidate public cache
    invalidate_cache()
    
    # Log admin action
    log_action(AuditLogCreate(
        admin_id=current_admin.admin_id,
        action="update_cost",
        target_type="model_cost",
        target_id=f"{body.model}/{body.config_key}",
        details={
            "model": body.model,
            "config_key": body.config_key,
            "old_credits": old_credits,
            "new_credits": body.credits
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    ))
    
    action = "Updated" if old_credits is not None else "Created"
    
    return UpdateCostResponse(
        model=body.model,
        config_key=body.config_key,
        old_credits=old_credits,
        new_credits=body.credits,
        message=f"{action} cost for {body.model}/{body.config_key}"
    )


@router.put("/bulk")
async def update_model_costs_bulk(
    request: Request,
    updates: List[UpdateCostRequest],
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """
    Update multiple model cost configurations at once.
    """
    updated_count = 0
    
    # Process all updates in a transaction-like manner (though sqlite is sequential anyway)
    # Ideally we'd wrap this in a transaction block
    try:
        for update in updates:
            if update.credits < 0:
                continue

            # Upsert cost
            model_costs_repo.upsert_cost(
                model=update.model,
                config_key=update.config_key,
                credits=update.credits,
                admin_id=current_admin.admin_id
            )
            updated_count += 1
            
        # Invalidate public cache
        invalidate_cache()
            
        # Log single bulk action
        log_action(AuditLogCreate(
            admin_id=current_admin.admin_id,
            action="update_cost_bulk",
            target_type="model_cost",
            target_id="bulk_update",
            details={
                "count": updated_count,
                "updates": [u.dict() for u in updates]
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        ))
        
        return {"message": f"Successfully updated {updated_count} costs"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk update failed: {str(e)}")


@router.post("/seed-defaults")
async def seed_default_costs(
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """
    Seed default model costs from configuration.
    Only works if the model_costs table is empty.
    """
    try:
        model_costs_repo.seed_default_costs()
        return {"message": "Default costs seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
