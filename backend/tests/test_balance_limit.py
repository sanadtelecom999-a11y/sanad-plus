def apply_balance_change(balance: float, amount: float, max_negative: float) -> float:
    new_balance = balance + amount
    if new_balance < max_negative:
        raise ValueError("BALANCE_LIMIT_EXCEEDED")
    return new_balance
def test_negative_change_exceeds_limit():
    try:
        apply_balance_change(5.0, -20.0, -10.0)
        assert False, "Should have raised"
    except ValueError as e:
        assert str(e) == "BALANCE_LIMIT_EXCEEDED"
