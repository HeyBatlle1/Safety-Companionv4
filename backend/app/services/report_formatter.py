"""
REPORT FORMATTER SERVICE
Ports V1's formatStructuredJHAReport() from TypeScript to Python

Converts Agent 4's JSON output into comprehensive markdown reports.
Pure string templating - NO AI calls, completely deterministic.

V1 Reference: client/src/services/reportFormatter.ts (lines 392-619)
"""

from typing import Dict, Any, List
from datetime import datetime


class ReportFormatter:
    """
    Converts Agent 4's JSON output into comprehensive markdown reports.
    
    Ports V1's formatStructuredJHAReport() from TypeScript to Python.
    Pure string templating - NO AI calls, completely deterministic.
    
    Output: ~600-line professional markdown ready for email/PDF/display
    """
    
    @staticmethod
    def format_structured_jha_report(report: Dict[str, Any]) -> str:
        """
        Generate complete markdown report from Agent 4 output.
        
        Combines all 12 sections into professional document.
        Pure string templating - deterministic and reproducible.
        
        Args:
            report: Complete FinalJHAReport from Agent 4 synthesizer
            
        Returns:
            Professional markdown string with 12 comprehensive sections
        """
        formatter = ReportFormatter()
        
        sections = [
            formatter._generate_header(report),
            formatter._generate_executive_decision(report),
            formatter._generate_data_quality(report),
            formatter._generate_risk_assessment(report),
            formatter._generate_incident_prediction(report),
            formatter._generate_weather_impact(report),
            formatter._generate_compliance_gaps(report),
            formatter._generate_emergency_readiness(report),
            formatter._generate_action_items(report),
            formatter._generate_interventions(report),
            formatter._generate_approvals(report),
            formatter._generate_footer(report)
        ]
        
        return ''.join(sections)
    
    def _generate_header(self, report: Dict[str, Any]) -> str:
        """Generate report header with title, date, project info"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        metadata = report.get('metadata', {})
        project_name = metadata.get('projectName', 'Unnamed Project')
        location = metadata.get('location', 'Not specified')
        work_type = metadata.get('workType', 'Not specified')
        supervisor = metadata.get('supervisor', 'Not specified')
        report_id = metadata.get('reportId', 'N/A')
        
        return f"""# JOB HAZARD ANALYSIS - SAFETY REPORT

**Report ID:** {report_id}
**Generated:** {timestamp}
**Project:** {project_name}
**Location:** {location}
**Work Type:** {work_type}
**Supervisor:** {supervisor}

---

"""
    
    def _generate_executive_decision(self, report: Dict[str, Any]) -> str:
        """Generate GO/NO-GO decision with reasoning (V1 style)"""
        exec_summary = report.get('executiveSummary', {})
        go_no_go = report.get('goNoGo', {})
        
        decision = exec_summary.get('decision', go_no_go.get('decision', 'UNKNOWN'))
        
        # Decision emoji/badge (matching V1 exactly)
        decision_badges = {
            'GO': '✅ **GO** - Work may proceed',
            'GO_WITH_CONDITIONS': '⚠️ **GO WITH CONDITIONS** - Additional controls required',
            'NO_GO': '❌ **NO GO** - Work cannot proceed',
            'STOP_WORK': '🛑 **STOP WORK** - Immediate cessation required'
        }
        decision_badge = decision_badges.get(decision, '❓ **UNKNOWN** - Decision pending')
        
        risk_level = exec_summary.get('overallRiskLevel', 'UNKNOWN')
        probability = exec_summary.get('incidentProbability', 0)
        
        section = f"""## EXECUTIVE DECISION

{decision_badge}

**Overall Risk Level:** {risk_level}
**Incident Probability:** {probability}% in next 4 hours

