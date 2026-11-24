import pytest
from pydantic import ValidationError

from app.schemas.user import UserRead, UserUpdate


def test_user_read_excludes_password_hash():
    assert "password_hash" not in UserRead.model_fields


def test_user_update_fields_all_optional():
    update = UserUpdate()
    assert update.model_dump(exclude_unset=True) == {}


def test_user_update_rejects_null_name_en():
    with pytest.raises(ValidationError):
        UserUpdate(nameEn=None)


def test_user_update_rejects_null_language():
    with pytest.raises(ValidationError):
        UserUpdate(language=None)


def test_user_update_allows_null_phone():
    update = UserUpdate(phone=None)
    assert update.phone is None


def test_user_update_rejects_overlong_phone():
    with pytest.raises(ValidationError):
        UserUpdate(phone="1" * 33)
