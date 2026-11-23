# Backend B3: Auth, Roles, Staff Approval, Audit Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login/registration/role-based access control, staff admin-approval, and an audit log to the FastAPI backend, so seeded demo users can authenticate and staff signups are gated by admin approval.

**Architecture:** JWT access (15 min) + refresh (7 day) tokens issued by `/auth/*` endpoints; refresh tokens are opaque JWTs whose SHA-256 hash is stored in the existing `refresh_tokens` table so they can be looked up and revoked without storing the raw token. `app/deps.py` exposes `get_current_user`, `optional_user`, and `require_role(*roles)` FastAPI dependencies built on top of a new `get_db` session dependency. Staff roles (`hospital_staff`, `lab_staff`, `authority`) register with `approval_status="pending"` and are blocked from role-gated routes (403 `approval_pending`) until an admin approves them via `/admin/staff/*`, which also writes an `AuditLog` row.

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy 2 async, PyJWT, passlib/bcrypt (all already in `requirements.txt` — no new dependencies).

**Spec:** user-provided task brief (Backend Phase B3), reproduced below for reference:

```
- POST /api/v1/auth/register (citizen by default; staff roles need organisation info and start
  as "pending"), /auth/login, /auth/refresh, /auth/logout and GET /auth/me.
- bcrypt passwords, JWT access (15 min) + refresh (7 days) tokens; refresh tokens stored hashed
  and revoked on logout. Rate limit login to 5 attempts per minute per IP.
- Dependencies: get_current_user, optional_user (public pages) and require_role(*roles).
  Pending or rejected staff get 403 with code "approval_pending".
- Admin: list pending staff, approve, reject (with reason).
- Profile: GET/PATCH /users/me (name, phone, division, district, language, alert divisions).
- Audit service: log(user, action, target, details), used by every staff/admin write.
- The seeded demo users (password Demo@1234) must be able to log in.
- Tests: register, login, refresh, logout, wrong password, role guard, pending staff blocked,
  approve gives access, audit row created.
```

Plus `backend/CLAUDE.md` project-wide rules (see Global Constraints).

## Global Constraints

