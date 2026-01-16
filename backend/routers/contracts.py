import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid

from schemas.contract import ContractAnalysisResponse
from services.contract_service import ContractService

logger = logging.getLogger(__name__)

router = APIRouter()
contract_service = ContractService()

# In-memory storage for analyzed contracts
analyzed_contracts: dict[str, ContractAnalysisResponse] = {}


@router.post("/contracts/analyze", response_model=ContractAnalysisResponse)
async def analyze_contract(file: UploadFile = File(...)):
    """Upload and analyze a PDF contract."""
    logger.info(f"📄 Received file: {file.filename}")

    if not file.filename.endswith('.pdf'):
        logger.warning(f"❌ Invalid file type: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    contract_id = str(uuid.uuid4())
    logger.info(f"🔄 Starting analysis for contract: {contract_id}")

    result = await contract_service.analyze(file, contract_id)
    analyzed_contracts[contract_id] = result

    if result.success:
        logger.info(f"✅ Analysis complete: {len(result.clauses)} clauses, {len(result.risks)} risks")
    else:
        logger.error(f"❌ Analysis failed: {result.error}")

    return result


@router.get("/contracts/{contract_id}", response_model=ContractAnalysisResponse)
async def get_contract(contract_id: str):
    """Get previously analyzed contract by ID."""
    logger.info(f"📥 Fetching contract: {contract_id}")

    if contract_id not in analyzed_contracts:
        logger.warning(f"❌ Contract not found: {contract_id}")
        raise HTTPException(status_code=404, detail="Contract not found")

    return analyzed_contracts[contract_id]
