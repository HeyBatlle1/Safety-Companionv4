from google import genai
from datetime import datetime
from typing import Dict, Any, Optional
from app.agents.adapters.base_adapter import BaseModelAdapter
from app.agents.base import ModelCapability
import os

class GoogleGeminiAdapter(BaseModelAdapter):
    """Adapter for Google Gemini models using new google-genai SDK"""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model

    async def generate(
        self,
        prompt: str,
        temperature: float,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate completion from Gemini"""

        start_time = datetime.utcnow()

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )

            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            # Extract token usage if available
            token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            if hasattr(response, 'usage_metadata'):
                try:
                    usage = response.usage_metadata
                    token_usage = {
                        "prompt_tokens": getattr(usage, 'prompt_token_count', 0),
                        "completion_tokens": getattr(usage, 'candidates_token_count', 0),
                        "total_tokens": getattr(usage, 'total_token_count', 0)
                    }
                except Exception as e:
                    print(f"⚠️ Token usage parsing error: {e}")

            return {
                "text": response.text,
                "model": self.model_name,
                "execution_time_ms": execution_time,
                "token_usage": token_usage
            }
        except Exception as e:
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            raise Exception(f"Gemini API error: {str(e)}") from e

    def get_capabilities(self) -> list[ModelCapability]:
        """Gemini 2.0 Flash is fast + good at structured output"""
        return [
            ModelCapability.FAST_REASONING,
            ModelCapability.STRUCTURED_OUTPUT,
            ModelCapability.LONG_CONTEXT
        ]

    def get_cost_per_1k_tokens(self) -> Dict[str, float]:
        """Gemini 2.0 Flash pricing"""
        return {
            "input": 0.00015,   # $0.15 per 1M tokens
            "output": 0.0006    # $0.60 per 1M tokens
        }