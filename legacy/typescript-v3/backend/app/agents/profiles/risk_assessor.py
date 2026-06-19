# app/agents/profiles/risk_assessor.py

import os
import re
import json
from typing import Dict, List, Any
import google.generativeai as genai


class RiskAssessor:
    """
    Agent 2: Risk Assessor
    Analyzes hazards, weather impacts, and OSHA compliance
    """
    
    def __init__(self):
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def assess(self, agent1_output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main assessment function
        
        Args:
            agent1_output: Complete output from Agent 1
            
        Returns:
            Risk assessment with hazards, weather, OSHA gaps
        """
        
        # Extract data from Agent 1 output
        validation = agent1_output.get("validation", {})
        enriched_data = agent1_output.get("enriched_data", {})
        
        jha_data = enriched_data.get("jha", {})
        weather_data = enriched_data.get("weather", {})
        
        # STEP 1: Analyze weather (deterministic)
        weather_analysis = self._analyze_weather(weather_data, jha_data)
        
        # STEP 2: Use Gemini for hazard identification
        gemini_analysis = self._gemini_analysis(
            jha_data, 
            weather_analysis, 
            validation
        )
        
        # STEP 3: Structure output
        hazards = gemini_analysis.get("hazards", [])
        
        return {
            "weather_analysis": weather_analysis,
            "hazards": hazards,
            "top_score": max([h.get("risk_score", 0) for h in hazards], default=0),
            "top_hazard": hazards[0].get("name", "None identified") if hazards else "None identified",
            "osha_gaps": gemini_analysis.get("osha_gaps", []),
            "citation_risk": self._calculate_citation_risk(gemini_analysis.get("osha_gaps", [])),
            "inadequate_controls": gemini_analysis.get("inadequate_controls", []),
            "hazard_interactions": gemini_analysis.get("hazard_interactions", [])
        }
    
    def _analyze_weather(self, weather: Dict[str, Any], jha: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deterministic weather analysis with equipment margins
        """
        
        if weather.get("fetch_status") != "SUCCESS":
            return {
                "status": "UNKNOWN",
                "current_wind": 0,
                "equipment_margins": {},
                "stop_work_weather": ["Weather data unavailable"],
                "critical_finding": "Cannot assess weather risk - data unavailable"
            }
        
        wind_speed = weather.get("wind_speed", weather.get("windSpeed", 0))
        wind_gust = weather.get("wind_gust", weather.get("windGust", wind_speed))
        
        # Extract equipment info - handle nested jobInfo structure
        job_info = jha.get("jobInfo", {})
        if isinstance(job_info, dict):
            work_type = str(job_info.get("workType", "")).lower()
        else:
            work_type = ""
        
        equipment = jha.get("equipment", [])
        if isinstance(equipment, list):
            equipment_str = " ".join([str(e).lower() for e in equipment])
        else:
            equipment_str = str(equipment).lower()
        
        equipment_specs = str(jha.get("equipment_specs", "")).lower()
        
        # Combine work type and equipment for matching
        equipment_context = f"{work_type} {equipment_str}"
        
        margins = {}
        status = "GREEN"
        stop_work = []
        
        # Crane limit detection
        if "crane" in equipment_context:
            # Try to parse limit from specs
            crane_limit = 20  # Default ASME B30.3
            if "wind" in equipment_specs and "mph" in equipment_specs:
                match = re.search(r'(\d+)\s*mph', equipment_specs)
                if match:
                    crane_limit = int(match.group(1))
            
            crane_margin = ((crane_limit - wind_gust) / crane_limit) * 100 if crane_limit > 0 else 0
            
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
                stop_work.append(f"Wind at {100-crane_margin:.0f}% of crane limit - CRITICAL MARGIN")
                status = "YELLOW"
        
        # Swing stage limit (ANSI/IWCA I-14.1: 25mph)
        if "swing stage" in equipment_context or "suspended scaffold" in equipment_context:
            stage_limit = 25
            stage_margin = ((stage_limit - wind_gust) / stage_limit) * 100 if stage_limit > 0 else 0
            
            margins["swing_stage"] = {
                "limit": stage_limit,
                "current": wind_gust,
                "margin_percent": round(stage_margin, 1),
                "status": "GREEN" if stage_margin > 20 else "YELLOW" if stage_margin > 0 else "RED"
            }
            
            if stage_margin <= 0:
                stop_work.append(f"Wind {wind_gust}mph exceeds swing stage limit {stage_limit}mph")
                status = "RED"
            elif stage_margin <= 20 and status != "RED":
                status = "YELLOW"
        
        # Determine critical finding
        if margins:
            worst_margin = min([m["margin_percent"] for m in margins.values()])
            critical_finding = f"Operating at {worst_margin:.0f}% margin - {'CRITICAL' if worst_margin < 20 else 'ACCEPTABLE'}"
        else:
            critical_finding = "No equipment-specific wind limits defined"
        
        return {
            "status": status,
            "current_wind": wind_gust,
            "equipment_margins": margins,
            "stop_work_weather": stop_work,
            "critical_finding": critical_finding
        }
    
    def _gemini_analysis(self, jha: Dict[str, Any], weather: Dict[str, Any], validation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use Gemini to identify hazards, OSHA gaps, interactions
        """
        
        prompt = f"""You are Agent 2: Risk Assessor for construction safety.

Agent 1 has validated the data and fetched weather.

Your job: Identify hazards, assess risks, find OSHA gaps.

═══════════════════════════════════════════
JHA DATA
═══════════════════════════════════════════

{self._format_jha_for_prompt(jha)}

═══════════════════════════════════════════
WEATHER ANALYSIS (ALREADY DONE)
═══════════════════════════════════════════

Status: {weather.get('status', 'UNKNOWN')}
Current Wind: {weather.get('current_wind', 0)}mph
Equipment Margins: {weather.get('equipment_margins', {})}
Critical Finding: {weather.get('critical_finding', 'N/A')}

═══════════════════════════════════════════
VALIDATION RESULTS
═══════════════════════════════════════════

Quality Score: {validation.get('qualityScore', validation.get('quality_score', 'N/A'))}/10
Stop-Work Triggers: {validation.get('stopWorkTriggers', validation.get('stop_work_triggers', []))}
Missing Critical: {validation.get('missingCritical', validation.get('missing_critical', []))}
Concerns: {validation.get('concerns', [])}

═══════════════════════════════════════════
YOUR ANALYSIS TASKS
═══════════════════════════════════════════

1. IDENTIFY HAZARDS
   For EACH hazard, provide:
   - Specific name (not generic like "fall hazard")
   - Category (Fall, Struck-by, Electrical, etc.)
   - Risk score (0-100): likelihood × consequence
   - Likelihood: LOW/MEDIUM/HIGH
   - Consequence: MINOR/SERIOUS/CRITICAL/CATASTROPHIC
   - Weather amplified: true/false
   - Inadequate controls: What's missing or weak

2. HAZARD INTERACTIONS
   How do hazards compound each other?
   Example: "Wind + crane + heavy panels = catastrophic"

3. OSHA COMPLIANCE GAPS
   Identify violations or missing requirements:
   - Standard number (e.g., 1926.502(d)(15))
   - Title
   - What's missing
   - Citation likelihood: LOW/MEDIUM/HIGH/CERTAIN
   - Severity: OTHER/SERIOUS/WILLFUL
   - Required action to fix

4. INADEQUATE CONTROLS
   List controls that are missing, weak, or poorly defined

═══════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════

{{
  "hazards": [
    {{
      "name": "Worker falls 90ft from swing stage during glass panel positioning in high wind",
      "category": "Fall",
      "risk_score": 85,
      "likelihood": "HIGH",
      "consequence": "CATASTROPHIC",
      "weather_amplified": true,
      "inadequate_controls": ["No rescue plan", "Weak anchor points"]
    }}
  ],
  "hazard_interactions": [
    "Wind + height + heavy panels = compounding catastrophic risk",
    "Multiple crews + complex lifts + poor visibility = coordination failure"
  ],
  "osha_gaps": [
    {{
      "standard": "1926.502(d)(15)",
      "title": "Fall Protection Rescue",
      "gap": "No rescue procedure documented",
      "citation_likelihood": "HIGH",
      "severity": "SERIOUS",
      "required_action": "Document rescue procedure with <6min response"
    }}
  ],
  "inadequate_controls": [
    "No rescue plan documented",
    "Fall protection anchor points not specified",
    "Weather monitoring plan not defined"
  ]
}}

Return ONLY valid JSON. No explanation, no markdown, just JSON."""

        try:
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            return json.loads(response_text)
            
        except Exception as e:
            print(f"❌ Error in Gemini analysis: {e}")
            # Return minimal structure on error
            return {
                "hazards": [],
                "hazard_interactions": [],
                "osha_gaps": [],
                "inadequate_controls": []
            }
    
    def _format_jha_for_prompt(self, jha: Dict[str, Any]) -> str:
        """Format JHA data for readable prompt"""
        lines = []
        
        # Handle nested jobInfo structure
        job_info = jha.get("jobInfo", {})
        if isinstance(job_info, dict):
            for key, value in job_info.items():
                if value:
                    lines.append(f"{key}: {value}")
        
        # Handle hazards array
        hazards = jha.get("hazards", [])
        if hazards:
            lines.append(f"Identified Hazards: {len(hazards)}")
            for h in hazards:
                if isinstance(h, dict):
                    lines.append(f"  - {h.get('category', 'Unknown')}: {h.get('description', 'No description')}")
        
        # Handle control measures
        controls = jha.get("controlMeasures", {})
        if isinstance(controls, dict):
            if controls.get("ppe"):
                lines.append(f"PPE: {controls.get('ppe')}")
            if controls.get("procedures"):
                lines.append(f"Procedures: {controls.get('procedures')}")
            if controls.get("emergencyPlan"):
                lines.append(f"Emergency Plan: {controls.get('emergencyPlan')}")
        
        # Add any other top-level fields
        for key, value in jha.items():
            if key not in ["jobInfo", "hazards", "controlMeasures"] and value:
                lines.append(f"{key}: {value}")
        
        return "\n".join(lines) if lines else "No JHA data available"
    
    def _calculate_citation_risk(self, osha_gaps: List[Dict]) -> str:
        """Calculate overall citation risk from OSHA gaps"""
        if not osha_gaps:
            return "LOW"
        
        # Count CERTAIN and HIGH likelihood citations
        certain_count = sum(1 for gap in osha_gaps if gap.get("citation_likelihood") == "CERTAIN")
        high_count = sum(1 for gap in osha_gaps if gap.get("citation_likelihood") == "HIGH")
        
        if certain_count > 0:
            return "CERTAIN"
        elif high_count >= 2:
            return "HIGH"
        elif high_count == 1:
            return "MEDIUM"
        else:
            return "LOW"