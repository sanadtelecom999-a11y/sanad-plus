ALLOWED_TRANSITIONS = {
    "pending":    {"cancelled", "review"},
    "review":     {"processing", "cancellation_requested"},
    "processing": {"completed", "failed"},
    "completed":  set(), "failed": set(), "cancelled": set()
}
def can_transition(from_status: str, to_status: str) -> bool:
    return to_status in ALLOWED_TRANSITIONS.get(from_status, set())
def test_pending_to_completed_forbidden():
    assert not can_transition("pending", "completed")
