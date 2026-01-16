import logging
from typing import Annotated, Optional
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.contract import ContractAnalysisResponse, ContractListResponse, ChatRequest, ChatResponse
from services.contract_service import ContractService
from services.chat_service import ChatService
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
