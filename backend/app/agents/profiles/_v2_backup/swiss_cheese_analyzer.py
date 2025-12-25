# app/agents/profiles/swiss_cheese_analyzer.py

import os
import json
from typing import Dict, List, Any
import google.generativeai as genai


class SwissCheeseAnalyzer:
    """
    Agent 3: Swiss Cheese Analyzer
    Predicts specific incidents using causal chains and defensive layers
    """
    
    def __init__(self):
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def predict(self, agent2_output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main prediction function
        
        Args:
            agent2_output: Complete output from Agent 2
            
        Returns:
            Predicted incidents with causal chains
        """
        
        # Use Gemini for incident prediction
        predictions = self._gemini_prediction(agent2_output)
        
        return {
            "predicted_incidents": predictions.get("predicted_incidents", [])
        }
    
    def _gemini_prediction(self, agent2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use Gemini to predict specific incidents
        """
        
        prompt = f"""You are Agent 3: Incident Predictor using Swiss Cheese Model.

Agent 2 has identified hazards and risks.

Your job: Predict SPECIFIC incidents that could occur.

═══════════════════════════════════════════
INPUT FROM AGENT 2
═══════════════════════════════════════════

WEATHER STATUS: {agent2.get('weather_analysis', {}).get('status', 'UNKNOWN')}
Weather Finding: {agent2.get('weather_analysis', {}).get('critical_finding', 'N/A')}

TOP HAZARDS:
{self._format_hazards(agent2.get('hazards', []))}

OSHA GAPS:
{self._format_osha_gaps(agent2.get('osha_gaps', []))}

INADEQUATE CONTROLS:
{agent2.get('inadequate_controls', [])}

HAZARD INTERACTIONS:
{agent2.get('hazard_interactions', [])}

═══════════════════════════════════════════
YOUR JOB: PREDICT SPECIFIC INCIDENTS
═══════════════════════════════════════════

For the TOP 2-3 HIGHEST RISK hazards, predict:

1. SPECIFIC INCIDENT NAME
   NOT: "Fall hazard"
   YES: "Worker falls 90ft from swing stage during glass panel positioning in 19mph wind"

2. CAUSAL CHAIN (how it happens step-by-step)
   Initial Event → Defense Failure 1 → Defense Failure 2 → Human Factor → Mechanism → Outcome
   
   Example:
   - Wind gust hits 19mph during panel lift
   - Swing stage sways unexpectedly
   - Worker loses balance reaching for panel
   - Fall protection anchor fails under dynamic load
   - Worker falls 90 feet to ground

3. SWISS CHEESE LAYERS (identify holes in each layer)
   - Organizational: What policy/culture failures?
   - Engineering: What equipment/design failures?
   - Administrative: What procedure failures?
   - Behavioral: What human factors?
   - PPE: What last-line failures?

4. LEADING INDICATORS (observable warning signs)
   - What can we SEE happening that predicts this incident?
   - Workers skipping steps?
   - Equipment degradation?
   - Near-miss events?

5. NEAR-MISS VERSION (what if we get LUCKY)
   Same scenario but non-injury outcome

6. SINGLE BEST INTERVENTION
   What ONE change prevents this most effectively?

═══════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════

{{
  "predicted_incidents": [
    {{
      "incident_name": "Specific detailed incident description",
      "likelihood": "LOW" | "MEDIUM" | "HIGH",
      "severity": "MINOR" | "SERIOUS" | "CRITICAL" | "CATASTROPHIC",
      "confidence": "LOW" | "MEDIUM" | "HIGH",
      
      "causal_chain": [
        "Step 1: Initial trigger",
        "Step 2: First defense fails",
        "Step 3: Second defense fails",
        "Step 4: Human factor",
        "Step 5: Incident occurs"
      ],
      
      "swiss_cheese": {{
        "organizational": ["Policy failure 1", "Policy failure 2"],
        "engineering": ["Equipment failure 1"],
        "administrative": ["Procedure gap 1"],
        "behavioral": ["Human factor 1"],
        "ppe": ["Last defense failure"]
      }},
      
      "leading_indicators": [
        "Observable warning sign 1",
        "Observable warning sign 2"
      ],
      
      "near_miss_version": "Same scenario but lucky outcome",
      
      "single_best_intervention": "Most effective prevention"
    }}
  ]
}}

Focus on the TOP 2-3 highest risk hazards only.
Make incident names SPECIFIC and DETAILED.
Return ONLY valid JSON."""

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
            print(f"❌ Error in Gemini prediction: {e}")
            # Return minimal structure on error
            return {
                "predicted_incidents": []
            }
    
    def _format_hazards(self, hazards: List[Dict]) -> str:
        """Format hazards for prompt"""
        if not hazards:
            return "None identified"
        
        lines = []
        for i, hazard in enumerate(hazards[:5], 1):  # Top 5
            lines.append(f"{i}. {hazard.get('name', 'Unknown hazard')}")
            lines.append(f"   Risk Score: {hazard.get('risk_score', 0)}")
            lines.append(f"   Likelihood: {hazard.get('likelihood', 'N/A')}, Consequence: {hazard.get('consequence', 'N/A')}")
            lines.append(f"   Weather Amplified: {hazard.get('weather_amplified', False)}")
            if hazard.get('inadequate_controls'):
                lines.append(f"   Inadequate Controls: {', '.join(hazard['inadequate_controls'])}")
            lines.append("")
        
        return "\n".join(lines)
    
    def _format_osha_gaps(self, gaps: List[Dict]) -> str:
        """Format OSHA gaps for prompt"""
        if not gaps:
            return "None identified"
        
        lines = []
        for gap in gaps:
            lines.append(f"- {gap.get('standard', 'N/A')}: {gap.get('gap', 'N/A')}")
            lines.append(f"  Citation Likelihood: {gap.get('citation_likelihood', 'N/A')}, Severity: {gap.get('severity', 'N/A')}")
        
        return "\n".join(lines)