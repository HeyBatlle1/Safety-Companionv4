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
        EXACT V1 LOGIC (from lines 1359-1407):
        
        Decision tree:
        1. If dataQuality == 'LOW' → NO_GO
        2. If windSpeed > 20 mph (OSHA crane limit) → STOP_WORK
        3. If temperature < 32°F or > 95°F → Add condition
        4. If topHazard.riskScore > 85 AND riskLevel == EXTREME → STOP_WORK
        5. If prediction.confidence == HIGH AND probability > 70 → STOP_WORK
        6. If missingCritical.length > 5 → NO_GO
        7. If topHazard.riskScore > 70 AND inadequateControls → Add conditions
        8. If topHazard.riskScore >= 75 → GO_WITH_CONDITIONS (HIGH)
        9. Otherwise → GO
        """
        # Get top hazard
        hazards = risk.get("hazards", [])
        top_hazard = hazards[0] if hazards else {"riskScore": 0}
        
        conditions = []
        
        # 1. DATA QUALITY: LOW = NO_GO
        if validation.get("dataQuality") == "LOW":
            return {
                "decision": "NO_GO",
                "reasons": [f"Insufficient data quality (score: {validation.get('qualityScore', 0)}/10)"],
                "conditions": []
            }
        
        # 2. WEATHER: Wind > 20 mph (OSHA crane limit)
        wind_speed = weather_data.get("windSpeed", 0)
        if wind_speed > 20:
            return {
                "decision": "STOP_WORK",
                "reasons": [f"Wind speed {wind_speed} mph exceeds OSHA safe limit (20 mph for crane operations)"],
                "conditions": []
            }
        
        # 3. WEATHER: Temperature extremes
        temperature = weather_data.get("temperature", 70)
        if temperature < 32:
            conditions.append(f"Implement cold stress prevention plan (temp: {temperature}°F)")
        elif temperature > 95:
            conditions.append(f"Implement heat stress prevention plan (temp: {temperature}°F)")
        
        # 4. RISK: Extreme risk score + level (V1 lines 1381-1386)
        risk_score = top_hazard.get("riskScore", 0)
        risk_level = top_hazard.get("riskLevel", "")
        if risk_score > 85 and risk_level == "EXTREME":
            return {
                "decision": "STOP_WORK",
                "reasons": [f"EXTREME risk detected: {top_hazard.get('name', 'Unknown hazard')} ({risk_score}/100)"],
                "conditions": []
            }
        
        # 5. PREDICTION: High confidence incident (V1 lines 1389-1393)
        pred_confidence = prediction.get("confidence", "")
        pred_probability = prediction.get("probability", 0)
        pred_name = prediction.get("incidentName", "incident")
        pred_timeframe = prediction.get("timeframe", "next 4 hours")
        
        if pred_confidence == "HIGH" and pred_probability > 70:
            return {
                "decision": "STOP_WORK",
                "reasons": [f"High-confidence prediction ({pred_probability}%) of {pred_name} in {pred_timeframe}"],
                "conditions": []
            }
        
        # 6. Too many missing fields
        missing_critical = validation.get("missingCritical", [])
        if len(missing_critical) > 5:
            return {
                "decision": "NO_GO",
                "reasons": ["Too many critical fields missing (>5)"],
                "conditions": []
            }
        
        # 7. CONTROLS: Inadequate controls for high-risk work (V1 lines 1396-1400)
        inadequate_controls = top_hazard.get("inadequateControls", [])
        if risk_score > 70 and len(inadequate_controls) > 0:
            for control in inadequate_controls[:2]:  # Top 2
                conditions.append(f"Address control gap: {control}")
        
        # 8. HIGH risk = go with conditions
        if risk_score >= 75:
            conditions.append("Additional controls must be implemented before proceeding")
            recommended_controls = top_hazard.get("recommendedControls", [])[:3]
            conditions.extend(recommended_controls)
            
            return {
                "decision": "GO_WITH_CONDITIONS",
                "reasons": ["HIGH risk (75-94) requires enhanced controls"],
                "conditions": conditions
            }
        
        # 9. If we have conditions from temperature, return GO_WITH_CONDITIONS
        if len(conditions) > 0:
            return {
                "decision": "GO_WITH_CONDITIONS",
                "reasons": ["Weather conditions require additional precautions"],
                "conditions": conditions
            }
        
        # 10. Otherwise GO
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
        
        Enhanced to search nested checklist sections like V1 (lines 1449-1499).
        """
        gaps = []
        recommendations = []
        
        # Helper: Search all checklist fields for keyword
        def has_keyword_in_checklist(keyword: str) -> bool:
            """Search all sections/responses for keyword"""
            keyword_lower = keyword.lower()
            
            # Check top-level fields
            for key, value in checklist_data.items():
                if isinstance(value, str) and keyword_lower in value.lower():
                    return True
            
            # Check nested job_info
            job_info = checklist_data.get("jobInfo", {})
            for value in job_info.values():
                if isinstance(value, str) and keyword_lower in value.lower():
                    return True
            
            # Check hazards array
            for hazard in checklist_data.get("hazards", []):
                for value in hazard.values():
                    if isinstance(value, str) and keyword_lower in value.lower():
                        return True
            
            # Check control measures
            controls = checklist_data.get("controlMeasures", {})
            for key, value in controls.items():
                if isinstance(value, str) and keyword_lower in value.lower():
                    return True
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, str) and keyword_lower in item.lower():
                            return True
            
            return False
        
        # Check for rescue plan
        has_rescue = has_keyword_in_checklist("rescue")
        
        # Check for first aid
        has_first_aid = has_keyword_in_checklist("first aid")
        
        # Check for emergency contacts
        has_emergency_contact = has_keyword_in_checklist("emergency contact") or \
                                has_keyword_in_checklist("911")
        
        # Check for evacuation
        has_evacuation = has_keyword_in_checklist("evacuation") or \
                         has_keyword_in_checklist("assembly point")
        
        # Assess rescue capability for fall/confined space hazards
        hazard_name = top_hazard.get("name", "").lower()
        rescue_capability = "NOT_REQUIRED"
        
        if "fall" in hazard_name or "confined space" in hazard_name:
            rescue_capability = "ADEQUATE" if has_rescue else "INADEQUATE"
            if not has_rescue:
                gaps.append("No documented fall/confined space rescue plan (OSHA 1926.502(d)(20) requires 6-minute rescue capability)")
                recommendations.append("Develop and document rescue plan with equipment and trained personnel")
        
        # First aid
        if not has_first_aid:
            gaps.append("First aid kit location and trained personnel not documented")
            recommendations.append("Document first aid kit location, contents, and trained personnel names")
        
        # Emergency contacts
        if not has_emergency_contact:
            gaps.append("Emergency contact information not documented (911, hospital, site emergency coordinator)")
            recommendations.append("List all emergency contacts with phone numbers and roles")
        
        # Evacuation
        if not has_evacuation:
            gaps.append("Evacuation routes and assembly points not documented")
            recommendations.append("Map evacuation routes and designate assembly location")
        
        return {
            "rescueCapability": rescue_capability,
            "firstAidPresent": has_first_aid,
            "emergencyContactsPresent": has_emergency_contact,
            "evacuationPlanPresent": has_evacuation,
            "gaps": gaps,
            "recommendations": recommendations,
            "readinessLevel": "FULL" if len(gaps) == 0 else ("PARTIAL" if len(gaps) <= 2 else "INSUFFICIENT")
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
    
    def determine_required_approvals(
        self,
        go_no_go: Dict[str, Any],
        risk: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Determine required approval signatures based on decision and risk.
        
        V1 Logic (Lines 1622-1641):
        - GO: Site Supervisor only
        - GO_WITH_CONDITIONS: + Competent Person
        - NO_GO/STOP_WORK: + Safety Manager + Project Manager
        - EXTREME/HIGH risk: + Safety Manager
        """
        approvals = {"Site Supervisor"}  # Always required
        
        decision = go_no_go.get("decision", "GO")
        
        # GO_WITH_CONDITIONS: Add Competent Person
        if decision == "GO_WITH_CONDITIONS":
            approvals.add("Competent Person")
        
        # NO_GO or STOP_WORK: Escalate to full management chain
        if decision in ["NO_GO", "STOP_WORK"]:
            approvals.update(["Competent Person", "Safety Manager", "Project Manager"])
        
        # EXTREME/HIGH risk: Add Safety Manager
        overall_risk = risk.get("riskSummary", {}).get("overallRiskLevel", "")
        if overall_risk in ["EXTREME", "HIGH"]:
            approvals.add("Safety Manager")
        
        return {
            "requiredSignatures": sorted(list(approvals)),  # Remove duplicates, sort
            "competentPersonReview": decision != "GO",
            "managementReview": decision in ["NO_GO", "STOP_WORK"]
        }
    
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
                "criticalActions": [item["action"] for item in action_items if item.get("priority") == "CRITICAL"],
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
            "goNoGo": go_no_go,
            "approvals": self.determine_required_approvals(go_no_go, risk)
        }
