from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class LocalizedText(CamelModel):
    en: str
    bn: str


def loc(obj: Any, prefix: str) -> dict[str, str]:
    return {"en": getattr(obj, f"{prefix}_en"), "bn": getattr(obj, f"{prefix}_bn")}
