"""
AGENT 2: RISK ASSESSOR
V1 Faithful Port - Exact prompts from V1_AGENT_PROMPTS_AND_LOGIC.md lines 165-327

Purpose: Identifies top 3 hazards and calculates quantitative risk scores (1-100)
         using OSHA data and BLS statistics.

Temperature: 0.7 (Analytical reasoning)
Max Tokens: 16,000
"""

import json
from typing import Dict, Any, Optional, List
from app.services.gemini_client import GeminiClient


class Agent2RiskAssessor:
    """
    OSHA Risk Assessor with BLS Data Integration
    
    Calculates quantitative risk scores using:
    - Industry injury rates (BLS data)
    - Hazard type multipliers (OSHA Fatal Four)
    - Control adequacy multipliers
    - Weather multipliers
    - Worker experience multipliers
    """
    
    def __init__(self, gemini_client: GeminiClient, db_connection=None):
        self.client = gemini_client
        self.db = db_connection
        self.temperature = 0.7  # Analytical reasoning
        self.max_tokens = 16000  # 2x increased for detailed OSHA analysis
        
        # Default OSHA/BLS data for construction (fallback)
        self.default_osha_data = {
            "naics_code": "23",
            "industry_name": "Construction",
            "injury_rate": 3.5,  # Per 100 workers annually
            "total_cases": 174700,
            "data_source": "BLS 2023"
        }
    
    async def get_osha_data(self, naics_code: str) -> Dict[str, Any]:
        """
        Query NeonDB for OSHA/BLS industry data.
        
        Returns industry injury rates and statistics.
        Falls back to construction baseline if not found.
        """
        # TODO: Implement NeonDB query when osha_injury_rates table is added
        # SQL:
        # SELECT naics_code, industry_name, injury_rate, total_cases, data_source
        # FROM osha_injury_rates
        # WHERE naics_code = $1
        
        # For now, use construction baseline
        return self.default_osha_data
    
    async def assess_risk(
        self,
        validation: Dict[str, Any],  # From Agent 1
        checklist_data: Dict[str, Any],
        weather_data: Dict[str, Any],
        naics_code: str
    ) -> Dict[str, Any]:
        """
        Assess risks and calculate scores.
        
        PROMPT SOURCE: V1_AGENT_PROMPTS_AND_LOGIC.md lines 165-327
        Copied EXACTLY with Python variable substitution.
        
        Includes:
        - Risk scoring formula (lines 321-351)
        - Hazard type multipliers (Falls ×2.8, Struck-by ×1.6, etc.)
        - Control adequacy multipliers (Comprehensive ×0.3, None ×3.0)
        - Weather multipliers (Extreme temp ×1.4, High winds ×1.8, Precipitation ×1.6)
        - Worker experience multipliers (Expert ×0.6, New ×2.1)
        - Severity classifications (Fatal ×10, Critical ×7, Serious ×4, Minor ×1)
        
        Returns:
            Risk assessment with hazards, scores, and recommendations
        """
        
        # Fetch OSHA data
        osha_data = await self.get_osha_data(naics_code)
        
        # Calculate injury rate percentage for prompt
        injury_rate = osha_data.get("injury_rate", 3.5)
        construction_avg = 3.5  # Construction industry average
        rate_comparison = round((injury_rate / construction_avg) * 100, 1)
        
        # Build the EXACT V1 prompt (lines 165-327)
        prompt = f"""You are a construction risk assessor certified in OSHA 1926 standards with expertise in quantitative risk analysis.

VALIDATED DATA SUMMARY:
Quality: {validation.get('dataQuality', 'UNKNOWN')} ({validation.get('qualityScore', 0)}/10)
Missing Critical: {json.dumps(validation.get('missingCritical', []))}
Key Concerns: {json.dumps(validation.get('concerns', {}))}

FULL CHECKLIST:
{json.dumps(checklist_data, indent=2)}

OSHA INDUSTRY DATA (BLS 2023):
Industry: {osha_data.get('industry_name', 'Construction')}
NAICS Code: {osha_data.get('naics_code', '23')}
Injury Rate: {injury_rate} per 100 workers annually
Total Cases: {osha_data.get('total_cases', 'N/A')}
Data Source: {osha_data.get('data_source', 'BLS 2023')}

WEATHER CONDITIONS:
{json.dumps(weather_data, indent=2)}

RISK ASSESSMENT METHODOLOGY:

1. IDENTIFY TOP 3 SPECIFIC HAZARDS
   - Be SPECIFIC: "Fall from 30ft swing stage during 35mph winds"
   - NOT generic: "Fall hazard"
   - Focus on highest consequence and/or highest probability scenarios
   - Must be based on actual checklist content

2. FOR EACH HAZARD CALCULATE:

   A. PROBABILITY (0.0 to 1.0):

   Base = Industry injury rate: {injury_rate}/100 = {injury_rate/100}

   Hazard Type Multiplier:
   - Falls from >6ft: ×2.8 (OSHA Fatal Four: 36.5% of deaths)
   - Struck by object: ×1.6 (OSHA Fatal Four: 10.1% of deaths)
   - Electrocution: ×0.4 (OSHA Fatal Four: 8.5% of deaths)
   - Caught between: ×0.9 (OSHA Fatal Four: 7.3% of deaths)
   - Other: ×1.0

   Control Adequacy Multiplier:
   - Comprehensive (3+ levels of hierarchy): ×0.3
   - Adequate (2 levels): ×0.7
   - Minimal (PPE only): ×1.5
   - None identified: ×3.0

   Weather Multiplier (if applicable):
   - Extreme temp (<32°F or >95°F): ×1.4
   - High winds (>25 mph): ×1.8
   - Precipitation: ×1.6
   - Normal: ×1.0

   Worker Experience Multiplier:
   - Expert (>5 years): ×0.6
   - Experienced (2-5 years): ×1.0
   - New (<1 year): ×2.1
   - Unknown: ×1.0

   Final Probability = Base × HazardType × Controls × Weather × Experience
   (Cap at 1.0 for display)

   B. CONSEQUENCE SEVERITY:

   Fatal (×10):
   - Death likely within 30 days
   - Examples: Fall >15ft, electrocution >50V, struck by heavy equipment
   - OSHA 1904.39: Report within 8 hours

   Critical (×7):
   - Hospitalization, amputation, eye loss
   - OSHA 1904.39: Report within 24 hours
   - Examples: Trench collapse burial, severe burns

   Serious (×4):
   - Days Away From Work (DAFW)
   - Medical treatment beyond first aid
   - Examples: Fractures, deep lacerations

   Minor (×1):
   - First aid only, no lost time
   - Examples: Cuts, bruises, minor strains

   C. RISK SCORE (1-100):

   Risk Score = (Probability × 100) × Severity Multiplier
   Cap at 100.

   Risk Classification:
   95-100 = EXTREME (Stop work immediately)
   75-94 = HIGH (Additional controls required)
   50-74 = MEDIUM (Enhanced monitoring)
   25-49 = LOW (Standard controls adequate)
   0-24 = MINIMAL (Routine procedures)

3. CONTROL EVALUATION (OSHA Hierarchy):

   For each hazard, assess controls against:
   L1-Elimination > L2-Substitution > L3-Engineering > L4-Administrative > L5-PPE

   Flag inadequate controls:
   - PPE-only approach (should have engineering)
   - Missing competent person designation
   - No emergency response plan
   - Controls not specific to hazard

   Recommend improvements following hierarchy.

4. OSHA STATISTICAL CONTEXT:

   For each hazard, cite relevant statistic:
   - Falls: "36.5% of construction fatalities (OSHA 2023)"
   - If industry injury rate high: "This trade has {injury_rate}/100 injury rate, {rate_comparison}% of construction average"
   - Weather-related: "Wet conditions increase slip/fall incidents by 60%"

OUTPUT FORMAT (ONLY VALID JSON):

{{
  "riskSummary": {{
    "overallRiskLevel": "EXTREME|HIGH|MEDIUM|LOW",
    "highestRiskScore": <number>,
    "industryContext": "Brief comparison to {osha_data.get('industry_name', 'construction')} baseline"
  }},
  "hazards": [
    {{
      "name": "Specific hazard with context (work type, height, conditions)",
      "category": "Falls|Struck-By|Electrocution|Caught-Between|Other",
      "probability": <0.0-1.0>,
      "probabilityCalculation": {{
        "base": <number>,
        "hazardMultiplier": <number>,
        "controlMultiplier": <number>,
        "weatherMultiplier": <number>,
        "experienceMultiplier": <number>,
        "final": <number>
      }},
      "consequence": "Fatal|Critical|Serious|Minor",
      "riskScore": <1-100>,
      "riskLevel": "EXTREME|HIGH|MEDIUM|LOW",
      "oshaContext": "Specific OSHA statistic or regulation reference",
      "inadequateControls": [
        "Specific control gap 1",
        "Specific control gap 2"
      ],
      "recommendedControls": [
        "L1-Elimination: Specific recommendation",
        "L3-Engineering: Specific recommendation",
        "L4-Administrative: Specific recommendation"
      ],
      "regulatoryRequirement": "OSHA 1926.xxx citation if applicable"
    }}
  ],
  "topThreats": [
    "Threat 1 (Risk Score: XX)",
    "Threat 2 (Risk Score: XX)",
    "Threat 3 (Risk Score: XX)"
  ],
  "weatherImpact": "Description of how current weather affects risk levels",
  "immediateActions": ["Action 1 if EXTREME/HIGH risk", "Action 2"]
}}

CRITICAL: Output ONLY valid JSON. Any text outside JSON will cause parsing failure."""

        # Call Gemini
        result = await self.client.generate(
            prompt=prompt,
            temperature=self.temperature,
            max_tokens=self.max_tokens
        )
        
        return result
