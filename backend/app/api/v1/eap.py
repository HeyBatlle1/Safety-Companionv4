"""
EAP (Emergency Action Plan) API Routes

Endpoints for generating and managing OSHA-compliant Emergency Action Plans.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, Field
import json

from app.core.deps import get_db
from app.models.eap import EAPQuestionnaire, GeneratedEAP
from app.services.eap_generator import get_eap_service


router = APIRouter(prefix="/eap", tags=["EAP Generator"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class EmergencyContact(BaseModel):
    name: str
    title: str
    phone: str
    email: Optional[str] = None


class Facility(BaseModel):
    name: str
    address: str
    phone: str
    distance: Optional[str] = None


class AssemblyArea(BaseModel):
    location: str
    description: Optional[str] = None
    capacity: Optional[int] = None


class AlarmSystem(BaseModel):
    type: str
    location: str
    activation: str


class HazardConfig(BaseModel):
    fall_from_height: bool = False
    confined_space: bool = False
    excavation: bool = False
    electrical: bool = False
    hazardous_materials: bool = False
    crane_operations: bool = False
    hot_work: bool = False
    heavy_equipment: bool = False
    noise: bool = False
    dust: bool = False


class EAPQuestionnaireRequest(BaseModel):
    """Complete EAP questionnaire submission"""
    # Company Info
    company_name: str = Field(..., min_length=1)
    site_address: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=2, max_length=2)
    zip_code: Optional[str] = None
    
    # Site Details
    site_type: str = Field(..., pattern="^(construction|general_industry|maritime)$")
    building_type: Optional[str] = None
    building_height: Optional[int] = None
    work_elevation: Optional[int] = 0
    total_employees: int = Field(..., ge=1)
    project_description: Optional[str] = None
    construction_phase: Optional[str] = None
    
    # Hazards
    hazards: HazardConfig
    equipment: List[str] = Field(default_factory=list)
    weather_concerns: List[str] = Field(default_factory=list)
    
    # Emergency Contacts
    emergency_coordinator: EmergencyContact
    alternate_coordinator: EmergencyContact
    
    # Facilities
    nearest_hospital: Facility
    fire_station: Facility
    local_police: Facility
    
    # Assembly Areas
    primary_assembly: AssemblyArea
    secondary_assembly: AssemblyArea
    
    # Safety Systems
    alarm_systems: List[AlarmSystem] = Field(default_factory=list)
    radio_channel: Optional[str] = None
    rescue_option: Optional[str] = Field(None, pattern="^(internal|external|both)$")
    rescue_capability: Optional[str] = None


class EAPGenerateResponse(BaseModel):
    """Response when EAP generation is initiated"""
    id: str
    questionnaire_id: str
    status: str
    message: str


class GeneratedEAPResponse(BaseModel):
    """Full generated EAP response"""
    id: str
    questionnaire_id: str
    eap_document: Dict[str, Any]
    osha_compliant: bool
    completeness: int
    procedure_count: int
    generation_time_ms: Optional[int] = None
    created_at: str


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/generate", response_model=GeneratedEAPResponse)
async def generate_eap(
    request: EAPQuestionnaireRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate an OSHA-compliant Emergency Action Plan.
    
    This endpoint:
    1. Saves the questionnaire to the database
    2. Runs the 4-agent EAP generation pipeline
    3. Returns the complete generated EAP
    
    The 4-agent pipeline:
    - Agent 1: EAP Analyzer - Analyzes questionnaire, identifies risks
    - Agent 2: Procedure Generator - Creates emergency procedures
    - Agent 3: OSHA Compliance Checker - Validates against 1910.38
    - Agent 4: Document Assembler - Compiles final EAP document
    """
    try:
        # Convert request to dict for processing
        questionnaire_data = request.model_dump()
        
        # Convert nested objects to JSON-serializable dicts
        questionnaire_data["hazards"] = request.hazards.model_dump()
        questionnaire_data["emergency_coordinator"] = request.emergency_coordinator.model_dump()
        questionnaire_data["alternate_coordinator"] = request.alternate_coordinator.model_dump()
        questionnaire_data["nearest_hospital"] = request.nearest_hospital.model_dump()
        questionnaire_data["fire_station"] = request.fire_station.model_dump()
        questionnaire_data["local_police"] = request.local_police.model_dump()
        questionnaire_data["primary_assembly"] = request.primary_assembly.model_dump()
        questionnaire_data["secondary_assembly"] = request.secondary_assembly.model_dump()
        questionnaire_data["alarm_systems"] = [a.model_dump() for a in request.alarm_systems]
        
        # Save questionnaire to database
        db_questionnaire = EAPQuestionnaire(
            company_name=request.company_name,
            site_address=request.site_address,
            city=request.city,
            state=request.state,
            zip_code=request.zip_code,
            site_type=request.site_type,
            building_type=request.building_type,
            building_height=request.building_height,
            work_elevation=request.work_elevation,
            total_employees=request.total_employees,
            project_description=request.project_description,
            construction_phase=request.construction_phase,
            hazards=questionnaire_data["hazards"],
            equipment=request.equipment,
            weather_concerns=request.weather_concerns,
            emergency_coordinator=questionnaire_data["emergency_coordinator"],
            alternate_coordinator=questionnaire_data["alternate_coordinator"],
            nearest_hospital=questionnaire_data["nearest_hospital"],
            fire_station=questionnaire_data["fire_station"],
            local_police=questionnaire_data["local_police"],
            primary_assembly=questionnaire_data["primary_assembly"],
            secondary_assembly=questionnaire_data["secondary_assembly"],
            alarm_systems=questionnaire_data["alarm_systems"],
            radio_channel=request.radio_channel,
            rescue_option=request.rescue_option,
            rescue_capability=request.rescue_capability
        )
        
        db.add(db_questionnaire)
        await db.commit()
        await db.refresh(db_questionnaire)
        
        # Add ID to questionnaire data for processing
        questionnaire_data["id"] = db_questionnaire.id
        
        # Generate EAP using service
        eap_service = get_eap_service()
        result = await eap_service.generate_eap(questionnaire_data)
        
        # Save generated EAP to database
        db_eap = GeneratedEAP(
            id=result["id"],
            questionnaire_id=db_questionnaire.id,
            eap_document=result["eap_document"],
            osha_compliant=result["osha_compliant"],
            completeness=result["completeness"],
            procedure_count=result["procedure_count"],
            agent_outputs=result.get("agent_outputs"),
            generation_time_ms=result.get("generation_time_ms")
        )
        
        db.add(db_eap)
        await db.commit()
        await db.refresh(db_eap)
        
        return GeneratedEAPResponse(
            id=str(db_eap.id),
            questionnaire_id=str(db_questionnaire.id),
            eap_document=result["eap_document"],
            osha_compliant=result["osha_compliant"],
            completeness=result["completeness"],
            procedure_count=result["procedure_count"],
            generation_time_ms=result.get("generation_time_ms"),
            created_at=db_eap.created_at.isoformat() if db_eap.created_at else datetime.utcnow().isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"❌ EAP generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"EAP generation failed: {str(e)}"
        )


