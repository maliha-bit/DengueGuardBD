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
) -> User:
    if credentials is None:
        raise HTTPException(401, detail="Not authenticated")
    try:
        claims = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        raise HTTPException(401, detail="Invalid or expired token") from None
    if claims.get("type") != "access":
        raise HTTPException(401, detail="Invalid token type")
    user = await db.get(User, claims["sub"])
    if user is None:
        raise HTTPException(401, detail="User not found")
    return user


async def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    try:
        claims = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        return None
    if claims.get("type") != "access":
        return None
    return await db.get(User, claims["sub"])


def require_role(*roles: Role) -> Callable[..., Awaitable[User]]:
    async def _dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, detail="forbidden")
        if user.approval_status != ApprovalStatus.approved:
            raise HTTPException(403, detail="approval_pending")
        return user

    return _dependency
