import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from .base import Base


class PartyRole(str, enum.Enum):
    FIRST_PARTY = "first_party"
    SECOND_PARTY = "second_party"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ContractParty(Base):
    __tablename__ = "contract_parties"
    __table_args__ = (
        UniqueConstraint('contract_id', 'user_id', name='uq_contract_user'),
        UniqueConstraint('contract_id', 'role', name='uq_contract_role'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    contract_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    role: Mapped[PartyRole] = mapped_column(Enum(PartyRole))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.PENDING
    )
    approved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    contract: Mapped["Contract"] = relationship("Contract", back_populates="parties")
    user: Mapped["User"] = relationship("User", back_populates="contract_parties")
