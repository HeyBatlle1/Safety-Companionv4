# test_agent4.py
"""
Test Agent 4: Synthesis Agent with the new clean spec
"""

from app.agents.profiles.synthesis_agent import SynthesisAgent

# Mock inputs from all agents
agent1_output = {
    "validation": {
        "qualityScore": 8.5,
        "status": "ACCEPTED",
        "confidenceLevel": "HIGH",
        "missingCritical": [],
        "stopWorkTriggers": [
            "Emergency response plan required for work above 6 feet"
        ],
        "dataCompleteness": {
            "weather": True,
            "equipmentSpecs": True,
            "workerCerts": False,
            "emergencyPlan": False,
            "ppeDocumented": True
        }
    },
    "enriched_data": {
        "jha": {
            "jobInfo": {
                "projectName": "Downtown Tower",
                "location": "Indianapolis, IN",
                "workType": "Curtainwall Installation"
            }
        },
        "weather": {
            "temperature": 13.6,
            "windSpeed": 17,
            "windGust": 19,
            "conditions": "Snow",
            "fetch_status": "SUCCESS"
        }
    }
}

agent2_output = {
    "weather_analysis": {
        "status": "YELLOW",
        "current_wind": 19,
        "equipment_margins": {
            "crane": {
                "limit": 20,
                "current": 19,
                "margin_percent": 5,
                "status": "RED"
            }
        },
        "stop_work_weather": ["Wind at 95% of crane limit"],
        "critical_finding": "Operating at 5% margin - CRITICAL"
    },
    "hazards": [
        {
            "name": "Worker falls 90ft from swing stage",
            "category": "Fall",
            "risk_score": 85,
            "likelihood": "HIGH",
            "consequence": "CATASTROPHIC",
            "weather_amplified": True,
            "inadequate_controls": ["No rescue plan documented"]
        }
    ],
    "top_score": 85,
    "top_hazard": "Worker falls 90ft from swing stage",
    "osha_gaps": [
        {
            "standard": "1926.502(d)(15)",
            "title": "Fall Protection Rescue",
            "gap": "No rescue procedure documented",
            "citation_likelihood": "HIGH",
            "severity": "SERIOUS",
            "required_action": "Document rescue procedure with <6min response"
        }
    ],
    "citation_risk": "HIGH",
    "inadequate_controls": ["No rescue plan documented"],
    "hazard_interactions": ["Wind + height + heavy panels = compounding risk"]
}

agent3_output = {
    "predicted_incidents": [
        {
            "incident_name": "Worker falls 90ft from swing stage during glass panel positioning in 19mph wind",
            "likelihood": "MEDIUM",
            "severity": "CATASTROPHIC",
            "confidence": "HIGH",
            "causal_chain": [
                "Wind gust hits 19mph during panel lift",
                "Swing stage sways unexpectedly",
                "Worker loses balance reaching for panel",
                "Fall protection anchor fails under dynamic load",
                "Worker falls 90 feet to ground"
            ],
            "swiss_cheese": {
                "organizational": ["No weather monitoring policy enforced"],
                "engineering": ["Swing stage not rated for wind loads"],
                "administrative": ["Lift procedure doesn't account for gusts"],
                "behavioral": ["Worker rushing before weather worsens"],
                "ppe": ["Fall protection anchor not inspected"]
            },
            "leading_indicators": [
                "Workers checking weather informally",
                "Swing stage swaying visibly"
            ],
            "near_miss_version": "Same scenario but worker grabs railing, close call reported",
            "single_best_intervention": "Stop work when wind exceeds 15mph sustained"
        }
    ]
}

def test_agent4():
    """Test Agent 4 synthesis"""
    print("=== Testing Agent 4: Synthesis Agent ===\n")
    
    # Run Agent 4
    synthesizer = SynthesisAgent()
    result = synthesizer.synthesize(agent1_output, agent2_output, agent3_output)
    
    print("=== AGENT 4 OUTPUT ===")
    print(f"\nDECISION: {result['decision']}")
    print(f"Score: {result['decisionScore']}/100")
    
    print(f"\n--- EXECUTIVE SUMMARY ---")
    print(result['executiveSummary'])
    
    print(f"\n--- CRITICAL FINDINGS ({len(result['criticalFindings'])}) ---")
    for finding in result['criticalFindings']:
        print(f"• {finding}")
    
    print(f"\n--- ACTION ITEMS ({len(result['actionItems'])}) ---")
    for i, action in enumerate(result['actionItems'], 1):
        print(f"{i}. [{action['priority']}] {action['what']}")
        print(f"   Who: {action['who']}")
        print(f"   Verify: {action['verify']}")
    
    print(f"\n--- STOP WORK CONDITIONS ---")
    for condition in result['stopWorkConditions']:
        print(f"• {condition}")
    
    print(f"\n--- WEATHER MONITORING ---")
    wm = result['weatherMonitoring']
    print(f"Status: {wm['status']}")
    print(f"Current Wind: {wm['currentWind']}mph")
    print(f"Equipment Margin: {wm['equipmentMargin']}%")
    print(f"Next Check: {wm['nextCheck']}")
    print(f"Stop Work Threshold: {wm['stopWorkThreshold']}")
    
    print("\n=== TEST COMPLETE ===")
    return result

if __name__ == "__main__":
    test_agent4()
