from typing import Optional, Dict
from app.agents.base import AgentTask, ModelCapability, ModelProvider
from app.agents.adapters.base_adapter import BaseModelAdapter
from app.agents.adapters.google import GoogleGeminiAdapter

# Try to import OpenRouter
try:
    from app.agents.adapters.openrouter import OpenRouterAdapter
    OPENROUTER_AVAILABLE = True
except (ImportError, RuntimeError):
    OPENROUTER_AVAILABLE = False
    OpenRouterAdapter = None

# Try to import Anthropic, but don't fail if missing
try:
    from app.agents.adapters.anthropic import AnthropicAdapter
    ANTHROPIC_AVAILABLE = True
except (ImportError, RuntimeError):
    ANTHROPIC_AVAILABLE = False
    AnthropicAdapter = None

class AgentRegistry:
    """
    Registry and router for AI models.
    Picks the best model for each task based on capabilities + cost.
    """

    def __init__(self, config: dict):
        self.adapters: Dict[str, BaseModelAdapter] = {}

        # Initialize OpenRouter models
        if OPENROUTER_AVAILABLE and config.get("openrouter_api_key"):
            # PRIMARY: Grok for Agents 1, 2, 3 (fast reasoning)
            self.adapters["openrouter-grok"] = OpenRouterAdapter(
                api_key=config["openrouter_api_key"],
                model="x-ai/grok-4.1-fast"
            )
            # AGENT 4 ONLY: Claude Sonnet 4.5 for synthesis (better writing)
            self.adapters["openrouter-claude-sonnet-4"] = OpenRouterAdapter(
                api_key=config["openrouter_api_key"],
                model="anthropic/claude-sonnet-4"
            )
            # Paid tier models via OpenRouter (if needed)
            self.adapters["openrouter-claude-sonnet"] = OpenRouterAdapter(
                api_key=config["openrouter_api_key"],
                model="anthropic/claude-3.5-sonnet"
            )
            self.adapters["openrouter-gpt4o"] = OpenRouterAdapter(
                api_key=config["openrouter_api_key"],
                model="openai/gpt-4o"
            )
            print("✅ OpenRouter: Grok for Agents 1-3, Claude Sonnet 4 for Agent 4")

        # Initialize Direct Gemini (PREFERRED - use Tier 1 API key, no rate limits)
        if config.get("gemini_api_key"):
            self.adapters["gemini-2.5-flash"] = GoogleGeminiAdapter(
                api_key=config["gemini_api_key"],
                model="gemini-2.5-flash"
            )
            print("✅ Native Google Gemini 2.5 Flash initialized (Tier 1 API key)")

        # Initialize Anthropic (optional - only if library installed AND key provided)
        if ANTHROPIC_AVAILABLE and config.get("anthropic_api_key"):
            self.adapters["claude-opus-4"] = AnthropicAdapter(
                api_key=config["anthropic_api_key"],
                model="claude-opus-4-20250514"
            )
            self.adapters["claude-sonnet-4.5"] = AnthropicAdapter(
                api_key=config["anthropic_api_key"],
                model="claude-sonnet-4-20250514"
            )

        # Ensure we have at least one adapter
        if not self.adapters:
            raise ValueError("No valid API keys provided. Need at least one of: openrouter_api_key, gemini_api_key")

    def route_task(self, task: AgentTask) -> BaseModelAdapter:
        """
        Pick the best model for this task based on:
        1. Required capabilities
        2. Preferred provider (if specified)
        3. Cost (if multiple options)
        4. Current availability
        
        Models are configured via database (agent_configurations table)
        """

        # PRIORITY 1: OpenRouter Grok for Agents 1-3
        if "openrouter-grok" in self.adapters:
            print("🚀 Using OpenRouter x-ai/grok-4.1-fast")
            return self.adapters["openrouter-grok"]

        # PRIORITY 2: Use native Google Gemini if available
        if "gemini-2.5-flash" in self.adapters:
            print(" Using native Google Gemini 2.5 Flash")
            return self.adapters["gemini-2.5-flash"]

        # Fallback to capability-based routing if neither available
        # If user specified a provider, try to use it
        if task.preferred_provider:
            adapter = self._get_preferred_adapter(task.preferred_provider)
            if adapter:
                return adapter
            # If preferred not available, fall through to capability matching

        # Route by capabilities
        candidates = []
        for name, adapter in self.adapters.items():
            capabilities = adapter.get_capabilities()

            # Check if adapter has ALL required capabilities
            if all(cap in capabilities for cap in task.required_capabilities):
                candidates.append((name, adapter))

        if not candidates:
            # No perfect match - use first available adapter as fallback
            return list(self.adapters.values())[0]

        # Pick cheapest option that meets requirements
        cheapest = min(
            candidates,
            key=lambda x: x[1].get_cost_per_1k_tokens()["input"]
        )

        return cheapest[1]

    def _get_preferred_adapter(self, provider: ModelProvider) -> Optional[BaseModelAdapter]:
        """Get adapter for preferred provider (if available)"""
        if provider == ModelProvider.GOOGLE:
            return self.adapters.get("gemini-2.5-flash")  # Primary: native Gemini 2.5
        elif provider == ModelProvider.ANTHROPIC:
            # Try Sonnet first (faster), then Opus
            return self.adapters.get("claude-sonnet-4.5") or self.adapters.get("claude-opus-4")
        return None

    def get_available_models(self) -> list[str]:
        """Get list of currently available models"""
        return list(self.adapters.keys())

    def get_adapter(self, adapter_name: str) -> Optional[BaseModelAdapter]:
        """Get a specific adapter by name"""
        return self.adapters.get(adapter_name)