"""
Weather API Router
Provides current weather data using OpenWeather API
"""

from fastapi import APIRouter, HTTPException, Depends
from app.core.config import get_settings
import httpx
from typing import Dict, Any

router = APIRouter(prefix="/weather", tags=["weather"])

@router.get("/current/{location}")
async def get_current_weather(location: str) -> Dict[str, Any]:
    """
    Get current weather for a location
    
    Args:
        location: City name (e.g., "Indianapolis" or "Indianapolis,IN,US")
    
    Returns:
        Current weather data with safety thresholds
    """
    settings = get_settings()
    
    if not settings.openweather_api_key:
        raise HTTPException(
            status_code=500,
            detail="OpenWeather API key not configured"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            # Call OpenWeather Current Weather API
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "q": location,
                    "appid": settings.openweather_api_key,
                    "units": "imperial"  # Fahrenheit, mph
                },
                timeout=10.0
            )
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail=f"Location '{location}' not found"
                )
            
            response.raise_for_status()
            data = response.json()
            
            # Extract relevant data
            temp = data["main"]["temp"]
            feels_like = data["main"]["feels_like"]
            humidity = data["main"]["humidity"]
            wind_speed = data["wind"]["speed"]
            conditions = data["weather"][0]["description"]
            icon = data["weather"][0]["icon"]
            
            # Calculate safety thresholds for construction
            safety_status = calculate_safety_status(temp, wind_speed, humidity)
            
            return {
                "location": data["name"],
                "country": data["sys"]["country"],
                "temperature": round(temp, 1),
                "feelsLike": round(feels_like, 1),
                "humidity": humidity,
                "windSpeed": round(wind_speed, 1),
                "conditions": conditions.title(),
                "icon": icon,
                "timestamp": data["dt"],
                "safetyStatus": safety_status,
                "alerts": generate_safety_alerts(temp, wind_speed, humidity)
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather data: {str(e)}"
        )

def calculate_safety_status(temp: float, wind_speed: float, humidity: float) -> Dict[str, Any]:
    """Calculate construction safety status based on weather"""
    
    # Wind thresholds (OSHA/ASME guidelines)
    wind_status = "SAFE"
    wind_message = "Wind conditions acceptable"
    
    if wind_speed >= 20:
        wind_status = "CRITICAL"
        wind_message = "Wind exceeds crane operation limits (20 mph)"
    elif wind_speed >= 15:
        wind_status = "WARNING"
        wind_message = "Approaching crane operation limits"
    
    # Temperature thresholds (OSHA heat/cold stress)
    temp_status = "SAFE"
    temp_message = "Temperature within safe range"
    
    if temp >= 90:
        temp_status = "WARNING"
        temp_message = "Heat stress risk - implement heat illness prevention"
    elif temp >= 95:
        temp_status = "CRITICAL"
        temp_message = "Extreme heat - mandatory rest breaks required"
    elif temp <= 32:
        temp_status = "WARNING"
        temp_message = "Freezing conditions - cold stress precautions required"
    elif temp <= 20:
        temp_status = "CRITICAL"
        temp_message = "Extreme cold - limit outdoor exposure"
    
    # Overall status (worst of wind/temp)
    overall_status = "SAFE"
    if wind_status == "CRITICAL" or temp_status == "CRITICAL":
        overall_status = "CRITICAL"
    elif wind_status == "WARNING" or temp_status == "WARNING":
        overall_status = "WARNING"
    
    return {
        "overall": overall_status,
        "wind": {
            "status": wind_status,
            "message": wind_message,
            "limit": 20  # mph for crane operations
        },
        "temperature": {
            "status": temp_status,
            "message": temp_message
        }
    }

def generate_safety_alerts(temp: float, wind_speed: float, humidity: float) -> list[str]:
    """Generate safety alerts based on conditions"""
    alerts = []
    
    if wind_speed >= 20:
        alerts.append("🛑 STOP WORK: Wind speed exceeds safe crane operation limits")
    elif wind_speed >= 15:
        alerts.append("⚠️ WARNING: Monitor wind speed - approaching crane limits")
    
    if temp >= 95:
        alerts.append("🌡️ EXTREME HEAT: Implement mandatory rest/water breaks")
    elif temp >= 90:
        alerts.append("☀️ HEAT ADVISORY: Monitor workers for heat illness signs")
    
    if temp <= 20:
        alerts.append("❄️ EXTREME COLD: Limit outdoor exposure time")
    elif temp <= 32:
        alerts.append("🧊 FREEZING: Cold stress precautions required")
    
    if humidity >= 80 and temp >= 85:
        alerts.append("💧 HIGH HUMIDITY: Increased heat stress risk")
    
    return alerts
