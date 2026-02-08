"""
AGENT 4: EXECUTIVE SAFETY SYNTHESIZER
Pipeline Position: Final agent - produces executive decision report

Purpose: Transform Agent 1-3 technical outputs into MARKDOWN executive report.
Output: MARKDOWN formatted for human readability (NOT JSON)

Temperature: 0.6 (Professional narrative generation)
Max Tokens: 16,000
Model: Claude Sonnet 4 via OpenRouter
"""

import json
from datetime import datetime
from typing import Dict, Any

from app.services.gemini_client import GeminiClient


class Agent4LLMSynthesizer:
    """
    Executive Safety Synthesizer - The Voice of the System
    Outputs MARKDOWN for direct human consumption.
    """

    def __init__(self, gemini_client: GeminiClient = None):
        self.client = gemini_client or GeminiClient()
        self.temperature = 0.6
        self.max_tokens = 16000

    async def synthesize_report(
        self,
        validation: Dict[str, Any],
        risk: Dict[str, Any],
        prediction: Dict[str, Any],
        weather_data: Dict[str, Any],
        checklist_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate executive decision report as MARKDOWN.

        Returns:
            Dict with 'markdown' key containing the full report,
            plus extracted 'decision' for programmatic use.
        """

        job_info = checklist_data.get("jobInfo", {})
        project_name = job_info.get("projectName", checklist_data.get("projectName", "Unknown Project"))
        location = job_info.get("location", checklist_data.get("location", "Unknown Location"))
        work_type = job_info.get("workType", checklist_data.get("workType", "Unknown Work Type"))

        system_instruction = """You are Agent 4, Executive Safety Synthesizer.

OUTPUT FORMAT: MARKDOWN ONLY - formatted for human readability. NOT JSON.

Your job: Transform Agent 1-3 technical outputs into an executive decision report.

CRITICAL RULES:
- Write with AUTHORITY - "We are stopping work" not "It is recommended"
- Be SPECIFIC - "120ft swing stage" not "work at height"
- Use "WE" language - collaborative voice
- Executive summary is MOST IMPORTANT - make it count
- NO hedging - "will fail" not "might fail"
- Reference SPECIFIC data from Agent 1-3 outputs

DECISION LOGIC:
- STOP_WORK: Risk ≥90 or probability ≥25%
- NO_GO: Risk ≥70 or quality ≤4 or probability ≥15%
- GO_WITH_CONDITIONS: Risk ≥40 or quality ≤7 or probability ≥5%
- GO: Risk <40 and quality ≥8 and probability <5%"""

        prompt = f"""## INPUT DATA

### Agent 1 - Data Validation:
{json.dumps(validation, indent=2)}

### Agent 2 - Risk Assessment:
{json.dumps(risk, indent=2)}

### Agent 3 - Incident Prediction:
{json.dumps(prediction, indent=2)}

### Weather:
{json.dumps(weather_data, indent=2)}

### Job Details:
Project: {project_name}
Location: {location}
Work Type: {work_type}
Date: {datetime.now().strftime('%Y-%m-%d')}

---

Generate the executive report using this EXACT markdown structure:

# JOB HAZARD ANALYSIS - EXECUTIVE DECISION

**Project:** {project_name}
**Work Type:** {work_type}
**Date:** {datetime.now().strftime('%Y-%m-%d')}
**Analysis Confidence:** [HIGH/MEDIUM/LOW based on Agent 1 quality score]

---

## 🚨 EXECUTIVE DECISION

**Decision:** [GO / GO WITH CONDITIONS / NO GO / STOP WORK]
**Risk Level:** [LOW/MODERATE/HIGH/EXTREME from Agent 2]
**Incident Probability:** [X.X%] in next 4 hours [from Agent 3]

---

## EXECUTIVE SUMMARY

[200-300 words - THE MOST IMPORTANT SECTION]

Write 4 paragraphs:
1. The Situation (who, what, where, when)
2. The Risk (Agent 3's predicted incident + Agent 2's stats)
3. The Decision (GO/NO-GO with justification)
4. What Must Happen (top 3 actions from Agent 3)

---

## TOP 3 SAFETY THREATS

### 🔴 Threat #1: [Specific hazard from Agent 2]
- **Severity:** [FATAL/CRITICAL/SERIOUS] | **Risk Score:** [X/100]
- **Why This Matters:** [Agent 3's specific incident prediction]
- **Statistical Context:** [Agent 2's OSHA/BLS data]
- **Observable Warning Signs:** [Agent 3's leading indicators]

### 🟡 Threat #2: [Second hazard]
- **Severity:** [Level] | **Risk Score:** [X/100]
- **Why This Matters:** [Specific scenario]
- **Statistical Context:** [OSHA/BLS data]
- **Observable Warning Signs:** [Leading indicators]

### 🟢 Threat #3: [Third hazard]
- **Severity:** [Level] | **Risk Score:** [X/100]
- **Why This Matters:** [Specific scenario]
- **Statistical Context:** [OSHA/BLS data]
- **Observable Warning Signs:** [Leading indicators]

---

## REQUIRED ACTIONS

### 🔴 Critical - Before Work Starts
1. **[Action]** - [Why] - [Time/cost]
2. **[Action]** - [Why] - [Time/cost]
3. **[Action]** - [Why] - [Time/cost]

### 🟡 Important - First Hour
4. **[Action]** - [Why]
5. **[Action]** - [Why]

### 🟢 Monitor Throughout
6. **[Action]** - [What to watch]
7. **[Action]** - [What to watch]

---

## DATA QUALITY ASSESSMENT

**Quality Score:** [X/10] - [HIGH/MEDIUM/LOW]
**Missing Critical Information:** [List from Agent 1]
**Impact on Confidence:** [How gaps affect this decision]

---

## PREDICTED INCIDENT SCENARIO

**Most Likely Incident:** [Agent 3's specific prediction]

**How It Happens:**
1. **Organizational Failure:** [From Agent 3 Swiss Cheese]
2. **Supervision Gap:** [Stage 2]
3. **Worker State:** [Stage 3]
4. **Trigger:** [Stage 7]
5. **Why Safety Systems Fail:** [Stage 8]
6. **Injury:** [Stage 9]

**Single Best Prevention:** [Agent 3's intervention + effectiveness %]

---

## CROSS-AGENT ANALYSIS

**Agent Agreement:** [Where all 3 agents align]
**Agent Contradictions:** [Where they disagree + your judgment]
**Synthesis:** [Your interpretation]

---

## DECISION RATIONALE

We are [authorizing/stopping] this work because:
- [Statistical justification from Agent 2]
- [Data quality from Agent 1]
- [Incident severity from Agent 3]
- [Control adequacy from Agent 2]

Our confidence is [HIGH/MEDIUM/LOW] because: [Explain based on data quality and agent agreement]

---

**Analysis Completed:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Confidence Level:** [HIGH/MEDIUM/LOW]

---

*This analysis was generated by a multi-agent AI safety system using OSHA/BLS statistical data and Swiss Cheese incident modeling.*

---

OUTPUT MARKDOWN ONLY. NO JSON. FOLLOW THE STRUCTURE EXACTLY."""

        # Call LLM - Claude Sonnet 4 for synthesis
        result = await self.client.generate(
            prompt=prompt,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            system_instruction=system_instruction,
            adapter_name="openrouter-claude-sonnet-4",
            raw_output=True
        )

        # Extract markdown from result
        if isinstance(result, dict):
            markdown_content = result.get("text", str(result))
        else:
            markdown_content = str(result)

        # Extract decision for programmatic use
        decision = "GO_WITH_CONDITIONS"  # default
        if "**Decision:** GO\n" in markdown_content or "**Decision:** GO " in markdown_content:
            decision = "GO"
        elif "GO WITH CONDITIONS" in markdown_content:
            decision = "GO_WITH_CONDITIONS"
        elif "NO GO" in markdown_content:
            decision = "NO_GO"
        elif "STOP WORK" in markdown_content:
            decision = "STOP_WORK"

        # Return both markdown and extracted fields for compatibility
        return {
            "markdown": markdown_content,
            "goNoGo": {"decision": decision},
            "decision": decision,
            "generatedAt": datetime.now().isoformat()
        }
