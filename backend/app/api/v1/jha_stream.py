"""
SSE Streaming endpoint for real-time JHA analysis progress

ARCHITECTURE: Event Log with Replay
- Events are stored in memory for each analysis
- Late-connecting clients receive ALL past events first
- Then continue receiving real-time events
- Logs are cleaned up after completion + TTL
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, List
from dataclasses import dataclass, field
import asyncio
import json
import time

from app.core.deps import get_db

router = APIRouter(prefix="/jha", tags=["jha-stream"])


@dataclass
class AnalysisProgress:
    """Tracks all progress events for an analysis with replay capability."""
    events: List[dict] = field(default_factory=list)  # All events in order
    subscribers: List[asyncio.Queue] = field(default_factory=list)  # Active SSE connections
    created_at: float = field(default_factory=time.time)
    completed: bool = False


# In-memory event logs for each analysis
# Key: analysis_id, Value: AnalysisProgress
progress_logs: Dict[str, AnalysisProgress] = {}

# Cleanup completed logs after 5 minutes
LOG_TTL_SECONDS = 300


def initialize_progress_log(analysis_id: str) -> None:
    """
    Initialize the progress log for an analysis BEFORE starting background task.
    This ensures the log exists when orchestrator starts pushing events.
    """
    if analysis_id not in progress_logs:
        progress_logs[analysis_id] = AnalysisProgress()
        print(f"📊 Progress log initialized for {analysis_id}")


async def push_progress(analysis_id: str, event: dict) -> None:
    """
    Push a progress event to the log and broadcast to all subscribers.
    Called by the orchestrator during pipeline execution.
    
    Events are NEVER lost - they're stored even if no client is connected.
    """
    # Auto-initialize if not exists (fallback for edge cases)
    if analysis_id not in progress_logs:
        initialize_progress_log(analysis_id)
    
    log = progress_logs[analysis_id]
    
    # Add timestamp if not present
    if "timestamp" not in event:
        event["timestamp"] = time.time()
    
    # Append to event log (persistent until cleanup)
    log.events.append(event)
    
    # Mark as completed if this is a terminal event
    if event.get("status") in ["completed", "error", "failed"]:
        log.completed = True
    
    # Broadcast to all active subscribers
    for queue in log.subscribers:
        try:
            await queue.put(event)
        except Exception as e:
            print(f"⚠️ Failed to broadcast SSE event: {e}")
    
    print(f"📤 Event pushed: {event.get('current_agent', 'system')} - {event.get('agent_status', 'unknown')} ({len(log.subscribers)} subscribers)")


async def cleanup_old_logs() -> None:
    """Remove completed logs older than TTL."""
    now = time.time()
    to_remove = []
    
    for analysis_id, log in progress_logs.items():
        if log.completed and (now - log.created_at) > LOG_TTL_SECONDS:
            to_remove.append(analysis_id)
    
    for analysis_id in to_remove:
        del progress_logs[analysis_id]
        print(f"🧹 Cleaned up progress log for {analysis_id}")


@router.get("/stream/{analysis_id}")
async def stream_progress(
    analysis_id: str,
    db = Depends(get_db)
):
    """
    SSE endpoint for real-time progress updates with replay.
    
    Flow:
    1. Check if analysis already completed in DB → send completion immediately
    2. If log exists → replay all past events first
    3. Subscribe to future events
    4. Stream until completion or disconnect
    """
    
    async def event_generator():
        # Cleanup old logs periodically
        await cleanup_old_logs()
        
        # Create subscriber queue
        queue = asyncio.Queue()
        
        # Send initial connection event
        yield f"data: {json.dumps({'status': 'connected', 'analysis_id': analysis_id})}\n\n"
        
        # STEP 1: Check DB for already-completed analysis
        try:
            from app.models.analysis import AnalysisHistory
            from sqlalchemy import select
            
            result = await db.execute(
                select(AnalysisHistory).where(AnalysisHistory.id == analysis_id)
            )
            record = result.scalar_one_or_none()
            
            if record and record.response:
                # Check if response contains actual analysis (not just "queued" status)
                try:
                    response_data = json.loads(record.response)
                    if response_data.get("status") != "queued" and "agent_outputs" in response_data:
                        # Analysis is truly complete
                        completed_event = {
                            "status": "completed",
                            "current_agent": "completed",
                            "agent_status": "done",
                            "progress": 100,
                            "elapsed_ms": 0
                        }
                        yield f"data: {json.dumps(completed_event)}\n\n"
                        return
                except json.JSONDecodeError:
                    pass
                    
        except Exception as e:
            print(f"⚠️ Failed to check initial DB status: {e}")
        
        # STEP 2: Replay past events if log exists
        if analysis_id in progress_logs:
            log = progress_logs[analysis_id]
            
            # Replay all past events
            for event in log.events:
                yield f"data: {json.dumps(event)}\n\n"
                # Small delay to prevent flooding
                await asyncio.sleep(0.05)
            
            # If already completed, we're done
            if log.completed:
                return
            
            # Subscribe for future events
            log.subscribers.append(queue)
            print(f"📡 Client subscribed to {analysis_id} (replayed {len(log.events)} events)")
        else:
            # No log yet - create one and subscribe
            # This handles edge case where client connects before initialize_progress_log is called
            initialize_progress_log(analysis_id)
            progress_logs[analysis_id].subscribers.append(queue)
            print(f"📡 Client subscribed to {analysis_id} (no events yet)")
        
        # STEP 3: Stream real-time events
        try:
            while True:
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
            # Unsubscribe
            if analysis_id in progress_logs:
                try:
                    progress_logs[analysis_id].subscribers.remove(queue)
                except ValueError:
                    pass
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
