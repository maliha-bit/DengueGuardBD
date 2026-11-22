from types import SimpleNamespace

from app.schemas.chatbot import KnowledgeSourceRead


def test_knowledge_source_read_dumps_reviewed_on():
    row = SimpleNamespace(
        id="k-1",
        title="National Guideline for Clinical Management of Dengue",
        publisher="DGHS",
        url="https://dghs.gov.bd/dengue-guideline",
        reviewed_on="2026-01-15",
    )
    out = KnowledgeSourceRead.model_validate(row).model_dump(by_alias=True)
    assert out["sourceId"] == "k-1"
    assert out["reviewedOn"] == "2026-01-15"
