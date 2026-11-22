from sqlalchemy import UniqueConstraint

from app.models.health_records import ChecklistProgress, FeverLog, TriageResult


def test_triage_result_user_fk():
    fk_targets = {fk.target_fullname for fk in TriageResult.__table__.foreign_keys}
    assert "users.id" in fk_targets


def test_fever_log_unique_user_date():
    fk_targets = {fk.target_fullname for fk in FeverLog.__table__.foreign_keys}
    assert "users.id" in fk_targets
    names = {c.name for c in FeverLog.__table__.constraints if isinstance(c, UniqueConstraint)}
    assert "uq_fever_log_user_date" in names


def test_checklist_progress_user_unique():
    assert ChecklistProgress.__table__.c.user_id.unique is True
