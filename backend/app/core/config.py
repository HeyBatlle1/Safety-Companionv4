from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    app_name: str = "Safety Companion API"
    debug: bool = False

    # Database - Neon (consolidated)
    database_url: str

    # Supabase removed - V2 uses SQLAlchemy only

    # External APIs (AT LEAST ONE REQUIRED)
    gemini_api_key: str | None = None  # Direct Gemini (fallback)
    google_api_key: str | None = None  # Alias for GOOGLE_API_KEY env var (vision)
    openrouter_api_key: str | None = None  # OpenRouter (preferred)

    # External APIs (OPTIONAL)
    google_maps_api_key: str | None = None
    anthropic_api_key: str | None = None  # Anthropic Claude (production vision)
    openweather_api_key: str | None = None  # Weather data for smart cards

    # Security
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

@lru_cache
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()