"""
Admin API Endpoints

Administrative endpoints for agent configuration management.
Requires admin privileges for access.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, func, text
from sqlalchemy.orm import selectinload
import json
import logging

from app.core.deps import get_db
from app.models.agent_config import AgentConfiguration, AgentPerformanceLog, DEFAULT_AGENT_CONFIGS
from app.schemas.agent_config import (
    AgentConfigCreate,
    AgentConfigUpdate,
    AgentConfigResponse,
    AgentTestRequest,
    AgentTestResponse,
    AgentStatusResponse,
    BulkConfigUpdateRequest,
    AgentPerformanceResponse,
    AVAILABLE_MODELS
)

from app.core.auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin - Agent Configuration"])


@router.get("/agent-config", response_model=AgentStatusResponse)
async def get_agent_configurations(
    current_user: Any = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all agent configurations for the current user.
    Creates default configurations if none exist.
    """
    user_id = current_user.id

    # Get existing configurations
    result = await db.execute(
        select(AgentConfiguration)
        .where(AgentConfiguration.user_id == user_id)
        .order_by(AgentConfiguration.agent_name)
    )
    configs = list(result.scalars())

    # If no configurations exist, create defaults
    if not configs:
        configs = await _create_default_configs(db, user_id)

    # Calculate stats
    active_count = sum(1 for config in configs if config.is_active)
    last_execution = max((config.last_used_at for config in configs if config.last_used_at), default=None)

    # Format available models for frontend
    available_models = [
        {"value": model["value"], "label": model["label"], "description": model["description"]}
        for model in AVAILABLE_MODELS
    ]

    return AgentStatusResponse(
        agents=[AgentConfigResponse.from_orm(config) for config in configs],
        total_agents=len(configs),
        active_agents=active_count,
        last_execution=last_execution,
        available_models=available_models
    )


