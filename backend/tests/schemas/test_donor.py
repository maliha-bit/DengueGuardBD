from types import SimpleNamespace

from app.schemas.donor import DonorListing, DonorRequestRead


def test_donor_listing_schema_has_no_raw_phone_field():
    assert "phone" not in DonorListing.model_fields
    assert "user_id" not in DonorListing.model_fields
    assert "share_after_accept" not in DonorListing.model_fields


def test_donor_listing_masks_phone():
    row = SimpleNamespace(
        id="d-1",
        name_en="Rafiq",
        name_bn="রফিক",
        blood_group="O+",
        donation_type="whole_blood",
        division_id="dhaka",
        district_id="dhaka",
        last_donation_date=None,
        phone="01712345123",
        available=True,
        last_active_at="2026-11-22T10:00:00Z",
    )
    out = DonorListing.model_validate(row).model_dump(by_alias=True)
    assert out["donorId"] == "d-1"
    assert out["maskedPhone"] == "01XXX-XXX-123"
    assert "phone" not in out


def test_donor_request_read_hides_donor_phone_until_accepted():
    row = SimpleNamespace(
        id="r-1",
        donation_type="whole_blood",
        patient_blood_group="O+",
        hospital_id="h-1",
        units_needed=2,
        needed_by="2026-11-25T00:00:00Z",
        note="urgent",
        status="sent",
        created_at="2026-11-22T10:00:00Z",
        responded_at=None,
        closed_at=None,
        donor_phone="01700000000",
        contact_phone=None,
    )
    out = DonorRequestRead.model_validate(row).model_dump(by_alias=True)
    assert out["donorPhone"] is None


def test_donor_request_read_shows_donor_phone_when_accepted():
    row = SimpleNamespace(
        id="r-2",
        donation_type="whole_blood",
        patient_blood_group="O+",
        hospital_id="h-1",
        units_needed=2,
        needed_by="2026-11-25T00:00:00Z",
        note="urgent",
        status="accepted",
        created_at="2026-11-22T10:00:00Z",
        responded_at="2026-11-22T11:00:00Z",
        closed_at=None,
        donor_phone="01700000000",
        contact_phone="01800000000",
    )
    out = DonorRequestRead.model_validate(row).model_dump(by_alias=True)
    assert out["donorPhone"] == "01700000000"
