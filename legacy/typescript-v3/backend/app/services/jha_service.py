"""
JHA Analysis Service

Handles business logic for Job Hazard Analysis processing.
Orchestrates the 4-agent pipeline and manages database persistence.
"""

from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.orchestrator import JHAOrchestrator
from app.agents.registry import AgentRegistry
from app.schemas.jha import JHAAnalysisRequest, JHAAnalysisResponse, JHALiveUpdateRequest, JHALiveUpdateResponse


class JHAService:
    """Service for JHA analysis operations"""

    def __init__(self, db: AsyncSession, agent_registry: AgentRegistry):
        self.db = db
        self.orchestrator = JHAOrchestrator(agent_registry, db)

    async def analyze_checklist(
        self,
        request: JHAAnalysisRequest,
        user_id: UUID,
        company_id: Optional[UUID] = None
    ) -> JHAAnalysisResponse:
        """
        Process Master JHA checklist through 4-agent pipeline.

        This matches the V1 endpoint: POST /api/checklist-analysis
        """

        return await self.orchestrator.execute_full_analysis(
            request=request,
            user_id=user_id,
            company_id=company_id
        )

    async def live_update(
        self,
        analysis_id: UUID,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update existing JHA with new conditions (e.g., weather changes).

        Re-runs Agent 2 (Risk) and Agent 3 (Swiss Cheese) only.
        """

        return await self.orchestrator.execute_live_update(
            analysis_id=analysis_id,
            update_data=update_data
        )