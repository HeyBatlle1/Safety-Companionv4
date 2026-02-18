"""
Multi-Agent Pipeline Orchestrator
V1 Faithful Port - Exact pipeline from V1_AGENT_PROMPTS_AND_LOGIC.md lines 764-797

Executes Agents 1-4 sequentially with error handling.
"""

import os
import time
import json
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.gemini_client import GeminiClient
from app.agents.profiles.agent_1_validator import Agent1Validator
from app.agents.profiles.agent_2_risk_assessor import Agent2RiskAssessor
from app.agents.profiles.agent_3_incident_predictor import Agent3IncidentPredictor
from app.agents.profiles.agent_4_llm_synthesizer import Agent4LLMSynthesizer
from app.agents.profiles.agent_4_synthesizer import Agent4Synthesizer  # Fallback
from app.services.vector_search import VectorSearchService
from app.models.analysis import AnalysisHistory
from app.api.v1.jha_stream import push_progress
from app.services.report_formatter import ReportFormatter


class SafetyAnalysisOrchestrator:
    """
    V1 Faithful Pipeline Orchestrator
    
    Executes 4-agent safety analysis:
    1. Agent 1: Validate data → validation
    2. Agent 2: Assess risk (with validation + OSHA data) → risk
    3. Agent 3: Predict incident (with risk + validation + vector search) → prediction
    4. Agent 4: Synthesize report (with all outputs) → final_report
    """
    
    def __init__(self, agent_registry=None, db: AsyncSession = None):
        """
        Initialize orchestrator.
        
        Args:
            agent_registry: Optional - kept for backwards compatibility with JHAService
            db: Database session for persisting results
        """
        # Handle both (registry, db) and (db,) signatures  
        if db is None and agent_registry is not None:
            # Called as (db,) - first arg is actually db
            if hasattr(agent_registry, 'execute'):
                # It's a db session
                db = agent_registry
                agent_registry = None
        
        self.db = db
        self.agent_registry = agent_registry  # Kept for compatibility
        self.gemini_client = GeminiClient()
        
        # Initialize agents
        self.agent_1 = Agent1Validator(self.gemini_client)
        self.agent_2 = Agent2RiskAssessor(self.gemini_client, db)
        # Wire vector search into Agent 3 for historical pattern matching
        vector_search = VectorSearchService(db) if db else None
        self.agent_3 = Agent3IncidentPredictor(self.gemini_client, vector_search=vector_search)
        self.agent_4 = Agent4LLMSynthesizer(self.gemini_client)  # LLM-powered synthesis
    
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
        3. Agent 3: Predict incident (with risk + validation + vector search) → prediction
        4. Agent 4: Synthesize report (LLM-powered with Python fallback) → final_report

        Error handling:
        - If Agent 1 fails → return error (cannot proceed)
        - If Agent 2 fails → use fallback risk assessment, continue
        - If Agent 3 fails → use fallback prediction, continue
        - If Agent 4 LLM fails → use fallback Python synthesizer
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
                # Agent 2 with 90-second timeout
                try:
                    risk = await asyncio.wait_for(
                        self.agent_2.assess_risk(
                            validation=validation,
                            checklist_data=checklist_data,
                            weather_data=weather_data,
                            naics_code=naics_code
                        ),
                        timeout=90.0  # 90 seconds max for Agent 2
                    )
                    top_score = risk.get("hazards", [{}])[0].get("riskScore", 0)
                    print(f"✓ Agent 2 complete: Top risk score {top_score}/100")
                except asyncio.TimeoutError:
                    print(f"⚠️ Agent 2 timed out after 90s, using fallback")
                    risk = self._fallback_risk_assessment(validation, checklist_data)
            except Exception as e:
                print(f"⚠️ Agent 2 failed: {e}, using fallback")
                # Use fallback risk assessment
                risk = self._fallback_risk_assessment(validation, checklist_data)
            
            await update_progress("agent2_risk", "completed", 50)
            await self.save_agent_output(analysis_id, "agent_2", "Risk Assessor", risk)
            
            # ═══════════════════════════════════════════
            # AGENT 3: INCIDENT PREDICTOR (WITH VECTOR SEARCH)
            # ═══════════════════════════════════════════
            await update_progress("agent3_prediction", "running", 55)
            print(f"🔮 Agent 3: Predicting incidents...")
            
            try:
                # Get top hazard for prediction
                top_hazard = risk.get("hazards", [{}])[0]
                osha_data = await self.agent_2.get_osha_data(naics_code)

                # Agent 3 with 90-second timeout (complex Swiss Cheese analysis)
                try:
                    prediction = await asyncio.wait_for(
                        self.agent_3.predict_incident(
                            top_hazard=top_hazard,
                            checklist_data=checklist_data,
                            validation=validation,
                            weather_data=weather_data,
                            osha_data=osha_data
                        ),
                        timeout=90.0  # 90 seconds max for Agent 3
                    )
                    print(f"✓ Agent 3 complete: {prediction.get('incidentName', 'Unknown')}")
                except asyncio.TimeoutError:
                    print(f"⚠️ Agent 3 timed out after 90s, using fallback")
                    prediction = self._fallback_prediction(risk, checklist_data)
            except Exception as e:
                print(f"⚠️ Agent 3 failed: {e}, using fallback")
                # Use fallback prediction
                prediction = self._fallback_prediction(risk, checklist_data)
            
            await update_progress("agent3_prediction", "completed", 75)
            await self.save_agent_output(analysis_id, "agent_3", "Incident Predictor", prediction)
            
            # ═══════════════════════════════════════════
            # AGENT 4: INTELLIGENT REPORT SYNTHESIZER (LLM)
            # ═══════════════════════════════════════════
            await update_progress("agent4_synthesis", "running", 80)
            print(f"📄 Agent 4: Synthesizing report with LLM intelligence...")

            # Agent 4 uses LLM with Python fallback, 120-second timeout
            try:
                final_report = await asyncio.wait_for(
                    self.agent_4.synthesize_report(
                        validation=validation,
                        risk=risk,
                        prediction=prediction,
                        weather_data=weather_data,
                        checklist_data=checklist_data
                    ),
                    timeout=120.0  # 120 seconds max for Agent 4 (LLM synthesis)
                )
            except asyncio.TimeoutError:
                print(f"⚠️ Agent 4 LLM timed out, using Python fallback")
                # Use fallback Python-only Agent 4
                from app.agents.profiles.agent_4_synthesizer import Agent4Synthesizer
                fallback_agent4 = Agent4Synthesizer()
                final_report = await fallback_agent4.synthesize_report(
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
            
            # Get the actual model being used from the registry
            active_model = self.gemini_client.registry.get_available_models()[0] if self.gemini_client.registry.get_available_models() else "unknown"
            model_display = "x-ai/grok-4.1-fast" if "openrouter-grok" in active_model else active_model

            # Build complete analysis result
            complete_analysis = {
                "pipeline_metadata": {
                    "version": "v3.1-openrouter-grok-llm-synth",
                    "execution_time_ms": int(execution_time),
                    "agents_used": {
                        "agent1_validator": {"success": True, "model": model_display},
                        "agent2_risk_assessor": {"success": True, "model": model_display},
                        "agent3_incident_predictor": {"success": True, "model": model_display},
                        "agent4_synthesizer": {"success": True, "model": model_display, "type": "llm-intelligent"}
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
            
            # Generate markdown report from Agent 4 output BEFORE saving
            markdown_report = ReportFormatter.format_structured_jha_report(final_report)
            
            # Add markdown to complete_analysis so it's saved to DB
            complete_analysis["markdown_report"] = markdown_report
            
            # Update analysis record if provided
            if analysis_record:
                try:
                    analysis_record.response = json.dumps(complete_analysis)
                    analysis_record.risk_score = risk.get("hazards", [{}])[0].get("riskScore", 0)
                    analysis_record.urgency_level = self._determine_urgency_level(final_report)
                    analysis_record.safety_categories = self._extract_safety_categories(risk)

                    await self.db.commit()
                    await self.db.refresh(analysis_record)
                except Exception as e:
                    print(f"⚠️ Failed to save final analysis record: {e}")
                    try:
                        await self.db.rollback()
                    except Exception:
                        pass
            
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
                "markdown": markdown_report,  # Professional formatted report
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
            
            # CRITICAL: Push error to SSE so frontend doesn't hang
            await push_progress(analysis_id, {
                "status": "error",
                "current_agent": "system",
                "agent_status": "failed",
                "error": str(error),
                "progress": 0
            })
            
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
                    "version": "v3-openrouter-grok",
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
        """Save agent output to agent_outputs table"""
        try:
            from app.models.analysis import AgentOutput
            
            # Get the actual model being used
            active_models = self.gemini_client.registry.get_available_models() if hasattr(self, 'gemini_client') else []
            model_name = active_models[0] if active_models else "unknown"

            # Build execution metadata
            execution_metadata = {
                "model": model_name,
                "timestamp": datetime.now().isoformat(),
                "output_size_bytes": len(json.dumps(output)) if output else 0
            }
            
            # Use SQLAlchemy model instead of raw SQL for compatibility
            agent_output = AgentOutput(
                analysis_id=analysis_id,
                agent_id=agent_id,
                agent_name=agent_name,
                agent_type="multi_agent_safety",
                output_data=output if output else {},
                execution_metadata=execution_metadata,
                success=True
            )
            
            self.db.add(agent_output)
            await self.db.commit()
            
            print(f"✅ Saved {agent_name} output for analysis {analysis_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to save {agent_name} output: {e}")
            # Roll back the failed transaction so the session stays usable
            try:
                await self.db.rollback()
            except Exception:
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
    
    async def _fetch_weather(self, location: str) -> Dict[str, Any]:
        """Fetch weather data directly from OpenWeather API"""
        import httpx
        from app.core.config import get_settings

        if not location:
            print("⚠️ No location provided for weather fetch")
            return {
                "fetch_status": "FAILED",
                "error": "No location provided",
                "temperature": 70,
                "windSpeed": 5,
                "conditions": "Unknown"
            }

        settings = get_settings()
        api_key = settings.openweather_api_key

        if not api_key:
            print("⚠️ OPENWEATHER_API_KEY not set, using fallback weather")
            return {
                "fetch_status": "FAILED",
                "error": "OpenWeather API key not configured",
                "temperature": 70,
                "windSpeed": 5,
                "conditions": "Unknown"
            }

        try:
            # Extract city name from address (take first part before comma)
            city = location.split(",")[0].strip()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "q": city,
                        "appid": api_key,
                        "units": "imperial"
                    },
                    timeout=10.0
                )

                if response.status_code == 200:
                    data = response.json()
                    temp = data["main"]["temp"]
                    feels_like = data["main"]["feels_like"]
                    humidity = data["main"]["humidity"]
                    wind_speed = data["wind"]["speed"]
                    conditions = data["weather"][0]["description"]

                    print(f"🌤️ Weather fetched for {city}: {temp}°F, {wind_speed}mph wind")

                    # Calculate safety status
                    safety_status = self._calculate_weather_safety(temp, wind_speed, humidity)

                    return {
                        "fetch_status": "SUCCESS",
                        "temperature": round(temp, 1),
                        "feelsLike": round(feels_like, 1),
                        "windSpeed": round(wind_speed, 1),
                        "windGust": round(data["wind"].get("gust", wind_speed), 1),
                        "conditions": conditions.title(),
                        "humidity": humidity,
                        "visibility": data.get("visibility", 10000) / 1000,  # Convert to km
                        "safetyStatus": safety_status,
                        "alerts": self._generate_weather_alerts(temp, wind_speed, humidity),
                        "source": "OpenWeather"
                    }
                elif response.status_code == 404:
                    print(f"⚠️ Location not found: {city}")
                    return {
                        "fetch_status": "FAILED",
                        "error": f"Location not found: {city}",
                        "temperature": 70,
                        "windSpeed": 5,
                        "conditions": "Unknown"
                    }
                else:
                    print(f"⚠️ OpenWeather API returned status {response.status_code}")
                    return {
                        "fetch_status": "FAILED",
                        "error": f"API returned status {response.status_code}",
                        "temperature": 70,
                        "windSpeed": 5,
                        "conditions": "Unknown"
                    }

        except Exception as e:
            print(f"⚠️ Weather fetch failed: {e}")
            return {
                "fetch_status": "FAILED",
                "error": str(e),
                "temperature": 70,
                "windSpeed": 5,
                "conditions": "Unknown"
            }

    def _calculate_weather_safety(self, temp: float, wind_speed: float, humidity: float) -> Dict[str, Any]:
        """Calculate construction safety status based on weather"""
        wind_status = "SAFE"
        wind_message = "Wind conditions acceptable"

        if wind_speed >= 20:
            wind_status = "CRITICAL"
            wind_message = "Wind exceeds crane operation limits (20 mph)"
        elif wind_speed >= 15:
            wind_status = "WARNING"
            wind_message = "Approaching crane operation limits"

        temp_status = "SAFE"
        temp_message = "Temperature within safe range"

        if temp >= 95:
            temp_status = "CRITICAL"
            temp_message = "Extreme heat - mandatory rest breaks required"
        elif temp >= 90:
            temp_status = "WARNING"
            temp_message = "Heat stress risk - implement heat illness prevention"
        elif temp <= 20:
            temp_status = "CRITICAL"
            temp_message = "Extreme cold - limit outdoor exposure"
        elif temp <= 32:
            temp_status = "WARNING"
            temp_message = "Freezing conditions - cold stress precautions required"

        overall_status = "SAFE"
        if wind_status == "CRITICAL" or temp_status == "CRITICAL":
            overall_status = "CRITICAL"
        elif wind_status == "WARNING" or temp_status == "WARNING":
            overall_status = "WARNING"

        return {
            "overall": overall_status,
            "wind": {"status": wind_status, "message": wind_message},
            "temperature": {"status": temp_status, "message": temp_message}
        }

    def _generate_weather_alerts(self, temp: float, wind_speed: float, humidity: float) -> list:
        """Generate safety alerts based on weather conditions"""
        alerts = []

        if wind_speed >= 20:
            alerts.append("🛑 STOP WORK: Wind speed exceeds safe crane operation limits")
        elif wind_speed >= 15:
            alerts.append("⚠️ WARNING: Monitor wind speed - approaching crane limits")

        if temp >= 95:
            alerts.append("🌡️ EXTREME HEAT: Implement mandatory rest/water breaks")
        elif temp >= 90:
            alerts.append("☀️ HEAT ADVISORY: Monitor workers for heat illness signs")

        if temp <= 20:
            alerts.append("❄️ EXTREME COLD: Limit outdoor exposure time")
        elif temp <= 32:
            alerts.append("🧊 FREEZING: Cold stress precautions required")

        if humidity >= 80 and temp >= 85:
            alerts.append("💧 HIGH HUMIDITY: Increased heat stress risk")

        return alerts
    
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
        """Fallback prediction if Agent 3 fails - uses data from Agent 2"""
        # Extract info from Agent 2's risk assessment
        top_hazard = risk.get("hazards", [{}])[0]
        hazard_name = top_hazard.get("name", "Unidentified hazard")
        risk_score = top_hazard.get("riskScore", 50)
        category = top_hazard.get("category", "General")

        # Estimate probability from risk score
        probability = min(risk_score, 75)  # Cap at 75% for fallback

        # Generate basic causal chain from available data
        inadequate_controls = top_hazard.get("inadequateControls", [])
        causal_chain = []
        if inadequate_controls:
            for i, control in enumerate(inadequate_controls[:3]):
                causal_chain.append({
                    "stage": f"Defense Failure {i+1}",
                    "description": control,
                    "evidence": "From risk assessment"
                })

        return {
            "incidentName": f"{category} incident related to: {hazard_name}",
            "timeframe": "Next 4 hours",
            "probability": probability,
            "confidence": "LOW",
            "causalChain": causal_chain or [{"stage": "Analysis pending", "description": "Swiss Cheese analysis unavailable - manual review recommended"}],
            "leadingIndicators": [
                {"type": "General", "indicator": "Monitor for unsafe conditions related to identified hazards"}
            ],
            "interventions": {
                "preventive": top_hazard.get("recommendedControls", [])[:3],
                "mitigative": ["Ensure emergency response procedures are in place"],
                "recommended": f"Address control gaps for {hazard_name}; conduct manual Swiss Cheese analysis"
            },
            "oshaPatternMatch": {
                "similarIncidents": 0,
                "matchConfidence": "LOW",
                "citationsExpected": [top_hazard.get("regulatoryRequirement", "OSHA 1926")]
            },
            "fallbackUsed": True,
            "fallbackReason": "Agent 3 timeout or error"
        }

    async def execute_full_analysis(
        self,
        request,
        user_id,
        company_id=None,
        analysis_id=None  # Accept existing analysis ID from background task
    ):
        """
        Execute full analysis - compatibility wrapper for JHAService.
        
        Converts JHAAnalysisRequest to dict format needed by analyze().
        """
        from uuid import uuid4
        from app.models.analysis import AnalysisHistory
        from sqlalchemy import select
        
        # Extract data from request
        job_info = request.jobInfo.model_dump() if hasattr(request.jobInfo, 'model_dump') else request.jobInfo
        hazards = [h.model_dump() if hasattr(h, 'model_dump') else h for h in request.hazards]
        control_measures = request.controlMeasures.model_dump() if hasattr(request.controlMeasures, 'model_dump') else request.controlMeasures
        
        # Build checklist data
        checklist_data = {
            "jobInfo": job_info,
            "hazards": hazards,
            "controlMeasures": control_measures,
            "projectName": job_info.get("projectName", "Unknown"),
            "location": job_info.get("location", "Unknown"),
            "workType": job_info.get("workType", "General Construction"),
            "crewSize": job_info.get("crewSize", 1),
            "date": job_info.get("date"),
            "supervisor": job_info.get("supervisor"),
        }
        
        # Fetch real weather data from API
        location = job_info.get("location", "")
        weather_data = await self._fetch_weather(location)
        
        # NAICS code defaults based on work type
        work_type = job_info.get("workType", "").lower()
        if "glaz" in work_type or "glass" in work_type:
            naics_code = "23815"
            industry_name = "Glass and glazing contractors"
            injury_rate = 3.5
        elif "roof" in work_type:
            naics_code = "23816"
            industry_name = "Roofing contractors"
            injury_rate = 4.7
        elif "electric" in work_type:
            naics_code = "23821"
            industry_name = "Electrical contractors"
            injury_rate = 2.1
        else:
            naics_code = "23"
            industry_name = "Construction"
            injury_rate = 2.5
        
        # Get or create analysis record
        analysis_record = None
        if analysis_id:
            # Use existing record from background task
            result = await self.db.execute(
                select(AnalysisHistory).where(AnalysisHistory.id == analysis_id)
            )
            analysis_record = result.scalar_one_or_none()
        
        if not analysis_record:
            # Create new record if not found
            analysis_id = analysis_id or str(uuid4())
            analysis_record = AnalysisHistory(
                id=analysis_id,
                user_id=str(user_id),
                query=f"JHA Analysis - {job_info.get('projectName', 'Unknown')}",
                response=json.dumps({"status": "queued", "progress": 0}),
                type="jha_multi_agent_analysis"
            )
            self.db.add(analysis_record)
            await self.db.commit()
            await self.db.refresh(analysis_record)
        
        # Store checklist data in metadata for future raw access/updates
        if analysis_record:
            existing_metadata = analysis_record.metadata_json or {}
            existing_metadata["checklist_data"] = checklist_data
            analysis_record.metadata_json = existing_metadata
            await self.db.commit()

        # Run the analysis
        result = await self.analyze(
            checklist_data=checklist_data,
            weather_data=weather_data,
            naics_code=naics_code,
            industry_name=industry_name,
            injury_rate=injury_rate,
            analysis_id=analysis_id,
            analysis_record=analysis_record
        )
        
        return result
    
    async def execute_live_update(
        self,
        analysis_id: str,
        update_data: Dict[str, Any]
    ):
        """
        Execute live update - fetches existing JHA, merges new context, and reruns relevant agents.
        """
        from app.models.analysis import AnalysisHistory
        from sqlalchemy import select
        import time

        start_time = time.time()
        
        # 1. Fetch original record
        result = await self.db.execute(
            select(AnalysisHistory).where(AnalysisHistory.id == analysis_id)
        )
        record = result.scalar_one_or_none()
        
        if not record:
            raise ValueError(f"Analysis {analysis_id} not found")

        # 2. Extract original data
        metadata = record.metadata_json or {}
        checklist_data = metadata.get("checklist_data")
        
        if not checklist_data:
            # Fallback: Try to reconstruct or use a simplified version
            checklist_data = {"projectName": record.query.replace("JHA Analysis - ", ""), "hazards": []}

        # 3. Inject new context (Vision or NLP)
        update_notes = []
        
        # Handle Vision results if passed from Agent 5
        if "vision_findings" in update_data:
            vision = update_data["vision_findings"]
            findings_text = f"NEW FIELD OBSERVATION (Vision Agent 5):\n"
            findings_text += f"Status: {vision.get('overall_status')}\n"
            findings_text += f"Executive Summary: {vision.get('executive_summary')}\n"
            
            # Add to hazards list or general context
            update_notes.append(findings_text)
            
            # Specifically add any detected hazards to the checklist
            for hazard in vision.get("hazards_detected", []):
                checklist_data["hazards"].append({
                    "hazard": hazard.get("hazard") or hazard.get("description"),
                    "category": hazard.get("category", "General"),
                    "severity": hazard.get("severity", "MEDIUM"),
                    "source": "AI_VISION_AGENT"
                })

        # Handle NLP/NLP voice input
        if "voice_input" in update_data and update_data["voice_input"]:
            update_notes.append(f"CREW FIELD UPDATE: {update_data['voice_input']}")

        # Combine into job description/notes
        if update_notes:
            existing_desc = checklist_data.get("jobInfo", {}).get("description", "")
            new_notes = "\n\n--- LIVE UPDATE SEPARATOR ---\n" + "\n".join(update_notes)
            if "jobInfo" not in checklist_data:
                checklist_data["jobInfo"] = {}
            checklist_data["jobInfo"]["description"] = existing_desc + new_notes

        # 4. Rerun analysis components (Streaming progress)
        # We reuse the analyze method but we might want a "partial" mode. 
        # For a "Live Update", we typically want to redo everything with the NEW context.
        
        # Fetch fresh weather if it's been a while (optional enhancement)
        location = checklist_data.get("location", "")
        weather_data = await self._fetch_weather(location)
        
        # Re-run the full pipeline (or just Agents 2-4 if we want to save time)
        # But for correctness, re-running the full pipeline with merged context is safer.
        
        result = await self.analyze(
            checklist_data=checklist_data,
            weather_data=weather_data,
            naics_code="23", # Default or fetch from original
            industry_name="Construction",
            injury_rate=2.5,
            analysis_id=analysis_id,
            analysis_record=record
        )
        
        return result


# Backwards compatibility alias
JHAOrchestrator = SafetyAnalysisOrchestrator
