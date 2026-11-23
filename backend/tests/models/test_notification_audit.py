from app.models.audit import AuditLog
from app.models.enums import AuditAction
from app.models.notification import Notification

# Copied verbatim from src/api/types.ts's AuditAction union.
FRONTEND_AUDIT_ACTIONS = {
    "beds_update",
    "doctor_create",
    "doctor_update",
    "doctor_deactivate",
    "doctor_activate",
    "schedule_update",
    "slots_publish",
    "appointment_completed",
    "appointment_missed",
    "lab_publish",
    "report_status",
    "task_create",
    "task_move",
    "signup_approve",
    "signup_reject",
    "hospital_update",
    "hospital_deactivate",
    "hospital_activate",
    "lab_update",
    "lab_deactivate",
    "lab_activate",
    "user_update",
    "user_deactivate",
    "user_activate",
    "donor_update",
    "donor_deactivate",
    "donor_activate",
    "source_create",
    "source_update",
    "source_delete",
    "forecast_run",
    "export_csv",
}


def test_audit_action_matches_frontend_exactly():
    assert {a.value for a in AuditAction} == FRONTEND_AUDIT_ACTIONS


def test_notification_user_fk():
    fk_targets = {fk.target_fullname for fk in Notification.__table__.foreign_keys}
    assert "users.id" in fk_targets


def test_audit_log_actor_fk():
    fk_targets = {fk.target_fullname for fk in AuditLog.__table__.foreign_keys}
    assert "users.id" in fk_targets