"""
        
        # Decision reasons
        reasons = go_no_go.get('reasons', [])
        if reasons:
            section += "### Decision Rationale:\n"
            for reason in reasons:
                section += f"- {reason}\n"
            section += "\n"
        
        # Conditions (if GO_WITH_CONDITIONS)
        conditions = go_no_go.get('conditions', [])
        if conditions:
            section += "### Conditions Required Before Work:\n"
            for i, cond in enumerate(conditions, 1):
                section += f"{i}. {cond}\n"
            section += "\n"
        
        # Top threats
        threats = exec_summary.get('topThreats', [])
        if threats:
            section += "### Top Safety Threats:\n"
            for i, threat in enumerate(threats, 1):
                section += f"{i}. {threat}\n"
            section += "\n"
        
        # Critical actions
        critical = exec_summary.get('criticalActions', [])
        if critical:
            section += "### Critical Actions Required:\n"
            for i, action in enumerate(critical, 1):
                section += f"{i}. 🔴 {action}\n"
            section += "\n"
        
        return section + "---\n\n"
    
    def _generate_data_quality(self, report: Dict[str, Any]) -> str:
        """Generate validation and data quality section"""
        data_quality = report.get('dataQuality', {})
        
        quality = data_quality.get('rating', 'UNKNOWN')
        score = data_quality.get('score', 0)
        
        # Quality badge
        quality_badges = {
            'HIGH': '✅ HIGH - Comprehensive data provided',
            'MEDIUM': '⚠️ MEDIUM - Some gaps identified',
            'LOW': '❌ LOW - Significant information missing'
        }
        quality_badge = quality_badges.get(quality, f'❓ {quality}')
        
        section = f"""## DATA QUALITY ASSESSMENT

**Quality Level:** {quality_badge}
**Quality Score:** {score}/10

"""
        
        # Missing critical fields
        missing = data_quality.get('missingCritical', [])
        if missing:
            section += "### ⚠️ Missing Critical Information:\n"
            for field in missing:
                section += f"- {field}\n"
            section += "\n"
        
        # Concerns by severity
        concerns = data_quality.get('concerns', {})
        if isinstance(concerns, dict):
            for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                items = concerns.get(severity, [])
                if items:
                    emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🟢'}.get(severity, '⚪')
                    section += f"### {emoji} {severity} Concerns:\n"
                    for concern in items:
                        section += f"- {concern}\n"
                    section += "\n"
        elif isinstance(concerns, list):
            if concerns:
                section += "### Concerns:\n"
                for concern in concerns:
                    section += f"- {concern}\n"
                section += "\n"
        
        return section + "---\n\n"
    
    def _generate_risk_assessment(self, report: Dict[str, Any]) -> str:
        """Generate comprehensive hazard analysis"""
        risk_assessment = report.get('riskAssessment', {})
        hazards = risk_assessment.get('hazards', [])
        industry_context = risk_assessment.get('industryContext', '')
        weather_impact = risk_assessment.get('weatherImpact', '')
        
        section = """## RISK ASSESSMENT

"""
        
        if industry_context:
            section += f"**Industry Context:** {industry_context}\n\n"
        
        if weather_impact:
            section += f"**Weather Impact:** {weather_impact}\n\n"
        
        if not hazards:
            return section + "_No hazards identified._\n\n---\n\n"
        
        section += f"**Total Hazards Identified:** {len(hazards)}\n\n"
        
        for i, hazard in enumerate(hazards, 1):
            name = hazard.get('name', 'Unknown Hazard')
            category = hazard.get('category', 'Uncategorized')
            score = hazard.get('riskScore', 0)
            level = hazard.get('riskLevel', 'UNKNOWN')
            probability = hazard.get('probability', 0)
            consequence = hazard.get('consequence', 'Unknown')
            
            # Risk level color
            level_emoji = {
                'EXTREME': '🔴',
                'HIGH': '🟠',
                'MEDIUM': '🟡',
                'LOW': '🟢'
            }.get(level, '⚪')
            
            section += f"""### {i}. {name}

**Category:** {category}
**Risk Score:** {level_emoji} {score}/100 ({level})
**Probability:** {probability}% | **Consequence:** {consequence}

