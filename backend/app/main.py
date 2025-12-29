from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.api.v1.jha import router as jha_router, analyze_checklist
from app.api.v1.admin import router as admin_router
from app.api.v1.jha_suggestions import router as suggestions_router
from app.api.v1.weather import router as weather_router
from app.api.v1.jha_stream import router as jha_stream_router
from app.api.v1.reports import router as reports_router
from app.api.v1.jha_vision import router as vision_router
from app.schemas.jha import JHAAnalysisRequest
from app.core.deps import get_jha_service, get_db
from app.services.jha_service import JHAService

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    description="Safety Companion API - Python Backend with Multi-Agent JHA Analysis",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(jha_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(suggestions_router, prefix="/api/v1/jha", tags=["jha-suggestions"])
app.include_router(weather_router, prefix="/api/v1", tags=["weather"])
app.include_router(jha_stream_router, prefix="/api/v1", tags=["jha-stream"])
app.include_router(reports_router, prefix="/api/v1", tags=["reports"])
app.include_router(vision_router, prefix="/api/v1", tags=["jha-vision"])


# Legacy compatibility routes for old frontend
app.include_router(jha_router, prefix="/api", tags=["legacy"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Safety Companion API",
        "status": "online",
        "version": "3.0.0",
        "features": [
            "5-agent JHA analysis pipeline",
            "OSHA-compliant risk assessment",
            "Swiss Cheese incident prediction",
            "Multimodal vision analysis (Agent 5)",
            "Real-time safety alerts"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "safety-companion-api",
        "version": "3.0.0",
        "agents": {
            "orchestration": "ready",
            "gemini_integration": "ready",
            "database": "ready"
        }
    }

@app.post("/api/jha-update")
async def legacy_jha_update(
    request: JHAAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    jha_service: JHAService = Depends(get_jha_service)
):
    """Legacy endpoint for old frontend - redirects to new analyze"""
    return await analyze_checklist(request, background_tasks, db, jha_service)