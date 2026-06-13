from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from .config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout_s,
    pool_recycle=settings.db_pool_recycle_s,
    pool_pre_ping=settings.db_pool_pre_ping,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with AsyncSessionLocal() as session:
        yield session
