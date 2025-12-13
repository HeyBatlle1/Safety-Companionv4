from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Index, Boolean, JSON

from datetime import datetime
import uuid
from app.models.base import Base, APP_SCHEMA

class AnalysisHistory(Base):
    """Analysis history - matches Drizzle analysisHistory table"""
    __tablename__ = "analysis_history"
    __table_args__ = (
        Index('analysis_history_user_id_idx', 'user_id'),
        Index('analysis_history_type_idx', 'type'),
        Index('analysis_history_risk_score_idx', 'risk_score'),
        Index('analysis_history_created_at_idx', 'created_at'),
        # {'schema': APP_SCHEMA} # Removed for SQLite compatibility
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE')) # Assuming users uses String id
    user_id = Column(String, nullable=True) # Temporarily removing FK constraint strictness or checking user model
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    type = Column(Text, nullable=False)
    risk_score = Column(Integer)
    sentiment_score = Column(Integer)
    urgency_level = Column(Text)
    safety_categories = Column(JSON, name="safety_categories")
    keyword_tags = Column(JSON, name="keyword_tags")
    confidence_score = Column(Integer, name="confidence_score")
    behavior_indicators = Column(JSON, name="behavior_indicators")
    compliance_score = Column(Integer, name="compliance_score")
    metadata_json = Column(JSON, name="metadata")
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), name="updated_at", onupdate=datetime.utcnow)

class AgentOutput(Base):
    """Agent outputs - matches Drizzle agentOutputs table"""
    __tablename__ = "agent_outputs"
    __table_args__ = (
        Index('agent_outputs_analysis_id_idx', 'analysis_id'),
        Index('agent_outputs_agent_type_idx', 'agent_type'),
        Index('agent_outputs_created_at_idx', 'created_at'),
        # {'schema': APP_SCHEMA} # Removed for SQLite
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String, ForeignKey('analysis_history.id', ondelete='CASCADE'))
    agent_id = Column(Text, name="agent_id", nullable=False)
    agent_name = Column(Text, name="agent_name", nullable=False)
    agent_type = Column(Text, name="agent_type", nullable=False)
    output_data = Column(JSON, name="output_data", nullable=False)
    execution_metadata = Column(JSON, name="execution_metadata")
    success = Column(Boolean, default=True, nullable=False)
    error_details = Column(Text, name="error_details")
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)