"""
JHA Analysis API Routes

FastAPI endpoints for Job Hazard Analysis processing.
Matches the V1 Node.js API endpoints.
"""

from typing import Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_jha_service
from app.core.auth import get_current_user
from app.models.user import User
from app.services.jha_service import JHAService
from app.core.database import AsyncSessionLocal
from app.models.analysis import AnalysisHistory
from fastapi import BackgroundTasks
import json
from app.schemas.jha import (
    JHAAnalysisRequest,
    JHAAnalysisResponse,
    JHALiveUpdateRequest,
    JHALiveUpdateResponse,
    JHAUpdateAcknowledge
)

router = APIRouter(prefix="/jha", tags=["JHA Analysis"])



async def run_analysis_background(analysis_id: str, request_data: Dict[str, Any], user_id: UUID):
    """Background task to run full analysis"""
    async with AsyncSessionLocal() as session:
        from app.core.deps import get_agent_registry
        from app.agents.orchestrator import JHAOrchestrator
        from app.schemas.jha import JHAAnalysisRequest

        registry = get_agent_registry()
        orchestrator = JHAOrchestrator(registry, session)
        
        # Reconstruct request object
        request = JHAAnalysisRequest(**request_data)
        
        await orchestrator.execute_full_analysis(
            request=request, 
            user_id=user_id,
            analysis_id=analysis_id
        )

@router.post("/analyze")
async def analyze_checklist(
    request: JHAAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    jha_service: JHAService = Depends(get_jha_service)
):
    """
    Analyze Master JHA checklist through 4-agent pipeline (Background Task).

    This triggers the asynchronous analysis pipeline and returns immediately.
    Client should poll GET /jha/{id} for progress updates.
    """
    try:
        user_id = UUID("00000000-0000-0000-0000-000000000000")

        # Create initial record
        project_name = request.jobInfo.projectName if hasattr(request, 'jobInfo') else "JHA Analysis"
        analysis_record = AnalysisHistory(
            user_id=str(user_id),
            query=f"JHA Analysis - {project_name}",
            response=json.dumps({"status": "queued", "progress": 0}),
            type="jha_multi_agent_analysis"
        )
        
        db.add(analysis_record)
        await db.commit()
        await db.refresh(analysis_record)

        # Trigger background task
        background_tasks.add_task(
            run_analysis_background,
            str(analysis_record.id),
            request.dict(),
            user_id
        )

        return {
            "id": str(analysis_record.id),
            "status": "queued",
            "project_name": project_name,
            "created_at": analysis_record.created_at.isoformat()
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis submission failed: {str(e)}"
        )



# Legacy compatibility route for old frontend
@router.post("/jha-update")
async def jha_update_legacy(
    request: JHAAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    jha_service: JHAService = Depends(get_jha_service)
):
    """
    Legacy endpoint for old frontend compatibility.
    Maps to the same analyze_checklist function.
    """
    return await analyze_checklist(request, db, jha_service)


