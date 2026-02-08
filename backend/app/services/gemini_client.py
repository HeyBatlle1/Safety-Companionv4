"""
Shared Gemini API client for all agents.
V1 Faithful Port - Uses Gemini 2.5 Flash
"""

import os
import json
from typing import Optional
from dotenv import load_dotenv
from app.agents.base import AgentTask, ModelCapability
from app.core.config import get_settings

# Load .env file to ensure API keys are available
load_dotenv()


class GeminiClient:
    """
    Shared AI client for all agents.
    
    CRITICAL ARCHITECTURE CHAnge:
    Previous version was hardcoded to Google Gemini.
    This version acts as a Compatibility Facade that delegates to the AgentRegistry.
    This allows globally switching providers (e.g. to OpenRouter) without changing agent code.
    """
    
    def __init__(self):
        from app.agents.registry import AgentRegistry
        
        # Initialize registry with settings
        settings = get_settings()
        self.registry = AgentRegistry({
            'gemini_api_key': settings.gemini_api_key,
            'openrouter_api_key': settings.openrouter_api_key,
            'anthropic_api_key': settings.anthropic_api_key
        })
    
    def _extract_json(self, response_text: str) -> dict:
        """Robustly extract JSON from model response text."""
        text = response_text.strip()
        
        # 1. Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
            
        # 2. Look for markdown JSON block
        import re
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
                
        # 3. Look for any braced content
        braced_match = re.search(r'(\{.*\})', text, re.DOTALL)
        if braced_match:
            try:
                return json.loads(braced_match.group(1))
            except json.JSONDecodeError:
                pass
                
        raise ValueError(f"Could not extract valid JSON from response: {text[:200]}...")

    async def generate(
        self,
        prompt: str,
        temperature: float,
        max_tokens: int,
        system_instruction: Optional[str] = None,
        adapter_name: Optional[str] = None
    ) -> dict:
        """
        Route generation request to the best available model via Registry.

        Args:
            adapter_name: Optional specific adapter to use (e.g. "openrouter-claude-sonnet-4")
        """
        try:
            # Get adapter - either specific one or route automatically
            if adapter_name:
                adapter = self.registry.get_adapter(adapter_name)
                if not adapter:
                    print(f"⚠️ Adapter {adapter_name} not found, falling back to default")
                    adapter = self.registry.route_task(AgentTask(
                        task_type="generation",
                        input_data={"prompt": prompt},
                        required_capabilities=[ModelCapability.STRUCTURED_OUTPUT],
                        temperature=temperature,
                        max_tokens=max_tokens
                    ))
                else:
                    print(f"🎯 Using specific adapter: {adapter_name}")
            else:
                # Create task definition
                task = AgentTask(
                    task_type="generation",
                    input_data={"prompt": prompt},
                    required_capabilities=[ModelCapability.STRUCTURED_OUTPUT],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                # Get best adapter
                adapter = self.registry.route_task(task)

            # Compatibility: If adapter doesn't support system_instruction natively
            # (like OpenRouter adapter might not), prepend it to prompt
            final_prompt = prompt
            if system_instruction:
                # Most adapters take prompt as user message, so we prepend system instruction
                final_prompt = f"SYSTEM INSTRUCTION:\n{system_instruction}\n\nUSER PROMPT:\n{prompt}"

            # Call adapter
            result = await adapter.generate(
                prompt=final_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )

            # OpenRouter adapter returns dict with 'text' field
            # Google adapter returns dict with 'text' field
            # Helper extracts JSON
            response_text = result.get("text", "")
            return self._extract_json(response_text)

        except Exception as e:
            print(f"❌ AI Generation error: {e}")
            raise
    
    def generate_sync(
        self,
        prompt: str,
        temperature: float,
        max_tokens: int
    ) -> dict:
        """
        Synchronous version - requires async loop management.
        Use with caution in sync contexts.
        """
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                self.generate(prompt, temperature, max_tokens)
            )
            return result
        finally:
            loop.close()
