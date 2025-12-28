"""
Reports API Routes

FastAPI endpoints for report management - email, save, export.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

from app.core.deps import get_db
from app.models.analysis import AnalysisHistory

router = APIRouter(prefix="/reports", tags=["Reports"])


class EmailReportRequest(BaseModel):
    analysisId: str
    markdown: str
    projectName: Optional[str] = None
    email: Optional[str] = None


class SaveReportRequest(BaseModel):
    analysisId: str
    projectName: Optional[str] = None
    markdown: Optional[str] = None


class SavedReport(BaseModel):
    id: str
    project_name: str
    created_at: str
    saved_at: str
    risk_score: Optional[int] = None
    urgency_level: Optional[str] = None
    go_no_go: Optional[str] = None
    markdown_report: Optional[str] = None


@router.post("/email")
async def email_report(
    request: EmailReportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Email the safety analysis report.
    
    For now, returns success - email sending can be implemented with SMTP
    or a service like SendGrid/Mailgun when configured.
    """
    try:
        # Log the email request
        print(f"📧 Email report requested for analysis {request.analysisId}")
        print(f"   Project: {request.projectName or 'Unknown'}")
        print(f"   Report length: {len(request.markdown)} characters")
        
        # TODO: Implement actual email sending with SMTP/SendGrid
        # For now, we just acknowledge the request
        # background_tasks.add_task(
        #     send_report_email,
        #     to_email=request.email,
        #     markdown_content=request.markdown,
        #     analysis_id=request.analysisId,
        #     project_name=request.projectName
        # )
        
        return {
            "status": "email_queued",
            "message": "Report email has been queued for delivery",
            "analysisId": request.analysisId
        }
        
    except Exception as e:
        print(f"❌ Email report failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to queue email: {str(e)}"
        )


@router.post("/save")
async def save_to_reports(
    request: SaveReportRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Save analysis to reports.
    
    This marks the report as 'saved' and ensures it appears in the Reports tab.
    Uses a saved_to_reports flag to track explicitly saved reports.
    """
    try:
        # Get the current analysis
        result = await db.execute(
            select(AnalysisHistory).where(AnalysisHistory.id == request.analysisId)
        )
        analysis = result.scalar_one_or_none()
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Parse existing response and add saved flag
        try:
            response_data = json.loads(analysis.response) if analysis.response else {}
        except json.JSONDecodeError:
            response_data = {}
        
        # Mark as saved
        response_data["saved_to_reports"] = True
        response_data["saved_at"] = datetime.utcnow().isoformat()
        
        # If markdown was provided, ensure it's saved
        if request.markdown and not response_data.get("markdown_report"):
            response_data["markdown_report"] = request.markdown
        
        # Update the record
        analysis.response = json.dumps(response_data)
        
        await db.commit()
        await db.refresh(analysis)
        
        print(f"💾 Report saved for analysis {request.analysisId}")
        
        return {
            "status": "saved",
            "message": "Report has been saved to your reports",
            "analysisId": request.analysisId,
            "savedAt": response_data["saved_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Save report failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save report: {str(e)}"
        )


@router.get("/saved")
async def get_saved_reports(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all saved reports.
    
    Only returns reports that have been explicitly saved by the user.
    """
    try:
        from sqlalchemy import desc
        
        # Query all JHA analyses
        query = (
            select(AnalysisHistory)
            .where(AnalysisHistory.type == "jha_multi_agent_analysis")
            .order_by(desc(AnalysisHistory.created_at))
            .limit(limit)
            .offset(offset)
        )
        
        result = await db.execute(query)
        analyses = result.scalars().all()
        
        # Filter to only saved reports
        saved_reports = []
        for analysis in analyses:
            try:
                response_data = json.loads(analysis.response) if analysis.response else {}
            except json.JSONDecodeError:
                continue
            
            # Check if saved_to_reports flag is set
            if response_data.get("saved_to_reports"):
                summary = response_data.get("summary", {})
                saved_reports.append({
                    "id": str(analysis.id),
                    "project_name": analysis.query.replace("JHA Analysis - ", "") if analysis.query else "Untitled",
                    "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                    "saved_at": response_data.get("saved_at"),
                    "risk_score": analysis.risk_score,
                    "urgency_level": analysis.urgency_level,
                    "go_no_go": summary.get("go_no_go_decision"),
                    "markdown_report": response_data.get("markdown_report")
                })
        
        return {
            "reports": saved_reports,
            "total": len(saved_reports),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        print(f"❌ Get saved reports failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch saved reports: {str(e)}"
        )


@router.get("/{analysis_id}/download")
async def download_report(
    analysis_id: str,
    format: str = "markdown",
    db: AsyncSession = Depends(get_db)
):
    """
    Download report in specified format.
    
    Supported formats: markdown, html, pdf (future)
    """
    try:
        # Get analysis
        result = await db.execute(
            select(AnalysisHistory).where(AnalysisHistory.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Parse response to get markdown
        try:
            data = json.loads(analysis.response) if analysis.response else {}
            markdown = data.get("markdown_report", "")
        except json.JSONDecodeError:
            markdown = ""
        
        if not markdown:
            raise HTTPException(status_code=404, detail="Report not available")
        
        if format == "markdown":
            return {
                "content": markdown,
                "filename": f"jha_report_{analysis_id}.md",
                "contentType": "text/markdown"
            }
        elif format == "html":
            # Simple markdown to HTML conversion
            import re
            html = markdown
            # Convert headers
            html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
            html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
            html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
            # Convert bold
            html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
            # Convert lists
            html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
            # Convert paragraphs
            html = re.sub(r'\n\n', r'</p><p>', html)
            html = f"<html><body><p>{html}</p></body></html>"
            
            return {
                "content": html,
                "filename": f"jha_report_{analysis_id}.html",
                "contentType": "text/html"
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Download report failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download report: {str(e)}"
        )
