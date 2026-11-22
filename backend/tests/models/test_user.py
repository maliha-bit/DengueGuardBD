from sqlalchemy import UniqueConstraint

from app.models.user import RefreshToken, User


def test_user_email_column_is_unique():
    assert User.__table__.c.email.unique is True


def test_user_division_and_district_fks():
    fk_targets = {fk.target_fullname for fk in User.__table__.foreign_keys}
    assert "divisions.id" in fk_targets
    assert "districts.id" in fk_targets


def test_refresh_token_user_fk_and_unique_token_hash():
    fk_targets = {fk.target_fullname for fk in RefreshToken.__table__.foreign_keys}
    assert "users.id" in fk_targets
    assert RefreshToken.__table__.c.token_hash.unique is True
