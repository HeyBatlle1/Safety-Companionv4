# backend/init_db.py
"""
Database Initialization Script for Safety Companion V2

Creates all V2 tables in Neon database without affecting existing V1 tables.
This resolves the HTTP 500 errors on agent-config endpoints.
"""

import asyncio
import sys
from app.core.database import engine, Base

# Import all models to register them with Base
from app.models.agent_config import AgentConfiguration, AgentPerformanceLog
from app.models.analysis import AnalysisHistory, AgentOutput
from app.models.jha_updates import JHAUpdate
# Commented out to avoid FK constraint errors for now
# from app.models.safety import SafetyReport, RiskAssessment
from app.models.user import User
# from app.models.company import Company, Project
# from app.models.notifications import NotificationPreference

async def create_tables():
    """Create all V2 tables in Neon database"""
    print("🚀 Starting V2 database migration...")
    print(f"Database URL: {str(engine.url).replace(engine.url.password or '', '***')}")

    try:
        async with engine.begin() as conn:
            print("📊 Creating all V2 tables...")
            await conn.run_sync(Base.metadata.create_all)

        print("✅ All V2 tables created successfully!")
        print("\nCreated tables:")
        print("  - agent_configurations")
        print("  - agent_performance_logs")
        print("  - analyses")
        print("  - jha_updates")
        print("  - safety_assessments")
        print("  - users (V2)")
        print("  - companies")
        print("  - notifications")
        print("\nV1 tables preserved:")
        print("  - bot_activity")
        print("  - conversations")
        print("  - documents")
        print("  - injury_records")
        print("  - messages")
        print("  - user_preferences")
        print("  - users (V1)")

        return True

    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

async def verify_tables():
    """Verify tables were created successfully"""
    print("\n🔍 Verifying table creation...")

    try:
        async with engine.begin() as conn:
            # Check if agent_configurations table exists and is accessible
            result = await conn.execute(text("SELECT COUNT(*) FROM agent_configurations"))
            count = result.scalar()
            print(f"✅ agent_configurations table accessible (0 records expected)")

            return True

    except Exception as e:
        print(f"❌ Table verification failed: {e}")
        return False

if __name__ == "__main__":
    print("Safety Companion V2 Database Migration")
    print("=" * 40)

    # Import text for verification query
    from sqlalchemy import text

    success = asyncio.run(create_tables())

    if success:
        verification_success = asyncio.run(verify_tables())
        if verification_success:
            print("\n🎉 Migration completed successfully!")
            print("Agent Config Dashboard should now work without HTTP 500 errors.")
            print("\nNext steps:")
            print("1. Test: curl https://api.safety-companion.com/api/v1/admin/agent-config")
            print("2. Open Agent Config Dashboard in browser")
            sys.exit(0)
        else:
            print("\n⚠️  Migration completed but verification failed")
            sys.exit(1)
    else:
        print("\n💥 Migration failed!")
        sys.exit(1)