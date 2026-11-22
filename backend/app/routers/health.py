from fastapi import APIRouter

from app.db import get_db_status

router = APIRouter()

APP_VERSION = "0.1.0"


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "version": APP_VERSION,
        "database": await get_db_status(),
    }
