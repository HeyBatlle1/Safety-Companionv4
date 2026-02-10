"""
Weather Service - Single Source of Truth for Weather Data
Used by both /api/v1/weather endpoint and the analysis orchestrator.
"""

import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.core.config import get_settings


class WeatherService:
    """
    Centralized weather service with caching.

    Features:
    - Single OpenWeather API integration
    - 10-minute cache to reduce API calls
    - Construction safety thresholds (OSHA-based)
    - Graceful fallback on API failure
    """

    # Simple in-memory cache: {location: (data, timestamp)}
    _cache: Dict[str, tuple] = {}
    CACHE_TTL_MINUTES = 10

    @classmethod
    async def get_weather(cls, location: str) -> Dict[str, Any]:
        """
        Get weather for a location with caching.

        Args:
            location: City name (e.g., "Indianapolis" or "Indianapolis,IN,US")
                      Can also be a full address - will extract city name.

        Returns:
            Weather data with safety thresholds
        """
        if not location:
            return cls._fallback_weather("No location provided")

        # Extract city from address (take first part before comma)
        city = location.split(",")[0].strip()
        cache_key = city.lower()

        # Check cache
        if cache_key in cls._cache:
            cached_data, cached_time = cls._cache[cache_key]
            if datetime.now() - cached_time < timedelta(minutes=cls.CACHE_TTL_MINUTES):
                return cached_data

        # Fetch fresh data
        settings = get_settings()
        api_key = settings.openweather_api_key

        if not api_key:
            print("⚠️ OPENWEATHER_API_KEY not set")
            return cls._fallback_weather("OpenWeather API key not configured")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "q": city,
                        "appid": api_key,
                        "units": "imperial"  # Fahrenheit, mph
                    },
                    timeout=10.0
                )

                if response.status_code == 404:
                    return cls._fallback_weather(f"Location not found: {city}")

                response.raise_for_status()
                data = response.json()

                # Extract and structure data
                weather_data = cls._process_weather_response(data)

                # Cache it
                cls._cache[cache_key] = (weather_data, datetime.now())

                print(f"🌤️ Weather fetched for {city}: {weather_data['temperature']}°F, {weather_data['windSpeed']}mph wind")

                return weather_data

        except httpx.HTTPError as e:
            print(f"⚠️ Weather API error: {e}")
            return cls._fallback_weather(str(e))
        except Exception as e:
            print(f"⚠️ Weather fetch failed: {e}")
            return cls._fallback_weather(str(e))

    @classmethod
    def _process_weather_response(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process OpenWeather API response into our standard format."""
        temp = data["main"]["temp"]
        feels_like = data["main"]["feels_like"]
        humidity = data["main"]["humidity"]
        wind_speed = data["wind"]["speed"]
        wind_gust = data["wind"].get("gust", wind_speed)
        conditions = data["weather"][0]["description"]
        icon = data["weather"][0]["icon"]
        visibility = data.get("visibility", 10000) / 1000  # Convert to km

        # Calculate safety status
        safety_status = cls._calculate_safety_status(temp, wind_speed, humidity)
        alerts = cls._generate_safety_alerts(temp, wind_speed, humidity)

        return {
            "fetch_status": "SUCCESS",
            "location": data["name"],
            "country": data["sys"]["country"],
            "temperature": round(temp, 1),
            "feelsLike": round(feels_like, 1),
            "humidity": humidity,
            "windSpeed": round(wind_speed, 1),
            "windGust": round(wind_gust, 1),
            "conditions": conditions.title(),
            "icon": icon,
            "visibility": round(visibility, 1),
            "timestamp": data["dt"],
            "safetyStatus": safety_status,
            "alerts": alerts,
            "source": "OpenWeather"
        }

    @classmethod
    def _calculate_safety_status(cls, temp: float, wind_speed: float, humidity: float) -> Dict[str, Any]:
        """
        Calculate construction safety status based on weather.
        Based on OSHA/ASME guidelines.
        """
        # Wind thresholds (OSHA/ASME guidelines)
        wind_status = "SAFE"
        wind_message = "Wind conditions acceptable"

        if wind_speed >= 25:
            wind_status = "CRITICAL"
            wind_message = "Wind exceeds ALL lifting operation limits (25+ mph)"
        elif wind_speed >= 20:
            wind_status = "CRITICAL"
            wind_message = "Wind exceeds crane operation limits (20 mph)"
        elif wind_speed >= 15:
            wind_status = "WARNING"
            wind_message = "Approaching crane operation limits"

        # Temperature thresholds (OSHA heat/cold stress)
        # NOTE: Check extremes FIRST to avoid dead code
        temp_status = "SAFE"
        temp_message = "Temperature within safe range"

        if temp >= 95:
            temp_status = "CRITICAL"
            temp_message = "Extreme heat - mandatory rest breaks required"
        elif temp >= 90:
            temp_status = "WARNING"
            temp_message = "Heat stress risk - implement heat illness prevention"
        elif temp <= 20:
            temp_status = "CRITICAL"
            temp_message = "Extreme cold - limit outdoor exposure"
        elif temp <= 32:
            temp_status = "WARNING"
            temp_message = "Freezing conditions - cold stress precautions required"

        # Humidity compounds heat stress
        humidity_status = "SAFE"
        humidity_message = "Humidity acceptable"
        if humidity >= 80 and temp >= 85:
            humidity_status = "WARNING"
            humidity_message = "High humidity increases heat stress risk"

        # Overall status (worst of all factors)
        overall_status = "SAFE"
        if any(s == "CRITICAL" for s in [wind_status, temp_status]):
            overall_status = "CRITICAL"
        elif any(s == "WARNING" for s in [wind_status, temp_status, humidity_status]):
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
            },
            "humidity": {
                "status": humidity_status,
                "message": humidity_message
            }
        }

    @classmethod
    def _generate_safety_alerts(cls, temp: float, wind_speed: float, humidity: float) -> list:
        """Generate safety alerts based on conditions."""
        alerts = []

        # Wind alerts
        if wind_speed >= 25:
            alerts.append("🛑 STOP ALL LIFTING: Wind exceeds 25 mph")
        elif wind_speed >= 20:
            alerts.append("🛑 STOP CRANE OPS: Wind speed exceeds safe crane operation limits (20 mph)")
        elif wind_speed >= 15:
            alerts.append("⚠️ WARNING: Monitor wind speed - approaching crane limits")

        # Temperature alerts
        if temp >= 95:
            alerts.append("🌡️ EXTREME HEAT: Implement mandatory rest/water breaks every 15-20 min")
        elif temp >= 90:
            alerts.append("☀️ HEAT ADVISORY: Monitor workers for heat illness signs")

        if temp <= 20:
            alerts.append("❄️ EXTREME COLD: Limit outdoor exposure, warm-up breaks required")
        elif temp <= 32:
            alerts.append("🧊 FREEZING: Cold stress precautions required, watch for ice")

        # Combined heat + humidity
        if humidity >= 80 and temp >= 85:
            alerts.append("💧 HIGH HUMIDITY + HEAT: Significantly increased heat stress risk")

        return alerts

    @classmethod
    def _fallback_weather(cls, error_reason: str) -> Dict[str, Any]:
        """Return fallback weather data when API fails."""
        return {
            "fetch_status": "FAILED",
            "error": error_reason,
            "temperature": 70,
            "feelsLike": 70,
            "humidity": 50,
            "windSpeed": 5,
            "windGust": 5,
            "conditions": "Unknown",
            "visibility": 10,
            "safetyStatus": {
                "overall": "UNKNOWN",
                "wind": {"status": "UNKNOWN", "message": "Weather data unavailable", "limit": 20},
                "temperature": {"status": "UNKNOWN", "message": "Weather data unavailable"},
                "humidity": {"status": "UNKNOWN", "message": "Weather data unavailable"}
            },
            "alerts": ["⚠️ Weather data unavailable - verify conditions manually before work"],
            "source": "Fallback"
        }

    @classmethod
    def clear_cache(cls):
        """Clear the weather cache."""
        cls._cache.clear()
