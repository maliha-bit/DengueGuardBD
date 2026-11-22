from app.services.security import hash_password, verify_password


def test_hash_password_round_trips():
    hashed = hash_password("Demo@1234")
    assert hashed != "Demo@1234"
    assert verify_password("Demo@1234", hashed)
    assert not verify_password("wrong", hashed)
