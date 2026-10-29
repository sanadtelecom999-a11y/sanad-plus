#!/bin/bash
echo "═══════════════════════════════════════"
echo " SANAD PLUS+ — Simplified Fix Script"
echo "═══════════════════════════════════════"
echo "Working dir: $(pwd)"
echo ""

# Checks
[ -d ".git" ] || { echo "❌ Not a git repo"; exit 1; }
[ -f "backend/public_routes.py" ] || { echo "❌ backend/public_routes.py not found"; exit 1; }
[ -f "miniapp/index.html" ] || { echo "❌ miniapp/index.html not found"; exit 1; }
[ -f "bot/bot.py" ] || { echo "❌ bot/bot.py not found"; exit 1; }
echo "✅ Required files present"

PY=""
command -v python3 >/dev/null 2>&1 && PY="python3"
[ -z "$PY" ] && command -v python >/dev/null 2>&1 && PY="python"
[ -z "$PY" ] && { echo "❌ Python not found"; exit 1; }
echo "✅ Python: $PY"
echo ""

if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Uncommitted changes:"
  git status --short
  echo ""
  read -p "Continue anyway? (yes/no): " CONT
  [ "$CONT" != "yes" ] && exit 0
fi

BACKUP="pre-fixes-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP" 2>/dev/null && echo "✅ Backup: $BACKUP"
echo ""

# STEP 1: eruda
echo "▶ STEP 1: Removing eruda..."
$PY << 'PYEOF'
import re, pathlib, sys
p = pathlib.Path('miniapp/index.html')
c = p.read_text(encoding='utf-8')
if 'eruda' not in c:
    print("  ⚠️  already absent"); sys.exit(0)
c2 = re.sub(r'<script[^>]*src=["\']//cdn\.jsdelivr\.net/npm/eruda["\'][^>]*>\s*</script>', '', c)
c2 = re.sub(r'<script>\s*eruda\.init\(\);\s*</script>', '', c2)
if c2 == c:
    print("  ❌ Could not remove. Edit manually."); sys.exit(1)
p.write_text(c2, encoding='utf-8'); print("  ✅ done")
PYEOF
[ $? -ne 0 ] && { echo "❌ STEP 1 FAILED"; exit 1; }

# STEP 2: bot XSS
echo "▶ STEP 2: Escaping bot username..."
$PY << 'PYEOF'
import pathlib, sys
p = pathlib.Path('bot/bot.py')
c = p.read_text(encoding='utf-8')
changed = False
if 'import html' not in c:
    if 'import os\n' in c:
        c = c.replace('import os\n', 'import os\nimport html\n', 1)
        changed = True; print("  ✅ import html")
    else:
        print("  ❌ 'import os' not found"); sys.exit(1)
if 'safe_name = html.escape' not in c:
    old = 'f"مرحباً {user.first_name} 👋'
    new = 'f"مرحباً {html.escape(str(user.first_name or \'مستخدم\'))} 👋'
    if old in c:
        c = c.replace(old, new, 1); changed = True; print("  ✅ escaped")
    else:
        print("  ⚠️  welcome line not matched — skip")
if changed: p.write_text(c, encoding='utf-8')
PYEOF
[ $? -ne 0 ] && { echo "❌ STEP 2 FAILED"; exit 1; }

# STEP 3: delivery_data
echo "▶ STEP 3: Removing delivery_data..."
$PY << 'PYEOF'
import pathlib, sys
p = pathlib.Path('backend/public_routes.py')
c = p.read_text(encoding='utf-8'); changed = False
if "delivery_data = data.get('delivery_data', '')" in c:
    c = c.replace("    delivery_data = data.get('delivery_data', '')\n", "", 1)
    changed = True; print("  ✅ removed input")
if 'delivery_data=delivery_data' in c:
    c = c.replace(', delivery_data=delivery_data', '', 1)
    changed = True; print("  ✅ removed from Order()")
if changed: p.write_text(c, encoding='utf-8')
else: print("  ⚠️  patterns not found")
PYEOF
[ $? -ne 0 ] && { echo "❌ STEP 3 FAILED"; exit 1; }

# STEP 4: fake token
echo "▶ STEP 4: Removing fake token..."
$PY << 'PYEOF'
import pathlib, sys
p = pathlib.Path('backend/public_routes.py')
c = p.read_text(encoding='utf-8')
if 'jwt_token_placeholder_secure' not in c:
    print("  ⚠️  already absent"); sys.exit(0)
