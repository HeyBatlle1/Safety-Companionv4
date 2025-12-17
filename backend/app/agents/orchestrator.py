"""
JHA Orchestrator

Manages the 4-agent pipeline for Job Hazard Analysis.
Replicates the multiAgentSafety.ts workflow in Python.
"""

from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agents.registry import AgentRegistry
from app.agents.base import AgentTask, ModelCapability
from app.agents.profiles.jha_validator import JHAValidatorAgent
from app.agents.profiles.risk_assessor import RiskAssessor
from app.agents.profiles.swiss_cheese_analyzer import SwissCheeseAnalyzer
from app.agents.profiles.synthesis_agent import SynthesisAgent
from app.models.analysis import AnalysisHistory
from app.models.jha_updates import JHAUpdate
from app.schemas.jha import JHAAnalysisRequest, JHAAnalysisResponse
from app.services.agent_config_service import AgentConfigService
from app.api.v1.jha_stream import push_progress



class JHAOrchestrator:
    """
    Orchestrates the 4-agent JHA analysis pipeline.

    This replicates the multiAgentSafety.analyze() method from the Node backend,
    providing the same comprehensive analysis with agent output tracking.
    """

    def __init__(self, agent_registry: AgentRegistry, db: AsyncSession):
        self.registry = agent_registry
        self.db = db

        # Initialize agent profiles
        self.validator = JHAValidatorAgent(agent_registry)
        self.risk_assessor = RiskAssessor()
        self.swiss_cheese = SwissCheeseAnalyzer()
        self.synthesizer = SynthesisAgent()

        # Initialize agent config service
        self.config_service = AgentConfigService(db)

    async def execute_full_analysis(
        self,
        request: JHAAnalysisRequest,
        user_id: UUID,
        company_id: Optional[UUID] = None,
        analysis_id: Optional[str] = None
    ) -> JHAAnalysisResponse:
        """
        Execute the complete 4-agent pipeline.

        This matches the V1 endpoint: POST /api/checklist-analysis
        """
        from sqlalchemy import select
        
        pipeline_start = datetime.utcnow()

        # Create or fetch analysis record for tracking
        if analysis_id:
            result = await self.db.execute(select(AnalysisHistory).where(AnalysisHistory.id == str(analysis_id)))
            analysis_record = result.scalar_one_or_none()
            if not analysis_record:
                 # Fallback if ID provided but not found
                 project_name = request.jobInfo.projectName if hasattr(request, 'jobInfo') else "JHA Analysis"
                 analysis_record = AnalysisHistory(
                    id=str(analysis_id), # Use provided ID
                    user_id=str(user_id),
                    query=f"JHA Analysis - {project_name}",
                    response=json.dumps({"status": "queued", "progress": 0}),
                    type="jha_multi_agent_analysis"
                )
                 self.db.add(analysis_record)
        else:
            project_name = request.jobInfo.projectName if hasattr(request, 'jobInfo') else "JHA Analysis"
            analysis_record = AnalysisHistory(
                user_id=str(user_id),
                query=f"JHA Analysis - {project_name}",
                response=json.dumps({"status": "starting", "progress": 0}),
                type="jha_multi_agent_analysis"
            )
            self.db.add(analysis_record)

        if not analysis_id:
            await self.db.commit()
            await self.db.refresh(analysis_record)
        
        # Helper to update progress (DB + SSE streaming)
        async def update_progress(agent_name: str, status: str, percent: int):
            try:
                progress_data = {
                    "status": "processing",
                    "current_agent": agent_name,
                    "agent_status": status,
                    "progress": percent,
                    "elapsed_ms": int((datetime.utcnow() - pipeline_start).total_seconds() * 1000)
                }
                analysis_record.response = json.dumps(progress_data)
                await self.db.commit() # Commit incremental update
                
                # Push SSE event for real-time frontend updates
                await push_progress(str(analysis_record.id), progress_data)
            except Exception as e:
                print(f"⚠️ Failed to update progress: {e}")


        try:
            # Update status: Starting
            await update_progress("system", "initializing", 5)

            # Load agent configurations from database
            await self.config_service.ensure_default_configs_exist()
            agent_configs = await self.config_service.get_orchestrator_config()

            # Prepare base task data
            base_task_data = {
                "checklist": request.dict(),
                "weather": request.weather_conditions or {},
                "osha_data": {
                    "industryName": "Specialty Trade Contractors",
                    "naicsCode": "238",
                    "injuryRate": 35,
                    "totalCases": 198400,
                    "dataSource": "BLS_Table_1_2023"
                },
                "current_time": datetime.utcnow().isoformat()
            }


            # AGENT 1: Data Validation (Temperature from DB)
            await update_progress("agent1_validation", "running", 10)
            agent1_config = agent_configs.get("agent1_validation", {"temperature": 0.3})
            print(f"📋 Agent 1: Validating data quality... (T={agent1_config['temperature']})")
            agent1_task = AgentTask(
                task_type="jha_validation",
                input_data=base_task_data,
                temperature=agent1_config["temperature"],
                required_capabilities=[ModelCapability.FAST_REASONING, ModelCapability.STRUCTURED_OUTPUT]
            )

            validation_result = await self.validator.execute(agent1_task)
            if not validation_result.success:
                raise ValueError(f"Agent 1 validation failed: {validation_result.error}")

            validation_data = validation_result.output_data
            print(f"✓ Data quality: {validation_data.get('validation', {}).get('dataQuality', 'UNKNOWN')}")
            await update_progress("agent1_validation", "completed", 25)

            # AGENT 2: Risk Assessment
            await update_progress("agent2_risk", "running", 30)
            print(f"⚠️ Agent 2: Assessing risks with OSHA data...")
            
            # Agent 2 receives Agent 1's complete output (validation + enriched_data)
            risk_assessment = self.risk_assessor.assess(validation_data)
            
            # Wrap in 'risk' key for Agent 3/4 compatibility
            risk_data = {"risk": risk_assessment}
            
            hazard_count = len(risk_assessment.get("hazards", []))
            print(f"✓ Identified {hazard_count} hazards")
            await update_progress("agent2_risk", "completed", 50)

            # AGENT 3: Swiss Cheese Incident Prediction
            await update_progress("agent3_prediction", "running", 55)
            print(f"🔮 Agent 3: Predicting incident scenarios...")
            
            # Agent 3 receives Agent 2's risk assessment (unwrapped from 'risk' key)
            prediction_result = self.swiss_cheese.predict(risk_assessment)
            
            # Wrap in 'prediction' key for Agent 4 compatibility
            prediction_data = {"prediction": prediction_result}
            
            incidents = prediction_result.get("predicted_incidents", [])
            if incidents:
                incident_name = incidents[0].get("incident_name", "Unknown incident")
                confidence = incidents[0].get("confidence", "Unknown")
                print(f"✓ Predicted: {incident_name} (confidence: {confidence})")
            else:
                print(f"✓ No specific incidents predicted")
            await update_progress("agent3_prediction", "completed", 75)

            # AGENT 4: Report Synthesis
            await update_progress("agent4_synthesis", "running", 80)
            print(f"📄 Agent 4: Synthesizing final report...")
            
            # Agent 4 receives all agent outputs separately
            final_report = self.synthesizer.synthesize(
                agent1_output=validation_data,
                agent2_output=risk_assessment,
                agent3_output=prediction_result
            )
            
            print("✓ Pipeline complete!")
            await update_progress("agent4_synthesis", "completed", 95)


            # Prepare complete analysis result
            complete_analysis = {
                "pipeline_metadata": {
                    "version": "python-multi-agent-v2.0",
                    "execution_time_ms": int((datetime.utcnow() - pipeline_start).total_seconds() * 1000),
                    "agents_used": {
                        "agent1_validator": {"success": validation_result.success, "model": validation_result.model_used},
                        "agent2_risk_assessor": {"success": True, "model": "gemini-2.0-flash-exp"},
                        "agent3_swiss_cheese": {"success": True, "model": "gemini-2.0-flash-exp"},
                        "agent4_synthesizer": {"success": True, "model": "gemini-2.0-flash-exp"}
                    }
                },
                "agent_outputs": {
                    "agent1_validation": validation_data,
                    "agent2_risk_assessment": risk_data,
                    "agent3_swiss_cheese": prediction_data,
                    "agent4_final_report": final_report
                },
                "summary": {
                    "overall_risk_score": risk_assessment.get("top_score", 0),
                    "go_no_go_decision": final_report.get("decision", "UNKNOWN"),
                    "primary_concerns": final_report.get("criticalFindings", [])[:3],
                    "execution_time_seconds": (datetime.utcnow() - pipeline_start).total_seconds()
                }
            }


            # Update analysis record with complete results
            analysis_record.response = json.dumps(complete_analysis)
            analysis_record.risk_score = complete_analysis["summary"]["overall_risk_score"]
            analysis_record.urgency_level = self._determine_urgency_level(final_report)
            analysis_record.safety_categories = self._extract_safety_categories(risk_assessment)
            
            await self.db.commit()
            await self.db.refresh(analysis_record)
            
            # Send final SSE event to trigger frontend redirect
            await push_progress(str(analysis_record.id), {
                "status": "completed",
                "current_agent": "completed",
                "agent_status": "done",
                "progress": 100,
                "elapsed_ms": int((datetime.utcnow() - pipeline_start).total_seconds() * 1000)
            })

            # Return analysis with database ID
            return {
                "id": str(analysis_record.id),
                "created_at": analysis_record.created_at.isoformat(),
                **complete_analysis
            }


        except Exception as error:
            # Generate fallback report with detailed traceback
            import traceback
            error_traceback = traceback.format_exc()
            print(f"❌ Multi-agent pipeline error: {error}")
            print(f"🔍 Full traceback:\n{error_traceback}")

            fallback_report = {
                "metadata": {"reportId": f"FALLBACK-{int(datetime.utcnow().timestamp())}"},
                "executiveSummary": {
                    "decision": "NO_GO",
                    "overallRiskLevel": "HIGH",
                    "keyFindings": ["Analysis system error - manual review required"],
                    "actionRequired": True
                },
                "error": str(error),
                "traceback": error_traceback  # Include traceback for debugging
            }


            try:
                # Persist error state to database so polling stops
                analysis_record.response = json.dumps({
                    "status": "failed",
                    "error": str(error),
                    "fallback_report": fallback_report,
                    "timestamp": datetime.utcnow().isoformat()
                })
                # Attempt to update risk score if available in fallback? No, keep it simple.
                analysis_record.risk_score = 0
                analysis_record.urgency_level = "HIGH" 
                await self.db.commit()
            except Exception as db_e:
                 print(f"⚠️ Failed to save error state to DB: {db_e}")

            return {
                "id": str(analysis_record.id),
                "pipeline_metadata": {
                    "version": "python-multi-agent-v1.0",
                    "execution_time_ms": int((datetime.utcnow() - pipeline_start).total_seconds() * 1000),
                    "error": str(error),
                    "fallback": True
                },
                "error": f"Multi-agent analysis failed: {str(error)}",
                "fallback_report": fallback_report,
                "timestamp": datetime.utcnow().isoformat()
            }

    async def execute_live_update(
        self,
        analysis_id: UUID,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute live update workflow.

        Re-runs Agent 2 (Risk) and Agent 3 (Swiss Cheese) with new conditions.
        """

        # Load original analysis
        result = await self.db.execute(
            select(AnalysisHistory).where(AnalysisHistory.id == analysis_id)
        )
        original_analysis = result.scalar_one_or_none()

        if not original_analysis:
            raise ValueError(f"Analysis {analysis_id} not found")

        # TODO: Implement live update logic
        # This would re-run agents 2-3 with updated conditions
        # For now, return placeholder

        return {
            "status": "live_update_complete",
            "analysis_id": str(analysis_id),
            "updated_at": datetime.utcnow().isoformat()
        }

    def _determine_urgency_level(self, final_report: Dict[str, Any]) -> str:
        """Determine urgency level from final report"""
        # New Agent 4 returns decision at top level (not nested in executiveSummary)
        decision = final_report.get("decision", "GO")

        if decision == "STOP_WORK" or decision == "NO_GO":
            return "CRITICAL"
        elif decision == "GO_WITH_CONDITIONS":
            return "HIGH"
        else:
            return "MEDIUM"

    def _extract_safety_categories(self, risk_data: Dict[str, Any]) -> list[str]:
        """Extract safety categories from risk assessment"""
        categories = []

        hazards = risk_data.get("hazards", [])
        for hazard in hazards:
            category = hazard.get("category", "").lower()
            if category and category not in categories:
                categories.append(category)

        return categories or ["general_safety"]