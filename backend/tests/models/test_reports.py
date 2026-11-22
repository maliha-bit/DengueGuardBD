from app.models.reports import BreedingReport, PreventionTask, ReportStatusHistory


def test_breeding_report_reference_is_unique():
    assert BreedingReport.__table__.c.reference.unique is True


def test_report_status_history_fk_to_breeding_reports():
    fk_targets = {fk.target_fullname for fk in ReportStatusHistory.__table__.foreign_keys}
    assert "breeding_reports.id" in fk_targets
    assert "users.id" in fk_targets


def test_prevention_task_fks():
    fk_targets = {fk.target_fullname for fk in PreventionTask.__table__.foreign_keys}
    assert "divisions.id" in fk_targets
    assert "breeding_reports.id" in fk_targets
