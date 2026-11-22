from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import ForecastJobStatus, RiskLevel, TrendDirection
from app.models.mixins import UUIDPkMixin, enum_column


class ForecastRun(Base, UUIDPkMixin):
    __tablename__ = "forecast_runs"

    status: Mapped[ForecastJobStatus] = mapped_column(
        enum_column(ForecastJobStatus), default=ForecastJobStatus.running
    )
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    triggered_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Forecast(Base, UUIDPkMixin):
    __tablename__ = "forecasts"
    __table_args__ = (
        UniqueConstraint(
            "division_id", "target_date", "forecast_run_id", name="uq_forecast_division_date_run"
        ),
    )

    forecast_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("forecast_runs.id"), index=True
    )
    division_id: Mapped[str] = mapped_column(String(32), ForeignKey("divisions.id"), index=True)
    target_date: Mapped[date] = mapped_column(Date)
    predicted_cases: Mapped[int] = mapped_column(Integer)
    risk_level: Mapped[RiskLevel] = mapped_column(enum_column(RiskLevel))
    trend: Mapped[TrendDirection] = mapped_column(enum_column(TrendDirection))
    drivers: Mapped[dict] = mapped_column(JSON, default=dict)
    model_version: Mapped[str] = mapped_column(String(32))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
