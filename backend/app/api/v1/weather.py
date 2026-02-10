"""
Weather API Router
Provides current weather data using WeatherService (Single Source of Truth)
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.weather_service import WeatherService

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current/{location}")
async def get_current_weather(location: str) -> Dict[str, Any]:
    """
    Get current weather for a location.

    Args:
        location: City name (e.g., "Indianapolis" or "Indianapolis,IN,US")

    Returns:
        Current weather data with safety thresholds
    """
    weather_data = await WeatherService.get_weather(location)

    # If fetch failed, return appropriate error
    if weather_data.get("fetch_status") == "FAILED":
        error = weather_data.get("error", "Unknown error")
        if "not found" in error.lower():
            raise HTTPException(status_code=404, detail=error)
        elif "API key" in error:
            raise HTTPException(status_code=500, detail=error)
        # For other failures, return the fallback data with a warning
        # This allows the frontend to still display something

    return weather_data


@router.delete("/cache")
async def clear_weather_cache() -> Dict[str, str]:
    """Clear the weather cache (admin/debug endpoint)."""
    WeatherService.clear_cache()
    return {"status": "cache_cleared"}
