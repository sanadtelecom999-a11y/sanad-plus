import { describe, it, expect } from 'vitest';

function calculateCartTotal(cartItems) {
  return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
}

describe('Cart Logic', () => {
  it('should calculate total price correctly for empty cart', () => {
    expect(calculateCartTotal([])).toBe(0);
  });

  it('should calculate total price for multiple items', () => {
    const cart = [
      { price: 10, quantity: 2 },
      { price: 5.5, quantity: 1 }
    ];
    expect(calculateCartTotal(cart)).toBe(25.5);
  });
});
