import pytest
from fastapi import HTTPException

from app.services.rate_limit import check_rate_limit, reset_rate_limits


def setup_function():
    reset_rate_limits()


def test_allows_up_to_max_attempts():
    for _ in range(5):
        check_rate_limit("1.2.3.4", max_attempts=5, window_seconds=60)


def test_blocks_after_max_attempts():
    for _ in range(5):
        check_rate_limit("1.2.3.4", max_attempts=5, window_seconds=60)
    with pytest.raises(HTTPException) as exc_info:
        check_rate_limit("1.2.3.4", max_attempts=5, window_seconds=60)
    assert exc_info.value.status_code == 429


def test_keys_are_independent():
    for _ in range(5):
        check_rate_limit("1.2.3.4", max_attempts=5, window_seconds=60)
    check_rate_limit("5.6.7.8", max_attempts=5, window_seconds=60)
