
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.sora_service import sora_service
from app.deps import get_current_admin, AdminInDB
from app.repositories.admin_audit_repo import log_action, AuditLogCreate

router = APIRouter(
    prefix="/admin/sora/accounts",
    tags=["admin-sora"]
)

class SoraAccountCreate(BaseModel):
    access_token: str
    session_token: Optional[str] = None
    refresh_token: Optional[str] = None
    remark: Optional[str] = None
    name: Optional[str] = None
    client_id: Optional[str] = None
    proxy_url: Optional[str] = None
    image_concurrency: Optional[int] = -1
    video_concurrency: Optional[int] = -1

class SoraAccountUpdate(BaseModel):
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    remark: Optional[str] = None
    access_token: Optional[str] = None
    session_token: Optional[str] = None
    refresh_token: Optional[str] = None
    name: Optional[str] = None
    client_id: Optional[str] = None
    proxy_url: Optional[str] = None
    image_concurrency: Optional[int] = None
    video_concurrency: Optional[int] = None
    image_enabled: Optional[bool] = None
    video_enabled: Optional[bool] = None

class STConversionRequest(BaseModel):
    session_token: str

class RTConversionRequest(BaseModel):
    refresh_token: str

@router.get("/")
async def list_accounts(current_admin: AdminInDB = Depends(get_current_admin)):
    return sora_service.get_accounts()

@router.post("/")
async def add_account(
    data: SoraAccountCreate, 
    request: Request,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    try:
        id = sora_service.add_account(
            token=data.access_token, 
            session_token=data.session_token, 
            refresh_token=data.refresh_token,
            remark=data.remark,
            proxy_url=data.proxy_url,
            client_id=data.client_id,
            name=data.name,
            image_concurrency=data.image_concurrency,
            video_concurrency=data.video_concurrency
        )
        
        log_action(AuditLogCreate(
            admin_id=current_admin.admin_id,
            action="create_sora_account",
            target_type="sora_account",
            target_id=str(id),
            details={"remark": data.remark, "name": data.name},
            ip_address=request.client.host if request.client else None
        ))
        
        return {"success": True, "id": id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{account_id}")
async def update_account(
    account_id: int, 
    data: SoraAccountUpdate,
    request: Request,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    try:
        update_data = data.model_dump(exclude_unset=True)
        sora_service.update_account(account_id, update_data)
        
        log_action(AuditLogCreate(
            admin_id=current_admin.admin_id,
            action="update_sora_account",
            target_type="sora_account",
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
    try:
        sora_service.delete_account(account_id)
        
        log_action(AuditLogCreate(
            admin_id=current_admin.admin_id,
            action="delete_sora_account",
            target_type="sora_account",
            target_id=str(account_id),
            ip_address=request.client.host if request.client else None
        ))

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/convert/st")
async def convert_st(
    data: STConversionRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    try:
        result = await sora_service.convert_st_to_at(data.session_token)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/convert/rt")
async def convert_rt(
    data: RTConversionRequest,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    try:
        result = await sora_service.convert_rt_to_at(data.refresh_token)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{account_id}/test")
async def test_account_token(
    account_id: int,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    try:
        result = await sora_service.test_token(account_id)
        return {"success": True, "account": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{account_id}/refresh")
async def refresh_account_token(
    account_id: int,
    current_admin: AdminInDB = Depends(get_current_admin)
):
    try:
        result = await sora_service.refresh_token(account_id)
        return {"success": True, "account": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
