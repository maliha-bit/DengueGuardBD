from app.schemas.user import UserRead


def test_user_read_excludes_password_hash():
    assert "password_hash" not in UserRead.model_fields
