from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from models.contract_event import EventType


class ContractEventResponse(BaseModel):
    id: str
    event_type: EventType
    description: str
    event_metadata: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditTrailResponse(BaseModel):
    contract_id: str
    events: list[ContractEventResponse]
    blockchain_hash: Optional[str] = None
