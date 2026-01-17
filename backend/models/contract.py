import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, LargeBinary, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from .base import Base


class DetectedLanguage(str, enum.Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    BENGALI = "bengali"
    ENGLISH_COMPLEX = "english_complex"


class RiskScore(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SAFE = "safe"


class ContractStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"
    REVIEWED = "reviewed"
    ARCHIVED = "archived"
    APPROVED = "approved"
    REJECTED = "rejected"


class RiskSeverity(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TranslationLanguage(str, enum.Enum):
    HINDI = "hindi"
    BENGALI = "bengali"


class ContractCategory(str, enum.Enum):
    EMPLOYMENT = "employment"
    RENTAL = "rental"
    NDA = "nda"
    SERVICE = "service"
    SALES = "sales"
    PARTNERSHIP = "partnership"
    LOAN = "loan"
    INSURANCE = "insurance"
    OTHER = "other"


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    filename: Mapped[str] = mapped_column(String(255))
    pdf_data: Mapped[bytes] = mapped_column(LargeBinary)
    detected_language: Mapped[DetectedLanguage] = mapped_column(
        Enum(DetectedLanguage), default=DetectedLanguage.ENGLISH_COMPLEX
    )
    overall_risk_score: Mapped[RiskScore] = mapped_column(
        Enum(RiskScore), default=RiskScore.SAFE
    )
    status: Mapped[ContractStatus] = mapped_column(
        Enum(ContractStatus), default=ContractStatus.PENDING_REVIEW
    )
    risk_summary: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[ContractCategory] = mapped_column(
        Enum(ContractCategory), default=ContractCategory.OTHER, nullable=True
    )
    expiry_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    blockchain_hash: Mapped[str] = mapped_column(String(66), nullable=True)  # 0x + 64 hex chars
    blockchain_tx_hash: Mapped[str] = mapped_column(String(66), nullable=True)  # Transaction hash
    finalized_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="contracts")
    clauses: Mapped[list["Clause"]] = relationship(
        "Clause", back_populates="contract", cascade="all, delete-orphan"
    )
    parties: Mapped[list["ContractParty"]] = relationship(
        "ContractParty", back_populates="contract", cascade="all, delete-orphan"
    )
    events: Mapped[list["ContractEvent"]] = relationship(
        "ContractEvent", back_populates="contract", cascade="all, delete-orphan", order_by="ContractEvent.created_at"
    )


class Clause(Base):
    __tablename__ = "clauses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE")
    )
    clause_index: Mapped[int] = mapped_column(Integer)
    original_text: Mapped[str] = mapped_column(Text)
    simplified_text: Mapped[str] = mapped_column(Text)

    # Relationships
    contract: Mapped["Contract"] = relationship("Contract", back_populates="clauses")
    translations: Mapped[list["Translation"]] = relationship(
        "Translation", back_populates="clause", cascade="all, delete-orphan"
    )
    risks: Mapped[list["Risk"]] = relationship(
        "Risk", back_populates="clause", cascade="all, delete-orphan"
    )


class Translation(Base):
    __tablename__ = "translations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    clause_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clauses.id", ondelete="CASCADE")
    )
    language: Mapped[TranslationLanguage] = mapped_column(Enum(TranslationLanguage))
    translated_text: Mapped[str] = mapped_column(Text)

    # Relationships
    clause: Mapped["Clause"] = relationship("Clause", back_populates="translations")


class Risk(Base):
    __tablename__ = "risks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    clause_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clauses.id", ondelete="CASCADE")
    )
    risk_type: Mapped[str] = mapped_column(String(100))
    severity: Mapped[RiskSeverity] = mapped_column(Enum(RiskSeverity))
    description: Mapped[str] = mapped_column(Text)
    recommendation: Mapped[str] = mapped_column(Text)

    # Relationships
    clause: Mapped["Clause"] = relationship("Clause", back_populates="risks")