@router.get("/{eap_id}", response_model=GeneratedEAPResponse)
async def get_eap(
    eap_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a generated EAP by ID"""
    try:
        result = await db.execute(
            select(GeneratedEAP).where(GeneratedEAP.id == eap_id)
        )
        eap = result.scalar_one_or_none()
        
        if not eap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"EAP not found: {eap_id}"
            )
        
        return GeneratedEAPResponse(
            id=str(eap.id),
            questionnaire_id=str(eap.questionnaire_id),
            eap_document=eap.eap_document,
            osha_compliant=eap.osha_compliant,
            completeness=eap.completeness,
            procedure_count=eap.procedure_count,
            generation_time_ms=eap.generation_time_ms,
            created_at=eap.created_at.isoformat() if eap.created_at else datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch EAP: {str(e)}"
        )


@router.get("/questionnaire/{questionnaire_id}")
async def get_questionnaire(
    questionnaire_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get an EAP questionnaire by ID"""
    try:
        result = await db.execute(
            select(EAPQuestionnaire).where(EAPQuestionnaire.id == questionnaire_id)
        )
        questionnaire = result.scalar_one_or_none()
        
        if not questionnaire:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Questionnaire not found: {questionnaire_id}"
            )
        
        return {
            "id": str(questionnaire.id),
            "company_name": questionnaire.company_name,
            "site_address": questionnaire.site_address,
            "city": questionnaire.city,
            "state": questionnaire.state,
            "zip_code": questionnaire.zip_code,
            "site_type": questionnaire.site_type,
            "total_employees": questionnaire.total_employees,
            "hazards": questionnaire.hazards,
            "emergency_coordinator": questionnaire.emergency_coordinator,
            "primary_assembly": questionnaire.primary_assembly,
            "created_at": questionnaire.created_at.isoformat() if questionnaire.created_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch questionnaire: {str(e)}"
        )


@router.get("/list/recent")
async def list_recent_eaps(
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """List recently generated EAPs"""
    try:
        result = await db.execute(
            select(GeneratedEAP)
            .order_by(desc(GeneratedEAP.created_at))
            .limit(min(limit, 100))
        )
        eaps = result.scalars().all()
        
        return {
            "eaps": [
                {
                    "id": str(eap.id),
                    "questionnaire_id": str(eap.questionnaire_id),
                    "osha_compliant": eap.osha_compliant,
                    "completeness": eap.completeness,
                    "procedure_count": eap.procedure_count,
                    "created_at": eap.created_at.isoformat() if eap.created_at else None
                }
                for eap in eaps
            ],
            "total": len(eaps)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list EAPs: {str(e)}"
        )


@router.delete("/{eap_id}")
async def delete_eap(
    eap_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a generated EAP and its questionnaire"""
    try:
        from sqlalchemy import delete
        
        # Get EAP to find questionnaire
        result = await db.execute(
            select(GeneratedEAP).where(GeneratedEAP.id == eap_id)
        )
        eap = result.scalar_one_or_none()
        
        if not eap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"EAP not found: {eap_id}"
            )
        
        questionnaire_id = eap.questionnaire_id
        
        # Delete EAP
        await db.execute(
            delete(GeneratedEAP).where(GeneratedEAP.id == eap_id)
        )
        
        # Delete questionnaire
        await db.execute(
            delete(EAPQuestionnaire).where(EAPQuestionnaire.id == questionnaire_id)
        )
        
        await db.commit()
        
        return {
            "status": "deleted",
            "message": f"EAP {eap_id} and associated questionnaire deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete EAP: {str(e)}"
        )
