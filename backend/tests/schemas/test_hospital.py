from types import SimpleNamespace

from app.schemas.hospital import BedAvailabilityRead


def test_bed_availability_read_dumps_expected_shape():
    row = SimpleNamespace(
        hospital_id="h-dhaka-1",
        general_total=100,
        general_available=20,
        icu_total=10,
        icu_available=2,
        updated_at="2026-11-22T10:00:00Z",
    )
    out = BedAvailabilityRead.model_validate(row).model_dump(by_alias=True)
    assert out == {
        "hospitalId": "h-dhaka-1",
        "generalTotal": 100,
        "generalAvailable": 20,
        "icuTotal": 10,
        "icuAvailable": 2,
        "updatedAt": "2026-11-22T10:00:00Z",
    }
