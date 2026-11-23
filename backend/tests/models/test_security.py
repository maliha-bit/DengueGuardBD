import time

import jwt
import pytest

from app.config import settings
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_hash_password_round_trips():
    hashed = hash_password("Demo@1234")
    assert hashed != "Demo@1234"
    assert verify_password("Demo@1234", hashed)
    assert not verify_password("wrong", hashed)


def test_create_and_decode_access_token():
    token = create_access_token("user-1", "citizen")
    claims = decode_token(token)
    assert claims["sub"] == "user-1"
    assert claims["role"] == "citizen"
    assert claims["type"] == "access"


def test_create_and_decode_refresh_token():
    token = create_refresh_token("user-1")
    claims = decode_token(token)
    assert claims["sub"] == "user-1"
    assert claims["type"] == "refresh"
    assert "jti" in claims


def test_decode_token_rejects_garbage():
    with pytest.raises(jwt.PyJWTError):
        decode_token("not-a-real-token")


def test_decode_token_rejects_expired_token():
    expired = jwt.encode(
        {"sub": "user-1", "type": "access", "exp": int(time.time()) - 10},
        settings.jwt_secret,
        algorithm="HS256",
    )
    with pytest.raises(jwt.PyJWTError):
        decode_token(expired)


def test_hash_token_is_deterministic_and_distinct():
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != hash_token("xyz")
