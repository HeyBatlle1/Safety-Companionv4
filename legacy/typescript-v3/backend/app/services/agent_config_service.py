"""
Agent Configuration Service

Service for retrieving and managing agent configurations from the database.
"""

from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.agent_config import AgentConfiguration, DEFAULT_AGENT_CONFIGS


class AgentConfigService:
    """Service for agent configuration management"""

    def __init__(self, db: AsyncSession, user_id: str = "admin"):
        self.db = db
        self.user_id = user_id

    async def get_agent_config(self, agent_name: str) -> Optional[AgentConfiguration]:
        """Get configuration for a specific agent"""
        result = await self.db.execute(
            select(AgentConfiguration)
            .where(
                and_(
                    AgentConfiguration.user_id == self.user_id,
                    AgentConfiguration.agent_name == agent_name,
                    AgentConfiguration.is_active == True
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_all_agent_configs(self) -> Dict[str, AgentConfiguration]:
        """Get all agent configurations as a dictionary"""
        result = await self.db.execute(
            select(AgentConfiguration)
            .where(
                and_(
                    AgentConfiguration.user_id == self.user_id,
                    AgentConfiguration.is_active == True
                )
            )
        )
        configs = list(result.scalars())

        # Convert to dictionary with agent_name as key
        return {config.agent_name: config for config in configs}

    async def get_orchestrator_config(self) -> Dict[str, Dict[str, Any]]:
        """
        Get orchestrator configuration for all agents.
        Returns configuration in a format suitable for the orchestrator.
        """
        configs = await self.get_all_agent_configs()

        orchestrator_config = {}

        # Map agent names to orchestrator config format
        agent_mapping = {
            "validator": "agent1_validation",
            "risk_assessor": "agent2_risk",
            "swiss_cheese": "agent3_prediction",
            "synthesizer": "agent4_synthesis"
        }

        for agent_name, config_key in agent_mapping.items():
            if agent_name in configs:
                config = configs[agent_name]
                orchestrator_config[config_key] = {
                    "model": config.model,
                    "temperature": config.temperature,
                    "max_tokens": config.max_tokens,
                    "notes": config.notes
                }
            else:
                # Fallback to defaults if config not found
                if agent_name in DEFAULT_AGENT_CONFIGS:
                    default_config = DEFAULT_AGENT_CONFIGS[agent_name]
                    orchestrator_config[config_key] = {
                        "model": default_config["model"],
                        "temperature": default_config["temperature"],
                        "max_tokens": default_config["max_tokens"],
                        "notes": default_config.get("notes", "")
                    }

        return orchestrator_config

    async def ensure_default_configs_exist(self) -> None:
        """Ensure default configurations exist in the database"""
        existing_configs = await self.get_all_agent_configs()

        for agent_name, default_config in DEFAULT_AGENT_CONFIGS.items():
            if agent_name not in existing_configs:
                # Create default configuration
                new_config = AgentConfiguration(
                    user_id=self.user_id,
                    agent_name=agent_name,
                    **default_config
                )
                self.db.add(new_config)

        await self.db.commit()