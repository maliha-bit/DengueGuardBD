import enum


class Role(str, enum.Enum):
    citizen = "citizen"
    donor = "donor"
    hospital_staff = "hospital_staff"
    lab_staff = "lab_staff"
    authority = "authority"
    admin = "admin"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Language(str, enum.Enum):
    en = "en"
    bn = "bn"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TrendDirection(str, enum.Enum):
    up = "up"
    down = "down"
    flat = "flat"


class HospitalType(str, enum.Enum):
    government = "government"
    private = "private"


class AppointmentStatus(str, enum.Enum):
    booked = "booked"
    cancelled = "cancelled"
    completed = "completed"
    missed = "missed"


class ForecastJobStatus(str, enum.Enum):
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class LabTestCode(str, enum.Enum):
    ns1 = "ns1"
    igm_igg = "igm_igg"
    cbc = "cbc"


class BloodGroup(str, enum.Enum):
    a_pos = "A+"
    a_neg = "A-"
    b_pos = "B+"
    b_neg = "B-"
    ab_pos = "AB+"
    ab_neg = "AB-"
    o_pos = "O+"
    o_neg = "O-"


class DonationType(str, enum.Enum):
    whole_blood = "whole_blood"
    platelets = "platelets"
    both = "both"


class DonorRequestStatus(str, enum.Enum):
    sent = "sent"
    accepted = "accepted"
    declined = "declined"
    fulfilled = "fulfilled"
    expired = "expired"


class MisuseReason(str, enum.Enum):
    fake = "fake"
    spam = "spam"
    abusive = "abusive"
    payment = "payment"
    other = "other"


class BreedingSiteType(str, enum.Enum):
    standing_water = "standing_water"
    drain = "drain"
    tyres = "tyres"
    construction = "construction"
    other = "other"


class BreedingReportStatus(str, enum.Enum):
    submitted = "submitted"
    under_review = "under_review"
    action_taken = "action_taken"
    rejected = "rejected"


class PreventionTaskStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class TriageOutcome(str, enum.Enum):
    monitor = "monitor"
    doctor = "doctor"
    emergency = "emergency"


class AgeGroup(str, enum.Enum):
    under5 = "under5"
    child = "child"
    adult = "adult"
    senior = "senior"


class FeverDays(str, enum.Enum):
    none = "none"
    oneToTwo = "oneToTwo"
    threeToFive = "threeToFive"
    sixPlus = "sixPlus"


class UrineOutput(str, enum.Enum):
    normal = "normal"
    less = "less"


class ChatMessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class ChatSource(str, enum.Enum):
    dghs = "dghs"
    who = "who"


class ChatFeedback(str, enum.Enum):
    up = "up"
    down = "down"


class NotificationKind(str, enum.Enum):
    risk_alert = "risk_alert"
    appointment = "appointment"
    donor_request = "donor_request"


class AuditAction(str, enum.Enum):
    beds_update = "beds_update"
    doctor_create = "doctor_create"
    doctor_update = "doctor_update"
    doctor_deactivate = "doctor_deactivate"
    doctor_activate = "doctor_activate"
    schedule_update = "schedule_update"
    slots_publish = "slots_publish"
    appointment_completed = "appointment_completed"
    appointment_missed = "appointment_missed"
    lab_publish = "lab_publish"
    report_status = "report_status"
    task_create = "task_create"
    task_move = "task_move"
    signup_approve = "signup_approve"
    signup_reject = "signup_reject"
    hospital_update = "hospital_update"
    hospital_deactivate = "hospital_deactivate"
    hospital_activate = "hospital_activate"
    lab_update = "lab_update"
    lab_deactivate = "lab_deactivate"
    lab_activate = "lab_activate"
    user_update = "user_update"
    user_deactivate = "user_deactivate"
    user_activate = "user_activate"
    donor_update = "donor_update"
    donor_deactivate = "donor_deactivate"
    donor_activate = "donor_activate"
    source_create = "source_create"
    source_update = "source_update"
    source_delete = "source_delete"
    forecast_run = "forecast_run"
    export_csv = "export_csv"
