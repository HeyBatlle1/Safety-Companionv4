import sys
import os
import asyncio

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import engine
from app.models.base import Base
# Import all models to register them with Base
from app.models import (
    User, 
    AnalysisHistory, 
    AgentOutput, 
    JHAUpdate,
    AgentConfiguration,
    AgentPerformanceLog,
    EAPQuestionnaire,
    GeneratedEAP
)

async def init_models():
    print("Creating tables...")
    async with engine.begin() as conn:
        # Create all tables defined in Base.metadata
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_models())