- API routes live under `/api/v1`, JSON fields are camelCase (via `CamelModel`), matching `src/api/types.ts` naming conventions.
- Passwords hashed with bcrypt via `app/services/security.py` (already implemented: `hash_password`/`verify_password`).
- Access tokens expire in 15 minutes, refresh tokens in 7 days (exact values from spec).
- Refresh tokens are never stored raw — only `sha256(token)` goes in `refresh_tokens.token_hash` (column already exists, unique).
- Login is rate-limited to 5 attempts/minute/IP (exact values from spec).
- `require_role` on a pending/rejected staff user raises **403** with the existing global error envelope (`app/main.py`'s `http_exception_handler` renders `exc.detail` as `error.message`) — use `detail="approval_pending"` so the literal code from the spec is the JSON `error.message` string. Do not invent a different error envelope shape.
- Every staff/admin write (approve, reject) creates an `AuditLog` row via the audit service — `AuditLog` has no `details` column, so `audit.log()`'s `details` parameter is folded into `target_en`/`target_bn` text rather than stored separately.
- No new library dependencies — PyJWT, passlib/bcrypt, FastAPI's built-in `HTTPBearer` cover everything needed.
- Password minimum length: 8 characters. Not stated explicitly in the spec; a reasonable floor for an auth system, not a product requirement — flagged here as a judgment call.
- Run tests with `.venv\Scripts\python.exe -m pytest -x -q --timeout=60` (never piped through `tail`). Stop and report if any command runs longer than 3 minutes.
- Finish with `ruff check .`, the full test suite, and an app-import smoke check passing, then commit exactly `backend: B3 auth, roles, approvals, audit` with no `Co-Authored-By`/`Claude` lines (per `backend/CLAUDE.md`).

## Review Focus

- Duplicate email on `/auth/register` → expect a clean 409 conflict, not a raw `IntegrityError` surfaced as a 500.
- A refresh token used after `/auth/logout` has revoked it → expect 401 on `/auth/refresh`, not a silent success (the spec only lists "logout" as a test, but a logout that doesn't actually block reuse is a bug the change would introduce).
- A tampered or expired JWT access token on any protected route → expect a clean 401 from `get_current_user`, not an uncaught `jwt.PyJWTError` turning into a 500.
- A non-admin authenticated user (e.g. citizen) hitting `/admin/staff/pending` → expect 403, proving `require_role` actually restricts by role and not just "any logged-in user."
- Staff registration without `organisationId` → expect a 422 validation error (spec says staff roles "need organisation info"), not a silently-accepted registration with no org on record.

---

## Task 1: DB session dependency + test client fixture

**Files:**
- Modify: `app/db.py`
- Modify: `tests/conftest.py`
- Test: `tests/test_db_dependency.py`

**Interfaces:**
- Produces: `app.db.get_db() -> AsyncIterator[AsyncSession]` (FastAPI dependency, `async with async_session_maker() as session: yield session`); a `client` fixture in `tests/conftest.py` that overrides `get_db` with the existing `db_session` fixture so integration tests never touch the real Neon database.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_db_dependency.py
import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_client_fixture_can_call_health(client: AsyncClient):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\python.exe -m pytest tests/test_db_dependency.py -x -q --timeout=60`
Expected: FAIL — `fixture 'client' not found`.

- [ ] **Step 3: Implement `get_db` in `app/db.py`**

Add directly below `get_db_status`:

```python
from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session_maker() as session:
        yield session
```

- [ ] **Step 4: Add the `client` fixture to `tests/conftest.py`**

```python
from httpx import ASGITransport, AsyncClient
from app.db import get_db
from app.main import app


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def _override() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = _override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `.venv\Scripts\python.exe -m pytest tests/test_db_dependency.py tests/test_health.py -x -q --timeout=60`
Expected: PASS (both files green — confirms no regression on the existing health test).

- [ ] **Step 6: Commit**

```bash
git add app/db.py tests/conftest.py tests/test_db_dependency.py
git commit -m "backend: B3 add get_db dependency and test client fixture"
```

---

## Task 2: JWT token service

**Files:**
- Modify: `app/services/security.py`
- Test: `tests/models/test_security.py` (existing file — append new tests; matches current project convention despite the "models" folder name)

**Interfaces:**
- Produces: `create_access_token(user_id: str, role: str) -> str`, `create_refresh_token(user_id: str) -> str`, `decode_token(token: str) -> dict`, `hash_token(raw: str) -> str`, constants `ACCESS_TOKEN_EXPIRE_MINUTES = 15`, `REFRESH_TOKEN_EXPIRE_DAYS = 7`. `decode_token` raises `jwt.PyJWTError` (or a subclass) on any invalid/expired/tampered token — callers catch that base class.

- [ ] **Step 1: Write the failing tests**

```python
# appended to tests/models/test_security.py
import time
import jwt
import pytest
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)
from app.config import settings


def test_create_and_decode_access_token():
    token = create_access_token("user-1", "citizen")
    claims = decode_token(token)
    assert claims["sub"] == "user-1"
    assert claims["role"] == "citizen"
    assert claims["type"] == "access"


def test_create_and_decode_refresh_token():
    token = create_refresh_token("user-1")
    claims = decode_token(token)
    assert claims["sub"] == "user-1"
    assert claims["type"] == "refresh"
    assert "jti" in claims


def test_decode_token_rejects_garbage():
    with pytest.raises(jwt.PyJWTError):
        decode_token("not-a-real-token")


def test_decode_token_rejects_expired_token():
    expired = jwt.encode(
        {"sub": "user-1", "type": "access", "exp": int(time.time()) - 10},
        settings.jwt_secret,
        algorithm="HS256",
    )
    with pytest.raises(jwt.PyJWTError):
        decode_token(expired)


def test_hash_token_is_deterministic_and_distinct():
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != hash_token("xyz")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/models/test_security.py -x -q --timeout=60`
Expected: FAIL — `ImportError: cannot import name 'create_access_token'`.

- [ ] **Step 3: Implement the token functions in `app/services/security.py`**

```python
import hashlib
import uuid
from datetime import UTC, datetime, timedelta

import jwt

from app.config import settings

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
_ALGORITHM = "HS256"


def create_access_token(user_id: str, role: str) -> str: ...
def create_refresh_token(user_id: str) -> str: ...
def decode_token(token: str) -> dict: ...
def hash_token(raw: str) -> str: ...
```

One line each: `create_access_token`/`create_refresh_token` build a claims dict (`sub`, `type`, `exp` from `datetime.now(UTC) + timedelta(...)`, plus `role` for access and a `jti=str(uuid.uuid4())` for refresh) and `jwt.encode(claims, settings.jwt_secret, algorithm=_ALGORITHM)`; `decode_token` is `jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])`; `hash_token` is `hashlib.sha256(raw.encode()).hexdigest()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/models/test_security.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/security.py tests/models/test_security.py
git commit -m "backend: B3 add JWT access/refresh token service"
```

---

## Task 3: Audit service

**Files:**
- Create: `app/services/audit.py`
- Test: `tests/services/test_audit.py`

**Interfaces:**
- Consumes: `app.models.audit.AuditLog`, `app.models.enums.AuditAction`, `app.models.user.User`.
- Produces: `log(db: AsyncSession, actor: User, action: AuditAction, target_en: str, target_bn: str, details: str | None = None) -> AuditLog` — builds the row, calls `db.add(...)`, does **not** commit (caller commits as part of its own transaction), returns the new `AuditLog`.

- [ ] **Step 1: Write the failing test**

```python
# tests/services/test_audit.py
import pytest
from app.models.audit import AuditLog
from app.models.enums import AuditAction, Role
from app.models.user import User
from app.services.audit import log
from app.services.security import hash_password


@pytest.fixture
async def actor(db_session):
    user = User(
        id="actor-1", name_en="Admin One", name_bn="অ্যাডমিন ১",
        email="admin1@test.local", password_hash=hash_password("x"), role=Role.admin,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def test_log_creates_audit_row(db_session, actor):
    entry = await log(db_session, actor, AuditAction.signup_approve, "Jane Doe", "জেন ডো")
    await db_session.flush()
    assert entry.actor_id == actor.id
    assert entry.actor_role == Role.admin
    assert entry.action == AuditAction.signup_approve
    assert entry.target_en == "Jane Doe"


async def test_log_appends_details_to_target_text(db_session, actor):
    entry = await log(
        db_session, actor, AuditAction.signup_reject, "Jane Doe", "জেন ডো", details="duplicate account"
    )
    assert "duplicate account" in entry.target_en
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/services/test_audit.py -x -q --timeout=60`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.audit'`.

- [ ] **Step 3: Implement `log()` in `app/services/audit.py`**

```python
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.enums import AuditAction
from app.models.user import User


async def log(
    db: AsyncSession,
    actor: User,
    action: AuditAction,
    target_en: str,
    target_bn: str,
    details: str | None = None,
) -> AuditLog: ...
```

If `details` is given, append `f" — {details}"` to both `target_en` and `target_bn` before constructing `AuditLog(actor_id=actor.id, actor_role=actor.role, action=action, target_en=..., target_bn=..., created_at=datetime.now(UTC))`; `db.add(entry)`; return `entry`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/services/test_audit.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/audit.py tests/services/test_audit.py
git commit -m "backend: B3 add audit log service"
```

---

## Task 4: Rate limiter service

**Files:**
- Create: `app/services/rate_limit.py`
- Test: `tests/services/test_rate_limit.py`

**Interfaces:**
- Produces: `check_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 60) -> None` (raises `fastapi.HTTPException(429, ...)` once `key` has been checked `max_attempts` times inside the trailing `window_seconds`), `reset_rate_limits() -> None` (test-only helper clearing all in-memory state).

- [ ] **Step 1: Write the failing tests**

```python
# tests/services/test_rate_limit.py
import pytest
from fastapi import HTTPException
from app.services.rate_limit import check_rate_limit, reset_rate_limits


def setup_function():
    reset_rate_limits()


def test_allows_up_to_max_attempts():
    for _ in range(5):
        check_rate_limit("1.2.3.4", max_attempts=5, window_seconds=60)


def test_blocks_after_max_attempts():
    for _ in range(5):
        check_rate_limit("1.2.3.4", max_attempts=5, window_seconds=60)
    with pytest.raises(HTTPException) as exc_info:
        check_rate_limit("1.2.3.4", max_attempts=5, window_seconds=60)
    assert exc_info.value.status_code == 429


def test_keys_are_independent():
    for _ in range(5):
        check_rate_limit("1.2.3.4", max_attempts=5, window_seconds=60)
    check_rate_limit("5.6.7.8", max_attempts=5, window_seconds=60)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/services/test_rate_limit.py -x -q --timeout=60`
Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 3: Implement `app/services/rate_limit.py`**

```python
import time
from fastapi import HTTPException

_attempts: dict[str, list[float]] = {}


def check_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 60) -> None: ...
def reset_rate_limits() -> None: ...
```

`check_rate_limit`: read `_attempts.get(key, [])`, drop entries older than `window_seconds` (using `time.monotonic()`), raise `HTTPException(429, detail="Too many login attempts, try again later.")` if the remaining count is `>= max_attempts`; otherwise append `time.monotonic()` to the (possibly pruned) list, store it back in `_attempts[key]`. `reset_rate_limits` is `_attempts.clear()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/services/test_rate_limit.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/rate_limit.py tests/services/test_rate_limit.py
git commit -m "backend: B3 add in-memory login rate limiter"
```

---

## Task 5: Auth dependencies — `get_current_user`, `optional_user`, `require_role`

**Files:**
- Create: `app/deps.py`
- Test: `tests/test_deps.py`

**Interfaces:**
- Consumes: `app.db.get_db` (Task 1), `app.services.security.decode_token` (Task 2), `app.models.user.User`, `app.models.enums.{Role, ApprovalStatus}`.
- Produces: `get_current_user(credentials=Depends(bearer_scheme), db=Depends(get_db)) -> User` (401 if missing/invalid/expired token or user not found), `optional_user(...) -> User | None` (returns `None` instead of raising when there's no/invalid token), `require_role(*roles: Role) -> Callable[..., Awaitable[User]]` (a dependency factory: 403 `detail="forbidden"` if `user.role not in roles`, 403 `detail="approval_pending"` if `user.approval_status != ApprovalStatus.approved`, else returns the user).

- [ ] **Step 1: Write the failing tests**

Build a throwaway FastAPI app in the test module (not `app.main`) so this is a pure unit test of the dependencies:

```python
# tests/test_deps.py
import pytest
from fastapi import Depends, FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.db import get_db
from app.deps import get_current_user, optional_user, require_role
from app.models.enums import ApprovalStatus, Role
from app.models.user import User
from app.services.security import create_access_token, hash_password


