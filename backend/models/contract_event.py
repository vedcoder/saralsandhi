import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base


class EventType(str, enum.Enum):
    DOCUMENT_UPLOADED = "document_uploaded"
    AI_ANALYSIS_COMPLETED = "ai_analysis_completed"
    TRANSLATION_VIEWED = "translation_viewed"
    FIRST_PARTY_APPROVED = "first_party_approved"
    FIRST_PARTY_REJECTED = "first_party_rejected"
    SECOND_PARTY_ADDED = "second_party_added"
    SECOND_PARTY_REMOVED = "second_party_removed"
    SECOND_PARTY_APPROVED = "second_party_approved"
    SECOND_PARTY_REJECTED = "second_party_rejected"
    CONTRACT_FINALIZED = "contract_finalized"
    BLOCKCHAIN_VERIFIED = "blockchain_verified"


class ContractEvent(Base):
    __tablename__ = "contract_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(Enum(EventType), nullable=False)
    description = Column(String(500), nullable=False)
    event_metadata = Column(Text, nullable=True)  # JSON string for extra data like language, hash, etc.
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    contract = relationship("Contract", back_populates="events")
    user = relationship("User")
