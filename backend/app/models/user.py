"""
User model for RBAC authentication.
Links Clerk auth to app-specific user data.
"""

from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.models.base import Base


class UserRole(str, enum.Enum):
    """User role levels - ordered by permission level"""
    SAFETY_DIRECTOR = "safety_director"   # Super Admin: Full access + Sign-off authority
    PROJECT_MANAGER = "project_manager"   # Admin: Full access - Cannot edit signed-off
    FOREMAN = "foreman"                   # Mid: Site-specific access + Create rights
    FIELD_WORKER = "field_worker"         # Low: Read-only access to self
    MASTER_ADMIN = "master_admin"         # (Legacy/System) treated same as Safety Director


class User(Base):
    """
    User model extending Clerk auth with app-specific data.
    
    Hierarchy:
    - master_admin / safety_director: See all
    - project_manager: See assigned teams
    - foreman: See assigned crew
    - field_worker: See self only
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_id = Column(Text, unique=True, nullable=True, index=True)  # Clerk auth ID
    email = Column(Text, unique=True, nullable=False)
    password = Column(Text, nullable=False, default="legacy")
    name = Column(Text)  # Full name
    first_name = Column(Text, name="first_name")
    last_name = Column(Text, name="last_name")
    role = Column(Text, default=UserRole.FIELD_WORKER.value, nullable=False)
    
    # RBAC Hierarchy
    reports_to = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_project_manager = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Profile
    phone = Column(Text)
    employee_id = Column(Text, name="employee_id")
    department = Column(Text)
    bio = Column(Text)
    avatar_url = Column(Text)
    certifications = Column(JSONB, default=list)
    emergency_contact_name = Column(Text, name="emergency_contact_name")
    emergency_contact_phone = Column(Text, name="emergency_contact_phone")
    
    # Status & Security
    is_active = Column(Boolean, name="is_active", default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), name="last_login_at")
    login_count = Column(Integer, name="login_count", default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), name="created_at", default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), name="updated_at", onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
    def is_admin(self) -> bool:
        """Check if user has admin-level permissions"""
        return self.role in [UserRole.MASTER_ADMIN.value, UserRole.SAFETY_DIRECTOR.value]
    
    def can_view_user(self, target_user: "User") -> bool:
        """Check if this user can view another user based on RBAC"""
        # Admins can view everyone
        if self.is_admin():
            return True
        
        # Self can always view self
        if self.id == target_user.id:
            return True
        
        # PM can view their team
        if self.role == UserRole.PROJECT_MANAGER.value:
            return target_user.assigned_project_manager == self.id
        
        # Foreman can view their crew
        if self.role == UserRole.FOREMAN.value:
            return target_user.reports_to == self.id
        
        return False
    
    def can_manage_user(self, target_user: "User") -> bool:
        """Check if this user can manage (edit) another user"""
        # Only admins can manage others
        if not self.is_admin():
            return self.id == target_user.id  # Can only edit self
        return True


class Site(Base):
    """Site/project location"""
    __tablename__ = "sites"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(Text, nullable=False)
    address = Column(Text, nullable=False)
    project_manager_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    is_active = Column(Boolean, default=True)


class SiteAssignment(Base):
    """User assignment to site"""
    __tablename__ = "site_assignments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(String, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(String, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), default=datetime.utcnow)