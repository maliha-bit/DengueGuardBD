from app.models.donor import DonorProfile, DonorRequest, MisuseReport


def test_donor_profile_user_fk_unique():
    fk_targets = {fk.target_fullname for fk in DonorProfile.__table__.foreign_keys}
    assert "users.id" in fk_targets
    assert DonorProfile.__table__.c.user_id.unique is True


def test_donor_request_fks():
    fk_targets = {fk.target_fullname for fk in DonorRequest.__table__.foreign_keys}
    assert "donor_profiles.id" in fk_targets
    assert "users.id" in fk_targets
    assert "hospitals.id" in fk_targets


def test_misuse_report_fks_nullable():
    assert MisuseReport.__table__.c.donor_request_id.nullable is True
    assert MisuseReport.__table__.c.donor_id.nullable is True
    fk_targets = {fk.target_fullname for fk in MisuseReport.__table__.foreign_keys}
    assert "users.id" in fk_targets
