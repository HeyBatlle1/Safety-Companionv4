from pydantic import BaseModel, UUID4, Field
from datetime import datetime
from typing import Optional, Dict, List, Any

class SafetyReportCreate(BaseModel):
    """Schema for creating a safety report"""
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10)
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    location: Optional[str] = None
    incident_date: Optional[datetime] = None

class SafetyReportUpdate(BaseModel):
    """Schema for updating a safety report"""
    status: Optional[str] = Field(None, pattern="^(open|in_progress|resolved|closed)$")
    assigned_to: Optional[UUID4] = None
    resolution_notes: Optional[str] = None

class SafetyReportResponse(BaseModel):
    """Schema for safety report response"""
    id: UUID4
    user_id: UUID4
    title: str
    description: str
    severity: str
    status: str
    location: Optional[str] = None
    incident_date: Optional[datetime] = None
    reported_by: Optional[str] = None
    assigned_to: Optional[UUID4] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True