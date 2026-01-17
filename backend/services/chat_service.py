"""
Chat Service for Contract Q&A
Uses Google Gemini to answer questions about contracts.
"""

import logging
import os

import google.generativeai as genai
from dotenv import load_dotenv

from schemas.contract import ContractAnalysisResponse, ChatMessage

load_dotenv()

logger = logging.getLogger(__name__)


class ChatService:
    """Service for handling AI chat about contracts."""

    def __init__(self):
        self._model = None

    def _get_model(self):
        """Lazy initialization of the Gemini model."""
        if self._model is None:
            # Use GEMINI_CHAT_API_KEY if set, otherwise fall back to GEMINI_API_KEY
            api_key = os.getenv("GEMINI_CHAT_API_KEY") or os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY or GEMINI_CHAT_API_KEY environment variable not set")
            genai.configure(api_key=api_key)
            # Use gemini-3-flash-preview for chat
            self._model = genai.GenerativeModel("gemini-3-flash-preview")
        return self._model

    async def chat(
        self,
        contract: ContractAnalysisResponse,
        message: str,
        history: list[ChatMessage]
    ) -> str:
        """
        Generate a response to a user's question about a contract.

        Args:
            contract: The contract analysis data
            message: The user's current message
            history: Previous chat messages for context

        Returns:
            AI-generated response string
        """
        # Build contract context
        contract_context = self._build_contract_context(contract)

        # Build conversation history
        conversation_history = self._build_conversation_history(history)

        # Create the prompt
        prompt = f"""You are an expert legal assistant helping a user understand their contract.
You have access to the contract's clauses, simplified explanations, and identified risks.

Be helpful, clear, and concise. When referring to specific clauses, mention the clause number.
If the user asks about something not in the contract, let them know.
Always provide actionable advice when relevant.

CONTRACT INFORMATION:
{contract_context}

CONVERSATION HISTORY:
{conversation_history}

USER'S CURRENT QUESTION:
{message}

Please provide a helpful response:"""

        try:
            model = self._get_model()
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=1024
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Chat error: {type(e).__name__}: {str(e)}", exc_info=True)
            return f"I apologize, but I encountered an error: {str(e)}. Please try again."

    def _build_contract_context(self, contract: ContractAnalysisResponse) -> str:
        """Build a context string from the contract data."""
        context_parts = []

        # Add clauses
        context_parts.append("CLAUSES:")
        for clause in contract.clauses:
            context_parts.append(f"""
Clause {clause.clause_id}:
- Original: {clause.original_text[:500]}{'...' if len(clause.original_text) > 500 else ''}
- Simplified: {clause.simplified_text}
""")

        # Add risks
        if contract.risks:
            context_parts.append("\nIDENTIFIED RISKS:")
            for risk in contract.risks:
                context_parts.append(f"""
- Clause {risk.clause_id} ({risk.severity.upper()} - {risk.risk_type}):
  {risk.description}
  Recommendation: {risk.recommendation}
""")

        # Add risk summary
        if contract.risk_summary:
            context_parts.append(f"\nOVERALL RISK SUMMARY:\n{contract.risk_summary}")

        return "\n".join(context_parts)

    def _build_conversation_history(self, history: list[ChatMessage]) -> str:
        """Build a conversation history string."""
        if not history:
            return "No previous conversation."

        history_parts = []
        for msg in history[-10:]:  # Keep last 10 messages for context
            role = "User" if msg.role == "user" else "Assistant"
            history_parts.append(f"{role}: {msg.content}")

        return "\n".join(history_parts)
