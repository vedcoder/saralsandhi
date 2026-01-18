import tempfile
import os
import concurrent.futures
from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from contract_manager import (
    GeminiClient,
    extract_text_from_pdf,
    model_a_simplify,
    model_b_translate,
    model_c_detect_risks,
    extract_metadata,
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
    ApprovalStatus as SchemaApprovalStatus,
    ContractCategory as SchemaContractCategory,
)
from schemas.contract_party import (
    ContractPartyResponse,
    ContractApprovalStatus,
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
    ContractCategory as DBContractCategory,
)
from models.contract_party import ContractParty, PartyRole, ApprovalStatus
from models.contract_event import ContractEvent, EventType
from models.user import User
from schemas.contract_event import ContractEventResponse, AuditTrailResponse
from services.blockchain_service import blockchain_service
import json
import hashlib
import logging

logger = logging.getLogger(__name__)


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

            # Run Model B, C, and metadata extraction in parallel
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                future_b = executor.submit(model_b_translate, client, model_a_result.clauses)
                future_c = executor.submit(model_c_detect_risks, client, model_a_result.clauses)
                future_meta = executor.submit(extract_metadata, client, contract_text)

                model_b_result = future_b.result()
                model_c_result = future_c.result()
                metadata_result = future_meta.result()

            # Calculate overall risk score
            risk_score = self._calculate_risk_score(model_c_result.risks)
            detected_language = self._determine_language(model_b_result.translations)

            # Parse category and expiry date from metadata
            contract_category = None
            expiry_date = None
            if metadata_result.success:
                if metadata_result.category:
                    try:
                        contract_category = DBContractCategory(metadata_result.category)
                    except ValueError:
                        contract_category = DBContractCategory.OTHER
                if metadata_result.expiry_date:
                    try:
                        expiry_date = datetime.strptime(metadata_result.expiry_date, "%Y-%m-%d")
                    except ValueError:
                        pass  # Invalid date format, leave as None

            # Create contract in database
            contract = Contract(
                user_id=user_id,
                filename=file.filename,
                pdf_data=pdf_content,
                detected_language=detected_language,
                overall_risk_score=risk_score,
                status=ContractStatus.PENDING_REVIEW,
                risk_summary=model_c_result.summary,
                category=contract_category,
                expiry_date=expiry_date,
            )
            db.add(contract)
            await db.flush()

            # Create first party record for the uploader
            first_party = ContractParty(
                contract_id=contract.id,
                user_id=user_id,
                role=PartyRole.FIRST_PARTY,
                approval_status=ApprovalStatus.PENDING,
            )
            db.add(first_party)
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

            # Log events
            await self._log_event(
                contract_id=contract.id,
                event_type=EventType.DOCUMENT_UPLOADED,
                description="Document uploaded",
                db=db,
                user_id=user_id,
                metadata={"filename": file.filename},
            )
            await self._log_event(
                contract_id=contract.id,
                event_type=EventType.AI_ANALYSIS_COMPLETED,
                description="AI simplification & risk scan completed",
                db=db,
                user_id=user_id,
                metadata={
                    "clauses_count": len(model_a_result.clauses),
                    "risks_count": len(model_c_result.risks),
                    "risk_score": risk_score.value,
                },
            )

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
        # Get contract IDs where user is a party
        party_subquery = (
            select(ContractParty.contract_id)
            .where(ContractParty.user_id == user_id)
        )

        # Base query - contracts where user is a party
        query = (
            select(Contract)
            .options(selectinload(Contract.parties))
            .where(Contract.id.in_(party_subquery))
        )

        # Add search filter if provided
        if search:
            query = query.where(Contract.filename.ilike(f"%{search}%"))

        # Get total count
        count_query = select(func.count()).select_from(
            select(Contract.id).where(Contract.id.in_(party_subquery)).subquery()
        )
        if search:
            count_query = select(func.count()).select_from(
                select(Contract.id)
                .where(Contract.id.in_(party_subquery))
                .where(Contract.filename.ilike(f"%{search}%"))
                .subquery()
            )
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Add pagination and ordering
        query = query.order_by(Contract.created_at.desc()).limit(limit).offset(offset)

        result = await db.execute(query)
        contracts = result.scalars().all()

        # Build response with approval info
        contract_items = []
        for c in contracts:
            # Find current user's party record and other party
            my_party = None
            other_party = None
            for party in c.parties:
                if party.user_id == user_id:
                    my_party = party
                else:
                    other_party = party

            is_owner = my_party.role == PartyRole.FIRST_PARTY if my_party else False
            has_second_party = any(p.role == PartyRole.SECOND_PARTY for p in c.parties)

            contract_items.append(ContractListItem(
                id=c.id,
                filename=c.filename,
                detected_language=DetectedLanguage(c.detected_language.value),
                risk_score=RiskScore(c.overall_risk_score.value),
                status=c.status,
                created_at=c.created_at,
                category=SchemaContractCategory(c.category.value) if c.category else None,
                expiry_date=c.expiry_date,
                is_owner=is_owner,
                my_approval_status=SchemaApprovalStatus(my_party.approval_status.value) if my_party else None,
                other_party_approval_status=SchemaApprovalStatus(other_party.approval_status.value) if other_party else None,
                has_second_party=has_second_party,
                blockchain_hash=c.blockchain_hash,
                blockchain_tx_hash=c.blockchain_tx_hash,
                finalized_at=c.finalized_at,
            ))

        return ContractListResponse(
            contracts=contract_items,
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
        # First check if user is a party to this contract
        party_check = await db.execute(
            select(ContractParty)
            .where(ContractParty.contract_id == contract_id, ContractParty.user_id == user_id)
        )
        if not party_check.scalar_one_or_none():
            return None

        # Load contract with all relationships
        query = (
            select(Contract)
            .options(
                selectinload(Contract.clauses)
                .selectinload(Clause.translations),
                selectinload(Contract.clauses)
                .selectinload(Clause.risks),
            )
            .where(Contract.id == contract_id)
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
        # Only first party (owner) can delete
        party = await self._get_user_party(contract_id, user_id, db)
        if not party or party.role != PartyRole.FIRST_PARTY:
            return False

        query = select(Contract).where(Contract.id == contract_id)
        result = await db.execute(query)
        contract = result.scalar_one_or_none()

        if not contract:
            return False

        await db.delete(contract)
        return True

    async def get_contract_model(
        self,
        contract_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> Optional[Contract]:
        """Get the raw contract model. Used for blockchain verification."""
        # Check if user is a party to this contract
        party = await self._get_user_party(contract_id, user_id, db)
        if not party:
            return None

        result = await db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        return result.scalar_one_or_none()

    async def _get_user_party(
        self,
        contract_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> Optional[ContractParty]:
        """Get the party record for a user on a contract."""
        result = await db.execute(
            select(ContractParty)
            .where(ContractParty.contract_id == contract_id, ContractParty.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def add_second_party(
        self,
        contract_id: UUID,
        user_id: UUID,
        second_party_email: str,
        db: AsyncSession
    ) -> ContractPartyResponse:
        """Add a second party to the contract by email. Only first party can do this."""
        # Verify user is first party
        party = await self._get_user_party(contract_id, user_id, db)
        if not party or party.role != PartyRole.FIRST_PARTY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the contract owner can add a second party"
            )

        # Check if second party already exists
        existing_second = await db.execute(
            select(ContractParty)
            .where(
                ContractParty.contract_id == contract_id,
                ContractParty.role == PartyRole.SECOND_PARTY
            )
        )
        if existing_second.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contract already has a second party"
            )

        # Find user by email
        result = await db.execute(
            select(User).where(User.email == second_party_email)
        )
        second_user = result.scalar_one_or_none()

        if not second_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User with this email not found"
            )

        if second_user.id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add yourself as second party"
            )

        # Create second party record
        second_party = ContractParty(
            contract_id=contract_id,
            user_id=second_user.id,
            role=PartyRole.SECOND_PARTY,
            approval_status=ApprovalStatus.PENDING,
        )
        db.add(second_party)
        await db.flush()
        await db.refresh(second_party)

        # Log event
        await self._log_event(
            contract_id=contract_id,
            event_type=EventType.SECOND_PARTY_ADDED,
            description=f"Second party added: {second_user.full_name or second_user.email}",
            db=db,
            user_id=user_id,
            metadata={"second_party_email": second_user.email, "second_party_name": second_user.full_name},
        )

        return ContractPartyResponse(
            id=second_party.id,
            user_id=second_party.user_id,
            role=second_party.role,
            approval_status=second_party.approval_status,
            approved_at=second_party.approved_at,
            user_name=second_user.full_name,
            user_email=second_user.email,
        )

    async def get_contract_parties(
        self,
        contract_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> ContractApprovalStatus:
        """Get all parties and their approval status."""
        # Verify user is a party
        user_party = await self._get_user_party(contract_id, user_id, db)
        if not user_party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this contract"
            )

        # Get contract for blockchain info
        contract_result = await db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        contract = contract_result.scalar_one_or_none()

        # Get all parties with user info
        result = await db.execute(
            select(ContractParty)
            .options(selectinload(ContractParty.user))
            .where(ContractParty.contract_id == contract_id)
        )
        parties = result.scalars().all()

        first_party_response = None
        second_party_response = None

        for party in parties:
            response = ContractPartyResponse(
                id=party.id,
                user_id=party.user_id,
                role=party.role,
                approval_status=party.approval_status,
                approved_at=party.approved_at,
                user_name=party.user.full_name if party.user else None,
                user_email=party.user.email if party.user else None,
            )
            if party.role == PartyRole.FIRST_PARTY:
                first_party_response = response
            else:
                second_party_response = response

        # Determine overall status
        if not second_party_response:
            overall_status = "awaiting_second_party"
        elif first_party_response.approval_status == ApprovalStatus.REJECTED or \
             second_party_response.approval_status == ApprovalStatus.REJECTED:
            overall_status = "rejected"
        elif first_party_response.approval_status == ApprovalStatus.APPROVED and \
             second_party_response.approval_status == ApprovalStatus.APPROVED:
            overall_status = "approved"
        else:
            overall_status = "pending"

        is_owner = user_party.role == PartyRole.FIRST_PARTY
        can_approve = user_party.approval_status == ApprovalStatus.PENDING

        return ContractApprovalStatus(
            first_party=first_party_response,
            second_party=second_party_response,
            overall_status=overall_status,
            is_owner=is_owner,
            can_approve=can_approve,
            blockchain_tx_hash=contract.blockchain_tx_hash if contract else None,
        )

    async def set_approval(
        self,
        contract_id: UUID,
        user_id: UUID,
        approved: bool,
        db: AsyncSession
    ) -> ContractApprovalStatus:
        """Set approval status for the current user."""
        party = await self._get_user_party(contract_id, user_id, db)
        if not party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to approve this contract"
            )

        if party.approval_status != ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already submitted your approval"
            )

        party.approval_status = ApprovalStatus.APPROVED if approved else ApprovalStatus.REJECTED
        party.approved_at = datetime.utcnow()
        await db.flush()

        # Log approval event
        event_type = (
            EventType.FIRST_PARTY_APPROVED if party.role == PartyRole.FIRST_PARTY and approved else
            EventType.FIRST_PARTY_REJECTED if party.role == PartyRole.FIRST_PARTY and not approved else
            EventType.SECOND_PARTY_APPROVED if party.role == PartyRole.SECOND_PARTY and approved else
            EventType.SECOND_PARTY_REJECTED
        )
        action = "approved" if approved else "rejected"
        role_label = "First party" if party.role == PartyRole.FIRST_PARTY else "Second party"
        await self._log_event(
            contract_id=contract_id,
            event_type=event_type,
            description=f"{role_label} {action} the contract",
            db=db,
            user_id=user_id,
        )

        # Update contract status if needed
        was_finalized = await self._update_contract_status(contract_id, db)

        # Log finalization if both approved
        if was_finalized:
            # Get contract to access blockchain info
            contract_result = await db.execute(
                select(Contract).where(Contract.id == contract_id)
            )
            contract = contract_result.scalar_one_or_none()

            await self._log_event(
                contract_id=contract_id,
                event_type=EventType.CONTRACT_FINALIZED,
                description="Contract finalized - both parties approved",
                db=db,
            )
            await self._log_event(
                contract_id=contract_id,
                event_type=EventType.BLOCKCHAIN_VERIFIED,
                description="Contract hash stored on blockchain" if contract.blockchain_tx_hash else "Contract hash generated (blockchain pending)",
                db=db,
                metadata={
                    "document_hash": contract.blockchain_hash,
                    "transaction_hash": contract.blockchain_tx_hash,
                    "etherscan_url": blockchain_service.get_etherscan_url(contract.blockchain_tx_hash) if contract.blockchain_tx_hash else None,
                    "network": "sepolia"
                },
            )

        return await self.get_contract_parties(contract_id, user_id, db)

    async def _update_contract_status(
        self,
        contract_id: UUID,
        db: AsyncSession
    ) -> bool:
        """Update contract status based on party approvals. Returns True if finalized (both approved)."""
        result = await db.execute(
            select(ContractParty).where(ContractParty.contract_id == contract_id)
        )
        parties = result.scalars().all()

        first_party = None
        second_party = None
        for party in parties:
            if party.role == PartyRole.FIRST_PARTY:
                first_party = party
            else:
                second_party = party

        # Get the contract
        contract_result = await db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        contract = contract_result.scalar_one_or_none()
        if not contract:
            return False

        # Update status based on approvals
        if not second_party:
            return False  # No second party yet

        finalized = False
        if first_party.approval_status == ApprovalStatus.REJECTED or \
           second_party.approval_status == ApprovalStatus.REJECTED:
            contract.status = ContractStatus.REJECTED
        elif first_party.approval_status == ApprovalStatus.APPROVED and \
             second_party.approval_status == ApprovalStatus.APPROVED:
            contract.status = ContractStatus.APPROVED
            # Generate and store blockchain hash
            document_hash, tx_hash = await self._generate_and_store_blockchain_hash(contract, db)
            contract.blockchain_hash = document_hash
            contract.blockchain_tx_hash = tx_hash
            contract.finalized_at = datetime.utcnow()
            finalized = True

        await db.flush()
        return finalized

    async def remove_second_party(
        self,
        contract_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> bool:
        """Remove second party from contract. Only first party can do this."""
        party = await self._get_user_party(contract_id, user_id, db)
        if not party or party.role != PartyRole.FIRST_PARTY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the contract owner can remove the second party"
            )

        # Find and delete second party
        result = await db.execute(
            select(ContractParty)
            .where(
                ContractParty.contract_id == contract_id,
                ContractParty.role == PartyRole.SECOND_PARTY
            )
        )
        second_party = result.scalar_one_or_none()

        if not second_party:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No second party to remove"
            )

        # Get second party user info before deleting
        second_user_result = await db.execute(
            select(User).where(User.id == second_party.user_id)
        )
        second_user = second_user_result.scalar_one_or_none()
        second_party_name = second_user.full_name or second_user.email if second_user else "Unknown"

        await db.delete(second_party)

        # Log event
        await self._log_event(
            contract_id=contract_id,
            event_type=EventType.SECOND_PARTY_REMOVED,
            description=f"Second party removed: {second_party_name}",
            db=db,
            user_id=user_id,
        )

        # Reset contract status if it was approved/rejected
        contract_result = await db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        contract = contract_result.scalar_one_or_none()
        if contract and contract.status in [ContractStatus.APPROVED, ContractStatus.REJECTED]:
            contract.status = ContractStatus.PENDING_REVIEW
            # Also reset first party's approval
            party.approval_status = ApprovalStatus.PENDING
            party.approved_at = None

        await db.flush()
        return True

    async def _log_event(
        self,
        contract_id: UUID,
        event_type: EventType,
        description: str,
        db: AsyncSession,
        user_id: UUID = None,
        metadata: dict = None
    ) -> ContractEvent:
        """Log an event in the contract audit trail."""
        event = ContractEvent(
            contract_id=contract_id,
            event_type=event_type,
            description=description,
            user_id=user_id,
            event_metadata=json.dumps(metadata) if metadata else None,
        )
        db.add(event)
        await db.flush()
        return event

    async def _generate_and_store_blockchain_hash(
        self,
        contract: Contract,
        db: AsyncSession
    ) -> tuple[str, Optional[str]]:
        """
        Generate document hash and store on blockchain.

        Returns:
            Tuple of (document_hash, transaction_hash)
        """
        logger.info(f"🔐 [FINALIZE] Starting blockchain hash generation for contract: {contract.id}")

        # Build metadata for hashing
        metadata = {
            "filename": contract.filename,
            "created_at": contract.created_at.isoformat(),
            "user_id": str(contract.user_id),
        }
        logger.info(f"🔐 [FINALIZE] Metadata: {metadata}")

        # Generate deterministic hash
        document_hash = blockchain_service.generate_document_hash(
            contract.pdf_data,
            contract.id,
            metadata
        )
        logger.info(f"🔐 [FINALIZE] Generated document hash: {document_hash[:18]}...")

        # Attempt to store on blockchain
        if blockchain_service.is_enabled:
            logger.info("🔐 [FINALIZE] Blockchain is enabled, storing hash on-chain...")
            success, tx_hash, error = await blockchain_service.store_hash_on_chain(
                contract.id,
                document_hash
            )
            if success:
                logger.info(f"✅ [FINALIZE] Successfully stored on blockchain! TX: {tx_hash}")
                return document_hash, tx_hash
            else:
                # Log error but continue with just the hash
                logger.warning(f"⚠️ [FINALIZE] Blockchain storage failed: {error}")
        else:
            logger.info("🔐 [FINALIZE] Blockchain is disabled, storing hash locally only")

        return document_hash, None

    async def get_audit_trail(
        self,
        contract_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> AuditTrailResponse:
        """Get the audit trail for a contract."""
        # Verify user is a party
        party = await self._get_user_party(contract_id, user_id, db)
        if not party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this contract"
            )

        # Get contract to retrieve stored blockchain hash
        contract_result = await db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        contract = contract_result.scalar_one_or_none()

        # Get all events with user info
        result = await db.execute(
            select(ContractEvent)
            .options(selectinload(ContractEvent.user))
            .where(ContractEvent.contract_id == contract_id)
            .order_by(ContractEvent.created_at.asc())
        )
        events = result.scalars().all()

        event_responses = [
            ContractEventResponse(
                id=str(event.id),
                event_type=event.event_type,
                description=event.description,
                event_metadata=event.event_metadata,
                user_name=event.user.full_name if event.user else None,
                created_at=event.created_at,
            )
            for event in events
        ]

        return AuditTrailResponse(
            contract_id=str(contract_id),
            events=event_responses,
            blockchain_hash=contract.blockchain_hash if contract else None,
            blockchain_tx_hash=contract.blockchain_tx_hash if contract else None,
        )

    async def log_translation_viewed(
        self,
        contract_id: UUID,
        user_id: UUID,
        language: str,
        db: AsyncSession
    ) -> None:
        """Log when a user views a translation."""
        await self._log_event(
            contract_id=contract_id,
            event_type=EventType.TRANSLATION_VIEWED,
            description=f"User viewed {language.capitalize()} translation",
            db=db,
            user_id=user_id,
            metadata={"language": language},
        )

    async def update_contract_details(
        self,
        contract_id: UUID,
        user_id: UUID,
        db: AsyncSession,
        category: Optional[str] = None,
        expiry_date: Optional[datetime] = None,
    ) -> ContractListItem:
        """Update contract category and/or expiry date."""
        # Verify user is first party (owner)
        party = await self._get_user_party(contract_id, user_id, db)
        if not party or party.role != PartyRole.FIRST_PARTY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the contract owner can update details"
            )

        # Get contract
        result = await db.execute(
            select(Contract)
            .options(selectinload(Contract.parties))
            .where(Contract.id == contract_id)
        )
        contract = result.scalar_one_or_none()
        if not contract:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contract not found"
            )

        # Update fields
        if category is not None:
            contract.category = DBContractCategory(category)
        if expiry_date is not None:
            contract.expiry_date = expiry_date

        await db.commit()
        await db.refresh(contract)

        # Build response
        my_party = None
        other_party = None
        for p in contract.parties:
            if p.user_id == user_id:
                my_party = p
            else:
                other_party = p

        has_second_party = any(p.role == PartyRole.SECOND_PARTY for p in contract.parties)

        return ContractListItem(
            id=contract.id,
            filename=contract.filename,
            detected_language=DetectedLanguage(contract.detected_language.value),
            risk_score=RiskScore(contract.overall_risk_score.value),
            status=contract.status,
            created_at=contract.created_at,
            category=SchemaContractCategory(contract.category.value) if contract.category else None,
            expiry_date=contract.expiry_date,
            is_owner=True,
            my_approval_status=SchemaApprovalStatus(my_party.approval_status.value) if my_party else None,
            other_party_approval_status=SchemaApprovalStatus(other_party.approval_status.value) if other_party else None,
            has_second_party=has_second_party,
            blockchain_hash=contract.blockchain_hash,
            blockchain_tx_hash=contract.blockchain_tx_hash,
            finalized_at=contract.finalized_at,
        )

    async def get_expiring_contracts(
        self,
        user_id: UUID,
        db: AsyncSession,
        days: int = 30,
    ) -> list[ContractListItem]:
        """Get contracts expiring within the specified number of days."""
        from datetime import timedelta

        now = datetime.utcnow()
        expiry_threshold = now + timedelta(days=days)

        # Get contract IDs where user is a party
        party_subquery = (
            select(ContractParty.contract_id)
            .where(ContractParty.user_id == user_id)
        )

        # Query contracts with expiry date within threshold
        query = (
            select(Contract)
            .options(selectinload(Contract.parties))
            .where(
                Contract.id.in_(party_subquery),
                Contract.expiry_date.isnot(None),
                Contract.expiry_date <= expiry_threshold,
                Contract.expiry_date >= now,  # Not already expired
            )
            .order_by(Contract.expiry_date.asc())
            .limit(10)
        )

        result = await db.execute(query)
        contracts = result.scalars().all()

        contract_items = []
        for c in contracts:
            my_party = None
            other_party = None
            for party in c.parties:
                if party.user_id == user_id:
                    my_party = party
                else:
                    other_party = party

            is_owner = my_party.role == PartyRole.FIRST_PARTY if my_party else False
            has_second_party = any(p.role == PartyRole.SECOND_PARTY for p in c.parties)

            contract_items.append(ContractListItem(
                id=c.id,
                filename=c.filename,
                detected_language=DetectedLanguage(c.detected_language.value),
                risk_score=RiskScore(c.overall_risk_score.value),
                status=c.status,
                created_at=c.created_at,
                category=SchemaContractCategory(c.category.value) if c.category else None,
                expiry_date=c.expiry_date,
                is_owner=is_owner,
                my_approval_status=SchemaApprovalStatus(my_party.approval_status.value) if my_party else None,
                other_party_approval_status=SchemaApprovalStatus(other_party.approval_status.value) if other_party else None,
                has_second_party=has_second_party,
                blockchain_hash=c.blockchain_hash,
                blockchain_tx_hash=c.blockchain_tx_hash,
                finalized_at=c.finalized_at,
            ))

        return contract_items
