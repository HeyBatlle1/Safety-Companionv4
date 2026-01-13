"""
SSE Streaming endpoint for real-time JHA analysis progress
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import Dict
import asyncio
import json

from app.core.deps import get_db

router = APIRouter(prefix="/jha", tags=["jha-stream"])

# In-memory event queues for each analysis
# Key: analysis_id, Value: asyncio.Queue
progress_queues: Dict[str, asyncio.Queue] = {}


async def push_progress(analysis_id: str, event: dict):
    """
    Push a progress event to the SSE stream for a specific analysis.
    Called by the orchestrator during pipeline execution.
    """
    if analysis_id in progress_queues:
        try:
            await progress_queues[analysis_id].put(event)
        except Exception as e:
            print(f"⚠️ Failed to push SSE event: {e}")


@router.get("/stream/{analysis_id}")
async def stream_progress(
    analysis_id: str,
    db = Depends(get_db)
):
    """
    SSE endpoint for real-time progress updates.
    
    Connect with EventSource in browser:
    const es = new EventSource('/api/v1/jha/stream/{analysis_id}');
    es.onmessage = (e) => console.log(JSON.parse(e.data));
    """
    
    async def event_generator():
        # Create queue for this analysis
        queue = asyncio.Queue()
        progress_queues[analysis_id] = queue
        
        # Send initial connection event
        yield f"data: {json.dumps({'status': 'connected', 'analysis_id': analysis_id})}\n\n"
        
        # CRITICAL FIX: Check DB immediately for existing status
        # This prevents "reset to 0%" on page reload or reconnection
        try:
            from app.models.analysis import AnalysisHistory
            from sqlalchemy import select
            
            result = await db.execute(
                select(AnalysisHistory).where(AnalysisHistory.id == analysis_id)
            )
            record = result.scalar_one_or_none()
            
            if record and record.response:
                # Analysis already has a response -> it is COMPLETED
                completed_event = {
                    "status": "completed",
                    "current_agent": "completed",
                    "agent_status": "done",
                    "progress": 100,
                    "elapsed_ms": 0  # Not tracked in DB, acceptable for catch-up
                }
                yield f"data: {json.dumps(completed_event)}\n\n"
                
                # Cleanup and exit immediately - no need to listen
                progress_queues.pop(analysis_id, None)
                return
                
        except Exception as e:
            print(f"⚠️ Failed to check initial DB status: {e}")
            # Continue to listener fallback
        
        try:
            while True:
                # Wait for next event with 120s timeout
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=120.0)
                    yield f"data: {json.dumps(event)}\n\n"
                    
                    # Close stream when analysis completes or errors
                    if event.get("status") in ["completed", "error", "failed"]:
                        break
                        
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield f"data: {json.dumps({'status': 'keepalive'})}\n\n"
                    
        except asyncio.CancelledError:
            # Client disconnected
            pass
        finally:
            # Clean up queue
            progress_queues.pop(analysis_id, None)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )
