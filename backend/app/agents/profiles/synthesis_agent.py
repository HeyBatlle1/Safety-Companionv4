"""
Agent 4: Synthesis Agent
CLEAN SHELL - Prompts removed, ready for new implementation
"""

from app.agents.base import BaseAgent, AgentTask, AgentResponse, ModelCapability, ModelProvider
from app.agents.registry import AgentRegistry
from typing import Dict, Any
from datetime import datetime

class SynthesisAgent(BaseAgent):
    """
    Agent 4: Report Synthesizer
    Combines outputs from Agents 1-3 into final report
    """

    def __init__(self, registry: AgentRegistry):
        super().__init__(
            name="synthesis_agent",
            description="Synthesizes final JHA report from agent outputs"
        )
        self.registry = registry

    def get_capabilities(self) -> list[ModelCapability]:
        """Required capabilities for synthesis"""
        return [
            ModelCapability.STRUCTURED_OUTPUT
        ]

    def get_prompt_template(self) -> str:
        """
        PROMPT REMOVED - Ready for new implementation
        Will be replaced with V1 deterministic core + AI narrative
        """
        return ""

    async def execute(self, task: AgentTask) -> AgentResponse:
        """
        Execute report synthesis
        
        INPUT: task.input_data contains validation + risk + prediction + weather + checklist
        OUTPUT: Final report with decision, actions, executive summary
        """
        
        try:
            # Extract agent outputs
            validation = task.input_data.get("validation", {})
            risk = task.input_data.get("risk", {})
            prediction = task.input_data.get("prediction", {})
            weather = task.input_data.get("weather", {})
            checklist = task.input_data.get("checklist", {})

            # Extract metadata
            now = datetime.utcnow()
            project_name = checklist.get("projectName", "Unnamed Project")
            site_location = checklist.get("location", "Location not specified")
            work_type = checklist.get("workType", "Work type not specified")

            # PLACEHOLDER - Will be replaced with V1 deterministic core
            final_report = {
                "metadata": {
                    "reportId": f"JHA-{int(now.timestamp())}",
                    "generatedAt": now.isoformat(),
                    "projectName": project_name,
                    "location": site_location,
                    "workType": work_type
                },
                "executiveSummary": {
                    "decision": "UNKNOWN",
                    "stopWorkReasons": [],
                    "keyFindings": []
                },
                "weatherAnalysis": {},
                "stopWorkTriggers": [],
                "actionItems": [],
                "complianceStatus": {
                    "overallStatus": "UNKNOWN",
                    "identifiedGaps": []
                },
                "executiveReport": "# Report Not Generated"
            }

            return AgentResponse(
                success=True,
                output_data={"finalReport": final_report},
                model_used="placeholder",
                provider=ModelProvider.GOOGLE,
                execution_time_ms=0,
                token_usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            )

        except Exception as e:
            return AgentResponse(
                success=False,
                output_data={},
                model_used="placeholder",
                provider=ModelProvider.GOOGLE,
                execution_time_ms=0,
                token_usage={},
                error=f"Report synthesis failed: {str(e)}"
            )