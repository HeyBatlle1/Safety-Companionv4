# test_agent3.py
"""
Test Agent 3: Swiss Cheese Analyzer with the new clean spec
"""

from app.agents.profiles.swiss_cheese_analyzer import SwissCheeseAnalyzer

# Mock Agent 2 output
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
            "name": "Worker falls 90ft from swing stage during glass panel positioning",
            "category": "Fall",
            "risk_score": 85,
            "likelihood": "HIGH",
            "consequence": "CATASTROPHIC",
            "weather_amplified": True,
            "inadequate_controls": [
                "No rescue plan documented",
                "Fall protection anchor points not specified"
            ]
        },
        {
            "name": "Glass panel dropped from crane in high wind",
            "category": "Struck-by",
            "risk_score": 75,
            "likelihood": "MEDIUM",
            "consequence": "CATASTROPHIC",
            "weather_amplified": True,
            "inadequate_controls": [
                "No tag lines specified for wind control"
            ]
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
            "required_action": "Document rescue procedure"
        }
    ],
    
    "citation_risk": "HIGH",
    
    "inadequate_controls": [
        "No rescue plan documented",
        "Weather monitoring plan not defined",
        "Tag lines not specified"
    ],
    
    "hazard_interactions": [
        "Wind + height + heavy panels = compounding catastrophic risk"
    ]
}

def test_agent3():
    """Test Agent 3 prediction"""
    print("=== Testing Agent 3: Swiss Cheese Analyzer ===\n")
    
    # Run Agent 3
    analyzer = SwissCheeseAnalyzer()
    result = analyzer.predict(agent2_output)
    
    print("=== AGENT 3 OUTPUT ===")
    print(f"\nPredicted Incidents: {len(result['predicted_incidents'])}")
    
    for i, incident in enumerate(result['predicted_incidents'], 1):
        print(f"\n--- INCIDENT {i} ---")
        print(f"Name: {incident.get('incident_name', 'Unknown')}")
        print(f"Likelihood: {incident.get('likelihood', 'N/A')}, Severity: {incident.get('severity', 'N/A')}")
        print(f"Confidence: {incident.get('confidence', 'N/A')}")
        print(f"\nCausal Chain ({len(incident.get('causal_chain', []))} steps):")
        for step in incident.get('causal_chain', []):
            print(f"  → {step}")
        print(f"\nSwiss Cheese Layers:")
        swiss_cheese = incident.get('swiss_cheese', {})
        for layer, holes in swiss_cheese.items():
            print(f"  {layer}: {holes}")
        print(f"\nLeading Indicators:")
        for indicator in incident.get('leading_indicators', []):
            print(f"  - {indicator}")
        print(f"\nNear-Miss Version: {incident.get('near_miss_version', 'N/A')}")
        print(f"\nBest Intervention: {incident.get('single_best_intervention', 'N/A')}")
    
    print("\n=== TEST COMPLETE ===")
    return result

if __name__ == "__main__":
    test_agent3()
