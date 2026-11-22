from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin


class Division(Base, TimestampMixin):
    __tablename__ = "divisions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name_en: Mapped[str] = mapped_column(String(100))
    name_bn: Mapped[str] = mapped_column(String(100))
    center_lat: Mapped[float] = mapped_column(Float)
    center_lng: Mapped[float] = mapped_column(Float)

    districts: Mapped[list["District"]] = relationship(back_populates="division")


class District(Base, TimestampMixin):
    __tablename__ = "districts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    division_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("divisions.id"), index=True
    )
    name_en: Mapped[str] = mapped_column(String(100))
    name_bn: Mapped[str] = mapped_column(String(100))
    center_lat: Mapped[float] = mapped_column(Float)
    center_lng: Mapped[float] = mapped_column(Float)

    division: Mapped[Division] = relationship(back_populates="districts")
