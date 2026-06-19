from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pydantic import BaseModel
from enum import Enum

class ModelProvider(str, Enum):
    """Available model providers"""
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OPENAI = "openai"

class ModelCapability(str, Enum):
    """Model capabilities for routing"""
    FAST_REASONING = "fast_reasoning"      # Quick analysis
    DEEP_REASONING = "deep_reasoning"      # Complex problems
    STRUCTURED_OUTPUT = "structured_output" # JSON reliability
    LONG_CONTEXT = "long_context"          # Large documents
    CREATIVE = "creative"                   # Report writing

class AgentTask(BaseModel):
    """Task specification for an agent"""
    task_type: str
    input_data: Dict[str, Any]
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    required_capabilities: list[ModelCapability] = []
    preferred_provider: Optional[ModelProvider] = None

class AgentResponse(BaseModel):
    """Standardized agent response"""
    model_config = {"protected_namespaces": ()}  # Allow model_ fields

    success: bool
    output_data: Dict[str, Any]
    model_used: str
    provider: ModelProvider
    execution_time_ms: int
    token_usage: Dict[str, int]
    confidence_score: Optional[float] = None
    reasoning: Optional[str] = None
    error: Optional[str] = None

class BaseAgent(ABC):
    """
    Base interface for all agents.
    Agents are model-agnostic - they define WHAT to do, not HOW.
    """

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    @abstractmethod
    async def execute(self, task: AgentTask) -> AgentResponse:
        """Execute the agent's task"""
        pass

    @abstractmethod
    def get_capabilities(self) -> list[ModelCapability]:
        """What capabilities does this agent need?"""
        pass

    @abstractmethod
    def get_prompt_template(self) -> str:
        """The agent's prompt template"""
        pass