from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime
from uuid import UUID


class Language(str, Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    BENGALI = "bengali"


class DetectedLanguage(str, Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    BENGALI = "bengali"
    ENGLISH_COMPLEX = "english_complex"


class RiskScore(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SAFE = "safe"


class ContractStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    REVIEWED = "reviewed"
    ARCHIVED = "archived"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ContractCategory(str, Enum):
    EMPLOYMENT = "employment"
    RENTAL = "rental"
    NDA = "nda"
    SERVICE = "service"
    SALES = "sales"
    PARTNERSHIP = "partnership"
    LOAN = "loan"
    INSURANCE = "insurance"
    OTHER = "other"


class Clause(BaseModel):
    clause_id: int
    original_text: str
    simplified_text: str


class Translation(BaseModel):
    clause_id: int
    translated_text: str


class Risk(BaseModel):
    clause_id: int
    risk_type: str
    severity: str
    description: str
    recommendation: str


class ContractAnalysisResponse(BaseModel):
    success: bool
    contract_id: str
    clauses: list[Clause]
    translations: dict[str, list[Translation]]
    risks: list[Risk]
    risk_summary: str
    error: Optional[str] = None


class ContractListItem(BaseModel):
    id: UUID
    filename: str
    detected_language: DetectedLanguage
    risk_score: RiskScore
    status: ContractStatus
    created_at: datetime
    # Category and expiry
    category: Optional[ContractCategory] = None
    expiry_date: Optional[datetime] = None
    # Approval-related fields
    is_owner: bool = True
    my_approval_status: Optional[ApprovalStatus] = None
    other_party_approval_status: Optional[ApprovalStatus] = None
    has_second_party: bool = False
    # Blockchain verification
    blockchain_hash: Optional[str] = None
    finalized_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContractListResponse(BaseModel):
    contracts: list[ContractListItem]
    total: int
    limit: int
    offset: int


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    response: str