def make_test_app(db_session):
    app = FastAPI()

    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_db

    @app.get("/whoami")
    async def whoami(user: User = Depends(get_current_user)):
        return {"id": user.id}

    @app.get("/maybe")
    async def maybe(user: User | None = Depends(optional_user)):
        return {"id": user.id if user else None}

    @app.get("/admin-only")
    async def admin_only(user: User = Depends(require_role(Role.admin))):
        return {"id": user.id}

    @app.get("/staff-only")
    async def staff_only(user: User = Depends(require_role(Role.hospital_staff))):
        return {"id": user.id}

    return app


async def make_user(db_session, role, approval_status=ApprovalStatus.approved):
    user = User(
        id=f"user-{role.value}-{approval_status.value}",
        name_en="T", name_bn="T", email=f"{role.value}-{approval_status.value}@test.local",
        password_hash=hash_password("x"), role=role, approval_status=approval_status,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def test_get_current_user_rejects_missing_token(db_session):
    app = make_test_app(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/whoami")
    assert resp.status_code == 401


async def test_get_current_user_rejects_garbage_token(db_session):
    app = make_test_app(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/whoami", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401


async def test_get_current_user_rejects_unknown_user(db_session):
    app = make_test_app(db_session)
    token = create_access_token("does-not-exist", "citizen")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/whoami", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


async def test_get_current_user_accepts_valid_token(db_session):
    user = await make_user(db_session, Role.citizen)
    app = make_test_app(db_session)
    token = create_access_token(user.id, user.role.value)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/whoami", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["id"] == user.id


async def test_optional_user_returns_null_without_token(db_session):
    app = make_test_app(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/maybe")
    assert resp.status_code == 200
    assert resp.json()["id"] is None


async def test_require_role_blocks_wrong_role(db_session):
    user = await make_user(db_session, Role.citizen)
    app = make_test_app(db_session)
    token = create_access_token(user.id, user.role.value)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


async def test_require_role_blocks_pending_staff(db_session):
    user = await make_user(db_session, Role.hospital_staff, ApprovalStatus.pending)
    app = make_test_app(db_session)
    token = create_access_token(user.id, user.role.value)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/staff-only", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert resp.json()["detail"] == "approval_pending"


async def test_require_role_allows_approved_staff(db_session):
    user = await make_user(db_session, Role.hospital_staff, ApprovalStatus.approved)
    app = make_test_app(db_session)
    token = create_access_token(user.id, user.role.value)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        resp = await c.get("/staff-only", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
```

Note: this throwaway app does not register `app.main`'s custom exception handler, so `HTTPException(403, detail="approval_pending")` serializes via FastAPI's default handler as `{"detail": "approval_pending"}` — assert on `resp.json()["detail"]` here, not `error.message` (that envelope is asserted in the Task 7+ integration tests which hit the real `app.main.app`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/test_deps.py -x -q --timeout=60`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.deps'`.

- [ ] **Step 3: Implement `app/deps.py`**

```python
from collections.abc import Awaitable, Callable

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.enums import ApprovalStatus, Role
from app.models.user import User
from app.services.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User: ...


async def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None: ...


def require_role(*roles: Role) -> Callable[..., Awaitable[User]]: ...
```

`get_current_user`: 401 `detail="Not authenticated"` if `credentials is None`; `try: claims = decode_token(credentials.credentials) except jwt.PyJWTError: raise HTTPException(401, "Invalid or expired token")`; 401 if `claims.get("type") != "access"`; `user = await db.get(User, claims["sub"])`; 401 if `user is None`; return `user`. `optional_user` is the same decode/lookup but returns `None` at each point it would otherwise raise (catch the no-credentials case and `jwt.PyJWTError`/wrong-type/missing-user case). `require_role` returns a nested `async def _dependency(user: User = Depends(get_current_user)) -> User` that raises `HTTPException(403, detail="forbidden")` if `user.role not in roles`, then `HTTPException(403, detail="approval_pending")` if `user.approval_status != ApprovalStatus.approved`, else returns `user`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/test_deps.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/deps.py tests/test_deps.py
git commit -m "backend: B3 add get_current_user/optional_user/require_role dependencies"
```

---

## Task 6: Auth + profile-update schemas

**Files:**
- Create: `app/schemas/auth.py`
- Modify: `app/schemas/user.py` (add `UserUpdate`)
- Test: `tests/schemas/test_auth.py`, append to `tests/schemas/test_user.py`

**Interfaces:**
- Produces: `RegisterRequest` (camelCase: `nameEn`, `nameBn`, `email`, `password`, `phone`, `role`, `divisionId`, `districtId`, `language`, `organisationId`), `LoginRequest` (`email`, `password`), `TokenPair` (`accessToken`, `refreshToken`, `tokenType="bearer"`), `AccessTokenResponse` (`accessToken`), `RefreshRequest` (`refreshToken`), `RejectRequest` (`reason`), and `app.schemas.user.UserUpdate` (`nameEn?`, `nameBn?`, `phone?`, `divisionId?`, `districtId?`, `language?`, `alertDivisions?`, all optional).

- [ ] **Step 1: Write the failing tests**

```python
# tests/schemas/test_auth.py
import pytest
from pydantic import ValidationError
from app.models.enums import Language, Role
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair


def test_register_citizen_without_organisation_is_valid():
    RegisterRequest(nameEn="A", nameBn="আ", email="a@test.local", password="password1")


def test_register_staff_requires_organisation_id():
    with pytest.raises(ValidationError):
        RegisterRequest(
            nameEn="A", nameBn="আ", email="a@test.local", password="password1",
            role=Role.hospital_staff,
        )


def test_register_staff_with_organisation_id_is_valid():
    req = RegisterRequest(
        nameEn="A", nameBn="আ", email="a@test.local", password="password1",
        role=Role.hospital_staff, organisationId="City Hospital",
    )
    assert req.organisation_id == "City Hospital"


def test_token_pair_uses_camel_case_aliases():
    pair = TokenPair(accessToken="a", refreshToken="b")
    assert pair.model_dump(by_alias=True) == {
        "accessToken": "a", "refreshToken": "b", "tokenType": "bearer",
    }
```

```python
# appended to tests/schemas/test_user.py
from app.schemas.user import UserUpdate


def test_user_update_fields_all_optional():
    update = UserUpdate()
    assert update.model_dump(exclude_unset=True) == {}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/schemas/test_auth.py tests/schemas/test_user.py -x -q --timeout=60`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas.auth'`.

- [ ] **Step 3: Implement `app/schemas/auth.py`**

```python
from pydantic import EmailStr, Field, model_validator

from app.models.enums import Language, Role
from app.schemas.common import CamelModel

_STAFF_ROLES = {Role.hospital_staff, Role.lab_staff, Role.authority}


class RegisterRequest(CamelModel):
    name_en: str
    name_bn: str
    email: EmailStr
    password: str = Field(min_length=8)
    phone: str | None = None
    role: Role = Role.citizen
    division_id: str | None = None
    district_id: str | None = None
    language: Language = Language.en
    organisation_id: str | None = None

    @model_validator(mode="after")
    def _require_organisation_for_staff(self) -> "RegisterRequest": ...


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class TokenPair(CamelModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(CamelModel):
    access_token: str


class RefreshRequest(CamelModel):
    refresh_token: str


class RejectRequest(CamelModel):
    reason: str
```

`_require_organisation_for_staff`: `if self.role in _STAFF_ROLES and not self.organisation_id: raise ValueError("organisationId is required for staff registration")`; `return self`.

- [ ] **Step 4: Add `UserUpdate` to `app/schemas/user.py`**

```python
class UserUpdate(CamelModel):
    name_en: str | None = None
    name_bn: str | None = None
    phone: str | None = None
    division_id: str | None = None
    district_id: str | None = None
    language: Language | None = None
    alert_divisions: list[str] | None = None
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/schemas/test_auth.py tests/schemas/test_user.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/schemas/auth.py app/schemas/user.py tests/schemas/test_auth.py tests/schemas/test_user.py
git commit -m "backend: B3 add auth and profile-update schemas"
```

---

## Task 7: Auth router — register + login

**Files:**
- Create: `app/routers/auth.py`
- Modify: `app/main.py` (include the router)
- Test: `tests/integration/test_auth.py`

**Interfaces:**
- Consumes: `get_db` (Task 1), `hash_password`/`verify_password`/`create_access_token`/`create_refresh_token`/`hash_token`/`decode_token` (Task 2), `check_rate_limit` (Task 4), `RegisterRequest`/`LoginRequest`/`TokenPair` (Task 6), `app.schemas.user.UserRead`, `app.models.user.{User, RefreshToken}`.
- Produces: `router = APIRouter(prefix="/auth", tags=["auth"])` with `POST /register` (201, `UserRead`) and `POST /login` (200, `TokenPair`), mounted in `app/main.py` as `app.include_router(auth.router, prefix="/api/v1")`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/integration/test_auth.py
import pytest
from sqlalchemy import select
from app.models.enums import ApprovalStatus, Role
from app.models.user import User
from app.services.rate_limit import reset_rate_limits


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    reset_rate_limits()
    yield
    reset_rate_limits()


async def test_register_citizen_is_approved(client):
    resp = await client.post("/api/v1/auth/register", json={
        "nameEn": "Jane", "nameBn": "জেন", "email": "jane@test.local", "password": "password1",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["role"] == "citizen"
    assert body["approvalStatus"] == "approved"


async def test_register_staff_without_organisation_is_422(client):
    resp = await client.post("/api/v1/auth/register", json={
        "nameEn": "Jane", "nameBn": "জেন", "email": "staff@test.local", "password": "password1",
        "role": "hospital_staff",
    })
    assert resp.status_code == 422


async def test_register_staff_with_organisation_is_pending(client, db_session):
    resp = await client.post("/api/v1/auth/register", json={
        "nameEn": "Jane", "nameBn": "জেন", "email": "staff2@test.local", "password": "password1",
        "role": "hospital_staff", "organisationId": "City Hospital",
    })
    assert resp.status_code == 201
    assert resp.json()["approvalStatus"] == "pending"
    row = (await db_session.execute(
        select(User).where(User.email == "staff2@test.local")
    )).scalar_one()
    assert row.organisation_id == "City Hospital"


async def test_register_admin_role_is_rejected(client):
    resp = await client.post("/api/v1/auth/register", json={
        "nameEn": "Jane", "nameBn": "জেন", "email": "wannabe-admin@test.local",
        "password": "password1", "role": "admin",
    })
    assert resp.status_code == 400


async def test_register_duplicate_email_is_409(client):
    payload = {"nameEn": "A", "nameBn": "আ", "email": "dup@test.local", "password": "password1"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


async def test_login_success_returns_tokens(client):
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": "login1@test.local", "password": "password1",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "login1@test.local", "password": "password1",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["accessToken"] and body["refreshToken"]


async def test_login_wrong_password_is_401(client):
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": "login2@test.local", "password": "password1",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "login2@test.local", "password": "wrong-password",
    })
    assert resp.status_code == 401


async def test_login_unknown_email_is_401(client):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "nobody@test.local", "password": "password1",
    })
    assert resp.status_code == 401


async def test_login_rate_limited_after_five_attempts(client):
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": "rl@test.local", "password": "password1",
    })
    for _ in range(5):
        await client.post("/api/v1/auth/login", json={
            "email": "rl@test.local", "password": "wrong",
        })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "rl@test.local", "password": "wrong",
    })
    assert resp.status_code == 429
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/integration/test_auth.py -x -q --timeout=60`
Expected: FAIL — `404` (no router mounted yet) on every request.

- [ ] **Step 3: Implement `app/routers/auth.py`**

```python
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.enums import ApprovalStatus, Role
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair
from app.schemas.user import UserRead
from app.services.rate_limit import check_rate_limit
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