@router.post("/agent-config", response_model=AgentConfigResponse)
async def create_or_update_agent_config(
    config_data: AgentConfigCreate,
    current_user: Any = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update a single agent configuration.
    """
    user_id = current_user.id

    # Check if configuration already exists
    result = await db.execute(
        select(AgentConfiguration)
        .where(
            and_(
                AgentConfiguration.user_id == user_id,
                AgentConfiguration.agent_name == config_data.agent_name
            )
        )
    )
    existing_config = result.scalar_one_or_none()

    if existing_config:
        # Update existing configuration
        for field, value in config_data.dict(exclude_unset=True).items():
            setattr(existing_config, field, value)
        existing_config.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(existing_config)
        return AgentConfigResponse.from_orm(existing_config)
    else:
        # Create new configuration
        new_config = AgentConfiguration(
            user_id=user_id,
            **config_data.dict()
        )
        db.add(new_config)
        await db.commit()
        await db.refresh(new_config)
        return AgentConfigResponse.from_orm(new_config)


@router.put("/agent-config/bulk", response_model=List[AgentConfigResponse])
async def bulk_update_agent_configs(
    bulk_request: BulkConfigUpdateRequest,
    current_user: Any = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update multiple agent configurations at once.
    """
    user_id = current_user.id
    updated_configs = []

    for config_data in bulk_request.configs:
        # Check if configuration exists
        result = await db.execute(
            select(AgentConfiguration)
            .where(
                and_(
                    AgentConfiguration.user_id == user_id,
                    AgentConfiguration.agent_name == config_data.agent_name
                )
            )
        )
        existing_config = result.scalar_one_or_none()

        if existing_config:
            # Update existing
            for field, value in config_data.dict(exclude_unset=True).items():
                setattr(existing_config, field, value)
            existing_config.updated_at = datetime.utcnow()
            updated_configs.append(existing_config)
        else:
            # Create new
            new_config = AgentConfiguration(
                user_id=user_id,
                **config_data.dict()
            )
            db.add(new_config)
            updated_configs.append(new_config)

    await db.commit()

    # Refresh all configs
    for config in updated_configs:
        await db.refresh(config)

    return [AgentConfigResponse.from_orm(config) for config in updated_configs]


@router.post("/agent-config/test", response_model=AgentTestResponse)
async def test_agent(
    test_request: AgentTestRequest,
    current_user: Any = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Test an agent with a custom prompt using its current configuration.
    """
    user_id = current_user.id

    # Get agent configuration
    if test_request.use_config_id:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.id == test_request.use_config_id)
        )
        config = result.scalar_one_or_none()
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration with ID {test_request.use_config_id} not found"
            )
    else:
        # Use current config for this agent
        result = await db.execute(
            select(AgentConfiguration)
            .where(
                and_(
                    AgentConfiguration.user_id == user_id,
                    AgentConfiguration.agent_name == test_request.agent_name,
                    AgentConfiguration.is_active == True
                )
            )
        )
        config = result.scalar_one_or_none()

        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active configuration found for agent '{test_request.agent_name}'"
            )

    # Execute test using OpenRouter
    try:
        from app.core.deps import get_agent_registry
        from app.agents.adapters.openrouter import OpenRouterAdapter
        from app.core.config import get_settings

        settings = get_settings()

        # Create OpenRouter adapter with the configured model
        adapter = OpenRouterAdapter(
            api_key=settings.openrouter_api_key,
            model=config.model
        )

        start_time = datetime.utcnow()

        # Generate response
        result = await adapter.generate(
            prompt=test_request.test_prompt,
            temperature=config.temperature,
            max_tokens=config.max_tokens
        )

        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        return AgentTestResponse(
            agent_name=test_request.agent_name,
            model_used=config.model,
            test_prompt=test_request.test_prompt,
            response=result["text"],
            execution_time_ms=execution_time,
            token_usage=result["token_usage"],
            success=True
        )

    except Exception as e:
        return AgentTestResponse(
            agent_name=test_request.agent_name,
            model_used=config.model,
            test_prompt=test_request.test_prompt,
            response="",
            execution_time_ms=0,
            token_usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            success=False,
            error=str(e)
        )


@router.delete("/agent-config/{agent_name}")
async def delete_agent_config(
    agent_name: str,
    current_user: Any = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an agent configuration (resets to default).
    """
    user_id = current_user.id

    result = await db.execute(
        delete(AgentConfiguration)
        .where(
            and_(
                AgentConfiguration.user_id == user_id,
                AgentConfiguration.agent_name == agent_name
            )
        )
    )

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuration for agent '{agent_name}' not found"
        )

    await db.commit()

    return {"message": f"Configuration for agent '{agent_name}' deleted successfully"}


@router.get("/agent-config/performance", response_model=AgentPerformanceResponse)
async def get_agent_performance(
    days: int = 30,
    current_user: Any = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get performance analytics for all agents.
    """
    user_id = current_user.id
    since_date = datetime.utcnow() - timedelta(days=days)

    # Get performance metrics
    # This is a placeholder - implement actual performance tracking when needed
    return AgentPerformanceResponse(
        metrics=[],
        overall_stats={
            "total_executions": 0,
            "avg_execution_time": 0,
            "success_rate": 0,
            "period_days": days
        },
        period=f"last_{days}_days"
    )


@router.get("/available-models")
async def get_available_models():
    """
    Get list of all available AI models with their capabilities.
    """
    return {"models": AVAILABLE_MODELS}


# ========== VECTOR EMBEDDING BACKFILL ==========

@router.post("/backfill-embeddings")
async def backfill_embeddings(
    current_user: Any = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    ONE-TIME OPERATION: Generate embeddings for all historical JHAs.
    
    - Processes all JHAs in analysis_history without embeddings
    - Batch processing (10 at a time) with progress tracking
    - Idempotent: safe to run multiple times (skips already embedded)
    - Returns stats: processed count, errors, time elapsed
    
    Run this once after deploying vector infrastructure.
    Subsequent JHAs will be embedded automatically on creation.
    """
    from app.services.embedding_service import embedding_service
    
    start_time = datetime.utcnow()
    logger.info("=== EMBEDDING BACKFILL STARTING ===")
    
    # Count JHAs needing embeddings
    count_sql = text("""
        SELECT COUNT(*)
        FROM analysis_history ah
        WHERE ah.type = 'jha_multi_agent_analysis'
        AND NOT EXISTS (
            SELECT 1 FROM jha_embeddings je
            WHERE je.analysis_id = ah.id
        )
    """)
    result = await db.execute(count_sql)
    total_pending = result.scalar()
    
    if total_pending == 0:
        return {
            "status": "complete",
            "message": "No JHAs need embeddings - all up to date",
            "stats": {
                "total_jhas": 0,
                "processed": 0,
                "errors": 0,
                "time_elapsed_seconds": 0
            }
        }
    
    logger.info(f"Found {total_pending} JHAs needing embeddings")
    
    # Process in batches
    batch_size = 10
    processed = 0
    errors = 0

    while True:
        # Fetch batch (no OFFSET — the NOT EXISTS clause already excludes processed rows)
        fetch_sql = text("""
            SELECT
                ah.id,
                ah.metadata AS jha_metadata,
                ah.created_at,
                ah.risk_score
            FROM analysis_history ah
            WHERE ah.type = 'jha_multi_agent_analysis'
            AND NOT EXISTS (
                SELECT 1 FROM jha_embeddings je
                WHERE je.analysis_id = ah.id
            )
            ORDER BY ah.created_at DESC
            LIMIT :limit
        """)

        batch_result = await db.execute(
            fetch_sql,
            {"limit": batch_size}
        )
        batch = batch_result.fetchall()

        if not batch:
            break

        # Process each JHA
        for row in batch:
            try:
                jha_id = row.id
                jha_meta = row.jha_metadata

                # Handle metadata that may be a string or dict
                if isinstance(jha_meta, str):
                    jha_meta = json.loads(jha_meta)
                if not jha_meta:
                    jha_meta = {}

                # Extract checklist_data
                checklist_data = jha_meta.get("checklist_data", {})
                if not checklist_data:
                    logger.warning(f"JHA {jha_id} missing checklist_data, skipping")
                    errors += 1
                    continue
                
                # Build searchable text
                job_info = checklist_data.get("jobInfo", {})
                hazards = checklist_data.get("hazards", [])
                control_measures = checklist_data.get("controlMeasures", {})
                
                text_parts = []
                
                if desc := job_info.get("projectName"):
                    text_parts.append(f"Project: {desc}")
                if work_type := job_info.get("workType"):
                    text_parts.append(f"Work Type: {work_type}")
                if location := job_info.get("location"):
                    text_parts.append(f"Location: {location}")
                
                if hazards:
                    hazard_texts = [h.get("description", "")[:500] for h in hazards]
                    if hazard_texts:
                        text_parts.append(f"Hazards: {' | '.join(hazard_texts)}")
                
                if ppe := control_measures.get("ppe"):
                    if isinstance(ppe, list) and ppe:
                        text_parts.append(f"PPE: {'; '.join(ppe[:3])}")
                
                if procedures := control_measures.get("procedures"):
                    if isinstance(procedures, list) and procedures:
                        text_parts.append(f"Procedures: {'; '.join(procedures[:2])}")
                
                searchable_text = " | ".join(text_parts)
                
                # Generate embedding
                embedding = embedding_service.encode_text(searchable_text)
                
                # Extract metadata
                hazard_category = hazards[0].get("category", "Unknown") if hazards else "Unknown"
                work_type = job_info.get("workType", "Unknown")
                equipment_type = "Unknown"
                
                risk_score = row.risk_score
                if not risk_score and hazards:
                    high_severity = sum(1 for h in hazards if h.get("severity") == "high")
                    risk_score = min(high_severity * 3, 10)
                
                # Insert embedding
                insert_sql = text("""
                    INSERT INTO jha_embeddings (
                        analysis_id,
                        embedding,
                        content_type,
                        hazard_category,
                        equipment_type,
                        work_type,
                        risk_score,
                        metadata,
                        created_at
                    )
                    VALUES (
                        :analysis_id,
                        :embedding::vector,
                        'jha_analysis',
                        :hazard_category,
                        :equipment_type,
                        :work_type,
                        :risk_score,
                        :metadata::jsonb,
                        :created_at
                    )
                """)
                
                await db.execute(
                    insert_sql,
                    {
                        "analysis_id": jha_id,
                        "embedding": str(embedding),
                        "hazard_category": hazard_category,
                        "equipment_type": equipment_type,
                        "work_type": work_type,
                        "risk_score": risk_score,
                        "metadata": json.dumps({
                            "project_name": job_info.get("projectName"),
                            "location": job_info.get("location"),
                            "crew_size": job_info.get("crewSize"),
                            "num_hazards": len(hazards),
                            "supervisor": job_info.get("supervisor")
                        }),
                        "created_at": row.created_at
                    }
                )
                
                processed += 1
                logger.info(f"✓ Embedded JHA {jha_id[:8]}... ({processed}/{total_pending})")
                
            except Exception as e:
                errors += 1
                logger.error(f"✗ Failed to embed JHA {row.id}: {e}")
        
        # Commit batch
        await db.commit()
    
    elapsed = (datetime.utcnow() - start_time).total_seconds()
    
    logger.info("=== EMBEDDING BACKFILL COMPLETE ===")
    logger.info(f"Processed: {processed}, Errors: {errors}, Time: {elapsed:.1f}s")
    
    return {
        "status": "complete",
        "message": f"Successfully embedded {processed} JHAs",
        "stats": {
            "total_jhas": total_pending,
            "processed": processed,
            "errors": errors,
            "time_elapsed_seconds": round(elapsed, 1)
        }
    }


async def _create_default_configs(db: AsyncSession, user_id: str) -> List[AgentConfiguration]:
    """Create default configurations for all agents."""
    default_configs = []

    for agent_name, config_data in DEFAULT_AGENT_CONFIGS.items():
        new_config = AgentConfiguration(
            user_id=user_id,
            agent_name=agent_name,
            **config_data
        )
        db.add(new_config)
        default_configs.append(new_config)

    await db.commit()

    # Refresh all configs
    for config in default_configs:
        await db.refresh(config)

    return default_configs
