"""
Seed default agent configurations into the database.
"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.agent_config import AgentConfiguration, DEFAULT_AGENT_CONFIGS

async def seed_agent_configs():
    """Seed default configurations for all 4 agents"""
    async with AsyncSessionLocal() as session:
        print("🌱 Seeding default agent configurations...")
        
        # Admin user ID (matches the one used in orchestrator)
        admin_user_id = "admin"
        
        configs_created = 0
        for agent_name, config in DEFAULT_AGENT_CONFIGS.items():
            # Check if config already exists
            from sqlalchemy import select
            result = await session.execute(
                select(AgentConfiguration).where(
                    AgentConfiguration.user_id == admin_user_id,
                    AgentConfiguration.agent_name == agent_name
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"  ⏭️  {agent_name}: Already exists, skipping")
                continue
            
            # Create new configuration
            new_config = AgentConfiguration(
                user_id=admin_user_id,
                agent_name=agent_name,
                model=config["model"],
                temperature=config["temperature"],
                max_tokens=config["max_tokens"],
                notes=config["notes"],
                is_active=True,
                total_executions=0
            )
            
            session.add(new_config)
            configs_created += 1
            print(f"  ✅ {agent_name}: {config['model']} (T={config['temperature']})")
        
        await session.commit()
        print(f"\n🎉 Seeded {configs_created} agent configurations!")
        return configs_created

if __name__ == "__main__":
    asyncio.run(seed_agent_configs())