c = c.replace(
    'return jsonify({"token": "jwt_token_placeholder_secure"})',
    'return jsonify({"success": True, "user_id": user.id, "is_verified": bool(getattr(user, "is_verified", False))})',
    1)
if 'jwt_token_placeholder_secure' in c:
    print("  ❌ replace failed"); sys.exit(1)
p.write_text(c, encoding='utf-8'); print("  ✅ removed")
PYEOF
[ $? -ne 0 ] && { echo "❌ STEP 4 FAILED"; exit 1; }

# STEP 5: Decimal deposit
echo "▶ STEP 5: Decimal deposit..."
$PY << 'PYEOF'
import pathlib, sys
p = pathlib.Path('backend/public_routes.py')
c = p.read_text(encoding='utf-8')
if "Decimal(request.form.get('amount'" in c:
    print("  ⚠️  already Decimal"); sys.exit(0)
old = "amount = float(request.form.get('amount', 0))"
new = "amount = Decimal(request.form.get('amount', '0'))"
if old not in c:
    print("  ❌ pattern not found"); sys.exit(1)
c = c.replace(old, new, 1)
p.write_text(c, encoding='utf-8'); print("  ✅ applied")
PYEOF
[ $? -ne 0 ] && { echo "❌ STEP 5 FAILED"; exit 1; }

# STEP 6: id_image
echo "▶ STEP 6: Adding id_image..."
$PY << 'PYEOF'
import pathlib, sys
p = pathlib.Path('backend/app/models/__init__.py')
c = p.read_text(encoding='utf-8')
if 'id_image' in c:
    print("  ⚠️  already present"); sys.exit(0)
old = "    selfie_image = db.Column(db.Text)\n    status = db.Column(db.String(20), default='pending', index=True)"
new = "    selfie_image = db.Column(db.Text)\n    id_image = db.Column(db.Text)\n    status = db.Column(db.String(20), default='pending', index=True)"
if old not in c:
    print("  ❌ pattern not found"); sys.exit(1)
c = c.replace(old, new, 1)
p.write_text(c, encoding='utf-8'); print("  ✅ added")
PYEOF
[ $? -ne 0 ] && { echo "❌ STEP 6 FAILED"; exit 1; }

# STEP 7: Procfile + migration
echo "▶ STEP 7: Procfile + migration..."
cat > backend/Procfile << 'PROCEOF'
web: gunicorn -w 2 -b 0.0.0.0:$PORT run:app --timeout 120
PROCEOF
cat > backend/migrate_kyc_id_image.py << 'MIGEOF'
import sys
from sqlalchemy import text
from app import create_app
from app.extensions import db
def main():
    app = create_app()
    with app.app_context():
        if db.engine.dialect.name != "postgresql":
            raise RuntimeError("Not PostgreSQL")
        with db.engine.begin() as conn:
            conn.execute(text("ALTER TABLE public.kyc_requests ADD COLUMN IF NOT EXISTS id_image TEXT"))
        print("OK")
if __name__ == "__main__": main()
MIGEOF
echo "  ✅ created"

# Syntax check
echo ""
echo "▶ Syntax check..."
$PY -c "import ast,pathlib
for f in ['backend/public_routes.py','bot/bot.py','backend/app/models/__init__.py','backend/migrate_kyc_id_image.py']:
    ast.parse(pathlib.Path(f).read_text(encoding='utf-8'))
print('  ✅ all Python OK')
"
[ $? -ne 0 ] && { echo "❌ Syntax FAILED"; exit 1; }

# Commit
echo ""
echo "▶ Committing..."
git add miniapp/index.html bot/bot.py backend/public_routes.py backend/app/models/__init__.py backend/Procfile backend/migrate_kyc_id_image.py
if git diff --cached --quiet; then
  echo "⚠️  No changes to commit"
else
  git commit -m "fix: B-01 (eruda) + bot XSS + delivery_data + Decimal + KYC id_image"
  echo "  ✅ committed"
fi

# Push
echo ""
read -p "▶ Push to origin/main? (yes/no): " PUSH
if [ "$PUSH" = "yes" ]; then
  git push origin main && echo "  ✅ pushed"
else
  echo "  ℹ️  skipped"
fi

echo ""
echo "═══════════════════════════════════════"
echo " ✅ Done"
echo "═══════════════════════════════════════"
echo "Backup: $BACKUP"
echo "Rollback: git reset --hard $BACKUP"
echo ""
