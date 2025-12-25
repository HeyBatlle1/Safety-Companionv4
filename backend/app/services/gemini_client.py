"""
Shared Gemini API client for all agents.
V1 Faithful Port - Uses Gemini 2.5 Flash
"""

import os
import json
from dotenv import load_dotenv
from google import genai

# Load .env file to ensure API keys are available
load_dotenv()


class GeminiClient:
    """Shared Gemini client for Agents 1-3"""
    
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set. Check your .env file.")
        
        self.client = genai.Client(api_key=api_key)
        # Using gemini-2.0-flash-exp for reliability - can switch to 2.5-flash when stable
        self.default_model = "gemini-2.0-flash-exp"
    
    async def generate(
        self,
        prompt: str,
        temperature: float,
        max_tokens: int
    ) -> dict:
        """
        Call Gemini API with JSON response format.
        
        Args:
            prompt: The prompt to send
            temperature: Model temperature (0.3-1.0)
            max_tokens: Maximum output tokens
            
        Returns:
            Parsed JSON dict from Gemini response
        """
        try:
            response = await self.client.aio.models.generate_content(
                model=self.default_model,
                contents=prompt,
                config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                    "response_mime_type": "application/json"
                }
            )
            
            # Parse JSON from response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            return json.loads(response_text)
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parse error: {e}")
            print(f"Response was: {response_text[:500]}...")
            raise
        except Exception as e:
            print(f"❌ Gemini API error: {e}")
            raise
    
    def generate_sync(
        self,
        prompt: str,
        temperature: float,
        max_tokens: int
    ) -> dict:
        """
        Synchronous version of generate().
        """
        try:
            response = self.client.models.generate_content(
                model=self.default_model,
                contents=prompt,
                config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                    "response_mime_type": "application/json"
                }
            )
            
            response_text = response.text.strip()
            
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            return json.loads(response_text.strip())
            
        except Exception as e:
            print(f"❌ Gemini API error: {e}")
            raise
