from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Index, Boolean, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.models.base import Base

class SafetyReport(Base):
    """Safety reports - matches Drizzle safetyReports table"""
    __tablename__ = "safety_reports"
    __table_args__ = (
        Index('safety_reports_user_id_idx', 'user_id'),
        Index('safety_reports_severity_idx', 'severity'),
        Index('safety_reports_status_idx', 'status'),
        Index('safety_reports_created_at_idx', 'created_at'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Text, nullable=False)
    status = Column(Text, default='open', nullable=False)
    location = Column(Text)
    incident_date = Column(DateTime(timezone=True), name="incident_date")
    reported_by = Column(Text, name="reported_by")
    assigned_to = Column(String, ForeignKey('users.id', ondelete='SET NULL'), name="assigned_to")
    resolution_notes = Column(Text, name="resolution_notes")
    resolved_at = Column(DateTime(timezone=True), name="resolved_at")
    attachments = Column(JSONB)
    metadata_json = Column(JSONB, name="metadata")
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), name="updated_at", onupdate=datetime.utcnow)


class RiskAssessment(Base):
    """Risk assessments - matches Drizzle riskAssessments table"""
    __tablename__ = "risk_assessments"
    __table_args__ = (
        Index('risk_assessments_user_id_idx', 'user_id'),
        Index('risk_assessments_overall_risk_idx', 'overall_risk_level'),
        Index('risk_assessments_created_at_idx', 'created_at'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    assessment_type = Column(Text, name="assessment_type", nullable=False)
    assessment_data = Column(JSONB, name="assessment_data", nullable=False)
    risk_factors = Column(JSONB, name="risk_factors")
    mitigation_strategies = Column(JSONB, name="mitigation_strategies")
    overall_risk_level = Column(Text, name="overall_risk_level")
    confidence_score = Column(Integer, name="confidence_score")
    metadata_json = Column(JSONB, name="metadata")
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), name="updated_at", onupdate=datetime.utcnow)