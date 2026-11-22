from types import SimpleNamespace

from app.schemas.common import CamelModel, LocalizedText, loc


def test_localized_text_dumps_camel_case():
    class Thing(CamelModel):
        name: LocalizedText
        division_id: str

    t = Thing(name=LocalizedText(en="Dhaka", bn="ঢাকা"), division_id="dhaka")
    assert t.model_dump(by_alias=True) == {
        "name": {"en": "Dhaka", "bn": "ঢাকা"},
        "divisionId": "dhaka",
    }


def test_loc_helper_builds_localized_dict():
    row = SimpleNamespace(name_en="Dhaka", name_bn="ঢাকা")
    assert loc(row, "name") == {"en": "Dhaka", "bn": "ঢাকা"}
