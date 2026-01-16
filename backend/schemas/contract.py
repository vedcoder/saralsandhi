from pydantic import BaseModel
from typing import Optional
from enum import Enum


class Language(str, Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    BENGALI = "bengali"


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
