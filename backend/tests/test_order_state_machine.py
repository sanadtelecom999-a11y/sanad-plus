ALLOWED_TRANSITIONS = {
    "pending":    {"cancelled", "review"},
    "review":     {"processing", "cancellation_requested"},
    "processing": {"completed", "failed"},
    "completed":  set(),
    "failed":     set(),
    "cancelled":  set(),
    "cancellation_requested": {"cancelled", "processing"},
}

def can_transition(from_status: str, to_status: str) -> bool:
    return to_status in ALLOWED_TRANSITIONS.get(from_status, set())

def test_pending_to_review_allowed():
    assert can_transition("pending", "review")

def test_pending_to_completed_forbidden():
    assert not can_transition("pending", "completed")

def test_completed_is_terminal():
    for target in ALLOWED_TRANSITIONS.keys():
        assert not can_transition("completed", target)

def test_failed_is_terminal():
    assert not can_transition("failed", "completed")
    assert not can_transition("failed", "processing")

def test_cancellation_requested_can_be_resolved():
    assert can_transition("cancellation_requested", "cancelled")
    assert can_transition("cancellation_requested", "processing")

def test_full_happy_path():
    path = ["pending", "review", "processing", "completed"]
    for a, b in zip(path, path[1:]):
        assert can_transition(a, b), f"{a} -> {b} should be allowed"
