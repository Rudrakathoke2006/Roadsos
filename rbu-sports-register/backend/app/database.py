from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings
from collections.abc import AsyncGenerator

# Create Async Engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

# Create Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession
)

# Declarative Base for ORM Models
Base = declarative_base()

# Async Database Session Dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
