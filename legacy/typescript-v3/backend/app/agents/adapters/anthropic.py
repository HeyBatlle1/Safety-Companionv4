try:
    from anthropic import AsyncAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    AsyncAnthropic = None

from datetime import datetime
from typing import Dict, Any, Optional
from app.agents.adapters.base_adapter import BaseModelAdapter
from app.agents.base import ModelCapability

class AnthropicAdapter(BaseModelAdapter):
    """Adapter for Claude models (optional dependency)"""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        if not ANTHROPIC_AVAILABLE:
            raise RuntimeError(
                "Anthropic library not installed. "
                "Install with: pip install anthropic==0.40.0"
            )

        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def generate(
        self,
        prompt: str,
        temperature: float,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate completion from Claude"""

        start_time = datetime.utcnow()

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or 4096,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}]
        )

        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        return {
            "text": response.content[0].text,
            "model": self.model,
            "execution_time_ms": execution_time,
            "token_usage": {
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens
            }
        }

    def get_capabilities(self) -> list[ModelCapability]:
        """Claude Opus/Sonnet capabilities"""
        if "opus" in self.model:
            return [
                ModelCapability.DEEP_REASONING,
                ModelCapability.LONG_CONTEXT,
                ModelCapability.STRUCTURED_OUTPUT,
                ModelCapability.CREATIVE
            ]
        else:  # Sonnet
            return [
                ModelCapability.FAST_REASONING,
                ModelCapability.STRUCTURED_OUTPUT,
                ModelCapability.LONG_CONTEXT
            ]

    def get_cost_per_1k_tokens(self) -> Dict[str, float]:
        """Claude pricing"""
        if "opus" in self.model:
            return {"input": 0.015, "output": 0.075}  # Opus
        else:
            return {"input": 0.003, "output": 0.015}  # Sonnet