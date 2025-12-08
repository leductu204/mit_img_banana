# schemas/transactions.py
"""Pydantic models for credit transactions."""

from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime


TransactionType = Literal["deduct", "refund", "admin_add", "admin_reset", "initial"]


class CreditTransaction(BaseModel):
    """Single credit transaction record."""
    id: int
    user_id: str
    job_id: Optional[str] = None
    type: TransactionType
    amount: int  # Positive for add/refund, negative for deduct
    balance_before: int
    balance_after: int
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    """Paginated list of credit transactions."""
    transactions: List[CreditTransaction]
    total: int
    page: int
    pages: int
    limit: int


class TransactionCreate(BaseModel):
    """Data for creating a new transaction (internal use)."""
    user_id: str
    job_id: Optional[str] = None
    type: TransactionType
    amount: int
    balance_before: int
    balance_after: int
    reason: Optional[str] = None
