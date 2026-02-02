from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.repositories.kling_accounts_repo import kling_accounts_repo
from app.deps import get_current_admin, AdminInDB
from app.repositories.admin_audit_repo import log_action, AuditLogCreate
from app.services.providers.kling_client import reset_client

router = APIRouter(
    prefix="/admin/kling/accounts",
    tags=["admin-kling"]
)

class KlingAccountCreate(BaseModel):
    name: str
    cookie: str
    priority: Optional[int] = 100
    is_active: Optional[bool] = True

class KlingAccountUpdate(BaseModel):
    name: Optional[str] = None
    cookie: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

@router.get("/")
async def list_accounts(current_admin: AdminInDB = Depends(get_current_admin)):
    """List all Kling accounts"""
    return kling_accounts_repo.list_accounts()

@router.post("/")
async def create_account(
    data: KlingAccountCreate,
    request: Request,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Create a new Kling account"""
    try:
        account_id = kling_accounts_repo.create_account(
            name=data.name,
            cookie=data.cookie,
            priority=data.priority,
            is_active=data.is_active
        )
        
        # Reset client to pick up new account if higher priority
        reset_client()
        
        log_action(AuditLogCreate(
            admin_id=current_admin.admin_id,
            action="create_kling_account",
            target_type="kling_account",
            target_id=str(account_id),
            details={"name": data.name, "priority": data.priority},
            ip_address=request.client.host if request.client else None
        ))
        
        return {"success": True, "account_id": account_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{account_id}")
async def update_account(
    account_id: int,
    data: KlingAccountUpdate,
    request: Request,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Update an existing Kling account"""
    try:
        update_data = data.model_dump(exclude_unset=True)
        kling_accounts_repo.update_account(account_id, update_data)
        
        # Reset client to reflect changes (e.g., active status or cookie)
        reset_client()
        
        log_action(AuditLogCreate(
            admin_id=current_admin.admin_id,
            action="update_kling_account",
            target_type="kling_account",
            target_id=str(account_id),
            details=update_data,
            ip_address=request.client.host if request.client else None
        ))
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    request: Request,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    """Delete a Kling account"""
    try:
        kling_accounts_repo.delete_account(account_id)
        
        # Reset client to stop using deleted account
        reset_client()
        
        log_action(AuditLogCreate(
            admin_id=current_admin.admin_id,
            action="delete_kling_account",
            target_type="kling_account",
            target_id=str(account_id),
            ip_address=request.client.host if request.client else None
        ))
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
