"""
Vision/Multimodal Client

Supports:
- Google Gemini 2.0 Flash (vision capable)
- Anthropic Claude Sonnet 4 (vision capable, production)

Handles image encoding, PDF processing, and multimodal prompts.
"""

import os
import json
import base64
from typing import Dict, Any, List, Optional, Union
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from enum import Enum

load_dotenv()


class VisionProvider(str, Enum):
    """Available vision/multimodal providers"""
    GOOGLE = "google"
    ANTHROPIC = "anthropic"


class ImageInput:
    """Represents an image for multimodal analysis"""
    
    def __init__(
        self,
        data: bytes,
        mime_type: str = "image/jpeg",
        category: str = "general",
        filename: Optional[str] = None
    ):
        self.data = data
        self.mime_type = mime_type
        self.category = category  # site, equipment, ppe, materials
        self.filename = filename
    
    @classmethod
    def from_base64(cls, b64_string: str, mime_type: str = "image/jpeg", category: str = "general"):
        """Create from base64 string"""
        data = base64.b64decode(b64_string)
        return cls(data=data, mime_type=mime_type, category=category)
    
    @classmethod
    def from_file(cls, file_path: str, category: str = "general"):
        """Create from file path"""
        path = Path(file_path)
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp"
        }
        mime_type = mime_types.get(path.suffix.lower(), "image/jpeg")
        with open(file_path, "rb") as f:
            data = f.read()
        return cls(data=data, mime_type=mime_type, category=category, filename=path.name)
    
    def to_base64(self) -> str:
        """Get base64 encoded string"""
        return base64.b64encode(self.data).decode("utf-8")


class DocumentInput:
    """Represents a PDF or document for processing"""
    
    def __init__(self, data: bytes, filename: str = "document.pdf"):
        self.data = data
        self.filename = filename
    
    @classmethod
    def from_base64(cls, b64_string: str, filename: str = "document.pdf"):
        """Create from base64 string"""
        data = base64.b64decode(b64_string)
        return cls(data=data, filename=filename)
    
    @classmethod
    def from_file(cls, file_path: str):
        """Create from file path"""
        path = Path(file_path)
        with open(file_path, "rb") as f:
            data = f.read()
        return cls(data=data, filename=path.name)
    
    def to_base64(self) -> str:
        """Get base64 encoded string"""
        return base64.b64encode(self.data).decode("utf-8")


