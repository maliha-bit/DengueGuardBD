from types import SimpleNamespace

from app.schemas.audit import AuditEntryRead
from app.schemas.notification import NotificationRead


def test_notification_read_dumps_expected_shape():
    row = SimpleNamespace(
        id="n-1",
        kind="risk_alert",
        title_en="Dhaka risk is high",
        title_bn="ঢাকায় ঝুঁকি উচ্চ",
        body_en="Body",
        body_bn="বডি",
        created_at="2026-11-22T10:00:00Z",
        read=False,
    )
    out = NotificationRead.model_validate(row).model_dump(by_alias=True)
    assert out["notificationId"] == "n-1"
    assert out["kind"] == "risk_alert"
    assert out["title"] == {"en": "Dhaka risk is high", "bn": "ঢাকায় ঝুঁকি উচ্চ"}
    assert out["read"] is False


def test_audit_entry_read_dumps_expected_shape():
    row = SimpleNamespace(
        id="a-1",
        actor_name_en="Admin User",
        actor_name_bn="অ্যাডমিন ইউজার",
        actor_role="admin",
        action="beds_update",
        target_en="Dhaka Community Hospital",
        target_bn="ঢাকা কমিউনিটি হাসপাতাল",
        created_at="2026-11-22T10:00:00Z",
    )
    out = AuditEntryRead.model_validate(row).model_dump(by_alias=True)
    assert out["auditId"] == "a-1"
    assert out["actorRole"] == "admin"
    assert out["action"] == "beds_update"
    assert out["target"] == {"en": "Dhaka Community Hospital", "bn": "ঢাকা কমিউনিটি হাসপাতাল"}
