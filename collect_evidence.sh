#!/usr/bin/env bash
set +e
OUT="handover_evidence.txt"
: > "$OUT"
section() { echo -e "\n========== [$1] ==========" >> "$OUT"; }
sub()     { echo -e "\n--- $1 ---" >> "$OUT"; }
echo "SANAD PLUS+ HANDOVER EVIDENCE — $(date -u +%FT%TZ)" > "$OUT"
echo "Git HEAD: $(git rev-parse HEAD 2>/dev/null)" >> "$OUT"
git fetch origin --quiet 2>/dev/null

section "1 VERSIONS & LINE COUNTS"
sub "Bot version markers"
git show origin/main:bot/bot.py 2>/dev/null | grep -nE "BOT_VERSION|__version__|^VERSION" | head
sub "wc -l for key files"
wc -l bot/bot.py backend/bot_main.py backend/run.py admin/js/admin_v3.js admin/index.html miniapp/index.html miniapp/app.js 2>/dev/null
sub "Recent commits (last 10)"
git log --oneline -10 origin/main

section "2 SECURITY: ADMIN PANEL"
sub "escapeHtml uses (count)"
grep -c "escapeHtml" admin/js/admin_v3.js 2>/dev/null
sub "innerHTML lines WITHOUT escapeHtml on the same line"
grep -n "innerHTML" admin/js/admin_v3.js 2>/dev/null | grep -v "escapeHtml"
sub "Where admin_token is read/written"
grep -n "admin_token\|localStorage" admin/js/admin_v3.js 2>/dev/null | head -20

section "3 SECURITY: MINIAPP AUTH"
sub "Any verification of Telegram initData / HMAC in backend?"
grep -rnE "initData|hmac|hashlib|validate_init|WebAppData" backend/app/ 2>/dev/null | grep -v "\.pyc"
sub "How /miniapp/* routes identify the user"
grep -rnE "telegram_id" backend/app/routes/miniapp*.py 2>/dev/null | head -20
sub "Routes registered under /miniapp"
grep -rnE "@.*\.(route|post|get).*miniapp" backend/app/ 2>/dev/null | head -20

section "4 SECURITY: BOT"
sub "parse_mode usages in /me handler"
grep -nE "parse_mode|Markdown|first_name" bot/bot.py 2>/dev/null | head -30
sub "X-Bot-Token / BOT_API_SECRET server-side validation"
grep -rnE "X-Bot-Token|BOT_API_SECRET" backend/app/ bot/bot.py 2>/dev/null | head -20

section "5 SECURITY: OTP"
sub "Locate admin auth service"
find . -name "admin_auth_service.py" -o -name "*admin*auth*.py" 2>/dev/null | head
sub "random vs secrets usage"
grep -rnE "import random|import secrets" backend/ 2>/dev/null | grep -iE "otp|auth|admin"

section "6 OPS CLAIMS"
sub "Supervisor / shutdown / heartbeat"
grep -nE "_bot_supervisor|_shutdown_event|post_shutdown|bot:heartbeat|ratelimit:bot" backend/run.py bot/bot.py 2>/dev/null
sub "TELEGRAM_ADMIN_IDS check"
grep -n "TELEGRAM_ADMIN_IDS" bot/bot.py backend/ 2>/dev/null | head
sub "CORS allow-list"
grep -rn "sanad-plus" admin/vercel.json backend/app/ 2>/dev/null | head -20

section "7 DATABASE"
if [ -d backend ]; then ( cd backend && echo "current:" && alembic current 2>&1 && echo "heads:" && alembic heads 2>&1 ); fi

section "8 SECRETS HYGIENE"
sub ".env tracked in git?"
git ls-files | grep -E "(^|/)\.env($|\.)"
sub "Possible secrets in history"
git log --all --diff-filter=A --name-only --pretty=format: 2>/dev/null | grep -E "(^|/)\.env|credentials|secret" | sort -u | head -20

echo -e "\n=== DONE — $(wc -l < "$OUT") lines in $OUT ==="
