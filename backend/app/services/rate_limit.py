import time

from fastapi import HTTPException

_attempts: dict[str, list[float]] = {}


def check_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 60) -> None:
    now = time.monotonic()
    recent = [t for t in _attempts.get(key, []) if now - t < window_seconds]
    if len(recent) >= max_attempts:
        raise HTTPException(429, detail="Too many login attempts, try again later.")
    recent.append(now)
    _attempts[key] = recent


def reset_rate_limits() -> None:
    _attempts.clear()
