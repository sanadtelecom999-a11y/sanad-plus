# 📋 SANAD PLUS⁺ — API Contract

**الإصدار:** v18.4  
**Base URL:** `https://sanad-plus-backend.onrender.com`  
**Auth:** JWT Bearer · HMAC-SHA256 (Bot)

## 🔐 Authentication
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/telegram` | None |
| POST | `/api/bot/auth` | X-Bot-Token |
| POST | `/api/user/logout` | JWT |
| POST | `/admin/api/logout` | JWT Admin |

## 📦 Products
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/products/` | None (cached 120s) |

### Semantic Contract
- `base_price` = total price for ENTIRE package
- `base_quantity` = units in package
- `unit_price` = base_price / base_quantity
- ❌ NOT unit price

**Example:** Xena Live — 8700 units for 1.00$ → unit = 0.000115$

## 📁 Categories
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/categories/` | None (cached 300s) |

## 💳 Payment Methods
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/payment-methods/` | None |
| POST | `/admin/api/payment-methods` | Admin |
| PUT | `/admin/api/payment-methods/:id` | Admin |
| DELETE | `/admin/api/payment-methods/:id` | Admin |

**Fields:** min_amount, max_amount, fee, fee_type (percentage|fixed), requires_kyc

## 📋 Orders
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/orders/` | User |
| POST | `/api/orders/create` | User |
| POST | `/api/orders/:id/cancel` | User (120s) |
| GET | `/admin/api/orders` | Admin |
| POST | `/admin/api/orders/:id/status` | Admin |

**States:** pending → review → processing → completed  
**Final:** completed, failed, cancelled

## 💰 Deposits
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/deposits/` | User |
| POST | `/api/deposits/create` | User |
| POST | `/admin/api/deposits/:id/approve` | Admin |
| POST | `/admin/api/deposits/:id/reject` | Admin |

**Rules:** KYC required · min ≤ amount ≤ max · fee calculated at creation

## 🪪 KYC
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/kyc/submit` | User |
| GET | `/api/kyc/my` | User |
| POST | `/admin/api/kyc/:id/approve` | Admin |
| POST | `/admin/api/kyc/:id/reject` | Admin |

**Validation (3 layers):** MIME · Size (500KB) · Magic Bytes

## 🎯 Admin Inbox
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/admin/api/inbox` | Admin |

**Returns:** pending_deposits + pending_orders + pending_kyc + pending_services + counts

## 🎟️ Coupons
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/coupons/validate` | User |
| POST | `/admin/api/coupons` | Admin |

## 🎁 Referrals
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/user/referrals` | User |
| POST | `/api/referrals/apply` | User |

**Reward:** 1.00 USD on referred user's first order

## 🩺 Health
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/health` | None |

**Returns:** status + checks (bot/database/redis) + version

## 🛡️ Error Codes
- USER_BANNED
- KYC_REQUIRED
- STOCK_INSUFFICIENT
- INSUFFICIENT_BALANCE
- NEGATIVE_LIMIT_EXCEEDED
- AMOUNT_BELOW_MIN
- AMOUNT_ABOVE_MAX
- TOO_MANY_PENDING
- IMAGE_INVALID
- COUPON_INVALID
- PRODUCT_NOT_FOUND

## 🔒 Rate Limits
- Login: 5 / 5 min (IP)
- API: 500/hour · 100/minute
- Bot: 10/minute (per user, Redis)

## 📝 Notes
- **Cached:** Products 120s · Categories 300s · PaymentMethods 300s
- **Never Cached:** Orders, Deposits, KYC, Users, Balance
- **Idempotency:** Required for create order/deposit
- **JWT TTL:** 2 hours
- **Blacklist:** Revoked JTIs stored until expiry

---

**END OF API CONTRACT v18.4**
