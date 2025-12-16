"""
Agent 2: Risk Assessor
Deterministic weather analysis + AI-driven hazard identification
"""

from app.agents.base import BaseAgent, AgentTask, AgentResponse, ModelCapability, ModelProvider
from app.agents.registry import AgentRegistry
from typing import Dict, Any, List
from datetime import datetime
import json

class RiskAssessorAgent(BaseAgent):
    """
    Agent 2: Risk Assessment & Hazard Analysis
    
    Responsibilities:
    - Analyze weather impact on equipment (deterministic)
    - Identify hazards using AI
    - Assess OSHA compliance gaps
    - Calculate risk scores
    - Identify hazard interactions
    
    Input: Agent 1's enriched data (JHA + weather + validation)
    Output: Risk assessment for Agent 3
    """

    def __init__(self, registry: AgentRegistry):
        super().__init__(
            name="risk_assessor",
            description="Assesses risks and analyzes hazards"
        )
        self.registry = registry

    def get_capabilities(self) -> list[ModelCapability]:
        """Requires AI for hazard identification"""
        return [
            ModelCapability.STRUCTURED_OUTPUT,
            ModelCapability.REASONING
        ]

    def get_prompt_template(self) -> str:
        """Gemini prompt for hazard identification"""
        return """You are Agent 2: Risk Assessor.

Agent 1 has validated the data and fetched weather.
Your job: Analyze hazards and assess risk.

═══════════════════════════════════════════
STEP 1: WEATHER ANALYSIS (ALREADY DONE)
═══════════════════════════════════════════

Weather Status: {weather_status}
Equipment Margins: {equipment_margins}
Stop-Work Triggers: {stop_work_weather}

═══════════════════════════════════════════
STEP 2: HAZARD IDENTIFICATION
═══════════════════════════════════════════

JHA Data:
{jha_data}

Identify ALL hazards for this work.

For EACH hazard, assess:
- Risk score (0-100): likelihood × consequence
- Likelihood: LOW/MEDIUM/HIGH
- Consequence: MINOR/SERIOUS/CRITICAL/CATASTROPHIC
- Weather amplification: How weather makes this worse
- Inadequate controls: What defenses are missing/weak

Focus on:
- Fall hazards (height work)
- Struck-by (falling objects, crane loads)
- Caught-between (pinch points)
- Electrical (tools, weather)
- Environmental (cold, heat, wind)

═══════════════════════════════════════════
STEP 3: HAZARD INTERACTIONS
═══════════════════════════════════════════

Identify how hazards COMPOUND each other:
- Wind + crane + heavy load + public below = catastrophic
- Height + cold + fatigue = reduced dexterity
- Multiple crews + complex lifts + poor visibility = coordination failure

═══════════════════════════════════════════
STEP 4: OSHA COMPLIANCE GAPS
═══════════════════════════════════════════

Identify violations or gaps in OSHA compliance:

Example:
- 1926.502(d)(15): No rescue plan for fall protection
- 1926.550(a)(6): No wind monitoring for crane operations
- 1926.95(a): No PPE hazard assessment documented

For each gap:
- Standard number
- What's missing
- Citation likelihood: LOW/MEDIUM/HIGH/CERTAIN
- Severity: OTHER/SERIOUS/WILLFUL

═══════════════════════════════════════════
OUTPUT FORMAT (JSON)
═══════════════════════════════════════════

{{
  "hazards": [
    {{
      "name": "Specific hazard name",
      "category": "Fall/Struck-by/Electrical/etc",
      "risk_score": 85,
      "likelihood": "HIGH",
      "consequence": "CATASTROPHIC",
      "weather_amplified": true,
      "inadequate_controls": ["Missing X", "Weak Y"]
    }}
  ],
  "hazard_interactions": [
    "Wind + crane + load = compounding catastrophic risk"
  ],
  "osha_gaps": [
    {{
      "standard": "1926.502(d)(15)",
      "title": "Fall Protection Rescue",
      "gap": "No rescue plan documented",
      "citation_likelihood": "HIGH",
      "severity": "SERIOUS",
      "required_action": "Document rescue procedure"
    }}
  ]
}}

Return ONLY valid JSON. No markdown, no explanations."""

    async def execute(self, task: AgentTask) -> AgentResponse:
        """
        Execute risk assessment
        
        1. Analyze weather impact (deterministic)
        2. Identify hazards (AI)
        3. Assess OSHA gaps (AI)
        4. Package for Agent 3
        """
        
        start_time = datetime.utcnow()
        
        try:
            # Extract Agent 1 output
            # Agent 1 returns: {validation: {...}, enriched_data: {jha, weather}}
            agent1_output = task.input_data
            
            # DEFENSIVE: Ensure agent1_output is a dict
            if not isinstance(agent1_output, dict):
                agent1_output = {}
            
            validation = agent1_output.get("validation", {})
            enriched_data = agent1_output.get("enriched_data", {})
            
            # DEFENSIVE: Ensure nested data is dict
            if not isinstance(validation, dict):
                validation = {}
            if not isinstance(enriched_data, dict):
                enriched_data = {}
            
            jha = enriched_data.get("jha", {})
            weather = enriched_data.get("weather", {})
            
            # DEFENSIVE: Ensure jha and weather are dicts
            if not isinstance(jha, dict):
                jha = {}
            if not isinstance(weather, dict):
                weather = {}
            
            # STEP 1: Weather analysis (DETERMINISTIC)
            weather_analysis = self._analyze_weather(weather, jha)
            
            # STEP 2: Hazard identification (AI)
            ai_analysis = await self._identify_hazards_with_ai(
                jha, weather_analysis
            )
            
            # STEP 3: Calculate top risk score
            hazards = ai_analysis.get("hazards", [])
            top_score = max([h.get("risk_score", 0) for h in hazards]) if hazards else 0
            
            # STEP 4: Calculate citation risk
            osha_gaps = ai_analysis.get("osha_gaps", [])
            citation_risk = self._calculate_citation_risk(osha_gaps)
            
            # STEP 5: Extract inadequate controls
            inadequate_controls = []
            for hazard in hazards:
                inadequate_controls.extend(hazard.get("inadequate_controls", []))
            
            # STEP 6: Package for Agent 3
            output = {
                "risk": {
                    "weather_analysis": weather_analysis,
                    "hazards": hazards,
                    "top_score": top_score,
                    "osha_gaps": osha_gaps,
                    "citation_risk": citation_risk,
                    "inadequate_controls": list(set(inadequate_controls)),  # Deduplicate
                    "hazard_interactions": ai_analysis.get("hazard_interactions", [])
                }
            }
            
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return AgentResponse(
                success=True,
                output_data=output,
                model_used="gemini-2.5-flash",
                provider=ModelProvider.GOOGLE,
                execution_time_ms=execution_time,
                token_usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            )

        except Exception as e:
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            return AgentResponse(
                success=False,
                output_data={},
                model_used="gemini-2.5-flash",
                provider=ModelProvider.GOOGLE,
                execution_time_ms=execution_time,
                token_usage={},
                error=f"Risk assessment failed: {str(e)}"
            )

    def _analyze_weather(self, weather: Dict[str, Any], jha: Dict[str, Any]) -> Dict[str, Any]:
        """
        DETERMINISTIC weather analysis
        Calculate equipment margins, determine status
        
        JHA Structure:
        {
            "jobInfo": {"workType", "location", ...},
            "hazards": [...],
            "controlMeasures": {...}
        }
        """
        
        # Normalize field names (Agent 1 uses camelCase)
        wind_speed = weather.get("windSpeed", weather.get("wind_speed", 0))
        wind_gust = weather.get("windGust", weather.get("wind_gust", wind_speed))
        
        # Equipment-specific limits
        crane_limit = 20  # ASME B30.3 default
        swing_stage_limit = 25  # ANSI/IWCA I-14.1
        
        margins = {}
        status = "GREEN"
        stop_work = []
        
        # Extract equipment info from nested jobInfo
        job_info = jha.get("jobInfo", {})
        if not isinstance(job_info, dict):
            job_info = {}
        
        # Look for equipment in workType, or dedicated equipment field
        work_type = str(job_info.get("workType", "")).lower()
        equipment = str(jha.get("equipment", job_info.get("equipment", ""))).lower()
        
        # Combine workType and equipment for matching
        equipment_context = f"{work_type} {equipment}"

        
        # Crane margin (check both equipment and workType)
        if "crane" in equipment_context:
            crane_margin = ((crane_limit - wind_gust) / crane_limit) * 100
            margins["crane"] = {
                "limit": crane_limit,
                "current": wind_gust,
                "margin_percent": round(crane_margin, 1),
                "status": "GREEN" if crane_margin > 20 else "YELLOW" if crane_margin > 0 else "RED"
            }
            if crane_margin <= 0:
                stop_work.append(f"Wind {wind_gust}mph exceeds crane limit {crane_limit}mph")
                status = "RED"
            elif crane_margin <= 20:
                status = "YELLOW"
        
        # Swing stage margin (check both equipment and workType)
        if "swing stage" in equipment_context or "swing-stage" in equipment_context:
            stage_margin = ((swing_stage_limit - wind_gust) / swing_stage_limit) * 100
            margins["swing_stage"] = {
                "limit": swing_stage_limit,
                "current": wind_gust,
                "margin_percent": round(stage_margin, 1),
                "status": "GREEN" if stage_margin > 20 else "YELLOW" if stage_margin > 0 else "RED"
            }
            if stage_margin <= 0:
                stop_work.append(f"Wind {wind_gust}mph exceeds swing stage limit {swing_stage_limit}mph")
                status = "RED"
            elif status != "RED" and stage_margin <= 20:
                status = "YELLOW"
        
        # Temperature analysis (bonus - not in spec but we have the data)
        temp = weather.get("temperature", weather.get("temp", 0))
        if temp >= 90:
            stop_work.append(f"Temperature {temp}°F - heat stress precautions required")
            if status == "GREEN":
                status = "YELLOW"
        elif temp <= 32:
            stop_work.append(f"Temperature {temp}°F - cold stress precautions required")
            if status == "GREEN":
                status = "YELLOW"
        
        critical_finding = "No equipment limits defined"
        if margins:
            worst_margin = min([m["margin_percent"] for m in margins.values()])
            critical_finding = f"Operating at {worst_margin:.0f}% safety margin"
        
        return {
            "status": status,
            "current_wind": wind_gust,
            "equipment_margins": margins,
            "stop_work_weather": stop_work,
            "critical_finding": critical_finding
        }

    async def _identify_hazards_with_ai(
        self,
        jha: Dict[str, Any],
        weather_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use AI to identify hazards, interactions, and OSHA gaps"""
        
        try:
            # Build prompt
            prompt = self.get_prompt_template().format(
                weather_status=weather_analysis["status"],
                equipment_margins=json.dumps(weather_analysis["equipment_margins"], indent=2),
                stop_work_weather=json.dumps(weather_analysis["stop_work_weather"]),
                jha_data=json.dumps(jha, indent=2)
            )
            
            # Call AI
            adapter = self.registry.route_task(
                required_capabilities=[ModelCapability.STRUCTURED_OUTPUT],
                preferred_provider=ModelProvider.GOOGLE
            )
            
            result = await adapter.generate(
                prompt=prompt,
                temperature=0.7,  # Higher temp for creative hazard identification
                max_tokens=3000
            )
            
            # Parse JSON response
            response_text = result.get("text", "{}")
            
            # Clean markdown if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            analysis = json.loads(response_text.strip())
            
            return analysis
            
        except Exception as e:
            print(f"AI hazard identification failed: {e}")
            # Fallback to basic structure
            return {
                "hazards": [],
                "hazard_interactions": [],
                "osha_gaps": []
            }

    def _calculate_citation_risk(self, osha_gaps: List[Dict[str, Any]]) -> str:
        """Calculate overall citation risk from OSHA gaps"""
        if not osha_gaps:
            return "LOW"
        
        high_count = sum(1 for gap in osha_gaps if gap.get("citation_likelihood") in ["HIGH", "CERTAIN"])
        willful_count = sum(1 for gap in osha_gaps if gap.get("severity") == "WILLFUL")
        
        if willful_count > 0 or high_count >= 3:
            return "HIGH"
        elif high_count > 0:
            return "MEDIUM"
        else:
            return "LOW"