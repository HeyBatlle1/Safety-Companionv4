import sys
import os
import asyncio

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import engine
from app.models.base import Base
# Import models to register them with Base
from app.models.analysis import AnalysisHistory, AgentOutput
from app.models.jha_updates import JHAUpdate

async def init_models():
    print("Creating tables...")
    async with engine.begin() as conn:
        # Create all tables defined in Base.metadata
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_models())
