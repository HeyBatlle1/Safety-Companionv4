import os
import certifi

# Fix for macOS SSL certificate issues - must be at the very top
os.environ['SSL_CERT_FILE'] = certifi.where()
print(f"🔒 SSL Certificates configured: {certifi.where()}")

from fastapi import FastAPI, Depends, BackgroundTasks, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.api.v1.jha import router as jha_router, analyze_checklist
from app.api.v1.admin import router as admin_router
from app.api.v1.jha_suggestions import router as suggestions_router
from app.api.v1.weather import router as weather_router
from app.api.v1.jha_stream import router as jha_stream_router
from app.api.v1.reports import router as reports_router
from app.api.v1.jha_vision import router as vision_router
from app.api.v1.eap import router as eap_router
from app.api.v1.users import router as users_router
from app.schemas.jha import JHAAnalysisRequest
from app.core.deps import get_jha_service, get_db
from app.services.jha_service import JHAService
import traceback

settings = get_settings()


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    description="Safety Companion API - Python Backend with Multi-Agent JHA Analysis",
    version="3.0.0"
)


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    try:
        print("🚀 Starting database initialization...")
        from app.core.database import init_db
        await init_db()
        print("✅ Startup complete!")
    except Exception as e:
        print(f"❌ STARTUP FAILED: {e}")
        print(f"❌ TRACEBACK: {traceback.format_exc()}")
        # Don't re-raise - let the app start anyway so we can see health endpoint
        # raise

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware - Secure configuration for production
# Allow specific deployments and custom domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        *settings.cors_origins,
        "https://safety-compv3-gzvb.vercel.app",  # Vercel deployment
        "https://www.safebase3.com",  # Custom domain (www)
        "https://safebase3.com",  # Custom domain (root)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Length", "X-Request-ID"],
    max_age=600,  # Cache preflight for 10 minutes
)

# Include API routes
app.include_router(jha_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(suggestions_router, prefix="/api/v1/jha", tags=["jha-suggestions"])
app.include_router(weather_router, prefix="/api/v1", tags=["weather"])
app.include_router(jha_stream_router, prefix="/api/v1", tags=["jha-stream"])
app.include_router(reports_router, prefix="/api/v1", tags=["reports"])
app.include_router(vision_router, prefix="/api/v1", tags=["jha-vision"])
app.include_router(eap_router, prefix="/api/v1", tags=["eap"])
app.include_router(users_router, prefix="/api/v1", tags=["users"])


# Legacy compatibility routes for old frontend
app.include_router(jha_router, prefix="/api", tags=["legacy"])


# Global exception handler to ensure errors return JSON with CORS headers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return JSON"""
    status_code = 500
    detail = str(exc)
    
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        detail = exc.detail
    elif not settings.debug:
        detail = "Internal Server Error"

    print(f"[GLOBAL ERROR] {request.url} - {status_code} - {str(exc)}")
    if status_code == 500:
        print(f"[TRACEBACK] {traceback.format_exc()}")
    
    # Determine allow origin from request to be dynamic but safe
    origin = request.headers.get("origin", "*")
    allowed_origins = [
        *settings.cors_origins,
        "https://www.safebase3.com",
        "https://safebase3.com",
        "https://safety-compv3-gzvb.vercel.app"
    ]
    if origin not in allowed_origins:
        # If not in allowed list, fallback to first allowed or *
        origin = allowed_origins[0] if allowed_origins else "*"

    return JSONResponse(
        status_code=status_code,
        content={"detail": detail, "path": str(request.url)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

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
            "ai_integration": "ready (x-ai/grok-4.1-fast via OpenRouter)",
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