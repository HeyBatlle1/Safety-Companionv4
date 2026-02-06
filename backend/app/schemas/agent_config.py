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
        # List of supported models (Grok 4.1 fast is primary)
        valid_models = {
            # Primary - Grok via OpenRouter
            "x-ai/grok-4.1-fast",
            "x-ai/grok-4-fast",
            "x-ai/grok-4",
            # Free tier alternatives
            "deepseek/deepseek-chat-v3.1:free",
            "qwen/qwen3-235b-a22b:free",
            "mistralai/mistral-small-3.2-24b-instruct:free",
            "gemini-2.5-flash",
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
            "nvidia/nemotron-nano-9b-v2:free",
            "google/gemma-3-12b-it:free",
            "google/gemma-3-27b-it:free"
        }
        if v not in valid_models:
            raise ValueError(f"Invalid model. Must be one of the supported models: {valid_models}")
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
        "value": "x-ai/grok-4.1-fast",
        "label": "Grok 4.1 Fast (Primary - Recommended)",
        "description": "xAI's fastest model with excellent reasoning for safety analysis",
        "best_for": ["validator", "risk_assessor", "swiss_cheese", "synthesizer"]
    },
    {
        "value": "x-ai/grok-4-fast",
        "label": "Grok 4 Fast",
        "description": "High-performance xAI model for complex analysis",
        "best_for": ["risk_assessor", "swiss_cheese"]
    },
    {
        "value": "x-ai/grok-4",
        "label": "Grok 4 (Full)",
        "description": "xAI's most capable model for deep reasoning",
        "best_for": ["swiss_cheese", "synthesizer"]
    },
    {
        "value": "gemini-2.5-flash",
        "label": "Gemini 2.5 Flash (Fallback)",
        "description": "Google's fast model - used if OpenRouter unavailable",
        "best_for": ["validator", "risk_assessor", "swiss_cheese", "synthesizer"]
    },
    {
        "value": "anthropic/claude-3.5-sonnet",
        "label": "Claude 3.5 Sonnet",
        "description": "Anthropic's balanced model for complex tasks",
        "best_for": ["risk_assessor", "synthesizer"]
    },
    {
        "value": "deepseek/deepseek-chat-v3.1:free",
        "label": "DeepSeek Chat v3.1 (Free)",
        "description": "Fast, accurate reasoning - free tier",
        "best_for": ["validator", "swiss_cheese"]
    },
    {
        "value": "google/gemma-3-27b-it:free",
        "label": "Gemma 3 27B (Free)",
        "description": "Google's open model for safety applications",
        "best_for": ["swiss_cheese", "synthesizer"]
    }
]