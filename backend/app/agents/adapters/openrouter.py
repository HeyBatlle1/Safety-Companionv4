from openai import AsyncOpenAI
from datetime import datetime
from typing import Dict, Any, Optional
from app.agents.adapters.base_adapter import BaseModelAdapter
from app.agents.base import ModelCapability

class OpenRouterAdapter(BaseModelAdapter):
    """Adapter for OpenRouter API using OpenAI-compatible interface"""

    def __init__(self, api_key: str, model: str = "google/gemma-3n-e4b-it:free"):
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
        self.default_model = model  # Default model if not specified in generate()

    async def generate(
        self,
        prompt: str,
        temperature: float,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None,
        model: Optional[str] = None  # Allow model override per request
    ) -> Dict[str, Any]:
        """Generate completion from OpenRouter"""

        start_time = datetime.utcnow()
        
        # Use provided model or fall back to default
        model_to_use = model or self.default_model

        try:
            # Prepare messages in OpenAI format
            messages = [{"role": "user", "content": prompt}]

            # Prepare request parameters
            request_params = {
                "model": model_to_use,
                "messages": messages,
                "temperature": temperature
            }

            if max_tokens:
                request_params["max_tokens"] = max_tokens

            # Handle response format (OpenRouter supports some models with JSON mode)
            if response_format == "json":
                try:
                    request_params["response_format"] = {"type": "json_object"}
                except Exception:
                    # Fallback if model doesn't support JSON mode
                    pass

            response = await self.client.chat.completions.create(**request_params)

            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            # Extract response content
            content = response.choices[0].message.content

            # Extract usage information safely
            token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            if hasattr(response, 'usage') and response.usage:
                try:
                    token_usage = {
                        "prompt_tokens": getattr(response.usage, 'prompt_tokens', 0),
                        "completion_tokens": getattr(response.usage, 'completion_tokens', 0),
                        "total_tokens": getattr(response.usage, 'total_tokens', 0)
                    }
                except Exception as e:
                    print(f"⚠️ Token usage parsing error: {e}")

            # Log which model was used (with free tier indicator)
            model_display = model_to_use
            if ":free" in model_to_use:
                print(f"🆓 Used free model: {model_to_use}")
            
            return {
                "text": content,
                "model": model_to_use,  # Return actual model used
                "execution_time_ms": execution_time,
                "token_usage": token_usage
            }

        except Exception as e:
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            raise Exception(f"OpenRouter API error: {str(e)}") from e

    def get_capabilities(self) -> list[ModelCapability]:
        """Capabilities depend on the underlying model"""

        # Gemini 2.0 Flash (free tier) capabilities
        if "gemini-2.0-flash" in self.model_name:
            return [
                ModelCapability.FAST_REASONING,
                ModelCapability.STRUCTURED_OUTPUT,
                ModelCapability.LONG_CONTEXT
            ]
        # Claude 3.5 Sonnet capabilities
        elif "claude-3.5-sonnet" in self.model_name:
            return [
                ModelCapability.FAST_REASONING,
                ModelCapability.DEEP_REASONING,
                ModelCapability.STRUCTURED_OUTPUT,
                ModelCapability.CREATIVE,
                ModelCapability.LONG_CONTEXT
            ]
        # GPT-4o capabilities
        elif "gpt-4o" in self.model_name:
            return [
                ModelCapability.FAST_REASONING,
                ModelCapability.DEEP_REASONING,
                ModelCapability.STRUCTURED_OUTPUT,
                ModelCapability.CREATIVE
            ]
        # Default capabilities for unknown models
        else:
            return [
                ModelCapability.FAST_REASONING,
                ModelCapability.STRUCTURED_OUTPUT
            ]

    def get_cost_per_1k_tokens(self) -> Dict[str, float]:
        """Pricing varies by model - these are approximate OpenRouter rates"""

        # Gemini 2.0 Flash (free tier)
        if "gemini-2.0-flash-exp:free" in self.model_name:
            return {
                "input": 0.0,    # Free tier
                "output": 0.0    # Free tier
            }
        # Gemini 2.0 Flash (paid)
        elif "gemini-2.0-flash" in self.model_name:
            return {
                "input": 0.00015,   # $0.15 per 1M tokens
                "output": 0.0006    # $0.60 per 1M tokens
            }
        # Claude 3.5 Sonnet
        elif "claude-3.5-sonnet" in self.model_name:
            return {
                "input": 0.003,     # $3.00 per 1M tokens
                "output": 0.015     # $15.00 per 1M tokens
            }
        # GPT-4o
        elif "gpt-4o" in self.model_name:
            return {
                "input": 0.005,     # $5.00 per 1M tokens
                "output": 0.015     # $15.00 per 1M tokens
            }
        # Default pricing for unknown models
        else:
            return {
                "input": 0.001,     # $1.00 per 1M tokens
                "output": 0.003     # $3.00 per 1M tokens
            }