STAFF_ROLES = {Role.hospital_staff, Role.lab_staff, Role.authority}


@router.post("/register", status_code=201, response_model=UserRead)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> User: ...


@router.post("/login", response_model=TokenPair)
async def login(
    payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> TokenPair: ...
```

`register`: 400 `detail="Cannot self-register as admin"` if `payload.role == Role.admin`; 409 `detail="Email already registered"` if `(await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()` is not `None`; `approval_status = ApprovalStatus.pending if payload.role in STAFF_ROLES else ApprovalStatus.approved`; build `User(id=str(uuid.uuid4()), name_en=..., name_bn=..., email=..., phone=..., password_hash=hash_password(payload.password), role=payload.role, approval_status=approval_status, organisation_id=payload.organisation_id, division_id=..., district_id=..., language=..., alert_divisions=[])`; `db.add(user); await db.commit(); return user`.

`login`: `check_rate_limit(f"login:{request.client.host}")`; look up user by email; 401 `detail="Invalid email or password"` if missing or `not verify_password(payload.password, user.password_hash)`; `access = create_access_token(user.id, user.role.value)`; `raw_refresh = create_refresh_token(user.id)`; `claims = decode_token(raw_refresh)`; store `RefreshToken(id=str(uuid.uuid4()), user_id=user.id, token_hash=hash_token(raw_refresh), expires_at=datetime.fromtimestamp(claims["exp"], tz=UTC), revoked=False, created_at=datetime.now(UTC))`; `db.add(...); await db.commit()`; return `TokenPair(access_token=access, refresh_token=raw_refresh)`.

- [ ] **Step 4: Mount the router in `app/main.py`**

```python
from app.routers import auth
...
app.include_router(auth.router, prefix="/api/v1")
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/integration/test_auth.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/routers/auth.py app/main.py tests/integration/test_auth.py
git commit -m "backend: B3 add register and login endpoints"
```

---

## Task 8: Auth router — refresh, logout, me

**Files:**
- Modify: `app/routers/auth.py` (same router, add 3 routes)
- Modify: `tests/integration/test_auth.py` (append tests)

**Interfaces:**
- Consumes: `get_current_user` (Task 5), everything from Task 7.
- Produces: `POST /refresh` (200, `AccessTokenResponse`), `POST /logout` (204), `GET /me` (200, `UserRead`), all under the same `/auth` router.

- [ ] **Step 1: Write the failing tests**

```python
# appended to tests/integration/test_auth.py
from app.schemas.auth import AccessTokenResponse  # noqa: F401 (import sanity)


async def _register_and_login(client, email: str) -> dict:
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": email, "password": "password1",
    })
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "password1"})
    return resp.json()