@router.post("/live-update", response_model=JHALiveUpdateResponse)
async def live_update(
    request: JHALiveUpdateRequest,
    jha_service: JHAService = Depends(get_jha_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update existing JHA with live field conditions.

    **Use Cases:**
    - Weather conditions changed
    - Crew size modified
    - Equipment status updated
    - New hazards identified

    **Process:**
    - Re-runs Agent 2 (Risk Assessment) with new data
    - Re-runs Agent 3 (Swiss Cheese) for updated predictions
    - Generates crew alerts if risk threshold breached
    """
    try:
        user_id = UUID(current_user.id)

        # TODO: Implement live update logic in JHAService
        # For now, return placeholder
        return JHALiveUpdateResponse(
            id=uuid4(),
            original_jha_id=request.original_jha_id,
            user_id=user_id,
            voice_input=request.voice_input,
            requires_action=False,
            acknowledged=False,
            created_at=datetime.utcnow()
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Live update failed: {str(e)}"
        )


@router.post("/acknowledge")
async def acknowledge_update(
    request: JHAUpdateAcknowledge,
    db: AsyncSession = Depends(get_db)
):
    """
    Acknowledge a JHA update alert.

    **Purpose:**
    - Confirms crew received and understood the safety alert
    - Closes the safety loop for compliance tracking
    - Required for critical/stop-work alerts
    """
    try:
        # TODO: Implement acknowledgment logic
        # Update JHAUpdate model with acknowledgment details

        return {
            "status": "acknowledged",
            "update_id": str(request.update_id),
            "acknowledged_by": str(request.acknowledged_by),
            "acknowledged_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Acknowledgment failed: {str(e)}"
        )


@router.get("/recent")
async def get_recent_jhas(
    limit: int = 10,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent JHA analyses with pagination.
    
    **Parameters:**
    - limit: Number of records to return (default: 10, max: 100)
    - offset: Number of records to skip (default: 0)
    
    **Returns:**
    - List of JHA analyses with metadata
    """
    try:
        from app.models.analysis import AnalysisHistory
        from sqlalchemy import select, desc
        import json
        
        # Limit max results
        limit = min(limit, 100)
        
        # Query recent JHAs
        query = (
            select(AnalysisHistory)
            .where(AnalysisHistory.type == "jha_multi_agent_analysis")
            .order_by(desc(AnalysisHistory.created_at))
            .limit(limit)
            .offset(offset)
        )
        
        result = await db.execute(query)
        jhas = result.scalars().all()
        
        # Format response
        jha_list = []
        for jha in jhas:
            # Parse response JSON
            try:
                analysis_data = json.loads(jha.response) if jha.response else {}
            except json.JSONDecodeError:
                # Handle case where response indicates processing or is not valid JSON
                analysis_data = {"status": "processing" if "Generating" in str(jha.response) else "error"}
            
            jha_list.append({
                "id": str(jha.id),
                "project_name": jha.query.replace("JHA Analysis - ", ""),
                "created_at": jha.created_at.isoformat(),
                "risk_score": jha.risk_score,
                "urgency_level": jha.urgency_level,
                "go_no_go": analysis_data.get("summary", {}).get("go_no_go_decision", "UNKNOWN"),
                "safety_categories": jha.safety_categories or []
            })
        
        return {
            "jhas": jha_list,
            "total": len(jha_list),
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch JHAs: {str(e)}"
        )


@router.get("/{jha_id}")
async def get_jha_details(
    jha_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get full details of a specific JHA analysis.
    
    **Parameters:**
    - jha_id: ID of the JHA analysis
    
    **Returns:**
    - Complete JHA analysis with all agent outputs
    """
    try:
        from app.models.analysis import AnalysisHistory
        from sqlalchemy import select
        import json
        
        # Query specific JHA
        query = select(AnalysisHistory).where(AnalysisHistory.id == str(jha_id))
        result = await db.execute(query)
        jha = result.scalar_one_or_none()
        
        if not jha:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"JHA {jha_id} not found"
            )
        
        # Parse complete analysis
        try:
            analysis_data = json.loads(jha.response) if jha.response else {}
        except json.JSONDecodeError:
            analysis_data = {"status": "processing" if "Generating" in str(jha.response) else "error"}
        
        return {
            "id": str(jha.id),
            "project_name": jha.query.replace("JHA Analysis - ", ""),
            "created_at": jha.created_at.isoformat(),
            "user_id": str(jha.user_id),
            "risk_score": jha.risk_score,
            "urgency_level": jha.urgency_level,
            "safety_categories": jha.safety_categories or [],
            **analysis_data  # Include all agent outputs and metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch JHA details: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check for JHA analysis system"""
    return {
        "status": "healthy",
        "service": "jha-analysis",
        "version": "2.0.0-python",
        "agents": {
            "validator": "ready",
            "risk_assessor": "ready",
            "swiss_cheese": "ready",
            "synthesizer": "ready"
        }
    }