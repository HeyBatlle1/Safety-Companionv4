"""
Agent 3: Swiss Cheese Analyzer - Incident Prediction
AI-driven incident prediction with causal chains and leading indicators
"""

from app.agents.base import BaseAgent, AgentTask, AgentResponse, ModelCapability, ModelProvider
from app.agents.registry import AgentRegistry
from typing import Dict, Any, List
from datetime import datetime
import json

class SwissCheeseAnalyzerAgent(BaseAgent):
    """
    Agent 3: Incident Prediction & Swiss Cheese Analysis
    
    Responsibilities:
    - Predict SPECIFIC incidents using Swiss Cheese model
    - Build causal chains (how incidents happen step-by-step)
    - Identify leading indicators (observable warning signs)
    - Determine near-miss versions
    - Recommend single best intervention
    
    Input: Agent 2's risk assessment
    Output: Incident predictions for Agent 4
    """

    def __init__(self, registry: AgentRegistry):
        super().__init__(
            name="swiss_cheese_analyzer",
            description="Predicts incidents using Swiss Cheese model"
        )
        self.registry = registry

    def get_capabilities(self) -> list[ModelCapability]:
        """Requires AI for incident prediction"""
        return [
            ModelCapability.STRUCTURED_OUTPUT,
            ModelCapability.REASONING
        ]

    def get_prompt_template(self) -> str:
        """Gemini prompt for incident prediction"""
        return """You are Agent 3: Incident Prediction using Swiss Cheese Model.

Agent 2 has identified hazards and risks.
Your job: Predict SPECIFIC incidents that could occur.

═══════════════════════════════════════════
INPUT FROM AGENT 2
═══════════════════════════════════════════

Hazards: {hazards}
OSHA Gaps: {osha_gaps}
Inadequate Controls: {inadequate_controls}
Hazard Interactions: {hazard_interactions}

═══════════════════════════════════════════
YOUR JOB: PREDICT SPECIFIC INCIDENTS
═══════════════════════════════════════════

For the TOP 2-3 HIGHEST RISK hazards, predict:

1. SPECIFIC INCIDENT NAME
   NOT: "Fall hazard"
   YES: "Worker falls 90ft from swing stage during glass panel positioning in high wind"

2. CAUSAL CHAIN (how it happens step-by-step)
   Initial Event → Defense Failure 1 → Defense Failure 2 → Human Factor → Mechanism → Outcome

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

5. NEAR-MISS VERSION (what happens if we get LUCKY)
   Same scenario but non-injury outcome

6. SINGLE BEST INTERVENTION
   What ONE change prevents this most effectively?

═══════════════════════════════════════════
OUTPUT FORMAT (JSON)
═══════════════════════════════════════════

{{
  "predicted_incidents": [
    {{
      "incident_name": "Specific incident description",
      "likelihood": "LOW/MEDIUM/HIGH",
      "severity": "MINOR/SERIOUS/CRITICAL/CATASTROPHIC",
      "confidence": "LOW/MEDIUM/HIGH",
      "probability_next_4_hours": 0.35,
      
      "causal_chain": [
        "Wind gust during panel lift",
        "Swing stage sways unexpectedly",
        "Worker loses balance reaching for panel",
        "Fall protection anchor fails under dynamic load",
        "Worker falls 90 feet to ground"
      ],
      
      "swiss_cheese": {{
        "organizational": ["No weather monitoring policy enforced"],
        "engineering": ["Swing stage not rated for wind loads"],
        "administrative": ["Lift procedure doesn't account for wind"],
        "behavioral": ["Worker rushing to finish before weather worsens"],
        "ppe": ["Fall protection anchor not inspected"]
      }},
      
      "leading_indicators": [
        "Workers checking weather informally",
        "Swing stage swaying visibly",
        "Team discussing wind concerns"
      ],
      
      "near_miss_version": "Same scenario but worker grabs railing, close call reported",
      
      "single_best_intervention": "Stop work when wind exceeds 15mph margin"
    }}
  ]
}}

Return ONLY valid JSON. No markdown, no explanations."""

    async def execute(self, task: AgentTask) -> AgentResponse:
        """
        Execute incident prediction
        
        1. Extract Agent 2 output
        2. Predict specific incidents using AI
        3. Package for Agent 4
        """
        
        start_time = datetime.utcnow()
        # Agent 2 returns: {risk: {hazards, osha_gaps, etc}}
        try:
            # Extract Agent 2 output
            agent2_output = task.input_data
            risk_data = agent2_output.get("risk", {})
            
            hazards = risk_data.get("hazards", [])
            osha_gaps = risk_data.get("osha_gaps", [])
            inadequate_controls = risk_data.get("inadequate_controls", [])
            hazard_interactions = risk_data.get("hazard_interactions", [])
            
            # Predict incidents using AI
            predictions = await self._predict_incidents_with_ai(
                hazards,
                osha_gaps,
                inadequate_controls,
                hazard_interactions
            )
            
            # Extract interventions from predictions
            interventions = []
            for incident in predictions.get("predicted_incidents", []):
                interventions.append({
                    "action": incident.get("single_best_intervention", ""),
                    "target_incident": incident.get("incident_name", ""),
                    "effectiveness": "HIGH"  # Assuming best intervention is highly effective
                })
            
            # Package for Agent 4
            output = {
                "prediction": {
                    "incidentPrediction": predictions.get("predicted_incidents", [{}])[0] if predictions.get("predicted_incidents") else {},
                    "allPredictions": predictions.get("predicted_incidents", []),
                    "causalChain": predictions.get("predicted_incidents", [{}])[0].get("causal_chain", []) if predictions.get("predicted_incidents") else [],
                    "leadingIndicators": predictions.get("predicted_incidents", [{}])[0].get("leading_indicators", []) if predictions.get("predicted_incidents") else [],
                    "interventions": interventions,
                    "confidence": predictions.get("predicted_incidents", [{}])[0].get("confidence", "MEDIUM") if predictions.get("predicted_incidents") else "LOW"
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
                error=f"Incident prediction failed: {str(e)}"
            )

    async def _predict_incidents_with_ai(
        self,
        hazards: List[Dict[str, Any]],
        osha_gaps: List[Dict[str, Any]],
        inadequate_controls: List[str],
        hazard_interactions: List[str]
    ) -> Dict[str, Any]:
        """Use AI to predict specific incidents with causal chains"""
        
        try:
            # Build prompt
            prompt = self.get_prompt_template().format(
                hazards=json.dumps(hazards, indent=2),
                osha_gaps=json.dumps(osha_gaps, indent=2),
                inadequate_controls=json.dumps(inadequate_controls, indent=2),
                hazard_interactions=json.dumps(hazard_interactions, indent=2)
            )
            
            # Call AI
            adapter = self.registry.route_task(
                required_capabilities=[ModelCapability.STRUCTURED_OUTPUT],
                preferred_provider=ModelProvider.GOOGLE
            )
            
            result = await adapter.generate(
                prompt=prompt,
                temperature=1.0,  # High temp for creative incident prediction
                max_tokens=4000
            )
            
            # Parse JSON response
            response_text = result.get("text", "{}")
            
            # Clean markdown if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            predictions = json.loads(response_text.strip())
            
            return predictions
            
        except Exception as e:
            print(f"AI incident prediction failed: {e}")
            # Fallback to basic structure
            return {
                "predicted_incidents": [{
                    "incident_name": "Unable to predict specific incident",
                    "likelihood": "UNKNOWN",
                    "severity": "UNKNOWN",
                    "confidence": "LOW",
                    "probability_next_4_hours": 0.0,
                    "causal_chain": [],
                    "swiss_cheese": {},
                    "leading_indicators": [],
                    "near_miss_version": "",
                    "single_best_intervention": "Complete risk assessment"
                }]
            }