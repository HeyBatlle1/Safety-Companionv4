"""
Agent 1: JHA Validator - Data Gatherer and Gatekeeper
DETERMINISTIC CORE - Fetches weather, validates completeness, scores quality
"""

from app.agents.base import BaseAgent, AgentTask, AgentResponse, ModelCapability, ModelProvider
from app.agents.registry import AgentRegistry
from typing import Dict, Any, List
from datetime import datetime
import httpx

class JHAValidatorAgent(BaseAgent):
    """
    Agent 1: Data Validation & Quality Assessment
    
    Responsibilities:
    - Fetch external data (weather)
    - Validate JHA input completeness
    - Score data quality (0-10)
    - Package COMPLETE dataset for downstream agents
    
    Does NOT:
    - Analyze hazards (Agent 2)
    - Predict incidents (Agent 3)
    - Make GO/NO-GO decisions (Agent 4)
    """

    def __init__(self, registry: AgentRegistry):
        super().__init__(
            name="jha_validator",
            description="Validates JHA data quality and fetches external data"
        )
        self.registry = registry
        self.weather_api_base_url = "http://localhost:8000"  # Internal API

    def get_capabilities(self) -> list[ModelCapability]:
        """Optional AI for additional concern detection"""
        return [ModelCapability.STRUCTURED_OUTPUT]

    def get_prompt_template(self) -> str:
        """
        Optional Gemini prompt for additional concern detection
        Main logic is deterministic - this is just for edge cases
        """
        return """You are assisting Agent 1: Data Validator.

The deterministic logic has already:
- Scored data quality
- Identified missing fields
- Flagged stop-work triggers

Your job: Review the JHA input and identify any ADDITIONAL concerns that the deterministic logic might have missed.

JHA Input:
{jha_input}

Weather Data:
{weather_data}

Validation Results (from deterministic logic):
{validation_results}

Look for:
- Inconsistencies (e.g., says "no hazards" but working at 90 feet)
- Red flags in free-text responses
- Vague or generic answers that need clarification
- Safety concerns not caught by field-level validation

Return ONLY a JSON array of additional concerns:
["concern 1", "concern 2", ...]

If no additional concerns, return empty array: []"""

    async def execute(self, task: AgentTask) -> AgentResponse:
        """
        Main entry point for Agent 1
        
        1. Fetch external data (weather)
        2. Validate JHA completeness
        3. Return enriched dataset
        """
        
        start_time = datetime.utcnow()
        
        try:
            # Extract JHA input - orchestrator sends "checklist" key containing request.dict()
            jha_input = task.input_data.get("checklistData") or task.input_data.get("checklist", {})
            
            # Ensure jha_input is a dict (not a string or None)
            if not isinstance(jha_input, dict):
                jha_input = {}
            
            # The JHA request structure has nested jobInfo, hazards, controlMeasures
            # Extract the nested structures
            job_info = jha_input.get("jobInfo", {})
            if not isinstance(job_info, dict):
                job_info = {}
            
            hazards = jha_input.get("hazards", [])
            control_measures = jha_input.get("controlMeasures", {})
            
            # STEP 1: Fetch weather data (location is inside jobInfo)
            location = job_info.get("location", "")
            weather_data = await self._fetch_weather(location)
            
            # STEP 2: Validate JHA input (DETERMINISTIC)
            # Pass the full jha_input but also make job_info accessible
            validation_result = self._validate_jha(jha_input, weather_data)

            
            # STEP 3: Optional - AI-enhanced concern detection
            if validation_result["qualityScore"] < 8:
                additional_concerns = await self._detect_additional_concerns(
                    jha_input, weather_data, validation_result
                )
                validation_result["concerns"].extend(additional_concerns)
            
            # STEP 4: Package for downstream agents
            output = {
                "validation": validation_result,
                "enriched_data": {
                    "jha": jha_input,
                    "weather": weather_data
                }
            }
            
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return AgentResponse(
                success=True,
                output_data=output,
                model_used="deterministic-validator",
                provider=ModelProvider.GOOGLE,
                execution_time_ms=execution_time,
                token_usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            )

        except Exception as e:
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            return AgentResponse(
                success=False,
                output_data={},
                model_used="deterministic-validator",
                provider=ModelProvider.GOOGLE,
                execution_time_ms=execution_time,
                token_usage={},
                error=f"Validation failed: {str(e)}"
            )

    async def _fetch_weather(self, location: str) -> Dict[str, Any]:
        """
        Fetch current weather from OpenWeather API
        Returns weather data or graceful failure
        """
        if not location:
            return {
                "fetch_status": "FAILED",
                "error": "No location provided",
                "source": "OpenWeather"
            }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.weather_api_base_url}/api/v1/weather/current/{location}",
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    weather = response.json()
                    return {
                        "temperature": weather.get("temperature"),
                        "feelsLike": weather.get("feelsLike"),
                        "windSpeed": weather.get("windSpeed"),
                        "windGust": weather.get("windGust"),
                        "conditions": weather.get("conditions"),
                        "humidity": weather.get("humidity"),
                        "visibility": weather.get("visibility"),
                        "timestamp": datetime.utcnow().isoformat(),
                        "source": "OpenWeather",
                        "fetch_status": "SUCCESS"
                    }
                else:
                    return {
                        "fetch_status": "FAILED",
                        "error": f"Weather API returned status {response.status_code}",
                        "source": "OpenWeather"
                    }
                    
        except Exception as e:
            return {
                "fetch_status": "FAILED",
                "error": f"Weather API error: {str(e)}",
                "source": "OpenWeather"
            }

    def _validate_jha(self, jha_input: Dict[str, Any], weather_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        DETERMINISTIC validation logic
        Validates JHA completeness and quality
        
        JHA Structure:
        {
            "jobInfo": {"location", "workType", "crewSize", "projectName", ...},
            "hazards": [{"category", "description", "severity", ...}, ...],
            "controlMeasures": {"ppe", "procedures", "emergencyPlan", ...}
        }
        """
        quality_score = 10.0
        missing_critical: List[str] = []
        missing_recommended: List[str] = []
        stop_work_triggers: List[str] = []
        concerns: List[str] = []
        
        # Extract nested structures
        job_info = jha_input.get("jobInfo", {})
        if not isinstance(job_info, dict):
            job_info = {}
        
        hazards = jha_input.get("hazards", [])
        if not isinstance(hazards, list):
            hazards = []
        
        control_measures = jha_input.get("controlMeasures", {})
        if not isinstance(control_measures, dict):
            control_measures = {}
        
        # CRITICAL FIELDS CHECK (from jobInfo)
        job_info_critical = {
            "location": "Site location",
            "workType": "Work type/task description",
            "crewSize": "Number of workers",
        }
        
        for field, description in job_info_critical.items():
            if not job_info.get(field):
                missing_critical.append(description)
                quality_score -= 2
        
        # CRITICAL: Must have at least one hazard identified
        if len(hazards) == 0:
            missing_critical.append("Identified hazards")
            quality_score -= 2
        
        # CRITICAL: Must have emergency plan
        if not control_measures.get("emergencyPlan"):
            missing_critical.append("Emergency response plan")
            quality_score -= 2
        
        # RECOMMENDED FIELDS CHECK
        if not job_info.get("supervisor"):
            missing_recommended.append("Supervisor name")
            quality_score -= 0.5
        
        if not control_measures.get("ppe") or len(control_measures.get("ppe", [])) == 0:
            missing_recommended.append("PPE requirements")
            quality_score -= 0.5
        
        if not control_measures.get("procedures") or len(control_measures.get("procedures", [])) == 0:
            missing_recommended.append("Safety procedures")
            quality_score -= 0.5
        
        # WEATHER DATA CHECK
        weather_present = weather_data.get("fetch_status") == "SUCCESS"
        if not weather_present:
            concerns.append(f"Weather data unavailable: {weather_data.get('error', 'Unknown error')}")
            quality_score -= 1

        
        # STOP-WORK TRIGGERS
        
        # Trigger 1: No emergency plan for elevated work
        work_height = jha_input.get("workHeight", 0)
        if work_height > 6 and not jha_input.get("emergencyPlan"):
            stop_work_triggers.append("Emergency response plan required for work above 6 feet")
        
        # Trigger 2: High wind without monitoring plan
        if weather_present:
            wind_speed = weather_data.get("windSpeed", 0)
            if wind_speed > 15 and not jha_input.get("weatherMonitoringPlan"):
                stop_work_triggers.append("Wind speed >15mph requires documented weather monitoring plan")
        
        # Trigger 3: Crane operations without certifications
        equipment = str(jha_input.get("equipment", "")).lower()
        if "crane" in equipment or "hoist" in equipment:
            if not jha_input.get("operatorCertifications"):
                stop_work_triggers.append("Crane/hoist operation requires certified operator documentation")
        
        # DETERMINE STATUS
        quality_score = max(0, quality_score)  # Floor at 0
        
        if quality_score < 3:
            status = "REJECTED"
            confidence = "LOW"
        elif quality_score < 6:
            status = "ACCEPTED"
            confidence = "LOW"
        elif quality_score < 8:
            status = "ACCEPTED"
            confidence = "MEDIUM"
        else:
            status = "ACCEPTED"
            confidence = "HIGH"
        
        # DATA COMPLETENESS BREAKDOWN
        data_completeness = {
            "weather": weather_present,
            "equipmentSpecs": bool(jha_input.get("equipmentSpecs")),
            "workerCerts": bool(jha_input.get("workerCertifications")),
            "emergencyPlan": bool(jha_input.get("emergencyPlan")),
            "ppeDocumented": bool(jha_input.get("ppeRequirements"))
        }
        
        return {
            "qualityScore": round(quality_score, 1),
            "dataQuality": status,
            "confidence": confidence,
            "missingCritical": missing_critical,
            "missingRecommended": missing_recommended,
            "stopWorkTriggers": stop_work_triggers,
            "dataCompleteness": data_completeness,
            "concerns": concerns,
            "weatherPresent": weather_present
        }

    async def _detect_additional_concerns(
        self,
        jha_input: Dict[str, Any],
        weather_data: Dict[str, Any],
        validation_result: Dict[str, Any]
    ) -> List[str]:
        """
        Optional AI-enhanced concern detection
        Only called if quality score < 8
        """
        try:
            prompt = self.get_prompt_template().format(
                jha_input=str(jha_input),
                weather_data=str(weather_data),
                validation_results=str(validation_result)
            )
            
            adapter = self.registry.route_task(
                required_capabilities=[ModelCapability.STRUCTURED_OUTPUT],
                preferred_provider=ModelProvider.GOOGLE
            )
            
            result = await adapter.generate(
                prompt=prompt,
                temperature=0.3,  # Low temp for consistent validation
                max_tokens=500
            )
            
            # Parse JSON array from response
            import json
            concerns_text = result.get("text", "[]")
            additional_concerns = json.loads(concerns_text)
            
            return additional_concerns if isinstance(additional_concerns, list) else []
            
        except Exception as e:
            print(f"AI concern detection failed: {e}")
            return []  # Graceful fallback - deterministic logic is enough