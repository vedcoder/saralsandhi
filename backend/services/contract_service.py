import tempfile
import os
import concurrent.futures
from typing import Optional
from uuid import UUID
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from contract_manager import (
    GeminiClient,
    extract_text_from_pdf,
    model_a_simplify,
    model_b_translate,
    model_c_detect_risks
)
from schemas.contract import (
    ContractAnalysisResponse,
    Clause as ClauseSchema,
    Translation as TranslationSchema,
    Risk as RiskSchema,
    ContractListItem,
    ContractListResponse,
    DetectedLanguage,
    RiskScore,
)
from models.contract import (
    Contract,
    Clause,
    Translation,
    Risk,
    DetectedLanguage as DBDetectedLanguage,
    RiskScore as DBRiskScore,
    ContractStatus,
    RiskSeverity,
    TranslationLanguage,
)


class ContractService:
    def __init__(self):
        self.client = None

    def _get_client(self):
        if self.client is None:
            self.client = GeminiClient()
        return self.client

    def _calculate_risk_score(self, risks: list) -> DBRiskScore:
        if any(r.get("severity") == "high" for r in risks):
            return DBRiskScore.HIGH
        if any(r.get("severity") == "medium" for r in risks):
            return DBRiskScore.MEDIUM
        if any(r.get("severity") == "low" for r in risks):
            return DBRiskScore.LOW
        return DBRiskScore.SAFE

    def _determine_language(self, translations: dict) -> DBDetectedLanguage:
        # If there are translations, the original is English (Complex)
        if translations.get("hindi") or translations.get("bengali"):
            return DBDetectedLanguage.ENGLISH_COMPLEX
        return DBDetectedLanguage.ENGLISH

    async def analyze_and_save(
        self,
        file: UploadFile,
        user_id: UUID,
        db: AsyncSession
    ) -> ContractAnalysisResponse:
        # Read file content
        pdf_content = await file.read()
        await file.seek(0)

        # Save uploaded file temporarily for text extraction
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(pdf_content)
            tmp_path = tmp.name

        try:
            client = self._get_client()

            # Extract text from PDF
            contract_text = extract_text_from_pdf(tmp_path)

            if not contract_text:
                return ContractAnalysisResponse(
                    success=False,
                    contract_id="",
                    clauses=[],
                    translations={"hindi": [], "bengali": []},
                    risks=[],
                    risk_summary="",
                    error="Could not extract text from PDF"
                )

            # Run Model A first
            model_a_result = model_a_simplify(client, contract_text)

            if not model_a_result.success:
                return ContractAnalysisResponse(
                    success=False,
                    contract_id="",
                    clauses=[],
                    translations={"hindi": [], "bengali": []},
                    risks=[],
                    risk_summary="",
                    error=model_a_result.error
                )

            # Run Model B and C in parallel
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future_b = executor.submit(model_b_translate, client, model_a_result.clauses)
                future_c = executor.submit(model_c_detect_risks, client, model_a_result.clauses)

                model_b_result = future_b.result()
                model_c_result = future_c.result()

            # Calculate overall risk score
            risk_score = self._calculate_risk_score(model_c_result.risks)
            detected_language = self._determine_language(model_b_result.translations)

            # Create contract in database
            contract = Contract(
                user_id=user_id,
                filename=file.filename,
                pdf_data=pdf_content,
                detected_language=detected_language,
                overall_risk_score=risk_score,
                status=ContractStatus.PENDING_REVIEW,
                risk_summary=model_c_result.summary,
            )
            db.add(contract)
            await db.flush()

            # Create clauses and their relationships
            for clause_data in model_a_result.clauses:
                clause = Clause(
                    contract_id=contract.id,
                    clause_index=clause_data["clause_id"],
                    original_text=clause_data["original_text"],
                    simplified_text=clause_data["simplified_text"],
                )
                db.add(clause)
                await db.flush()

                # Add translations for this clause
                for lang in ["hindi", "bengali"]:
                    lang_translations = model_b_result.translations.get(lang, [])
                    for t in lang_translations:
                        if t["clause_id"] == clause_data["clause_id"]:
                            translation = Translation(
                                clause_id=clause.id,
                                language=TranslationLanguage.HINDI if lang == "hindi" else TranslationLanguage.BENGALI,
                                translated_text=t["translated_text"],
                            )
                            db.add(translation)

                # Add risks for this clause
                for r in model_c_result.risks:
                    if r["clause_id"] == clause_data["clause_id"]:
                        risk = Risk(
                            clause_id=clause.id,
                            risk_type=r["risk_type"],
                            severity=RiskSeverity(r["severity"]),
                            description=r["description"],
                            recommendation=r["recommendation"],
                        )
                        db.add(risk)

            await db.flush()
            await db.refresh(contract)

            return ContractAnalysisResponse(
                success=True,
                contract_id=str(contract.id),
                clauses=[ClauseSchema(**c) for c in model_a_result.clauses],
                translations={
                    "hindi": [TranslationSchema(**t) for t in model_b_result.translations.get("hindi", [])],
                    "bengali": [TranslationSchema(**t) for t in model_b_result.translations.get("bengali", [])]
                },
                risks=[RiskSchema(**r) for r in model_c_result.risks],
                risk_summary=model_c_result.summary
            )
        finally:
            os.unlink(tmp_path)

    async def get_user_contracts(
        self,
        user_id: UUID,
        db: AsyncSession,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> ContractListResponse:
        # Base query
        query = select(Contract).where(Contract.user_id == user_id)

        # Add search filter if provided
        if search:
            query = query.where(Contract.filename.ilike(f"%{search}%"))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Add pagination and ordering
        query = query.order_by(Contract.created_at.desc()).limit(limit).offset(offset)

        result = await db.execute(query)
        contracts = result.scalars().all()

        return ContractListResponse(
            contracts=[
                ContractListItem(
                    id=c.id,
                    filename=c.filename,
                    detected_language=DetectedLanguage(c.detected_language.value),
                    risk_score=RiskScore(c.overall_risk_score.value),
                    status=c.status,
                    created_at=c.created_at,
                )
                for c in contracts
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def get_contract_by_id(
        self,
        contract_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> Optional[ContractAnalysisResponse]:
        # Load contract with all relationships
        query = (
            select(Contract)
            .options(
                selectinload(Contract.clauses)
                .selectinload(Clause.translations),
                selectinload(Contract.clauses)
                .selectinload(Clause.risks),
            )
            .where(Contract.id == contract_id, Contract.user_id == user_id)
        )

        result = await db.execute(query)
        contract = result.scalar_one_or_none()

        if not contract:
            return None

        # Transform to response format
        clauses = []
        translations = {"hindi": [], "bengali": []}
        risks = []

        for clause in sorted(contract.clauses, key=lambda c: c.clause_index):
            clauses.append(ClauseSchema(
                clause_id=clause.clause_index,
                original_text=clause.original_text,
                simplified_text=clause.simplified_text,
            ))

            for t in clause.translations:
                lang_key = t.language.value.lower()
                translations[lang_key].append(TranslationSchema(
                    clause_id=clause.clause_index,
                    translated_text=t.translated_text,
                ))

            for r in clause.risks:
                risks.append(RiskSchema(
                    clause_id=clause.clause_index,
                    risk_type=r.risk_type,
                    severity=r.severity.value,
                    description=r.description,
                    recommendation=r.recommendation,
                ))

        return ContractAnalysisResponse(
            success=True,
            contract_id=str(contract.id),
            clauses=clauses,
            translations=translations,
            risks=risks,
            risk_summary=contract.risk_summary or "",
        )

    async def delete_contract(
        self,
        contract_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> bool:
        query = select(Contract).where(
            Contract.id == contract_id,
            Contract.user_id == user_id
        )
        result = await db.execute(query)
        contract = result.scalar_one_or_none()

        if not contract:
            return False

        await db.delete(contract)
        return True
