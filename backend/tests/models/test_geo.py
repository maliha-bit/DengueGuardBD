from app.models.geo import District, Division


def test_division_table_name_is_divisions():
    assert Division.__tablename__ == "divisions"


def test_district_table_has_division_fk():
    fk_targets = {fk.target_fullname for fk in District.__table__.foreign_keys}
    assert "divisions.id" in fk_targets


def test_district_division_id_is_indexed():
    assert District.__table__.c.division_id.index
