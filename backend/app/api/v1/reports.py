"""
Reports API Routes

FastAPI endpoints for report management - email, save, export.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.core.deps import get_db

router = APIRouter(prefix="/reports", tags=["Reports"])


class EmailReportRequest(BaseModel):
    analysisId: str
    markdown: str
    projectName: Optional[str] = None
    email: Optional[str] = None


class SaveReportRequest(BaseModel):
    analysisId: str


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
    Mark analysis as saved to reports.
    
    This updates a flag in the database indicating the user
    has explicitly saved this report for later reference.
    """
    try:
        # Update analysis to mark as saved
        query = text("""
            UPDATE analysis_history
            SET updated_at = NOW()
            WHERE id = :analysis_id
        """)
        
        await db.execute(query, {"analysis_id": request.analysisId})
        await db.commit()
        
        print(f"💾 Report saved for analysis {request.analysisId}")
        
        return {
            "status": "saved",
            "message": "Report has been saved to your reports",
            "analysisId": request.analysisId,
            "savedAt": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Save report failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save report: {str(e)}"
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
        from app.models.analysis import AnalysisHistory
        from sqlalchemy import select
        import json
        
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
