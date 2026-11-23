import pytest
from pydantic import ValidationError

from app.models.enums import Role
from app.schemas.auth import RegisterRequest, TokenPair


def test_register_citizen_without_organisation_is_valid():
    RegisterRequest(nameEn="A", nameBn="আ", email="a@example.com", password="password1")


def test_register_staff_requires_organisation_id():
    with pytest.raises(ValidationError):
        RegisterRequest(
            nameEn="A", nameBn="আ", email="a@example.com", password="password1",
            role=Role.hospital_staff,
        )


def test_register_staff_with_organisation_id_is_valid():
    req = RegisterRequest(
        nameEn="A", nameBn="আ", email="a@example.com", password="password1",
        role=Role.hospital_staff, organisationId="City Hospital",
    )
    assert req.organisation_id == "City Hospital"


def test_token_pair_uses_camel_case_aliases():
    pair = TokenPair(accessToken="a", refreshToken="b")
    assert pair.model_dump(by_alias=True) == {
        "accessToken": "a", "refreshToken": "b", "tokenType": "bearer",
    }
