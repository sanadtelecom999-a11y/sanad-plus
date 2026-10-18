import pytest

def apply_balance_change(balance: float, amount: float, max_negative: float) -> float:
    new_balance = balance + amount
    if new_balance < max_negative:
        raise ValueError("BALANCE_LIMIT_EXCEEDED")
    return new_balance

def test_positive_balance_change():
    assert apply_balance_change(100.0, 50.0, -10.0) == 150.0

def test_negative_change_within_limit():
    assert apply_balance_change(100.0, -50.0, -10.0) == 50.0

def test_negative_change_exceeds_limit():
    with pytest.raises(ValueError, match="BALANCE_LIMIT_EXCEEDED"):
        apply_balance_change(5.0, -20.0, -10.0)

def test_exact_limit_boundary():
    assert apply_balance_change(0.0, -10.0, -10.0) == -10.0
