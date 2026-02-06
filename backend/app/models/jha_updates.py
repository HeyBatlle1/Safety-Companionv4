from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Index, Boolean, JSON
from datetime import datetime
import uuid
from app.models.base import Base

class JHAUpdate(Base):
    """
    Live updates to existing JHAs via natural language input.
    Replaces generic chat with purpose-built field update system.
    """
    __tablename__ = "jha_updates"
    __table_args__ = (
        Index('jha_updates_original_jha_id_idx', 'original_jha_id'),
        Index('jha_updates_user_id_idx', 'user_id'),
        Index('jha_updates_requires_action_idx', 'requires_action'),
        Index('jha_updates_created_at_idx', 'created_at'),
        # {'schema': APP_SCHEMA} # Removed for SQLite
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Link to original JHA analysis
    original_jha_id = Column(
        String,
        ForeignKey('analysis_history.id', ondelete='CASCADE'),
        nullable=False
    )
    user_id = Column(
        String,
        # ForeignKey('users.id', ondelete='CASCADE'), # FK disabled for now
        nullable=False
    )

    # Input: What the user said
    voice_input = Column(Text, name="voice_input", nullable=False)
    update_type = Column(Text, name="update_type")  # 'environmental', 'crew', 'scope', 'equipment'

    # Extracted: Structured data from NLP
    extracted_variables = Column(JSON, name="extracted_variables")
    # Example: {"wind_speed": 30, "temperature": 35, "crew_size": 4, "precipitation": true}

    # Analysis: What changed
    previous_risk_score = Column(Integer, name="previous_risk_score")
    updated_risk_score = Column(Integer, name="updated_risk_score")
    risk_delta = Column(Integer, name="risk_delta")  # positive = risk increased

    # Detected changes
    new_hazards = Column(JSON, name="new_hazards")
    # Example: [{"hazard": "fall_risk", "reason": "high_wind", "severity": "high"}]

    removed_hazards = Column(JSON, name="removed_hazards")
    changed_mitigations = Column(JSON, name="changed_mitigations")

    # Output: What to tell the crew
    crew_alert = Column(Text, name="crew_alert")
    # Example: "⚠️ STOP WORK: Wind speed exceeds safe limits for overhead work"

    alert_severity = Column(Text, name="alert_severity")  # 'info', 'warning', 'critical'
    requires_action = Column(Boolean, name="requires_action", default=False)
    action_required = Column(Text, name="action_required")
    # Example: "Deploy additional fall protection before resuming work"

    # Status tracking
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String, nullable=True) # FK to user removed
    acknowledged_at = Column(DateTime(timezone=True), name="acknowledged_at")

    # Analysis metadata
    gemini_response = Column(JSON, name="gemini_response")  # Full AI analysis for audit
    processing_time_ms = Column(Integer, name="processing_time_ms")

    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<JHAUpdate(id={self.id}, jha={self.original_jha_id}, risk_delta={self.risk_delta})>"