"""
Vision/Multimodal JHA Update API

Endpoints for:
- Processing photos of equipment, PPE, site conditions
- Analyzing shop drawings and documents
- Synthesizing multimodal updates into JHA
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from app.services.vision_client import VisionClient, VisionProvider, ImageInput, DocumentInput
from app.agents.profiles.agent_5_vision_analyzer import Agent5VisionAnalyzer

router = APIRouter(prefix="/jha/vision", tags=["JHA Vision"])


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ImageData(BaseModel):
    """Base64 encoded image with metadata"""
    data: str  # Base64 encoded image
    mime_type: str = "image/jpeg"
    category: str = "general"  # site, equipment, ppe, materials
    filename: Optional[str] = None


class DocumentData(BaseModel):
    """Base64 encoded document"""
    data: str  # Base64 encoded PDF
    filename: str = "document.pdf"


class VisionUpdateRequest(BaseModel):
    """Request for multimodal JHA update"""
    jha_id: Optional[str] = None
    text_update: str
    images: Optional[List[ImageData]] = None
    documents: Optional[List[DocumentData]] = None
    existing_context: Optional[str] = None
    provider: str = "google"  # google or anthropic


class SingleImageAnalysisRequest(BaseModel):
    """Request for single image analysis"""
    image: ImageData
    analysis_type: str = "site"  # site, equipment, ppe, materials
    context: str = "Construction site"
    provider: str = "google"


class VisionAnalysisResponse(BaseModel):
    """Response from vision analysis"""
    success: bool
    analysis_type: str
    provider: str
    model: str
    analyzed_at: str
    findings: Dict[str, Any]
    critical_actions: List[Dict[str, Any]]
    hazard_count: Dict[str, int]
    recommended_decision: str
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/analyze")
async def analyze_vision_update(request: VisionUpdateRequest) -> VisionAnalysisResponse:
    """
    Comprehensive multimodal analysis of JHA update.
    
    Analyzes text, images, and documents together to create
    a complete picture of site conditions.
    
    ### Request Body:
    - **jha_id**: Optional reference to existing JHA
    - **text_update**: Natural language update (e.g., "Adding glass install, spider crane")
    - **images**: List of base64 encoded images with categories
    - **documents**: List of base64 encoded PDFs (shop drawings, etc.)
    - **provider**: "google" (Gemini) or "anthropic" (Claude)
    
    ### Categories for images:
    - `site` - Site overview, general conditions
    - `equipment` - Cranes, lifts, tools
    - `ppe` - Harnesses, hard hats, safety gear
    - `materials` - Material storage, staging
    
    ### Returns:
    Complete analysis with hazards, actions, and GO/NO-GO recommendation.
    """
    try:
        # Select provider
        provider = VisionProvider.ANTHROPIC if request.provider == "anthropic" else VisionProvider.GOOGLE
        
        # Initialize Agent 5
        agent = Agent5VisionAnalyzer(provider=provider)
        
        # Convert images
        images = None
        if request.images:
            images = [
                ImageInput.from_base64(
                    b64_string=img.data,
                    mime_type=img.mime_type,
                    category=img.category
                )
                for img in request.images
            ]
        
        # Convert documents
        documents = None
        if request.documents:
            documents = [
                DocumentInput.from_base64(
                    b64_string=doc.data,
                    filename=doc.filename
                )
                for doc in request.documents
            ]
        
        # Run comprehensive analysis
        result = await agent.analyze_full_update(
            text_update=request.text_update,
            images=images,
            documents=documents,
            existing_jha_context=request.existing_context
        )
        
        synthesis = result.get("synthesis", {})
        
        return VisionAnalysisResponse(
            success=True,
            analysis_type="multimodal_update",
            provider=request.provider,
            model="gemini-2.0-flash" if provider == VisionProvider.GOOGLE else "claude-sonnet-4",
            analyzed_at=result.get("update_received_at", datetime.utcnow().isoformat()),
            findings=result.get("analyses", {}),
            critical_actions=synthesis.get("critical_actions", []),
            hazard_count=synthesis.get("hazard_summary", {}),
            recommended_decision=synthesis.get("recommended_decision", "PENDING")
        )
        
    except Exception as e:
        print(f"❌ Vision analysis error: {e}")
        return VisionAnalysisResponse(
            success=False,
            analysis_type="multimodal_update",
            provider=request.provider,
            model="unknown",
            analyzed_at=datetime.utcnow().isoformat(),
            findings={},
            critical_actions=[],
            hazard_count={},
            recommended_decision="ERROR",
            error=str(e)
        )


@router.post("/analyze/image")
async def analyze_single_image(request: SingleImageAnalysisRequest) -> Dict[str, Any]:
    """
    Analyze a single image for safety concerns.
    
    ### Analysis Types:
    - `site` - Detect hazards, unsafe conditions, housekeeping
    - `equipment` - Inspect equipment condition, compliance, certifications
    - `ppe` - Check PPE condition, expiration, compliance
    - `materials` - Assess storage safety, organization
    
    ### Returns:
    Detailed analysis specific to the category.
    """
    try:
        provider = VisionProvider.ANTHROPIC if request.provider == "anthropic" else VisionProvider.GOOGLE
        agent = Agent5VisionAnalyzer(provider=provider)
        
        image = ImageInput.from_base64(
            b64_string=request.image.data,
            mime_type=request.image.mime_type,
            category=request.analysis_type
        )
        
        if request.analysis_type == "equipment":
            result = await agent.analyze_equipment(image, request.context)
        elif request.analysis_type == "ppe":
            result = await agent.analyze_ppe([image], request.context)
        elif request.analysis_type == "materials":
            result = await agent.analyze_materials(image, request.context)
        else:  # Default to site
            result = await agent.analyze_site(image, request.context)
        
        return {
            "success": True,
            "analysis_type": request.analysis_type,
            "provider": request.provider,
            "result": result
        }
        
    except Exception as e:
        print(f"❌ Image analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/document")
async def analyze_document(
    document: UploadFile = File(...),
    context: str = Form("Construction shop drawings"),
    provider: str = Form("google")
) -> Dict[str, Any]:
    """
    Analyze a PDF document (shop drawings, task list, etc.)
    
    Extracts:
    - Dimensions and weights
    - Installation methods
    - Load requirements
    - Safety specifications
    
    Maps to OSHA requirements.
    """
    try:
        # Read file
        content = await document.read()
        doc_input = DocumentInput(data=content, filename=document.filename)
        
        # Select provider
        prov = VisionProvider.ANTHROPIC if provider == "anthropic" else VisionProvider.GOOGLE
        agent = Agent5VisionAnalyzer(provider=prov)
        
        result = await agent.analyze_document(doc_input, context)
        
        return {
            "success": True,
            "analysis_type": "document_extraction",
            "filename": document.filename,
            "provider": provider,
            "result": result
        }
        
    except Exception as e:
        print(f"❌ Document analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/ppe-batch")
async def analyze_ppe_batch(
    images: List[UploadFile] = File(...),
    task_context: str = Form("Construction work"),
    required_ppe: str = Form("Hard hat, safety glasses, harness, gloves, high-vis"),
    provider: str = Form("google")
) -> Dict[str, Any]:
    """
    Analyze multiple PPE items at once.
    
    Upload photos of each crew member's PPE.
    Returns pass/concern/fail rating for each item.
    
    Detects:
    - Expired inspection tags
    - Fraying straps
    - Damaged hardware
    - Missing components
    """
    try:
        # Convert uploaded files to ImageInputs
        image_inputs = []
        for img_file in images:
            content = await img_file.read()
            image_inputs.append(
                ImageInput(
                    data=content,
                    mime_type=img_file.content_type or "image/jpeg",
                    category="ppe",
                    filename=img_file.filename
                )
            )
        
        prov = VisionProvider.ANTHROPIC if provider == "anthropic" else VisionProvider.GOOGLE
        agent = Agent5VisionAnalyzer(provider=prov)
        
        result = await agent.analyze_ppe(
            images=image_inputs,
            task_context=task_context,
            required_ppe=required_ppe
        )
        
        return {
            "success": True,
            "analysis_type": "ppe_batch_inspection",
            "images_analyzed": len(images),
            "provider": provider,
            "result": result
        }
        
    except Exception as e:
        print(f"❌ PPE batch analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_vision_capabilities() -> Dict[str, Any]:
    """
    Returns available vision analysis capabilities.
    """
    return {
        "providers": {
            "google": {
                "name": "Google Gemini 2.0 Flash",
                "model": "gemini-2.0-flash",
                "capabilities": ["image", "pdf", "multimodal"],
                "recommended_for": "development, cost-effective"
            },
            "anthropic": {
                "name": "Anthropic Claude Sonnet 4",
                "model": "claude-sonnet-4-20250514",
                "capabilities": ["image", "pdf", "multimodal"],
                "recommended_for": "production, highest accuracy"
            }
        },
        "analysis_types": {
            "site": {
                "description": "Detect hazards in site photos",
                "detects": ["fall hazards", "struck-by hazards", "electrical hazards", "housekeeping"]
            },
            "equipment": {
                "description": "Inspect equipment condition and compliance",
                "detects": ["damage", "wear", "certifications", "setup issues"]
            },
            "ppe": {
                "description": "Check PPE condition and expiration",
                "detects": ["expired tags", "fraying", "damage", "missing components"]
            },
            "materials": {
                "description": "Assess material storage safety",
                "detects": ["stability", "protection", "access", "hazmat"]
            },
            "document": {
                "description": "Extract specs from shop drawings",
                "extracts": ["dimensions", "weights", "methods", "requirements"]
            }
        },
        "image_formats": ["image/jpeg", "image/png", "image/webp", "image/gif"],
        "document_formats": ["application/pdf"],
        "max_images_per_request": 10,
        "max_document_size_mb": 20
    }
