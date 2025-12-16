"""
Agent 4: Synthesis Agent - Executive Decision Maker
Deterministic decision logic + AI executive summary
"""

from app.agents.base import BaseAgent, AgentTask, AgentResponse, ModelCapability, ModelProvider
from app.agents.registry import AgentRegistry
from typing import Dict, Any, List
from datetime import datetime
import json

class SynthesisAgent(BaseAgent):
    """
    Agent 4: Report Synthesizer
    
    Responsibilities:
    - Make GO/NO-GO decision (deterministic weighted scoring)
    - Generate action items (deduplicated)
    - Write executive summary (AI)
    - Extract critical findings
    - Define stop-work conditions
    
    Input: Outputs from Agents 1, 2, 3
    Output: Final report for users (PUBLIC-FACING)
    """

    def __init__(self, registry: AgentRegistry):
        super().__init__(
            name="synthesis_agent",
            description="Synthesizes final JHA report from agent outputs"
        )
        self.registry = registry

    def get_capabilities(self) -> list[ModelCapability]:
        """AI only for executive summary writing"""
        return [ModelCapability.STRUCTURED_OUTPUT]

    def get_prompt_template(self) -> str:
        """Gemini prompt for executive summary"""
        return """You are Agent 4: Executive Synthesizer.

You receive analysis from Agents 1, 2, and 3.
Your job: Write a professional executive summary for site supervisors.

═══════════════════════════════════════════
DECISION (ALREADY CALCULATED)
═══════════════════════════════════════════

Decision: {decision}
Score: {decision_score}/100

Decision Factors:
{decision_factors}

═══════════════════════════════════════════
AGENT OUTPUTS
═══════════════════════════════════════════

Agent 1 (Validator):
- Data quality: {quality_score}/10
- Stop-work triggers: {stop_work_triggers}
- Missing critical: {missing_critical}

Agent 2 (Risk Assessor):
- Weather status: {weather_status}
- Top hazard: {top_hazard} (score: {top_score})
- OSHA gaps: {osha_gap_count}
- Citation risk: {citation_risk}

Agent 3 (Incident Predictor):
- Predicted incidents: {incident_count}
- Highest severity: {max_severity}
- Top incident: {top_incident_name}

═══════════════════════════════════════════
YOUR JOB: WRITE EXECUTIVE SUMMARY
═══════════════════════════════════════════

Write 2-3 paragraphs for site supervisor:

Paragraph 1: Overall Assessment
- Decision (GO/GO_WITH_CONDITIONS/NO_GO)
- Why this decision was made
- Key safety concerns

Paragraph 2: Critical Findings
- Weather status and margins
- Highest risks identified
- OSHA compliance concerns

Paragraph 3: Path Forward (if GO_WITH_CONDITIONS)
- What must be done before work starts
- What must be monitored during work
- When to stop work

TONE:
- Professional, direct, actionable
- Safety-focused but not alarmist
- Specific, not generic

DO NOT:
- Repeat action items (they're listed separately)
- Use bullet points (prose only)
- Mention "Agent 1/2/3" (invisible to user)
- Quote OSHA standards verbatim (cite them)

═══════════════════════════════════════════
OUTPUT (TEXT ONLY - NOT JSON)
═══════════════════════════════════════════

<executive_summary>
Your 2-3 paragraph summary here.
</executive_summary>"""

    async def execute(self, task: AgentTask) -> AgentResponse:
        """
        Complete synthesis pipeline
        
        1. Make decision (deterministic)
        2. Generate action items (deterministic deduplication)
        3. Write executive summary (AI)
        4. Extract critical findings
        5. Define stop-work conditions
        """
        
        start_time = datetime.utcnow()
        
        try:
            # Extract all agent outputs
            # Orchestrator combines: {validation, enriched_data, risk, prediction}
            
            # DEFENSIVE: Ensure input_data is a dict
            if not isinstance(task.input_data, dict):
                raise ValueError("Invalid input data: expected dict")
            
            agent1_validation = task.input_data.get("validation", {})
            enriched_data = task.input_data.get("enriched_data", {})
            agent2_risk = task.input_data.get("risk", {})
            agent3_prediction = task.input_data.get("prediction", {})
            
            # DEFENSIVE: Ensure all extracted data are dicts
            if not isinstance(agent1_validation, dict):
                agent1_validation = {}
            if not isinstance(enriched_data, dict):
                enriched_data = {}
            if not isinstance(agent2_risk, dict):
                agent2_risk = {}
            if not isinstance(agent3_prediction, dict):
                agent3_prediction = {}
            
            # Also get JHA and weather for context
            jha = enriched_data.get("jha", {})
            weather = enriched_data.get("weather", {})
            
            # DEFENSIVE: Ensure jha and weather are dicts
            if not isinstance(jha, dict):
                jha = {}
            if not isinstance(weather, dict):
                weather = {}
            
            # STEP 1: Make decision (DETERMINISTIC)
            decision_data = self._make_decision(agent1_validation, agent2_risk, agent3_prediction)
            
            # STEP 2: Generate action items (DETERMINISTIC DEDUPLICATION)
            action_items = self._generate_actions(agent2_risk, agent3_prediction)
            
            # STEP 3: Write executive summary (AI)
            executive_summary = await self._write_summary(
                decision_data,
                agent1_validation,
                agent2_risk,
                agent3_prediction
            )
            
            # STEP 4: Extract critical findings
            critical_findings = self._extract_critical_findings(
                agent1_validation,
                agent2_risk,
                agent3_prediction
            )
            
            # STEP 5: Define stop-work conditions
            stop_work_conditions = self._define_stop_work(
                agent2_risk,
                agent3_prediction
            )
            
            # STEP 6: Package final report
            output = {
                "finalReport": {
                    "decision": decision_data["decision"],
                    "decisionScore": decision_data["decision_score"],
                    "executiveSummary": executive_summary,
                    "criticalFindings": critical_findings,
                    "actionItems": action_items,
                    "stopWorkConditions": stop_work_conditions,
                    "weatherMonitoring": agent2_risk.get("weather_analysis", {}),
                    "metadata": {
                        "generatedAt": datetime.utcnow().isoformat(),
                        "projectName": jha.get("jobInfo", {}).get("projectName", "Unknown"),
                        "location": jha.get("jobInfo", {}).get("location", "Unknown"),
                        "workType": jha.get("jobInfo", {}).get("workType", "Unknown")
                    }
                }
            }
            
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return AgentResponse(
                success=True,
                output_data=output,
                model_used="deterministic-synthesis",
                provider=ModelProvider.GOOGLE,
                execution_time_ms=execution_time,
                token_usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            )

        except Exception as e:
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            return AgentResponse(
                success=False,
                output_data={},
                model_used="deterministic-synthesis",
                provider=ModelProvider.GOOGLE,
                execution_time_ms=execution_time,
                token_usage={},
                error=f"Report synthesis failed: {str(e)}"
            )

    def _make_decision(
        self,
        agent1_validation: Dict[str, Any],
        agent2_risk: Dict[str, Any],
        agent3_prediction: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        DETERMINISTIC decision logic with weighted scoring
        """
        
        decision_score = 100  # Start at GO
        factors = []
        
        # FACTOR 1: Data Quality (from Agent 1)
        quality = agent1_validation.get("qualityScore", 10)
        if quality < 3:
            decision_score -= 50
            factors.append(f"Critical data missing (quality: {quality}/10) -50pts")
        elif quality < 6:
            decision_score -= 20
            factors.append(f"Significant data gaps (quality: {quality}/10) -20pts")
        
        # FACTOR 2: Weather Status (from Agent 2)
        weather_status = agent2_risk.get("weather_analysis", {}).get("status", "GREEN")
        if weather_status == "RED":
            decision_score -= 40
            factors.append("Weather RED status -40pts")
        elif weather_status == "YELLOW":
            decision_score -= 20
            factors.append("Weather YELLOW status -20pts")
        
        # FACTOR 3: High-Confidence Catastrophic Risks (from Agent 2)
        catastrophic_count = 0
        for hazard in agent2_risk.get("hazards", []):
            if (hazard.get("likelihood") == "HIGH" and 
                hazard.get("consequence") == "CATASTROPHIC"):
                catastrophic_count += 1
                decision_score -= 30
        if catastrophic_count > 0:
            factors.append(f"{catastrophic_count} HIGH/CATASTROPHIC hazard(s) -{catastrophic_count * 30}pts")
        
        # FACTOR 4: Stop-Work Triggers (from Agent 1)
        stop_work_triggers = agent1_validation.get("stopWorkTriggers", [])
        stop_work_count = len(stop_work_triggers)
        if stop_work_count > 0:
            decision_score -= (stop_work_count * 20)
            factors.append(f"{stop_work_count} stop-work trigger(s) -{stop_work_count * 20}pts")
        
        # FACTOR 5: OSHA Citation Risk (from Agent 2)
        citation_risk = agent2_risk.get("citation_risk", "LOW")
        if citation_risk == "HIGH":
            decision_score -= 20
            factors.append("HIGH OSHA citation risk -20pts")
        
        # DETERMINE DECISION
        decision_score = max(0, decision_score)  # Floor at 0
        
        if decision_score < 40:
            decision = "NO_GO"
        elif decision_score < 70:
            decision = "GO_WITH_CONDITIONS"
        else:
            decision = "GO"
        
        return {
            "decision": decision,
            "decision_score": decision_score,
            "factors": factors
        }

    def _generate_actions(
        self,
        agent2_risk: Dict[str, Any],
        agent3_prediction: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        DETERMINISTIC action item generation with semantic deduplication
        """
        
        actions = []
        seen_targets = set()
        
        # From OSHA gaps (Agent 2)
        for gap in agent2_risk.get("osha_gaps", []):
            target = gap.get("standard", "")
            if target and target not in seen_targets:
                actions.append({
                    "what": gap.get("required_action", "Address compliance gap"),
                    "who": "Site supervisor",
                    "verify": f"Compliance with {target}",
                    "priority": "CRITICAL" if gap.get("severity") == "SERIOUS" else "HIGH",
                    "source": "OSHA compliance",
                    "category": "Compliance"
                })
                seen_targets.add(target)
        
        # From predicted incidents (Agent 3)
        all_predictions = agent3_prediction.get("allPredictions", [])
        if not all_predictions:
            # Fallback to single prediction
            single_pred = agent3_prediction.get("incidentPrediction", {})
            if single_pred:
                all_predictions = [single_pred]
        
        for incident in all_predictions:
            intervention = incident.get("single_best_intervention", "")
            if intervention:
                # Only add if not already covered by OSHA actions
                if not any(intervention.lower() in a["what"].lower() for a in actions):
                    actions.append({
                        "what": intervention,
                        "who": "Crew lead",
                        "verify": "Hazard eliminated or controlled",
                        "priority": "CRITICAL" if incident.get("severity") == "CATASTROPHIC" else "HIGH",
                        "source": "Incident prevention",
                        "category": "Safety"
                    })
        
        # Sort by priority
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        actions.sort(key=lambda x: priority_order.get(x.get("priority", "LOW"), 3))
        
        return actions[:10]  # Max 10 action items

    async def _write_summary(
        self,
        decision_data: Dict[str, Any],
        agent1_validation: Dict[str, Any],
        agent2_risk: Dict[str, Any],
        agent3_prediction: Dict[str, Any]
    ) -> str:
        """Use AI to write professional executive summary"""
        
        try:
            # Extract data for prompt
            hazards = agent2_risk.get("hazards", [])
            top_hazard = hazards[0] if hazards else {}
            
            all_predictions = agent3_prediction.get("allPredictions", [])
            if not all_predictions:
                single_pred = agent3_prediction.get("incidentPrediction", {})
                if single_pred:
                    all_predictions = [single_pred]
            
            top_incident = all_predictions[0] if all_predictions else {}
            
            # Build prompt
            prompt = self.get_prompt_template().format(
                decision=decision_data["decision"],
                decision_score=decision_data["decision_score"],
                decision_factors="\n".join(f"- {f}" for f in decision_data["factors"]),
                quality_score=agent1_validation.get("qualityScore", 0),
                stop_work_triggers=json.dumps(agent1_validation.get("stopWorkTriggers", [])),
                missing_critical=json.dumps(agent1_validation.get("missingCritical", [])),
                weather_status=agent2_risk.get("weather_analysis", {}).get("status", "UNKNOWN"),
                top_hazard=top_hazard.get("name", "Unknown"),
                top_score=agent2_risk.get("top_score", 0),
                osha_gap_count=len(agent2_risk.get("osha_gaps", [])),
                citation_risk=agent2_risk.get("citation_risk", "UNKNOWN"),
                incident_count=len(all_predictions),
                max_severity=top_incident.get("severity", "UNKNOWN"),
                top_incident_name=top_incident.get("incident_name", "Unknown")
            )
            
            # Call AI
            adapter = self.registry.route_task(
                required_capabilities=[ModelCapability.STRUCTURED_OUTPUT],
                preferred_provider=ModelProvider.GOOGLE
            )
            
            result = await adapter.generate(
                prompt=prompt,
                temperature=0.5,  # Balanced for professional writing
                max_tokens=1000
            )
            
            # Extract summary from response
            response_text = result.get("text", "")
            
            # Parse XML tags if present
            if "<executive_summary>" in response_text:
                summary = response_text.split("<executive_summary>")[1].split("</executive_summary>")[0].strip()
            else:
                summary = response_text.strip()
            
            return summary
            
        except Exception as e:
            print(f"AI summary generation failed: {e}")
            # Fallback to basic summary
            return f"Analysis complete. Decision: {decision_data['decision']} (score: {decision_data['decision_score']}/100). Review critical findings and action items below."

    def _extract_critical_findings(
        self,
        agent1_validation: Dict[str, Any],
        agent2_risk: Dict[str, Any],
        agent3_prediction: Dict[str, Any]
    ) -> List[str]:
        """Extract critical findings from all agents"""
        
        findings = []
        
        # From Agent 1: Stop-work triggers
        for trigger in agent1_validation.get("stopWorkTriggers", []):
            findings.append(f"{trigger} - STOP WORK TRIGGER")
        
        # From Agent 2: Weather status
        weather_analysis = agent2_risk.get("weather_analysis", {})
        if weather_analysis.get("status") in ["YELLOW", "RED"]:
            findings.append(f"{weather_analysis.get('critical_finding', 'Weather concern')} - {weather_analysis['status']} status")
        
        # From Agent 2: High-risk hazards
        for hazard in agent2_risk.get("hazards", [])[:3]:  # Top 3
            if hazard.get("risk_score", 0) >= 70:
                findings.append(f"{hazard.get('name', 'Unknown hazard')} (risk score: {hazard['risk_score']}/100)")
        
        # From Agent 2: OSHA gaps
        for gap in agent2_risk.get("osha_gaps", [])[:2]:  # Top 2
            if gap.get("citation_likelihood") in ["HIGH", "CERTAIN"]:
                findings.append(f"{gap.get('standard', 'OSHA')} gap: {gap.get('gap', 'Compliance issue')} - {gap['citation_likelihood']} citation risk")
        
        # From Agent 3: High-confidence predictions
        all_predictions = agent3_prediction.get("allPredictions", [])
        if not all_predictions:
            single_pred = agent3_prediction.get("incidentPrediction", {})
            if single_pred:
                all_predictions = [single_pred]
        
        for incident in all_predictions[:2]:  # Top 2
            if incident.get("confidence") == "HIGH":
                findings.append(f"High-confidence prediction: {incident.get('incident_name', 'Unknown incident')}")
        
        return findings[:7]  # Max 7 critical findings

    def _define_stop_work(
        self,
        agent2_risk: Dict[str, Any],
        agent3_prediction: Dict[str, Any]
    ) -> List[str]:
        """Define measurable stop-work conditions"""
        
        conditions = []
        
        # From Agent 2: Weather thresholds
        weather_analysis = agent2_risk.get("weather_analysis", {})
        for stop_work in weather_analysis.get("stop_work_weather", []):
            conditions.append(stop_work)
        
        # Equipment-specific thresholds
        equipment_margins = weather_analysis.get("equipment_margins", {})
        for equipment, margin_data in equipment_margins.items():
            limit = margin_data.get("limit", 0)
            conditions.append(f"Wind sustained >{limit}mph ({equipment} limit)")
        
        # Generic safety conditions
        conditions.append("Visibility drops below 1/4 mile")
        conditions.append("Any worker observes unsafe condition")
        conditions.append("Weather forecast predicts deteriorating conditions within 2 hours")
        
        # Deduplicate
        return list(dict.fromkeys(conditions))[:8]  # Max 8 conditions