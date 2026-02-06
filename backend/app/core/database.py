from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

# Convert URLs for async drivers
if settings.database_url.startswith("sqlite://"):
    DATABASE_URL = settings.database_url.replace("sqlite://", "sqlite+aiosqlite://")
else:
    # Convert postgres:// to postgresql+asyncpg:// and remove sslmode for asyncpg
    DATABASE_URL = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")
    if "sslmode=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?sslmode=")[0]

# Create async engine with SQLite-compatible settings
engine_kwargs = {
    "echo": settings.debug,
}

# Add pooling only for PostgreSQL, not SQLite
if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 0,
        "pool_pre_ping": True,
    })

engine = create_async_engine(DATABASE_URL, **engine_kwargs)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass

async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup"""
    # Import all models to register them with Base
    from app.models import user, analysis, agent_config, jha_updates, company, eap, notifications, safety

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created/verified")