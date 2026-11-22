from types import SimpleNamespace

from app.schemas.health_records import ChecklistProgressRead


def test_checklist_progress_read_dumps_expected_shape():
    row = SimpleNamespace(checked=["t-1", "t-3"], updated_at="2026-11-22T10:00:00Z")
    out = ChecklistProgressRead.model_validate(row).model_dump(by_alias=True)
    assert out == {"checked": ["t-1", "t-3"], "updatedAt": "2026-11-22T10:00:00Z"}
