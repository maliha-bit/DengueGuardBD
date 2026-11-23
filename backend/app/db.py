from collections.abc import AsyncIterator

from sqlalchemy import MetaData, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


# asyncpg defaults to a 60s connect timeout and no command timeout at all.
# A suspended/unreachable Neon endpoint (or a stuck query) then blocks for
# a long time — and on Windows, pytest-timeout's thread-based watchdog
# cannot forcibly interrupt that underlying blocking socket call, so the
# *test* can still run far longer than its nominal timeout. Capping both
# here means a bad connection fails fast with a clear asyncpg error instead
# of stalling the process.
CONNECT_ARGS = {"timeout": 10, "command_timeout": 20}

engine: AsyncEngine = create_async_engine(settings.database_url, connect_args=CONNECT_ARGS)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


async def get_db_status() -> str:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return "connected"
    except Exception:
        return "disconnected"


async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session_maker() as session:
        yield session
