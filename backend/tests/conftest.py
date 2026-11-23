import asyncio
from collections.abc import AsyncIterator

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import settings
from app.db import CONNECT_ARGS


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    """A session whose work is always rolled back, even if the code under
    test calls commit() — uses a SAVEPOINT that restarts after every such
    commit, so nothing written during a test ever reaches the shared Neon
    database.

    Uses its own engine, created and disposed inside this one test's async
    fixture (hence inside this one test's event loop), instead of the
    shared app.db.engine: pytest-asyncio gives every test function a fresh
    event loop (asyncio_default_fixture_loop_scope = "function"), and an
    asyncpg pool created against one loop hangs forever if a later test's
    loop tries to await its internals — the loop that would wake the
    waiter is gone. A per-test engine can never be reused across a loop
    boundary, so the failure mode can't occur.
    """
    test_engine = create_async_engine(
        settings.effective_test_database_url, connect_args=CONNECT_ARGS
    )
    try:
        async with test_engine.connect() as connection:
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
    finally:
        await test_engine.dispose()


def pytest_sessionfinish(session, exitstatus):
    """Dispose the app's own long-lived engine (used by app.main via
    get_db_status(), exercised by tests/test_health.py) once the whole
    run is done, in a fresh loop created just for this — no pytest-asyncio
    fixture involved, so there's no event-loop-scope to get wrong here."""
    from app.db import engine as app_engine

    asyncio.run(app_engine.dispose())
