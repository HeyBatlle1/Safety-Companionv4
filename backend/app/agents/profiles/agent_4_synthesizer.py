"""
AGENT 4: REPORT SYNTHESIZER
V1 Faithful Port - Exact logic from V1_AGENT_PROMPTS_AND_LOGIC.md lines 636-755

Purpose: Generates structured JHA report with GO/NO-GO decisions,
         compliance gaps, and prioritized action items.

Type: **PURE PYTHON (NO LLM)**
CRITICAL: This agent is NOT an LLM-based agent.
"""

import time
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional


class Agent4Synthesizer:
    """
    Report Synthesizer - DETERMINISTIC (NO LLM)
    
    Takes outputs from Agents 1-3 and structures them into a final report
    using pure Python business logic.
    """
    
    def __init__(self):
        """No Gemini client needed - pure Python"""
        pass
    
    def determine_go_no_go(
        self,
        validation: Dict[str, Any],
        risk: Dict[str, Any],
        prediction: Dict[str, Any],
        weather_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        EXACT V1 LOGIC (from lines 711-755):
        
        Decision tree:
        1. If dataQuality == 'LOW' → NO_GO
        2. If windSpeed > 30 mph → STOP_WORK
        3. If topHazard.riskScore >= 95 → STOP_WORK (EXTREME)
        4. If topHazard.riskScore >= 75 → GO_WITH_CONDITIONS (HIGH)
        5. If missingCritical.length > 5 → NO_GO
        6. Otherwise → GO
        """
        # Get top hazard
        hazards = risk.get("hazards", [])
        top_hazard = hazards[0] if hazards else {"riskScore": 0}
        
        stop_work_reasons = []
        conditions = []
        
        # Data quality check
        if validation.get("dataQuality") == "LOW":
            return {
                "decision": "NO_GO",
                "reasons": ["Insufficient data quality for safe operations"],
                "conditions": []
            }
        
        # Weather check
        wind_speed = weather_data.get("windSpeed", 0)
        if wind_speed > 30:
            return {
                "decision": "STOP_WORK",
                "reasons": [f"Wind speed {wind_speed} mph exceeds safe limit (30 mph)"],
                "conditions": []
            }
        
        # EXTREME risk = immediate stop
        risk_score = top_hazard.get("riskScore", 0)
        if risk_score >= 95:
            return {
                "decision": "STOP_WORK",
                "reasons": ["EXTREME risk level (95+) requires immediate stop-work"],
                "conditions": []
            }
        
        # HIGH risk = go with conditions
        if risk_score >= 75:
            conditions.append("Additional controls must be implemented before proceeding")
            recommended_controls = top_hazard.get("recommendedControls", [])[:3]
            conditions.extend(recommended_controls)
            
            return {
                "decision": "GO_WITH_CONDITIONS",
                "reasons": ["HIGH risk (75-94) requires enhanced controls"],
                "conditions": conditions
            }
        
        # Too many missing fields
        missing_critical = validation.get("missingCritical", [])
        if len(missing_critical) > 5:
            return {
                "decision": "NO_GO",
                "reasons": ["Too many critical fields missing (>5)"],
                "conditions": []
            }
        
        # Otherwise GO
        return {
            "decision": "GO",
            "reasons": ["Risk levels acceptable with current controls"],
            "conditions": []
        }
    
    def identify_compliance_gaps(
        self,
        validation: Dict[str, Any],
        risk: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Identify OSHA compliance gaps from validation and risk data.
        
        Combines:
        - validation['missingCritical']
        - validation['tradeSpecificGaps']
        - risk['hazards'][*]['inadequateControls']
        """
        gaps = []
        seen = set()
        
        # From validation - missing critical
        for field in validation.get("missingCritical", []):
            if field not in seen:
                gaps.append({
                    "gap": field,
                    "source": "Missing Critical Field",
                    "severity": "HIGH",
                    "citation": "OSHA 1926 General Requirements"
                })
                seen.add(field)
        
        # From validation - trade-specific gaps
        for gap in validation.get("tradeSpecificGaps", []):
            if gap not in seen:
                gaps.append({
                    "gap": gap,
                    "source": "Trade-Specific Requirement",
                    "severity": "MEDIUM",
                    "citation": "OSHA 1926 Subpart"
                })
                seen.add(gap)
        
        # From risk - inadequate controls
        for hazard in risk.get("hazards", []):
            for control in hazard.get("inadequateControls", []):
                if control not in seen:
                    gaps.append({
                        "gap": control,
                        "source": f"Hazard: {hazard.get('name', 'Unknown')}",
                        "severity": "HIGH" if hazard.get("riskScore", 0) >= 75 else "MEDIUM",
                        "citation": hazard.get("regulatoryRequirement", "OSHA 1926")
                    })
                    seen.add(control)
        
        return gaps
    
    def assess_emergency_response(
        self,
        checklist_data: Dict[str, Any],
        top_hazard: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Assess emergency response readiness.
        
        Checks for:
        - Emergency evacuation plan present
        - Assembly point identified
        - First aid kit location
        - Emergency contacts
        - Rescue plan for top hazard
        """
        gaps = []
        recommendations = []
        
        # Check for emergency plan
        emergency_plan = checklist_data.get("emergencyPlan", "")
        if not emergency_plan or emergency_plan.lower() in ["n/a", "none", ""]:
            gaps.append("No emergency evacuation plan documented")
            recommendations.append("Document emergency evacuation routes and procedures")
        
        # Check for assembly point
        assembly = checklist_data.get("assemblyPoint", "")
        if not assembly:
            gaps.append("No assembly point identified")
            recommendations.append("Designate emergency assembly location")
        
        # Check for first aid
        first_aid = checklist_data.get("firstAidKit", "")
        if not first_aid:
            gaps.append("First aid kit location not documented")
            recommendations.append("Document first aid kit location and contents")
        
        # Check for emergency contacts
        contacts = checklist_data.get("emergencyContacts", "")
        if not contacts:
            gaps.append("Emergency contacts not listed")
            recommendations.append("Post emergency contact numbers at work site")
        
        # Check for rescue plan (especially for fall hazards)
        if top_hazard.get("category") == "Falls":
            rescue = checklist_data.get("rescuePlan", "")
            if not rescue:
                gaps.append("No rescue plan for fall protection")
                recommendations.append("Develop rescue plan for prompt retrieval of fallen workers")
        
        # Determine readiness level
        if len(gaps) == 0:
            readiness = "ADEQUATE"
        elif len(gaps) <= 2:
            readiness = "PARTIAL"
        else:
            readiness = "INADEQUATE"
        
        return {
            "readinessLevel": readiness,
            "gaps": gaps,
            "recommendations": recommendations
        }
    
    def analyze_weather_impact(
        self,
        weather_data: Dict[str, Any],
        hazards: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze how weather affects each hazard.
        """
        recommendations = []
        risk_multipliers = {}
        
        temp = weather_data.get("temperature", 70)
        wind = weather_data.get("windSpeed", 0)
        conditions = weather_data.get("conditions", "").lower()
        
        # Temperature effects
        if temp < 32:
            risk_multipliers["cold_stress"] = 1.4
            recommendations.append("Cold stress precautions required - frequent warm-up breaks")
        elif temp > 95:
            risk_multipliers["heat_stress"] = 1.4
            recommendations.append("Heat stress precautions required - hydration and rest breaks")
        
        # Wind effects
        if wind > 25:
            risk_multipliers["high_wind"] = 1.8
            recommendations.append(f"High wind ({wind} mph) - suspend crane/lifting operations")
        elif wind > 15:
            risk_multipliers["moderate_wind"] = 1.3
            recommendations.append("Moderate wind - monitor conditions for lifting activities")
        
        # Precipitation effects
        if "rain" in conditions or "snow" in conditions:
            risk_multipliers["precipitation"] = 1.6
            recommendations.append("Wet conditions - enhanced slip/fall precautions required")
        
        return {
            "currentConditions": {
                "temperature": temp,
                "windSpeed": wind,
                "conditions": weather_data.get("conditions", "Unknown")
            },
            "riskMultipliers": risk_multipliers,
            "recommendations": recommendations
        }
    
    def generate_action_items(
        self,
        go_no_go: Dict[str, Any],
        compliance_gaps: List[Dict[str, Any]],
        emergency_readiness: Dict[str, Any],
        interventions: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate prioritized action items.
        
        Priority order:
        1. STOP_WORK reasons (if applicable)
        2. GO_WITH_CONDITIONS requirements
        3. Compliance gaps (CRITICAL first)
        4. Emergency response gaps
        5. Recommended interventions (Preventive Tier 1-2)
        """
        items = []
        
        # 1. STOP_WORK reasons
        if go_no_go.get("decision") == "STOP_WORK":
            for reason in go_no_go.get("reasons", []):
                items.append({
                    "priority": "CRITICAL",
                    "action": f"Address: {reason}",
                    "reason": "Stop work condition",
                    "timeframe": "Immediate"
                })
        
        # 2. GO_WITH_CONDITIONS conditions
        for condition in go_no_go.get("conditions", []):
            items.append({
                "priority": "CRITICAL",
                "action": condition,
                "reason": "Required for work authorization",
                "timeframe": "Immediate"
            })
        
        # 3. Compliance gaps
        for gap in compliance_gaps:
            priority = "CRITICAL" if gap.get("severity") == "HIGH" else "HIGH"
            items.append({
                "priority": priority,
                "action": f"Address compliance gap: {gap.get('gap')}",
                "reason": f"{gap.get('source')} - {gap.get('citation')}",
                "timeframe": "Hours" if priority == "CRITICAL" else "Days"
            })
        
        # 4. Emergency response gaps
        for gap in emergency_readiness.get("gaps", []):
            items.append({
                "priority": "HIGH",
                "action": f"Address: {gap}",
                "reason": "Emergency response readiness",
                "timeframe": "Hours"
            })
        
        # 5. Preventive interventions (Tier 1-2: Elimination, Engineering)
        preventive = interventions.get("preventive", [])
        for intervention in preventive:
            tier = intervention.get("tier", "")
            if tier in ["Elimination", "Engineering"]:
                items.append({
                    "priority": "HIGH",
                    "action": intervention.get("action", ""),
                    "reason": f"Risk reduction intervention - {tier}",
                    "timeframe": intervention.get("timeToImplement", "Days")
                })
        
        # Sort by priority
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        items.sort(key=lambda x: priority_order.get(x.get("priority", "LOW"), 3))
        
        return items
    
    async def synthesize_report(
        self,
        validation: Dict[str, Any],
        risk: Dict[str, Any],
        prediction: Dict[str, Any],
        weather_data: Dict[str, Any],
        checklist_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build final structured JHA report.
        
        STRUCTURE (from V1 lines 664-705):
        
        NO LLM CALLS - Pure Python logic
        """
        
        # Get top hazard
        hazards = risk.get("hazards", [])
        top_hazard = hazards[0] if hazards else {}
        
        # 1. GO/NO-GO decision
        go_no_go = self.determine_go_no_go(validation, risk, prediction, weather_data)
        
        # 2. Compliance gaps
        compliance_gaps = self.identify_compliance_gaps(validation, risk)
        
        # 3. Emergency readiness
        emergency_readiness = self.assess_emergency_response(checklist_data, top_hazard)
        
        # 4. Weather analysis
        weather_analysis = self.analyze_weather_impact(weather_data, hazards)
        
        # 5. Action items
        interventions = prediction.get("interventions", {})
        action_items = self.generate_action_items(
            go_no_go,
            compliance_gaps,
            emergency_readiness,
            interventions
        )
        
        # Extract metadata from checklist
        job_info = checklist_data.get("jobInfo", {})
        
        # 6. Build report
        return {
            "metadata": {
                "reportId": f"JHA-{int(time.time())}-{uuid.uuid4().hex[:8]}",
                "generatedAt": datetime.now().isoformat(),
                "projectName": job_info.get("projectName", checklist_data.get("projectName", "Unknown")),
                "location": job_info.get("location", checklist_data.get("location", "Unknown")),
                "workType": job_info.get("workType", checklist_data.get("workType", "Unknown")),
                "supervisor": job_info.get("supervisor", checklist_data.get("supervisor", "Unknown"))
            },
            "executiveSummary": {
                "decision": go_no_go.get("decision"),
                "overallRiskLevel": risk.get("riskSummary", {}).get("overallRiskLevel", "UNKNOWN"),
                "topThreats": risk.get("topThreats", []),
                "criticalActions": [item["action"] for item in action_items[:3]],
                "incidentProbability": prediction.get("probability", 0)
            },
            "dataQuality": {
                "score": validation.get("qualityScore", 0),
                "rating": validation.get("dataQuality", "UNKNOWN"),
                "missingCritical": validation.get("missingCritical", []),
                "concerns": validation.get("concerns", {})
            },
            "riskAssessment": {
                "hazards": hazards,
                "industryContext": risk.get("riskSummary", {}).get("industryContext", ""),
                "weatherImpact": risk.get("weatherImpact", "")
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
            "goNoGo": go_no_go
        }
