from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.agents.base import ModelCapability

class BaseModelAdapter(ABC):
    """
    Base adapter for AI model providers.
    Each adapter translates our standard format to provider-specific APIs.
    """

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        temperature: float,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None  # "json", "text"
    ) -> Dict[str, Any]:
        """Generate completion from the model"""
        pass

    @abstractmethod
    def get_capabilities(self) -> list[ModelCapability]:
        """What can this model do well?"""
        pass

    @abstractmethod
    def get_cost_per_1k_tokens(self) -> Dict[str, float]:
        """Pricing info for routing decisions"""
        pass