class VisionClient:
    """
    Multimodal AI client supporting both Gemini and Claude for vision tasks.
    
    Usage:
        client = VisionClient()
        result = await client.analyze_image(image, prompt)
        result = await client.analyze_images(images, prompt)
        result = await client.analyze_document(document, prompt)
        result = await client.analyze_multimodal(images, documents, text, prompt)
    """
    
    def __init__(
        self,
        provider: VisionProvider = VisionProvider.GOOGLE,
        model: Optional[str] = None
    ):
        self.provider = provider
        
        if provider == VisionProvider.GOOGLE:
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY not set")
            self.client = genai.Client(api_key=api_key)
            self.model = model or "gemini-2.0-flash"  # Vision-capable
            
        elif provider == VisionProvider.ANTHROPIC:
            try:
                from anthropic import AsyncAnthropic
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError("ANTHROPIC_API_KEY not set")
                self.client = AsyncAnthropic(api_key=api_key)
                self.model = model or "claude-sonnet-4-20250514"
            except ImportError:
                raise RuntimeError(
                    "Anthropic library not installed. "
                    "Install with: pip install anthropic"
                )
    
    async def analyze_image(
        self,
        image: ImageInput,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze a single image with context"""
        return await self.analyze_images([image], prompt, temperature, max_tokens, system_instruction)
    
    async def analyze_images(
        self,
        images: List[ImageInput],
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 8192,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze multiple images together"""
        
        if self.provider == VisionProvider.GOOGLE:
            return await self._analyze_images_gemini(images, prompt, temperature, max_tokens, system_instruction)
        else:
            return await self._analyze_images_anthropic(images, prompt, temperature, max_tokens, system_instruction)
    
    async def _analyze_images_gemini(
        self,
        images: List[ImageInput],
        prompt: str,
        temperature: float,
        max_tokens: int,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Use Gemini for image analysis"""
        from google.genai import types
        
        # Build content parts: text prompt + images
        parts = [prompt]
        
        for i, img in enumerate(images):
            parts.append(
                types.Part.from_bytes(
                    data=img.data,
                    mime_type=img.mime_type
                )
            )
        
        try:
            config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "response_mime_type": "application/json"
            }
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=parts,
                config=config
            )
            
            return self._parse_json_response(response.text)
            
        except Exception as e:
            print(f"❌ Gemini Vision error: {e}")
            raise
    
    async def _analyze_images_anthropic(
        self,
        images: List[ImageInput],
        prompt: str,
        temperature: float,
        max_tokens: int,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Use Claude for image analysis"""
        
        # Build message content with images
        content = []
        
        for i, img in enumerate(images):
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img.mime_type,
                    "data": img.to_base64()
                }
            })
        
        # Add text prompt
        content.append({
            "type": "text",
            "text": prompt
        })
        
        try:
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{
                    "role": "user",
                    "content": content
                }]
            }
            if system_instruction:
                kwargs["system"] = system_instruction

            response = await self.client.messages.create(**kwargs)
            
            return self._parse_json_response(response.content[0].text)
            
        except Exception as e:
            print(f"❌ Claude Vision error: {e}")
            raise
    
    async def analyze_document(
        self,
        document: DocumentInput,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 8192,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze a PDF document"""
        
        if self.provider == VisionProvider.GOOGLE:
            return await self._analyze_document_gemini(document, prompt, temperature, max_tokens, system_instruction)
        else:
            return await self._analyze_document_anthropic(document, prompt, temperature, max_tokens, system_instruction)
    
    async def _analyze_document_gemini(
        self,
        document: DocumentInput,
        prompt: str,
        temperature: float,
        max_tokens: int,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Use Gemini for PDF analysis"""
        from google.genai import types
        
        parts = [
            prompt,
            types.Part.from_bytes(
                data=document.data,
                mime_type="application/pdf"
            )
        ]
        
        try:
            config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "response_mime_type": "application/json"
            }
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=parts,
                config=config
            )
            
            return self._parse_json_response(response.text)
            
        except Exception as e:
            print(f"❌ Gemini PDF error: {e}")
            raise
    
    async def _analyze_document_anthropic(
        self,
        document: DocumentInput,
        prompt: str,
        temperature: float,
        max_tokens: int,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Use Claude for PDF analysis"""
        
        content = [
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": document.to_base64()
                }
            },
            {
                "type": "text",
                "text": prompt
            }
        ]
        
        try:
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{
                    "role": "user",
                    "content": content
                }]
            }
            if system_instruction:
                kwargs["system"] = system_instruction

            response = await self.client.messages.create(**kwargs)
            
            return self._parse_json_response(response.content[0].text)
            
        except Exception as e:
            print(f"❌ Claude PDF error: {e}")
            raise
    
    async def analyze_multimodal(
        self,
        images: Optional[List[ImageInput]] = None,
        documents: Optional[List[DocumentInput]] = None,
        text_context: Optional[str] = None,
        prompt: str = "",
        temperature: float = 0.3,
        max_tokens: int = 16384,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive multimodal analysis.
        """
        
        if self.provider == VisionProvider.GOOGLE:
            return await self._analyze_multimodal_gemini(
                images, documents, text_context, prompt, temperature, max_tokens, system_instruction
            )
        else:
            return await self._analyze_multimodal_anthropic(
                images, documents, text_context, prompt, temperature, max_tokens, system_instruction
            )
    
    async def _analyze_multimodal_gemini(
        self,
        images: Optional[List[ImageInput]],
        documents: Optional[List[DocumentInput]],
        text_context: Optional[str],
        prompt: str,
        temperature: float,
        max_tokens: int,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Gemini multimodal analysis"""
        from google.genai import types
        
        parts = []
        
        # Add text context first
        if text_context:
            parts.append(f"CONTEXT:\n{text_context}\n\n")
        
        # Add prompt
        parts.append(f"INSTRUCTIONS:\n{prompt}\n\n")
        
        # Add images
        if images:
            parts.append("IMAGES TO ANALYZE:")
            for i, img in enumerate(images):
                parts.append(f"\n[Image {i+1}: {img.category}]")
                parts.append(
                    types.Part.from_bytes(
                        data=img.data,
                        mime_type=img.mime_type
                    )
                )
        
        # Add documents
        if documents:
            parts.append("\nDOCUMENTS TO ANALYZE:")
            for i, doc in enumerate(documents):
                parts.append(f"\n[Document {i+1}: {doc.filename}]")
                parts.append(
                    types.Part.from_bytes(
                        data=doc.data,
                        mime_type="application/pdf"
                    )
                )
        
        try:
            config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "response_mime_type": "application/json"
            }
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=parts,
                config=config
            )
            
            return self._parse_json_response(response.text)
            
        except Exception as e:
            print(f"❌ Gemini multimodal error: {e}")
            raise
    
    async def _analyze_multimodal_anthropic(
        self,
        images: Optional[List[ImageInput]],
        documents: Optional[List[DocumentInput]],
        text_context: Optional[str],
        prompt: str,
        temperature: float,
        max_tokens: int,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Claude multimodal analysis"""
        
        content = []
        
        # Add images
        if images:
            for i, img in enumerate(images):
                content.append({
                    "type": "text",
                    "text": f"[Image {i+1}: {img.category}]"
                })
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": img.mime_type,
                        "data": img.to_base64()
                    }
                })
        
        # Add documents (Claude PDF support)
        if documents:
            for i, doc in enumerate(documents):
                content.append({
                    "type": "text",
                    "text": f"[Document {i+1}: {doc.filename}]"
                })
                content.append({
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": doc.to_base64()
                    }
                })
        
        # Add text context and prompt
        full_prompt = ""
        if text_context:
            full_prompt += f"CONTEXT:\n{text_context}\n\n"
        full_prompt += f"INSTRUCTIONS:\n{prompt}"
        
        content.append({
            "type": "text",
            "text": full_prompt
        })
        
        try:
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{
                    "role": "user",
                    "content": content
                }]
            }
            if system_instruction:
                kwargs["system"] = system_instruction

            response = await self.client.messages.create(**kwargs)
            
            return self._parse_json_response(response.content[0].text)
            
        except Exception as e:
            print(f"❌ Claude multimodal error: {e}")
            raise
    
    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Robustly extract JSON from model response text."""
        text = text.strip()
        
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
                
        print(f"❌ Could not extract valid JSON from response: {text[:200]}...")
        return {
            "error": "Failed to parse JSON response",
            "raw_response": text[:1000]
        }