"""
            
            # Existing controls
            controls = hazard.get('existingControls', [])
            if controls:
                section += "**Existing Controls:**\n"
                for control in controls:
                    section += f"- ✓ {control}\n"
                section += "\n"
            
            # Inadequate controls (gaps)
            inadequate = hazard.get('inadequateControls', [])
            if inadequate:
                section += "**Inadequate Controls (Gaps):**\n"
                for gap in inadequate:
                    section += f"- ⚠️ {gap}\n"
                section += "\n"
            
            # Recommended controls
            recommended = hazard.get('recommendedControls', [])
            if recommended:
                section += "**Recommended Additional Controls:**\n"
                for rec in recommended:
                    section += f"- ✅ {rec}\n"
                section += "\n"
            
            # Regulatory requirement
            reg = hazard.get('regulatoryRequirement', '')
            if reg:
                section += f"**Regulatory Requirement:** {reg}\n\n"
        
        return section + "---\n\n"
    
    def _generate_incident_prediction(self, report: Dict[str, Any]) -> str:
        """Generate Swiss Cheese causal chain analysis"""
        prediction = report.get('incidentPrediction', {})
        
        incident_name = prediction.get('scenario', 'Unknown Incident')
        probability = prediction.get('probability', 0)
        confidence = prediction.get('confidence', 'UNKNOWN')
        timeframe = prediction.get('timeframe', 'Unknown')
        
        # Confidence color
        conf_emoji = {
            'HIGH': '🔴',
            'MEDIUM': '🟠',
            'LOW': '🟢'
        }.get(confidence, '⚪')
        
        section = f"""## INCIDENT PREDICTION ANALYSIS

**Predicted Incident:** {incident_name}
**Probability:** {probability}% in {timeframe}
**Confidence Level:** {conf_emoji} {confidence}

"""
        
        # Causal chain (Swiss Cheese Model)
        chain = prediction.get('causalChain', [])
        if chain:
            section += "### Swiss Cheese Causal Chain:\n\n"
            section += "_The sequence of events that could lead to an incident:_\n\n"
            for i, stage in enumerate(chain, 1):
                if isinstance(stage, dict):
                    stage_name = stage.get('stage', f'Stage {i}')
                    description = stage.get('description', 'No description')
                    section += f"**{i}. {stage_name}**\n   → {description}\n\n"
                else:
                    section += f"**{i}.** {stage}\n\n"
        
        # Leading indicators
        indicators = prediction.get('leadingIndicators', [])
        if indicators:
            section += "### 🚨 Leading Indicators (Warning Signs):\n"
            for indicator in indicators:
                section += f"- {indicator}\n"
            section += "\n"
        
        return section + "---\n\n"
    
    def _generate_weather_impact(self, report: Dict[str, Any]) -> str:
        """Generate weather conditions and alerts"""
        weather = report.get('weatherAnalysis', {})
        
        section = """## WEATHER IMPACT ANALYSIS

"""
        
        # Current conditions
        conditions = weather.get('currentConditions', {})
        temp = conditions.get('temperature', 'N/A')
        wind = conditions.get('windSpeed', 'N/A')
        weather_desc = conditions.get('conditions', 'Unknown')
        
        section += f"""**Current Conditions:** {weather_desc}
- 🌡️ Temperature: {temp}°F
- 💨 Wind Speed: {wind} mph

"""
        
        # Risk multipliers
        multipliers = weather.get('riskMultipliers', {})
        if multipliers:
            section += "### Weather Risk Factors:\n"
            for factor, value in multipliers.items():
                factor_name = factor.replace('_', ' ').title()
                section += f"- **{factor_name}:** {value}x risk multiplier\n"
            section += "\n"
        
        # Weather recommendations
        recs = weather.get('recommendations', [])
        if recs:
            section += "### Weather-Related Recommendations:\n"
            for rec in recs:
                section += f"- ⚠️ {rec}\n"
            section += "\n"
        
        return section + "---\n\n"
    
    def _generate_compliance_gaps(self, report: Dict[str, Any]) -> str:
        """Generate OSHA/regulatory compliance analysis"""
        gaps = report.get('complianceGaps', [])
        
        section = """## COMPLIANCE STATUS

