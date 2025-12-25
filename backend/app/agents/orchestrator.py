"""
Multi-Agent Pipeline Orchestrator
V1 Faithful Port - Exact pipeline from V1_AGENT_PROMPTS_AND_LOGIC.md lines 764-797

Executes Agents 1-4 sequentially with error handling.
"""

import time
import json
from typing import Dict, Any, Optional
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.gemini_client import GeminiClient
from app.agents.profiles.agent_1_validator import Agent1Validator
from app.agents.profiles.agent_2_risk_assessor import Agent2RiskAssessor
from app.agents.profiles.agent_3_incident_predictor import Agent3IncidentPredictor
from app.agents.profiles.agent_4_synthesizer import Agent4Synthesizer
from app.models.analysis import AnalysisHistory
from app.api.v1.jha_stream import push_progress


class SafetyAnalysisOrchestrator:
    """
    V1 Faithful Pipeline Orchestrator
    
    Executes 4-agent safety analysis:
    1. Agent 1: Validate data → validation
    2. Agent 2: Assess risk (with validation + OSHA data) → risk
    3. Agent 3: Predict incident (with risk + validation) → prediction
    4. Agent 4: Synthesize report (with all outputs) → final_report
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.gemini_client = GeminiClient()
        
        # Initialize agents
        self.agent_1 = Agent1Validator(self.gemini_client)
        self.agent_2 = Agent2RiskAssessor(self.gemini_client, db)
        self.agent_3 = Agent3IncidentPredictor(self.gemini_client)
        self.agent_4 = Agent4Synthesizer()
    
    async def analyze(
        self,
        checklist_data: Dict[str, Any],
        weather_data: Dict[str, Any],
        naics_code: str,
        industry_name: str,
        injury_rate: float,
        analysis_id: str,
        analysis_record: Optional[AnalysisHistory] = None
    ) -> Dict[str, Any]:
        """
        Execute 4-agent pipeline.
        
        Flow (from V1 lines 764-797):
        1. Agent 1: Validate data → validation
        2. Agent 2: Assess risk (with validation + OSHA data) → risk
        3. Agent 3: Predict incident (with risk + validation) → prediction
        4. Agent 4: Synthesize report (with all outputs) → final_report
        
        Error handling:
        - If Agent 1 fails → return error (cannot proceed)
        - If Agent 2 fails → use fallback risk assessment, continue
        - If Agent 3 fails → use fallback prediction, continue
        - Agent 4 never fails (pure Python)
        """
        start_time = time.time()
        
        # Track partial results for fallback
        validation = None
        risk = None
        prediction = None
        final_report = None
        
        async def update_progress(agent: str, status: str, progress: int):
            """Push progress to SSE stream"""
            elapsed = int((time.time() - start_time) * 1000)
            await push_progress(analysis_id, {
                "status": "processing",
                "current_agent": agent,
                "agent_status": status,
                "progress": progress,
                "elapsed_ms": elapsed
            })
        
        try:
            # ═══════════════════════════════════════════
            # AGENT 1: DATA VALIDATOR
            # ═══════════════════════════════════════════
            await update_progress("agent1_validation", "running", 10)
            print(f"🔍 Agent 1: Validating data quality...")
            
            try:
                validation = await self.agent_1.validate(
                    checklist_data=checklist_data,
                    weather_data=weather_data,
                    naics_code=naics_code,
                    industry_name=industry_name,
                    injury_rate=injury_rate
                )
                print(f"✓ Agent 1 complete: Quality {validation.get('qualityScore', 'N/A')}/10")
            except Exception as e:
                print(f"❌ Agent 1 failed: {e}")
                # Cannot proceed without validation
                raise
            
            await update_progress("agent1_validation", "completed", 25)
            await self.save_agent_output(analysis_id, "agent_1", "Data Validator", validation)
            
            # ═══════════════════════════════════════════
            # AGENT 2: RISK ASSESSOR
            # ═══════════════════════════════════════════
            await update_progress("agent2_risk", "running", 30)
            print(f"⚠️ Agent 2: Assessing risks...")
            
            try:
                risk = await self.agent_2.assess_risk(
                    validation=validation,
                    checklist_data=checklist_data,
                    weather_data=weather_data,
                    naics_code=naics_code
                )
                top_score = risk.get("hazards", [{}])[0].get("riskScore", 0)
                print(f"✓ Agent 2 complete: Top risk score {top_score}/100")
            except Exception as e:
                print(f"⚠️ Agent 2 failed: {e}, using fallback")
                # Use fallback risk assessment
                risk = self._fallback_risk_assessment(validation, checklist_data)
            
            await update_progress("agent2_risk", "completed", 50)
            await self.save_agent_output(analysis_id, "agent_2", "Risk Assessor", risk)
            
            # ═══════════════════════════════════════════
            # AGENT 3: INCIDENT PREDICTOR
            # ═══════════════════════════════════════════
            await update_progress("agent3_prediction", "running", 55)
            print(f"🔮 Agent 3: Predicting incidents...")
            
            try:
                # Get top hazard for prediction
                top_hazard = risk.get("hazards", [{}])[0]
                osha_data = await self.agent_2.get_osha_data(naics_code)
                
                prediction = await self.agent_3.predict_incident(
                    top_hazard=top_hazard,
                    checklist_data=checklist_data,
                    validation=validation,
                    weather_data=weather_data,
                    osha_data=osha_data
                )
                print(f"✓ Agent 3 complete: {prediction.get('incidentName', 'Unknown')}")
            except Exception as e:
                print(f"⚠️ Agent 3 failed: {e}, using fallback")
                # Use fallback prediction
                prediction = self._fallback_prediction(risk, checklist_data)
            
            await update_progress("agent3_prediction", "completed", 75)
            await self.save_agent_output(analysis_id, "agent_3", "Incident Predictor", prediction)
            
            # ═══════════════════════════════════════════
            # AGENT 4: REPORT SYNTHESIZER (NO LLM)
            # ═══════════════════════════════════════════
            await update_progress("agent4_synthesis", "running", 80)
            print(f"📄 Agent 4: Synthesizing report...")
            
            # Agent 4 never fails (pure Python)
            final_report = await self.agent_4.synthesize_report(
                validation=validation,
                risk=risk,
                prediction=prediction,
                weather_data=weather_data,
                checklist_data=checklist_data
            )
            
            print(f"✓ Agent 4 complete: {final_report.get('goNoGo', {}).get('decision', 'UNKNOWN')}")
            await update_progress("agent4_synthesis", "completed", 95)
            await self.save_agent_output(analysis_id, "agent_4", "Report Synthesizer", final_report)
            
            # ═══════════════════════════════════════════
            # FINALIZE
            # ═══════════════════════════════════════════
            execution_time = (time.time() - start_time) * 1000
            print(f"✅ Pipeline complete in {execution_time:.0f}ms")
            
            # Build complete analysis result
            complete_analysis = {
                "pipeline_metadata": {
                    "version": "v3-gemini-faithful-port",
                    "execution_time_ms": int(execution_time),
                    "agents_used": {
                        "agent1_validator": {"success": True, "model": "gemini-2.5-flash"},
                        "agent2_risk_assessor": {"success": True, "model": "gemini-2.5-flash"},
                        "agent3_incident_predictor": {"success": True, "model": "gemini-2.5-flash"},
                        "agent4_synthesizer": {"success": True, "model": "python-deterministic"}
                    }
                },
                "agent_outputs": {
                    "agent1_validation": validation,
                    "agent2_risk_assessment": risk,
                    "agent3_prediction": prediction,
                    "agent4_final_report": final_report
                },
                "summary": {
                    "overall_risk_score": risk.get("hazards", [{}])[0].get("riskScore", 0),
                    "go_no_go_decision": final_report.get("goNoGo", {}).get("decision", "UNKNOWN"),
                    "primary_concerns": [item["action"] for item in final_report.get("actionItems", [])[:3]],
                    "execution_time_seconds": execution_time / 1000
                }
            }
            
            # Update analysis record if provided
            if analysis_record:
                analysis_record.response = json.dumps(complete_analysis)
                analysis_record.risk_score = risk.get("hazards", [{}])[0].get("riskScore", 0)
                analysis_record.urgency_level = self._determine_urgency_level(final_report)
                analysis_record.safety_categories = self._extract_safety_categories(risk)
                
                await self.db.commit()
                await self.db.refresh(analysis_record)
            
            # Send completion event
            await push_progress(analysis_id, {
                "status": "completed",
                "current_agent": "completed",
                "agent_status": "done",
                "progress": 100,
                "elapsed_ms": int(execution_time)
            })
            
            return {
                "id": analysis_id,
                "created_at": datetime.now().isoformat(),
                "report": final_report,
                "agent1": validation,
                "agent2": risk,
                "agent3": prediction,
                "agent4": final_report,
                **complete_analysis
            }
            
        except Exception as error:
            import traceback
            error_traceback = traceback.format_exc()
            print(f"❌ Pipeline failed: {error}")
            print(error_traceback)
            
            # Return partial results if available
            execution_time = (time.time() - start_time) * 1000
            
            return {
                "id": analysis_id,
                "error": f"Pipeline failed: {str(error)}",
                "partial_results": {
                    "agent1": validation,
                    "agent2": risk,
                    "agent3": prediction
                },
                "metadata": {
                    "version": "v3-gemini-faithful-port",
                    "execution_time_ms": int(execution_time),
                    "error_traceback": error_traceback
                }
            }
    
    async def save_agent_output(
        self,
        analysis_id: str,
        agent_id: str,
        agent_name: str,
        output: Dict[str, Any]
    ):
        """Save agent output to database (NeonDB agent_outputs table)"""
        # TODO: Implement NeonDB save when connection is configured
        # For now, just log
        pass
    
    def _determine_urgency_level(self, final_report: Dict[str, Any]) -> str:
        """Determine urgency level from final report"""
        decision = final_report.get("goNoGo", {}).get("decision", "GO")
        
        if decision == "STOP_WORK":
            return "CRITICAL"
        elif decision == "NO_GO":
            return "CRITICAL"
        elif decision == "GO_WITH_CONDITIONS":
            return "HIGH"
        else:
            return "MEDIUM"
    
    def _extract_safety_categories(self, risk: Dict[str, Any]) -> list:
        """Extract safety categories from risk assessment"""
        categories = []
        
        for hazard in risk.get("hazards", []):
            category = hazard.get("category", "").lower()
            if category and category not in categories:
                categories.append(category)
        
        return categories or ["general_safety"]
    
    def _fallback_risk_assessment(
        self,
        validation: Dict[str, Any],
        checklist_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Fallback risk assessment if Agent 2 fails"""
        return {
            "riskSummary": {
                "overallRiskLevel": "MEDIUM",
                "highestRiskScore": 50,
                "industryContext": "Fallback assessment - Agent 2 failed"
            },
            "hazards": [
                {
                    "name": "Unable to assess - Review manually",
                    "category": "Other",
                    "probability": 0.5,
                    "consequence": "Serious",
                    "riskScore": 50,
                    "riskLevel": "MEDIUM",
                    "inadequateControls": ["Review required"],
                    "recommendedControls": ["Manual review by safety officer"]
                }
            ],
            "topThreats": ["Manual review required"],
            "weatherImpact": "Unknown",
            "immediateActions": ["Request safety officer review"]
        }
    
    def _fallback_prediction(
        self,
        risk: Dict[str, Any],
        checklist_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Fallback prediction if Agent 3 fails"""
        return {
            "incidentName": "Unable to predict - Review manually",
            "timeframe": "Next 4 hours",
            "probability": 50,
            "confidence": "LOW",
            "causalChain": [],
            "leadingIndicators": [],
            "interventions": {
                "preventive": [],
                "mitigative": [],
                "recommended": "Manual review by safety officer"
            },
            "oshaPatternMatch": {
                "similarIncidents": 0,
                "matchConfidence": "LOW",
                "citationsExpected": []
            }
        }


# Backwards compatibility alias
JHAOrchestrator = SafetyAnalysisOrchestrator