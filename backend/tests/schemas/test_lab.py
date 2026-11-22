from types import SimpleNamespace

from app.schemas.lab import LabRead


def test_lab_read_dumps_home_collection_and_weekly_hours():
    row = SimpleNamespace(
        id="l-dhaka-1",
        name_en="Dhaka Diagnostic Centre",
        name_bn="ঢাকা ডায়াগনস্টিক সেন্টার",
        type="private",
        division_id="dhaka",
        district_id="dhaka",
        address_en="1 Lab Road",
        address_bn="১ ল্যাব রোড",
        phone="+8802000000001",
        lat=23.81,
        lng=90.41,
        home_collection=True,
        weekly_hours=[{"kind": "allDay"}] * 7,
        tests=[],
    )
    out = LabRead.model_validate(row).model_dump(by_alias=True)
    assert out["homeCollection"] is True
    assert out["weeklyHours"] == [{"kind": "allDay"}] * 7
    assert out["labId"] == "l-dhaka-1"
