from types import SimpleNamespace

from app.schemas.reports import BreedingReportRead


def test_breeding_report_read_dumps_expected_shape():
    row = SimpleNamespace(
        id="r-1",
        reference="BR-2026-000123",
        user_id="u-1",
        photo_path=None,
        lat=23.81,
        lng=90.41,
        area_name="Mirpur",
        site_type="drain",
        note="standing water near drain",
        status="submitted",
        status_note=None,
        created_at="2026-11-22T10:00:00Z",
        updated_at="2026-11-22T10:00:00Z",
    )
    out = BreedingReportRead.model_validate(row).model_dump(by_alias=True)
    assert out["reportId"] == "r-1"
    assert out["reference"] == "BR-2026-000123"
    assert out["location"] == [23.81, 90.41]
    assert out["siteType"] == "drain"
