"""
Embedding Service - Google Gemini Integration
Uses gemini-embedding-001 (768 dimensions) for semantic search over safety data.
NO OPENAI - Google's embeddings API.
"""

import logging
from typing import List, Optional, Dict, Any
import numpy as np
import os
from functools import lru_cache
import google.generativeai as genai

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Handles embedding generation for JHAs, hazards, and Swiss Cheese chains.
    
    Model: gemini-embedding-001
    - Dimensions: 768
    - Provider: Google AI
    - Speed: Fast API-based encoding
    - Cost: FREE (up to quota)
    """
    
    _instance = None
    _model_name = "models/embedding-001"
    _api_configured = False
    
    def __new__(cls):
        """Singleton pattern - one client instance per process."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize Gemini API client."""
        if not self._api_configured:
            self._configure_api()
    
    @classmethod
    def _configure_api(cls):
        """Configure Google Gemini API once per process."""
        if not cls._api_configured:
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY environment variable not set")
            
            genai.configure(api_key=api_key)
            cls._api_configured = True
            logger.info(f"Gemini API configured. Model: {cls._model_name}")
    
    def encode_text(self, text: str) -> List[float]:
        """
        Generate embedding for single text.
        
        Args:
            text: Input text (JHA description, hazard, etc.)
        
        Returns:
            768-dimensional embedding vector
        """
        if not text or not text.strip():
            raise ValueError("Cannot encode empty text")
        
        try:
            # Generate embedding via Gemini API
            result = genai.embed_content(
                model=self._model_name,
                content=text,
                task_type="retrieval_document"
            )
            
            return result['embedding']
            
        except Exception as e:
            logger.error(f"Encoding failed: {e}")
            raise
    
    def encode_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.
        
        Args:
            texts: List of input texts
            batch_size: Number of texts to encode at once (Gemini supports up to 100)
        
        Returns:
            List of 768-dimensional embedding vectors
        """
        if not texts:
            return []
        
        # Filter empty texts
        valid_texts = [t for t in texts if t and t.strip()]
        if not valid_texts:
            raise ValueError("No valid texts to encode")
        
        try:
            # Process in batches
            all_embeddings = []
            for i in range(0, len(valid_texts), batch_size):
                batch = valid_texts[i:i+batch_size]
                
                # Batch embed via Gemini API
                result = genai.embed_content(
                    model=self._model_name,
                    content=batch,
                    task_type="retrieval_document"
                )
                
                all_embeddings.extend(result['embedding'])
            
            return all_embeddings
            
        except Exception as e:
            logger.error(f"Batch encoding failed: {e}")
            raise
    
    def encode_jha_analysis(self, analysis_data: Dict[str, Any]) -> str:
        """
        Create searchable text from JHA analysis for embedding.
        
        Combines key fields into single text for semantic search:
        - Job description
        - Work type  
        - Equipment
        - Hazards identified
        - Control measures
        
        Args:
            analysis_data: Full JHA analysis dict from analysis_history
        
        Returns:
            Concatenated text for embedding
        """
        parts = []
        
        # Job info
        job_info = analysis_data.get("jobInfo", {})
        if desc := job_info.get("jobDescription"):
            parts.append(f"Job: {desc}")
        if work_type := job_info.get("workType"):
            parts.append(f"Work Type: {work_type}")
        if equipment := job_info.get("equipment"):
            parts.append(f"Equipment: {equipment}")
        
        # Hazards
        hazards = analysis_data.get("hazards", [])
        if hazards:
            hazard_descs = [h.get("description", "") for h in hazards]
            parts.append(f"Hazards: {'; '.join(hazard_descs)}")
        
        # Controls
        controls = analysis_data.get("controls", [])
        if controls:
            control_descs = [c.get("description", "") for c in controls]
            parts.append(f"Controls: {'; '.join(control_descs)}")
        
        return " | ".join(parts)
    
    def encode_swiss_cheese_chain(self, causal_chain: List[Dict[str, Any]]) -> str:
        """
        Create searchable text from Swiss Cheese causal chain.
        
        Args:
            causal_chain: 6-stage chain from Agent 3
        
        Returns:
            Concatenated text capturing incident pattern
        """
        parts = []
        
        for stage in causal_chain:
            stage_name = stage.get("stage", "")
            description = stage.get("description", "")
            
            if stage_name and description:
                parts.append(f"{stage_name}: {description}")
        
        return " | ".join(parts)
    
    def encode_incident(self, incident_data: Dict[str, Any]) -> str:
        """
        Create searchable text from incident for pattern matching.
        
        Args:
            incident_data: Incident prediction from Agent 3
        
        Returns:
            Concatenated text for semantic search
        """
        parts = []
        
        # Incident name/type
        if name := incident_data.get("incidentName"):
            parts.append(f"Incident: {name}")
        
        # Swiss Cheese chain
        if chain := incident_data.get("causalChain"):
            parts.append(self.encode_swiss_cheese_chain(chain))
        
        # Leading indicators
        indicators = incident_data.get("leadingIndicators", [])
        if indicators:
            indicator_texts = [ind.get("indicator", "") for ind in indicators]
            parts.append(f"Indicators: {'; '.join(indicator_texts)}")
        
        return " | ".join(parts)
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.
        
        Args:
            vec1, vec2: Embedding vectors
        
        Returns:
            Similarity score (0-1, higher = more similar)
        """
        a = np.array(vec1)
        b = np.array(vec2)
        
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return float(dot_product / (norm_a * norm_b))
    
    def get_model_info(self) -> Dict[str, Any]:
        """Return model metadata for debugging."""
        return {
            "model_name": self._model_name,
            "dimensions": 768,
            "provider": "Google Gemini",
            "configured": self._api_configured
        }


# Global singleton instance
embedding_service = EmbeddingService()
