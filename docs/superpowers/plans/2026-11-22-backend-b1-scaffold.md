# Backend Phase B1 Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `backend/` FastAPI project skeleton (config, async DB wiring, Alembic, health endpoint, tooling, tests) so later phases have a running app to build on.

**Architecture:** A minimal FastAPI app under `backend/app` with pydantic-settings config, an async SQLAlchemy engine pointed at Neon Postgres via asyncpg, Alembic configured for async migrations, and a single `/api/v1/health` endpoint that reports app + DB status without crashing when the DB is unreachable (placeholder `DATABASE_URL` during scaffold). ruff/black for lint/format, pytest + httpx for tests.

**Tech Stack:** Python 3.11+, FastAPI, pydantic-settings, SQLAlchemy 2 async + asyncpg, Alembic, ruff, black, pytest, pytest-asyncio, httpx.

**Spec:** User-supplied Phase B1 instructions (this conversation) + `CLAUDE.md` "Backend" section.

## Global Constraints

- API routes live under `/api/v1`.
- CORS allowed origins: `http://localhost:5173`, `https://maliha-bit.github.io`.
- Error responses use the shape `{"error": {"code": ..., "message": ...}}`.
- `DATABASE_URL` format: `postgresql+asyncpg://...?ssl=require` (Neon).
- `backend/.env` and `backend/.venv` must be gitignored; never commit real secrets.
- Lint: ruff + black. Tests: pytest. App must actually start.
- Commit message: `backend: B1 scaffold`. Do not push.

## Review Focus

- DB unreachable (placeholder URL): `/health` must still return 200, not raise, and report DB as disconnected.
- CORS: a request from a disallowed origin must not get `Access-Control-Allow-Origin` back.
- Unhandled exception: must still serialize to the `{"error": {...}}` shape, not FastAPI's default.
- `.env` with a real-looking secret must never be picked up by git (verify `git status` after scaffold shows it untracked/ignored).
- Alembic async env must import settings without requiring a live DB connection at import time (so `alembic upgrade head` with a bad/placeholder URL fails clearly, not with an import crash).

---

### Task 1: Project tooling and config files

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/pyproject.toml` (ruff + black config)
- Create: `backend/.env.example`
- Create: `backend/.env` (placeholder `DATABASE_URL`, local only)
- Modify: `.gitignore` (root) — add `backend/.env`, `backend/.venv`

**Interfaces:**
- Produces: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `ENV` keys that Task 2's `Settings` class reads from `.env`.

- [ ] Write `backend/requirements.txt`: `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `sqlalchemy>=2`, `asyncpg`, `alembic`, `python-jose[cryptography]` or `pyjwt`, `passlib[bcrypt]`, `pandas`, `scikit-learn`, `lightgbm`, `joblib`, `pytest`, `pytest-asyncio`, `httpx`, `ruff`, `black`.
- [ ] Write `backend/pyproject.toml` with `[tool.ruff]` (line-length 100, target py311) and `[tool.black]` (line-length 100).
- [ ] Write `backend/.env.example` with placeholders for `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `ENV`.
- [ ] Write `backend/.env` with `DATABASE_URL=postgresql+asyncpg://user:password@host/dbname?ssl=require` (placeholder), a generated dev-only `JWT_SECRET`, `CORS_ORIGINS=http://localhost:5173,https://maliha-bit.github.io`, `ENV=development`.
- [ ] Add `backend/.env` and `backend/.venv` lines to root `.gitignore`.
- [ ] Commit is deferred to Task 6 (single scaffold commit).

### Task 2: Settings and app package skeleton

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/models/__init__.py`, `backend/app/schemas/__init__.py`, `backend/app/routers/__init__.py`, `backend/app/services/__init__.py`, `backend/app/ml/__init__.py`, `backend/app/seed/__init__.py`

**Interfaces:**
- Consumes: env vars from Task 1's `.env`.
- Produces: `Settings` class with fields `database_url: str`, `jwt_secret: str`, `cors_origins: list[str]`, `env: str`; module-level `settings = Settings()` singleton that Task 3 and Task 4 import.

- [ ] Implement `backend/app/config.py` with a `pydantic-settings` `BaseSettings` subclass `Settings` (`model_config = SettingsConfigDict(env_file=".env")`), fields `database_url`, `jwt_secret`, `cors_origins` (parsed from comma-separated string into `list[str]`), `env`. Export `settings = Settings()`.
- [ ] Create empty `__init__.py` files for the package directories listed above.

### Task 3: Async DB engine and Alembic setup

**Files:**
- Create: `backend/app/db.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (empty dir, `.gitkeep`)

