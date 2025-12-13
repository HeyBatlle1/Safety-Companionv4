from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.agents.adapters.google import GoogleGeminiAdapter
from app.core.config import get_settings
import json

router = APIRouter()

class HazardSuggestionsRequest(BaseModel):
    work_type: str
    location: str
    hazard_categories: list[str]

class HazardSuggestion(BaseModel):
    hazard: str
    severity: str
    category: str

@router.post("/ai-suggestions")
async def generate_hazard_suggestions(
    request: HazardSuggestionsRequest,
    settings = Depends(get_settings)
):
    """Generate AI-suggested specific hazards based on job context"""
    
    if not settings.gemini_api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    prompt = f"""You are a safety expert analyzing a construction job. Based on this context:

Work Type: {request.work_type}
Location: {request.location}
General Hazard Categories: {', '.join(request.hazard_categories)}

Generate 5-8 SPECIFIC, actionable hazards for this exact scenario. Consider:
- The specific work type and tasks involved
- Environmental conditions in {request.location}
- Common incidents for this type of work
- OSHA regulations for this work category

Return ONLY a JSON array with this exact format:
[
  {{"hazard": "Specific hazard description", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "category": "fall|struck-by|caught-between|electrical|weather|other"}},
  ...
]

Example for "Glazing Curtainwall" in "Alaska" with "fall, weather" hazards:
[
  {{"hazard": "Fall from height during panel installation in high winds", "severity": "CRITICAL", "category": "fall"}},
  {{"hazard": "Hypothermia from prolonged cold exposure", "severity": "HIGH", "category": "weather"}},
  {{"hazard": "Struck by falling glass panels in wind gusts", "severity": "CRITICAL", "category": "struck-by"}},
  {{"hazard": "Ice accumulation on scaffolding creating slip hazards", "severity": "HIGH", "category": "fall"}},
  {{"hazard": "Reduced dexterity with cold weather gloves affecting tool control", "severity": "MEDIUM", "category": "other"}}
]

Generate suggestions now:"""
    
    try:
        adapter = GoogleGeminiAdapter(
            api_key=settings.gemini_api_key,
            model="gemini-2.5-flash"
        )
        
        result = await adapter.generate(
            prompt=prompt,
            temperature=0.3,
            max_tokens=2000
        )
        
        # Parse JSON from response
        suggestions_text = result.get("text", "[]")
        
        # Clean up markdown code blocks if present
        if "```json" in suggestions_text:
            suggestions_text = suggestions_text.split("```json")[1].split("```")[0].strip()
        elif "```" in suggestions_text:
            suggestions_text = suggestions_text.split("```")[1].split("```")[0].strip()
        
        suggestions = json.loads(suggestions_text)
        
        return {"suggestions": suggestions}
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate suggestions: {str(e)}"
        )
