from typing import AsyncIterator

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import engine


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """A session whose work is always rolled back, even if the code under
    test calls commit() — uses a SAVEPOINT that restarts after every such
    commit, so nothing written during a test ever reaches the shared Neon
    dev database."""
    async with engine.connect() as connection:
        await connection.begin()
        session = AsyncSession(bind=connection, expire_on_commit=False)
        await connection.begin_nested()

        @event.listens_for(session.sync_session, "after_transaction_end")
        def _restart_savepoint(sync_session, transaction):
            if connection.closed:
                return
            if not connection.sync_connection.in_nested_transaction():
                connection.sync_connection.begin_nested()

        try:
            yield session
        finally:
            await session.close()
            await connection.rollback()
