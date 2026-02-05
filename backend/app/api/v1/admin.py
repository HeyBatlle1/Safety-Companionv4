"""
Admin API Endpoints

Administrative endpoints for agent configuration management.
Requires admin privileges for access.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, func
from sqlalchemy.orm import selectinload

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