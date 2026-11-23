from app.schemas.user import UserRead, UserUpdate


def test_user_read_excludes_password_hash():
    assert "password_hash" not in UserRead.model_fields


def test_user_update_fields_all_optional():
    update = UserUpdate()
    assert update.model_dump(exclude_unset=True) == {}
