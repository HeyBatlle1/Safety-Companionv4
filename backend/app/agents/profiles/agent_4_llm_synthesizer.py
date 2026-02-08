"""
AGENT 4: INTELLIGENT REPORT SYNTHESIZER (LLM-Powered)

Purpose: Synthesizes outputs from Agents 1-3 into an executive safety report
         with intelligent cross-agent analysis, contradiction detection,
         and contextualized recommendations.

Temperature: 0.6 (Professional narrative generation)
Max Tokens: 16,000

This replaces the pure Python Agent 4 with an LLM that:
1. Analyzes outputs from all agents
2. Identifies contradictions and gaps
3. Generates contextualized, narrative recommendations
4. Produces executive-level decision support
5. Writes in clear, professional safety officer language
"""

import time
import uuid
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

from app.services.gemini_client import GeminiClient
from app.agents.profiles.agent_4_synthesizer import Agent4Synthesizer


class Agent4LLMSynthesizer:
    """
    Intelligent Report Synthesizer - LLM-Powered

    Transforms raw agent outputs into executive-quality safety reports
    with cross-agent analysis and contextualized recommendations.
    """

    def __init__(self, gemini_client: GeminiClient = None):
        """Initialize with Gemini client for LLM synthesis"""
        self.client = gemini_client or GeminiClient()
        self.temperature = 0.6  # Professional narrative generation
        self.max_tokens = 16000

        # Keep Python-based Agent 4 as fallback
        self.fallback_agent = Agent4Synthesizer()

    def _calculate_baseline_decision(
        self,
        risk: Dict[str, Any],
        prediction: Dict[str, Any],
        weather_data: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate baseline GO/NO-GO using deterministic Python logic.
        This provides a foundation for the LLM to explain and potentially override.
        """
        return self.fallback_agent.determine_go_no_go(
            validation=validation,
            risk=risk,
            prediction=prediction,
            weather_data=weather_data
        )

    def _summarize_agent_outputs(
        self,
        validation: Dict[str, Any],
        risk: Dict[str, Any],
        prediction: Dict[str, Any],
        weather_data: Dict[str, Any],
        checklist_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Create concise summaries of each agent's output for the LLM prompt.
        Avoids dumping raw JSON which wastes tokens.
        """
        # Agent 1 Summary
        validation_summary = f"""
Data Quality: {validation.get('dataQuality', 'UNKNOWN')} ({validation.get('qualityScore', 0)}/10)
Missing Critical Fields: {', '.join(validation.get('missingCritical', [])) or 'None'}
Trade-Specific Gaps: {', '.join(validation.get('tradeSpecificGaps', [])) or 'None'}
Key Concerns: {json.dumps(validation.get('concerns', {}), indent=2)}
"""

        # Agent 2 Summary
        hazards = risk.get("hazards", [])
        hazard_summaries = []
        for h in hazards[:3]:  # Top 3 hazards
            hazard_summaries.append(
                f"- {h.get('name', 'Unknown')}: Score {h.get('riskScore', 0)}/100 ({h.get('riskLevel', 'UNKNOWN')})"
                f"\n  Controls Gaps: {', '.join(h.get('inadequateControls', [])[:2]) or 'None'}"
            )

        risk_summary = f"""
Overall Risk Level: {risk.get('riskSummary', {}).get('overallRiskLevel', 'UNKNOWN')}
Highest Risk Score: {risk.get('riskSummary', {}).get('highestRiskScore', 0)}/100
Industry Context: {risk.get('riskSummary', {}).get('industryContext', 'N/A')}

Top Hazards:
{chr(10).join(hazard_summaries) if hazard_summaries else 'No hazards identified'}

Weather Impact: {risk.get('weatherImpact', 'Not assessed')}
Immediate Actions: {', '.join(risk.get('immediateActions', [])) or 'None'}
"""

        # Agent 3 Summary
        prediction_summary = f"""
Predicted Incident: {prediction.get('incidentName', 'Not predicted')}
Probability: {prediction.get('probability', 0)}% in {prediction.get('timeframe', 'next 4 hours')}
Confidence: {prediction.get('confidence', 'UNKNOWN')}

Causal Chain (Swiss Cheese):
{chr(10).join(['- ' + str(c) for c in prediction.get('causalChain', [])[:5]]) or 'Not analyzed'}

Leading Indicators:
{chr(10).join(['- ' + str(i) for i in prediction.get('leadingIndicators', [])[:3]]) or 'None identified'}
"""

        # Weather Summary
        weather_summary = f"""
Temperature: {weather_data.get('temperature', 'Unknown')}°F (Feels like: {weather_data.get('feelsLike', 'N/A')}°F)
Wind: {weather_data.get('windSpeed', 'Unknown')} mph
Conditions: {weather_data.get('conditions', 'Unknown')}
Fetch Status: {weather_data.get('fetch_status', 'UNKNOWN')}
Alerts: {', '.join(weather_data.get('alerts', [])) or 'None'}
"""

        # Job Details Summary
        job_info = checklist_data.get("jobInfo", {})
        job_summary = f"""
Project: {job_info.get('projectName', checklist_data.get('projectName', 'Unknown'))}
Location: {job_info.get('location', checklist_data.get('location', 'Unknown'))}
Work Type: {job_info.get('workType', checklist_data.get('workType', 'Unknown'))}
Crew Size: {job_info.get('crewSize', checklist_data.get('crewSize', 'Unknown'))}
Supervisor: {job_info.get('supervisor', checklist_data.get('supervisor', 'Unknown'))}
Date: {job_info.get('date', 'Not specified')}
Description: {job_info.get('description', 'No description provided')[:500]}
"""

        return {
            "validation": validation_summary.strip(),
            "risk": risk_summary.strip(),
            "prediction": prediction_summary.strip(),
            "weather": weather_summary.strip(),
            "job": job_summary.strip()
        }

    def _detect_contradictions(
        self,
        risk: Dict[str, Any],
        prediction: Dict[str, Any],
        validation: Dict[str, Any]
    ) -> List[str]:
        """
        Identify contradictions between agent outputs that need resolution.
        These are flagged for the LLM to address in its synthesis.
        """
        contradictions = []

        # Check risk score vs incident probability mismatch
        risk_score = risk.get("hazards", [{}])[0].get("riskScore", 0)
        risk_level = risk.get("riskSummary", {}).get("overallRiskLevel", "")
        incident_prob = prediction.get("probability", 0)

        # Medium risk but high incident probability
        if risk_level == "MEDIUM" and incident_prob >= 60:
            contradictions.append(
                f"Risk Assessment shows {risk_level} ({risk_score}/100) but Incident Predictor shows {incident_prob}% probability - "
                "Swiss Cheese model may have identified defense failures not captured in hazard scoring"
            )

        # High risk but low incident probability
        if risk_level == "HIGH" and incident_prob < 30:
            contradictions.append(
                f"Risk Assessment shows {risk_level} ({risk_score}/100) but Incident Predictor shows only {incident_prob}% probability - "
                "Controls may be more effective than initially assessed"
            )

        # Data quality concerns vs high confidence prediction
        data_quality = validation.get("dataQuality", "")
        pred_confidence = prediction.get("confidence", "")
        if data_quality == "LOW" and pred_confidence == "HIGH":
            contradictions.append(
                "Data Quality is LOW but Prediction Confidence is HIGH - "
                "Prediction may be based on assumptions rather than documented evidence"
            )

        # Missing controls in validation but adequate in risk
        missing_critical = validation.get("missingCritical", [])
        if len(missing_critical) > 3 and risk_level in ["LOW", "MEDIUM"]:
            contradictions.append(
                f"{len(missing_critical)} critical fields missing but Risk Level is {risk_level} - "
                "Assessment may not fully account for documentation gaps"
            )

        return contradictions

    async def synthesize_report(
        self,
        validation: Dict[str, Any],
        risk: Dict[str, Any],
        prediction: Dict[str, Any],
        weather_data: Dict[str, Any],
        checklist_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        LLM-powered synthesis of all agent outputs into executive decision report.

        Returns structured report dict with:
        - goNoGo: {decision, rationale, conditions}
        - executiveSummary: narrative synthesis
        - topThreats: prioritized list with specific context
        - criticalActions: specific interventions
        - approvalSignatures: required sign-offs
        """
        try:
            # 1. Calculate baseline decision using Python logic
            baseline_decision = self._calculate_baseline_decision(
                risk=risk,
                prediction=prediction,
                weather_data=weather_data,
                validation=validation
            )

            # 2. Summarize agent outputs for prompt
            summaries = self._summarize_agent_outputs(
                validation=validation,
                risk=risk,
                prediction=prediction,
                weather_data=weather_data,
                checklist_data=checklist_data
            )

            # 3. Detect contradictions
            contradictions = self._detect_contradictions(risk, prediction, validation)
            contradictions_text = "\n".join([f"- {c}" for c in contradictions]) if contradictions else "None detected"

            # 4. Build the system instruction
            system_instruction = """You are Agent 4, the Executive Safety Synthesizer for an AI-powered Job Hazard Analysis system.

Your role is to analyze outputs from three specialized safety agents and produce an executive-quality decision report that a Safety Director would be proud to sign.

CRITICAL REQUIREMENTS:
1. You are NOT just reformatting outputs - you must SYNTHESIZE and ADD INSIGHT
2. Identify and explain contradictions between agents
3. Generate SPECIFIC recommendations based on the actual job details (not generic templates)
4. Write in clear, professional safety management language
5. Make a defensible GO/NO-GO decision with specific rationale

WRITING STYLE:
- Professional but accessible - a site supervisor should understand it
- Use "we" language: "We're authorizing work because..." not "The system recommends..."
- Be specific: Reference actual heights, equipment, crew sizes, locations
- Be decisive: Clear recommendations, not hedging

OUTPUT FORMAT:
You must return ONLY valid JSON matching the exact schema specified. No markdown, no explanations outside the JSON."""

            # 5. Build the user prompt
            prompt = f"""### BASELINE DECISION (from Python rules engine)
Decision: {baseline_decision.get('decision')}
Reasons: {', '.join(baseline_decision.get('reasons', []))}
Conditions: {', '.join(baseline_decision.get('conditions', [])) or 'None'}

### AGENT 1 - DATA VALIDATOR OUTPUT
{summaries['validation']}

### AGENT 2 - RISK ASSESSOR OUTPUT
{summaries['risk']}

### AGENT 3 - INCIDENT PREDICTOR OUTPUT
{summaries['prediction']}

### WEATHER CONDITIONS
{summaries['weather']}

### JOB DETAILS
{summaries['job']}

### DETECTED CONTRADICTIONS (Require Resolution)
{contradictions_text}

---

Based on all inputs above, generate an executive safety decision report.

Your response must be ONLY valid JSON in this exact format:

{{
  "goNoGo": {{
    "decision": "GO|GO_WITH_CONDITIONS|NO_GO|STOP_WORK",
    "rationale": "2-4 sentence professional explanation referencing specific job details and agent findings. Explain WHY this decision, not just WHAT. If overriding baseline, explain why.",
    "conditions": ["Specific condition 1 if GO_WITH_CONDITIONS", "Condition 2"],
    "overrideReason": "Only include if different from baseline decision - explain why"
  }},
  "executiveSummary": {{
    "narrative": "3-5 sentence executive summary synthesizing the key findings. Reference specific hazards, probabilities, and job context. Write as if briefing a Safety Director.",
    "keyInsight": "One sentence capturing the most important thing decision-makers need to know",
    "contradictionsResolved": "If contradictions existed, explain how you resolved them"
  }},
  "topThreats": [
    {{
      "rank": 1,
      "threat": "Specific threat description with context (work type, height, equipment, conditions)",
      "whyDangerous": "1-2 sentences explaining the specific danger in this job context",
      "riskScore": 85,
      "incidentProbability": 65
    }},
    {{
      "rank": 2,
      "threat": "Second specific threat",
      "whyDangerous": "Explanation",
      "riskScore": 70,
      "incidentProbability": 45
    }},
    {{
      "rank": 3,
      "threat": "Third specific threat",
      "whyDangerous": "Explanation",
      "riskScore": 55,
      "incidentProbability": 30
    }}
  ],
  "criticalActions": [
    {{
      "action": "Specific action with details (who, what, where)",
      "reason": "Why this action addresses the specific hazard",
      "timeframe": "BEFORE_WORK|IMMEDIATELY|WITHIN_HOUR|TODAY",
      "responsible": "Role responsible (Supervisor, Competent Person, Safety Manager, Crew Lead)"
    }}
  ],
  "approvalSignatures": {{
    "required": ["Site Supervisor", "Other required roles based on decision and risk level"],
    "competentPersonReview": true,
    "managementReview": false,
    "escalationNote": "Only include if escalation to management is recommended"
  }},
  "weatherAssessment": {{
    "workSafe": true,
    "concerns": ["Specific weather concerns for this job type"],
    "recommendations": ["Weather-specific recommendations"]
  }},
  "dataQualityNote": "Brief note on data quality and any assumptions made due to missing information"
}}

IMPORTANT:
- If baseline decision is correct, your decision should match but provide BETTER rationale
- If you override baseline, clearly explain why in overrideReason
- Top threats must be SPECIFIC to this job - not generic like "Fall hazard"
- Actions must reference actual job details - not generic like "Review required"
- Write as if you're the senior safety professional making this call"""

            # 6. Call the LLM - Use Claude Sonnet 4 for synthesis (better writing)
            result = await self.client.generate(
                prompt=prompt,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                system_instruction=system_instruction,
                adapter_name="openrouter-claude-sonnet-4"  # Agent 4 uses Claude for synthesis
            )

            # 7. Merge LLM output with required structure
            return self._build_final_report(
                llm_output=result,
                validation=validation,
                risk=risk,
                prediction=prediction,
                weather_data=weather_data,
                checklist_data=checklist_data,
                baseline_decision=baseline_decision
            )

        except Exception as e:
            print(f"⚠️ Agent 4 LLM failed: {e}, using fallback")
            # Fall back to pure Python Agent 4
            return await self.fallback_agent.synthesize_report(
                validation=validation,
                risk=risk,
                prediction=prediction,
                weather_data=weather_data,
                checklist_data=checklist_data
            )

    def _build_final_report(
        self,
        llm_output: Dict[str, Any],
        validation: Dict[str, Any],
        risk: Dict[str, Any],
        prediction: Dict[str, Any],
        weather_data: Dict[str, Any],
        checklist_data: Dict[str, Any],
        baseline_decision: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build the final report structure combining LLM synthesis with raw agent data.
        """
        job_info = checklist_data.get("jobInfo", {})
        hazards = risk.get("hazards", [])

        # Extract LLM components with fallbacks
        go_no_go_llm = llm_output.get("goNoGo", {})
        exec_summary_llm = llm_output.get("executiveSummary", {})
        top_threats_llm = llm_output.get("topThreats", [])
        critical_actions_llm = llm_output.get("criticalActions", [])
        approvals_llm = llm_output.get("approvalSignatures", {})
        weather_llm = llm_output.get("weatherAssessment", {})

        # Build GO/NO-GO with LLM intelligence
        go_no_go = {
            "decision": go_no_go_llm.get("decision", baseline_decision.get("decision", "GO")),
            "reasons": [go_no_go_llm.get("rationale", baseline_decision.get("reasons", ["Assessment complete"])[0])],
            "conditions": go_no_go_llm.get("conditions", baseline_decision.get("conditions", [])),
            "baselineDecision": baseline_decision.get("decision"),
            "wasOverridden": go_no_go_llm.get("decision") != baseline_decision.get("decision"),
            "overrideReason": go_no_go_llm.get("overrideReason", "")
        }

        # Build action items from LLM with structure
        action_items = []
        for action in critical_actions_llm:
            action_items.append({
                "priority": "CRITICAL" if action.get("timeframe") in ["BEFORE_WORK", "IMMEDIATELY"] else "HIGH",
                "action": action.get("action", ""),
                "reason": action.get("reason", ""),
                "timeframe": action.get("timeframe", "TODAY"),
                "responsible": action.get("responsible", "Site Supervisor")
            })

        # Add any conditions as action items
        for condition in go_no_go.get("conditions", []):
            if condition and not any(a.get("action") == condition for a in action_items):
                action_items.append({
                    "priority": "CRITICAL",
                    "action": condition,
                    "reason": "Required condition for work authorization",
                    "timeframe": "BEFORE_WORK"
                })

        # Build top threats with specific context
        top_threats = []
        for threat in top_threats_llm:
            top_threats.append(f"{threat.get('threat', 'Unknown')} (Risk: {threat.get('riskScore', 0)}/100, Probability: {threat.get('incidentProbability', 0)}%)")

        # Ensure we have at least some threats from risk assessment if LLM didn't provide
        if not top_threats:
            top_threats = risk.get("topThreats", ["Manual review required"])

        # Build approvals structure
        approvals = {
            "requiredSignatures": approvals_llm.get("required", ["Site Supervisor"]),
            "competentPersonReview": approvals_llm.get("competentPersonReview", go_no_go.get("decision") != "GO"),
            "managementReview": approvals_llm.get("managementReview", go_no_go.get("decision") in ["NO_GO", "STOP_WORK"]),
            "escalationNote": approvals_llm.get("escalationNote", "")
        }

        # Weather analysis from LLM
        weather_analysis = {
            "currentConditions": {
                "temperature": weather_data.get("temperature", 70),
                "windSpeed": weather_data.get("windSpeed", 0),
                "conditions": weather_data.get("conditions", "Unknown")
            },
            "workSafe": weather_llm.get("workSafe", True),
            "concerns": weather_llm.get("concerns", []),
            "recommendations": weather_llm.get("recommendations", []),
            "riskMultipliers": self.fallback_agent.analyze_weather_impact(weather_data, hazards).get("riskMultipliers", {})
        }

        # Emergency readiness (use Python agent logic)
        emergency_readiness = self.fallback_agent.assess_emergency_response(
            checklist_data,
            hazards[0] if hazards else {}
        )

        # Compliance gaps (use Python agent logic enhanced with LLM context)
        compliance_gaps = self.fallback_agent.identify_compliance_gaps(validation, risk)

        # Build final report
        return {
            "metadata": {
                "reportId": f"JHA-{int(time.time())}-{uuid.uuid4().hex[:8]}",
                "generatedAt": datetime.now().isoformat(),
                "projectName": job_info.get("projectName", checklist_data.get("projectName", "Unknown")),
                "location": job_info.get("location", checklist_data.get("location", "Unknown")),
                "workType": job_info.get("workType", checklist_data.get("workType", "Unknown")),
                "supervisor": job_info.get("supervisor", checklist_data.get("supervisor", "Unknown")),
                "synthesizedBy": "Agent4-LLM-v1"
            },
            "executiveSummary": {
                "decision": go_no_go.get("decision"),
                "narrative": exec_summary_llm.get("narrative", "Analysis complete. See details below."),
                "keyInsight": exec_summary_llm.get("keyInsight", ""),
                "overallRiskLevel": risk.get("riskSummary", {}).get("overallRiskLevel", "UNKNOWN"),
                "topThreats": top_threats[:3],
                "criticalActions": [item["action"] for item in action_items if item.get("priority") == "CRITICAL"][:3],
                "incidentProbability": prediction.get("probability", 0),
                "contradictionsResolved": exec_summary_llm.get("contradictionsResolved", "")
            },
            "dataQuality": {
                "score": validation.get("qualityScore", 0),
                "rating": validation.get("dataQuality", "UNKNOWN"),
                "missingCritical": validation.get("missingCritical", []),
                "concerns": validation.get("concerns", {}),
                "note": llm_output.get("dataQualityNote", "")
            },
            "riskAssessment": {
                "hazards": hazards,
                "industryContext": risk.get("riskSummary", {}).get("industryContext", ""),
                "weatherImpact": risk.get("weatherImpact", ""),
                "topThreatsDetailed": top_threats_llm  # Full LLM threat analysis
            },
            "incidentPrediction": {
                "scenario": prediction.get("incidentName", ""),
                "probability": prediction.get("probability", 0),
                "timeframe": prediction.get("timeframe", "Next 4 hours"),
                "confidence": prediction.get("confidence", "UNKNOWN"),
                "causalChain": prediction.get("causalChain", []),
                "leadingIndicators": prediction.get("leadingIndicators", [])
            },
            "weatherAnalysis": weather_analysis,
            "complianceGaps": compliance_gaps,
            "emergencyReadiness": emergency_readiness,
            "actionItems": action_items,
            "recommendedInterventions": prediction.get("interventions", {}),
            "goNoGo": go_no_go,
            "approvals": approvals
        }
