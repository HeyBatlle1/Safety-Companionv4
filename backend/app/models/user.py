from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.models.base import Base, APP_SCHEMA

class User(Base):
    """User model - matches Drizzle users table"""
    __tablename__ = "users"
    # __table_args__ = {'schema': APP_SCHEMA} # Removed for SQLite

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(Text, unique=True, nullable=False)
    password = Column(Text, nullable=False)
    role = Column(Text, default="field_worker", nullable=False)
    first_name = Column(Text, name="first_name")
    last_name = Column(Text, name="last_name")
    phone = Column(Text)
    employee_id = Column(Text, name="employee_id")
    department = Column(Text)
    emergency_contact_name = Column(Text, name="emergency_contact_name")
    emergency_contact_phone = Column(Text, name="emergency_contact_phone")
    is_active = Column(Boolean, name="is_active", default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), name="last_login_at")
    login_count = Column(Integer, name="login_count", default=0)
    failed_login_attempts = Column(Integer, name="failed_login_attempts", default=0)
    account_locked_until = Column(DateTime(timezone=True), name="account_locked_until")
    password_changed_at = Column(DateTime(timezone=True), name="password_changed_at")
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), name="updated_at", onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"