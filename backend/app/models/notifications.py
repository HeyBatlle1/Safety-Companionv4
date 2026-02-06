from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.models.base import Base

class NotificationPreference(Base):
    """Notification preferences - matches Drizzle notificationPreferences table"""
    __tablename__ = "notification_preferences"
    __table_args__ = (
        Index('notification_preferences_user_id_idx', 'user_id'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    email_enabled = Column(Boolean, name="email_enabled", default=True, nullable=False)
    sms_enabled = Column(Boolean, name="sms_enabled", default=False, nullable=False)
    push_enabled = Column(Boolean, name="push_enabled", default=True, nullable=False)
    safety_alerts = Column(Boolean, name="safety_alerts", default=True, nullable=False)
    incident_reports = Column(Boolean, name="incident_reports", default=True, nullable=False)
    system_updates = Column(Boolean, name="system_updates", default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), name="updated_at", onupdate=datetime.utcnow)