async def test_refresh_issues_new_access_token(client):
    tokens = await _register_and_login(client, "refresh1@test.local")
    resp = await client.post("/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]})
    assert resp.status_code == 200
    assert resp.json()["accessToken"]


async def test_refresh_rejects_invalid_token(client):
    resp = await client.post("/api/v1/auth/refresh", json={"refreshToken": "garbage"})
    assert resp.status_code == 401


async def test_me_requires_auth(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_returns_current_user(client):
    tokens = await _register_and_login(client, "me1@test.local")
    resp = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['accessToken']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["name"]["en"] == "A"


async def test_logout_revokes_refresh_token(client):
    tokens = await _register_and_login(client, "logout1@test.local")
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    logout_resp = await client.post(
        "/api/v1/auth/logout", json={"refreshToken": tokens["refreshToken"]}, headers=headers
    )
    assert logout_resp.status_code == 204
    refresh_resp = await client.post(
        "/api/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
    )
    assert refresh_resp.status_code == 401
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/integration/test_auth.py -x -q --timeout=60`
Expected: FAIL — `404` on `/refresh`, `/logout`, `/me`.

- [ ] **Step 3: Implement the three routes in `app/routers/auth.py`**

```python
from app.schemas.auth import AccessTokenResponse, RefreshRequest
from app.schemas.user import UserRead
from app.deps import get_current_user
import jwt


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> AccessTokenResponse: ...


@router.post("/logout", status_code=204)
async def logout(
    payload: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None: ...


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
```

`refresh`: `try: claims = decode_token(payload.refresh_token) except jwt.PyJWTError: raise HTTPException(401, "Invalid refresh token")`; 401 if `claims.get("type") != "refresh"`; look up `RefreshToken` by `token_hash=hash_token(payload.refresh_token)`; 401 if missing, `.revoked`, or `.expires_at < datetime.now(UTC)`; `user = await db.get(User, claims["sub"])`; 401 if `user is None`; return `AccessTokenResponse(access_token=create_access_token(user.id, user.role.value))`.

`logout`: `token_hash = hash_token(payload.refresh_token)`; `row = (await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash, RefreshToken.user_id == current_user.id))).scalar_one_or_none()`; `if row: row.revoked = True; await db.commit()` (idempotent — missing/foreign token is a silent no-op, still 204).

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/integration/test_auth.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/routers/auth.py tests/integration/test_auth.py
git commit -m "backend: B3 add refresh, logout and me endpoints"
```

---

## Task 9: Admin router — list/approve/reject pending staff

**Files:**
- Create: `app/routers/admin.py`
- Modify: `app/main.py` (include the router)
- Test: `tests/integration/test_admin.py`

**Interfaces:**
- Consumes: `require_role` (Task 5), `audit.log` (Task 3), `RejectRequest` (Task 6), `UserRead`.
- Produces: `router = APIRouter(prefix="/admin", tags=["admin"])` with `GET /staff/pending` (200, `list[UserRead]`), `POST /staff/{user_id}/approve` (200, `UserRead`), `POST /staff/{user_id}/reject` (200, `UserRead`), mounted at `/api/v1`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/integration/test_admin.py
import pytest
from sqlalchemy import select
from app.models.audit import AuditLog
from app.models.enums import ApprovalStatus, AuditAction, Role
from app.models.user import User
from app.services.security import hash_password


async def _make(db_session, role, approval_status, email) -> User:
    user = User(
        id=f"id-{email}", name_en="Staffer", name_bn="স্টাফ", email=email,
        password_hash=hash_password("x"), role=role, approval_status=approval_status,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _login_headers(client, email: str, password: str = "password1") -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['accessToken']}"}


async def test_list_pending_staff_returns_only_pending(client, db_session):
    await _make(db_session, Role.hospital_staff, ApprovalStatus.pending, "pending1@test.local")
    await _make(db_session, Role.donor, ApprovalStatus.approved, "donor1@test.local")
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin1@test.local")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin1@test.local")
    resp = await client.get("/api/v1/admin/staff/pending", headers=headers)
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()} if "email" in resp.json()[0] else None
    assert len(resp.json()) == 1


