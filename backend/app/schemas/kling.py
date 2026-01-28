from pydantic import BaseModel
from typing import Optional

class KlingAccountBase(BaseModel):
    name: str
    cookie: str
    priority: int = 100
    is_active: bool = True

class KlingAccountCreate(KlingAccountBase):
    pass

class KlingAccountUpdate(BaseModel):
    name: Optional[str] = None
    cookie: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class KlingAccountInDB(KlingAccountBase):
    account_id: int

class KlingAccountResponse(KlingAccountInDB):
    pass
