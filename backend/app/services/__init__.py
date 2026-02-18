# Services module
# NOTE: Imports are lazy to avoid circular dependencies with orchestrator
# GeminiService (legacy direct SDK) removed — all inference routes through
# GeminiClient → AgentRegistry → OpenRouter adapters.

# JHAService imports orchestrator, so we don't import it at module level
# Use: from app.services.jha_service import JHAService

__all__: list[str] = []