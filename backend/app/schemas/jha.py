from pydantic import BaseModel, UUID4, Field
from datetime import datetime
from typing import Optional, Dict, List, Any

# JHA Analysis schemas
class JobInfo(BaseModel):
    projectName: str
    location: str
    workType: str
    crewSize: int
    date: str
    supervisor: Optional[str] = None
    company: Optional[str] = None

class Hazard(BaseModel):
    id: str
    category: str
    description: str
    severity: str

class ControlMeasures(BaseModel):
    ppe: List[str]
    procedures: List[str]
    emergencyPlan: str
    additionalNotes: str

class JHAAnalysisRequest(BaseModel):
    """Request for JHA analysis - V2 structure"""
    jobInfo: JobInfo
    hazards: List[Hazard]
    controlMeasures: ControlMeasures
    
    # Optional fields for backward compatibility or future use
    weather_conditions: Optional[dict] = None
    project_data: Optional[dict] = None

    class Config:
        json_schema_extra = {
            "example": {
                "jobInfo": {
                    "projectName": "Test Project",
                    "location": "Site A",
                    "workType": "Roofing",
                    "crewSize": 5,
                    "date": "2023-10-27"
                },
                "hazards": [
                    {
                        "id": "1",
                        "category": "Fall",
                        "description": "Roof edge",
                        "severity": "high"
                    }
                ],
                "controlMeasures": {
                    "ppe": ["Helmet"],
                    "procedures": ["Tie-off"],
                    "emergencyPlan": "Call 911",
                    "additionalNotes": "None"
                }
            }
        }

class JHAAnalysisResponse(BaseModel):
    """Response from JHA analysis"""
    id: UUID4
    user_id: UUID4
    query: str
    response: str
    type: str
    risk_score: Optional[int] = None
    urgency_level: Optional[str] = None
    safety_categories: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Live Update schemas
class JHALiveUpdateRequest(BaseModel):
    """Request to update existing JHA with field conditions"""
    original_jha_id: UUID4 = Field(..., description="ID of the JHA being updated")
    voice_input: str = Field(..., min_length=5, description="Natural language update from field")
    update_type: Optional[str] = Field(None, pattern="^(environmental|crew|scope|equipment)$")

class ExtractedVariables(BaseModel):
    """Structured variables extracted from voice input"""
    wind_speed: Optional[int] = None
    temperature: Optional[int] = None
    precipitation: Optional[bool] = None
    crew_size: Optional[int] = None
    equipment_changes: Optional[List[str]] = None
    time_of_day: Optional[str] = None
    visibility: Optional[str] = None
    concern_keywords: Optional[List[str]] = None

class HazardChange(BaseModel):
    """Individual hazard that changed"""
    hazard: str
    reason: str
    severity: str
    mitigation: Optional[str] = None

class JHALiveUpdateResponse(BaseModel):
    """Response from live JHA update"""
    id: UUID4
    original_jha_id: UUID4
    user_id: UUID4
    voice_input: str
    update_type: Optional[str] = None

    # Analysis results
    extracted_variables: Optional[Dict[str, Any]] = None
    previous_risk_score: Optional[int] = None
    updated_risk_score: Optional[int] = None
    risk_delta: Optional[int] = None

    # Detected changes
    new_hazards: Optional[List[Dict[str, Any]]] = None
    removed_hazards: Optional[List[Dict[str, Any]]] = None

    # Alert information
    crew_alert: Optional[str] = None
    alert_severity: Optional[str] = None
    requires_action: bool
    action_required: Optional[str] = None

    # Status
    acknowledged: bool
    created_at: datetime

    class Config:
        from_attributes = True

class JHAUpdateAcknowledge(BaseModel):
    """Schema for acknowledging a JHA update alert"""
    update_id: UUID4
    acknowledged_by: UUID4