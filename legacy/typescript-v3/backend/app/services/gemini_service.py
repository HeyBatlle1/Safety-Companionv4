import json
import google.generativeai as genai
from typing import Dict, Any, Optional
from app.core.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.gemini_api_key)

class GeminiService:
    """Service for all Gemini AI interactions"""

    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    async def extract_variables_from_voice(
        self,
        voice_input: str,
        original_job_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract structured variables from natural language field update.
        Uses Gemini 2.5 Flash for reliable JSON extraction.
        """

        context = f"Original job: {original_job_context}\n\n" if original_job_context else ""

        prompt = f"""You are a safety monitoring system parsing field condition updates.

{context}Field Update: "{voice_input}"

Extract these variables if mentioned (use null if not mentioned):
- wind_speed: integer (mph) or null
- temperature: integer (F) or null
- precipitation: boolean or null
- crew_size: integer or null
- equipment_changes: array of strings or null
- time_of_day: string ("morning"|"afternoon"|"evening"|"night") or null
- visibility: string ("good"|"moderate"|"poor") or null
- concern_keywords: array of strings (safety concerns mentioned) or null

Also infer:
- update_type: "environmental" | "crew" | "scope" | "equipment"
- urgency: "low" | "medium" | "high"

Return ONLY valid JSON. No markdown, no explanation.

Example:
{{
  "wind_speed": 25,
  "temperature": 45,
  "precipitation": false,
  "crew_size": 4,
  "equipment_changes": null,
  "time_of_day": "afternoon",
  "visibility": "moderate",
  "concern_keywords": ["wind", "cold"],
  "update_type": "environmental",
  "urgency": "medium"
}}
"""

        response = self.model.generate_content(prompt)

        try:
            # Strip markdown code blocks if Gemini includes them
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            # Fallback: return basic extraction
            return {
                "update_type": "unknown",
                "urgency": "low",
                "raw_error": str(e),
                "raw_response": response.text
            }

    async def analyze_updated_jha(
        self,
        original_job: str,
        original_analysis: str,
        original_risk_score: int,
        updated_variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Reanalyze JHA with updated field conditions.
        Returns new risk assessment with detected changes.
        """

        prompt = f"""You are an OSHA-certified safety analyst. A job's conditions have changed.

ORIGINAL JOB:
{original_job}

ORIGINAL ANALYSIS:
{original_analysis}

ORIGINAL RISK SCORE: {original_risk_score}/10

UPDATED CONDITIONS:
{json.dumps(updated_variables, indent=2)}

TASK:
1. Identify NEW hazards introduced by these changes
2. Identify hazards that are now REDUCED/REMOVED
3. Calculate NEW risk score (0-10)
4. Determine if work should stop (yes/no)
5. Generate specific crew alert message
6. Specify required actions

Return ONLY valid JSON:
{{
  "new_risk_score": 7,
  "risk_increased": true,
  "stop_work_recommended": false,
  "new_hazards": [
    {{
      "hazard": "fall_risk_elevated",
      "reason": "high_wind_reduces_stability",
      "severity": "high",
      "mitigation": "Deploy additional fall protection"
    }}
  ],
  "removed_hazards": [],
  "crew_alert": "⚠️ Wind speed increased to 25mph. Fall risk now HIGH. Additional fall protection required before continuing overhead work.",
  "alert_severity": "warning",
  "requires_action": true,
  "action_required": "Deploy additional fall protection and secure loose materials before resuming work",
  "reasoning": "Brief explanation of risk assessment"
}}
"""

        response = self.model.generate_content(prompt)

        try:
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            return json.loads(text.strip())
        except json.JSONDecodeError:
            # Fallback analysis
            return {
                "new_risk_score": original_risk_score + 1,
                "risk_increased": True,
                "stop_work_recommended": False,
                "new_hazards": [],
                "removed_hazards": [],
                "crew_alert": "Conditions changed. Review safety protocols.",
                "alert_severity": "info",
                "requires_action": False,
                "action_required": None,
                "reasoning": "Failed to parse AI response",
                "raw_response": response.text
            }