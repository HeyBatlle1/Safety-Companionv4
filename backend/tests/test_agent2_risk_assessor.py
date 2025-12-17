# test_agent2.py
"""
Test Agent 2: Risk Assessor with the new clean spec
"""

from app.agents.profiles.risk_assessor import RiskAssessor

# Mock Agent 1 output
agent1_output = {
    "validation": {
        "qualityScore": 8.5,
        "status": "ACCEPTED",
        "confidenceLevel": "HIGH",
        "missingCritical": [],
        "missingRecommended": [],
        "stopWorkTriggers": [],
        "dataCompleteness": {
            "weather": True,
            "equipmentSpecs": True,
            "workerCerts": False,
            "emergencyPlan": False,
            "ppeDocumented": True
        },
        "concerns": []
    },
    "enriched_data": {
        "jha": {
            "jobInfo": {
                "projectName": "Downtown Tower",
                "location": "Indianapolis, IN",
                "workType": "Curtainwall Installation",
                "crewSize": 4,
                "supervisor": "John Smith"
            },
            "hazards": [
                {"category": "Fall", "description": "Fall from height during panel installation", "severity": "high"},
                {"category": "Struck-by", "description": "Struck by falling glass panel", "severity": "high"}
            ],
            "controlMeasures": {
                "ppe": ["Fall protection harnesses", "Hard hats", "Safety glasses"],
                "procedures": ["100% tie-off required", "Exclusion zone below work area"],
                "emergencyPlan": "Call 911, site rescue team on standby"
            },
            "equipment": ["Spider crane", "Swing stage"],
            "equipment_specs": "Crane: 20mph wind limit, Swing stage: 25mph limit",
            "work_height": 90
        },
        "weather": {
            "temperature": 13.6,
            "feelsLike": 8.2,
            "windSpeed": 17,
            "windGust": 19,
            "conditions": "Snow",
            "humidity": 83,
            "fetch_status": "SUCCESS"
        }
    }
}

def test_agent2():
    """Test Agent 2 assessment"""
    print("=== Testing Agent 2: Risk Assessor ===\n")
    
    # Run Agent 2
    assessor = RiskAssessor()
    result = assessor.assess(agent1_output)
    
    print("=== AGENT 2 OUTPUT ===")
    print(f"\nWeather Status: {result['weather_analysis']['status']}")
    print(f"Current Wind: {result['weather_analysis']['current_wind']}mph")
    print(f"Equipment Margins: {result['weather_analysis']['equipment_margins']}")
    print(f"Critical Finding: {result['weather_analysis']['critical_finding']}")
    
    print(f"\nTop Hazard: {result['top_hazard']}")
    print(f"Top Score: {result['top_score']}")
    
    print(f"\nCitation Risk: {result['citation_risk']}")
    print(f"OSHA Gaps: {len(result['osha_gaps'])}")
    print(f"Hazards Identified: {len(result['hazards'])}")
    
    print("\n--- Hazards ---")
    for h in result['hazards']:
        print(f"  - {h.get('name', 'Unknown')} (Score: {h.get('risk_score', 0)})")
    
    print("\n--- OSHA Gaps ---")
    for gap in result['osha_gaps']:
        print(f"  - {gap.get('standard', 'N/A')}: {gap.get('gap', 'N/A')}")
    
    print("\n--- Hazard Interactions ---")
    for interaction in result['hazard_interactions']:
        print(f"  - {interaction}")
    
    print("\n=== TEST COMPLETE ===")
    return result

if __name__ == "__main__":
    test_agent2()
