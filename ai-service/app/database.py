from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import event, text
from sqlalchemy.orm import Session

from .config import settings
from .system_reset import request_reset_epoch


class ResetAwareSession(Session):
    """Reapply the request epoch for every transaction, including after commits."""


@event.listens_for(ResetAwareSession, "after_begin")
def apply_request_reset_epoch(session, transaction, connection):
    epoch = request_reset_epoch.get()
    if epoch is not None:
        connection.execute(
            text("SELECT set_config('nexora.reset_epoch', :epoch, true)"),
            {"epoch": str(epoch)},
        )

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout_s,
    pool_recycle=settings.db_pool_recycle_s,
    pool_pre_ping=settings.db_pool_pre_ping,
)
AsyncSessionLocal = async_sessionmaker(
    engine, expire_on_commit=False, sync_session_class=ResetAwareSession,
)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with AsyncSessionLocal() as session:
        yield session