**Interfaces:**
- Consumes: `settings.database_url` from Task 2.
- Produces: `engine` (async `AsyncEngine`), `async_session_maker` (`async_sessionmaker[AsyncSession]`), `async def get_db_status() -> str` returning `"connected"` or `"disconnected"` (catches all connection errors, never raises) — Task 5's health route imports this.

- [ ] Implement `backend/app/db.py`: create `engine = create_async_engine(settings.database_url)`, `async_session_maker = async_sessionmaker(engine, expire_on_commit=False)`, and `async def get_db_status() -> str` that runs `SELECT 1` through a short-lived connection inside `try/except Exception`, returning `"connected"` / `"disconnected"`.
- [ ] Configure `backend/alembic.ini` with `script_location = alembic`, `sqlalchemy.url` left blank (read from `Settings` at runtime instead).
- [ ] Write `backend/alembic/env.py` as an async-capable env (use `asyncio.run` + `run_sync` pattern from Alembic's async template), importing `settings.database_url` for the URL and `Base.metadata` (define a minimal `Base = declarative_base()` in `app/db.py` if not already) for `target_metadata`. Must not open a DB connection at import time — only when a migration command actually runs.
- [ ] Add `backend/alembic/script.py.mako` (standard Alembic template) and empty `backend/alembic/versions/.gitkeep`.

### Task 4: FastAPI app, CORS, error format

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/routers/health.py`

**Interfaces:**
- Consumes: `settings` (Task 2), `get_db_status` (Task 3).
- Produces: `app` (FastAPI instance) importable as `backend.app.main:app` / `app.main:app`; router mounted at `/api/v1`.

- [ ] In `backend/app/main.py`: create `app = FastAPI()`, add `CORSMiddleware` with `allow_origins=settings.cors_origins`, register exception handlers for `HTTPException` and generic `Exception` that both return `JSONResponse({"error": {"code": ..., "message": ...}}, status_code=...)`. Include the health router under prefix `/api/v1`.
- [ ] In `backend/app/routers/health.py`: define `router = APIRouter()` and `GET /health` returning `{"status": "ok", "version": <app version string>, "database": await get_db_status()}`.

### Task 5: Health test

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`

**Interfaces:**
- Consumes: `app` from Task 4.

- [ ] **Step 1: Write the failing test** in `backend/tests/test_health.py`:
```python
from httpx import AsyncClient, ASGITransport
import pytest
from app.main import app

@pytest.mark.asyncio
async def test_health_returns_ok_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert body["database"] in ("connected", "disconnected")
```
- [ ] **Step 2: Run** `pytest backend/tests/test_health.py -v` from `backend/` — expect FAIL (`ModuleNotFoundError` or similar) before Task 4 exists; if run after Task 4, go straight to Step 4.
- [ ] **Step 3:** add `backend/tests/__init__.py` (empty) and a `backend/tests/conftest.py` adding `backend` to `sys.path` if needed (or rely on running pytest from `backend/` with rootdir config in `pyproject.toml`: `[tool.pytest.ini_options] pythonpath = ["."]`).
- [ ] **Step 4: Run** `pytest -v` from `backend/` — expect PASS. Since `DATABASE_URL` is a placeholder, confirm `database` comes back `"disconnected"` and the request still succeeds.

### Task 6: README, final verification, commit

**Files:**
- Modify: root `README.md` (add "Run the backend" section)
- Create: `backend/Dockerfile` (simple `uvicorn` run, per CLAUDE.md structure)

**Interfaces:** none (integration/documentation task).

- [ ] Add a "Run the backend" section to `README.md`: create venv, `pip install -r backend/requirements.txt`, copy `.env.example` to `.env`, `alembic upgrade head`, `uvicorn app.main:app --reload --port 8000` (run from `backend/`).
- [ ] Write a minimal `backend/Dockerfile` (python:3.11-slim base, install requirements, `CMD uvicorn app.main:app --host 0.0.0.0 --port 8000`).
- [ ] Run `ruff check backend/app backend/tests` and `black --check backend/app backend/tests`; fix any findings.
- [ ] Run `pytest` from `backend/` — confirm the health test passes.
- [ ] Start the app (`uvicorn app.main:app --port 8000` from `backend/`, briefly) and curl `GET /api/v1/health` to confirm it starts and responds; stop it.
- [ ] Confirm `git status` shows `backend/.env` and any `.venv` as ignored/untracked-and-excluded, not staged.
- [ ] `git add backend/ README.md .gitignore` and commit `backend: B1 scaffold`. Do not push.
- [ ] Tell the user it's time to paste their real Neon `DATABASE_URL` into `backend/.env`.
