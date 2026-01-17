import logging
from typing import Annotated, Optional
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime
from schemas.contract import ContractAnalysisResponse, ContractListResponse, ContractListItem, ChatRequest, ChatResponse, ContractCategory
from schemas.contract_party import (
    AddSecondPartyRequest,
    ApprovalRequest,
    ContractPartyResponse,
    ContractApprovalStatus,
)
from schemas.contract_event import AuditTrailResponse
from services.contract_service import ContractService
from services.chat_service import ChatService
from services.blockchain_service import blockchain_service
from core.database import get_db
from core.deps import get_current_active_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()
contract_service = ContractService()
chat_service = ChatService()


@router.post("/contracts/analyze", response_model=ContractAnalysisResponse)
async def analyze_contract(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...)
):
    """Upload and analyze a PDF contract."""
    logger.info(f"📄 Received file: {file.filename} from user: {current_user.email}")

    if not file.filename.endswith('.pdf'):
        logger.warning(f"❌ Invalid file type: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    logger.info(f"🔄 Starting analysis for user: {current_user.id}")

    result = await contract_service.analyze_and_save(file, current_user.id, db)

    if result.success:
        logger.info(f"✅ Analysis complete: {len(result.clauses)} clauses, {len(result.risks)} risks")
    else:
        logger.error(f"❌ Analysis failed: {result.error}")

    return result


@router.get("/contracts", response_model=ContractListResponse)
async def list_contracts(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: Optional[str] = Query(None, description="Search by filename"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List all contracts for the current user."""
    logger.info(f"📋 Listing contracts for user: {current_user.email}")

    return await contract_service.get_user_contracts(
        user_id=current_user.id,
        db=db,
        search=search,
        limit=limit,
        offset=offset
    )


@router.get("/contracts/expiring", response_model=list[ContractListItem])
async def get_expiring_contracts(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(30, ge=1, le=365, description="Number of days to look ahead")
):
    """Get contracts expiring within the specified number of days."""
    logger.info(f"📅 Getting expiring contracts for user: {current_user.email} (within {days} days)")

    return await contract_service.get_expiring_contracts(
        user_id=current_user.id,
        db=db,
        days=days
    )


@router.get("/contracts/{contract_id}", response_model=ContractAnalysisResponse)
async def get_contract(
    contract_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Get previously analyzed contract by ID."""
    logger.info(f"📥 Fetching contract: {contract_id} for user: {current_user.email}")

    result = await contract_service.get_contract_by_id(contract_id, current_user.id, db)

    if not result:
        logger.warning(f"❌ Contract not found: {contract_id}")
        raise HTTPException(status_code=404, detail="Contract not found")

    return result


@router.delete("/contracts/{contract_id}")
async def delete_contract(
    contract_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Delete a contract."""
    logger.info(f"🗑️ Deleting contract: {contract_id} for user: {current_user.email}")

    success = await contract_service.delete_contract(contract_id, current_user.id, db)

    if not success:
        logger.warning(f"❌ Contract not found: {contract_id}")
        raise HTTPException(status_code=404, detail="Contract not found")

    return {"message": "Contract deleted successfully"}


@router.post("/contracts/{contract_id}/chat", response_model=ChatResponse)
async def chat_with_contract(
    contract_id: UUID,
    chat_request: ChatRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Chat with AI about a specific contract."""
    logger.info(f"💬 Chat request for contract: {contract_id} from user: {current_user.email}")

    # First verify the contract exists and belongs to the user
    contract = await contract_service.get_contract_by_id(contract_id, current_user.id, db)
    if not contract:
        logger.warning(f"❌ Contract not found: {contract_id}")
        raise HTTPException(status_code=404, detail="Contract not found")

    # Get chat response
    response = await chat_service.chat(
        contract=contract,
        message=chat_request.message,
        history=chat_request.history
    )

    return ChatResponse(response=response)


# Party management endpoints

@router.post("/contracts/{contract_id}/parties", response_model=ContractPartyResponse)
async def add_second_party(
    contract_id: UUID,
    request: AddSecondPartyRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Add a second party to the contract by email. Only first party can do this."""
    logger.info(f"👥 Adding second party to contract: {contract_id} by user: {current_user.email}")

    return await contract_service.add_second_party(
        contract_id=contract_id,
        user_id=current_user.id,
        second_party_email=request.email,
        db=db
    )


@router.get("/contracts/{contract_id}/parties", response_model=ContractApprovalStatus)
async def get_contract_parties(
    contract_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Get approval status for all parties on a contract."""
    logger.info(f"📋 Getting parties for contract: {contract_id} by user: {current_user.email}")

    return await contract_service.get_contract_parties(
        contract_id=contract_id,
        user_id=current_user.id,
        db=db
    )


@router.post("/contracts/{contract_id}/approve", response_model=ContractApprovalStatus)
async def approve_or_reject_contract(
    contract_id: UUID,
    request: ApprovalRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Approve or reject a contract. Both parties can use this endpoint."""
    action = "approving" if request.approved else "rejecting"
    logger.info(f"✅ User {current_user.email} is {action} contract: {contract_id}")

    return await contract_service.set_approval(
        contract_id=contract_id,
        user_id=current_user.id,
        approved=request.approved,
        db=db
    )


@router.delete("/contracts/{contract_id}/parties/second")
async def remove_second_party(
    contract_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Remove second party from contract. Only first party can do this."""
    logger.info(f"🗑️ Removing second party from contract: {contract_id} by user: {current_user.email}")

    await contract_service.remove_second_party(
        contract_id=contract_id,
        user_id=current_user.id,
        db=db
    )

    return {"message": "Second party removed successfully"}


# Audit trail endpoint

@router.get("/contracts/{contract_id}/audit-trail", response_model=AuditTrailResponse)
async def get_audit_trail(
    contract_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Get the audit trail for a contract. Only accessible by contract parties."""
    logger.info(f"📜 Getting audit trail for contract: {contract_id} by user: {current_user.email}")

    return await contract_service.get_audit_trail(
        contract_id=contract_id,
        user_id=current_user.id,
        db=db
    )


@router.post("/contracts/{contract_id}/translation-viewed")
async def log_translation_viewed(
    contract_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    language: str = Query(..., description="Language of the translation viewed")
):
    """Log when a user views a translation. Called from frontend."""
    logger.info(f"👁️ Translation viewed ({language}) for contract: {contract_id} by user: {current_user.email}")

    await contract_service.log_translation_viewed(
        contract_id=contract_id,
        user_id=current_user.id,
        language=language,
        db=db
    )

    return {"message": "Translation view logged"}


# Contract details update endpoint

@router.patch("/contracts/{contract_id}", response_model=ContractListItem)
async def update_contract_details(
    contract_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    category: Optional[ContractCategory] = Query(None, description="Contract category"),
    expiry_date: Optional[datetime] = Query(None, description="Contract expiry date (ISO format)")
):
    """Update contract category and/or expiry date. Only contract owner can do this."""
    logger.info(f"📝 Updating contract details: {contract_id} by user: {current_user.email}")

    return await contract_service.update_contract_details(
        contract_id=contract_id,
        user_id=current_user.id,
        db=db,
        category=category.value if category else None,
        expiry_date=expiry_date
    )


# Blockchain verification endpoint

@router.get("/contracts/{contract_id}/verify-blockchain")
async def verify_blockchain_hash(
    contract_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Verify the contract's blockchain hash against on-chain storage."""
    logger.info(f"🔗 Verifying blockchain hash for contract: {contract_id} by user: {current_user.email}")

    # Get the contract first
    contract = await contract_service.get_contract_model(contract_id, current_user.id, db)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    if not contract.blockchain_hash:
        return {
            "verified": False,
            "error": "Contract has not been finalized with blockchain verification",
            "blockchain_enabled": blockchain_service.is_enabled
        }

    if not blockchain_service.is_enabled:
        return {
            "verified": False,
            "error": "Blockchain integration is not enabled",
            "blockchain_enabled": False,
            "blockchain_hash": contract.blockchain_hash,
            "blockchain_tx_hash": contract.blockchain_tx_hash
        }

    # Verify the hash on-chain
    is_valid, error = await blockchain_service.verify_hash_on_chain(
        contract_id=contract_id,
        document_hash=contract.blockchain_hash
    )

    result = {
        "verified": is_valid,
        "blockchain_enabled": True,
        "blockchain_hash": contract.blockchain_hash,
        "blockchain_tx_hash": contract.blockchain_tx_hash,
    }

    if contract.blockchain_tx_hash:
        result["etherscan_url"] = blockchain_service.get_etherscan_url(contract.blockchain_tx_hash)

    if error:
        result["error"] = error

    return result
