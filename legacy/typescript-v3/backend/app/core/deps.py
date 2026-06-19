"""Dependency injection for FastAPI routes"""

from typing import AsyncGenerator
from functools import lru_cache
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.agents.registry import AgentRegistry
from app.core.config import get_settings


@lru_cache()
def get_agent_registry() -> AgentRegistry:
    """
    Get singleton AgentRegistry instance.

    Registry is expensive to initialize, so we cache it.
    """
    settings = get_settings()

    return AgentRegistry({
        'openrouter_api_key': settings.openrouter_api_key,  # Primary (free tier available)
        'gemini_api_key': settings.gemini_api_key,          # Fallback
        'anthropic_api_key': settings.anthropic_api_key     # Optional
    })


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_jha_service(
    db: AsyncSession = Depends(get_db),
    registry: AgentRegistry = Depends(get_agent_registry)
):
    """Get JHA service with dependencies injected"""
    from app.services.jha_service import JHAService
    return JHAService(db, registry)