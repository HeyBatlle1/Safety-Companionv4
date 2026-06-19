"""
Mock Adapter for Testing
Returns realistic agent responses without actual API calls
"""

import json
import time
from typing import Dict, Any
from app.agents.base import ModelAdapter

class MockAdapter(ModelAdapter):
    """Mock adapter that returns realistic JHA analysis responses"""

    def __init__(self, model_name: str = "mock-gemini-2.5-flash"):
        super().__init__(model_name)

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        response_format: str = "text"
    ) -> Dict[str, Any]:
        """Generate mock response based on the agent type in the prompt"""

        start_time = time.time()

        # Determine which agent this is based on the prompt content
        if "VALIDATION" in prompt and "qualityScore" in prompt:
            # Agent 1: Validator
            mock_response = {
                "validation": {
                    "qualityScore": 8,
                    "dataQuality": "GOOD",
                    "completeness": "85% complete",
                    "reviewStatus": "CONDITIONAL"
                },
                "missingCritical": [
                    "Emergency evacuation procedures from height",
                    "Wind monitoring equipment specification"
                ],
                "concerns": {
                    "lifeSafety": [
                        "Wind gusts approaching 30mph threshold",
                        "Fall protection at 45ft height requires enhanced systems"
                    ],
                    "environmental": [
                        "Wind increasing to 25-30mph by 2pm - monitor conditions",
                        "Temperature at 48°F may affect worker dexterity"
                    ],
                    "regulatory": [
                        "OSHA 1926.760(a)(1): Structural steel assembly over 15 feet",
                        "OSHA 1926.502(d): Personal fall arrest systems required"
                    ],
                    "resources": [
                        "Need competent person certified for wind assessment",
                        "4 certified glaziers adequate for scope"
                    ]
                },
                "weatherIntegration": {
                    "currentConditions": "20mph winds with 28mph gusts, increasing to 30mph",
                    "weatherRisks": [
                        "High wind risk for curtain wall installation",
                        "Approaching work suspension threshold (30mph)"
                    ],
                    "weatherControls": [
                        "Continuous wind monitoring required",
                        "Work suspension plan at 30mph sustained winds"
                    ]
                },
                "recommendations": [
                    "Implement continuous wind monitoring during installation",
                    "Prepare for potential work suspension if winds exceed 30mph",
                    "Ensure emergency descent plan from 45ft height"
                ],
                "tradeSpecificFindings": {
                    "workType": "Curtain wall glass installation",
                    "specificGaps": [
                        "Glass handling procedures in wind conditions",
                        "Crane operation limits not specified"
                    ],
                    "additionalRequirements": [
                        "A5 cut-resistant gloves appropriate for glass handling",
                        "PFAS anchor points require engineering verification"
                    ]
                }
            }

        elif "RISK ASSESSMENT" in prompt and "riskScore" in prompt:
            # Agent 2: Risk Assessor
            mock_response = {
                "riskAssessment": {
                    "overallRiskScore": 76,
                    "riskLevel": "HIGH",
                    "primaryRiskDrivers": ["Falls", "Weather", "Struck-by objects"]
                },
                "oshaFatalFour": {
                    "falls": {
                        "riskScore": 84,
                        "multiplier": 2.8,
                        "baseScore": 30,
                        "reasoning": "45ft height + wind conditions + glass handling"
                    },
                    "struckBy": {
                        "riskScore": 68,
                        "multiplier": 1.5,
                        "baseScore": 45,
                        "reasoning": "Glass panels in wind + crane operations"
                    },
                    "electricalHazards": {
                        "riskScore": 15,
                        "multiplier": 1.0,
                        "baseScore": 15,
                        "reasoning": "Limited electrical exposure in this task"
                    },
                    "caughtInBetween": {
                        "riskScore": 25,
                        "multiplier": 1.0,
                        "baseScore": 25,
                        "reasoning": "Potential pinch points during installation"
                    }
                },
                "hazardAnalysis": [
                    {
                        "hazard": "Falls from height",
                        "severity": "FATAL",
                        "probability": "MEDIUM",
                        "riskScore": 84,
                        "controls": ["PFAS", "Competent person", "Training"],
                        "residualRisk": "MEDIUM"
                    },
                    {
                        "hazard": "Struck by falling glass",
                        "severity": "SERIOUS",
                        "probability": "HIGH",
                        "riskScore": 68,
                        "controls": ["Hard hats", "Exclusion zones", "Secured lifting"],
                        "residualRisk": "MEDIUM"
                    }
                ],
                "weatherImpact": {
                    "currentWindRisk": "HIGH",
                    "riskIncrease": 25,
                    "windThresholds": {
                        "current": "20mph sustained, 28mph gusts",
                        "suspension": "30mph sustained",
                        "timeToThreshold": "4 hours (by 2pm)"
                    },
                    "recommendations": [
                        "Monitor wind conditions every 15 minutes",
                        "Prepare for work suspension by 1:30pm"
                    ]
                },
                "goNoGo": {
                    "decision": "GO_WITH_CONDITIONS",
                    "reasoning": "Work can proceed with enhanced wind monitoring and suspension plan",
                    "conditions": [
                        "Continuous wind monitoring",
                        "Work suspension if winds reach 30mph",
                        "Enhanced communication protocols"
                    ],
                    "reviewTime": "2 hours"
                }
            }

        elif "SWISS CHEESE" in prompt and "predictedIncident" in prompt:
            # Agent 3: Swiss Cheese Analyzer
            mock_response = {
                "predictedIncident": {
                    "scenario": "Glazier unclips from PFAS during wind gust while positioning 200lb glass panel, falls 45 feet",
                    "severity": "FATAL",
                    "likelihood": "MEDIUM",
                    "timeframe": "Next 4 hours (peak wind period)"
                },
                "causalChain": {
                    "organizationalFactors": [
                        "Pressure to complete installation before weather deteriorates",
                        "Insufficient wind-specific procedures for glass installation"
                    ],
                    "supervisoryFactors": [
                        "Competent person may not be continuously monitoring all workers",
                        "Communication gaps during high-precision glass positioning"
                    ],
                    "preconditions": [
                        "Worker fatigue from fighting wind during previous installations",
                        "Awkward positioning required for glass panel alignment"
                    ],
                    "unsafeActs": [
                        "Unclipping from PFAS for 'better reach' during glass positioning",
                        "Attempting installation in marginal wind conditions"
                    ],
                    "triggerEvent": "28mph wind gust hits during glass panel positioning"
                },
                "defenseFailures": {
                    "engineeringControls": [
                        "PFAS anchor points may limit movement needed for glass positioning",
                        "No wind speed alarms on jobsite"
                    ],
                    "administrativeControls": [
                        "Wind monitoring procedures not specific enough (every 30 min vs continuous)",
                        "No protocol for marginal conditions (20-30mph range)"
                    ],
                    "personalProtectiveEquipment": [
                        "PFAS may be disconnected by worker for positioning flexibility",
                        "Hard hat provides no protection against falls"
                    ],
                    "humanFactors": [
                        "Production pressure overrides safety concerns",
                        "Normalization of working in windy conditions"
                    ]
                },
                "leadingIndicators": [
                    "Wind speed approaching 30mph limit",
                    "Workers expressing concern about wind",
                    "Multiple reconnections to PFAS during single installation",
                    "Increased time per panel due to wind resistance"
                ],
                "mitigationStrategies": [
                    "Install continuous wind monitoring with audible alarms",
                    "Implement two-person rule for all glass installations",
                    "Create 25mph precautionary protocol (enhanced monitoring)",
                    "Require positive communication every 10 minutes during installations"
                ],
                "riskAmplifiers": [
                    "Afternoon wind pattern typically increases speed",
                    "Multiple heavy glass panels create sustained exposure",
                    "Urban downtown location may create wind tunnel effects",
                    "Worker experience level adequate but not expert"
                ]
            }

        else:
            # Agent 4: Synthesis Agent
            mock_response = {
                "executiveSummary": {
                    "project": "Curtain wall glass installation at 1234 Main St, Chicago IL",
                    "overallRisk": "HIGH (76/100)",
                    "recommendation": "GO_WITH_CONDITIONS",
                    "keyFindings": [
                        "Wind conditions approaching suspension threshold (30mph)",
                        "Fall protection critical at 45ft height with wind factors",
                        "Swiss Cheese analysis predicts PFAS disconnection scenario",
                        "4-hour window before conditions deteriorate further"
                    ]
                },
                "riskProfile": {
                    "dataQuality": "GOOD (8/10)",
                    "primaryHazards": ["Falls (84/100)", "Struck-by (68/100)", "Weather (76/100)"],
                    "oshaCompliance": "CONDITIONAL - requires wind monitoring enhancement",
                    "weatherImpact": "HIGH - work suspension likely by 2pm"
                },
                "decision": {
                    "goNoGo": "GO_WITH_CONDITIONS",
                    "confidence": "85%",
                    "validUntil": "2025-10-30T14:00:00Z",
                    "triggerReview": [
                        "Wind speed reaches 25mph sustained",
                        "Any worker reports safety concern",
                        "Equipment malfunction"
                    ]
                },
                "actionItems": {
                    "immediate": [
                        "Install wind monitoring equipment with audible alarms",
                        "Brief all workers on 30mph suspension protocol",
                        "Verify PFAS anchor point engineering specifications"
                    ],
                    "shortTerm": [
                        "Implement 15-minute wind speed checks",
                        "Position emergency descent equipment",
                        "Prepare work suspension checklist"
                    ],
                    "ongoing": [
                        "Monitor weather forecasts hourly",
                        "Maintain positive communication every 10 minutes",
                        "Document all wind-related decisions"
                    ]
                },
                "complianceNotes": [
                    "OSHA 1926.760(a)(1): Structural steel assembly requirements met",
                    "OSHA 1926.502(d): Personal fall arrest systems in use",
                    "Weather monitoring enhancement recommended for full compliance"
                ],
                "emergencyProcedures": {
                    "windSuspension": "Stop work immediately if winds reach 30mph sustained",
                    "fallRescue": "Emergency descent plan required from 45ft height",
                    "communication": "Competent person maintains radio contact with all workers"
                }
            }

        # Simulate API response structure
        execution_time = int((time.time() - start_time) * 1000)

        return {
            "text": json.dumps(mock_response),
            "model": self.model_name,
            "execution_time_ms": execution_time,
            "token_usage": {
                "prompt_tokens": len(prompt) // 4,  # Rough estimate
                "completion_tokens": len(json.dumps(mock_response)) // 4,
                "total_tokens": (len(prompt) + len(json.dumps(mock_response))) // 4
            }
        }