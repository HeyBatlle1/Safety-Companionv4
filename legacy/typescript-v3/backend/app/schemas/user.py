from pydantic import BaseModel, EmailStr, UUID4, Field
from datetime import datetime
from typing import Optional

# Base schemas (shared fields)
class UserBase(BaseModel):
    email: EmailStr
    role: str = Field(default="field_worker", pattern="^(field_worker|supervisor|safety_manager|admin)$")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

# Request schemas
class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

# Response schemas
class UserResponse(UserBase):
    """Schema for user responses (no password!)"""
    id: UUID4
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True  # Allows loading from SQLAlchemy models

class UserProfile(UserResponse):
    """Extended user profile with stats"""
    login_count: int
    password_changed_at: Optional[datetime] = None