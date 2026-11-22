from types import SimpleNamespace

from app.schemas.geo import DistrictRead, DivisionRead


def test_division_read_dumps_expected_shape():
    row = SimpleNamespace(
        id="dhaka", name_en="Dhaka", name_bn="ঢাকা", center_lat=23.81, center_lng=90.41
    )
    out = DivisionRead.model_validate(row).model_dump(by_alias=True)
    assert out == {
        "divisionId": "dhaka",
        "name": {"en": "Dhaka", "bn": "ঢাকা"},
        "center": [23.81, 90.41],
    }


def test_district_read_dumps_expected_shape():
    row = SimpleNamespace(
        id="gazipur", name_en="Gazipur", name_bn="গাজীপুর", center_lat=24.0, center_lng=90.42
    )
    out = DistrictRead.model_validate(row).model_dump(by_alias=True)
    assert out == {
        "districtId": "gazipur",
        "name": {"en": "Gazipur", "bn": "গাজীপুর"},
        "center": [24.0, 90.42],
    }