async def test_non_admin_cannot_list_pending_staff(client, db_session):
    citizen = await _make(db_session, Role.citizen, ApprovalStatus.approved, "citizen1@test.local")
    citizen.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "citizen1@test.local")
    resp = await client.get("/api/v1/admin/staff/pending", headers=headers)
    assert resp.status_code == 403


async def test_approve_staff_sets_approved_and_creates_audit_row(client, db_session):
    staff = await _make(db_session, Role.hospital_staff, ApprovalStatus.pending, "staff1@test.local")
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin2@test.local")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin2@test.local")
    resp = await client.post(f"/api/v1/admin/staff/{staff.id}/approve", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["approvalStatus"] == "approved"

    row = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == AuditAction.signup_approve)
    )).scalar_one()
    assert row.actor_id == admin.id


async def test_approve_nonexistent_user_is_404(client, db_session):
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin3@test.local")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin3@test.local")
    resp = await client.post("/api/v1/admin/staff/does-not-exist/approve", headers=headers)
    assert resp.status_code == 404


async def test_reject_staff_sets_rejected_with_reason_and_audit_row(client, db_session):
    staff = await _make(db_session, Role.lab_staff, ApprovalStatus.pending, "staff2@test.local")
    admin = await _make(db_session, Role.admin, ApprovalStatus.approved, "admin4@test.local")
    admin.password_hash = hash_password("password1")
    await db_session.commit()

    headers = await _login_headers(client, "admin4@test.local")
    resp = await client.post(
        f"/api/v1/admin/staff/{staff.id}/reject", json={"reason": "no license on file"}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["approvalStatus"] == "rejected"

    row = (await db_session.execute(
        select(AuditLog).where(AuditLog.action == AuditAction.signup_reject)
    )).scalar_one()
    assert "no license on file" in row.target_en
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/integration/test_admin.py -x -q --timeout=60`
Expected: FAIL — `404` (no router mounted).

- [ ] **Step 3: Implement `app/routers/admin.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_role
from app.models.enums import ApprovalStatus, AuditAction, Role
from app.models.user import User
from app.schemas.auth import RejectRequest
from app.schemas.user import UserRead
from app.services import audit

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/staff/pending", response_model=list[UserRead])
async def list_pending_staff(
    current_user: User = Depends(require_role(Role.admin)), db: AsyncSession = Depends(get_db)
) -> list[User]: ...


@router.post("/staff/{user_id}/approve", response_model=UserRead)
async def approve_staff(
    user_id: str,
    current_user: User = Depends(require_role(Role.admin)),
    db: AsyncSession = Depends(get_db),
) -> User: ...


@router.post("/staff/{user_id}/reject", response_model=UserRead)
async def reject_staff(
    user_id: str,
    payload: RejectRequest,
    current_user: User = Depends(require_role(Role.admin)),
    db: AsyncSession = Depends(get_db),
) -> User: ...
```

`list_pending_staff`: `select(User).where(User.approval_status == ApprovalStatus.pending)`, return `.scalars().all()`.

`approve_staff`/`reject_staff`: `target = await db.get(User, user_id)`; 404 `detail="User not found"` if `target is None`; set `target.approval_status = ApprovalStatus.approved` (or `.rejected`); call `audit.log(db, current_user, AuditAction.signup_approve, f"Approved {target.name_en}", f"{target.name_bn} অনুমোদন করা হয়েছে")` (reject: `AuditAction.signup_reject`, `f"Rejected {target.name_en}"`, `f"{target.name_bn} প্রত্যাখ্যান করা হয়েছে"`, `details=payload.reason`); `await db.commit()`; return `target`.

- [ ] **Step 4: Mount the router in `app/main.py`**

```python
from app.routers import admin
...
app.include_router(admin.router, prefix="/api/v1")
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/integration/test_admin.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/routers/admin.py app/main.py tests/integration/test_admin.py
git commit -m "backend: B3 add admin staff approval endpoints with audit logging"
```

---

## Task 10: Profile router — GET/PATCH /users/me

**Files:**
- Create: `app/routers/users.py`
- Modify: `app/main.py` (include the router)
- Test: `tests/integration/test_users.py`

**Interfaces:**
- Consumes: `get_current_user` (Task 5), `UserUpdate`/`UserRead` (Task 6).
- Produces: `router = APIRouter(prefix="/users", tags=["users"])` with `GET /me` (200, `UserRead`) and `PATCH /me` (200, `UserRead`), mounted at `/api/v1`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/integration/test_users.py
async def _register_and_login(client, email: str) -> dict:
    await client.post("/api/v1/auth/register", json={
        "nameEn": "A", "nameBn": "আ", "email": email, "password": "password1",
    })
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "password1"})
    return resp.json()


async def test_get_me_requires_auth(client):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


async def test_get_me_returns_profile(client):
    tokens = await _register_and_login(client, "profile1@test.local")
    resp = await client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {tokens['accessToken']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["name"]["en"] == "A"


async def test_patch_me_updates_allowed_fields(client):
    tokens = await _register_and_login(client, "profile2@test.local")
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    resp = await client.patch(
        "/api/v1/users/me", json={"phone": "+8801700000001", "alertDivisions": ["dhaka"]}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["alertDivisions"] == ["dhaka"]


async def test_patch_me_ignores_unset_fields(client):
    tokens = await _register_and_login(client, "profile3@test.local")
    headers = {"Authorization": f"Bearer {tokens['accessToken']}"}
    await client.patch("/api/v1/users/me", json={"phone": "+8801700000002"}, headers=headers)
    resp = await client.patch("/api/v1/users/me", json={"nameBn": "নতুন নাম"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"]["bn"] == "নতুন নাম"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv\Scripts\python.exe -m pytest tests/integration/test_users.py -x -q --timeout=60`
Expected: FAIL — `404` (no router mounted).

- [ ] **Step 3: Implement `app/routers/users.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User: ...
```

`update_me`: `for field, value in payload.model_dump(exclude_unset=True).items(): setattr(current_user, field, value)`; `db.add(current_user); await db.commit(); return current_user`.

- [ ] **Step 4: Mount the router in `app/main.py`**

```python
from app.routers import users
...
app.include_router(users.router, prefix="/api/v1")
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv\Scripts\python.exe -m pytest tests/integration/test_users.py -x -q --timeout=60`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/routers/users.py app/main.py tests/integration/test_users.py
git commit -m "backend: B3 add profile get/patch endpoints"
```

---

## Task 11: Full verification + demo-login smoke check + final commit

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Lint**

Run: `.venv\Scripts\python.exe -m ruff check .`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `.venv\Scripts\python.exe -m pytest -x -q --timeout=60`
Expected: all tests pass (never pipe through `tail`; if any single command looks like running past 3 minutes, stop it and report instead of waiting).

- [ ] **Step 3: App import smoke check**

Run: `.venv\Scripts\python.exe -c "from app.main import app; print([r.path for r in app.routes])"`
Expected: prints a route list including `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/admin/staff/pending`, `/api/v1/users/me`, with no import errors.

- [ ] **Step 4: Demo-login check against the seeded database**

Run: `.venv\Scripts\python.exe -m app.seed` (seeds demo users if not already present), then exercise one login manually, e.g. via `.venv\Scripts\python.exe -c "..."` hitting `/api/v1/auth/login` with `citizen@dengueguard.bd` / `Demo@1234` through an `AsyncClient` against the real `app.main.app` (no `get_db` override) — or confirm this is already implied by `test_login_success_returns_tokens` against a client-registered user and that no code path treats seeded vs. registered users differently. Report the result either way.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "backend: B3 auth, roles, approvals, audit"
```

(If there is nothing left uncommitted because every task already committed its own slice, skip this step and say so — do not create an empty commit.)
