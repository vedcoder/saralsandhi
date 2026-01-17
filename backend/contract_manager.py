"""
Contract Management System
--------------------------
Processes contract PDFs through three AI models using Google Gemini:
- Model A (Simplifier): Extracts and simplifies clauses
- Model B (Translator): Translates to Hindi/Bengali
- Model C (Detector): Identifies risks and unfair clauses
"""

import json
import os
import concurrent.futures
from dataclasses import dataclass, asdict
from typing import Optional

import PyPDF2
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


@dataclass
class ModelAOutput:
    """Output from the Simplifier model."""
    success: bool
    clauses: list[dict]
    error: Optional[str] = None

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, ensure_ascii=False)


@dataclass
class ModelBOutput:
    """Output from the Translator model."""
    success: bool
    translations: dict[str, list[dict]]  # {"hindi": [...], "bengali": [...]}
    error: Optional[str] = None

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, ensure_ascii=False)


@dataclass
class ModelCOutput:
    """Output from the Risk Detector model."""
    success: bool
    risks: list[dict]
    summary: str
    error: Optional[str] = None

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, ensure_ascii=False)


@dataclass
class MetadataOutput:
    """Output from the Metadata Extractor model."""
    success: bool
    category: Optional[str] = None
    expiry_date: Optional[str] = None  # ISO format date string
    error: Optional[str] = None

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2, ensure_ascii=False)


class GeminiClient:
    """Wrapper for Google Gemini API."""

    def __init__(self, api_key: str = None):
        key = api_key or GEMINI_API_KEY
        if not key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        genai.configure(api_key=key)
        self.model = genai.GenerativeModel("gemini-3-flash-preview")

    def call(self, prompt: str) -> str:
        """Make an API call and return JSON response."""
        response = self.model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                response_mime_type="application/json"
            )
        )
        return response.text


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text content from a PDF file."""
    text = ""
    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def model_a_simplify(client: GeminiClient, contract_text: str) -> ModelAOutput:
    """
    Model A: Extract clauses and rewrite in simple terms.

    Returns JSON:
    {
        "clauses": [
            {"clause_id": 1, "original_text": "...", "simplified_text": "..."},
            ...
        ]
    }
    """
    prompt = """You are a legal document simplifier. Your task is to:
1. Extract all distinct clauses from the contract below
2. Rewrite each clause in simple, plain language that anyone can understand
3. Maintain the legal meaning while removing jargon

Return JSON in this exact format:
{
    "clauses": [
        {
            "clause_id": 1,
            "original_text": "The original clause text verbatim",
            "simplified_text": "Simple explanation of what this clause means in everyday language"
        }
    ]
}

CONTRACT TEXT:
""" + contract_text

    try:
        response = client.call(prompt)
        result = json.loads(response)
        return ModelAOutput(
            success=True,
            clauses=result.get("clauses", [])
        )
    except Exception as e:
        return ModelAOutput(
            success=False,
            clauses=[],
            error=str(e)
        )


def model_b_translate(client: GeminiClient, clauses: list[dict]) -> ModelBOutput:
    """
    Model B: Translate simplified clauses to Hindi and Bengali.

    Returns JSON:
    {
        "hindi": [{"clause_id": 1, "translated_text": "..."}],
        "bengali": [{"clause_id": 1, "translated_text": "..."}]
    }
    """
    prompt = """You are a translator specializing in legal documents.
Translate the simplified legal text to both Hindi and Bengali.
Keep translations natural and easy to understand for native speakers.

Return JSON in this exact format:
{
    "hindi": [
        {"clause_id": 1, "translated_text": "Hindi translation here"}
    ],
    "bengali": [
        {"clause_id": 1, "translated_text": "Bengali translation here"}
    ]
}

CLAUSES TO TRANSLATE:
""" + json.dumps(clauses, indent=2)

    try:
        response = client.call(prompt)
        result = json.loads(response)
        return ModelBOutput(
            success=True,
            translations={
                "hindi": result.get("hindi", []),
                "bengali": result.get("bengali", [])
            }
        )
    except Exception as e:
        return ModelBOutput(
            success=False,
            translations={"hindi": [], "bengali": []},
            error=str(e)
        )


def extract_metadata(client: GeminiClient, contract_text: str) -> MetadataOutput:
    """
    Extract contract metadata: category and expiry date.

    Returns JSON:
    {
        "category": "employment|rental|nda|service|sales|partnership|loan|insurance|other",
        "expiry_date": "YYYY-MM-DD" or null
    }
    """
    prompt = """You are a legal document analyzer. Extract the following metadata from the contract:

1. **Category**: Determine the type of contract. Choose ONE from:
   - "employment" - Job offers, employment agreements, work contracts
   - "rental" - Lease agreements, property rentals, equipment rentals
   - "nda" - Non-disclosure agreements, confidentiality agreements
   - "service" - Service level agreements, consulting contracts, freelance agreements
   - "sales" - Purchase agreements, sale of goods contracts
   - "partnership" - Business partnership agreements, joint ventures
   - "loan" - Loan agreements, credit agreements, promissory notes
   - "insurance" - Insurance policies, coverage agreements
   - "other" - If none of the above fit

2. **Expiry Date**: Find any end date, termination date, or expiration date mentioned.
   - Look for phrases like "expires on", "valid until", "term ends", "effective until", "termination date"
   - If the contract specifies a duration (e.g., "12 months from signing"), calculate the approximate end date from today
   - Return null if no expiry date can be determined

