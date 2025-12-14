"""
Agent 1 Validator - Unit Tests
Tests deterministic validation logic
"""

import pytest
from app.agents.profiles.jha_validator import JHAValidatorAgent
from app.agents.registry import AgentRegistry
from app.agents.base import AgentTask

# Mock registry for testing
class MockRegistry:
    pass

@pytest.fixture
def validator():
    registry = MockRegistry()
    return JHAValidatorAgent(registry)

# TEST 1: Complete JHA with weather
def test_complete_jha(validator):
    """Test with all fields present - should score 10/10"""
    jha_input = {
        "location": "Indianapolis, IN",
        "workType": "Curtainwall Installation",
        "workHeight": 90,
        "crewSize": 4,
        "emergencyPlan": "Documented rescue plan with 6-min response",
        "equipment": "Spider crane, Swing stage",
        "equipmentSpecs": "Crane: 20mph wind limit",
        "workerCertifications": "Crane operator: John Doe, Cert #12345",
        "weatherMonitoringPlan": "Anemometer at crane height, 15-min checks",
        "identifiedHazards": ["Falls", "Struck by"],
        "controlMeasures": ["Fall protection", "Barricades"],
        "ppeRequirements": ["Hard hat", "Harness"]
    }
    
    weather_data = {
        "fetch_status": "SUCCESS",
        "temperature": 72,
        "windSpeed": 8
    }
    
    result = validator._validate_jha(jha_input, weather_data)
    
    assert result["qualityScore"] == 10.0
    assert result["dataQuality"] == "ACCEPTED"
    assert result["confidence"] == "HIGH"
    assert len(result["missingCritical"]) == 0
    assert len(result["stopWorkTriggers"]) == 0

# TEST 2: Missing critical fields
def test_missing_critical_fields(validator):
    """Test with missing critical fields - should score 4/10"""
    jha_input = {
        "location": "Indianapolis, IN",
        "workType": "Curtainwall Installation"
        # Missing: workHeight, crewSize, emergencyPlan
    }
    
    weather_data = {"fetch_status": "SUCCESS"}
    
    result = validator._validate_jha(jha_input, weather_data)
    
    assert result["qualityScore"] == 4.0  # 10 - (3 * 2) = 4
    assert result["dataQuality"] == "ACCEPTED"
    assert result["confidence"] == "LOW"
    assert len(result["missingCritical"]) == 3
    assert "Work height" in result["missingCritical"]
    assert "Number of workers" in result["missingCritical"]
    assert "Emergency response plan" in result["missingCritical"]

# TEST 3: Stop-work trigger
def test_stop_work_trigger(validator):
    """Test stop-work trigger for elevated work without emergency plan"""
    jha_input = {
        "location": "Indianapolis, IN",
        "workType": "Curtainwall Installation",
        "workHeight": 90,
        "crewSize": 4
        # Missing: emergencyPlan (work >6ft requires it)
    }
    
    weather_data = {"fetch_status": "SUCCESS"}
    
    result = validator._validate_jha(jha_input, weather_data)
    
    assert len(result["stopWorkTriggers"]) == 1
    assert "Emergency response plan required" in result["stopWorkTriggers"][0]

# TEST 4: High wind trigger
def test_high_wind_trigger(validator):
    """Test stop-work trigger for high wind without monitoring plan"""
    jha_input = {
        "location": "Indianapolis, IN",
        "workType": "Curtainwall Installation",
        "workHeight": 90,
        "crewSize": 4,
        "emergencyPlan": "Documented"
        # Missing: weatherMonitoringPlan
    }
    
    weather_data = {
        "fetch_status": "SUCCESS",
        "windSpeed": 18  # >15 mph
    }
    
    result = validator._validate_jha(jha_input, weather_data)
    
    assert any("Wind speed >15mph" in trigger for trigger in result["stopWorkTriggers"])

# TEST 5: Crane certification trigger
def test_crane_certification_trigger(validator):
    """Test stop-work trigger for crane without certifications"""
    jha_input = {
        "location": "Indianapolis, IN",
        "workType": "Curtainwall Installation",
        "workHeight": 90,
        "crewSize": 4,
        "emergencyPlan": "Documented",
        "equipment": "Tower crane, Spider crane"
        # Missing: operatorCertifications
    }
    
    weather_data = {"fetch_status": "SUCCESS"}
    
    result = validator._validate_jha(jha_input, weather_data)
    
    assert any("Crane/hoist operation requires" in trigger for trigger in result["stopWorkTriggers"])

# TEST 6: Weather fetch failure
def test_weather_fetch_failure(validator):
    """Test handling of weather API failure"""
    jha_input = {
        "location": "Indianapolis, IN",
        "workType": "Curtainwall Installation",
        "workHeight": 90,
        "crewSize": 4,
        "emergencyPlan": "Documented"
    }
    
    weather_data = {
        "fetch_status": "FAILED",
        "error": "API timeout"
    }
    
    result = validator._validate_jha(jha_input, weather_data)
    
    assert result["qualityScore"] == 9.0  # 10 - 1 for missing weather
    assert result["weatherPresent"] is False
    assert any("Weather data unavailable" in concern for concern in result["concerns"])

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
