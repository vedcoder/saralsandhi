import tempfile
import os
import concurrent.futures
from fastapi import UploadFile

from contract_manager import (
    GeminiClient,
    extract_text_from_pdf,
    model_a_simplify,
    model_b_translate,
    model_c_detect_risks
)
from schemas.contract import ContractAnalysisResponse, Clause, Translation, Risk


class ContractService:
    def __init__(self):
        self.client = None

    def _get_client(self):
        if self.client is None:
            self.client = GeminiClient()
        return self.client

    async def analyze(self, file: UploadFile, contract_id: str) -> ContractAnalysisResponse:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            client = self._get_client()

            # Extract text from PDF
            contract_text = extract_text_from_pdf(tmp_path)

            if not contract_text:
                return ContractAnalysisResponse(
                    success=False,
                    contract_id=contract_id,
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
                    contract_id=contract_id,
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

            return ContractAnalysisResponse(
                success=True,
                contract_id=contract_id,
                clauses=[Clause(**c) for c in model_a_result.clauses],
                translations={
                    "hindi": [Translation(**t) for t in model_b_result.translations.get("hindi", [])],
                    "bengali": [Translation(**t) for t in model_b_result.translations.get("bengali", [])]
                },
                risks=[Risk(**r) for r in model_c_result.risks],
                risk_summary=model_c_result.summary
            )
        finally:
            os.unlink(tmp_path)