Return JSON in this exact format:
{
    "category": "the_category",
    "expiry_date": "YYYY-MM-DD" or null
}

CONTRACT TEXT:
""" + contract_text[:15000]  # Limit text to avoid token limits

    try:
        response = client.call(prompt)
        result = json.loads(response)

        # Validate category
        valid_categories = ["employment", "rental", "nda", "service", "sales", "partnership", "loan", "insurance", "other"]
        category = result.get("category", "other").lower()
        if category not in valid_categories:
            category = "other"

        return MetadataOutput(
            success=True,
            category=category,
            expiry_date=result.get("expiry_date")
        )
    except Exception as e:
        return MetadataOutput(
            success=False,
            error=str(e)
        )


def model_c_detect_risks(client: GeminiClient, clauses: list[dict]) -> ModelCOutput:
    """
    Model C: Identify risks and unfair/legally questionable clauses.

    Returns JSON:
    {
        "risks": [
            {
                "clause_id": 1,
                "risk_type": "unfair|ambiguous|legally_questionable|hidden_cost|excessive_liability",
                "severity": "low|medium|high",
                "description": "Explanation of the risk",
                "recommendation": "What to do about this"
            }
        ],
        "summary": "Overall risk assessment"
    }
    """
    prompt = """You are a legal risk analyst. Analyze the contract clauses to identify:
1. Unfair clauses that heavily favor one party
2. Ambiguous language that could be exploited
3. Clauses that may not be legally enforceable
4. Hidden fees or penalties
5. Unusual termination conditions
6. Excessive liability limitations

Return JSON in this exact format:
{
    "risks": [
        {
            "clause_id": 1,
            "risk_type": "unfair",
            "severity": "high",
            "description": "This clause allows the company to terminate without notice",
            "recommendation": "Negotiate for a 30-day notice period"
        }
    ],
    "summary": "Overall risk assessment summary describing the contract's fairness"
}

CLAUSES TO ANALYZE:
""" + json.dumps(clauses, indent=2)

    try:
        response = client.call(prompt)
        result = json.loads(response)
        return ModelCOutput(
            success=True,
            risks=result.get("risks", []),
            summary=result.get("summary", "")
        )
    except Exception as e:
        return ModelCOutput(
            success=False,
            risks=[],
            summary="",
            error=str(e)
        )


def process_contract(pdf_path: str, output_dir: str = None) -> dict:
    """
    Process a contract PDF through all three models.
    Model B and C run in parallel after Model A completes.

    Returns dict with paths to output JSON files.
    """
    # Setup output directory
    if output_dir is None:
        output_dir = os.path.dirname(pdf_path) or "."

    base_name = os.path.splitext(os.path.basename(pdf_path))[0]

    # Initialize Gemini client
    client = GeminiClient()

    # Step 1: Extract text from PDF
    print("Extracting text from PDF...")
    contract_text = extract_text_from_pdf(pdf_path)

    if not contract_text:
        return {"error": "Could not extract text from PDF"}

    # Step 2: Run Model A (must complete first)
    print("Model A: Simplifying clauses...")
    model_a_result = model_a_simplify(client, contract_text)

    # Save Model A output
    model_a_path = os.path.join(output_dir, f"{base_name}_model_a_simplified.json")
    with open(model_a_path, "w", encoding="utf-8") as f:
        f.write(model_a_result.to_json())
    print(f"  Saved: {model_a_path}")

    # Step 3: Run Model B and C in parallel
    print("Model B & C: Running in parallel...")

    clauses = model_a_result.clauses

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        # Submit both tasks
        future_b = executor.submit(model_b_translate, client, clauses)
        future_c = executor.submit(model_c_detect_risks, client, clauses)

        # Wait for results
        model_b_result = future_b.result()
        model_c_result = future_c.result()

    # Save Model B output
    model_b_path = os.path.join(output_dir, f"{base_name}_model_b_translated.json")
    with open(model_b_path, "w", encoding="utf-8") as f:
        f.write(model_b_result.to_json())
    print(f"  Saved: {model_b_path}")

    # Save Model C output
    model_c_path = os.path.join(output_dir, f"{base_name}_model_c_risks.json")
    with open(model_c_path, "w", encoding="utf-8") as f:
        f.write(model_c_result.to_json())
    print(f"  Saved: {model_c_path}")

    return {
        "model_a_output": model_a_path,
        "model_b_output": model_b_path,
        "model_c_output": model_c_path,
        "model_a_success": model_a_result.success,
        "model_b_success": model_b_result.success,
        "model_c_success": model_c_result.success
    }


def main():
    """CLI entry point."""
    import sys

    if len(sys.argv) < 2:
        print("Contract Management System")
        print("-" * 40)
        print("Usage: python contract_manager.py <pdf_path> [output_dir]")
        print()
        print("Required:")
        print("  GEMINI_API_KEY environment variable")
        print()
        print("Example:")
        print("  export GEMINI_API_KEY='your-api-key'")
        print("  python contract_manager.py contract.pdf ./output")
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}")
        sys.exit(1)

    print("=" * 50)
    print("CONTRACT MANAGEMENT SYSTEM")
    print("=" * 50)
    print(f"Input: {pdf_path}")
    print()

    result = process_contract(pdf_path, output_dir)

    print()
    print("=" * 50)
    print("PROCESSING COMPLETE")
    print("=" * 50)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
