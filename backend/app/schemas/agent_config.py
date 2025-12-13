"""
Agent Configuration Schemas

Pydantic schemas for agent configuration API endpoints.
"""

from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List, Dict, Any


class AgentConfigBase(BaseModel):
    """Base configuration for an AI agent"""
    agent_name: str = Field(..., description="Agent identifier: validator, risk_assessor, swiss_cheese, synthesizer")
    model: str = Field(..., description="OpenRouter model identifier")
    temperature: float = Field(0.7, ge=0.0, le=1.0, description="Model temperature (0.0-1.0)")
    max_tokens: int = Field(4000, ge=100, le=10000, description="Maximum output tokens")
    notes: Optional[str] = Field(None, description="Admin notes for this configuration")

    @validator('agent_name')
    def validate_agent_name(cls, v):
        valid_agents = {"validator", "risk_assessor", "swiss_cheese", "synthesizer"}
        if v not in valid_agents:
            raise ValueError(f"Invalid agent_name. Must be one of: {valid_agents}")
        return v

    @validator('model')
    def validate_model(cls, v):
        # List of supported free models
        valid_models = {
            "deepseek/deepseek-chat-v3.1:free",
            "qwen/qwen3-235b-a22b:free",
            "mistralai/mistral-small-3.2-24b-instruct:free",
            "gemini-2.5-flash",
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
            # Deprecated: "google/gemini-2.0-flash-exp:free" (EOL: Feb 26, 2026)
            "nvidia/nemotron-nano-9b-v2:free",
            "z-ai/glm-4.5-air:free",
            "moonshotai/kimi-k2:free",
            "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
            "meta-llama/llama-4-maverick:free",
            "qwen/qwen2.5-vl-32b-instruct:free",
            "google/gemma-3-12b-it:free",
            "google/gemma-3-27b-it:free"
        }
        if v not in valid_models:
            raise ValueError(f"Invalid model. Must be one of the supported free models: {valid_models}")
        return v


class AgentConfigCreate(AgentConfigBase):
    """Create new agent configuration"""
    pass


class AgentConfigUpdate(AgentConfigBase):
    """Update existing agent configuration"""
    agent_name: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class AgentConfigResponse(AgentConfigBase):
    """Agent configuration response"""
    id: int
    user_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime] = None
    total_executions: int
    avg_execution_time_ms: Optional[float] = None

    class Config:
        from_attributes = True


class AgentTestRequest(BaseModel):
    """Request to test an agent with custom prompt"""
    agent_name: str = Field(..., description="Agent to test")
    test_prompt: str = Field(..., min_length=10, max_length=2000, description="Test prompt to send to agent")
    use_config_id: Optional[int] = Field(None, description="Use specific config ID, or default if None")

    @validator('agent_name')
    def validate_agent_name(cls, v):
        valid_agents = {"validator", "risk_assessor", "swiss_cheese", "synthesizer"}
        if v not in valid_agents:
            raise ValueError(f"Invalid agent_name. Must be one of: {valid_agents}")
        return v


class AgentTestResponse(BaseModel):
    """Response from agent test"""
    agent_name: str
    model_used: str
    test_prompt: str
    response: str
    execution_time_ms: float
    token_usage: Dict[str, int]
    success: bool
    error: Optional[str] = None


class AgentStatusResponse(BaseModel):
    """Current status of all agents"""
    agents: List[AgentConfigResponse]
    total_agents: int
    active_agents: int
    last_execution: Optional[datetime] = None
    available_models: List[Dict[str, str]]


class BulkConfigUpdateRequest(BaseModel):
    """Update multiple agent configurations at once"""
    configs: List[AgentConfigCreate] = Field(..., description="List of agent configurations to update")

    @validator('configs')
    def validate_unique_agents(cls, v):
        agent_names = [config.agent_name for config in v]
        if len(agent_names) != len(set(agent_names)):
            raise ValueError("Duplicate agent names not allowed in bulk update")
        return v


class PerformanceMetrics(BaseModel):
    """Performance metrics for an agent"""
    agent_name: str
    total_executions: int
    avg_execution_time_ms: float
    success_rate: float
    last_30_days_executions: int
    model_performance: Dict[str, Any]


class AgentPerformanceResponse(BaseModel):
    """Performance analytics for all agents"""
    metrics: List[PerformanceMetrics]
    overall_stats: Dict[str, Any]
    period: str = "last_30_days"


# Available models for frontend dropdown
AVAILABLE_MODELS = [
    {
        "value": "deepseek/deepseek-chat-v3.1:free",
        "label": "DeepSeek Chat v3.1 (Recommended)",
        "description": "Fast, accurate reasoning for validation tasks",
        "best_for": ["validator", "swiss_cheese"]
    },
    {
        "value": "qwen/qwen3-235b-a22b:free",
        "label": "Qwen 235B",
        "description": "Large model with excellent comprehension",
        "best_for": ["risk_assessor", "synthesizer"]
    },
    {
        "value": "mistralai/mistral-small-3.2-24b-instruct:free",
        "label": "Mistral Small 3.2",
        "description": "Balanced performance for structured tasks",
        "best_for": ["validator", "risk_assessor"]
    },
    {
        "value": "google/gemini-2.0-flash-exp:free",
        "label": "Gemini 2.0 Flash (Current Default)",
        "description": "Fast, reliable performance across all tasks",
        "best_for": ["validator", "risk_assessor", "swiss_cheese", "synthesizer"]
    },
    {
        "value": "nvidia/nemotron-nano-9b-v2:free",
        "label": "Nemotron Nano 9B",
        "description": "Efficient model for quick responses",
        "best_for": ["validator"]
    },
    {
        "value": "z-ai/glm-4.5-air:free",
        "label": "GLM 4.5 Air",
        "description": "Lightweight model with good reasoning",
        "best_for": ["validator", "risk_assessor"]
    },
    {
        "value": "moonshotai/kimi-k2:free",
        "label": "Kimi K2",
        "description": "Advanced reasoning capabilities",
        "best_for": ["swiss_cheese", "synthesizer"]
    },
    {
        "value": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        "label": "Dolphin Mistral 24B",
        "description": "Creative problem-solving model",
        "best_for": ["swiss_cheese"]
    },
    {
        "value": "meta-llama/llama-4-maverick:free",
        "label": "Llama 4 Maverick",
        "description": "Next-generation reasoning model",
        "best_for": ["risk_assessor", "synthesizer"]
    },
    {
        "value": "qwen/qwen2.5-vl-32b-instruct:free",
        "label": "Qwen VL 32B",
        "description": "Vision-language model for complex analysis",
        "best_for": ["risk_assessor", "swiss_cheese"]
    },
    {
        "value": "google/gemma-3-12b-it:free",
        "label": "Gemma 3 12B",
        "description": "Instruction-tuned for safety applications",
        "best_for": ["validator", "synthesizer"]
    },
    {
        "value": "google/gemma-3-27b-it:free",
        "label": "Gemma 3 27B",
        "description": "Larger Gemma for complex reasoning",
        "best_for": ["swiss_cheese", "synthesizer"]
    }
]