"""
        
        if not gaps:
            return section + "✅ **No compliance gaps identified.**\n\n---\n\n"
        
        section += f"**⚠️ Total Gaps Found:** {len(gaps)}\n\n"
        
        # Group by severity
        by_severity = {'HIGH': [], 'MEDIUM': [], 'LOW': []}
        for gap in gaps:
            severity = gap.get('severity', 'MEDIUM')
            if severity in by_severity:
                by_severity[severity].append(gap)
            else:
                by_severity['MEDIUM'].append(gap)
        
        for severity in ['HIGH', 'MEDIUM', 'LOW']:
            items = by_severity[severity]
            if items:
                emoji = {'HIGH': '🔴', 'MEDIUM': '🟠', 'LOW': '🟡'}.get(severity, '⚪')
                section += f"### {emoji} {severity} Severity Gaps\n\n"
                
                for gap in items:
                    gap_desc = gap.get('gap', 'Unknown gap')
                    source = gap.get('source', 'Unknown source')
                    citation = gap.get('citation', 'OSHA 1926')
                    
                    section += f"""**Gap:** {gap_desc}
- **Source:** {source}
- **Citation:** {citation}

"""
        
        return section + "---\n\n"
    
    def _generate_emergency_readiness(self, report: Dict[str, Any]) -> str:
        """Generate emergency response capability assessment"""
        emergency = report.get('emergencyReadiness', {})
        
        rescue = emergency.get('rescueCapability', 'UNKNOWN')
        first_aid = emergency.get('firstAidPresent', False)
        contacts = emergency.get('emergencyContactsPresent', False)
        evacuation = emergency.get('evacuationPlanPresent', False)
        readiness = emergency.get('readinessLevel', 'UNKNOWN')
        
        # Readiness badge
        readiness_badges = {
            'FULL': '✅ FULL - All emergency systems in place',
            'PARTIAL': '⚠️ PARTIAL - Some gaps identified',
            'INSUFFICIENT': '❌ INSUFFICIENT - Critical gaps exist'
        }
        readiness_badge = readiness_badges.get(readiness, f'❓ {readiness}')
        
        section = f"""## EMERGENCY RESPONSE READINESS

**Overall Readiness:** {readiness_badge}

| Component | Status |
|-----------|--------|
| Rescue Capability | {rescue} |
| First Aid Available | {'✅ Yes' if first_aid else '❌ No'} |
| Emergency Contacts | {'✅ Documented' if contacts else '❌ Missing'} |
| Evacuation Plan | {'✅ Present' if evacuation else '❌ Missing'} |

"""
        
        # Gaps
        gaps = emergency.get('gaps', [])
        if gaps:
            section += "### ⚠️ Emergency Response Gaps:\n"
            for gap in gaps:
                section += f"- ❌ {gap}\n"
            section += "\n"
        
        # Recommendations
        recs = emergency.get('recommendations', [])
        if recs:
            section += "### Recommendations:\n"
            for rec in recs:
                section += f"- ✅ {rec}\n"
            section += "\n"
        
        return section + "---\n\n"
    
    def _generate_action_items(self, report: Dict[str, Any]) -> str:
        """Generate prioritized action items"""
        actions = report.get('actionItems', [])
        
        section = """## ACTION ITEMS

"""
        
        if not actions:
            return section + "_No action items required._\n\n---\n\n"
        
        section += f"**Total Actions:** {len(actions)}\n\n"
        
        # Group by priority
        by_priority: Dict[str, List] = {'CRITICAL': [], 'HIGH': [], 'MEDIUM': [], 'LOW': []}
        for action in actions:
            priority = action.get('priority', 'MEDIUM')
            if priority in by_priority:
                by_priority[priority].append(action)
            else:
                by_priority['MEDIUM'].append(action)
        
        # Output in priority order
        for priority in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            items = by_priority[priority]
            if items:
                emoji = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '🟢'}.get(priority, '⚪')
                section += f"### {emoji} {priority} Priority ({len(items)} items)\n\n"
                
                for i, action in enumerate(items, 1):
                    action_text = action.get('action', 'No description')
                    timeframe = action.get('timeframe', 'Not specified')
                    reason = action.get('reason', '')
                    
                    section += f"""**{i}. {action_text}**
