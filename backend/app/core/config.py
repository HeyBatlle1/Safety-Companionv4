from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache
import json

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

    # Security - Production Vercel URL always included
    cors_origins: list[str] = [
        "https://safety-compv3-gzvb.vercel.app",  # Production frontend (REQUIRED)
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5000"
    ]

    # Authentication
    clerk_jwks_url: str = "https://useful-catfish-47.clerk.accounts.dev/.well-known/jwks.json"
    clerk_audience: str | None = None

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from JSON string, comma-separated, or list"""
        # Production Vercel URL must ALWAYS be included
        REQUIRED_ORIGINS = ["https://safety-compv3-gzvb.vercel.app"]

        origins = []
        if isinstance(v, list):
            origins = v
        elif isinstance(v, str):
            # Try JSON parse first
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    origins = parsed
            except json.JSONDecodeError:
                pass
            if not origins:
                # Try comma-separated
                origins = [origin.strip() for origin in v.split(',') if origin.strip()]

        # Ensure required origins are always present
        for required in REQUIRED_ORIGINS:
            if required not in origins:
                origins.insert(0, required)

        return origins

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

@lru_cache
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()