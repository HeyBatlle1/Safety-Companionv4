# app/agents/profiles/synthesis_agent.py

import os
import json
from typing import Dict, List, Any
import google.generativeai as genai


class SynthesisAgent:
    """
    Agent 4: Synthesis Agent
    Makes GO/NO-GO decision and writes executive report
    This is what users see - everything else is invisible.
    """
    
    def __init__(self):
        # Configure Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def synthesize(
        self, 
        agent1_output: Dict[str, Any],
        agent2_output: Dict[str, Any],
        agent3_output: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Complete synthesis pipeline
        
        Args:
            agent1_output: Validation and enriched data
            agent2_output: Risk assessment
            agent3_output: Incident predictions
            
        Returns:
            Final executive report (PUBLIC - what users see)
        """
        
        # Extract validation with proper field access
        validation = agent1_output.get("validation", {})
        
        # STEP 1: Make decision (deterministic scoring)
        decision_data = self._make_decision(agent1_output, agent2_output, agent3_output)
        
        # STEP 2: Generate action items (deterministic deduplication)
        action_items = self._generate_actions(agent2_output, agent3_output)
        
        # STEP 3: Write executive summary (Gemini)
        executive_summary = self._write_summary(
            decision_data,
            agent1_output,
            agent2_output,
            agent3_output
        )
        
        # STEP 4: Extract critical findings
        critical_findings = self._extract_critical_findings(
            agent1_output,
            agent2_output,
            agent3_output
        )
        
        # STEP 5: Define stop-work conditions
        stop_work_conditions = self._define_stop_work(agent2_output)
        
        return {
            "decision": decision_data["decision"],
            "decisionScore": decision_data["score"],
            "executiveSummary": executive_summary,
            "criticalFindings": critical_findings,
            "actionItems": action_items,
            "stopWorkConditions": stop_work_conditions,
            "weatherMonitoring": self._format_weather_monitoring(agent2_output)
        }
    
    def _make_decision(
        self,
        agent1: Dict[str, Any],
        agent2: Dict[str, Any],
        agent3: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Deterministic GO/NO-GO decision using weighted scoring
        """
        
        score = 100  # Start at GO
        factors = []
        
        # Extract validation data
        validation = agent1.get("validation", {})
        
        # FACTOR 1: Data Quality (from Agent 1)
        quality = validation.get("qualityScore", validation.get("quality_score", 10))
        if quality < 3:
            score -= 50
            factors.append(f"Critical data missing (quality: {quality}/10)")
        elif quality < 6:
            score -= 20
            factors.append(f"Significant data gaps (quality: {quality}/10)")
        
        # FACTOR 2: Weather Status (from Agent 2)
        weather_analysis = agent2.get("weather_analysis", {})
        weather_status = weather_analysis.get("status", "UNKNOWN")
        if weather_status == "RED":
            score -= 40
            factors.append("Weather NO-GO (equipment limits exceeded)")
        elif weather_status == "YELLOW":
            score -= 20
            factors.append("Weather caution (marginal conditions)")
        
        # FACTOR 3: High-Confidence Catastrophic Risks
        for hazard in agent2.get("hazards", []):
            if (hazard.get("likelihood") == "HIGH" and 
                hazard.get("consequence") == "CATASTROPHIC"):
                score -= 30
                factors.append(f"HIGH/CATASTROPHIC risk: {hazard.get('name', 'Unknown')}")
        
        # FACTOR 4: Stop-Work Triggers
        stop_work_triggers = validation.get("stopWorkTriggers", validation.get("stop_work_triggers", []))
        stop_work_count = len(stop_work_triggers)
        if stop_work_count > 0:
            score -= (stop_work_count * 20)
            for trigger in stop_work_triggers:
                factors.append(f"Stop-work trigger: {trigger}")
        
        # FACTOR 5: OSHA Citation Risk
        if agent2.get("citation_risk") == "CERTAIN":
            score -= 20
            factors.append("CERTAIN OSHA citation risk")
        
        # Ensure score stays in bounds
        score = max(0, min(100, score))
        
        # Determine decision
        if score < 40:
            decision = "NO_GO"
        elif score < 70:
            decision = "GO_WITH_CONDITIONS"
        else:
            decision = "GO"
        
        return {
            "decision": decision,
            "score": score,
            "factors": factors
        }
    
    def _generate_actions(
        self,
        agent2: Dict[str, Any],
        agent3: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Semantic deduplication of action items
        """
        
        actions = []
        seen_targets = set()
        
        # From OSHA gaps (Agent 2) - HIGHEST PRIORITY
        for gap in agent2.get("osha_gaps", []):
            target = gap.get("standard", "Unknown")
            if target not in seen_targets:
                actions.append({
                    "what": gap.get("required_action", "Address compliance gap"),
                    "who": "Site supervisor",
                    "verify": f"Compliance with {target}",
                    "priority": "CRITICAL" if gap.get("severity") == "SERIOUS" else "HIGH",
                    "source": "OSHA compliance"
                })
                seen_targets.add(target)
        
        # From predicted incidents (Agent 3)
        for incident in agent3.get("predicted_incidents", []):
            intervention = incident.get("single_best_intervention", "")
            
            # Only add if not already covered
            if intervention and not any(
                intervention.lower() in action["what"].lower() 
                for action in actions
            ):
                actions.append({
                    "what": intervention,
                    "who": "Crew lead",
                    "verify": "Hazard eliminated or controlled",
                    "priority": "CRITICAL" if incident.get("severity") == "CATASTROPHIC" else "HIGH",
                    "source": "Incident prevention"
                })
        
        # Sort by priority
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
        actions.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        # Limit to top 10
        return actions[:10]
    
    def _write_summary(
        self,
        decision_data: Dict[str, Any],
        agent1: Dict[str, Any],
        agent2: Dict[str, Any],
        agent3: Dict[str, Any]
    ) -> str:
        """
        Use Gemini to write executive summary
        """
        
        validation = agent1.get("validation", {})
        weather_analysis = agent2.get("weather_analysis", {})
        
        prompt = f"""You are Agent 4: Executive Synthesizer.

Write a professional executive summary for a site supervisor.

═══════════════════════════════════════════
DECISION (ALREADY CALCULATED)
═══════════════════════════════════════════

Decision: {decision_data['decision']}
Score: {decision_data['score']}/100

Decision Factors:
{self._format_list(decision_data['factors'])}

═══════════════════════════════════════════
AGENT OUTPUTS
═══════════════════════════════════════════

AGENT 1 (VALIDATOR):
Data Quality: {validation.get('qualityScore', validation.get('quality_score', 'N/A'))}/10
Stop-Work Triggers: {len(validation.get('stopWorkTriggers', validation.get('stop_work_triggers', [])))}
Missing Critical: {validation.get('missingCritical', validation.get('missing_critical', []))}

AGENT 2 (RISK ASSESSOR):
Weather Status: {weather_analysis.get('status', 'UNKNOWN')}
Weather Finding: {weather_analysis.get('critical_finding', 'N/A')}
Top Hazard: {agent2.get('top_hazard', 'N/A')} (score: {agent2.get('top_score', 0)})
OSHA Gaps: {len(agent2.get('osha_gaps', []))}
Citation Risk: {agent2.get('citation_risk', 'N/A')}

AGENT 3 (INCIDENT PREDICTOR):
Predicted Incidents: {len(agent3.get('predicted_incidents', []))}
{self._format_top_incident(agent3.get('predicted_incidents', []))}

═══════════════════════════════════════════
YOUR JOB: WRITE EXECUTIVE SUMMARY
═══════════════════════════════════════════

Write 2-3 paragraphs in professional prose:

PARAGRAPH 1: Overall Assessment
- State the decision clearly (GO/GO_WITH_CONDITIONS/NO_GO)
- Why this decision was made
- Key safety concerns at a glance

PARAGRAPH 2: Critical Findings
- Weather status and equipment margins
- Highest risks identified
- OSHA compliance concerns
- What could go wrong

PARAGRAPH 3: Path Forward (if GO_WITH_CONDITIONS or GO)
- What must be done before work starts
- What must be monitored during work
- When to stop work immediately

If NO_GO:
- Why work cannot proceed
- What must change before resubmission
- Immediate actions required

TONE:
- Professional, direct, actionable
- Safety-focused but not alarmist
- Specific, not generic
- Respectful of worker safety AND project needs

DO NOT:
- Use bullet points (prose only)
- Repeat action items (they're listed separately)
- Mention "Agent 1/2/3" (invisible to user)
- Quote OSHA standards verbatim (cite them naturally)
- Use headers or formatting

OUTPUT: Plain text prose, 2-3 paragraphs."""

        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            print(f"❌ Error generating summary: {e}")
            # Fallback summary
            return f"Safety analysis complete. Decision: {decision_data['decision']} (score: {decision_data['score']}/100). Review critical findings and action items below before proceeding."
    
    def _extract_critical_findings(
        self,
        agent1: Dict[str, Any],
        agent2: Dict[str, Any],
        agent3: Dict[str, Any]
    ) -> List[str]:
        """
        Extract most critical findings across all agents
        """
        
        findings = []
        validation = agent1.get("validation", {})
        weather_analysis = agent2.get("weather_analysis", {})
        
        # Weather findings
        if weather_analysis.get("status") in ["YELLOW", "RED"]:
            findings.append(weather_analysis.get("critical_finding", "Weather conditions require monitoring"))
        
        # Stop-work triggers from Agent 1
        stop_work_triggers = validation.get("stopWorkTriggers", validation.get("stop_work_triggers", []))
        for trigger in stop_work_triggers:
            findings.append(f"{trigger} - STOP WORK TRIGGER")
        
        # Top incident prediction
        incidents = agent3.get("predicted_incidents", [])
        if incidents:
            top = incidents[0]
            findings.append(
                f"{top.get('confidence', 'Unknown')} confidence prediction: {top.get('incident_name', 'Unknown incident')}"
            )
        
        # High-risk OSHA gaps
        for gap in agent2.get("osha_gaps", []):
            if gap.get("citation_likelihood") in ["HIGH", "CERTAIN"]:
                findings.append(
                    f"OSHA {gap.get('standard', 'N/A')} gap: {gap.get('gap', 'Unknown')} - {gap.get('citation_likelihood', 'N/A')} citation risk"
                )
        
        return findings
    
    def _define_stop_work(self, agent2: Dict[str, Any]) -> List[str]:
        """
        Define clear stop-work conditions
        """
        
        conditions = []
        weather_analysis = agent2.get("weather_analysis", {})
        
        # Weather-based stop-work
        equipment_margins = weather_analysis.get("equipment_margins", {})
        if equipment_margins:
            # Get worst equipment limit
            limits = []
            for equip, margin_data in equipment_margins.items():
                if isinstance(margin_data, dict):
                    limits.append(margin_data.get("limit", 25))
            
            if limits:
                min_limit = min(limits)
                conditions.append(f"Wind sustained >{min_limit}mph or gusts >{min_limit + 5}mph")
        
        # Standard stop-work conditions
        conditions.extend([
            "Visibility drops below 1/4 mile",
            "Any worker observes unsafe condition",
            "Weather forecast predicts deteriorating conditions within 2 hours"
        ])
        
        return conditions
    
    def _format_weather_monitoring(self, agent2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format weather monitoring guidance
        """
        
        weather_analysis = agent2.get("weather_analysis", {})
        equipment_margins = weather_analysis.get("equipment_margins", {})
        
        # Get worst margin
        worst_margin = 100
        if equipment_margins:
            margins = []
            for margin_data in equipment_margins.values():
                if isinstance(margin_data, dict):
                    margins.append(margin_data.get("margin_percent", 100))
            if margins:
                worst_margin = min(margins)
        
        # Get equipment limits
        limits = []
        if equipment_margins:
            for margin_data in equipment_margins.values():
                if isinstance(margin_data, dict):
                    limits.append(margin_data.get("limit", 25))
        
        stop_threshold = f"{min(limits)}mph sustained" if limits else "Equipment limit"
        status = weather_analysis.get("status", "UNKNOWN")
        
        return {
            "status": status,
            "currentWind": weather_analysis.get("current_wind", 0),
            "equipmentMargin": round(worst_margin, 1),
            "nextCheck": "15 minutes" if status in ["YELLOW", "RED"] else "30 minutes",
            "stopWorkThreshold": stop_threshold
        }
    
    def _format_list(self, items: List[str]) -> str:
        """Format list for prompt"""
        if not items:
            return "None"
        return "\n".join(f"- {item}" for item in items)
    
    def _format_top_incident(self, incidents: List[Dict]) -> str:
        """Format top incident for prompt"""
        if not incidents:
            return "None predicted"
        
        top = incidents[0]
        return f"Top Incident: {top.get('incident_name', 'Unknown')}\nLikelihood: {top.get('likelihood', 'N/A')}, Severity: {top.get('severity', 'N/A')}, Confidence: {top.get('confidence', 'N/A')}"