- ⏰ **Timeframe:** {timeframe}
"""
                    if reason:
                        section += f"- 📝 **Reason:** {reason}\n"
                    section += "\n"
        
        return section + "---\n\n"
    
    def _generate_interventions(self, report: Dict[str, Any]) -> str:
        """Generate intervention recommendations from Swiss Cheese analysis"""
        interventions = report.get('recommendedInterventions', {})
        
        section = """## RECOMMENDED INTERVENTIONS

"""
        
        if not interventions:
            return section + "_No specific interventions recommended at this time._\n\n---\n\n"
        
        # Preventive interventions
        preventive = interventions.get('preventive', [])
        if preventive:
            section += "### 🛡️ Preventive Interventions:\n\n"
            for i, intervention in enumerate(preventive, 1):
                if isinstance(intervention, dict):
                    action = intervention.get('action', 'Unknown action')
                    tier = intervention.get('tier', '')
                    time_to_implement = intervention.get('timeToImplement', '')
                    section += f"{i}. **{action}**\n"
                    if tier:
                        section += f"   - Hierarchy Tier: {tier}\n"
                    if time_to_implement:
                        section += f"   - Implementation Time: {time_to_implement}\n"
                else:
                    section += f"{i}. {intervention}\n"
            section += "\n"
        
        # Mitigative interventions
        mitigative = interventions.get('mitigative', [])
        if mitigative:
            section += "### 🔧 Mitigative Interventions:\n\n"
            for i, intervention in enumerate(mitigative, 1):
                if isinstance(intervention, dict):
                    action = intervention.get('action', 'Unknown action')
                    section += f"{i}. {action}\n"
                else:
                    section += f"{i}. {intervention}\n"
            section += "\n"
        
        # Recommended action
        recommended = interventions.get('recommended', '')
        if recommended:
            section += f"### 📋 Primary Recommendation:\n{recommended}\n\n"
        
        return section + "---\n\n"
    
    def _generate_approvals(self, report: Dict[str, Any]) -> str:
        """Generate required approval signatures"""
        approvals = report.get('approvals', {})
        
        section = """## REQUIRED APPROVALS

"""
        
        signatures = approvals.get('requiredSignatures', [])
        competent_review = approvals.get('competentPersonReview', False)
        mgmt_review = approvals.get('managementReview', False)
        
        if not signatures:
            section += "**No approvals required for GO decision.**\n\n"
            return section + "---\n\n"
        
        section += "_The following signatures are required before work can proceed:_\n\n"
        
        section += "| Role | Signature | Date |\n"
        section += "|------|-----------|------|\n"
        
        for sig in signatures:
            section += f"| {sig} | _________________ | ________ |\n"
        
        section += "\n"
        
        if competent_review:
            section += "☑️ **Competent Person Review Required**\n"
        
        if mgmt_review:
            section += "☑️ **Management Review Required**\n"
        
        section += "\n"
        
        return section + "---\n\n"
    
    def _generate_footer(self, report: Dict[str, Any]) -> str:
        """Generate report metadata and generation details"""
        metadata = report.get('metadata', {})
        
        report_id = metadata.get('reportId', 'Unknown')
        generated_at = metadata.get('generatedAt', datetime.now().isoformat())
        
        section = f"""## REPORT DETAILS

| Field | Value |
|-------|-------|
| Report ID | {report_id} |
| Generated At | {generated_at} |
| Generated By | Safety Companion V3 Multi-Agent System |
| Agents | Agent 1 (Validator), Agent 2 (Risk Assessor), Agent 3 (Predictor), Agent 4 (Synthesizer) |

---

### Legal Disclaimer

*This report was generated by an AI-powered safety analysis system. While comprehensive and based on industry standards including OSHA regulations, it should be reviewed by qualified safety professionals before implementation. This analysis does not replace the judgment of competent safety personnel.*

*All personnel must sign off on this JHA before work commences.*

---

**END OF REPORT**
"""
        
        return section
