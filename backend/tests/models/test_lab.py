from sqlalchemy import UniqueConstraint

from app.models.lab import Lab, LabTest


def test_lab_division_and_district_fks():
    fk_targets = {fk.target_fullname for fk in Lab.__table__.foreign_keys}
    assert "divisions.id" in fk_targets
    assert "districts.id" in fk_targets


def test_lab_test_fk_and_unique_lab_code():
    fk_targets = {fk.target_fullname for fk in LabTest.__table__.foreign_keys}
    assert "labs.id" in fk_targets
    names = {c.name for c in LabTest.__table__.constraints if isinstance(c, UniqueConstraint)}
    assert "uq_lab_test_lab_code" in names
