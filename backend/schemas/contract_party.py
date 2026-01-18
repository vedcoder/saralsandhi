from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum
from datetime import datetime
from uuid import UUID


class PartyRole(str, Enum):
    FIRST_PARTY = "first_party"
    SECOND_PARTY = "second_party"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class AddSecondPartyRequest(BaseModel):
    email: EmailStr


class ApprovalRequest(BaseModel):
    approved: bool


class ContractPartyResponse(BaseModel):
    id: UUID
    user_id: UUID
    role: PartyRole
    approval_status: ApprovalStatus
    approved_at: Optional[datetime] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class ContractApprovalStatus(BaseModel):
    first_party: Optional[ContractPartyResponse] = None
    second_party: Optional[ContractPartyResponse] = None
    overall_status: str  # "pending", "approved", "rejected", "awaiting_second_party"
    is_owner: bool  # Whether current user is first party
    can_approve: bool  # Whether current user can approve
    blockchain_tx_hash: Optional[str] = None  # Transaction hash after blockchain submission
