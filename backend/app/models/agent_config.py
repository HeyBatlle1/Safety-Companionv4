"""
Agent Configuration Model

Database model for storing AI agent configurations including:
- Model selection per agent
- Temperature and token limits
- User-specific configurations
- Performance tracking
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class AgentConfiguration(Base):
    """
    User-configurable AI agent settings.

    Allows administrators to configure each of the 4 agents:
    - Agent 1: JHA Validator
    - Agent 2: Risk Assessor
    - Agent 3: Swiss Cheese Analyzer
    - Agent 4: Synthesizer
    """
    __tablename__ = "agent_configurations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)  # String to support UUID or int IDs
    agent_name = Column(String(50), nullable=False, index=True)  # "validator", "risk_assessor", "swiss_cheese", "synthesizer"

    # Model configuration
    model = Column(String(100), nullable=False)  # "deepseek/deepseek-chat-v3.1:free"
    temperature = Column(Float, default=0.7, nullable=False)  # 0.0 - 1.0
    max_tokens = Column(Integer, default=4000, nullable=False)  # Token limit

    # Metadata
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Performance tracking (optional - for analytics)
    last_used_at = Column(DateTime, nullable=True)
    total_executions = Column(Integer, default=0, nullable=False)
    avg_execution_time_ms = Column(Float, nullable=True)

    # Notes for admin
    notes = Column(Text, nullable=True)

    # Ensure one config per agent per user
    __table_args__ = (
        UniqueConstraint('user_id', 'agent_name', name='_user_agent_config'),
    )

    def __repr__(self):
        return f"<AgentConfig(user={self.user_id}, agent={self.agent_name}, model={self.model})>"


class AgentPerformanceLog(Base):
    """
    Performance tracking for agent executions.

    Stores metrics for each agent execution to help optimize configurations.
    """
    __tablename__ = "agent_performance_logs"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("agent_configurations.id"), nullable=False)

    # Execution details
    execution_id = Column(String(50), nullable=False, index=True)  # Links to JHA execution
    execution_time_ms = Column(Float, nullable=False)
    token_usage_input = Column(Integer, nullable=True)
    token_usage_output = Column(Integer, nullable=True)
    token_usage_total = Column(Integer, nullable=True)

    # Success tracking
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)

    # Quality metrics (if available)
    output_quality_score = Column(Float, nullable=True)  # 0.0 - 1.0

    executed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    config = relationship("AgentConfiguration", backref="performance_logs")

    def __repr__(self):
        return f"<AgentPerformanceLog(config_id={self.config_id}, execution_time={self.execution_time_ms}ms)>"


# Default configurations for the 4 agents
# Uses OpenRouter with x-ai/grok-4.1-fast for all agents
DEFAULT_AGENT_CONFIGS = {
    "validator": {
        "agent_name": "validator",
        "model": "x-ai/grok-4.1-fast",
        "temperature": 0.3,
        "max_tokens": 12000,
        "notes": "Grok 4.1 Fast via OpenRouter - Fast validation, completeness checks"
    },
    "risk_assessor": {
        "agent_name": "risk_assessor",
        "model": "x-ai/grok-4.1-fast",
        "temperature": 0.7,
        "max_tokens": 16000,
        "notes": "Grok 4.1 Fast via OpenRouter - Deep reasoning for risk assessment"
    },
    "swiss_cheese": {
        "agent_name": "swiss_cheese",
        "model": "x-ai/grok-4.1-fast",
        "temperature": 0.5,
        "max_tokens": 16000,
        "notes": "Grok 4.1 Fast via OpenRouter - OSHA compliance analysis"
    },
    "synthesizer": {
        "agent_name": "synthesizer",
        "model": "x-ai/grok-4.1-fast",
        "temperature": 0.4,
        "max_tokens": 12000,
        "notes": "Grok 4.1 Fast via OpenRouter - Fast final report generation"
    }
}