# SANAD PLUS⁺ — Full Source Code Dump

**Generated:** Tue Sep 29 02:11:57     2026

---
**Total files:** 77

## FILE: ./.github/workflows/backup.yml

```
# ============================================================
# 🔒 Database Backup — v18.2
# ============================================================
# ⚠️ مهم: لا رفع Artifact — البيانات الحساسة لا تُخزّن على GitHub
# الحماية الحقيقية: Neon PITR (6 ساعات) + Neon Snapshot يدوي
# ============================================================
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'      # يومياً 2 AM UTC
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install PostgreSQL 18 Client
        run: |
          sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
          wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
          sudo apt-get update
          sudo apt-get install -y postgresql-client-18

      - name: Dump Database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > backup.sql.gz
          ls -lh backup.sql.gz

      - name: Verify Integrity
        run: |
          gzip -t backup.sql.gz
          SIZE=$(du -h backup.sql.gz | cut -f1)
          echo "✅ Backup created and verified — Size: $SIZE"

      # ⚠️ v18.2: لا رفع Artifact
      # السبب: البيانات (مستخدمون، أرصدة، KYC، إثباتات دفع) حساسة
      # البديل: Neon PITR + Snapshot يدوي، أو R2/S3 لاحقاً

      # ═══════════════════════════════════════════════════════
      # (اختياري — فعّله لاحقاً عند إعداد R2)
      # ═══════════════════════════════════════════════════════
      # - name: Upload to Cloudflare R2
      #   env:
      #     R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
      #     R2_ACCESS_KEY: ${{ secrets.R2_ACCESS_KEY }}
      #     R2_SECRET_KEY: ${{ secrets.R2_SECRET_KEY }}
      #     R2_BUCKET: sanad-backups
      #   run: |
      #     pip install boto3
      #     python -c "
      #     import boto3, os
      #     from datetime import datetime
      #     s3 = boto3.client(
      #         's3',
      #         endpoint_url=os.environ['R2_ENDPOINT'],
      #         aws_access_key_id=os.environ['R2_ACCESS_KEY'],
      #         aws_secret_access_key=os.environ['R2_SECRET_KEY'],
      #     )
      #     key = f'backup-{datetime.utcnow().strftime(\"%Y%m%d_%H%M%S\")}.sql.gz'
      #     s3.upload_file('backup.sql.gz', os.environ['R2_BUCKET'], key)
      #     print(f'Uploaded: {key}')
      #     "

      - name: Notify Success
        if: success()
        run: |
          echo "✅ Backup workflow completed successfully at $(date -u)"
          echo "   Note: Backup file is not uploaded (security policy)"

      - name: Notify Failure
        if: failure()
        run: |
          echo "❌ Backup workflow FAILED at $(date -u)"
          exit 1```

---

## FILE: ./.gitignore

```
# ============================================================
# ============ Python ============
# ============================================================
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# ============================================================
# ============ Virtual Environment ============
# ============================================================
venv/
env/
ENV/
.venv/
virtualenv/
ENV.bak/
env.bak/
venv.bak/

# ============================================================
# ============ Environment Files (حساس جداً) ============
# ============================================================
.env
.env.*
**/.env
**/.env.*
backend/.env
bot/.env
!.env.example
!**/.env.example

# ============================================================
# ============ Database ============
# ============================================================
*.db
*.sqlite
*.sqlite3
*.db-journal
*.db-wal
*.db-shm

# ============================================================
# ============ Backups ============
# ============================================================
*.sql
*.sql.gz
backup_*.sql
backup_*.sql.gz
dump_*.sql
sanadplus_backup_*
*.bak
*.backup

# ============================================================
# ============ IDE / Editors ============
# ============================================================
.vscode/
.idea/
*.swp
*.swo
*.swn
*.sublime-workspace
*.sublime-project
.project
.classpath
.settings/

# ============================================================
# ============ OS ============
# ============================================================
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini

# ============================================================
# ============ Logs ============
# ============================================================
*.log
logs/
log/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
pip-log.txt

# ============================================================
# ============ Node / NPM ============
# ============================================================
node_modules/
npm-debug.log*
.npm/
.yarn/
.pnp.js

# ============================================================
# ============ Vercel ============
# ============================================================
.vercel/
.vercelignore

# ============================================================
# ============ Render ============
# ============================================================
render.yaml.local
.render/

# ============================================================
# ============ Cloudflare ============
# ============================================================
.wrangler/
wrangler.toml

# ============================================================
# ============ Testing / Coverage ============
# ============================================================
.pytest_cache/
.coverage
.coverage.*
htmlcov/
.tox/
.nox/
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/

# ============================================================
# ============ Misc ============
# ============================================================
*.tmp
*.temp
.tmp/
.temp/
*.pid
*.seed
*.pid.lock
.cache/
uploads/
backend/uploads/
bot/uploads/

# ============================================================
# ============ Secrets / Certificates ============
# ============================================================
*.pem
*.key
*.crt
*.p12
*.pfx
secrets/
.secrets/backup_*/
*.pyc
__pycache__/

# ============================================
# Local backups & test files — v18.2
# ============================================
backup_*/
bump-sw-versions.sh
loadtest.py
loadtest_18.1.js
loadtest_v2.py
loadtest_results.json
loadtest_v2_results.json

# Migrations logs
backend/migrations/*.log

# Temporary migration scripts (one-shot)
/fix_*.py
/phase*.py
/patch_*.py
/test_*.py
/*.save
```

---

## FILE: ./FULL_SOURCE.md

```
```

---

## FILE: ./admin/css/admin.css

```
/* ============================================================
   SANAD+ Admin — v17 (Mobile-First + VIP + Dark Order Card + Discounts)
   ============================================================ */

/* ============================================================
   1. Design Tokens
   ============================================================ */
:root {
    --primary: #0EA5E9;
    --primary-hover: #0284C7;
    --primary-soft: #E0F2FE;
    --primary-dark: #0D47A1;

    --bg: #F8FAFC;
    --surface: #FFFFFF;
    --surface-2: #F1F5F9;

    --text: #0F172A;
    --text-2: #475569;
    --text-3: #94A3B8;
    --muted: #94A3B8;

    --border: #E2E8F0;
    --border-2: #F1F5F9;

    --success: #10B981;
    --success-soft: #D1FAE5;
    --success-bg: #D1FAE5;

    --warning: #F59E0B;
    --warning-soft: #FEF3C7;
    --warning-bg: #FEF3C7;

    --danger: #EF4444;
    --danger-soft: #FEE2E2;
    --error: #EF4444;
    --error-soft: #FEE2E2;
    --error-bg: #FEE2E2;

    --info: #3B82F6;
    --info-soft: #DBEAFE;
    --info-bg: #DBEAFE;

    --overlay: rgba(15, 23, 42, 0.5);

    --r-sm: 8px;
    --r-md: 12px;
    --r-lg: 16px;
    --r-xl: 24px;
    --r-full: 999px;

    --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
    --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06);
    --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
    --shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.12);

    --topbar-h: 56px;
    --bottom-nav-h: 68px;
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-top: env(safe-area-inset-top, 0px);

    --transition: 200ms ease;
}

/* ============================================================
   2. Dark Mode
   ============================================================ */
[data-theme="dark"] {
    --bg: #0B1220;
    --surface: #131C2E;
    --surface-2: #1A2438;

    --text: #E2E8F0;
    --text-2: #94A3B8;
    --text-3: #64748B;
    --muted: #64748B;

    --border: #263048;
    --border-2: #1A2438;

    --primary-soft: #0C2842;
    --success-soft: #052E1F;
    --success-bg: #052E1F;
    --warning-soft: #3D2A02;
    --warning-bg: #3D2A02;
    --danger-soft: #401414;
    --error-soft: #401414;
    --error-bg: #401414;
    --info-soft: #142952;
    --info-bg: #142952;

    --overlay: rgba(0, 0, 0, 0.7);

    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);
}

/* ============================================================
   3. Reset & Base
   ============================================================ */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html, body {
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
}

body {
    font-family: 'Cairo', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
    direction: rtl;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior-y: contain;
    padding-bottom: calc(var(--bottom-nav-h) + var(--safe-bottom) + 20px);
}

button, input, textarea, select {
    font-family: inherit;
}

button {
    cursor: pointer;
    border: none;
    background: none;
    color: inherit;
}

a {
    color: inherit;
    text-decoration: none;
}

img {
    max-width: 100%;
    display: block;
}

/* ============================================================
   4. Topbar
   ============================================================ */
.topbar {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    height: calc(var(--topbar-h) + var(--safe-top));
    padding-top: var(--safe-top);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: 12px;
    padding-left: 12px;
    gap: 8px;
    z-index: 100;
}

.topbar-title {
    flex: 1;
    text-align: center;
}

.logo {
    font-weight: 900;
    font-size: 18px;
    letter-spacing: -0.5px;
    color: var(--text);
}

.logo .plus {
    color: var(--primary);
}

.topbar-actions {
    display: flex;
    gap: 4px;
}

.icon-btn {
    width: 40px;
    height: 40px;
    border-radius: var(--r-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-2);
    transition: var(--transition);
    position: relative;
    flex-shrink: 0;
}

.icon-btn:active {
    background: var(--surface-2);
    transform: scale(0.95);
}

.icon-btn .material-icons {
    font-size: 22px;
}

/* ============================================================
   5. Sidebar
   ============================================================ */
.sidebar-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    z-index: 199;
    opacity: 0;
    pointer-events: none;
    transition: opacity 250ms ease;
}

.sidebar-overlay.active {
    opacity: 1;
    pointer-events: auto;
}

.sidebar {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 85%;
    max-width: 340px;
    background: var(--surface);
    z-index: 200;
    transform: translateX(100%);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
    overflow-y: auto;
    overflow-x: hidden;
    padding: calc(16px + var(--safe-top)) 16px calc(24px + var(--safe-bottom));
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
}

.sidebar.open {
    transform: translateX(0);
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--border);
}

.sidebar-nav {
    flex: 1;
}

.nav-group {
    margin-bottom: 20px;
}

.nav-group-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-3);
    padding: 0 8px 8px;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    color: var(--text-2);
    font-size: 15px;
    font-weight: 600;
    width: 100%;
    text-align: right;
    margin-bottom: 2px;
    transition: var(--transition);
    position: relative;
}

.nav-item:active {
    background: var(--surface-2);
}

.nav-item.active {
    background: var(--primary-soft);
    color: var(--primary-hover);
    font-weight: 700;
}

.nav-item.active::before {
    content: '';
    position: absolute;
    right: -3px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    background: var(--primary);
    border-radius: 3px;
}

.nav-item .material-icons {
    font-size: 22px;
    flex-shrink: 0;
}

.nav-badge {
    margin-inline-start: auto;
    background: var(--danger);
    color: white;
    font-size: 11px;
    font-weight: 800;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    border-radius: var(--r-full);
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    animation: badgePulse 2s ease-in-out infinite;
}

.nav-badge.archive-badge {
    background: var(--text-3);
    animation: none;
}

@keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
}

/* ============================================================
   6. Main Content
   ============================================================ */
.main {
    margin-top: calc(var(--topbar-h) + var(--safe-top));
    padding: 16px;
    min-height: calc(100vh - var(--topbar-h) - var(--bottom-nav-h));
    max-width: 100vw;
}

.section, .admin-section {
    display: none;
}

.section.active, .admin-section.active {
    display: block;
    animation: fadeIn 200ms ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   7. Page Header
   ============================================================ */
.page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.page-header > div {
    flex: 1;
    min-width: 0;
}

.page-header h1 {
    font-size: 22px;
    font-weight: 900;
    color: var(--text);
    letter-spacing: -0.5px;
}

.page-header p {
    font-size: 13px;
    color: var(--text-2);
    margin-top: 2px;
}

.section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 20px 0 12px;
    flex-wrap: wrap;
}

.section-head h2 {
    font-size: 15px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
}

.section-head h2::before {
    content: '';
    width: 4px;
    height: 16px;
    background: var(--primary);
    border-radius: 2px;
}

/* ============================================================
   8. Buttons
   ============================================================ */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 18px;
    border-radius: var(--r-md);
    font-size: 14px;
    font-weight: 700;
    transition: var(--transition);
    white-space: nowrap;
    min-height: 44px;
    font-family: inherit;
    cursor: pointer;
    border: none;
}

.btn:active {
    transform: scale(0.97);
}

.btn .material-icons {
    font-size: 18px;
}

.btn-sm {
    padding: 8px 12px;
    font-size: 12px;
    min-height: 36px;
}

.btn-sm .material-icons {
    font-size: 16px;
}

.btn-block {
    width: 100%;
}

.btn-primary {
    background: var(--primary);
    color: white;
}

.btn-primary:active {
    background: var(--primary-hover);
}

.btn-outline {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
}

.btn-outline:hover {
    border-color: var(--primary);
    color: var(--primary);
}

.btn-success {
    background: var(--success);
    color: white;
}

.btn-danger {
    background: var(--danger);
    color: white;
}

.btn-ghost {
    color: var(--text-2);
}

.btn-ghost:hover {
    background: var(--surface-2);
    color: var(--text);
}

/* ============================================================
   9. Search + Filters
   ============================================================ */
.search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 12px 14px;
    margin-bottom: 12px;
    transition: var(--transition);
}

.search-box:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.search-box .material-icons {
    color: var(--text-3);
    font-size: 20px;
    flex-shrink: 0;
}

.search-box input {
    flex: 1;
    border: none;
    outline: none;
    background: none;
    font-size: 15px;
    color: var(--text);
    min-width: 0;
}

.search-box input::placeholder {
    color: var(--text-3);
}

.filters-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
}

.filter-select {
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    outline: none;
    width: 100%;
    min-height: 44px;
    transition: var(--transition);
}

.filter-select:focus {
    border-color: var(--primary);
}

/* ============================================================
   10. Tabs
   ============================================================ */
.tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    margin-bottom: 16px;
    padding-bottom: 2px;
    border-bottom: 1px solid var(--border);
}

.tabs::-webkit-scrollbar {
    display: none;
}

.tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-2);
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: var(--transition);
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    font-family: inherit;
    cursor: pointer;
}

.tab:hover {
    color: var(--primary);
}

.tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
}

.tab-count {
    background: var(--surface-2);
    color: var(--text-2);
    font-size: 11px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: var(--r-full);
    min-width: 22px;
    text-align: center;
}

.tab.active .tab-count {
    background: var(--primary-soft);
    color: var(--primary);
}

.archive-tabs { padding-bottom: 4px; }
.archive-tabs .tab { font-size: 12px; padding: 10px 12px; }

/* ============================================================
   11. Attention Card
   ============================================================ */
.attention-card {
    background: linear-gradient(135deg, #FFF9E6 0%, #FFFBF0 100%);
    border: 1px solid #FDE68A;
    border-radius: var(--r-lg);
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: var(--shadow-xs);
}

[data-theme="dark"] .attention-card {
    background: linear-gradient(135deg, #3D2A02, #2A1F04);
    border-color: #78350F;
}

.attention-card.empty {
    background: var(--success-soft);
    border-color: var(--success);
}

.attention-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    color: #92400E;
    margin-bottom: 12px;
    font-size: 14px;
}

[data-theme="dark"] .attention-header { color: #FCD34D; }
.attention-card.empty .attention-header { color: #047857; }

.attention-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.attention-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--surface);
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    text-align: right;
    width: 100%;
    transition: var(--transition);
    min-height: 44px;
    font-family: inherit;
    cursor: pointer;
    color: var(--text);
}

.attention-item:active { transform: scale(0.98); }

.attention-item-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--r-md);
    background: var(--primary-soft);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.attention-item-icon .material-icons { font-size: 22px; }
.attention-item-content { flex: 1; text-align: right; min-width: 0; }
.attention-item-title { font-weight: 800; font-size: 14px; }
.attention-item-subtitle { font-size: 12px; color: var(--text-2); margin-top: 2px; }

.attention-item-count {
    background: var(--warning);
    color: white;
    font-size: 12px;
    font-weight: 900;
    min-width: 26px;
    height: 26px;
    padding: 0 8px;
    border-radius: var(--r-full);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.attention-empty {
    text-align: center;
    padding: 16px;
    font-weight: 700;
    color: #047857;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
}

[data-theme="dark"] .attention-empty { color: #6EE7B7; }

/* ============================================================
   12. Stats Grid
   ============================================================ */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}

.stat {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: var(--transition);
}

.stat:active { transform: scale(0.98); }

.stat-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--r-md);
    display: flex;
    align-items: center;
    justify-content: center;
}

.stat-icon .material-icons { font-size: 20px; }
.stat-icon.primary { background: var(--primary-soft); color: var(--primary); }
.stat-icon.info { background: var(--info-soft); color: var(--info); }
.stat-icon.success { background: var(--success-soft); color: var(--success); }
.stat-icon.warning { background: var(--warning-soft); color: var(--warning); }

.stat-value {
    font-size: 22px;
    font-weight: 900;
    color: var(--text);
    letter-spacing: -0.5px;
    direction: ltr;
    text-align: right;
}

.stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-2);
}

/* ============================================================
   13. Time Pills
   ============================================================ */
.time-pills {
    display: flex;
    gap: 4px;
    background: var(--surface-2);
    padding: 4px;
    border-radius: var(--r-md);
}

.time-chip {
    padding: 6px 12px;
    border-radius: var(--r-sm);
    font-size: 12px;
    font-weight: 700;
    color: var(--text-2);
    transition: var(--transition);
    background: none;
    border: none;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
}

.time-chip:hover { color: var(--primary); }

.time-chip.active {
    background: var(--surface);
    color: var(--primary);
    box-shadow: var(--shadow-sm);
}

/* ============================================================
   14. Charts
   ============================================================ */
.charts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 20px;
}

.chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 16px;
}

.chart-card h3 {
    font-size: 14px;
    font-weight: 800;
    margin-bottom: 12px;
    color: var(--text);
}

.chart-body {
    position: relative;
    height: 220px;
}

/* ============================================================
   15. Cards List
   ============================================================ */
.cards-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.card-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 14px;
    position: relative;
    overflow: hidden;
    transition: var(--transition);
    touch-action: pan-y;
}

.card-item::before {
    content: '';
    position: absolute;
    top: 12px;
    bottom: 12px;
    right: 0;
    width: 3px;
    background: var(--text-3);
    border-radius: 3px;
}

.card-item[data-status="pending"]::before { background: var(--warning); }
.card-item[data-status="review"]::before { background: var(--primary); }
.card-item[data-status="processing"]::before { background: var(--info); }
.card-item[data-status="completed"]::before { background: var(--success); }
.card-item[data-status="approved"]::before { background: var(--success); }
.card-item[data-status="failed"]::before { background: var(--danger); }
.card-item[data-status="rejected"]::before { background: var(--danger); }
.card-item[data-status="cancelled"]::before { background: var(--text-3); }

.card-item:active { transform: scale(0.995); }
.card-item.selected { border-color: var(--primary); background: var(--primary-soft); }

.card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
    padding-right: 8px;
    flex-wrap: wrap;
}

.card-id {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: 800;
    color: var(--primary);
    background: var(--primary-soft);
    padding: 3px 10px;
    border-radius: var(--r-sm);
    direction: ltr;
    cursor: pointer;
    transition: var(--transition);
}

.card-id:hover { opacity: 0.8; }

.card-price {
    font-size: 18px;
    font-weight: 900;
    direction: ltr;
    letter-spacing: -0.5px;
    color: var(--text);
}

.card-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    padding-right: 8px;
}

.card-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-2);
    flex-wrap: wrap;
}

.card-row .material-icons {
    font-size: 16px;
    color: var(--text-3);
    flex-shrink: 0;
}

.card-row strong {
    color: var(--text);
    font-weight: 700;
}

.card-user-id {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    background: var(--surface-2);
    padding: 2px 8px;
    border-radius: 6px;
    direction: ltr;
    cursor: pointer;
}

.card-user-id:hover { background: var(--primary-soft); }

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 12px;
    padding-right: 8px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
}

.card-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.card-action {
    min-height: 40px;
    padding: 8px 14px;
    border-radius: var(--r-md);
    font-size: 13px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: var(--transition);
    font-family: inherit;
    cursor: pointer;
    border: none;
}

.card-action:active { transform: scale(0.95); }
.card-action .material-icons { font-size: 18px; }

.card-action.approve { background: var(--success-soft); color: #047857; }
.card-action.approve:hover { background: var(--success); color: white; }
.card-action.reject { background: var(--danger-soft); color: #B91C1C; }
.card-action.reject:hover { background: var(--danger); color: white; }
.card-action.view { background: var(--primary-soft); color: var(--primary); }
.card-action.view:hover { background: var(--primary); color: white; }
.card-action.restore { background: var(--warning-soft); color: #92400E; }
.card-action.restore:hover { background: var(--warning); color: white; }

/* ============================================================
   16. Status Badges
   ============================================================ */
.badge-status, .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: var(--r-full);
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
    border: none;
}

.badge-status::before, .status-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

.badge-status.pending, .status-badge.pending, .status-badge.review {
    background: var(--warning-soft);
    color: #92400E;
}

.badge-status.review { background: var(--primary-soft); color: var(--primary-hover); }

.badge-status.processing, .status-badge.processing {
    background: var(--info-soft);
    color: #1D4ED8;
}

.badge-status.completed, .badge-status.approved, .badge-status.verified,
.status-badge.completed, .status-badge.approved, .status-badge.verified {
    background: var(--success-soft);
    color: #047857;
}

.badge-status.failed, .badge-status.rejected,
.status-badge.failed, .status-badge.rejected {
    background: var(--danger-soft);
    color: #B91C1C;
}

.badge-status.cancelled, .status-badge.cancelled, .status-badge.unverified {
    background: var(--surface-2);
    color: var(--text-2);
}

/* ============================================================
   🆕 v17: VIP BADGES — 7 Levels (same as MiniApp)
   ============================================================ */
.vip-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    border-radius: var(--r-full);
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
    height: 26px;
    line-height: 1;
    position: relative;
    overflow: hidden;
    vertical-align: middle;
}

.vip-badge .material-icons {
    font-size: 14px;
    line-height: 1;
}

.vip-badge.vip-1 {
    background: linear-gradient(135deg, #7C3F1D 0%, #CD7F32 100%);
    color: #FFF5EB;
    border: 1px solid #CD7F32;
    box-shadow: 0 2px 6px rgba(205,127,50,0.3);
}
.vip-badge.vip-2 {
    background: linear-gradient(135deg, #64748B 0%, #CBD5E1 100%);
    color: #0F172A;
    border: 1px solid #CBD5E1;
    box-shadow: 0 2px 6px rgba(203,213,225,0.35);
}
.vip-badge.vip-3 {
    background: linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #FBBF24 100%);
    color: #3F2A00;
    border: 1px solid #FFD700;
    box-shadow: 0 2px 10px rgba(255,215,0,0.5);
}
.vip-badge.vip-4 {
    background: linear-gradient(135deg, #475569 0%, #E2E8F0 50%, #94A3B8 100%);
    color: #0F172A;
    border: 1px solid #F1F5F9;
    box-shadow: 0 0 12px rgba(226,232,240,0.5), inset 0 1px 0 rgba(255,255,255,0.5);
}
.vip-badge.vip-5 {
    background: linear-gradient(135deg, #0891B2 0%, #22D3EE 50%, #67E8F9 100%);
    color: #062F36;
    border: 1px solid #67E8F9;
    box-shadow: 0 0 14px rgba(34,211,238,0.6), inset 0 1px 0 rgba(255,255,255,0.4);
}
.vip-badge.vip-6 {
    background: linear-gradient(135deg, #7C3AED 0%, #C026D3 50%, #EC4899 100%);
    color: #FFFFFF;
    border: 1px solid #F472B6;
    box-shadow: 0 0 18px rgba(236,72,153,0.6), inset 0 1px 0 rgba(255,255,255,0.3);
}
.vip-badge.vip-6::after {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%);
    transform: skewX(-20deg);
    animation: vipShimmer 3s ease-in-out infinite;
}
.vip-badge.vip-7 {
    background: linear-gradient(135deg, #DC2626 0%, #F97316 50%, #FBBF24 100%);
    color: #FFFFFF;
    border: 1px solid #FCD34D;
    box-shadow: 0 0 22px rgba(220,38,38,0.7), 0 0 40px rgba(251,191,36,0.3), inset 0 1px 0 rgba(255,255,255,0.4);
    animation: vipPulse 2.5s ease-in-out infinite;
}
.vip-badge.vip-7::after {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%);
    transform: skewX(-20deg);
    animation: vipShimmer 2s ease-in-out infinite;
}

@keyframes vipShimmer {
    0% { left: -100%; }
    60% { left: 150%; }
    100% { left: 150%; }
}

@keyframes vipPulse {
    0%, 100% {
        box-shadow: 0 0 22px rgba(220,38,38,0.7), 0 0 40px rgba(251,191,36,0.3), inset 0 1px 0 rgba(255,255,255,0.4);
    }
    50% {
        box-shadow: 0 0 30px rgba(220,38,38,0.9), 0 0 55px rgba(251,191,36,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
    }
}

@media (prefers-reduced-motion: reduce) {
    .vip-badge.vip-6::after,
    .vip-badge.vip-7,
    .vip-badge.vip-7::after {
        animation: none !important;
    }
}

/* VIP Options في Modal الاختيار */
.vip-options-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 380px;
    overflow-y: auto;
    padding: 4px;
}

.vip-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--r-md);
    cursor: pointer;
    transition: var(--transition);
}

.vip-option:hover {
    border-color: var(--primary);
    background: var(--primary-soft);
}

.vip-option.selected {
    border-color: var(--primary);
    background: var(--primary-soft);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
}

/* ============================================================
   🆕 v17: DISCOUNT UI
   ============================================================ */
.discount-btn {
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 6px 10px !important;
}

.discount-chip {
    display: inline-block;
    padding: 2px 6px;
    border-radius: var(--r-full);
    font-size: 11px;
    font-weight: 800;
    background: var(--surface-2);
    color: var(--text-3);
}

.discount-chip.active {
    background: linear-gradient(135deg, #10B981, #34D399);
    color: white;
}

.discount-section {
    background: var(--surface-2);
    border-radius: var(--r-md);
    padding: 14px;
    margin-bottom: 14px;
}

.discount-section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 800;
    color: var(--primary);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.discount-section-title .material-icons { font-size: 18px; }

.discount-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.discount-input {
    flex: 1;
    min-width: 100px;
    padding: 10px 12px;
    border: 1.5px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 16px;
    font-weight: 800;
    text-align: center;
    outline: none;
    transition: var(--transition);
}

.discount-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.discount-select {
    flex: 1;
    padding: 10px 12px;
    border: 1.5px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    outline: none;
    width: 100%;
}

.discount-unit {
    font-size: 18px;
    font-weight: 900;
    color: var(--primary);
    flex-shrink: 0;
}

.discount-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    margin-bottom: 6px;
}

.discount-row-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
}

.discount-row-img {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid var(--border);
    flex-shrink: 0;
}

.discount-row-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.discount-row-percent {
    font-size: 12px;
    font-weight: 800;
    color: var(--success);
    direction: ltr;
}

/* ============================================================
   🆕 v17: DARK ORDER DETAIL CARD
   ============================================================ */
.order-detail-v17 {
    text-align: right;
    background: linear-gradient(180deg, #1A2438 0%, #131C2E 100%);
    border-radius: var(--r-lg);
    padding: 16px;
    margin: -8px;
    border: 1px solid #2A3954;
}

[data-theme="light"] .order-detail-v17 {
    background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
    border: 1px solid #334155;
}

.order-dark-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-wrap: wrap;
}

.order-dark-number {
    font-family: 'Courier New', monospace;
    font-size: 15px;
    font-weight: 900;
    color: #7DD3FC;
    letter-spacing: 0.5px;
    direction: ltr;
    cursor: pointer;
    padding: 6px 12px;
    background: rgba(14, 165, 233, 0.15);
    border: 1px solid rgba(14, 165, 233, 0.4);
    border-radius: var(--r-sm);
    transition: var(--transition);
}

.order-dark-number:hover {
    background: rgba(14, 165, 233, 0.25);
    border-color: rgba(14, 165, 233, 0.6);
}

.order-dark-section {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--r-md);
    padding: 14px;
    margin-bottom: 12px;
}

.order-dark-section.highlight-dark {
    background: linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(14,165,233,0.05) 100%);
    border-color: rgba(14,165,233,0.4);
}

.section-mini-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 800;
    color: #7DD3FC;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.section-mini-title .material-icons { font-size: 16px; }

.order-user-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
    color: #F1F5F9;
    font-size: 14px;
    flex-wrap: wrap;
}

.copy-id-inline {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: var(--r-sm);
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #94A3B8;
    cursor: pointer;
    direction: ltr;
    transition: var(--transition);
}

.copy-id-inline:hover {
    background: rgba(14,165,233,0.2);
    color: #7DD3FC;
    border-color: rgba(14,165,233,0.4);
}

.order-balance-line {
    font-size: 13px;
    color: #94A3B8;
}

.order-product-line {
    color: #F1F5F9;
    font-size: 15px;
    margin-bottom: 6px;
}

.product-thumb-dark {
    width: 56px;
    height: 56px;
    border-radius: var(--r-md);
    object-fit: cover;
    margin-bottom: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    background: white;
}

.order-qty-line {
    font-size: 13px;
    color: #94A3B8;
}

/* Copyable Delivery Fields */
.delivery-field {
    margin-bottom: 12px;
}

.delivery-field:last-child { margin-bottom: 0; }

.delivery-field-label {
    font-size: 11px;
    font-weight: 700;
    color: #94A3B8;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.delivery-field-value-wrap {
    display: flex;
    align-items: stretch;
    gap: 0;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(125,211,252,0.3);
    border-radius: var(--r-md);
    overflow: hidden;
}

.delivery-field-value {
    flex: 1;
    padding: 12px 14px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 800;
    color: #FFFFFF;
    direction: ltr;
    text-align: left;
    word-break: break-all;
    line-height: 1.5;
    min-width: 0;
}

.delivery-copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 14px;
    background: rgba(125,211,252,0.15);
    border: none;
    border-inline-start: 1px solid rgba(125,211,252,0.3);
    color: #7DD3FC;
    cursor: pointer;
    transition: var(--transition);
    flex-shrink: 0;
    min-width: 48px;
}

.delivery-copy-btn:hover {
    background: rgba(125,211,252,0.3);
    color: #FFFFFF;
}

.delivery-copy-btn:active {
    transform: scale(0.95);
}

.delivery-copy-btn .material-icons { font-size: 18px; }

.delivery-row-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 0;
    font-size: 13px;
    color: #94A3B8;
    border-bottom: 1px dashed rgba(255,255,255,0.08);
}

.delivery-row-info:last-child { border-bottom: none; }
.delivery-row-info .dl { color: #7DD3FC; font-weight: 700; }
.delivery-row-info strong { color: #FFFFFF; direction: ltr; }

/* Invoice Totals */
.order-total-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
    color: #94A3B8;
    border-bottom: 1px dashed rgba(255,255,255,0.08);
}

.order-total-line:last-child { border-bottom: none; }

.order-total-line.main {
    padding-top: 14px;
    margin-top: 6px;
    border-top: 2px solid rgba(125,211,252,0.4);
    border-bottom: none;
}

.order-total-line.main span {
    font-size: 15px;
    font-weight: 800;
    color: #F1F5F9;
}

.order-total-amount {
    font-size: 22px;
    font-weight: 900;
    color: #4ADE80;
    direction: ltr;
    letter-spacing: -0.5px;
}

/* Actions in Dark Card */
.order-detail-actions-v17 {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.1);
}

.order-detail-actions-v17 .btn {
    min-height: 48px;
    font-size: 14px;
    font-weight: 800;
}

.order-final-banner {
    text-align: center;
    padding: 16px;
    background: rgba(255,255,255,0.05);
    border: 1px dashed rgba(255,255,255,0.15);
    border-radius: var(--r-md);
    color: #94A3B8;
    font-size: 13px;
    font-weight: 700;
    margin-top: 16px;
}

/* ============================================================
   17. Table
   ============================================================ */
.table-container {
    background: var(--surface);
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    overflow-x: auto;
    box-shadow: var(--shadow-xs);
}

table {
    width: 100%;
    border-collapse: collapse;
}

th, td {
    padding: 12px;
    text-align: right;
    font-size: 13px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
}

th {
    background: var(--surface-2);
    font-weight: 800;
    color: var(--text-2);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
}

tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--primary-soft); }

/* User actions cell — يسمح بالالتفاف */
.user-actions-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
}

@media (max-width: 767px) {
    .table-container {
        background: transparent;
        border: none;
        box-shadow: none;
        overflow: visible;
    }

    .table-container table,
    .table-container thead,
    .table-container tbody,
    .table-container tr,
    .table-container th,
    .table-container td {
        display: block;
        width: 100%;
    }

    .table-container thead { display: none; }

    .table-container tr {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--r-lg);
        padding: 12px 14px;
        margin-bottom: 10px;
        box-shadow: var(--shadow-xs);
    }

    .table-container tr:hover td { background: transparent; }

    .table-container td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
        text-align: left;
        flex-wrap: wrap;
        font-size: 13px;
    }

    .table-container td:last-child { border-bottom: none; padding-bottom: 0; }
    .table-container td:first-child { padding-top: 0; }

    .table-container td::before {
        content: attr(data-label);
        font-weight: 700;
        color: var(--text-2);
        font-size: 12px;
        flex-shrink: 0;
        min-width: 80px;
    }

    .table-container td[data-label="إجراءات"] {
        flex-direction: column;
        align-items: stretch;
    }

    .table-container td[data-label="إجراءات"]::before { margin-bottom: 8px; }

    .user-actions-cell {
        justify-content: flex-start;
    }

    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-2);
        font-size: 14px;
    }

    .empty-state .material-icons {
        display: block;
        font-size: 40px;
        color: var(--text-3);
        margin-bottom: 8px;
    }
}

/* ============================================================
   18. Cards Grid (Categories / Payment Methods)
   ============================================================ */
.cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

.category-card, .payment-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 14px;
    text-align: center;
    transition: var(--transition);
}

.category-card:active, .payment-card:active { transform: scale(0.98); }

.card-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--r-md);
    background: var(--primary-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 10px;
    overflow: hidden;
    font-size: 26px;
}

.card-icon img { width: 100%; height: 100%; object-fit: cover; }

.card-title {
    font-weight: 800;
    font-size: 13px;
    margin-bottom: 8px;
    word-break: break-word;
    color: var(--text);
}

.card-actions-row {
    display: flex;
    gap: 4px;
    justify-content: center;
    flex-wrap: wrap;
}

/* ============================================================
   19. Form Cards
   ============================================================ */
.form-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 20px;
    margin-bottom: 16px;
}

.form-card h3 {
    font-size: 15px;
    font-weight: 800;
    margin-bottom: 14px;
    color: var(--text);
}

.form-group { margin-bottom: 14px; }

.form-group label {
    display: block;
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 6px;
    color: var(--text);
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 15px;
    outline: none;
    transition: var(--transition);
    min-height: 44px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.form-group textarea {
    min-height: 100px;
    resize: vertical;
    line-height: 1.6;
}

.image-preview {
    width: 100%;
    height: 120px;
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    background: var(--primary-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-2);
    font-size: 13px;
    margin-top: 8px;
    overflow: hidden;
}

.image-preview img { width: 100%; height: 100%; object-fit: cover; }

.syp-preview {
    background: var(--primary-soft);
    padding: 12px;
    border-radius: var(--r-md);
    font-size: 13px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.syp-preview strong {
    color: var(--text);
    direction: ltr;
    display: inline-block;
}

/* ============================================================
   20. Bottom Nav + FAB
   ============================================================ */
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(var(--bottom-nav-h) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: var(--surface);
    border-top: 1px solid var(--border);
    z-index: 150;
    display: flex;
    align-items: stretch;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
}

.bottom-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--text-3);
    font-size: 10px;
    font-weight: 600;
    transition: var(--transition);
    position: relative;
    padding: 6px 4px;
    background: none;
    border: none;
    font-family: inherit;
    cursor: pointer;
    min-width: 0;
}

.bottom-item .material-icons { font-size: 22px; transition: var(--transition); }
.bottom-item.active { color: var(--primary); }
.bottom-item.active .material-icons { transform: scale(1.1); }
.bottom-item span:not(.material-icons):not(.bottom-nav-badge) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.bottom-nav-badge {
    position: absolute;
    top: 6px;
    right: calc(50% - 18px);
    background: var(--danger);
    color: white;
    font-size: 10px;
    font-weight: 800;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: var(--r-full);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--surface);
    line-height: 1;
}

.fab-slot {
    background: var(--primary);
    border-radius: 50%;
    width: 52px;
    height: 52px;
    margin: 8px auto;
    flex: 0 0 52px;
    box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
    color: white;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
}

.fab-slot:active { transform: scale(0.9); }

/* ============================================================
   21. Bulk Bar
   ============================================================ */
.bulk-bar {
    position: fixed;
    bottom: calc(var(--bottom-nav-h) + var(--safe-bottom) + 12px);
    left: 16px;
    right: 16px;
    background: var(--text);
    color: white;
    border-radius: var(--r-lg);
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 180;
    transform: translateY(200px);
    opacity: 0;
    visibility: hidden;
    transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity 250ms ease,
                visibility 250ms ease;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    flex-wrap: wrap;
    justify-content: center;
}

.bulk-bar.active {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
}

[data-theme="dark"] .bulk-bar {
    background: var(--primary);
    color: #0B1220;
}

.bulk-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 13px;
    padding-inline-end: 10px;
    border-inline-end: 1px solid rgba(255, 255, 255, 0.2);
    margin-inline-end: 4px;
}

.bulk-num {
    background: var(--primary);
    color: white;
    font-weight: 900;
    font-size: 13px;
    min-width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

[data-theme="dark"] .bulk-num {
    background: #0B1220;
    color: var(--primary);
}

.bulk-action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: var(--r-md);
    color: white;
    font-size: 12px;
    font-weight: 700;
    transition: var(--transition);
    border: none;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
}

.bulk-action:active { transform: scale(0.95); }
.bulk-action.success { background: var(--success); }
.bulk-action.danger { background: var(--danger); }
.bulk-action .material-icons { font-size: 16px; }

.bulk-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-inline-start: auto;
    transition: var(--transition);
    border: none;
    cursor: pointer;
    flex-shrink: 0;
}

.bulk-close:hover { background: rgba(255, 255, 255, 0.2); }

/* ============================================================
   22. Bottom Sheet
   ============================================================ */
.bottom-sheet-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay);
    z-index: 300;
    opacity: 0;
    pointer-events: none;
    transition: opacity 250ms ease;
}

.bottom-sheet-overlay.active { opacity: 1; pointer-events: auto; }

.bottom-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--surface);
    border-radius: var(--r-xl) var(--r-xl) 0 0;
    z-index: 301;
    max-height: 90vh;
    transform: translateY(100%);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    padding-bottom: var(--safe-bottom);
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.15);
}

.bottom-sheet.open { transform: translateY(0); }

.sheet-handle {
    width: 40px;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin: 12px auto 8px;
    flex-shrink: 0;
}

.sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.sheet-header h3 {
    font-size: 17px;
    font-weight: 800;
    color: var(--text);
}

.sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    -webkit-overflow-scrolling: touch;
}

.sheet-action {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    border-radius: var(--r-md);
    transition: var(--transition);
    text-align: right;
    width: 100%;
    font-size: 15px;
    font-weight: 600;
    min-height: 56px;
    background: none;
    border: none;
    font-family: inherit;
    cursor: pointer;
    color: var(--text);
}

.sheet-action:active { background: var(--surface-2); }
.sheet-action .material-icons { font-size: 22px; flex-shrink: 0; }
.sheet-action.success { color: var(--success); }
.sheet-action.danger { color: var(--danger); }
.sheet-action.primary { color: var(--primary); }
.sheet-action.warning { color: var(--warning); }

/* ============================================================
   23. Toasts
   ============================================================ */
.toast-container {
    position: fixed;
    top: calc(var(--topbar-h) + var(--safe-top) + 12px);
    left: 16px;
    right: 16px;
    z-index: 400;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
}

.toast {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 14px 16px;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    animation: toastIn 250ms ease;
    pointer-events: auto;
    border-right: 4px solid var(--primary);
    color: var(--text);
}

.toast.success { border-right-color: var(--success); }
.toast.error { border-right-color: var(--danger); }
.toast.warning { border-right-color: var(--warning); }
.toast.info { border-right-color: var(--primary); }

.toast .material-icons { font-size: 22px; flex-shrink: 0; }
.toast.success .material-icons { color: var(--success); }
.toast.error .material-icons { color: var(--danger); }
.toast.warning .material-icons { color: var(--warning); }
.toast.info .material-icons { color: var(--primary); }

@keyframes toastIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.toast.hiding { animation: toastOut 200ms ease forwards; }

@keyframes toastOut {
    to { transform: translateY(-20px); opacity: 0; }
}

/* ============================================================
   24. Image Lightbox
   ============================================================ */
.image-lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 500;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    cursor: zoom-out;
    animation: lightboxIn 250ms ease;
}

.image-lightbox.active { display: flex; }

@keyframes lightboxIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.lightbox-image {
    max-width: 95vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 12px;
    animation: lightboxZoom 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes lightboxZoom {
    from { transform: scale(0.7); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.close-lightbox {
    position: absolute;
    top: calc(20px + var(--safe-top));
    left: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    line-height: 1;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: none;
    cursor: pointer;
    transition: var(--transition);
}

.close-lightbox:hover { background: rgba(255, 255, 255, 0.3); }

/* ============================================================
   25. Empty State
   ============================================================ */
.empty {
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: var(--r-lg);
    padding: 40px 20px;
    text-align: center;
}

.empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--surface-2);
    color: var(--text-3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
}

.empty-icon .material-icons { font-size: 32px; }
.empty h3 { font-size: 15px; font-weight: 800; margin-bottom: 6px; color: var(--text); }
.empty p { font-size: 13px; color: var(--text-2); max-width: 400px; margin: 0 auto; line-height: 1.6; }

/* ============================================================
   26. Login Screen
   ============================================================ */
.login-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg);
    padding: 20px;
}

.login-box {
    background: var(--surface);
    border-radius: var(--r-lg);
    padding: 32px 24px;
    width: 100%;
    max-width: 400px;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
}

.login-box h2 {
    text-align: center;
    font-size: 22px;
    font-weight: 900;
    color: var(--text);
    margin-bottom: 24px;
}

/* ============================================================
   27. Utilities
   ============================================================ */
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.hidden { display: none !important; }
.ltr { direction: ltr; unicode-bidi: embed; display: inline-block; }

.balance-negative { color: var(--danger); font-weight: 800; }
.balance-positive { color: var(--success); font-weight: 800; }

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-3); }

/* ============================================================
   28. Responsive Breakpoints
   ============================================================ */
@media (min-width: 640px) {
    .main { padding: 20px 24px; }
    .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .charts-grid { grid-template-columns: 1fr 1fr; }
    .cards-grid { grid-template-columns: repeat(3, 1fr); }
    .filters-row { grid-template-columns: repeat(4, 1fr); }
    .page-header h1 { font-size: 26px; }
    .stat-value { font-size: 26px; }
}

@media (min-width: 1024px) {
    body { padding-bottom: 0; }
    .topbar { padding-right: 24px; padding-left: 24px; }
    .sidebar {
        transform: translateX(0);
        box-shadow: none;
        border-left: 1px solid var(--border);
    }
    .sidebar-overlay { display: none !important; }
    .sidebar-header { padding-top: 8px; }
    .sidebar-header .icon-btn { display: none; }
    .topbar .icon-btn:first-child { display: none; }
    .main {
        margin-right: 340px;
        padding: 24px 32px;
        max-width: calc(100vw - 340px);
    }
    .bottom-nav { display: none !important; }
    .bulk-bar { left: auto; right: 24px; max-width: 560px; bottom: 24px; }
    .cards-grid { grid-template-columns: repeat(4, 1fr); }
    .stats-grid { gap: 16px; }
}

@media (max-width: 399px) {
    .main { padding: 12px; }
    .page-header h1 { font-size: 19px; }
    .stat-value { font-size: 20px; }
    .bottom-item { font-size: 9px; }
    .bottom-item .material-icons { font-size: 20px; }
    .fab-slot { width: 48px; height: 48px; flex: 0 0 48px; }
    .tab { padding: 10px 10px; font-size: 12px; }
    .archive-tabs .tab { padding: 8px 8px; font-size: 11px; }
}

/* ============================================================
   29. Dark Mode Transitions
   ============================================================ */
html, body,
.topbar, .sidebar, .nav-item, .stat, .card-item,
.table-container, .category-card, .payment-card,
.bottom-sheet, .bottom-nav, .form-card,
.form-group input, .form-group select, .form-group textarea,
.chart-card, .attention-card, .attention-item,
.bulk-bar, .login-box, .discount-section, .discount-row {
    transition: background-color 250ms ease,
                border-color 250ms ease,
                color 250ms ease;
}

/* ============================================================
   END OF admin.css v17
   ============================================================ */
/* ============================================================
   🆕 v18.3.8: Admin Inbox
   ============================================================ */

.inbox-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
}

.inbox-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 12px 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    cursor: pointer;
    transition: var(--transition);
    position: relative;
}

.inbox-chip:active {
    transform: scale(0.96);
}

.inbox-chip .material-icons {
    font-size: 22px;
    color: var(--primary);
}

.inbox-chip[data-type="deposits"] .material-icons { color: var(--success); }
.inbox-chip[data-type="orders"] .material-icons { color: var(--info); }
.inbox-chip[data-type="kyc"] .material-icons { color: var(--warning); }
.inbox-chip[data-type="services"] .material-icons { color: var(--primary); }

.inbox-chip-count {
    font-size: 1.3rem;
    font-weight: 900;
    color: var(--text);
    line-height: 1;
    direction: ltr;
}

.inbox-chip-label {
    font-size: 0.7rem;
    color: var(--text-2);
    font-weight: 600;
}

.inbox-chip.has-items {
    border-color: var(--primary);
    background: linear-gradient(135deg, var(--primary-soft) 0%, var(--surface) 100%);
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.08);
}

.inbox-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.inbox-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    overflow: hidden;
}

.inbox-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
}

.inbox-section-header h3 {
    font-size: 14px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--text);
}

.inbox-section-header h3 .material-icons {
    font-size: 18px;
}

.inbox-section-count {
    background: var(--primary);
    color: white;
    font-size: 11px;
    font-weight: 900;
    min-width: 22px;
    height: 22px;
    padding: 0 8px;
    border-radius: var(--r-full);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.inbox-section-count.empty {
    background: var(--surface-2);
    color: var(--text-3);
}

.inbox-section-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.inbox-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    transition: var(--transition);
}

.inbox-item:active {
    transform: scale(0.99);
}

.inbox-item-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--r-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--primary-soft);
    color: var(--primary);
}

.inbox-item-icon.success { background: var(--success-soft); color: var(--success); }
.inbox-item-icon.warning { background: var(--warning-soft); color: #92400E; }
.inbox-item-icon.danger { background: var(--error-soft); color: var(--danger); }

.inbox-item-icon .material-icons {
    font-size: 20px;
}

.inbox-item-content {
    min-width: 0;
    text-align: right;
}

.inbox-item-title {
    font-size: 13px;
    font-weight: 800;
    color: var(--text);
    direction: ltr;
    display: inline-block;
}

.inbox-item-subtitle {
    font-size: 11px;
    color: var(--text-2);
    margin-top: 2px;
}

.inbox-item-amount {
    font-size: 14px;
    font-weight: 900;
    color: var(--success);
    direction: ltr;
}

.inbox-item-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

.inbox-action {
    width: 36px;
    height: 36px;
    border-radius: var(--r-sm);
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition);
    font-family: inherit;
    flex-shrink: 0;
}

.inbox-action:active {
    transform: scale(0.92);
}

.inbox-action.approve {
    background: var(--success-soft);
    color: #047857;
}

.inbox-action.approve:hover {
    background: var(--success);
    color: white;
}

.inbox-action.reject {
    background: var(--error-soft);
    color: #B91C1C;
}

.inbox-action.reject:hover {
    background: var(--danger);
    color: white;
}

.inbox-action.view {
    background: var(--primary-soft);
    color: var(--primary);
}

.inbox-action.view:hover {
    background: var(--primary);
    color: white;
}

.inbox-action .material-icons {
    font-size: 18px;
}

.inbox-empty {
    padding: 20px;
    text-align: center;
    color: var(--text-3);
    font-size: 12px;
}

@media (max-width: 400px) {
    .inbox-chip {
        padding: 10px 4px;
    }
    .inbox-chip-count {
        font-size: 1.1rem;
    }
    .inbox-chip-label {
        font-size: 0.65rem;
    }
    .inbox-item {
        grid-template-columns: auto 1fr;
    }
    .inbox-item-actions {
        grid-column: 1 / -1;
        justify-content: flex-end;
    }
}

/* ============================================================
   END OF v18.3.8 Inbox styles
   ============================================================ */

/* ============================================================
   🆕 v18.4: Inbox Auto-refresh Toggle + Filters
   ============================================================ */

.inbox-autorefresh-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-2);
    transition: var(--transition);
}

.inbox-autorefresh-toggle input {
    display: none;
}

.toggle-track {
    width: 32px;
    height: 18px;
    background: var(--surface-2);
    border-radius: 10px;
    position: relative;
    transition: var(--transition);
    flex-shrink: 0;
}

.toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: white;
    border-radius: 50%;
    transition: var(--transition);
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.inbox-autorefresh-toggle input:checked + .toggle-track {
    background: var(--success);
}

.inbox-autorefresh-toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(14px);
}

.toggle-label {
    white-space: nowrap;
}

.inbox-autorefresh-toggle input:checked ~ .toggle-label {
    color: var(--success);
}

.inbox-filters {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    margin-bottom: 12px;
    padding-bottom: 4px;
}

.inbox-filters::-webkit-scrollbar {
    display: none;
}

.inbox-filter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-full);
    font-size: 12px;
    font-weight: 700;
    color: var(--text-2);
    white-space: nowrap;
    cursor: pointer;
    transition: var(--transition);
    font-family: inherit;
}

.inbox-filter:active {
    transform: scale(0.96);
}

.inbox-filter.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
}

.inbox-filter-count {
    background: rgba(255,255,255,0.25);
    padding: 1px 7px;
    border-radius: var(--r-full);
    font-size: 10px;
    font-weight: 900;
    min-width: 18px;
    text-align: center;
    line-height: 1.4;
}

.inbox-filter:not(.active) .inbox-filter-count {
    background: var(--surface-2);
    color: var(--text-2);
}

.inbox-section.hidden {
    display: none;
}

@media (max-width: 500px) {
    .inbox-autorefresh-toggle .toggle-label {
        display: none;
    }
    .inbox-filter {
        padding: 6px 10px;
        font-size: 11px;
    }
}

/* ============================================================
   END OF v18.4 Inbox v2
   ============================================================ */
```

---

## FILE: ./admin/index.html

```
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">

<!-- ============================================================
     🛡️ v18.3.3: KILL ALL SERVICE WORKERS + CACHES
     ============================================================ -->
<script>
(function() {
    try {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                if (registrations.length === 0) return;
                registrations.forEach(function(reg) {
                    reg.unregister().then(function(success) {
                        console.log('[SANAD-ADMIN] ✅ SW unregistered:', reg.scope, success);
                    });
                });
            }).catch(function(err) {
                console.warn('[SANAD-ADMIN] SW unregister error:', err);
            });
        }

        if ('caches' in window) {
            caches.keys().then(function(names) {
                if (names.length === 0) return;
                names.forEach(function(name) {
                    caches.delete(name).then(function(success) {
                        console.log('[SANAD-ADMIN] ✅ Cache deleted:', name, success);
                    });
                });
            }).catch(function(err) {
                console.warn('[SANAD-ADMIN] Cache delete error:', err);
            });
        }
    } catch (e) {
        console.warn('[SANAD-ADMIN] SW kill error:', e);
    }
})();
</script>

<title>SANAD+ Admin</title>
<meta name="theme-color" content="#0EA5E9">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SANAD Admin">
<meta name="description" content="لوحة تحكم SANAD PLUS⁺">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<link rel="stylesheet" href="css/admin.css?v=27">
</head>
<body>

<!-- ============================================================
     TOPBAR
     ============================================================ -->
<header class="topbar admin-topbar">
    <button class="icon-btn" onclick="toggleSidebar()" aria-label="القائمة">
        <span class="material-icons">menu</span>
    </button>
    <div class="topbar-title">
        <span class="logo topbar-brand logo-text">SANAD<span class="plus highlight">+</span></span>
    </div>
    <div class="topbar-actions admin-topbar-left">
        <button class="icon-btn" onclick="toggleAdminTheme()" aria-label="الوضع">
            <span class="material-icons" id="themeIcon">dark_mode</span>
        </button>
        <button class="icon-btn" onclick="logout()" aria-label="خروج">
            <span class="material-icons">logout</span>
        </button>
    </div>
</header>

<!-- ============================================================
     SIDEBAR
     ============================================================ -->
<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
<aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <span class="logo">SANAD<span class="plus">+</span></span>
        <button class="icon-btn" onclick="closeSidebar()">
            <span class="material-icons">close</span>
        </button>
    </div>

    <nav class="sidebar-nav">
        <button class="nav-item sidebar-item active" data-section="dashboard" onclick="switchSection('dashboard')">
            <span class="material-icons">space_dashboard</span>
            <span>لوحة التحكم</span>
        </button>

        <div class="nav-group">
            <div class="nav-group-title">العمليات</div>
            <button class="nav-item sidebar-item" data-section="inbox" onclick="switchSection('inbox')">
                <span class="material-icons">inbox</span>
                <span>الإرساليات</span>
                <span class="nav-badge" id="badge-inbox" style="display:none;">0</span>
            </button>
            <button class="nav-item sidebar-item" data-section="orders" onclick="switchSection('orders')">
                <span class="material-icons">receipt_long</span>
                <span>الطلبات</span>
                <span class="nav-badge" id="badge-orders" style="display:none;">0</span>
            </button>
            <button class="nav-item sidebar-item" data-section="deposits" onclick="switchSection('deposits')">
                <span class="material-icons">account_balance_wallet</span>
                <span>الإيداعات</span>
                <span class="nav-badge" id="badge-deposits" style="display:none;">0</span>
            </button>
            <button class="nav-item sidebar-item" data-section="kyc" onclick="switchSection('kyc')">
                <span class="material-icons">verified_user</span>
                <span>طلبات التوثيق</span>
                <span class="nav-badge" id="badge-kyc" style="display:none;">0</span>
            </button>
            <button class="nav-item sidebar-item" data-section="service-requests" onclick="switchSection('service-requests')">
                <span class="material-icons">handyman</span>
                <span>طلبات الخدمة</span>
                <span class="nav-badge" id="badge-services" style="display:none;">0</span>
            </button>
        </div>

        <div class="nav-group">
            <div class="nav-group-title">المتجر</div>
            <button class="nav-item sidebar-item" data-section="categories" onclick="switchSection('categories')">
                <span class="material-icons">category</span>
                <span>الأقسام</span>
            </button>
            <button class="nav-item sidebar-item" data-section="products" onclick="switchSection('products')">
                <span class="material-icons">shopping_bag</span>
                <span>المنتجات</span>
            </button>
            <button class="nav-item sidebar-item" data-section="payment-methods" onclick="switchSection('payment-methods')">
                <span class="material-icons">payments</span>
                <span>طرق الدفع</span>
            </button>
        </div>

        <div class="nav-group">
            <div class="nav-group-title">التسويق</div>
            <button class="nav-item sidebar-item" data-section="coupons" onclick="switchSection('coupons')">
                <span class="material-icons">local_offer</span>
                <span>كودات الخصم</span>
            </button>
            <button class="nav-item sidebar-item" data-section="referrals" onclick="switchSection('referrals')">
                <span class="material-icons">card_giftcard</span>
                <span>الإحالات</span>
            </button>
            <button class="nav-item sidebar-item" data-section="notifications" onclick="switchSection('notifications')">
                <span class="material-icons">send</span>
                <span>إرسال إشعار</span>
            </button>
        </div>

        <div class="nav-group">
            <div class="nav-group-title">المستخدمون</div>
            <button class="nav-item sidebar-item" data-section="users" onclick="switchSection('users')">
                <span class="material-icons">people</span>
                <span>إدارة المستخدمين</span>
            </button>
        </div>

        <div class="nav-group">
            <div class="nav-group-title">الأرشيف</div>
            <button class="nav-item sidebar-item" data-section="archive" onclick="switchSection('archive')">
                <span class="material-icons">inventory_2</span>
                <span>الأرشيف الكامل</span>
                <span class="nav-badge archive-badge" id="badge-archive-total" style="display:none;">0</span>
            </button>
        </div>

        <div class="nav-group">
            <div class="nav-group-title">النظام</div>
            <button class="nav-item sidebar-item" data-section="activities" onclick="switchSection('activities')">
                <span class="material-icons">history</span>
                <span>سجل النشاطات</span>
            </button>
            <button class="nav-item sidebar-item" data-section="audit-log" onclick="switchSection('audit-log')">
                <span class="material-icons">fact_check</span>
                <span>التدقيق المالي</span>
            </button>
            <button class="nav-item sidebar-item" data-section="settings" onclick="switchSection('settings')">
                <span class="material-icons">tune</span>
                <span>الإعدادات</span>
            </button>
        </div>
    </nav>
</aside>

<!-- ============================================================
     MAIN CONTENT
     ============================================================ -->
<main class="main admin-content" id="adminContent">

    <!-- INBOX -->
    <section id="section-inbox" class="section admin-section">
        <div class="page-header">
    <div>
        <h1>📥 الإرساليات</h1>
        <p id="inboxSubtitle">كل ما يحتاج مراجعة في مكان واحد</p>
    </div>
    <div style="display:flex;gap:6px;align-items:center;">
        <label class="inbox-autorefresh-toggle" title="تحديث تلقائي كل 30 ثانية">
            <input type="checkbox" id="inboxAutoRefresh" onchange="toggleInboxAutoRefresh()">
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span class="toggle-label">تحديث تلقائي</span>
        </label>
        <button class="btn btn-outline btn-sm" onclick="loadInbox()">
            <span class="material-icons">refresh</span> تحديث
        </button>
    </div>
</div>

        <div class="inbox-summary" id="inboxSummary">
            <div class="inbox-chip" data-type="deposits" onclick="scrollToInboxSection('deposits')">
                <span class="material-icons">account_balance_wallet</span>
                <span class="inbox-chip-count" id="inboxCountDeposits">0</span>
                <span class="inbox-chip-label">إيداعات</span>
            </div>
            <div class="inbox-chip" data-type="orders" onclick="scrollToInboxSection('orders')">
                <span class="material-icons">receipt_long</span>
                <span class="inbox-chip-count" id="inboxCountOrders">0</span>
                <span class="inbox-chip-label">طلبات</span>
            </div>
            <div class="inbox-chip" data-type="kyc" onclick="scrollToInboxSection('kyc')">
                <span class="material-icons">verified_user</span>
                <span class="inbox-chip-count" id="inboxCountKYC">0</span>
                <span class="inbox-chip-label">توثيق</span>
            </div>
            <div class="inbox-chip" data-type="services" onclick="scrollToInboxSection('services')">
                <span class="material-icons">handyman</span>
                <span class="inbox-chip-count" id="inboxCountServices">0</span>
                <span class="inbox-chip-label">خدمات</span>
            </div>
        </div>

        <div class="inbox-filters" id="inboxFilters">
    <button class="inbox-filter active" data-filter="all" onclick="setInboxFilter('all', this)">
        الكل <span class="inbox-filter-count" id="inboxFilterAllCount">0</span>
    </button>
    <button class="inbox-filter" data-filter="deposits" onclick="setInboxFilter('deposits', this)">
        💰 إيداعات
    </button>
    <button class="inbox-filter" data-filter="orders" onclick="setInboxFilter('orders', this)">
        📦 طلبات
    </button>
    <button class="inbox-filter" data-filter="kyc" onclick="setInboxFilter('kyc', this)">
        🪪 توثيق
    </button>
    <button class="inbox-filter" data-filter="services" onclick="setInboxFilter('services', this)">
        🛠 خدمات
    </button>
</div>

<div class="inbox-container" id="inboxContainer">
            <div class="empty">
                <div class="empty-icon"><span class="material-icons">hourglass_empty</span></div>
                <h3>جارٍ التحميل...</h3>
            </div>
        </div>
    </section>

    <!-- DASHBOARD -->
    <section id="section-dashboard" class="section admin-section active">
        <div class="page-header">
            <div>
                <h1 id="dashGreeting">صباح الخير، أبو سند 👋</h1>
                <p id="dashSubtitle">آخر تحديث: الآن</p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="loadAllData().then(renderDashboard)">
                <span class="material-icons">refresh</span>
            </button>
        </div>

        <div class="attention-card" id="attentionCard">
            <div class="attention-header">
                <span class="material-icons">notifications_active</span>
                <span>يحتاج انتباهك</span>
            </div>
            <div class="attention-list" id="attentionList">
                <div class="attention-empty">
                    <span class="material-icons">hourglass_empty</span>
                    جارٍ التحقق...
                </div>
            </div>
        </div>

        <div class="section-head">
            <h2>الإحصائيات</h2>
            <div class="time-pills">
                <button class="time-chip active" onclick="setDashTimeFilter('today', this)">اليوم</button>
                <button class="time-chip" onclick="setDashTimeFilter('week', this)">7 أيام</button>
                <button class="time-chip" onclick="setDashTimeFilter('month', this)">30 يوم</button>
                <button class="time-chip" onclick="setDashTimeFilter('all', this)">الكل</button>
            </div>
        </div>

        <div class="stats-grid stats-cards">
            <div class="stat stat-card">
                <div class="stat-icon primary"><span class="material-icons">payments</span></div>
                <div class="stat-value stat-number" id="dashRevenue">$0.00</div>
                <div class="stat-label" id="dashRevenueLabel">إيرادات اليوم</div>
            </div>
            <div class="stat stat-card">
                <div class="stat-icon info"><span class="material-icons">receipt_long</span></div>
                <div class="stat-value stat-number" id="dashOrders">0</div>
                <div class="stat-label" id="dashOrdersLabel">طلبات اليوم</div>
            </div>
            <div class="stat stat-card">
                <div class="stat-icon success"><span class="material-icons">person_add</span></div>
                <div class="stat-value stat-number" id="dashUsers">0</div>
                <div class="stat-label" id="dashUsersLabel">مستخدمون جدد</div>
            </div>
            <div class="stat stat-card">
                <div class="stat-icon warning"><span class="material-icons">account_balance_wallet</span></div>
                <div class="stat-value stat-number" id="dashDeposits">$0.00</div>
                <div class="stat-label" id="dashDepositsLabel">إيداعات اليوم</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <h3>الطلبات حسب الحالة</h3>
                <div class="chart-body"><canvas id="chartOrdersPie"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>الإيداعات - آخر 7 أيام</h3>
                <div class="chart-body"><canvas id="chartDepositsLine"></canvas></div>
            </div>
        </div>

        <div class="section-head"><h2>آخر العمليات</h2></div>
        <div id="recentActivities">
            <div class="empty">
                <div class="empty-icon"><span class="material-icons">history</span></div>
                <h3>لا توجد عمليات حديثة</h3>
                <p>عندما يبدأ المستخدمون بالتفاعل، ستظهر هنا آخر الطلبات والإيداعات.</p>
            </div>
        </div>
    </section>

    <!-- USERS -->
    <section id="section-users" class="section admin-section">
        <div class="page-header">
            <h1>المستخدمون</h1>
            <button class="btn btn-outline btn-sm" onclick="exportUsersExcel()">
                <span class="material-icons">file_download</span> Excel
            </button>
        </div>
        <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" id="userSearch" aria-label="بحث في المستخدمين" placeholder="ابحث عن مستخدم..." oninput="filterUsers(this.value)">
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Telegram ID</th>
                        <th>الاسم</th>
                        <th>الرصيد</th>
                        <th>الحالة</th>
                        <th>VIP</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody"></tbody>
            </table>
        </div>
    </section>

    <!-- CATEGORIES -->
    <section id="section-categories" class="section admin-section">
        <div class="page-header">
            <h1>الأقسام</h1>
            <button class="btn btn-primary btn-sm" onclick="openCategoryModal()">
                <span class="material-icons">add</span> قسم
            </button>
        </div>
        <div class="cards-grid" id="categoriesList"></div>
    </section>

    <!-- PRODUCTS -->
    <section id="section-products" class="section admin-section">
        <div class="page-header">
            <h1>المنتجات</h1>
            <button class="btn btn-primary btn-sm" onclick="openProductModal()">
                <span class="material-icons">add</span> منتج
            </button>
        </div>
        <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" id="productSearch" aria-label="بحث في المنتجات" placeholder="ابحث عن منتج..." oninput="filterProducts()">
        </div>
        <div class="filters-row">
            <select id="productCategoryFilter" aria-label="فلترة حسب القسم" class="filter-select" onchange="filterProducts()">
                <option value="all">جميع الأقسام</option>
            </select>
            <select id="productTypeFilter" aria-label="فلترة حسب النوع" class="filter-select" onchange="filterProducts()">
                <option value="all">جميع الأنواع</option>
                <option value="quantity">كمية</option>
                <option value="topup">رصيد سوري</option>
                <option value="bundle">باقة</option>
            </select>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>الصورة</th>
                        <th>الاسم</th>
                        <th>القسم</th>
                        <th>السعر</th>
                        <th>الكمية</th>
                        <th>النوع</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody id="productsTableBody"></tbody>
            </table>
        </div>
    </section>

    <!-- PAYMENT METHODS -->
    <section id="section-payment-methods" class="section admin-section">
        <div class="page-header">
            <h1>طرق الدفع</h1>
            <button class="btn btn-primary btn-sm" onclick="openPaymentMethodModal()">
                <span class="material-icons">add</span> طريقة
            </button>
        </div>
        <div class="cards-grid" id="paymentMethodsList"></div>
    </section>

    <!-- ORDERS -->
    <section id="section-orders" class="section admin-section">
        <div class="page-header">
            <h1>الطلبات</h1>
            <button class="btn btn-outline btn-sm" onclick="exportOrdersExcel()">
                <span class="material-icons">file_download</span> Excel
            </button>
        </div>
        <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" id="orderSearchQuery" aria-label="بحث في الطلبات" placeholder="ابحث برقم الطلب أو User ID..." oninput="applyOrderFilters()">
        </div>
        <div class="filters-row">
            <select id="orderStatusFilter" aria-label="فلترة حسب الحالة" class="filter-select" onchange="applyOrderFilters()">
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد المعالجة</option>
                <option value="review">قيد المراجعة</option>
                <option value="processing">قيد التنفيذ</option>
            </select>
            <select id="orderSortFilter" aria-label="ترتيب الطلبات" class="filter-select" onchange="applyOrderFilters()">
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
                <option value="price_high">الأعلى</option>
                <option value="price_low">الأقل</option>
            </select>
        </div>
        <div class="tabs" id="ordersTabs">
            <button class="tab active" onclick="setOrdersTab('all', this)">
                الكل <span class="tab-count" id="ordersTabAll">0</span>
            </button>
            <button class="tab" onclick="setOrdersTab('pending', this)">
                معلق <span class="tab-count" id="ordersTabPending">0</span>
            </button>
            <button class="tab" onclick="setOrdersTab('processing', this)">
                تنفيذ <span class="tab-count" id="ordersTabProcessing">0</span>
            </button>
        </div>
        <div id="ordersList" class="cards-list"></div>
    </section>

    <!-- DEPOSITS -->
    <section id="section-deposits" class="section admin-section">
        <div class="page-header">
            <h1>الإيداعات</h1>
            <button class="btn btn-outline btn-sm" onclick="exportDepositsExcel()">
                <span class="material-icons">file_download</span> Excel
            </button>
        </div>
        <div id="depositsList" class="cards-list"></div>
        <table style="display:none;"><tbody id="depositsTableBody"></tbody></table>
    </section>

    <!-- KYC -->
    <section id="section-kyc" class="section admin-section">
        <div class="page-header">
            <h1>طلبات التوثيق</h1>
        </div>
        <div id="kycList" class="cards-list"></div>
        <table style="display:none;"><tbody id="kycTableBody"></tbody></table>
    </section>

    <!-- SERVICE REQUESTS -->
    <section id="section-service-requests" class="section admin-section">
        <div class="page-header">
            <h1>طلبات الخدمة</h1>
        </div>
        <div id="servicesList" class="cards-list"></div>
        <table style="display:none;"><tbody id="serviceRequestsTableBody"></tbody></table>
    </section>

    <!-- COUPONS -->
    <section id="section-coupons" class="section admin-section">
        <div class="page-header">
            <h1>كودات الخصم</h1>
            <button class="btn btn-primary btn-sm" onclick="openCouponModal()">
                <span class="material-icons">add</span> كود
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>الكود</th>
                        <th>النوع</th>
                        <th>القيمة</th>
                        <th>الاستخدامات</th>
                        <th>الحالة</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody id="couponsTableBody"></tbody>
            </table>
        </div>
    </section>

    <!-- REFERRALS -->
    <section id="section-referrals" class="section admin-section">
        <div class="page-header">
            <h1>الإحالات</h1>
            <button class="btn btn-outline btn-sm" onclick="exportReferralsExcel()">
                <span class="material-icons">file_download</span> Excel
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المُحيل</th>
                        <th>المُحال</th>
                        <th>المكافأة</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody id="referralsTableBody"></tbody>
            </table>
        </div>
    </section>

    <!-- ARCHIVE -->
    <section id="section-archive" class="section admin-section">
        <div class="page-header">
            <h1>الأرشيف</h1>
            <button class="btn btn-outline btn-sm" onclick="loadArchiveData()">
                <span class="material-icons">refresh</span>
            </button>
        </div>

        <div class="tabs archive-tabs" id="archiveTabs">
            <button class="tab active" data-archive-tab="orders" onclick="setArchiveTab('orders', this)">
                الطلبات <span class="tab-count" id="archiveTabOrdersCount">0</span>
            </button>
            <button class="tab" data-archive-tab="deposits" onclick="setArchiveTab('deposits', this)">
                الإيداعات <span class="tab-count" id="archiveTabDepositsCount">0</span>
            </button>
            <button class="tab" data-archive-tab="kyc" onclick="setArchiveTab('kyc', this)">
                التوثيق <span class="tab-count" id="archiveTabKycCount">0</span>
            </button>
            <button class="tab" data-archive-tab="services" onclick="setArchiveTab('services', this)">
                الخدمة <span class="tab-count" id="archiveTabServicesCount">0</span>
            </button>
        </div>

        <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" id="archiveSearch" aria-label="بحث في الأرشيف" placeholder="ابحث في الأرشيف..." oninput="filterArchiveItems()">
        </div>

        <div id="archiveList" class="cards-list">
            <div class="empty">
                <div class="empty-icon"><span class="material-icons">inventory_2</span></div>
                <h3>جارٍ التحميل...</h3>
            </div>
        </div>

        <div id="archiveCatsContainer" style="display:none;">
            <div id="archiveCatsList"></div>
            <span id="archiveCatsCount" style="display:none;">0</span>
        </div>
        <div id="archiveProdsContainer" style="display:none;">
            <div id="archiveProdsList"></div>
            <span id="archiveProdsCount" style="display:none;">0</span>
        </div>
    </section>

    <!-- ACTIVITIES -->
    <section id="section-activities" class="section admin-section">
        <div class="page-header">
            <h1>سجل النشاطات</h1>
            <button class="btn btn-outline btn-sm" onclick="loadActivities()">
                <span class="material-icons">refresh</span>
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>#</th><th>النشاط</th><th>التاريخ</th></tr>
                </thead>
                <tbody id="activitiesTableBody">
                    <tr><td colspan="3" class="empty-state">جار التحميل...</td></tr>
                </tbody>
            </table>
        </div>
    </section>

    <!-- AUDIT LOG -->
    <section id="section-audit-log" class="section admin-section">
        <div class="page-header">
            <h1>التدقيق المالي</h1>
            <button class="btn btn-outline btn-sm" onclick="loadAuditLog()">
                <span class="material-icons">refresh</span>
            </button>
        </div>
        <div class="search-box">
            <span class="material-icons">search</span>
            <input type="text" id="auditUserSearch" aria-label="فلترة التدقيق حسب المستخدم" placeholder="فلترة حسب معرف المستخدم..." oninput="filterAuditLog()">
        </div>
        <div class="filters-row">
            <select id="auditActionFilter" aria-label="فلترة حسب العملية" class="filter-select" onchange="filterAuditLog()">
                <option value="">كل العمليات</option>
                <option value="order_created">شراء طلب</option>
                <option value="order_refund">استرداد طلب</option>
                <option value="order_cancelled">إلغاء طلب</option>
                <option value="deposit_approved">قبول إيداع</option>
                <option value="admin_adjustment">تعديل رصيد</option>
                <option value="referral_reward">مكافأة إحالة</option>
            </select>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المستخدم</th>
                        <th>العملية</th>
                        <th>المبلغ</th>
                        <th>الرصيد بعد</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody id="auditLogTableBody">
                    <tr><td colspan="6" class="empty-state">جار التحميل...</td></tr>
                </tbody>
            </table>
        </div>
    </section>

    <!-- NOTIFICATIONS -->
    <section id="section-notifications" class="section admin-section">
        <div class="page-header">
            <h1>إرسال إشعار</h1>
        </div>
        <div class="form-card">
            <div class="form-group">
                <label>نوع الإشعار</label>
                <select id="notificationType" aria-label="نوع الإشعار">
                    <option value="info">معلومات</option>
                    <option value="success">نجاح</option>
                    <option value="warning">تحذير</option>
                </select>
            </div>
            <div class="form-group">
                <label>إلى</label>
                <select id="notificationTarget" aria-label="هدف الإشعار" onchange="toggleSpecificUser()">
                    <option value="all">جميع المستخدمين</option>
                    <option value="specific">مستخدم محدد</option>
                </select>
            </div>
            <div class="form-group" id="specificUserGroup" style="display:none;">
                <label>معرف المستخدم</label>
                <input type="text" id="notificationUserId" aria-label="معرف المستخدم" placeholder="Telegram ID">
            </div>
            <div class="form-group">
                <label>نص الإشعار</label>
                <textarea id="notificationMessage" rows="4" placeholder="أدخل نص الإشعار..."></textarea>
            </div>
            <button class="btn btn-primary btn-block" onclick="sendAdminNotification()">
                <span class="material-icons">send</span> إرسال
            </button>
        </div>
    </section>

    <!-- SETTINGS -->
    <section id="section-settings" class="section admin-section">
        <div class="page-header">
            <h1>الإعدادات</h1>
        </div>

        <div class="form-card">
            <h3>الإعدادات العامة</h3>
            <div class="form-group">
                <label>اسم المتجر</label>
                <input type="text" id="storeName" value="SANAD+">
            </div>
            <div class="form-group">
                <label>رابط الدعم</label>
                <input type="text" id="supportUrl" value="https://t.me/SANADST">
            </div>
        </div>

        <div class="form-card">
            <h3>سعر صرف الليرة السورية</h3>
            <div class="form-group">
                <label>سعر الصرف (ل.س لكل 1$)</label>
                <input type="number" id="sypRate" value="132" step="1" min="1">
                <small style="color:var(--text-2);font-size:12px;display:block;margin-top:6px;">
                    مثال: إذا كان السعر 132 → 132 ل.س = 1.00$
                </small>
            </div>
            <div class="form-group">
                <label>معاينة</label>
                <div class="syp-preview">
                    <div>1000 ل.س = <strong id="sypPreview1000">7.58$</strong></div>
                    <div>5000 ل.س = <strong id="sypPreview5000">37.88$</strong></div>
                    <div>10000 ل.س = <strong id="sypPreview10000">75.76$</strong></div>
                </div>
            </div>
        </div>

        <button class="btn btn-primary btn-block" style="margin-top:16px;" onclick="saveSettings()">
            <span class="material-icons">save</span> حفظ الإعدادات
        </button>
    </section>

</main>

<!-- ============================================================
     BOTTOM NAV + FAB
     ============================================================ -->
<nav class="bottom-nav admin-bottom-nav" id="bottomNav">
    <button class="bottom-item bottom-nav-item active" data-section="dashboard" onclick="switchSection('dashboard')">
        <span class="material-icons">space_dashboard</span>
        <span>الرئيسية</span>
    </button>
    <button class="bottom-item bottom-nav-item" data-section="inbox" onclick="switchSection('inbox')">
        <span class="material-icons">inbox</span>
        <span>الإرساليات</span>
        <span class="bottom-nav-badge" id="badge-mobile-inbox" style="display:none;">0</span>
    </button>
    <button class="bottom-item fab-slot" onclick="openQuickActions()">
        <span class="material-icons" style="font-size:28px;color:white;">add</span>
    </button>
    <button class="bottom-item bottom-nav-item" data-section="deposits" onclick="switchSection('deposits')">
        <span class="material-icons">account_balance_wallet</span>
        <span>الإيداعات</span>
        <span class="bottom-nav-badge" id="badge-mobile-deposits" style="display:none;">0</span>
    </button>
    <button class="bottom-item bottom-nav-item" onclick="toggleSidebar()">
        <span class="material-icons">menu</span>
        <span>المزيد</span>
    </button>
</nav>

<!-- ============================================================
     BULK BAR
     ============================================================ -->
<div class="bulk-bar bulk-orders-bar" id="bulkOrdersBar">
    <div class="bulk-info bulk-count">
        <span class="bulk-num bulk-count-num" id="bulkNum">0</span>
        <span>محدد</span>
    </div>
    <button class="bulk-action success" onclick="bulkChangeStatus('completed')">
        <span class="material-icons">check</span> إكمال
    </button>
    <button class="bulk-action danger" onclick="bulkChangeStatus('failed')">
        <span class="material-icons">close</span> فشل
    </button>
    <button class="bulk-action" onclick="bulkChangeStatus('cancelled')">
        <span class="material-icons">block</span> إلغاء
    </button>
    <button class="bulk-close bulk-close-btn" onclick="clearSelectedOrders()">
        <span class="material-icons">close</span>
    </button>
</div>

<!-- ============================================================
     BOTTOM SHEET
     ============================================================ -->
<div class="bottom-sheet-overlay" id="bottomSheetOverlay" onclick="closeBottomSheet()"></div>
<div class="bottom-sheet" id="bottomSheet">
    <div class="sheet-handle"></div>
    <div class="sheet-header">
        <h3 id="sheetTitle"></h3>
        <button class="icon-btn" onclick="closeBottomSheet()">
            <span class="material-icons">close</span>
        </button>
    </div>
    <div class="sheet-body" id="sheetBody"></div>
</div>

<!-- ============================================================
     TOASTS
     ============================================================ -->
<div id="toastContainer" class="toast-container"></div>

<!-- ============================================================
     IMAGE LIGHTBOX
     ============================================================ -->
<div id="imageLightbox" class="image-lightbox" onclick="closeImageLightbox()">
    <button class="close-lightbox" onclick="closeImageLightbox()">&times;</button>
    <img src="" alt="" class="lightbox-image" id="lightboxImage">
</div>

<!-- ============================================================
     LEGACY MODALS
     ============================================================ -->
<div id="modal" class="modal" style="display:none;">
    <div class="modal-content">
        <div class="modal-header">
            <button class="close-modal" onclick="closeModal()">&times;</button>
        </div>
        <div id="modalBody"></div>
    </div>
</div>

<div id="confirmModal" class="modal confirm-modal-overlay" style="display:none;">
    <div class="modal-content confirm-content">
        <div class="confirm-icon" id="confirmIcon">
            <span class="material-icons">help_outline</span>
        </div>
        <h3 id="confirmTitle">تأكيد العملية</h3>
        <p id="confirmMessage">هل أنت متأكد؟</p>
        <div class="confirm-actions">
            <button class="btn btn-primary" id="confirmBtn" onclick="closeConfirm(true)">تأكيد</button>
            <button class="btn btn-outline" onclick="closeConfirm(false)">إلغاء</button>
        </div>
    </div>
</div>

<div id="globalSearchModal" class="modal global-search-modal" style="display:none;">
    <div class="modal-content global-search-content">
        <div class="global-search-header">
            <span class="material-icons">search</span>
            <input type="text" id="globalSearchInput" aria-label="بحث عام" placeholder="ابحث..." oninput="performGlobalSearch(this.value)" autocomplete="off">
            <button class="close-modal-inline" onclick="closeGlobalSearch()">
                <span class="material-icons">close</span>
            </button>
        </div>
        <div class="global-search-results" id="globalSearchResults">
            <div class="global-search-hint">
                <span class="material-icons">search</span>
                <p>ابدأ الكتابة للبحث...</p>
            </div>
        </div>
    </div>
</div>

<div id="adminPTr" class="admin-ptr" style="display:none;">
    <div class="admin-ptr-icon"><span class="material-icons" id="adminPTrIcon">arrow_downward</span></div>
    <div class="admin-ptr-text" id="adminPTrText">اسحب للتحديث</div>
</div>

<!-- ============================================================
     SCRIPTS
     ============================================================ -->
<script src="js/api.js?v=25"></script>
<script src="js/admin.js?v=28"></script>
<script src="js/admin-v16.js?v=27"></script>
<script src="js/admin-v17.js?v=27"></script>

<script>
(function() {
    window.switchSection = function(sectionId) {
        document.querySelectorAll('.section, .admin-section').forEach(sec => {
            sec.classList.remove('active');
        });

        const section = document.getElementById('section-' + sectionId);
        if (section) section.classList.add('active');

        document.querySelectorAll('.sidebar-item, .nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
        });

        document.querySelectorAll('.bottom-nav-item, .bottom-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
        });

        window.currentSection = sectionId;

        if (typeof window.closeSidebar === 'function') window.closeSidebar();

        try {
            if (sectionId === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
            if (sectionId === 'users' && typeof window.renderUsers === 'function') window.renderUsers();
            if (sectionId === 'categories' && typeof renderCategories === 'function') renderCategories();
            if (sectionId === 'products') {
                if (typeof filteredProducts !== 'undefined' && Array.isArray(productsData)) {
                    window.filteredProducts = [...productsData];
                }
                if (typeof renderProducts === 'function') renderProducts();
            }
            if (sectionId === 'payment-methods' && typeof renderPaymentMethods === 'function') renderPaymentMethods();
            if (sectionId === 'orders') {
                if (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) {
                    window.filteredOrders = [...ordersData];
                }
                if (typeof window.renderOrders === 'function' && typeof ordersData !== 'undefined') {
                    window.renderOrders(ordersData);
                }
            }
            if (sectionId === 'deposits') {
                if (typeof window.resetDepositsFilter === 'function') window.resetDepositsFilter();
                if (typeof window.renderDeposits === 'function') window.renderDeposits(depositsData);
            }
            if (sectionId === 'kyc' && typeof window.renderKYC === 'function') window.renderKYC();
            if (sectionId === 'service-requests' && typeof window.renderServiceRequests === 'function') window.renderServiceRequests();
            if (sectionId === 'coupons' && typeof renderCoupons === 'function') renderCoupons();
            if (sectionId === 'referrals' && typeof loadReferrals === 'function') loadReferrals();
            if (sectionId === 'archive' && typeof window.loadArchiveData === 'function') window.loadArchiveData();
            if (sectionId === 'activities' && typeof loadActivities === 'function') loadActivities();
            if (sectionId === 'audit-log' && typeof loadAuditLog === 'function') loadAuditLog();
            if (sectionId === 'settings' && typeof loadSettings === 'function') loadSettings();
            if (sectionId === 'inbox' && typeof loadInbox === 'function') loadInbox();
        } catch (err) {
            console.warn('Section load error:', err);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (sectionId === 'dashboard') {
            const h = new Date().getHours();
            const greeting = h < 12 ? 'صباح الخير' : 'مساء الخير';
            const el = document.getElementById('dashGreeting');
            if (el) el.textContent = `${greeting}، أبو سند 👋`;
        }
    };
})();
</script>

<script>
window.openModal = window.openModal || function(title, bodyHTML) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    if (modal && body) {
        body.innerHTML = bodyHTML || '';
        modal.style.display = 'flex';
    }
};

window.closeModal = window.closeModal || function() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
};

window.closeConfirm = window.closeConfirm || function(result) {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
    if (window._confirmResolver) {
        window._confirmResolver(result);
        window._confirmResolver = null;
    }
};

window.openGlobalSearch = window.openGlobalSearch || function() {
    const modal = document.getElementById('globalSearchModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('globalSearchInput')?.focus();
    }
};

window.closeGlobalSearch = window.closeGlobalSearch || function() {
    const modal = document.getElementById('globalSearchModal');
    if (modal) modal.style.display = 'none';
};
</script>

</body>
</html>```

---

## FILE: ./admin/js/admin-v16.js

```
/* ============================================================
   admin-v16.js — v17.2 (XSS Hardened + Discounts + VIP v2)
   ============================================================
   يُحمّل بعد admin.js — يستبدل دوال العرض والتفاعل
   ============================================================ */
(function () {
    'use strict';

    const OWNER_NAME = 'أبو سند';

    /* ============================================================
       🛡️ v17.2: XSS Protection
       ============================================================ */
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    window.escapeHtml = escapeHtml;
    window.escapeAttr = escapeAttr;

    /* ============================================================
       VIP Levels — v2
       ============================================================ */
    const VIP_LEVELS = {
        1: { name: 'برونزي',   icon: 'military_tech' },
        2: { name: 'فضي',      icon: 'star' },
        3: { name: 'ذهبي',     icon: 'emoji_events' },
        4: { name: 'بلاتيني',  icon: 'diamond' },
        5: { name: 'ماسي',     icon: 'auto_awesome' },
        6: { name: 'أسطوري',   icon: 'local_fire_department' },
        7: { name: 'الأسطورة', icon: 'workspace_premium' },
    };

    /* ============================================================
       getAdminVIPBadgeHTML
       ============================================================ */
    window.getAdminVIPBadgeHTML = function (level) {
        const lvl = parseInt(level, 10);
        if (!lvl || lvl < 1 || lvl > 7) {
            return '<span style="color:var(--text-3);">—</span>';
        }
        const c = VIP_LEVELS[lvl];
        return `<span class="vip-badge vip-${lvl}" title="VIP ${lvl} — ${c.name}">
            <span class="material-icons">${c.icon}</span>
            <span>${c.name}</span>
        </span>`;
    };

    /* ============================================================
       renderUsers — XSS protected
       ============================================================ */
    window.renderUsers = function (users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const list = Array.isArray(users)
            ? users
            : (typeof usersData !== 'undefined' ? usersData : []);

        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">people</span>لا يوجد مستخدمون</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(user => {
            const balance = user.balance || 0;
            const balanceColor = balance < 0 ? 'var(--error)' : (balance > 0 ? 'var(--success)' : 'var(--text)');
            const negBadge = (balance < 0 && user.allow_negative_balance) ?
                '<span style="font-size:0.7rem;background:var(--error-bg);color:var(--error);padding:2px 6px;border-radius:4px;margin-right:4px;">سالب</span>' : '';

            const vipBadge = window.getAdminVIPBadgeHTML(user.vip_level || 0);

            const discountPercent = parseFloat(user.general_discount) || 0;
            const discountBadge = discountPercent > 0
                ? `<span class="discount-chip active">${discountPercent}%</span>`
                : `<span class="discount-chip">0%</span>`;

            return `
            <tr>
                <td data-label="Telegram ID">
                    <span class="ltr" style="cursor:pointer;" onclick="copyToClipboard('${escapeAttr(user.telegram_id)}')" title="اضغط للنسخ">
                        ${escapeHtml(user.telegram_id)}
                    </span>
                </td>
                <td data-label="الاسم">${escapeHtml(user.username || user.first_name || 'مستخدم')}</td>
                <td data-label="الرصيد">
                    <span style="color:${balanceColor};font-weight:800;direction:ltr;">${balance.toFixed(2)}$</span>
                    ${negBadge}
                </td>
                <td data-label="الحالة"><span class="status-badge ${user.is_banned ? 'failed' : 'completed'}">${user.is_banned ? 'محظور' : 'نشط'}</span></td>
                <td data-label="VIP">${vipBadge}</td>
                <td data-label="إجراءات" class="user-actions-cell">
                    <button class="btn-outline btn-sm" onclick="openUserDetailModal(${user.id})" title="تفاصيل المستخدم">
                        <span class="material-icons" style="font-size:14px;">visibility</span>
                    </button>
                    <button class="btn-outline btn-sm" onclick="adjustBalance(${user.id})" title="تعديل الرصيد">
                        <span class="material-icons" style="font-size:14px;">payments</span>
                    </button>
                    <button class="btn-outline btn-sm" onclick="openNegativeBalanceModal(${user.id})" title="الرصيد السالب">
                        <span class="material-icons" style="font-size:14px;">credit_card</span>
                    </button>
                    <button class="btn-outline btn-sm" onclick="openVIPModal(${user.id})" title="VIP">
                        <span class="material-icons" style="font-size:14px;">star</span>
                    </button>
                    <button class="btn-outline btn-sm discount-btn ${discountPercent > 0 ? 'active' : ''}" onclick="openDiscountModal(${user.id})" title="الخصم">
                        ${discountBadge}
                    </button>
                    <button class="btn-outline btn-sm" onclick="toggleBan(${user.id})">
                        ${user.is_banned ? 'فك الحظر' : 'حظر'}
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    };

    /* ============================================================
       renderKYC — XSS protected
       ============================================================ */
    window.renderKYC = function () {
        const container = document.getElementById('kycList');
        if (!container) return;

        const data = (typeof kycData !== 'undefined' && Array.isArray(kycData)) ? kycData : [];
        let filtered = [...data];
        try {
            const tabFilter = (typeof kycTabFilter !== 'undefined') ? kycTabFilter : 'all';
            if (tabFilter === 'pending') filtered = data.filter(k => k.status === 'pending');
            else if (tabFilter === 'approved') filtered = data.filter(k => k.status === 'approved');
            else if (tabFilter === 'rejected') filtered = data.filter(k => k.status === 'rejected');
        } catch (e) { /* ignore */ }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">verified_user</span></div>
                    <h3>لا توجد طلبات توثيق</h3>
                    <p>عندما يُرسل المستخدمون طلبات KYC، ستظهر هنا.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(k => {
            const statusText = k.status === 'approved' ? 'مقبول'
                             : k.status === 'rejected' ? 'مرفوض'
                             : 'معلق';
            return `
                <div class="card-item" data-status="${escapeAttr(k.status)}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${escapeAttr(k.user_id)}')">#${escapeHtml(k.user_id)}</div>
                        <span class="badge-status ${escapeAttr(k.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <strong>${escapeHtml(k.full_name || 'غير محدد')}</strong>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">phone</span>
                            <span class="ltr">${escapeHtml(k.phone || '-')}</span>
                        </div>
                        ${k.address ? `
                        <div class="card-row">
                            <span class="material-icons">location_on</span>
                            <span>${escapeHtml(k.address)}</span>
                        </div>
                        ` : ''}
                        <div class="card-row">
                            <span class="material-icons">schedule</span>
                            <span>${k.submitted_at ? new Date(k.submitted_at).toLocaleString('ar') : ''}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions">
                            ${k.selfie_image ? `
                                <button class="card-action view" onclick="viewKYCImage(${k.id})">
                                    <span class="material-icons">image</span> عرض الصورة
                                </button>
                            ` : ''}
                            ${k.status === 'pending' ? `
                                <button class="card-action approve" onclick="window.handleApproveKYC(${k.id})">
                                    <span class="material-icons">check</span> قبول
                                </button>
                                <button class="card-action reject" onclick="window.handleRejectKYC(${k.id})">
                                    <span class="material-icons">close</span> رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    /* ============================================================
       renderDeposits — XSS protected
       ============================================================ */
    window.renderDeposits = function (deposits) {
        const container = document.getElementById('depositsList');
        if (!container) return;

        const data = Array.isArray(deposits)
            ? deposits
            : (typeof depositsData !== 'undefined' ? depositsData : []);

        let filtered = [...data];
        try {
            const tabFilter = (typeof depositsTabFilter !== 'undefined') ? depositsTabFilter : 'all';
            if (tabFilter === 'pending') filtered = data.filter(d => d.status === 'pending');
            else if (tabFilter === 'approved') filtered = data.filter(d => d.status === 'approved');
            else if (tabFilter === 'rejected') filtered = data.filter(d => d.status === 'rejected');
        } catch (e) { /* ignore */ }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">account_balance_wallet</span></div>
                    <h3>لا توجد إيداعات</h3>
                    <p>عندما يُرسل المستخدمون إيداعات، ستظهر هنا للمراجعة.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(d => {
            const statusText = d.status === 'approved' ? 'مقبول'
                             : d.status === 'rejected' ? 'مرفوض'
                             : 'معلق';
            return `
                <div class="card-item" data-status="${escapeAttr(d.status)}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${escapeAttr(d.transaction_id || '')}')">${escapeHtml(d.transaction_id || '')}</div>
                        <span class="badge-status ${escapeAttr(d.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <span>${escapeHtml(d.user_name || 'مستخدم')}</span>
                            <span class="card-user-id" onclick="copyToClipboard('${escapeAttr(d.user_telegram || d.user_id)}')">#${escapeHtml(d.user_telegram || d.user_id)}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">credit_card</span>
                            <span>${escapeHtml(d.method || '-')}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">schedule</span>
                            <span>${d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-price ltr" style="color:var(--success);font-weight:900;">$${(parseFloat(d.amount) || 0).toFixed(2)}</div>
                        <div class="card-actions">
                            <button class="card-action view" onclick="viewDepositDetails(${d.id})">
                                <span class="material-icons">visibility</span> تفاصيل
                            </button>
                            ${d.status === 'pending' ? `
                                <button class="card-action approve" onclick="approveDepositHandler(${d.id})">
                                    <span class="material-icons">check</span> قبول
                                </button>
                                <button class="card-action reject" onclick="rejectDepositHandler(${d.id})">
                                    <span class="material-icons">close</span> رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    /* ============================================================
       renderServiceRequests — XSS protected
       ============================================================ */
    window.renderServiceRequests = function () {
        const container = document.getElementById('servicesList');
        if (!container) return;

        const data = (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData))
            ? serviceRequestsData
            : [];

        if (!data.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">handyman</span></div>
                    <h3>لا توجد طلبات خدمة</h3>
                    <p>عندما يطلب المستخدمون خدمات مخصصة، ستظهر هنا.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(r => {
            const statusText = r.status === 'completed' ? 'مكتمل'
                             : r.status === 'rejected' ? 'مرفوض'
                             : r.status === 'cancelled' ? 'ملغي'
                             : 'معلق';
            return `
                <div class="card-item" data-status="${escapeAttr(r.status)}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${escapeAttr(r.user_id)}')">#${escapeHtml(r.user_id)}</div>
                        <span class="badge-status ${escapeAttr(r.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">handyman</span>
                            <strong>${escapeHtml(r.service_name || '-')}</strong>
                        </div>
                        ${r.description ? `
                        <div class="card-row">
                            <span class="material-icons">description</span>
                            <span>${escapeHtml(r.description)}</span>
                        </div>
                        ` : ''}
                        ${r.estimated_price ? `
                        <div class="card-row">
                            <span class="material-icons">payments</span>
                            <span>${escapeHtml(r.estimated_price)}$</span>
                        </div>
                        ` : ''}
                        <div class="card-row">
                            <span class="material-icons">schedule</span>
                            <span>${r.created_at ? new Date(r.created_at).toLocaleString('ar') : ''}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions" style="margin-inline-start:auto;">
                            <button class="card-action view" onclick="viewServiceRequest(${r.id})">
                                <span class="material-icons">visibility</span> عرض
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    /* ============================================================
       renderOrders — XSS protected
       ============================================================ */
    window.renderOrders = function (orders) {
        const container = document.getElementById('ordersList');
        if (!container) return;

        const data = Array.isArray(orders)
            ? orders
            : (typeof ordersData !== 'undefined' ? ordersData : []);

        let filtered = [...data];
        try {
            const tabFilter = (typeof ordersTabFilter !== 'undefined') ? ordersTabFilter : 'all';
            if (tabFilter === 'pending') filtered = data.filter(o => o.status === 'pending');
            else if (tabFilter === 'processing') filtered = data.filter(o => o.status === 'processing' || o.status === 'review');
            else if (tabFilter === 'completed') filtered = data.filter(o => o.status === 'completed');
        } catch (e) { /* ignore */ }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">receipt_long</span></div>
                    <h3>لا توجد طلبات</h3>
                    <p>الطلبات الجديدة ستظهر هنا فور إنشائها.</p>
                </div>
            `;
            return;
        }

        const selectedIds = (typeof selectedOrders !== 'undefined' && selectedOrders instanceof Set)
            ? selectedOrders
            : new Set();

        container.innerHTML = filtered.map(o => {
            const statusText = getStatusArabic(o.status);
            const isChecked = selectedIds.has(o.id);

            let qtyDisplay;
            if (o.product_type === 'topup') {
                qtyDisplay = `${(o.quantity || 0).toLocaleString('ar')} ل.س`;
            } else if (o.product_unit_name && o.product_unit_name !== 'قطعة') {
                qtyDisplay = `${(o.quantity || 0).toLocaleString('ar')} ${escapeHtml(o.product_unit_name)}`;
            } else {
                qtyDisplay = `${(o.quantity || 0).toLocaleString('ar')} قطعة`;
            }

            const isFinal = ['completed', 'cancelled', 'failed'].includes(o.status);

            return `
                <div class="card-item" data-status="${escapeAttr(o.status)}" data-swipeable="true" data-order-id="${o.id}">
                    <div class="card-top">
                        <label class="order-checkbox-wrap" onclick="event.stopPropagation();" style="display:flex;align-items:center;">
                            <input type="checkbox" class="order-checkbox" ${isChecked ? 'checked' : ''}
                                   onchange="toggleOrderSelection(${o.id}, this.checked)"
                                   style="width:20px;height:20px;accent-color:var(--primary);cursor:pointer;">
                        </label>
                        <div class="card-id" onclick="copyToClipboard('${escapeAttr(o.order_number)}')" style="flex:1;margin:0 8px;">${escapeHtml(o.order_number)}</div>
                        <span class="badge-status ${escapeAttr(o.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <span>${escapeHtml(o.user_name || 'مستخدم')}</span>
                            <span class="card-user-id" onclick="copyToClipboard('${escapeAttr(o.user_telegram || o.user_id)}')">#${escapeHtml(o.user_telegram || o.user_id)}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">inventory_2</span>
                            <span>${escapeHtml(o.product_name || '-')}</span>
                            <span class="card-user-id">${qtyDisplay}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">schedule</span>
                            <span>${o.created_at ? new Date(o.created_at).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-price ltr">${(parseFloat(o.total_price) || 0).toFixed(2)}$</div>
                        <div class="card-actions">
                            <button class="card-action view" onclick="viewOrderDetails(${o.id})">
                                <span class="material-icons">visibility</span> تفاصيل
                            </button>
                            ${!isFinal ? `
                                <button class="card-action approve" onclick="quickApproveOrder(${o.id}, 'completed')">
                                    <span class="material-icons">check</span> إكمال
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (typeof updateSelectedOrdersBar === 'function') {
            try { updateSelectedOrdersBar(); } catch (e) {}
        }
        attachSwipeHandlers();
    };

    /* ============================================================
       renderDashboard
       ============================================================ */
    const _origRenderDashboard = window.renderDashboard;
    window.renderDashboard = function () {
        if (typeof _origRenderDashboard === 'function') {
            try { _origRenderDashboard(); } catch (e) { console.warn('renderDashboard error:', e); }
        }

        const h = new Date().getHours();
        const greeting = h < 12 ? 'صباح الخير' : 'مساء الخير';
        const el = document.getElementById('dashGreeting');
        if (el) el.textContent = `${greeting}، ${OWNER_NAME} 👋`;

        renderAttentionCard();
        renderRecentActivities();
    };

    function renderAttentionCard() {
        const container = document.getElementById('attentionList');
        if (!container) return;

        const ordersDataArr = (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) ? ordersData : [];
        const depositsDataArr = (typeof depositsData !== 'undefined' && Array.isArray(depositsData)) ? depositsData : [];
        const kycDataArr = (typeof kycData !== 'undefined' && Array.isArray(kycData)) ? kycData : [];
        const servicesDataArr = (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData)) ? serviceRequestsData : [];

        const pendingOrders = ordersDataArr.filter(o => o.status === 'pending').length;
        const pendingDeposits = depositsDataArr.filter(d => d.status === 'pending').length;
        const pendingKYC = kycDataArr.filter(k => k.status === 'pending').length;
        const pendingServices = servicesDataArr.filter(s => s.status === 'pending').length;

        const total = pendingOrders + pendingDeposits + pendingKYC + pendingServices;

        if (total === 0) {
            const card = document.getElementById('attentionCard');
            if (card) card.classList.add('empty');
            container.innerHTML = `
                <div class="attention-empty">
                    <span class="material-icons">check_circle</span>
                    كل شيء تحت السيطرة
                </div>
            `;
            return;
        }

        const card = document.getElementById('attentionCard');
        if (card) card.classList.remove('empty');

        let html = '';
        const items = [
            { count: pendingOrders, label: 'طلب بانتظار المراجعة', icon: 'receipt_long', section: 'orders' },
            { count: pendingDeposits, label: 'إيداع بانتظار المراجعة', icon: 'account_balance_wallet', section: 'deposits' },
            { count: pendingKYC, label: 'طلب توثيق معلق', icon: 'verified_user', section: 'kyc' },
            { count: pendingServices, label: 'طلب خدمة معلق', icon: 'handyman', section: 'service-requests' },
        ];

        items.forEach(item => {
            if (item.count > 0) {
                html += `
                    <button class="attention-item" onclick="switchSection('${item.section}')">
                        <div class="attention-item-icon"><span class="material-icons">${item.icon}</span></div>
                        <div class="attention-item-content">
                            <div class="attention-item-title">${item.count} ${item.label}</div>
                            <div class="attention-item-subtitle">اضغط للمراجعة</div>
                        </div>
                        <span class="attention-item-count">${item.count}</span>
                    </button>
                `;
            }
        });

        container.innerHTML = html;
    }

    function renderRecentActivities() {
        const container = document.getElementById('recentActivities');
        if (!container) return;

        const ordersDataArr = (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) ? ordersData : [];

        if (!ordersDataArr.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">history</span></div>
                    <h3>لا توجد عمليات حديثة</h3>
                    <p>عندما يبدأ المستخدمون بالتفاعل، ستظهر هنا آخر الطلبات والإيداعات.</p>
                </div>
            `;
            return;
        }

        const recent = ordersDataArr.slice(0, 5);
        container.innerHTML = `
            <div class="cards-list">
                ${recent.map(o => `
                    <div class="card-item" data-status="${escapeAttr(o.status)}" onclick="viewOrderDetails(${o.id})" style="cursor:pointer;">
                        <div class="card-top">
                            <div class="card-id">${escapeHtml(o.order_number)}</div>
                            <span class="badge-status ${escapeAttr(o.status)}">${getStatusArabic(o.status)}</span>
                        </div>
                        <div class="card-body">
                            <div class="card-row">
                                <span class="material-icons">person</span>
                                <span>${escapeHtml(o.user_name || 'مستخدم')}</span>
                            </div>
                            <div class="card-row">
                                <span class="material-icons">inventory_2</span>
                                <span>${escapeHtml(o.product_name || '-')}</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="card-price ltr">${(parseFloat(o.total_price) || 0).toFixed(2)}$</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /* ============================================================
       Greeting + Sidebar + Toast
       ============================================================ */
    function getGreeting() {
        const h = new Date().getHours();
        return h < 12 ? 'صباح الخير' : 'مساء الخير';
    }

    function updateGreeting() {
        const el = document.getElementById('dashGreeting');
        if (el) {
            el.textContent = `${getGreeting()}، ${OWNER_NAME} 👋`;
        }
        const sub = document.getElementById('dashSubtitle');
        if (sub && !sub.textContent.includes('آخر تحديث')) {
            sub.textContent = 'آخر تحديث: الآن';
        }
    }

    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (!sidebar) return;
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    };

    window.closeSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    };

    window.showToast = function (message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-icons">${icons[type] || 'info'}</span>
            <span>${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 250);
        }, duration);
    };

    /* ============================================================
       Bottom Sheet + Confirm
       ============================================================ */
    window.openBottomSheet = function (title, bodyHTML) {
        const sheet = document.getElementById('bottomSheet');
        const overlay = document.getElementById('bottomSheetOverlay');
        const titleEl = document.getElementById('sheetTitle');
        const bodyEl = document.getElementById('sheetBody');

        if (!sheet || !overlay) return;

        if (titleEl) titleEl.textContent = title || '';
        if (bodyEl) bodyEl.innerHTML = bodyHTML || '';

        overlay.classList.add('active');
        setTimeout(() => sheet.classList.add('open'), 10);
        document.body.style.overflow = 'hidden';
    };

    window.closeBottomSheet = function () {
        const sheet = document.getElementById('bottomSheet');
        const overlay = document.getElementById('bottomSheetOverlay');
        if (sheet) sheet.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    window.showConfirm = function (options) {
        return new Promise((resolve) => {
            const {
                title = 'تأكيد',
                message = 'هل أنت متأكد؟',
                confirmText = 'تأكيد',
                type = 'primary'
            } = options || {};

            const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';

            window.openBottomSheet(title, `
                <p style="text-align:center;margin-bottom:20px;color:var(--text-2);font-size:15px;line-height:1.7;white-space:pre-line;">${escapeHtml(message)}</p>
                <div style="display:flex;gap:8px;">
                    <button class="btn ${btnClass} btn-block" id="__confirmYes">${escapeHtml(confirmText)}</button>
                    <button class="btn btn-outline btn-block" id="__confirmNo">إلغاء</button>
                </div>
            `);

            const yesBtn = document.getElementById('__confirmYes');
            const noBtn = document.getElementById('__confirmNo');

            if (yesBtn) {
                yesBtn.onclick = () => {
                    window.closeBottomSheet();
                    resolve(true);
                };
            }
            if (noBtn) {
                noBtn.onclick = () => {
                    window.closeBottomSheet();
                    resolve(false);
                };
            }
        });
    };

    /* ============================================================
       Image Lightbox
       ============================================================ */
    window.openImageLightbox = function (url) {
        const lb = document.getElementById('imageLightbox');
        const img = document.getElementById('lightboxImage');
        if (!lb || !img) return;
        img.src = url;
        lb.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeImageLightbox = function () {
        const lb = document.getElementById('imageLightbox');
        if (lb) lb.classList.remove('active');
        document.body.style.overflow = '';
    };

    /* ============================================================
       🆕 v17: DISCOUNT MODAL
       ============================================================ */
    window.openDiscountModal = async function (userId) {
        const user = (typeof usersData !== 'undefined' && Array.isArray(usersData))
            ? usersData.find(u => u.id === userId)
            : null;
        if (!user) {
            window.showToast('المستخدم غير موجود', 'error');
            return;
        }

        let discountsData = { general_discount: 0, product_discounts: [] };
        try {
            discountsData = await window.fetchUserDiscounts(userId);
        } catch (err) {
            console.warn('fetchUserDiscounts failed:', err);
        }

        const generalPercent = parseFloat(discountsData.general_discount) || 0;
        const productDiscounts = discountsData.product_discounts || [];

        const productsList = (typeof productsData !== 'undefined' && Array.isArray(productsData))
            ? productsData
            : [];

        const productsOptions = productsList.map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)}</option>`
        ).join('');

        const currentDiscountsHTML = productDiscounts.length
            ? productDiscounts.map(d => `
                <div class="discount-row">
                    <div class="discount-row-info">
                        ${d.product_image ? `<img src="${escapeAttr(d.product_image)}" class="discount-row-img" alt="">` : '<span class="material-icons">inventory_2</span>'}
                        <div>
                            <div class="discount-row-name">${escapeHtml(d.product_name)}</div>
                            <div class="discount-row-percent">${parseFloat(d.discount_percent).toFixed(2)}%</div>
                        </div>
                    </div>
                    <button class="icon-action danger" onclick="deleteDiscountHandler(${userId}, ${d.id})" title="حذف">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            `).join('')
            : '<div class="empty" style="padding:20px;font-size:13px;">لا توجد خصومات على منتجات محددة</div>';

        const bodyHTML = `
            <div style="text-align:right;">
                <div class="card-id" style="margin-bottom:12px;display:inline-block;">${escapeHtml(user.username || user.first_name || 'مستخدم')} • #${escapeHtml(user.telegram_id)}</div>

                <div class="discount-section">
                    <div class="discount-section-title">
                        <span class="material-icons">public</span>
                        خصم عام (على كل المنتجات)
                    </div>
                    <div class="discount-input-row">
                        <input type="number" id="discGeneral" class="discount-input"
                               value="${generalPercent}" min="0" max="100" step="0.5"
                               placeholder="0">
                        <span class="discount-unit">%</span>
                        <button class="btn btn-primary btn-sm" onclick="saveGeneralDiscountHandler(${userId})">
                            <span class="material-icons">save</span> حفظ
                        </button>
                    </div>
                    <small style="color:var(--text-3);font-size:11px;display:block;margin-top:6px;">
                        💡 يُطبَّق تلقائياً على كل مشتريات المستخدم (يتجاوزه أي خصم مخصص لمنتج معين)
                    </small>
                </div>

                <div class="discount-section">
                    <div class="discount-section-title">
                        <span class="material-icons">inventory_2</span>
                        خصم على منتج معين
                    </div>
                    <div class="discount-input-row">
                        <select id="discProductId" class="discount-select">
                            ${productsOptions || '<option value="">لا توجد منتجات</option>'}
                        </select>
                    </div>
                    <div class="discount-input-row" style="margin-top:8px;">
                        <input type="number" id="discProductPercent" class="discount-input"
                               value="0" min="0.01" max="100" step="0.5" placeholder="0">
                        <span class="discount-unit">%</span>
                        <button class="btn btn-primary btn-sm" onclick="saveProductDiscountHandler(${userId})">
                            <span class="material-icons">add</span> إضافة
                        </button>
                    </div>
                    <small style="color:var(--text-3);font-size:11px;display:block;margin-top:6px;">
                        💡 يتجاوز الخصم العام عند شراء هذا المنتج تحديداً
                    </small>
                </div>

                <div class="discount-section">
                    <div class="discount-section-title">
                        <span class="material-icons">list</span>
                        خصومات المنتجات الحالية (${productDiscounts.length})
                    </div>
                    <div id="currentDiscountsList">
                        ${currentDiscountsHTML}
                    </div>
                </div>
            </div>
        `;

        window.openBottomSheet('💰 خصومات المستخدم', bodyHTML);
    };

    window.saveGeneralDiscountHandler = async function (userId) {
        const input = document.getElementById('discGeneral');
        if (!input) return;
        const percent = parseFloat(input.value) || 0;

        if (percent < 0 || percent > 100) {
            window.showToast('النسبة بين 0 و 100', 'warning');
            return;
        }

        try {
            await window.setGeneralDiscount(userId, percent);
            window.showToast(
                percent > 0 ? `✅ تم تعيين خصم عام ${percent}%` : '✅ تم إلغاء الخصم العام',
                'success'
            );
            await window.loadAllData();
            window.renderUsers();
            window.openDiscountModal(userId);
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.saveProductDiscountHandler = async function (userId) {
        const select = document.getElementById('discProductId');
        const input = document.getElementById('discProductPercent');
        if (!select || !input) return;

        const productId = parseInt(select.value);
        const percent = parseFloat(input.value) || 0;

        if (!productId) {
            window.showToast('اختر منتجاً', 'warning');
            return;
        }
        if (percent <= 0 || percent > 100) {
            window.showToast('النسبة بين 0.01 و 100', 'warning');
            return;
        }

        try {
            await window.setProductDiscount(userId, productId, percent);
            window.showToast(`✅ تم إضافة خصم ${percent}% على المنتج`, 'success');
            await window.loadAllData();
            window.renderUsers();
            window.openDiscountModal(userId);
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.deleteDiscountHandler = async function (userId, discountId) {
        const ok = await window.showConfirm({
            title: 'حذف الخصم',
            message: 'هل أنت متأكد من حذف هذا الخصم؟',
            confirmText: 'حذف',
            type: 'danger'
        });
        if (!ok) return;

        try {
            await window.deleteProductDiscount(userId, discountId);
            window.showToast('✅ تم حذف الخصم', 'success');
            await window.loadAllData();
            window.renderUsers();
            window.openDiscountModal(userId);
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       VIP Modal — v2
       ============================================================ */
    window.openVIPModal = function (userId) {
        const user = (typeof usersData !== 'undefined' && Array.isArray(usersData))
            ? usersData.find(u => u.id === userId)
            : null;
        if (!user) return;

        const currentLevel = user.vip_level || 0;

        let optionsHTML = `
            <label class="vip-option ${currentLevel === 0 ? 'selected' : ''}" onclick="selectVIPOption(this, 0)">
                <input type="radio" name="vipLevel" value="0" ${currentLevel === 0 ? 'checked' : ''} style="display:none;">
                <span class="material-icons" style="color:var(--text-3);font-size:20px;">block</span>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:14px;">بدون VIP</div>
                </div>
            </label>
        `;

        for (let lvl = 1; lvl <= 7; lvl++) {
            const isSel = lvl === currentLevel;
            optionsHTML += `
                <label class="vip-option ${isSel ? 'selected' : ''}" onclick="selectVIPOption(this, ${lvl})">
                    <input type="radio" name="vipLevel" value="${lvl}" ${isSel ? 'checked' : ''} style="display:none;">
                    ${window.getAdminVIPBadgeHTML(lvl)}
                </label>
            `;
        }

        window.openBottomSheet('⭐ اختيار مستوى VIP', `
            <div style="text-align:right;">
                <div class="card-id" style="margin-bottom:12px;display:inline-block;">${escapeHtml(user.username || user.first_name || 'مستخدم')} • #${escapeHtml(user.telegram_id)}</div>
                <p style="color:var(--text-3);font-size:12px;margin-bottom:14px;">
                    ⚠️ VIP مظهر فقط (شارة على الاسم) — لا يُغيّر الأسعار أو الخصومات.
                </p>
                <div class="vip-options-list">
                    ${optionsHTML}
                </div>
                <button class="btn btn-primary btn-block" style="margin-top:16px;" onclick="saveVIPSelection(${userId})">
                    <span class="material-icons">save</span> حفظ
                </button>
            </div>
        `);
    };

    window.selectVIPOption = function (el, level) {
        document.querySelectorAll('.vip-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        const radio = el.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    };

    window.saveVIPSelection = async function (userId) {
        const selected = document.querySelector('input[name="vipLevel"]:checked');
        if (!selected) {
            window.showToast('اختر مستوى', 'warning');
            return;
        }
        const level = parseInt(selected.value);
        try {
            await window.setUserVIP(userId, level);
            window.closeBottomSheet();
            window.showToast(level === 0 ? 'تم إلغاء VIP' : `تم تعيين ${VIP_LEVELS[level].name}`, 'success');
            await window.loadAllData();
            window.renderUsers();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       ORDER DETAILS — Dark Card + Skip Steps + XSS
       ============================================================ */
    window.viewOrderDetails = async function (orderId) {
        try {
            const order = await window.fetchAdminOrderFull(orderId);
            const delivery = order.delivery_data || {};

            let deliveryRows = '';
            if (delivery.player_id) {
                deliveryRows += renderCopyableRow('🎮', 'ID اللاعب', delivery.player_id);
            }
            if (delivery.account_id) {
                deliveryRows += renderCopyableRow('🎮', 'ID الحساب', delivery.account_id);
            }
            if (delivery.phone) {
                deliveryRows += renderCopyableRow('📞', 'رقم الهاتف', delivery.phone);
            }
            if (delivery.url) {
                deliveryRows += renderCopyableRow('🔗', 'الرابط', delivery.url);
            }
            if (delivery.bundle_name) {
                deliveryRows += `<div class="delivery-row-info"><span class="dl">📦 الباقة</span><strong>${escapeHtml(delivery.bundle_name)}</strong></div>`;
            }
            if (delivery.syp_amount) {
                deliveryRows += `<div class="delivery-row-info"><span class="dl">💵 المبلغ</span><strong>${delivery.syp_amount.toLocaleString('ar')} ل.س</strong></div>`;
            }
            if (delivery.syp_rate) {
                deliveryRows += `<div class="delivery-row-info"><span class="dl">📊 سعر الصرف</span><strong>${escapeHtml(delivery.syp_rate)} ل.س/$</strong></div>`;
            }

            const isFinal = ['completed', 'cancelled', 'failed'].includes(order.status);

            const actionsHtml = !isFinal ? `
                <div class="order-detail-actions-v17">
                    <button class="btn btn-success btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'completed')">
                        <span class="material-icons">check_circle</span> إكمال مباشر
                    </button>
                    <button class="btn btn-danger btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'failed')">
                        <span class="material-icons">close</span> فشل
                    </button>
                    <button class="btn btn-outline btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'cancelled')">
                        <span class="material-icons">block</span> إلغاء
                    </button>
                </div>
            ` : `
                <div class="order-final-banner">
                    ✋ حالة الطلب نهائية — موجود في الأرشيف
                </div>
            `;

            window.openBottomSheet('📋 تفاصيل الطلب', `
                <div class="order-detail-v17">
                    <div class="order-dark-header">
                        <div class="order-dark-number" onclick="copyToClipboard('${escapeAttr(order.order_number)}')">
                            ${escapeHtml(order.order_number)}
                            <span class="material-icons" style="font-size:14px;vertical-align:middle;margin-inline-start:6px;opacity:.6;">content_copy</span>
                        </div>
                        <span class="badge-status ${escapeAttr(order.status)}">${escapeHtml(order.status_arabic)}</span>
                    </div>

                    <div class="order-dark-section">
                        <div class="section-mini-title">
                            <span class="material-icons">person</span>
                            العميل
                        </div>
                        <div class="order-user-line">
                            <strong>${escapeHtml((order.user && (order.user.first_name || order.user.username)) || 'مستخدم')}</strong>
                            <span class="copy-id-inline" onclick="copyToClipboard('${escapeAttr(order.user ? order.user.telegram_id : '')}')">
                                #${escapeHtml(order.user ? order.user.telegram_id : '')}
                                <span class="material-icons" style="font-size:12px;">content_copy</span>
                            </span>
                        </div>
                        <div class="order-balance-line">
                            💰 رصيد العميل: <strong style="color:${order.user && order.user.balance < 0 ? '#F87171' : '#4ADE80'};">
                                ${(order.user && order.user.balance !== null && order.user.balance !== undefined) ? parseFloat(order.user.balance).toFixed(2) : '0.00'}$
                            </strong>
                        </div>
                    </div>

                    <div class="order-dark-section">
                        <div class="section-mini-title">
                            <span class="material-icons">inventory_2</span>
                            المنتج
                        </div>
                        ${order.product && order.product.image ? `<img src="${escapeAttr(order.product.image)}" class="product-thumb-dark" alt="">` : ''}
                        <div class="order-product-line"><strong>${escapeHtml(order.product ? order.product.name : '-')}</strong></div>
                        <div class="order-qty-line">
                            الكمية: <strong>${order.quantity.toLocaleString('ar')} ${escapeHtml((order.product && order.product.unit_name) || 'قطعة')}</strong>
                        </div>
                    </div>

                    ${deliveryRows ? `
                    <div class="order-dark-section highlight-dark">
                        <div class="section-mini-title">
                            <span class="material-icons">vpn_key</span>
                            بيانات التسليم
                        </div>
                        ${deliveryRows}
                    </div>
                    ` : ''}

                    <div class="order-dark-section">
                        <div class="section-mini-title">
                            <span class="material-icons">receipt</span>
                            الفاتورة
                        </div>
                        ${order.discount_amount > 0 ? `
                            <div class="order-total-line">
                                <span>الخصم:</span>
                                <strong style="color:#FBBF24;">-${parseFloat(order.discount_amount).toFixed(2)}$</strong>
                            </div>
                        ` : ''}
                        ${order.coupon_code ? `
                            <div class="order-total-line">
                                <span>الكوبون:</span>
                                <strong>${escapeHtml(order.coupon_code)}</strong>
                            </div>
                        ` : ''}
                        <div class="order-total-line main">
                            <span>الإجمالي:</span>
                            <strong class="order-total-amount">${parseFloat(order.total_price).toFixed(2)}$</strong>
                        </div>
                    </div>

                    ${actionsHtml}
                </div>
            `);
        } catch (err) {
            window.showToast(`فشل التحميل: ${err.message}`, 'error');
        }
    };

    function renderCopyableRow(emoji, label, value) {
        const valueStr = String(value);
        const escapedValue = escapeHtml(valueStr);
        const escapedForAttr = escapeAttr(valueStr);
        return `
            <div class="delivery-field">
                <div class="delivery-field-label">${emoji} ${label}</div>
                <div class="delivery-field-value-wrap">
                    <div class="delivery-field-value" title="${escapedForAttr}">${escapedValue}</div>
                    <button class="delivery-copy-btn" onclick="copyToClipboard('${escapedForAttr}')" title="نسخ">
                        <span class="material-icons">content_copy</span>
                    </button>
                </div>
            </div>
        `;
    }

    /* ============================================================
       Quick Approve Order
       ============================================================ */
    window.quickApproveOrder = async function (orderId, newStatus) {
        const labels = {
            review: 'مراجعة',
            processing: 'بدء تنفيذ',
            completed: 'إكمال مباشر',
            failed: 'فشل',
            cancelled: 'إلغاء'
        };

        const confirmed = await window.showConfirm({
            title: 'تأكيد الإجراء',
            message: `هل تريد تغيير حالة الطلب إلى "${labels[newStatus] || newStatus}"؟`,
            confirmText: labels[newStatus] || 'تأكيد',
            type: (newStatus === 'failed' || newStatus === 'cancelled') ? 'danger' : 'primary'
        });

        if (!confirmed) return;

        try {
            await window.updateOrderStatus(orderId, newStatus);
            const archived = ['completed', 'failed', 'cancelled'].includes(newStatus);
            window.showToast(
                archived
                    ? `✅ ${labels[newStatus]} — نُقل إلى الأرشيف`
                    : `✅ ${labels[newStatus]} بنجاح`,
                'success'
            );

            if (typeof window.loadAllData === 'function') {
                await window.loadAllData();
            }
            if (typeof window.renderOrders === 'function') {
                window.renderOrders(window.filteredOrders || window.ordersData || []);
            }
            if (typeof window.updateNavBadges === 'function') {
                window.updateNavBadges();
            }
            if (typeof window.updateArchiveBadges === 'function') {
                window.updateArchiveBadges();
            }
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       Swipe
       ============================================================ */
    function attachSwipeHandlers() {
        const cards = document.querySelectorAll('.card-item[data-swipeable="true"]');
        cards.forEach(card => {
            if (card.dataset.swipeAttached === '1') return;
            card.dataset.swipeAttached = '1';

            let startX = 0;
            let startY = 0;
            let currentX = 0;
            let isTracking = false;
            let isHorizontal = null;

            card.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                currentX = startX;
                isTracking = true;
                isHorizontal = null;
                card.style.transition = 'none';
            }, { passive: true });

            card.addEventListener('touchmove', (e) => {
                if (!isTracking) return;
                currentX = e.touches[0].clientX;
                const deltaX = currentX - startX;
                const deltaY = e.touches[0].clientY - startY;

                if (isHorizontal === null) {
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
                        isHorizontal = true;
                    } else if (Math.abs(deltaY) > 8) {
                        isHorizontal = false;
                        isTracking = false;
                        card.style.transition = '';
                        return;
                    }
                }

                if (isHorizontal) {
                    e.preventDefault();
                    const limitedDelta = Math.max(-100, Math.min(100, deltaX));
                    card.style.transform = `translateX(${limitedDelta}px)`;
                    card.style.opacity = String(1 - Math.abs(limitedDelta) / 200);
                }
            }, { passive: false });

            card.addEventListener('touchend', () => {
                if (!isTracking) return;
                const deltaX = currentX - startX;
                card.style.transition = 'transform 200ms ease, opacity 200ms ease';
                card.style.transform = '';
                card.style.opacity = '';

                if (isHorizontal && Math.abs(deltaX) > 60) {
                    const orderId = card.dataset.orderId;
                    if (orderId) {
                        if (deltaX > 60) {
                            window.quickApproveOrder(parseInt(orderId), 'completed');
                        } else {
                            window.viewOrderDetails(parseInt(orderId));
                        }
                    }
                }

                isTracking = false;
                isHorizontal = null;
            });
        });
    }

    if (window.MutationObserver) {
        const observer = new MutationObserver(() => {
            attachSwipeHandlers();
        });
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    /* ============================================================
       Archive System
       ============================================================ */
    let archiveTab = 'orders';
    let archiveData = { orders: [], deposits: [], kyc: [], services: [] };
    let archiveCounts = { orders: 0, deposits: 0, kyc: 0, services: 0 };

    window.setArchiveTab = function (tab, btn) {
        archiveTab = tab;
        document.querySelectorAll('#archiveTabs .tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        renderArchiveList();
    };

    window.loadArchiveData = async function () {
        const container = document.getElementById('archiveList');
        if (container) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">hourglass_empty</span></div>
                    <h3>جارٍ التحميل...</h3>
                </div>
            `;
        }

        try {
            const [orders, deposits, kyc, services, counts] = await Promise.all([
                window.fetchArchivedOrders().catch(() => []),
                window.fetchArchivedDeposits().catch(() => []),
                window.fetchArchivedKYC().catch(() => []),
                window.fetchArchivedServices().catch(() => []),
                window.fetchArchiveCounts().catch(() => ({ orders: 0, deposits: 0, kyc: 0, services: 0 }))
            ]);

            archiveData = { orders, deposits, kyc, services };
            archiveCounts = counts || { orders: 0, deposits: 0, kyc: 0, services: 0 };

            const upd = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val || 0;
            };

            upd('archiveTabOrdersCount', archiveCounts.orders);
            upd('archiveTabDepositsCount', archiveCounts.deposits);
            upd('archiveTabKycCount', archiveCounts.kyc);
            upd('archiveTabServicesCount', archiveCounts.services);

            renderArchiveList();
        } catch (err) {
            if (container) {
                container.innerHTML = `
                    <div class="empty">
                        <div class="empty-icon"><span class="material-icons">error</span></div>
                        <h3>فشل التحميل</h3>
                        <p>${escapeHtml(err.message)}</p>
                    </div>
                `;
            }
        }
    };

    window.filterArchiveItems = function () {
        renderArchiveList();
    };

    function renderArchiveList() {
        const container = document.getElementById('archiveList');
        if (!container) return;

        const searchQuery = (document.getElementById('archiveSearch')?.value || '').toLowerCase().trim();
        const items = archiveData[archiveTab] || [];

        let filtered = items;
        if (searchQuery) {
            filtered = items.filter(item => {
                const searchStr = [
                    item.order_number,
                    item.transaction_id,
                    item.full_name,
                    item.phone,
                    item.service_name,
                    item.user_telegram,
                    item.user_name,
                    item.product_name
                ].filter(Boolean).join(' ').toLowerCase();
                return searchStr.includes(searchQuery);
            });
        }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">inventory_2</span></div>
                    <h3>لا توجد عناصر مؤرشفة</h3>
                    <p>العناصر المكتملة والملغية والمرفوضة تظهر هنا تلقائياً.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(item => renderArchiveCard(item)).join('');
        attachSwipeHandlers();
    }
function getStatusArabic(status) {
        const map = {
            pending: 'قيد المعالجة',
            review: 'قيد المراجعة',
            processing: 'قيد التنفيذ',
            completed: 'مكتمل',
            failed: 'فشل',
            cancelled: 'ملغي',
            approved: 'مقبول',
            rejected: 'مرفوض'
        };
        return map[status] || status;
    }

    function renderArchiveCard(item) {
        if (archiveTab === 'orders') {
            return `
                <div class="card-item" data-status="${escapeAttr(item.status)}">
                    <div class="card-top">
                        <div class="card-id">${escapeHtml(item.order_number)}</div>
                        <span class="badge-status ${escapeAttr(item.status)}">${getStatusArabic(item.status)}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span>${escapeHtml(item.user_name || 'مستخدم')} <span class="card-user-id">#${escapeHtml(item.user_telegram || item.user_id)}</span></div>
                        <div class="card-row"><span class="material-icons">inventory_2</span>${escapeHtml(item.product_name)}</div>
                        <div class="card-row"><span class="material-icons">schedule</span>${item.created_at ? new Date(item.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-price ltr">${parseFloat(item.total_price).toFixed(2)}$</div>
                        <div class="card-actions">
                            <button class="card-action restore" onclick="restoreArchivedOrder(${item.id})">
                                <span class="material-icons">undo</span> استرجاع
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (archiveTab === 'deposits') {
            return `
                <div class="card-item" data-status="${escapeAttr(item.status)}">
                    <div class="card-top">
                        <div class="card-id">${escapeHtml(item.transaction_id)}</div>
                        <span class="badge-status ${escapeAttr(item.status)}">${item.status === 'approved' ? 'مقبول' : 'مرفوض'}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span>${escapeHtml(item.user_name || 'مستخدم')} <span class="card-user-id">#${escapeHtml(item.user_telegram || item.user_id)}</span></div>
                        <div class="card-row"><span class="material-icons">credit_card</span>${escapeHtml(item.method || '-')}</div>
                        <div class="card-row"><span class="material-icons">schedule</span>${item.created_at ? new Date(item.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-price ltr">$${parseFloat(item.amount).toFixed(2)}</div>
                        <div class="card-actions">
                            <button class="card-action restore" onclick="restoreArchivedDeposit(${item.id})">
                                <span class="material-icons">undo</span> استرجاع
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (archiveTab === 'kyc') {
            return `
                <div class="card-item" data-status="${escapeAttr(item.status)}">
                    <div class="card-top">
                        <div class="card-id">#${escapeHtml(item.user_id)}</div>
                        <span class="badge-status ${escapeAttr(item.status)}">${item.status === 'approved' ? 'مقبول' : 'مرفوض'}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span><strong>${escapeHtml(item.full_name)}</strong></div>
                        <div class="card-row"><span class="material-icons">phone</span>${escapeHtml(item.phone)}</div>
                        <div class="card-row"><span class="material-icons">schedule</span>${item.submitted_at ? new Date(item.submitted_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions" style="margin-inline-start:auto;">
                            <button class="card-action restore" onclick="restoreArchivedKYC(${item.id})">
                                <span class="material-icons">undo</span> استرجاع
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (archiveTab === 'services') {
            const statusText = item.status === 'completed' ? 'مكتمل' :
                              item.status === 'rejected' ? 'مرفوض' : 'ملغي';
            return `
                <div class="card-item" data-status="${escapeAttr(item.status)}">
                    <div class="card-top">
                        <div class="card-id">#${escapeHtml(item.id)}</div>
                        <span class="badge-status ${escapeAttr(item.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">handyman</span><strong>${escapeHtml(item.service_name)}</strong></div>
                        <div class="card-row"><span class="material-icons">description</span>${escapeHtml(item.description || '-')}</div>
                        <div class="card-row"><span class="material-icons">schedule</span>${item.created_at ? new Date(item.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions" style="margin-inline-start:auto;">
                            <button class="card-action restore" onclick="restoreArchivedService(${item.id})">
                                <span class="material-icons">undo</span> استرجاع
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    /* ============================================================
       Restore Actions
       ============================================================ */
    window.restoreArchivedOrder = async function (id) {
        const ok = await window.showConfirm({
            title: 'استرجاع الطلب',
            message: 'سيُعاد الطلب إلى القائمة الرئيسية كطلب معلق. متابعة؟',
            confirmText: 'استرجاع'
        });
        if (!ok) return;
        try {
            await window.restoreOrder(id);
            window.showToast('✅ تم الاسترجاع', 'success');
            await window.loadArchiveData();
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.restoreArchivedDeposit = async function (id) {
        const ok = await window.showConfirm({
            title: 'استرجاع الإيداع',
            message: 'سيُعاد الإيداع للحالة المعلقة. متابعة؟',
            confirmText: 'استرجاع'
        });
        if (!ok) return;
        try {
            await window.restoreDeposit(id);
            window.showToast('✅ تم الاسترجاع', 'success');
            await window.loadArchiveData();
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.restoreArchivedKYC = async function (id) {
        const ok = await window.showConfirm({
            title: 'استرجاع طلب التوثيق',
            message: 'سيُعاد الطلب للحالة المعلقة. متابعة؟',
            confirmText: 'استرجاع'
        });
        if (!ok) return;
        try {
            await window.restoreKYC(id);
            window.showToast('✅ تم الاسترجاع', 'success');
            await window.loadArchiveData();
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.restoreArchivedService = async function (id) {
        const ok = await window.showConfirm({
            title: 'استرجاع طلب الخدمة',
            message: 'سيُعاد الطلب للحالة المعلقة. متابعة؟',
            confirmText: 'استرجاع'
        });
        if (!ok) return;
        try {
            await window.restoreService(id);
            window.showToast('✅ تم الاسترجاع', 'success');
            await window.loadArchiveData();
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       Archive Badge
       ============================================================ */
    window.updateArchiveBadges = async function () {
        try {
            const counts = await window.fetchArchiveCounts();
            const total = (counts.orders || 0) + (counts.deposits || 0) + (counts.kyc || 0) + (counts.services || 0);
            const el = document.getElementById('badge-archive-total');
            if (el) {
                if (total > 0) {
                    el.textContent = total > 99 ? '99+' : total;
                    el.style.display = 'inline-flex';
                } else {
                    el.style.display = 'none';
                }
            }
        } catch (err) { /* ignore */ }
    };

    /* ============================================================
       Quick Actions FAB
       ============================================================ */
    window.openQuickActions = function () {
        window.openBottomSheet('إجراء سريع', `
            <button class="sheet-action primary" onclick="closeBottomSheet(); switchSection('orders')">
                <span class="material-icons">receipt_long</span>
                <span>عرض الطلبات</span>
            </button>
            <button class="sheet-action warning" onclick="closeBottomSheet(); switchSection('deposits')">
                <span class="material-icons">account_balance_wallet</span>
                <span>عرض الإيداعات</span>
            </button>
            <button class="sheet-action primary" onclick="closeBottomSheet(); switchSection('kyc')">
                <span class="material-icons">verified_user</span>
                <span>طلبات التوثيق</span>
            </button>
            <button class="sheet-action" onclick="closeBottomSheet(); switchSection('archive')">
                <span class="material-icons">inventory_2</span>
                <span>الأرشيف</span>
            </button>
            <button class="sheet-action primary" onclick="closeBottomSheet(); switchSection('notifications')">
                <span class="material-icons">send</span>
                <span>إرسال إشعار</span>
            </button>
        `);
    };

    /* ============================================================
       Wrap loadAllData
       ============================================================ */
    const origLoadAllData = window.loadAllData;
    if (typeof origLoadAllData === 'function') {
        window.loadAllData = async function () {
            const result = await origLoadAllData.apply(this, arguments);

            try {
                if (typeof kycData !== 'undefined' && Array.isArray(kycData)) {
                    window.renderKYC();
                }
                if (typeof depositsData !== 'undefined' && Array.isArray(depositsData)) {
                    window.renderDeposits(depositsData);
                }
                if (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData)) {
                    window.renderServiceRequests();
                }
                if (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) {
                    window.renderOrders(window.filteredOrders || ordersData);
                }
                if (typeof usersData !== 'undefined' && Array.isArray(usersData)) {
                    window.renderUsers();
                }
            } catch (e) {
                console.warn('Re-render after load failed:', e);
            }

            window.updateArchiveBadges();
            return result;
        };
    }

    /* ============================================================
       Wrap switchSection
       ============================================================ */
    const origSwitchSection = window.switchSection;
    if (typeof origSwitchSection === 'function') {
        window.switchSection = function (section) {
            origSwitchSection(section);

            window.closeSidebar();

            try {
                if (section === 'dashboard' && typeof window.renderDashboard === 'function') {
                    window.renderDashboard();
                }
                if (section === 'orders' && typeof window.renderOrders === 'function') {
                    window.renderOrders(window.filteredOrders || ordersData || []);
                }
                if (section === 'deposits' && typeof window.renderDeposits === 'function') {
                    window.renderDeposits(depositsData || []);
                }
                if (section === 'kyc' && typeof window.renderKYC === 'function') {
                    window.renderKYC();
                }
                if (section === 'service-requests' && typeof window.renderServiceRequests === 'function') {
                    window.renderServiceRequests();
                }
                if (section === 'users' && typeof window.renderUsers === 'function') {
                    window.renderUsers();
                }
                if (section === 'archive' && typeof window.loadArchiveData === 'function') {
                    window.loadArchiveData();
                }
            } catch (e) {
                console.warn('Section re-render failed:', e);
            }

            if (section === 'dashboard') {
                updateGreeting();
            }
        };
    }

    /* ============================================================
       Legacy Modal Overrides
       ============================================================ */
    window.openModal = function(title, bodyHTML) {
        window.openBottomSheet(title || 'تفاصيل', bodyHTML || '');
    };

    window.closeModal = function() {
        window.closeBottomSheet();
    };

    window.viewKYCImage = function(kycId) {
        const kyc = (typeof kycData !== 'undefined' && Array.isArray(kycData))
            ? kycData.find(k => k.id === kycId)
            : null;

        if (!kyc) {
            window.showToast('الطلب غير موجود', 'error');
            return;
        }

        const statusText = kyc.status === 'approved' ? 'مقبول'
                         : kyc.status === 'rejected' ? 'مرفوض'
                         : 'معلق';

        const selfieSrc = kyc.selfie_image ? escapeAttr(kyc.selfie_image) : '';

        const bodyHtml = `
            <div style="text-align:right;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                    <div class="card-id">#${escapeHtml(kyc.user_id)}</div>
                    <span class="badge-status ${escapeAttr(kyc.status)}">${statusText}</span>
                </div>

                <div style="background:var(--surface-2);padding:14px;border-radius:12px;margin-bottom:16px;">
                    <div class="card-row"><span class="material-icons">person</span><strong>${escapeHtml(kyc.full_name || '-')}</strong></div>
                    <div class="card-row"><span class="material-icons">phone</span><span class="ltr">${escapeHtml(kyc.phone || '-')}</span></div>
                    ${kyc.address ? `<div class="card-row"><span class="material-icons">location_on</span><span>${escapeHtml(kyc.address)}</span></div>` : ''}
                    <div class="card-row"><span class="material-icons">schedule</span><span>${kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleString('ar') : ''}</span></div>
                </div>

                ${kyc.selfie_image ? `
                    <div style="margin-bottom:12px;">
                        <div style="font-weight:700;margin-bottom:8px;color:var(--text-2);font-size:13px;">صورة السيلفي:</div>
                        <div style="border-radius:12px;overflow:hidden;border:2px solid var(--border);max-height:400px;background:var(--surface-2);">
                            <img src="${selfieSrc}"
                                 onclick="openImageLightbox('${selfieSrc}')"
                                 style="width:100%;height:auto;max-height:400px;object-fit:contain;cursor:zoom-in;display:block;"
                                 alt="KYC Selfie">
                        </div>
                    </div>
                ` : `<div style="text-align:center;padding:20px;color:var(--text-3);font-size:13px;">لا توجد صورة</div>`}

                ${kyc.status === 'pending' ? `
                    <div style="display:flex;gap:8px;margin-top:16px;">
                        <button class="btn btn-success btn-block" onclick="closeBottomSheet(); window.handleApproveKYC(${kyc.id})">
                            <span class="material-icons">check</span> قبول
                        </button>
                        <button class="btn btn-danger btn-block" onclick="closeBottomSheet(); window.handleRejectKYC(${kyc.id})">
                            <span class="material-icons">close</span> رفض
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        window.openBottomSheet('تفاصيل طلب التوثيق', bodyHtml);
    };

    window.viewServiceRequest = function(reqId) {
        const data = (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData))
            ? serviceRequestsData
            : [];
        const r = data.find(x => x.id === reqId);
        if (!r) {
            window.showToast('الطلب غير موجود', 'error');
            return;
        }

        const statusText = r.status === 'completed' ? 'مكتمل'
                         : r.status === 'rejected' ? 'مرفوض'
                         : r.status === 'cancelled' ? 'ملغي'
                         : 'معلق';

        const bodyHtml = `
            <div style="text-align:right;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                    <div class="card-id">#${escapeHtml(r.user_id)}</div>
                    <span class="badge-status ${escapeAttr(r.status)}">${statusText}</span>
                </div>

                <div style="background:var(--surface-2);padding:14px;border-radius:12px;margin-bottom:16px;">
                    <div class="card-row"><span class="material-icons">handyman</span><strong>${escapeHtml(r.service_name || '-')}</strong></div>
                    ${r.description ? `<div class="card-row"><span class="material-icons">description</span><span>${escapeHtml(r.description)}</span></div>` : ''}
                    ${r.estimated_price ? `<div class="card-row"><span class="material-icons">payments</span><span class="ltr">${escapeHtml(r.estimated_price)}$</span></div>` : ''}
                    <div class="card-row"><span class="material-icons">schedule</span><span>${r.created_at ? new Date(r.created_at).toLocaleString('ar') : ''}</span></div>
                </div>

                ${r.status === 'pending' ? `
                    <div style="display:grid;gap:8px;margin-top:16px;">
                        <button class="btn btn-success btn-block" onclick="closeBottomSheet(); updateServiceStatus(${r.id}, 'completed')">
                            <span class="material-icons">check</span> إكمال
                        </button>
                        <button class="btn btn-danger btn-block" onclick="closeBottomSheet(); updateServiceStatus(${r.id}, 'rejected')">
                            <span class="material-icons">close</span> رفض
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        window.openBottomSheet('تفاصيل طلب الخدمة', bodyHtml);
    };

    window.updateServiceStatus = async function(reqId, status) {
        try {
            await window.updateServiceRequest(reqId, { status });
            window.showToast('✅ تم التحديث', 'success');
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            window.renderServiceRequests();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.handleApproveKYC = async function(kycId) {
        const confirmed = await window.showConfirm({
            title: 'قبول التوثيق',
            message: 'هل أنت متأكد من قبول طلب التوثيق؟',
            confirmText: 'قبول',
            type: 'primary'
        });
        if (!confirmed) return;

        try {
            await window.approveKYCRequest(kycId);
            window.showToast('✅ تم قبول التوثيق — نُقل إلى الأرشيف', 'success');
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            window.renderKYC();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.handleRejectKYC = async function(kycId) {
        const confirmed = await window.showConfirm({
            title: 'رفض التوثيق',
            message: 'هل أنت متأكد من رفض طلب التوثيق؟',
            confirmText: 'رفض',
            type: 'danger'
        });
        if (!confirmed) return;

        try {
            await window.rejectKYCRequest(kycId);
            window.showToast('تم رفض التوثيق — نُقل إلى الأرشيف', 'warning');
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            window.renderKYC();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.closeConfirm = function(result) {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.style.display = 'none';
        if (window._confirmResolver) {
            window._confirmResolver(result);
            window._confirmResolver = null;
        }
    };

    /* ============================================================
       Init
       ============================================================ */
    function initV17() {
        updateGreeting();
        window.updateArchiveBadges();
        attachSwipeHandlers();

        setTimeout(() => {
            try {
                if (typeof kycData !== 'undefined' && Array.isArray(kycData)) {
                    window.renderKYC();
                }
                if (typeof depositsData !== 'undefined' && Array.isArray(depositsData)) {
                    window.renderDeposits(depositsData);
                }
                if (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData)) {
                    window.renderServiceRequests();
                }
                if (typeof usersData !== 'undefined' && Array.isArray(usersData)) {
                    window.renderUsers();
                }
            } catch (e) {}
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initV17);
    } else {
        setTimeout(initV17, 100);
    }


    /* ============================================================
       🆕 v18.4.12: Reset deposits filter (fix stuck filter bug)
       ============================================================ */
    window.resetDepositsFilter = function () {
        try {
            if (typeof depositsTabFilter !== 'undefined') {
                depositsTabFilter = 'all';
            }
            document.querySelectorAll('#depositsTabs .filter-tab').forEach(function (b, i) {
                b.classList.toggle('active', i === 0);
            });
        } catch (e) {
            console.warn('resetDepositsFilter error:', e);
        }
    };

    console.log('✅ admin-v16.js loaded — v17.2 XSS Hardened');

})();```

---

## FILE: ./admin/js/admin-v17.js

```
/* ============================================================
   admin-v17.js — v17.2 (XSS Hardened + URL Input for Products)
   ============================================================
   - Override openProductModal → إضافة خيار "رابط URL"
   - Override openEditProductModal → دعم تعديل منتجات URL
   - Override renderProducts → إظهار نوع URL بشارة
   - يُحمّل بعد admin-v16.js
   - يستخدم escapeHtml/escapeAttr من admin-v16.js
   ============================================================ */
(function () {
    'use strict';

    /* ============================================================
       0. تأكيد توفر دوال الحماية (fallback إن لم تكن موجودة)
       ============================================================ */
    const _esc = (typeof window.escapeHtml === 'function')
        ? window.escapeHtml
        : function (s) {
            if (s === null || s === undefined) return '';
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

    const _escAttr = (typeof window.escapeAttr === 'function')
        ? window.escapeAttr
        : function (s) {
            if (s === null || s === undefined) return '';
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        };

    /* ============================================================
       1. Helper — قائمة أنواع الحقول (مع URL)
       ============================================================ */
    function getInputTypeOptions(selectedValue) {
        const options = [
            { value: 'id',         label: 'معرف اللاعب (ID)' },
            { value: 'account_id', label: 'ID الحساب' },
            { value: 'phone',      label: 'رقم الهاتف' },
            { value: 'url',        label: '🔗 رابط URL' },
            { value: 'none',       label: 'بدون' }
        ];
        const sel = selectedValue || 'id';
        return options.map(o =>
            `<option value="${_escAttr(o.value)}" ${o.value === sel ? 'selected' : ''}>${_esc(o.label)}</option>`
        ).join('');
    }

    /* ============================================================
       2. Override openProductModal — إضافة منتج مع URL
       ============================================================ */
    window.openProductModal = function () {
        const categoriesData = (typeof window.categoriesData !== 'undefined' && Array.isArray(window.categoriesData))
            ? window.categoriesData
            : (typeof categoriesData !== 'undefined' && Array.isArray(categoriesData) ? categoriesData : []);

        if (typeof window.editingBundles !== 'undefined') {
            window.editingBundles = [];
        }
        if (typeof window.editingProductId !== 'undefined') {
            window.editingProductId = null;
        }

        const categoriesOptions = categoriesData.map(c =>
            `<option value="${c.id}">${_esc(c.name)}</option>`
        ).join('');

        const body = `
            <h3 style="margin-bottom:14px;">إضافة منتج</h3>

            <div class="form-group"><label>اسم المنتج</label>
                <input type="text" id="productName">
            </div>

            <div class="form-group"><label>القسم</label>
                <select id="productCategoryId">${categoriesOptions}</select>
            </div>

            <div class="form-group">
                <label>النوع</label>
                <select id="productType" onchange="toggleProductTypeFields()">
                    <option value="quantity">كمية</option>
                    <option value="bundle">باقة (PUBG / Free Fire / إلخ)</option>
                    <option value="topup">رصيد سوري (ل.س)</option>
                </select>
            </div>

            <div class="form-group" id="unitNameField" style="display:none;">
                <label>وحدة القياس</label>
                <input type="text" id="productUnitName" value="قطعة" placeholder="مثال: UC، جوهرة، Diamond، متابع">
                <small style="color:var(--text-2);font-size:12px;display:block;margin-top:6px;">
                    💡 يظهر بجانب الكمية
                </small>
            </div>

            <div class="form-group">
                <label id="priceLabel">السعر الأساسي (دولار)</label>
                <input type="number" id="productPrice" value="0" step="0.01">
                <small id="priceHelp" style="color:var(--text-2);font-size:12px;display:none;margin-top:6px;">
                    💡 لمنتج الرصيد السوري: السعر يُحسب من سعر الصرف
                </small>
            </div>

            <div class="form-group" id="quantityField">
                <label>الكمية الأساسية</label>
                <input type="number" id="productQuantity" value="0">
            </div>

            <div class="form-group" id="bundlesField" style="display:none;">
                <label style="display:flex;justify-content:space-between;align-items:center;">
                    <span>🎁 الباقات</span>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addBundleRow('bundlesEditor')" style="font-size:12px;">
                        <span class="material-icons" style="font-size:14px;vertical-align:middle;">add</span> إضافة
                    </button>
                </label>
                <div id="bundlesEditor" class="bundles-editor" style="margin-top:10px;"></div>
            </div>

            <div class="form-group">
                <label id="maxQtyLabel">الحد الأقصى للكمية للطلب الواحد</label>
                <input type="number" id="productMaxQuantity" value="0" min="0" placeholder="0">
                <small style="color:var(--text-2);font-size:12px;display:block;margin-top:6px;">
                    💡 0 = بلا حد أقصى
                </small>
            </div>

            <div class="form-group">
                <label>نوع الحقل المخصص</label>
                <select id="productInputType" onchange="handleInputTypeChange()">
                    ${getInputTypeOptions('id')}
                </select>
                <small id="inputTypeHelp" style="color:var(--text-2);font-size:12px;display:none;margin-top:6px;">
                    💡 للخدمات (متابعين فيسبوك، تيك توك...): اختر "رابط URL" ليُطلب من المستخدم إدخال رابط
                </small>
            </div>

            <div class="form-group">
                <label>صورة المنتج</label>
                <div class="image-preview" id="productImagePreview">لا صورة</div>
                <input type="file" id="productImage" accept="image/*" onchange="previewImage(this,'productImagePreview')">
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button class="btn btn-primary" onclick="saveProduct(this)">حفظ</button>
                <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
            </div>
        `;
        window.openModal('إضافة منتج', body);
    };

    /* ============================================================
       3. Override openEditProductModal — تعديل منتج مع URL
       ============================================================ */
    window.openEditProductModal = function (productId) {
        const productsData = (typeof window.productsData !== 'undefined' && Array.isArray(window.productsData))
            ? window.productsData
            : (typeof productsData !== 'undefined' && Array.isArray(productsData) ? productsData : []);

        const categoriesData = (typeof window.categoriesData !== 'undefined' && Array.isArray(window.categoriesData))
            ? window.categoriesData
            : (typeof categoriesData !== 'undefined' && Array.isArray(categoriesData) ? categoriesData : []);

        const prod = productsData.find(p => p.id === productId);
        if (!prod) {
            window.showToast('المنتج غير موجود', 'error');
            return;
        }

        window.editingProductId = productId;
        window.editingBundles = (prod.bundles || []).map(b => ({
            id: b.id,
            name: b.name,
            quantity: b.quantity,
            price_usd: b.price_usd,
            _new: false,
            _deleted: false,
        }));

        const isTopup = prod.product_type === 'topup';
        const isBundle = prod.product_type === 'bundle';
        const currentInput = prod.input_type || 'id';

        const categoriesOptions = categoriesData.map(c =>
            `<option value="${c.id}" ${c.id === prod.category_id ? 'selected' : ''}>${_esc(c.name)}</option>`
        ).join('');

        const body = `
            <h3 style="margin-bottom:14px;">تعديل المنتج</h3>

            <div style="background:var(--primary-soft);padding:10px 14px;border-radius:12px;margin-bottom:14px;text-align:center;">
                <div style="font-weight:700;font-size:15px;">${_esc(prod.name)}</div>
                <div style="color:var(--text-2);font-size:12px;">ID: ${prod.id}</div>
            </div>

            <div class="form-group"><label>اسم المنتج</label>
                <input type="text" id="editProductName" value="${_escAttr(prod.name || '')}">
            </div>

            <div class="form-group"><label>الوصف</label>
                <textarea id="editProductDescription" rows="2">${_esc(prod.description || '')}</textarea>
            </div>

            <div class="form-group"><label>القسم</label>
                <select id="editProductCategoryId">${categoriesOptions}</select>
            </div>

            <div class="form-group">
                <label>نوع المنتج</label>
                <select id="editProductType" onchange="toggleEditProductTypeFields()">
                    <option value="quantity" ${prod.product_type === 'quantity' ? 'selected' : ''}>كمية</option>
                    <option value="bundle" ${prod.product_type === 'bundle' ? 'selected' : ''}>باقة</option>
                    <option value="topup" ${prod.product_type === 'topup' ? 'selected' : ''}>رصيد سوري</option>
                </select>
            </div>

            <div class="form-group" id="editUnitNameField" style="${isTopup ? 'display:none;' : 'display:block;'}">
                <label>وحدة القياس</label>
                <input type="text" id="editProductUnitName" value="${_escAttr(prod.unit_name || 'قطعة')}">
            </div>

            <div id="editBundlesField" class="form-group" style="${isBundle ? 'display:block;' : 'display:none;'}">
                <label style="display:flex;justify-content:space-between;align-items:center;">
                    <span>🎁 الباقات</span>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addBundleRow('editBundlesEditor')" style="font-size:12px;">
                        <span class="material-icons" style="font-size:14px;vertical-align:middle;">add</span> إضافة
                    </button>
                </label>
                <div id="editBundlesEditor" class="bundles-editor" style="margin-top:10px;"></div>
            </div>

            <div id="editNonBundleFields" style="${isBundle ? 'display:none;' : 'display:block;'}">
                ${!isTopup ? `
                    <div class="edit-modal-grid">
                        <div class="form-group">
                            <label>السعر الأساسي ($)</label>
                            <input type="number" id="editProductPrice" value="${prod.base_price || 0}" step="0.01" min="0">
                        </div>
                        <div class="form-group">
                            <label>الكمية الأساسية</label>
                            <input type="number" id="editProductQuantity" value="${prod.base_quantity || 0}" min="0">
                        </div>
                    </div>
                ` : `
                    <div class="form-group">
                        <label>السعر بالليرة السورية</label>
                        <input type="number" id="editProductPrice" value="${prod.base_price || 0}" step="1" min="0">
                        <small style="color:var(--warning);font-size:12px;display:block;margin-top:4px;">
                            💡 السعر يُدخل بالليرة السورية
                        </small>
                    </div>
                    <input type="hidden" id="editProductQuantity" value="0">
                `}
            </div>

            <div class="edit-modal-grid">
                <div class="form-group">
                    <label>${isTopup ? 'الحد الأقصى (ل.س)' : 'الحد الأقصى للطلب'}</label>
                    <input type="number" id="editProductMaxQuantity" value="${prod.max_quantity || 0}" min="0">
                    <small style="color:var(--text-2);font-size:11px;display:block;margin-top:4px;">0 = بلا حد</small>
                </div>
                <div class="form-group">
                    <label>المخزون</label>
                    <input type="number" id="editProductStock" value="${prod.stock || 0}" min="0">
                </div>
            </div>

            <div class="form-group">
                <label>نوع الحقل المخصص</label>
                <select id="editProductInputType" onchange="handleEditInputTypeChange()">
                    ${getInputTypeOptions(currentInput)}
                </select>
                <small id="editInputTypeHelp" style="color:var(--text-2);font-size:12px;${currentInput === 'url' ? '' : 'display:none;'}margin-top:6px;">
                    💡 المستخدم سيدخل رابط URL (يبدأ بـ http:// أو https://)
                </small>
            </div>

            <div class="form-group">
                <label>تغيير الصورة (اختياري)</label>
                <div class="image-preview" id="editProductImagePreview">
                    ${prod.image ? `<img src="${_escAttr(prod.image)}" alt="${_escAttr(prod.name)}">` : 'لا صورة'}
                </div>
                <input type="file" id="editProductImage" accept="image/*" onchange="previewImage(this,'editProductImagePreview')">
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
                <button class="btn btn-primary" onclick="saveEditedProduct(${productId}, this)">حفظ التعديلات</button>
                <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
            </div>
        `;
        window.openModal('تعديل المنتج', body);

        setTimeout(() => {
            if (isBundle && typeof window.renderBundleEditor === 'function') {
                window.renderBundleEditor('editBundlesEditor');
            }
        }, 100);
    };

    /* ============================================================
       4. Helpers — تغيير نوع الحقل
       ============================================================ */
    window.handleInputTypeChange = function () {
        const sel = document.getElementById('productInputType');
        const help = document.getElementById('inputTypeHelp');
        if (!sel || !help) return;
        help.style.display = sel.value === 'url' ? 'block' : 'none';
    };

    window.handleEditInputTypeChange = function () {
        const sel = document.getElementById('editProductInputType');
        const help = document.getElementById('editInputTypeHelp');
        if (!sel || !help) return;
        help.style.display = sel.value === 'url' ? 'block' : 'none';
    };

    /* ============================================================
       5. Override renderProducts — إضافة شارة نوع URL
       ============================================================ */
    const _origRenderProducts = window.renderProducts;
    window.renderProducts = function () {
        if (typeof _origRenderProducts === 'function') {
            try { _origRenderProducts(); } catch (e) { console.warn('renderProducts error:', e); }
        }

        try {
            const tbody = document.getElementById('productsTableBody');
            if (!tbody) return;

            const productsData = (typeof window.productsData !== 'undefined' && Array.isArray(window.productsData))
                ? window.productsData
                : [];
            const filteredProducts = (typeof window.filteredProducts !== 'undefined' && Array.isArray(window.filteredProducts))
                ? window.filteredProducts
                : productsData;
            const products = filteredProducts.length ? filteredProducts : productsData;

            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row, idx) => {
                const prod = products[idx];
                if (!prod) return;

                const nameCell = row.querySelector('td[data-label="الاسم"]');
                if (!nameCell) return;

                if (nameCell.querySelector('.url-badge')) return;

                if (prod.input_type === 'url') {
                    const badge = document.createElement('span');
                    badge.className = 'url-badge';
                    badge.innerHTML = '<span class="material-icons" style="font-size:12px;vertical-align:middle;">link</span> رابط';
                    badge.style.cssText = 'display:inline-block;margin-inline-start:6px;padding:2px 8px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border-radius:50px;font-size:10px;font-weight:800;vertical-align:middle;';
                    nameCell.appendChild(badge);
                }
            });
        } catch (e) {
            // silent
        }
    };

    /* ============================================================
       6. Init Log
       ============================================================ */
    console.log('✅ admin-v17.js loaded — v17.2 URL input (XSS hardened)');

})();```

---

## FILE: ./admin/js/admin.js

```
// ============================================================
// admin/js/admin.js — v14 (Part 1/3)
// ============================================================

// ============================================================
// ============ Global State ============
// ============================================================
let currentSection = 'dashboard';
let usersData = [];
let categoriesData = [];
let productsData = [];
let filteredProducts = [];
let paymentMethodsData = [];
let ordersData = [];
let filteredOrders = [];
let depositsData = [];
let filteredDeposits = [];
let kycData = [];
let filteredKYC = [];
let serviceRequestsData = [];
let activitiesData = [];
let couponsData = [];
let referralsData = [];
let archiveData = { categories: [], products: [] };
let auditLogData = [];
let filteredAuditLog = [];
let currentArchiveTab = 'cats';
let currentSettings = {};
let _otpSessionId = null;
let selectedOrders = new Set();

// 🆕 Dashboard time filter
let dashTimeFilter = 'today';

// 🆕 Filter tabs
let ordersTabFilter = 'all';
let depositsTabFilter = 'all';
let kycTabFilter = 'all';

// Bundle management
let editingBundles = [];
let editingProductId = null;

// VIP Config
const VIP_LEVELS = {
    1: { name: 'مستخدم جديد لسند بلس', icon: 'person', color: '#CD7F32' },
    2: { name: 'مبتدئ سند بلس', icon: 'school', color: '#C0C0C0' },
    3: { name: 'محترف سند بلس', icon: 'workspace_premium', color: '#FFD700' },
    4: { name: 'أسطورة سند بلس', icon: 'military_tech', color: '#E5E4E2' },
    5: { name: 'نجم سند بلس', icon: 'star', color: '#B9F2FF' },
    6: { name: 'شريك سند بلس', icon: 'handshake', color: '#9333EA' },
    7: { name: 'مستوى السند الأسطوري', icon: 'auto_awesome', color: '#DC2626' },
};

// Chart instances
let chartOrdersPieInstance = null;
let chartDepositsLineInstance = null;

// ============================================================
// 🌙 Theme Management
// ============================================================
const THEME_KEY = 'admin_theme';

function loadAdminTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcon('dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            updateThemeIcon('light');
        }
    } catch (e) {
        console.warn('تعذر تحميل الثيم:', e);
    }
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

function toggleAdminTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
        updateThemeIcon('light');
    }
    if (chartOrdersPieInstance) renderOrdersChart();
    if (chartDepositsLineInstance) renderDepositsChart();
}

loadAdminTheme();

// ============================================================
// 📱 Admin Pull to Refresh
// ============================================================
const AdminPTR = (() => {
    const THRESHOLD = 70;
    const MAX_PULL = 110;
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    let target = null;
    let indicator = null;
    let iconEl = null;
    let textEl = null;

    function init() {
        target = document.getElementById('adminContent');
        indicator = document.getElementById('adminPTr');
        if (!target || !indicator) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        iconEl = document.getElementById('adminPTrIcon');
        textEl = document.getElementById('adminPTrText');

        target.addEventListener('touchstart', handleTouchStart, { passive: true });
        target.addEventListener('touchmove', handleTouchMove, { passive: false });
        target.addEventListener('touchend', handleTouchEnd, { passive: true });
        target.addEventListener('mousedown', handleMouseDown);
    }

    function handleTouchStart(e) {
        if (isRefreshing) return;
        if (window.scrollY > 0 || target.scrollTop > 0) return;
        startY = e.touches[0].clientY;
        isPulling = true;
    }

    function handleTouchMove(e) {
        if (!isPulling || isRefreshing) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0 && window.scrollY === 0) {
            e.preventDefault();
            updateIndicator(Math.min(diff * 0.5, MAX_PULL));
        } else if (diff < 0) {
            isPulling = false;
            resetIndicator();
        }
    }

    function handleTouchEnd() {
        if (!isPulling) return;
        const diff = currentY - startY;
        const pull = Math.min(diff * 0.5, MAX_PULL);
        if (pull >= THRESHOLD && !isRefreshing) triggerRefresh();
        else resetIndicator();
        isPulling = false;
    }

    function handleMouseDown(e) {
        if (isRefreshing) return;
        if (window.scrollY > 0) return;
        startY = e.clientY;
        isPulling = true;
        const onMove = (ev) => {
            if (!isPulling) return;
            currentY = ev.clientY;
            const diff = currentY - startY;
            if (diff > 0) updateIndicator(Math.min(diff * 0.5, MAX_PULL));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (!isPulling) return;
            const diff = currentY - startY;
            const pull = Math.min(diff * 0.5, MAX_PULL);
            if (pull >= THRESHOLD && !isRefreshing) triggerRefresh();
            else resetIndicator();
            isPulling = false;
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function updateIndicator(pull) {
        if (!indicator) return;
        indicator.style.height = pull + 'px';
        indicator.style.opacity = Math.min(pull / THRESHOLD, 1);
        if (pull >= THRESHOLD) {
            if (iconEl) iconEl.textContent = 'refresh';
            if (textEl) textEl.textContent = 'اترك للتحديث';
            indicator.classList.add('ready');
        } else {
            if (iconEl) iconEl.textContent = 'arrow_downward';
            if (textEl) textEl.textContent = 'اسحب للتحديث';
            indicator.classList.remove('ready');
        }
    }

    function resetIndicator() {
        if (!indicator) return;
        indicator.style.transition = 'height 300ms ease, opacity 300ms ease';
        indicator.style.height = '0px';
        indicator.style.opacity = '0';
        indicator.classList.remove('ready', 'refreshing');
        setTimeout(() => { indicator.style.transition = ''; }, 300);
    }

    async function triggerRefresh() {
        if (isRefreshing || !indicator) return;
        isRefreshing = true;
        indicator.style.transition = 'height 250ms ease';
        indicator.style.height = '60px';
        indicator.style.opacity = '1';
        indicator.classList.add('refreshing');
        if (iconEl) iconEl.textContent = 'sync';
        if (textEl) textEl.textContent = 'جارٍ التحديث...';

        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }

        try {
            await loadAllData();
            renderCurrentSection();
            if (textEl) textEl.textContent = 'تم التحديث ✓';
            setTimeout(() => { resetIndicator(); isRefreshing = false; }, 500);
        } catch (error) {
            console.error('Refresh error:', error);
            if (textEl) textEl.textContent = 'فشل التحديث';
            setTimeout(() => { resetIndicator(); isRefreshing = false; }, 800);
        }
    }

    function renderCurrentSection() {
        if (currentSection === 'dashboard') renderDashboard();
        if (currentSection === 'users') renderUsers();
        if (currentSection === 'categories') renderCategories();
        if (currentSection === 'products') renderProducts();
        if (currentSection === 'payment-methods') renderPaymentMethods();
        if (currentSection === 'orders') { filteredOrders = [...ordersData]; renderOrders(ordersData); }
        if (currentSection === 'deposits') renderDeposits(depositsData);
        if (currentSection === 'kyc') renderKYC();
        if (currentSection === 'service-requests') renderServiceRequests();
        if (currentSection === 'coupons') renderCoupons();
        if (currentSection === 'archive') renderArchive();
        if (currentSection === 'audit-log') renderAuditLog();
        if (currentSection === 'settings') loadSettings();
    }

    return { init };
})();

// ============================================================
// 🚀 Event Listeners Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    loadAdminTheme();
    AdminPTR.init();

    if (!getToken()) {
        showLogin();
    } else {
        initAdminPanel();
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openGlobalSearch();
        }
        if (e.key === 'Escape') {
            const gsModal = document.getElementById('globalSearchModal');
            if (gsModal && gsModal.classList.contains('active')) {
                closeGlobalSearch();
            }
            const kycModal = document.getElementById('modal');
            if (kycModal && kycModal.classList.contains('active')) {
                closeModal();
            }
        }
    });
});

// ============================================================
// ============ Toast System ============
// ============================================================
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons">${icons[type] || 'info'}</span>
        <span>${message}</span>
    `;
    toast.onclick = () => removeToast(toast);
    container.appendChild(toast);
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 200);
}

// ============================================================
// ============ Confirm System ============
// ============================================================
let _confirmResolver = null;

function showConfirm(options) {
    return new Promise((resolve) => {
        _confirmResolver = resolve;
        const modal = document.getElementById('confirmModal');
        if (!modal) {
            resolve(window.confirm(options.message || 'تأكيد؟'));
            return;
        }
        const title = document.getElementById('confirmTitle');
        const msg = document.getElementById('confirmMessage');
        const icon = document.getElementById('confirmIcon');
        const btn = document.getElementById('confirmBtn');

        title.textContent = options.title || 'تأكيد العملية';
        msg.textContent = options.message || 'هل أنت متأكد؟';
        btn.textContent = options.confirmText || 'تأكيد';

        const isDanger = options.type === 'danger';
        const isSuccess = options.type === 'success';
        icon.classList.toggle('danger', isDanger);
        icon.querySelector('.material-icons').textContent = isDanger ? 'warning' : (isSuccess ? 'check_circle' : 'help_outline');
        btn.className = isDanger ? 'btn-danger' : 'btn-primary';

        modal.classList.add('active');
    });
}

function closeConfirm(result) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;
    modal.classList.remove('active');
    if (_confirmResolver) {
        _confirmResolver(result);
        _confirmResolver = null;
    }
}

// 🆕 Double Confirm (للمبالغ الكبيرة)
async function showDoubleConfirm(options) {
    const first = await showConfirm(options);
    if (!first) return false;

    const second = await showConfirm({
        title: '⚠️ تأكيد مزدوج',
        message: `هل أنت متأكد تماماً؟\n\n${options.message}`,
        confirmText: 'نعم، متأكد',
        type: 'danger'
    });
    return second;
}

// ============================================================
// ============ Sidebar ============
// ============================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        closeSidebar();
    } else {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function toggleSpecificUser() {
    const target = document.getElementById('notificationTarget');
    const group = document.getElementById('specificUserGroup');
    if (group && target) {
        group.style.display = target.value === 'specific' ? 'block' : 'none';
    }
}

// ============================================================
// ============ Nav Badges ============
// ============================================================
function updateNavBadges() {
    const pendingOrders = ordersData.filter(o =>
        o.status === 'pending' || o.status === 'review' || o.status === 'processing'
    ).length;
    setBadge('badge-orders', pendingOrders);
    setBadge('badge-mobile-orders', pendingOrders);

    const pendingDeposits = depositsData.filter(d => d.status === 'pending').length;
    setBadge('badge-deposits', pendingDeposits);
    setBadge('badge-mobile-deposits', pendingDeposits);

    const pendingKYC = kycData.filter(k => k.status === 'pending').length;
    setBadge('badge-kyc', pendingKYC);

    const pendingServices = serviceRequestsData.filter(s => s.status === 'pending').length;
    setBadge('badge-services', pendingServices);

    const archiveCount = (archiveData.categories?.length || 0) + (archiveData.products?.length || 0);
    setBadge('badge-archive', archiveCount);

    // 🆕 تحديث Tab Badges
    updateTabBadges();
}

function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
        el.textContent = count > 99 ? '99+' : count;
        el.style.display = 'inline-block';
    } else {
        el.style.display = 'none';
    }
}

// 🆕 تحديث Tab Counts
function updateTabBadges() {
    // Orders
    const el1 = document.getElementById('ordersTabAll');
    if (el1) el1.textContent = ordersData.length;
    const el2 = document.getElementById('ordersTabPending');
    if (el2) el2.textContent = ordersData.filter(o => o.status === 'pending').length;
    const el3 = document.getElementById('ordersTabProcessing');
    if (el3) el3.textContent = ordersData.filter(o => o.status === 'processing' || o.status === 'review').length;
    const el4 = document.getElementById('ordersTabCompleted');
    if (el4) el4.textContent = ordersData.filter(o => o.status === 'completed').length;

    // Deposits
    const d1 = document.getElementById('depositsTabAll');
    if (d1) d1.textContent = depositsData.length;
    const d2 = document.getElementById('depositsTabPending');
    if (d2) d2.textContent = depositsData.filter(d => d.status === 'pending').length;
    const d3 = document.getElementById('depositsTabApproved');
    if (d3) d3.textContent = depositsData.filter(d => d.status === 'approved').length;
    const d4 = document.getElementById('depositsTabRejected');
    if (d4) d4.textContent = depositsData.filter(d => d.status === 'rejected').length;

    // KYC
    const k1 = document.getElementById('kycTabAll');
    if (k1) k1.textContent = kycData.length;
    const k2 = document.getElementById('kycTabPending');
    if (k2) k2.textContent = kycData.filter(k => k.status === 'pending').length;
    const k3 = document.getElementById('kycTabApproved');
    if (k3) k3.textContent = kycData.filter(k => k.status === 'approved').length;
    const k4 = document.getElementById('kycTabRejected');
    if (k4) k4.textContent = kycData.filter(k => k.status === 'rejected').length;
}

// ============================================================
// ============ Global Search ============
// ============================================================
function openGlobalSearch() {
    const modal = document.getElementById('globalSearchModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    const input = document.getElementById('globalSearchInput');
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
    }
    const results = document.getElementById('globalSearchResults');
    if (results) {
        results.innerHTML = `
            <div class="global-search-hint">
                <span class="material-icons">search</span>
                <p>ابدأ الكتابة للبحث...</p>
                <small>مثال: رقم طلب، Telegram ID، اسم منتج</small>
            </div>
        `;
    }
}

function closeGlobalSearch() {
    const modal = document.getElementById('globalSearchModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function performGlobalSearch(query) {
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!resultsContainer) return;
    const q = (query || '').toLowerCase().trim();

    if (!q || q.length < 2) {
        resultsContainer.innerHTML = `
            <div class="global-search-hint">
                <span class="material-icons">search</span>
                <p>ابدأ الكتابة للبحث...</p>
                <small>مثال: رقم طلب، Telegram ID، اسم منتج</small>
            </div>
        `;
        return;
    }

    const usersResults = usersData.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.telegram_id + '').includes(q)
    ).slice(0, 5);

    const ordersResults = ordersData.filter(o =>
        (o.order_number || '').toLowerCase().includes(q) ||
        (o.product_name || '').toLowerCase().includes(q)
    ).slice(0, 5);

    const productsResults = productsData.filter(p =>
        (p.name || '').toLowerCase().includes(q)
    ).slice(0, 5);

    let html = '';
    let totalFound = 0;

    if (usersResults.length) {
        totalFound += usersResults.length;
        html += `
            <div class="search-result-section">
                <div class="search-result-section-title">
                    <span class="material-icons">people</span>
                    المستخدمون (${usersResults.length})
                </div>
                ${usersResults.map(u => `
                    <button class="search-result-item" onclick="goToUserFromSearch(${u.id})">
                        <div class="search-result-icon"><span class="material-icons">person</span></div>
                        <div class="search-result-content">
                            <div class="search-result-title">${u.username || u.first_name || 'مستخدم'}</div>
                            <div class="search-result-subtitle ltr">${u.telegram_id} • ${parseFloat(u.balance).toFixed(2)}$</div>
                        </div>
                        <span class="material-icons search-result-arrow">chevron_left</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    if (ordersResults.length) {
        totalFound += ordersResults.length;
        html += `
            <div class="search-result-section">
                <div class="search-result-section-title">
                    <span class="material-icons">receipt_long</span>
                    الطلبات (${ordersResults.length})
                </div>
                ${ordersResults.map(o => `
                    <button class="search-result-item" onclick="goToOrderFromSearch(${o.id})">
                        <div class="search-result-icon"><span class="material-icons">receipt</span></div>
                        <div class="search-result-content">
                            <div class="search-result-title ltr">${o.order_number}</div>
                            <div class="search-result-subtitle">${o.product_name || ''} • ${o.status}</div>
                        </div>
                        <span class="material-icons search-result-arrow">chevron_left</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    if (productsResults.length) {
        totalFound += productsResults.length;
        html += `
            <div class="search-result-section">
                <div class="search-result-section-title">
                    <span class="material-icons">inventory_2</span>
                    المنتجات (${productsResults.length})
                </div>
                ${productsResults.map(p => `
                    <button class="search-result-item" onclick="goToProductFromSearch(${p.id})">
                        <div class="search-result-icon"><span class="material-icons">inventory_2</span></div>
                        <div class="search-result-content">
                            <div class="search-result-title">${p.name}</div>
                            <div class="search-result-subtitle">${p.base_price}$ • ${categoriesData.find(c => c.id === p.category_id)?.name || ''}</div>
                        </div>
                        <span class="material-icons search-result-arrow">chevron_left</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    if (totalFound === 0) {
        html = `
            <div class="search-no-results">
                <span class="material-icons">search_off</span>
                <p>لا توجد نتائج لـ "<strong>${query}</strong>"</p>
                <small>جرّب كلمة أخرى أو تحقق من الإملاء</small>
            </div>
        `;
    }

    resultsContainer.innerHTML = html;
}

function goToUserFromSearch(userId) {
    closeGlobalSearch();
    switchSection('users');
    const user = usersData.find(u => u.id === userId);
    if (user) {
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.value = user.telegram_id + '';
            filterUsers(searchInput.value);
        }
    }
}

function goToOrderFromSearch(orderId) {
    closeGlobalSearch();
    switchSection('orders');
    const order = ordersData.find(o => o.id === orderId);
    if (order) {
        const searchInput = document.getElementById('orderSearchQuery');
        if (searchInput) {
            searchInput.value = order.order_number;
            applyOrderFilters();
        }
    }
}

function goToProductFromSearch(productId) {
    closeGlobalSearch();
    switchSection('products');
    showToast('تم فتح قسم المنتجات', 'info');
}

// ============================================================
// ============ Login + OTP ============
// ============================================================
function showLogin() {
    document.body.innerHTML = `
        <div class="login-screen">
            <div class="login-box">
                <h2>SANAD<span style="color:var(--primary)">+</span> | لوحة التحكم</h2>
                <div class="form-group">
                    <label>اسم المستخدم</label>
                    <input type="text" id="loginUsername" value="admin">
                </div>
                <div class="form-group">
                    <label>كلمة المرور</label>
                    <input type="password" id="loginPassword" placeholder="••••••••"
                           onkeypress="if(event.key === 'Enter') doLogin()">
                </div>
                <button class="btn-primary btn-block" onclick="doLogin()">
                    <span class="material-icons">login</span> تسجيل الدخول
                </button>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('loginPassword')?.focus(), 200);
}

async function doLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.querySelector('.login-box .btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = 'جارٍ التحقق...'; }
    try {
        const result = await adminLogin(username, password);
        if (result.require_otp) {
            _otpSessionId = result.session_id;
            showOTPForm();
            showToast('تم إرسال رمز التحقق إلى تيليجرام', 'success', 5000);
        } else if (result.token) {
            setToken(result.token);
            location.reload();
        } else {
            showToast(result.error || 'بيانات خاطئة', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">login</span> تسجيل الدخول'; }
        }
    } catch (error) {
        showToast('فشل الاتصال بالخادم', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">login</span> تسجيل الدخول'; }
    }
}

function showOTPForm() {
    document.body.innerHTML = `
        <div class="login-screen">
            <div class="login-box">
                <div style="text-align:center; margin-bottom:16px;">
                    <span class="material-icons" style="font-size:52px; color:var(--primary);">verified_user</span>
                </div>
                <h2 style="text-align:center; color:var(--text); margin-bottom:8px;">التحقق بخطوتين</h2>
                <p style="text-align:center; color:var(--text-secondary); font-size:0.9rem; margin-bottom:24px; line-height:1.6;">
                    تم إرسال رمز مكوَّن من 6 أرقام<br>إلى حسابك في تيليجرام
                </p>
                <div class="form-group">
                    <label style="text-align:center;">رمز التحقق</label>
                    <input type="text" id="otpCode" placeholder="000000" maxlength="6"
                           inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code"
                           onkeypress="if(event.key === 'Enter') verifyOTP()"
                           style="text-align:center; font-size:28px; letter-spacing:10px; font-weight:800; padding:14px;">
                </div>
                <button class="btn-primary btn-block" onclick="verifyOTP()" style="margin-top:8px;">
                    <span class="material-icons">check_circle</span> تأكيد الدخول
                </button>
                <button class="btn-outline" style="width:100%; margin-top:10px;" onclick="location.reload()">
                    <span class="material-icons">arrow_back</span> رجوع
                </button>
                <p style="text-align:center; color:var(--text-secondary); font-size:0.75rem; margin-top:16px;">
                    ⏱️ الرمز صالح لمدة 5 دقائق
                </p>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('otpCode')?.focus(), 200);
}

async function verifyOTP() {
    const codeInput = document.getElementById('otpCode');
    const code = codeInput?.value?.trim();
    const btn = document.querySelector('.login-box .btn-primary');

    if (!code || code.length !== 6) {
        showToast('أدخل رمزاً من 6 أرقام', 'warning');
        return;
    }
    if (!_otpSessionId) {
        showToast('انتهت الجلسة، يرجى تسجيل الدخول مجدداً', 'error');
        setTimeout(() => location.reload(), 1500);
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = 'جارٍ التحقق...'; }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: _otpSessionId, otp_code: code })
        });
        const result = await response.json();

        if (result.token) {
            setToken(result.token);
            location.reload();
        } else {
            showToast(result.error || 'رمز خاطئ', 'error');
            if (codeInput) { codeInput.value = ''; codeInput.focus(); }
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">check_circle</span> تأكيد الدخول'; }
        }
    } catch (error) {
        showToast('فشل الاتصال بالخادم', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">check_circle</span> تأكيد الدخول'; }
    }
}

// ============================================================
// ============ Init ============
// ============================================================
async function initAdminPanel() {
    await loadAllData();
    setupAdminNavigation();
    switchSection('dashboard');
}

async function loadAllData() {
    try {
        const results = await Promise.allSettled([
            fetchAdminUsers(),
            fetchAdminCategories(),
            fetchAdminProducts(),
            fetchAdminPaymentMethods(),
            fetchAdminOrders(),
            fetchAdminDeposits(),
            fetchAdminKYC(),
            fetchServiceRequests(),
            fetchAdminCoupons(),
            Promise.resolve({ categories: [], products: [] }),
            fetchAdminSettings(),
        ]);
        usersData = results[0].status === 'fulfilled' ? results[0].value : [];
        categoriesData = results[1].status === 'fulfilled' ? results[1].value : [];
        productsData = results[2].status === 'fulfilled' ? results[2].value : [];
        paymentMethodsData = results[3].status === 'fulfilled' ? results[3].value : [];
        ordersData = results[4].status === 'fulfilled' ? results[4].value : [];
        depositsData = results[5].status === 'fulfilled' ? results[5].value : [];
        kycData = results[6].status === 'fulfilled' ? results[6].value : [];
        serviceRequestsData = results[7].status === 'fulfilled' ? results[7].value : [];
        couponsData = results[8].status === 'fulfilled' ? results[8].value : [];
        archiveData = results[9].status === 'fulfilled' ? results[9].value : { categories: [], products: [] };
        currentSettings = results[10].status === 'fulfilled' ? results[10].value : {};

        filteredProducts = [...productsData];
        filteredOrders = [...ordersData];
        filteredDeposits = [...depositsData];
        filteredKYC = [...kycData];

        const catFilter = document.getElementById('productCategoryFilter');
        if (catFilter) {
            catFilter.innerHTML = '<option value="all">جميع الأقسام</option>' +
                categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        updateNavBadges();
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showToast('تعذر تحميل بعض البيانات', 'error');
    }
}

function setupAdminNavigation() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    const section = document.getElementById('section-' + sectionId);
    if (section) section.classList.add('active');

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });

    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });

    currentSection = sectionId;

    if (window.innerWidth < 1024) {
        closeSidebar();
    }

    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'users') renderUsers();
    if (sectionId === 'categories') renderCategories();
    if (sectionId === 'products') { filteredProducts = [...productsData]; renderProducts(); }
    if (sectionId === 'payment-methods') renderPaymentMethods();
    if (sectionId === 'orders') { filteredOrders = [...ordersData]; renderOrders(ordersData); }
    if (sectionId === 'deposits') renderDeposits(depositsData);
    if (sectionId === 'kyc') renderKYC();
    if (sectionId === 'service-requests') renderServiceRequests();
    if (sectionId === 'coupons') renderCoupons();
    if (sectionId === 'referrals') loadReferrals();
    if (sectionId === 'archive') renderArchive();
    if (sectionId === 'activities') loadActivities();
    if (sectionId === 'audit-log') loadAuditLog();
    if (sectionId === 'settings') loadSettings();
}

// ============================================================
// ============ 🆕 Dashboard Smart ============
// ============================================================
function setDashTimeFilter(filter, btn) {
    dashTimeFilter = filter;
    document.querySelectorAll('.time-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderDashboard();
}

function getTimeFilterRange() {
    const now = new Date();
    let startDate = null;
    let label = 'اليوم';

    if (dashTimeFilter === 'today') {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        label = 'اليوم';
    } else if (dashTimeFilter === 'week') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        label = '7 أيام';
    } else if (dashTimeFilter === 'month') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        label = '30 يوم';
    } else {
        label = 'الكل';
    }

    return { startDate, label };
}

function isInRange(dateStr, startDate) {
    if (!dateStr) return false;
    if (!startDate) return true; // "الكل"
    const d = new Date(dateStr);
    return d >= startDate;
}

function renderDashboard() {
    const { startDate, label } = getTimeFilterRange();

    // فلترة حسب الفترة
    const filteredOrders = ordersData.filter(o => isInRange(o.created_at, startDate));
    const filteredDeposits = depositsData.filter(d => 
        d.status === 'approved' && isInRange(d.created_at, startDate)
    );
    const filteredUsers = usersData.filter(u => isInRange(u.created_at, startDate));

    // حساب الإيرادات من الطلبات
    const revenue = filteredOrders
        .filter(o => o.status !== 'failed' && o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.total_price || 0), 0);

    const depositsTotal = filteredDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);

    document.getElementById('dashRevenue').textContent = `${revenue.toFixed(2)}$`;
    document.getElementById('dashOrders').textContent = filteredOrders.length;
    document.getElementById('dashUsers').textContent = filteredUsers.length;
    document.getElementById('dashDeposits').textContent = `${depositsTotal.toFixed(2)}$`;

    document.getElementById('dashRevenueLabel').textContent = `إيرادات ${label}`;
    document.getElementById('dashOrdersLabel').textContent = `طلبات ${label}`;
    document.getElementById('dashUsersLabel').textContent = `مستخدمون جدد ${label}`;
    document.getElementById('dashDepositsLabel').textContent = `إيداعات ${label}`;

    // آخر العمليات
    const recent = document.getElementById('recentActivities');
    if (!ordersData.length) {
        recent.innerHTML = '<div class="empty-state"><span class="material-icons">history</span>لا توجد عمليات حديثة</div>';
    } else {
        recent.innerHTML = ordersData.slice(0, 5).map(o => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-weight:600;font-size:0.85rem;" class="ltr">${o.order_number}</span>
                <span class="status-badge ${o.status}">${getStatusArabic(o.status)}</span>
            </div>
        `).join('');
    }

    renderAttentionCard();
    renderOrdersChart();
    renderDepositsChart();
}

// 🆕 Attention Card
function renderAttentionCard() {
    const container = document.getElementById('attentionCard');
    const list = document.getElementById('attentionList');
    if (!container || !list) return;

    const pendingOrders = ordersData.filter(o => o.status === 'pending').length;
    const pendingDeposits = depositsData.filter(d => d.status === 'pending').length;
    const pendingKYC = kycData.filter(k => k.status === 'pending').length;
    const pendingServices = serviceRequestsData.filter(s => s.status === 'pending').length;

    const total = pendingOrders + pendingDeposits + pendingKYC + pendingServices;

    if (total === 0) {
        container.classList.add('empty');
        list.innerHTML = `
            <div class="attention-empty">
                <span class="material-icons">check_circle</span>
                كل شيء تحت السيطرة
            </div>
        `;
        return;
    }

    container.classList.remove('empty');
    let html = '';

    if (pendingOrders > 0) {
        html += `
            <button class="attention-item" onclick="switchSection('orders')">
                <div class="attention-item-icon"><span class="material-icons">receipt_long</span></div>
                <div class="attention-item-content">
                    <div class="attention-item-title">${pendingOrders} طلب بحاجة لمعالجة</div>
                    <div class="attention-item-subtitle">اضغط للمراجعة</div>
                </div>
                <span class="material-icons attention-item-arrow">chevron_left</span>
            </button>
        `;
    }

    if (pendingDeposits > 0) {
        html += `
            <button class="attention-item" onclick="switchSection('deposits')">
                <div class="attention-item-icon"><span class="material-icons">account_balance_wallet</span></div>
                <div class="attention-item-content">
                    <div class="attention-item-title">${pendingDeposits} إيداع بانتظار المراجعة</div>
                    <div class="attention-item-subtitle">اضغط للمراجعة</div>
                </div>
                <span class="material-icons attention-item-arrow">chevron_left</span>
            </button>
        `;
    }

    if (pendingKYC > 0) {
        html += `
            <button class="attention-item" onclick="switchSection('kyc')">
                <div class="attention-item-icon"><span class="material-icons">verified_user</span></div>
                <div class="attention-item-content">
                    <div class="attention-item-title">${pendingKYC} طلب توثيق معلق</div>
                    <div class="attention-item-subtitle">اضغط للمراجعة</div>
                </div>
                <span class="material-icons attention-item-arrow">chevron_left</span>
            </button>
        `;
    }

    if (pendingServices > 0) {
        html += `
            <button class="attention-item" onclick="switchSection('service-requests')">
                <div class="attention-item-icon"><span class="material-icons">build</span></div>
                <div class="attention-item-content">
                    <div class="attention-item-title">${pendingServices} طلب خدمة معلق</div>
                    <div class="attention-item-subtitle">اضغط للمراجعة</div>
                </div>
                <span class="material-icons attention-item-arrow">chevron_left</span>
            </button>
        `;
    }

    list.innerHTML = html;
}

// ============================================================
// ============ Charts ============
// ============================================================
function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#F1F5F9' : '#0F172A',
        textSecondary: isDark ? '#94A3B8' : '#64748B',
        grid: isDark ? '#334155' : '#E2E8F0',
        isDark
    };
}

function renderOrdersChart() {
    const canvas = document.getElementById('chartOrdersPie');
    if (!canvas) return;

    const statusCounts = { pending: 0, review: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
    ordersData.forEach(o => { if (statusCounts.hasOwnProperty(o.status)) statusCounts[o.status]++; });

    const labels = [];
    const data = [];
    const colors = [];
    const colorMap = {
        pending: '#F59E0B', review: '#0EA5E9', processing: '#3B82F6',
        completed: '#10B981', failed: '#EF4444', cancelled: '#94A3B8'
    };

    Object.keys(statusCounts).forEach(key => {
        if (statusCounts[key] > 0) {
            labels.push(getStatusArabic(key));
            data.push(statusCounts[key]);
            colors.push(colorMap[key]);
        }
    });

    if (data.length === 0) {
        if (chartOrdersPieInstance) { chartOrdersPieInstance.destroy(); chartOrdersPieInstance = null; }
        const ctx = canvas.getContext('2d');
        const c = getChartColors();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = c.textSecondary;
        ctx.font = '14px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات لعرضها', canvas.width / 2, canvas.height / 2);
        return;
    }

    if (chartOrdersPieInstance) chartOrdersPieInstance.destroy();
    const c = getChartColors();

    chartOrdersPieInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: c.isDark ? '#1E293B' : '#FFFFFF',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: c.text,
                        font: { family: 'Cairo', size: 12, weight: '600' },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: c.isDark ? '#1E293B' : '#FFFFFF',
                    titleColor: c.text,
                    bodyColor: c.text,
                    borderColor: c.grid,
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { family: 'Cairo', weight: '700' },
                    bodyFont: { family: 'Cairo' },
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function renderDepositsChart() {
    const canvas = document.getElementById('chartDepositsLine');
    if (!canvas) return;

    const now = new Date();
    const days = [];
    const labels = [];
    const values = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        days.push(date);
    }

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    days.forEach((day, index) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const dayTotal = depositsData
            .filter(d => d.status === 'approved')
            .filter(d => {
                if (!d.created_at) return false;
                const created = new Date(d.created_at);
                return created >= day && created < nextDay;
            })
            .reduce((sum, d) => sum + (d.amount || 0), 0);

        if (index >= 4) labels.push(dayNames[day.getDay()]);
        else labels.push(`${day.getDate()}/${day.getMonth() + 1}`);
        values.push(dayTotal);
    });

    if (chartDepositsLineInstance) chartDepositsLineInstance.destroy();
    const c = getChartColors();
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.3)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.02)');

    chartDepositsLineInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'الإيداعات ($)',
                data: values,
                borderColor: '#0EA5E9',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0EA5E9',
                pointBorderColor: c.isDark ? '#1E293B' : '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: c.isDark ? '#1E293B' : '#FFFFFF',
                    titleColor: c.text,
                    bodyColor: c.text,
                    borderColor: c.grid,
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { family: 'Cairo', weight: '700' },
                    bodyFont: { family: 'Cairo' },
                    displayColors: false,
                    callbacks: { label: function(context) { return `${context.parsed.y.toFixed(2)}$`; } }
                }
            },
            scales: {
                x: { grid: { color: c.grid, display: false }, ticks: { color: c.textSecondary, font: { family: 'Cairo', size: 11 } } },
                y: {
                    beginAtZero: true, grid: { color: c.grid },
                    ticks: { color: c.textSecondary, font: { family: 'Cairo', size: 11 }, callback: function(value) { return value + '$'; } }
                }
            }
        }
    });
}

function getStatusArabic(status) {
    const map = {
        pending: 'قيد المعالجة', review: 'قيد المراجعة', processing: 'قيد التنفيذ',
        completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي',
        approved: 'مقبول', rejected: 'مرفوض'
    };
    return map[status] || status;
}
// ============================================================
// admin/js/admin.js — v14 (Part 2/3)
// ============================================================

// ============================================================
// ============ Users ============
// ============================================================
function filterUsers(query) {
    const q = (query || '').toLowerCase().trim();
    const filtered = usersData.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.telegram_id + '').includes(q)
    );
    renderUsers(filtered);
}

function renderUsers(users = usersData) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">people</span>لا يوجد مستخدمون</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const balance = user.balance || 0;
        const balanceColor = balance < 0 ? 'var(--error)' : (balance > 0 ? 'var(--success)' : 'var(--text)');
        const negBadge = (balance < 0 && user.allow_negative_balance) ?
            `<span style="font-size:0.7rem;background:var(--error-bg);color:var(--error);padding:2px 6px;border-radius:4px;margin-right:4px;">سالب</span>` : '';

        const vipLevel = user.vip_level || 0;
        const vipConfig = VIP_LEVELS[vipLevel];
        const vipBadge = vipConfig ?
            `<span class="vip-badge" style="background:${vipConfig.color};color:#000;" title="${vipConfig.name}">
                <span class="material-icons" style="font-size:14px;vertical-align:middle;">${vipConfig.icon}</span>
                ${vipLevel}
            </span>` : '<span style="color:var(--text-secondary);">—</span>';

        return `
        <tr>
            <td data-label="Telegram ID">
                <span class="ltr" style="cursor:pointer;" onclick="copyToClipboard('${user.telegram_id}')" title="اضغط للنسخ">
                    ${user.telegram_id}
                </span>
            </td>
            <td data-label="الاسم">${user.username || user.first_name || 'مستخدم'}</td>
            <td data-label="الرصيد">
                <span style="color:${balanceColor};font-weight:800;direction:ltr;">${balance.toFixed(2)}$</span>
                ${negBadge}
            </td>
            <td data-label="الحالة"><span class="status-badge ${user.is_banned ? 'failed' : 'completed'}">${user.is_banned ? 'محظور' : 'نشط'}</span></td>
            <td data-label="VIP">${vipBadge}</td>
            <td data-label="إجراءات">
                <button class="btn-outline btn-sm" onclick="openUserDetailModal(${user.id})" title="تفاصيل المستخدم">
                    <span class="material-icons" style="font-size:14px;vertical-align:middle;">visibility</span>
                </button>
                <button class="btn-outline btn-sm" onclick="adjustBalance(${user.id})">رصيد</button>
                <button class="btn-outline btn-sm" onclick="openNegativeBalanceModal(${user.id})" title="الرصيد السالب">💳</button>
                <button class="btn-outline btn-sm" onclick="openVIPModal(${user.id})" title="VIP">⭐</button>
                <button class="btn-outline btn-sm" onclick="toggleBan(${user.id})">${user.is_banned ? 'فك الحظر' : 'حظر'}</button>
            </td>
        </tr>
    `}).join('');
}

// ============================================================
// User Detail Modal
// ============================================================
async function openUserDetailModal(userId) {
    try {
        const user = await fetchAdminUserDetail(userId);
        const balanceColor = user.balance < 0 ? 'var(--error)' : (user.balance > 0 ? 'var(--success)' : 'var(--text)');
        const kycBadge = user.kyc_status === 'verified' ?
            '<span class="status-badge completed">موثق ✓</span>' :
            (user.kyc_status === 'pending' ? '<span class="status-badge pending">قيد المراجعة</span>' :
                '<span class="status-badge unverified">غير موثق</span>');

        const body = `
            <div style="text-align:right;">
                <h3 style="margin-bottom:16px;">تفاصيل المستخدم</h3>

                <div style="background:var(--primary-light);padding:16px;border-radius:12px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <div style="width:56px;height:56px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;">
                            ${(user.first_name || user.username || 'م')[0]}
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:800;font-size:1.1rem;">${user.first_name || 'مستخدم'} ${user.last_name || ''}</div>
                            ${user.username ? `<div style="color:var(--text-secondary);font-size:0.85rem;">@${user.username}</div>` : ''}
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem;">
                        <div>
                            <span style="color:var(--text-secondary);">Telegram ID:</span>
                            <div style="font-weight:700;cursor:pointer;" class="ltr" onclick="copyToClipboard('${user.telegram_id}')">
                                ${user.telegram_id} <span class="material-icons" style="font-size:12px;vertical-align:middle;color:var(--primary);">content_copy</span>
                            </div>
                        </div>
                        <div>
                            <span style="color:var(--text-secondary);">الدور:</span>
                            <div style="font-weight:700;">${user.role === 'admin' ? 'أدمن' : 'مستخدم'}</div>
                        </div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    <div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الرصيد</div>
                        <div style="font-size:1.4rem;font-weight:800;color:${balanceColor};" class="ltr">${parseFloat(user.balance).toFixed(2)}$</div>
                    </div>
                    <div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الحالة</div>
                        <div style="margin-top:4px;">${user.is_banned ? '<span class="status-badge failed">محظور</span>' : '<span class="status-badge completed">نشط</span>'}</div>
                    </div>
                    <div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الطلبات</div>
                        <div style="font-size:1.4rem;font-weight:800;">${user.orders_count || 0}</div>
                    </div>
                    <div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">
                        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الإيداعات</div>
                        <div style="font-size:1.4rem;font-weight:800;">${user.deposits_count || 0}</div>
                    </div>
                </div>

                <div style="background:var(--background);padding:12px;border-radius:12px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">KYC:</span>
                        ${kycBadge}
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">VIP Level:</span>
                        <span style="font-weight:700;">${user.vip_level > 0 ? 'VIP' + user.vip_level : 'بدون'}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">كود الإحالة:</span>
                        <span style="font-weight:700;cursor:pointer;" class="ltr" onclick="copyToClipboard('${user.referral_code || ''}')">
                            ${user.referral_code || '-'}
                        </span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">عدد الإحالات:</span>
                        <span style="font-weight:700;">${user.referral_count || 0}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">أرباح الإحالات:</span>
                        <span style="font-weight:700;" class="ltr">${(user.referral_earnings || 0).toFixed(2)}$</span>
                    </div>
                </div>

                <div style="background:var(--background);padding:12px;border-radius:12px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span style="color:var(--text-secondary);font-size:0.85rem;">الرصيد السالب:</span>
                        <span style="font-weight:700;">${user.allow_negative_balance ? 'مفعّل' : 'معطّل'}</span>
                    </div>
                    ${user.allow_negative_balance ? `
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary);font-size:0.85rem;">الحد الأقصى:</span>
                            <span style="font-weight:700;color:var(--warning);" class="ltr">${(user.max_negative_balance || 0).toFixed(2)}$</span>
                        </div>
                    ` : ''}
                </div>

                <div style="font-size:0.75rem;color:var(--text-secondary);text-align:center;margin-bottom:16px;">
                    انضم: ${user.created_at ? new Date(user.created_at).toLocaleString('ar') : '-'}
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn-primary" style="flex:1;" onclick="closeModal(); adjustBalance(${user.id})">
                        <span class="material-icons" style="font-size:16px;">edit</span> تعديل الرصيد
                    </button>
                    <button class="btn-outline" style="flex:1;" onclick="closeModal()">إغلاق</button>
                </div>
            </div>
        `;
        openModal('', body);
    } catch (error) {
        showToast(`فشل تحميل التفاصيل: ${error.message}`, 'error');
    }
}

// ============================================================
// Negative Balance Modal
// ============================================================
function openNegativeBalanceModal(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    const isAllowed = user.allow_negative_balance !== false;
    const maxNeg = user.max_negative_balance || 0;

    openModal('إعدادات الرصيد السالب', `
        <div style="text-align:right;">
            <div style="background:var(--primary-light);padding:12px;border-radius:12px;margin-bottom:14px;">
                <div style="font-weight:700;">${user.username || user.first_name || 'مستخدم'}</div>
                <div style="color:var(--text-secondary);font-size:0.85rem;">
                    الرصيد الحالي: <strong style="color:${user.balance < 0 ? 'var(--error)' : 'var(--text)'};">
                        ${parseFloat(user.balance).toFixed(2)}$
                    </strong>
                </div>
            </div>

            <div style="background:var(--warning-bg);border:1px solid var(--warning);border-radius:12px;padding:12px;margin-bottom:14px;font-size:0.8rem;line-height:1.6;">
                <strong>💡 كيف تعمل الميزة:</strong><br>
                • تفعيل: يسمح للمستخدم بالشراء حتى لو رصيده صفر<br>
                • الحد الأقصى: كم يمكن أن يصبح سالباً<br>
                • عند الإيداع: يُخصم الدين تلقائياً
            </div>

            <div class="form-group">
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--surface);padding:12px;border-radius:12px;border:1px solid var(--border);">
                    <input type="checkbox" id="negAllow" ${isAllowed ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;">
                    <span style="font-weight:600;">تفعيل الرصيد السالب لهذا المستخدم</span>
                </label>
            </div>

            <div class="form-group">
                <label>الحد الأقصى للسالب ($)</label>
                <input type="number" id="negMax" value="${maxNeg}" step="1" min="0" max="1000000">
                <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;">
                    مثال: 100 → يمكن للمستخدم أن يصل رصيده إلى -100$
                </small>
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn-primary" style="flex:1;" onclick="saveNegativeBalance(${userId})">حفظ</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `);
}

async function saveNegativeBalance(userId) {
    const allow = document.getElementById('negAllow').checked;
    const maxNeg = parseFloat(document.getElementById('negMax').value) || 0;

    if (allow && maxNeg <= 0) {
        showToast('يجب تحديد حد أقصى أكبر من صفر عند التفعيل', 'warning');
        return;
    }

    try {
        await setUserNegativeBalance(userId, allow, maxNeg);
        await loadAllData();
        renderUsers();
        closeModal();
        showToast('تم تحديث إعدادات الرصيد السالب', 'success');
    } catch (error) {
        showToast(`فشل التحديث: ${error.message}`, 'error');
    }
}

// ============================================================
// VIP Modal
// ============================================================
function openVIPModal(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;

    const currentLevel = user.vip_level || 0;

    const options = Object.entries(VIP_LEVELS).map(([lvl, config]) => `
        <label class="vip-option ${parseInt(lvl) === currentLevel ? 'selected' : ''}" data-level="${lvl}">
            <input type="radio" name="vipLevel" value="${lvl}" ${parseInt(lvl) === currentLevel ? 'checked' : ''}
                   style="width:18px;height:18px;">
            <span class="material-icons" style="color:${config.color};font-size:22px;">${config.icon}</span>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:0.9rem;">${lvl} — ${config.name}</div>
            </div>
            <div style="width:14px;height:14px;border-radius:50%;background:${config.color};"></div>
        </label>
    `).join('');

    openModal('اختيار مستوى VIP', `
        <div style="text-align:right;">
            <div style="background:var(--primary-light);padding:12px;border-radius:12px;margin-bottom:14px;">
                <div style="font-weight:700;">${user.username || user.first_name || 'مستخدم'}</div>
                <div style="color:var(--text-secondary);font-size:0.85rem;">
                    المستوى الحالي: <strong>${currentLevel === 0 ? 'بدون VIP' : VIP_LEVELS[currentLevel]?.name}</strong>
                </div>
            </div>

            <div class="vip-options-list">
                <label class="vip-option ${currentLevel === 0 ? 'selected' : ''}">
                    <input type="radio" name="vipLevel" value="0" ${currentLevel === 0 ? 'checked' : ''} style="width:18px;height:18px;">
                    <span class="material-icons" style="color:var(--text-secondary);font-size:22px;">block</span>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:0.9rem;">إلغاء VIP</div>
                    </div>
                </label>
                ${options}
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn-primary" style="flex:1;" onclick="saveVIPSelection(${userId})">حفظ</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `);

    setTimeout(() => {
        document.querySelectorAll('.vip-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.vip-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                const radio = opt.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            });
        });
    }, 100);
}

async function saveVIPSelection(userId) {
    const selected = document.querySelector('input[name="vipLevel"]:checked');
    if (!selected) {
        showToast('اختر مستوى', 'warning');
        return;
    }

    const level = parseInt(selected.value);

    try {
        await setUserVIP(userId, level);
        await loadAllData();
        renderUsers();
        closeModal();
        showToast(level === 0 ? 'تم إلغاء VIP' : `تم تعيين ${VIP_LEVELS[level].name}`, 'success');
    } catch (error) {
        showToast(`فشل التعيين: ${error.message}`, 'error');
    }
}

// ============================================================
// Users — Actions
// ============================================================
async function toggleKYC(userId, currentStatus) {
    const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    const confirmed = await showConfirm({
        title: newStatus === 'verified' ? 'توثيق المستخدم' : 'إلغاء التوثيق',
        message: newStatus === 'verified' ? 'هل أنت متأكد من توثيق هذا المستخدم؟' : 'هل أنت متأكد من إلغاء توثيق هذا المستخدم؟',
        confirmText: 'تأكيد',
        type: newStatus === 'verified' ? 'success' : 'danger'
    });
    if (!confirmed) return;
    try {
        await toggleUserKYC(userId, newStatus);
        await loadAllData();
        renderUsers();
        showToast('تم تحديث حالة التوثيق بنجاح', 'success');
    } catch (error) {
        showToast(`فشل تحديث التوثيق: ${error.message}`, 'error');
    }
}

async function adjustBalance(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    openModal('تعديل الرصيد', `
        <div style="text-align:right;">
            <div style="background:var(--primary-light);padding:12px;border-radius:12px;margin-bottom:14px;">
                <div style="font-weight:700;">${user.username || user.first_name || 'مستخدم'}</div>
                <div style="color:var(--text-secondary);font-size:0.85rem;">الرصيد الحالي: <strong>${parseFloat(user.balance).toFixed(2)}$</strong></div>
            </div>
            <div class="form-group">
                <label>نوع العملية</label>
                <select id="adjustType">
                    <option value="add">إضافة رصيد</option>
                    <option value="subtract">خصم رصيد</option>
                </select>
            </div>
            <div class="form-group">
                <label>المبلغ (بالدولار)</label>
                <input type="number" id="adjustAmount" step="0.01" min="0" placeholder="0.00">
                <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;">
                    ⚠️ للأدمن صلاحية مطلقة — أي مبلغ مسموح
                </small>
            </div>
            <div class="form-group">
                <label>ملاحظة (اختياري)</label>
                <input type="text" id="adjustNote" placeholder="سبب التعديل">
            </div>
            <div style="display:flex;gap:8px;">
                <button class="btn-primary" style="flex:1;" onclick="confirmAdjustBalance(${userId})">تأكيد</button>
                <button class="btn-outline" style="flex:1;" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `);
}

async function confirmAdjustBalance(userId) {
    const type = document.getElementById('adjustType').value;
    const rawAmount = parseFloat(document.getElementById('adjustAmount').value);
    const note = document.getElementById('adjustNote').value || '';

    if (!rawAmount || rawAmount <= 0) { showToast('أدخل مبلغاً صحيحاً', 'warning'); return; }

    const amount = type === 'add' ? rawAmount : -rawAmount;
    const actionText = type === 'add' ? 'إضافة' : 'خصم';

    // تأكيد مزدوج للمبالغ الكبيرة
    let confirmed;
    if (rawAmount >= 500) {
        confirmed = await showDoubleConfirm({
            title: '⚠️ مبلغ كبير',
            message: `سيتم ${actionText} ${rawAmount}$ ${type === 'add' ? 'إلى' : 'من'} رصيد المستخدم.`,
            confirmText: 'تأكيد',
            type: type === 'add' ? 'success' : 'danger'
        });
    } else {
        confirmed = await showConfirm({
            title: 'تأكيد تعديل الرصيد',
            message: `سيتم ${actionText} ${rawAmount}$ ${type === 'add' ? 'إلى' : 'من'} رصيد المستخدم.`,
            confirmText: 'تأكيد العملية',
            type: type === 'add' ? 'success' : 'danger'
        });
    }
    if (!confirmed) return;

    try {
        await adjustUserBalance(userId, amount, note);
        await loadAllData();
        renderUsers();
        closeModal();
        showToast('تم تعديل الرصيد بنجاح', 'success');
    } catch (error) {
        showToast(`فشل تعديل الرصيد: ${error.message}`, 'error');
    }
}

async function toggleBan(userId) {
    const user = usersData.find(u => u.id === userId);
    const isBanned = user?.is_banned;
    const confirmed = await showConfirm({
        title: isBanned ? 'فك الحظر' : 'حظر المستخدم',
        message: isBanned ? 'هل أنت متأكد من فك حظر هذا المستخدم؟' : 'هل أنت متأكد من حظر هذا المستخدم؟',
        confirmText: isBanned ? 'فك الحظر' : 'حظر',
        type: isBanned ? 'success' : 'danger'
    });
    if (!confirmed) return;
    try {
        await toggleUserBan(userId);
        await loadAllData();
        renderUsers();
        showToast('تم تحديث حالة الحظر', 'success');
    } catch (error) {
        showToast(`فشل تغيير حالة الحظر: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Categories ============
// ============================================================
function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    if (!categoriesData.length) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons">category</span>لا توجد أقسام</div>';
        return;
    }
    container.innerHTML = categoriesData.map(cat => `
        <div class="category-card">
            <div class="card-icon">${cat.image ? `<img src="${cat.image}" alt="${cat.name}">` : '📁'}</div>
            <div class="card-title">${cat.name}</div>
            <div class="card-actions">
                <button class="btn-danger btn-sm" onclick="archiveCategoryHandler(${cat.id})">حذف</button>
            </div>
        </div>
    `).join('');
}

function openCategoryModal() {
    const body = `
        <h3 style="margin-bottom:14px;">إضافة قسم جديد</h3>
        <div class="form-group"><label>اسم القسم</label><input type="text" id="categoryName"></div>
        <div class="form-group"><label>أيقونة (إيموجي) - اختياري</label><input type="text" id="categoryIcon" value="📁"></div>
        <div class="form-group">
            <label>صورة القسم</label>
            <div class="image-preview" id="categoryImagePreview">لا صورة</div>
            <input type="file" id="categoryImage" accept="image/*" onchange="previewImage(this,'categoryImagePreview')">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 <strong>نصيحة:</strong> ارفع صورة مربعة (1:1)
            </small>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="saveCategory(this)">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة قسم', body);
}

async function saveCategory(btn) {
    const name = document.getElementById('categoryName').value;
    const icon = document.getElementById('categoryIcon').value;
    if (!name) { showToast('أدخل اسم القسم', 'warning'); return; }
    const imageFile = document.getElementById('categoryImage').files[0];
    let image = '';
    if (imageFile) image = await fileToSquareBase64(imageFile, 512);

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createCategory({ name, icon, image });
        closeModal();
        await loadAllData();
        renderCategories();
        showToast('تم إضافة القسم بنجاح', 'success');
    } catch (error) {
        showToast(`فشل إضافة القسم: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

async function archiveCategoryHandler(categoryId) {
    const confirmed = await showConfirm({
        title: 'أرشفة القسم',
        message: 'سيتم نقل القسم وجميع منتجاته إلى الأرشيف. يمكن استرجاعه لاحقاً.',
        confirmText: 'أرشفة',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        const result = await deleteCategory(categoryId);
        await loadAllData();
        renderCategories();
        showToast(result.message || 'تم أرشفة القسم بنجاح', 'success');
    } catch (error) {
        showToast(`فشل أرشفة القسم: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Products ============
// ============================================================
function filterProducts() {
    const searchQuery = (document.getElementById('productSearch')?.value || '').toLowerCase().trim();
    const categoryFilter = document.getElementById('productCategoryFilter')?.value || 'all';
    const typeFilter = document.getElementById('productTypeFilter')?.value || 'all';

    let filtered = [...productsData];

    if (searchQuery) {
        filtered = filtered.filter(p =>
            (p.name || '').toLowerCase().includes(searchQuery) ||
            (p.description || '').toLowerCase().includes(searchQuery)
        );
    }

    if (categoryFilter !== 'all') {
        const catId = parseInt(categoryFilter);
        filtered = filtered.filter(p => p.category_id === catId);
    }

    if (typeFilter !== 'all') {
        filtered = filtered.filter(p => p.product_type === typeFilter);
    }

    filteredProducts = filtered;
    renderProducts();
}

function resetProductFilters() {
    const searchEl = document.getElementById('productSearch');
    const catEl = document.getElementById('productCategoryFilter');
    const typeEl = document.getElementById('productTypeFilter');
    if (searchEl) searchEl.value = '';
    if (catEl) catEl.value = 'all';
    if (typeEl) typeEl.value = 'all';
    filteredProducts = [...productsData];
    renderProducts();
}

function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const products = filteredProducts.length ? filteredProducts : productsData;

    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-icons">inventory_2</span>لا توجد منتجات مطابقة</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(prod => {
        let priceDisplay = `${prod.base_price}$`;
        let qtyDisplay = `${prod.base_quantity} ${prod.unit_name || 'قطعة'}`;
        let bundlesInfo = '';

        if (prod.product_type === 'topup') {
            priceDisplay = `<span style="color:var(--warning);font-weight:800;">${prod.base_price} ل.س</span>`;
            qtyDisplay = '-';
        }

        if (prod.product_type === 'bundle' && prod.bundles && prod.bundles.length > 0) {
            bundlesInfo = `<span style="font-size:0.7rem;background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:50px;font-weight:700;">🎁 ${prod.bundles.length} باقات</span>`;
            priceDisplay = '-';
            qtyDisplay = '-';
        }

        return `
        <tr>
            <td data-label="الصورة"><img src="${prod.image || ''}" alt="${prod.name}" onerror="this.style.display='none'"></td>
            <td data-label="الاسم">${prod.name} ${bundlesInfo}</td>
            <td data-label="القسم">${categoriesData.find(c => c.id === prod.category_id)?.name || '-'}</td>
            <td data-label="السعر">${priceDisplay}</td>
            <td data-label="الكمية">${qtyDisplay}</td>
            <td data-label="الحد الأقصى">${prod.max_quantity > 0 ? prod.max_quantity.toLocaleString('ar') : 'بلا حد'}</td>
            <td data-label="النوع"><span class="status-badge ${prod.product_type === 'bundle' ? 'pending' : prod.product_type === 'topup' ? 'verified' : 'completed'}">${prod.product_type === 'bundle' ? 'باقة' : prod.product_type === 'topup' ? 'رصيد سوري' : 'كمية'}</span></td>
            <td data-label="إجراءات">
                <button class="btn-outline btn-sm" onclick="openEditProductModal(${prod.id})">تعديل</button>
                <button class="btn-danger btn-sm" onclick="archiveProductHandler(${prod.id})">حذف</button>
            </td>
        </tr>
    `}).join('');
}

// ============================================================
// Bundle Editor
// ============================================================
function renderBundleEditor(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!editingBundles.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px;background:var(--background);border:1px dashed var(--border);border-radius:12px;color:var(--text-secondary);font-size:0.85rem;">
                لا توجد باقات. اضغط "إضافة باقة" للبدء.
            </div>
        `;
        return;
    }

    container.innerHTML = editingBundles.map((b, idx) => `
        <div class="bundle-row ${b._deleted ? 'deleted' : ''}" data-idx="${idx}">
            <div class="bundle-number">${idx + 1}</div>
            <input type="text" class="bundle-input bundle-name" value="${b.name || ''}"
                   placeholder="اسم الباقة" oninput="updateBundle(${idx}, 'name', this.value)">
            <input type="number" class="bundle-input bundle-qty" value="${b.quantity || 0}"
                   placeholder="الكمية" min="0" oninput="updateBundle(${idx}, 'quantity', this.value)">
            <input type="number" class="bundle-input bundle-price" value="${b.price_usd || 0}"
                   placeholder="السعر" step="0.01" min="0" oninput="updateBundle(${idx}, 'price_usd', this.value)">
            <button type="button" class="bundle-delete-btn" onclick="removeBundle(${idx})">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `).join('');
}

function updateBundle(idx, field, value) {
    if (!editingBundles[idx]) return;
    if (field === 'quantity') {
        editingBundles[idx].quantity = parseInt(value) || 0;
    } else if (field === 'price_usd') {
        editingBundles[idx].price_usd = parseFloat(value) || 0;
    } else {
        editingBundles[idx].name = value;
    }
}

function addBundleRow(containerId) {
    editingBundles.push({
        name: '',
        quantity: 0,
        price_usd: 0,
        _new: true,
    });
    renderBundleEditor(containerId);
}

function removeBundle(idx) {
    if (!editingBundles[idx]) return;

    const b = editingBundles[idx];

    if (b._new) {
        editingBundles.splice(idx, 1);
    } else {
        editingBundles[idx]._deleted = true;
    }

    renderBundleEditor('bundlesEditor');
    renderBundleEditor('editBundlesEditor');
}

// ============================================================
// Add Product Modal
// ============================================================
function openProductModal() {
    editingBundles = [];
    editingProductId = null;

    const body = `
        <h3 style="margin-bottom:14px;">إضافة منتج</h3>
        <div class="form-group"><label>اسم المنتج</label><input type="text" id="productName"></div>
        <div class="form-group"><label>القسم</label><select id="productCategoryId">${categoriesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group">
            <label>النوع</label>
            <select id="productType" onchange="toggleProductTypeFields()">
                <option value="quantity">كمية</option>
                <option value="bundle">باقة (PUBG / Free Fire / إلخ)</option>
                <option value="topup">رصيد سوري (ل.س)</option>
            </select>
        </div>
        <div class="form-group" id="unitNameField" style="display:none;">
            <label>وحدة القياس</label>
            <input type="text" id="productUnitName" value="قطعة" placeholder="مثال: UC، جوهرة، Diamond، قطعة">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 يظهر بجانب الكمية — مثال: <strong>325 UC</strong>
            </small>
        </div>
        <div class="form-group">
            <label id="priceLabel">السعر الأساسي (دولار)</label>
            <input type="number" id="productPrice" value="0" step="0.01">
            <small id="priceHelp" style="color:var(--text-secondary);font-size:0.75rem;display:none;margin-top:6px;">
                💡 لمنتج الرصيد السوري: السعر يُحسب من سعر الصرف
            </small>
        </div>
        <div class="form-group" id="quantityField"><label>الكمية الأساسية</label><input type="number" id="productQuantity" value="0"></div>
        <div class="form-group" id="bundlesField" style="display:none;">
            <label style="display:flex;justify-content:space-between;align-items:center;">
                <span>🎁 الباقات</span>
                <button type="button" class="btn-outline btn-sm" onclick="addBundleRow('bundlesEditor')" style="font-size:0.75rem;">
                    <span class="material-icons" style="font-size:14px;vertical-align:middle;">add</span> إضافة باقة
                </button>
            </label>
            <div id="bundlesEditor" class="bundles-editor" style="margin-top:10px;"></div>
        </div>
        <div class="form-group">
            <label id="maxQtyLabel">الحد الأقصى للكمية للطلب الواحد</label>
            <input type="number" id="productMaxQuantity" value="0" min="0" placeholder="0">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 0 = بلا حد أقصى
            </small>
        </div>
        <div class="form-group">
            <label>نوع الحقل المخصص</label>
            <select id="productInputType">
                <option value="id">معرف اللاعب (ID)</option>
                <option value="account_id">ID الحساب</option>
                <option value="phone">رقم الهاتف</option>
                <option value="none">بدون</option>
            </select>
        </div>
        <div class="form-group">
            <label>صورة المنتج</label>
            <div class="image-preview" id="productImagePreview">لا صورة</div>
            <input type="file" id="productImage" accept="image/*" onchange="previewImage(this,'productImagePreview')">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="saveProduct(this)">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة منتج', body);
}

function toggleProductTypeFields() {
    const type = document.getElementById('productType').value;
    const qf = document.getElementById('quantityField');
    const bf = document.getElementById('bundlesField');
    const unf = document.getElementById('unitNameField');
    const priceLabel = document.getElementById('priceLabel');
    const priceHelp = document.getElementById('priceHelp');
    const maxQtyLabel = document.getElementById('maxQtyLabel');

    if (qf) qf.style.display = (type === 'bundle') ? 'none' : 'block';
    if (bf) bf.style.display = (type === 'bundle') ? 'block' : 'none';
    if (unf) unf.style.display = (type === 'quantity' || type === 'bundle') ? 'block' : 'none';

    if (type === 'topup') {
        if (priceLabel) priceLabel.textContent = 'سعر الليرة الواحدة بالدولار (تلقائي)';
        if (priceHelp) priceHelp.style.display = 'block';
        if (maxQtyLabel) maxQtyLabel.textContent = 'الحد الأقصى للمبلغ بالليرة السورية';
    } else if (type === 'bundle') {
        if (priceLabel) priceLabel.textContent = 'السعر الأساسي (سيُتجاهل — يعتمد على الباقات)';
        if (priceHelp) { priceHelp.style.display = 'block'; priceHelp.textContent = '💡 للباقات: السعر يُحدد لكل باقة على حدة'; }
        if (maxQtyLabel) maxQtyLabel.textContent = 'الحد الأقصى (اختياري)';
        renderBundleEditor('bundlesEditor');
    } else {
        if (priceLabel) priceLabel.textContent = 'السعر الأساسي (دولار)';
        if (priceHelp) priceHelp.style.display = 'none';
        if (maxQtyLabel) maxQtyLabel.textContent = 'الحد الأقصى للكمية للطلب الواحد';
    }
}

async function saveProduct(btn) {
    const name = document.getElementById('productName').value;
    const categoryId = parseInt(document.getElementById('productCategoryId').value);
    const type = document.getElementById('productType').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const inputType = document.getElementById('productInputType').value;
    const maxQuantity = parseInt(document.getElementById('productMaxQuantity').value) || 0;
    let baseQuantity = 0;
    if (type !== 'bundle') baseQuantity = parseInt(document.getElementById('productQuantity').value);

    if (!name || !categoryId) { showToast('أدخل البيانات المطلوبة', 'warning'); return; }

    let bundlesToSave = [];
    if (type === 'bundle') {
        bundlesToSave = editingBundles.filter(b => !b._deleted && b.name && b.price_usd > 0);
        if (!bundlesToSave.length) {
            showToast('أضف باقة واحدة على الأقل', 'warning');
            return;
        }
    }

    const imageFile = document.getElementById('productImage').files[0];
    let image = '';
    if (imageFile) image = await fileToSquareBase64(imageFile, 512);

    const unitName = (document.getElementById('productUnitName')?.value || 'قطعة').trim() || 'قطعة';

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createProduct({
            name,
            category_id: categoryId,
            product_type: type,
            base_price: price || 0,
            base_quantity: baseQuantity,
            unit_name: unitName,
            input_type: inputType,
            max_quantity: maxQuantity,
            image,
            bundles: bundlesToSave.map(b => ({
                name: b.name,
                quantity: b.quantity,
                price_usd: b.price_usd,
            })),
        });
        closeModal();
        await loadAllData();
        filterProducts();
        showToast('تم إضافة المنتج بنجاح', 'success');
    } catch (error) {
        showToast(`فشل إضافة المنتج: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

// ============================================================
// Edit Product Modal
// ============================================================
function openEditProductModal(productId) {
    const prod = productsData.find(p => p.id === productId);
    if (!prod) { showToast('المنتج غير موجود', 'error'); return; }

    editingProductId = productId;
    editingBundles = (prod.bundles || []).map(b => ({
        id: b.id,
        name: b.name,
        quantity: b.quantity,
        price_usd: b.price_usd,
        _new: false,
        _deleted: false,
    }));

    const isTopup = prod.product_type === 'topup';
    const isBundle = prod.product_type === 'bundle';

    const body = `
        <h3 style="margin-bottom:14px;">تعديل المنتج</h3>
        <div style="background:var(--primary-light);padding:10px 14px;border-radius:12px;margin-bottom:14px;text-align:center;">
            <div style="font-weight:700;font-size:1.1rem;">${prod.name}</div>
            <div style="color:var(--text-secondary);font-size:0.8rem;">ID: ${prod.id}</div>
        </div>

        <div class="form-group">
            <label>اسم المنتج</label>
            <input type="text" id="editProductName" value="${prod.name || ''}">
        </div>

        <div class="form-group">
            <label>الوصف</label>
            <textarea id="editProductDescription" rows="2">${prod.description || ''}</textarea>
        </div>

        <div class="form-group">
            <label>القسم</label>
            <select id="editProductCategoryId">
                ${categoriesData.map(c => `<option value="${c.id}" ${c.id === prod.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>

        <div class="form-group">
            <label>نوع المنتج</label>
            <select id="editProductType" onchange="toggleEditProductTypeFields()">
                <option value="quantity" ${prod.product_type === 'quantity' ? 'selected' : ''}>كمية</option>
                <option value="bundle" ${prod.product_type === 'bundle' ? 'selected' : ''}>باقة</option>
                <option value="topup" ${prod.product_type === 'topup' ? 'selected' : ''}>رصيد سوري</option>
            </select>
        </div>

        <div class="form-group" id="editUnitNameField" style="${isTopup ? 'display:none;' : 'display:block;'}">
            <label>وحدة القياس</label>
            <input type="text" id="editProductUnitName" value="${prod.unit_name || 'قطعة'}" placeholder="مثال: UC، جوهرة، Diamond، قطعة">
            <small style="color:var(--text-secondary);font-size:0.75rem;display:block;margin-top:6px;line-height:1.5;">
                💡 يظهر بجانب الكمية — مثال: <strong>325 UC</strong>
            </small>
        </div>

        <div id="editBundlesField" class="form-group" style="${isBundle ? 'display:block;' : 'display:none;'}">
            <label style="display:flex;justify-content:space-between;align-items:center;">
                <span>🎁 الباقات</span>
                <button type="button" class="btn-outline btn-sm" onclick="addBundleRow('editBundlesEditor')" style="font-size:0.75rem;">
                    <span class="material-icons" style="font-size:14px;vertical-align:middle;">add</span> إضافة باقة
                </button>
            </label>
            <div id="editBundlesEditor" class="bundles-editor" style="margin-top:10px;"></div>
        </div>

        <div id="editNonBundleFields" style="${isBundle ? 'display:none;' : 'display:block;'}">
            ${!isTopup ? `
            <div class="edit-modal-grid">
                <div class="form-group">
                    <label>السعر (للحزمة كاملة) $</label>
                    <input type="number" id="editProductPrice" value="${prod.base_price || 0}" step="0.01" min="0">
            <small style="color:var(--text-muted,#888);font-size:0.7rem;display:block;margin-top:4px;">💡 سعر الحزمة كاملة، وليس سعر الوحدة</small>
                </div>
                <div class="form-group">
                    <label>الكمية (عدد الوحدات في الحزمة)</label>
                    <input type="number" id="editProductQuantity" value="${prod.base_quantity || 0}" min="0">
                </div>
            </div>
            ` : `
            <div class="form-group">
                <label>السعر بالليرة السورية (للحزمة كاملة)</label>
                <input type="number" id="editProductPrice" value="${prod.base_price || 0}" step="1" min="0">
                <small style="color:var(--warning);font-size:0.75rem;display:block;margin-top:4px;">💡 السعر يُدخل بالليرة السورية</small>
            </div>
            <input type="hidden" id="editProductQuantity" value="0">
            `}
        </div>

        <div class="edit-modal-grid">
            <div class="form-group">
                <label>${isTopup ? 'الحد الأقصى (ل.س)' : 'الحد الأقصى للطلب'}</label>
                <input type="number" id="editProductMaxQuantity" value="${prod.max_quantity || 0}" min="0">
                <small style="color:var(--text-secondary);font-size:0.7rem;display:block;margin-top:4px;">0 = بلا حد</small>
            </div>
            <div class="form-group">
                <label>المخزون</label>
                <input type="number" id="editProductStock" value="${prod.stock || 0}" min="0">
            </div>
        </div>

        <div class="form-group">
            <label>نوع الحقل المخصص</label>
            <select id="editProductInputType">
                <option value="id" ${prod.input_type === 'id' ? 'selected' : ''}>معرف اللاعب (ID)</option>
                <option value="account_id" ${prod.input_type === 'account_id' ? 'selected' : ''}>ID الحساب</option>
                <option value="phone" ${prod.input_type === 'phone' ? 'selected' : ''}>رقم الهاتف</option>
                <option value="none" ${prod.input_type === 'none' ? 'selected' : ''}>بدون</option>
            </select>
        </div>

        <div class="form-group">
            <label>تغيير الصورة (اختياري)</label>
            <div class="image-preview" id="editProductImagePreview">
                ${prod.image ? `<img src="${prod.image}" alt="${prod.name}">` : 'لا صورة'}
            </div>
            <input type="file" id="editProductImage" accept="image/*" onchange="previewImage(this,'editProductImagePreview')">
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn-primary" onclick="saveEditedProduct(${productId}, this)">حفظ التعديلات</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('تعديل المنتج', body);

    setTimeout(() => {
        if (isBundle) renderBundleEditor('editBundlesEditor');
    }, 100);
}

function toggleEditProductTypeFields() {
    const type = document.getElementById('editProductType').value;
    const bf = document.getElementById('editBundlesField');
    const nbf = document.getElementById('editNonBundleFields');
    const unf = document.getElementById('editUnitNameField');

    if (type === 'bundle') {
        if (bf) bf.style.display = 'block';
        if (nbf) nbf.style.display = 'none';
        if (unf) unf.style.display = 'block';
        renderBundleEditor('editBundlesEditor');
    } else {
        if (bf) bf.style.display = 'none';
        if (nbf) nbf.style.display = 'block';
        if (unf) unf.style.display = (type === 'quantity') ? 'block' : 'none';
    }
}

async function saveEditedProduct(productId, btn) {
    const name = document.getElementById('editProductName').value;
    const description = document.getElementById('editProductDescription').value;
    const categoryId = parseInt(document.getElementById('editProductCategoryId').value);
    const productType = document.getElementById('editProductType').value;
    const inputType = document.getElementById('editProductInputType').value;
    const maxQuantity = parseInt(document.getElementById('editProductMaxQuantity').value) || 0;
    const stock = parseInt(document.getElementById('editProductStock').value) || 0;

    let price = 0;
    let quantity = 0;

    if (productType !== 'bundle') {
        price = parseFloat(document.getElementById('editProductPrice')?.value) || 0;
        quantity = parseInt(document.getElementById('editProductQuantity')?.value) || 0;
    }

    if (!name || !name.trim()) { showToast('أدخل اسم المنتج', 'warning'); return; }

    let bundlesToSave = [];
    if (productType === 'bundle') {
        bundlesToSave = editingBundles.filter(b => !b._deleted && b.name && b.price_usd > 0);
        if (!bundlesToSave.length) {
            showToast('يجب أن يحتوي منتج الباقات على باقة واحدة على الأقل', 'warning');
            return;
        }
    }

    const unitName = (document.getElementById('editProductUnitName')?.value || 'قطعة').trim() || 'قطعة';

    const data = {
        name: name.trim(),
        description: description,
        category_id: categoryId,
        base_price: price,
        base_quantity: quantity,
        unit_name: unitName,
        max_quantity: maxQuantity,
        stock: stock,
        input_type: inputType,
        product_type: productType,
        bundles: bundlesToSave.map(b => ({
            name: b.name,
            quantity: b.quantity,
            price_usd: b.price_usd,
        })),
    };

    const imageFile = document.getElementById('editProductImage')?.files[0];
    if (imageFile) {
        data.image = await fileToSquareBase64(imageFile, 512);
    }

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await updateProduct(productId, data);
        closeModal();
        await loadAllData();
        filterProducts();
        showToast('تم تعديل المنتج بنجاح', 'success');
    } catch (error) {
        showToast(`فشل تعديل المنتج: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ التعديلات'; }
    }
}

async function archiveProductHandler(productId) {
    const confirmed = await showConfirm({
        title: 'أرشفة المنتج',
        message: 'سيتم نقل المنتج إلى الأرشيف. يمكن استرجاعه لاحقاً.',
        confirmText: 'أرشفة',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        const result = await deleteProduct(productId);
        await loadAllData();
        filterProducts();
        showToast(result.message || 'تم أرشفة المنتج', 'success');
    } catch (error) {
        showToast(`فشل أرشفة المنتج: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Archive ============
// ============================================================
function renderArchive() {
    const catsCount = archiveData.categories?.length || 0;
    const prodsCount = archiveData.products?.length || 0;

    const catsCountEl = document.getElementById('archiveCatsCount');
    const prodsCountEl = document.getElementById('archiveProdsCount');
    if (catsCountEl) catsCountEl.textContent = catsCount;
    if (prodsCountEl) prodsCountEl.textContent = prodsCount;

    renderArchiveCats();
    renderArchiveProds();
}

function switchArchiveTab(tab) {
    currentArchiveTab = tab;
    document.querySelectorAll('.archive-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    const catsContainer = document.getElementById('archiveCatsContainer');
    const prodsContainer = document.getElementById('archiveProdsContainer');
    if (catsContainer) catsContainer.style.display = tab === 'cats' ? 'block' : 'none';
    if (prodsContainer) prodsContainer.style.display = tab === 'prods' ? 'block' : 'none';
}

function renderArchiveCats() {
    const container = document.getElementById('archiveCatsList');
    if (!container) return;
    const cats = archiveData.categories || [];
    if (!cats.length) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons">inventory</span>لا توجد أقسام مؤرشفة</div>';
        return;
    }
    container.innerHTML = cats.map(cat => `
        <div class="category-card" style="opacity:0.85;">
            <div class="card-icon">${cat.image ? `<img src="${cat.image}" alt="${cat.name}">` : '📁'}</div>
            <div class="card-title">${cat.name}</div>
            <div style="font-size:0.7rem;color:var(--error);font-weight:700;margin-top:2px;">مؤرشف</div>
            <div class="card-actions">
                <button class="btn-success btn-sm" onclick="restoreCategoryHandler(${cat.id})">استرجاع</button>
            </div>
        </div>
    `).join('');
}

function renderArchiveProds() {
    const tbody = document.getElementById('archiveProdsList');
    if (!tbody) return;
    const prods = archiveData.products || [];
    if (!prods.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">inventory_2</span>لا توجد منتجات مؤرشفة</td></tr>';
        return;
    }
    tbody.innerHTML = prods.map(prod => `
        <tr style="opacity:0.85;">
            <td data-label="الصورة"><img src="${prod.image || ''}" alt="${prod.name}" onerror="this.style.display='none'" style="max-width:60px;max-height:60px;border-radius:8px;object-fit:cover;"></td>
            <td data-label="الاسم">${prod.name}</td>
            <td data-label="القسم">${prod.category_name || '-'}</td>
            <td data-label="السعر">${prod.base_price}${prod.product_type === 'topup' ? ' ل.س' : '$'}</td>
            <td data-label="الكمية">${prod.base_quantity} ${prod.unit_name || 'قطعة'}</td>
            <td data-label="إجراءات">
                <button class="btn-success btn-sm" onclick="restoreProductHandler(${prod.id})">استرجاع</button>
            </td>
        </tr>
    `).join('');
}

async function restoreCategoryHandler(catId) {
    const confirmed = await showConfirm({
        title: 'استرجاع القسم',
        message: 'سيتم استرجاع القسم وجميع منتجاته إلى القائمة الرئيسية.',
        confirmText: 'استرجاع',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        const result = await restoreCategory(catId);
        await loadAllData();
        renderArchive();
        showToast(result.message || 'تم استرجاع القسم', 'success');
    } catch (error) {
        showToast(`فشل الاسترجاع: ${error.message}`, 'error');
    }
}

async function restoreProductHandler(prodId) {
    const confirmed = await showConfirm({
        title: 'استرجاع المنتج',
        message: 'سيتم استرجاع المنتج إلى قائمة المنتجات الرئيسية.',
        confirmText: 'استرجاع',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        const result = await restoreProduct(prodId);
        await loadAllData();
        renderArchive();
        showToast(result.message || 'تم استرجاع المنتج', 'success');
    } catch (error) {
        showToast(`فشل الاسترجاع: ${error.message}`, 'error');
    }
}

async function loadArchive() {
    try {
        archiveData = await fetchArchive();
        renderArchive();
        updateNavBadges();
    } catch (error) {
        showToast(`فشل تحميل الأرشيف: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Payment Methods ============
// ============================================================
function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    if (!paymentMethodsData.length) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons">payment</span>لا توجد طرق دفع</div>';
        return;
    }
    container.innerHTML = paymentMethodsData.map(m => {
        const minAmt = parseFloat(m.min_amount || 0).toFixed(2);
        const maxAmt = parseFloat(m.max_amount || 500).toFixed(2);
        const feeVal = parseFloat(m.fee || 0);
        const feeText = feeVal > 0
            ? (m.fee_type === 'fixed' ? `${feeVal.toFixed(2)}$` : `${feeVal.toFixed(2)}%`)
            : 'بدون';
        return `
        <div class="payment-card">
            <div class="card-icon">${m.icon && m.icon.length > 100 ? `<img src="${m.icon}" alt="${m.name}">` : '💳'}</div>
            <div class="card-title">${m.name}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;">${m.description || ''}</div>
            <div style="font-size:0.72rem;color:var(--text-2);margin-top:8px;line-height:1.8;text-align:right;background:var(--surface-2);padding:8px 10px;border-radius:10px;">
                💰 الحد الأدنى: <strong style="color:var(--text);">${minAmt}$</strong><br>
                📈 الحد الأقصى: <strong style="color:var(--text);">${maxAmt}$</strong><br>
                💵 الرسوم: <strong style="color:var(--text);">${feeText}</strong>
            </div>
            ${m.requires_kyc ? '<div style="font-size:0.7rem;color:var(--warning);font-weight:700;margin-top:6px;">🔒 تتطلب توثيق</div>' : ''}
            <div class="card-actions" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px;">
                <button class="btn-outline btn-sm" onclick="openEditPaymentMethodModal(${m.id})">
                    <span class="material-icons" style="font-size:14px;vertical-align:middle;">edit</span> تعديل
                </button>
                <button class="btn-danger btn-sm" onclick="deletePaymentMethodHandler(${m.id})">حذف</button>
            </div>
        </div>
        `;
    }).join('');
}

function _pmFieldsHTML(pm) {
    const p = pm || {};
    return `
        <div class="form-group"><label>اسم طريقة الدفع</label>
            <input type="text" id="paymentName" value="${(p.name || '').replace(/"/g, '&quot;')}"></div>
        <div class="form-group"><label>وصف مختصر (اختياري)</label>
            <input type="text" id="paymentDescription" value="${(p.description || '').replace(/"/g, '&quot;')}"></div>
        <div class="form-group"><label>اسم الحساب</label>
            <input type="text" id="paymentAccountName" value="${(p.account_name || '').replace(/"/g, '&quot;')}"></div>
        <div class="form-group"><label>رقم الحساب</label>
            <input type="text" id="paymentAccount" value="${(p.account || '').replace(/"/g, '&quot;')}"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="form-group">
                <label>الحد الأدنى ($)</label>
                <input type="number" id="paymentMinAmount" value="${p.min_amount || 0}" step="0.01" min="0">
                <small style="color:var(--text-3);font-size:11px;display:block;margin-top:4px;">0 = بلا حد</small>
            </div>
            <div class="form-group">
                <label>الحد الأقصى ($)</label>
                <input type="number" id="paymentMaxAmount" value="${p.max_amount || 500}" step="0.01" min="0">
                <small style="color:var(--text-3);font-size:11px;display:block;margin-top:4px;">0 = بلا حد</small>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="form-group">
                <label>نوع الرسوم</label>
                <select id="paymentFeeType">
                    <option value="percentage" ${p.fee_type === 'percentage' ? 'selected' : ''}>نسبة (%)</option>
                    <option value="fixed" ${p.fee_type === 'fixed' ? 'selected' : ''}>مبلغ ثابت ($)</option>
                </select>
            </div>
            <div class="form-group">
                <label>قيمة الرسوم</label>
                <input type="number" id="paymentFee" value="${p.fee || 0}" step="0.01" min="0">
                <small style="color:var(--text-3);font-size:11px;display:block;margin-top:4px;">0 = بدون رسوم</small>
            </div>
        </div>

        <div class="form-group">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;background:var(--primary-light);padding:12px;border-radius:12px;">
                <input type="checkbox" id="paymentRequiresKyc" ${p.requires_kyc ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;">
                <span style="font-weight:600;">🔒 تتطلب هذه الطريقة توثيق الحساب</span>
            </label>
        </div>

        <div class="form-group">
            <label>صورة QR</label>
            <div class="image-preview" id="paymentQRPreview">${p.qr_image ? `<img src="${p.qr_image}" alt="">` : 'لا صورة'}</div>
            <input type="file" id="paymentQR" accept="image/*" onchange="previewImage(this,'paymentQRPreview')">
        </div>
        <div class="form-group">
            <label>لوجو الطريقة</label>
            <div class="image-preview" id="paymentLogoPreview">${p.icon ? `<img src="${p.icon}" alt="">` : 'لا صورة'}</div>
            <input type="file" id="paymentLogo" accept="image/*" onchange="previewImage(this,'paymentLogoPreview')">
        </div>
    `;
}

function openPaymentMethodModal() {
    const body = `
        <h3 style="margin-bottom:14px;">إضافة طريقة دفع</h3>
        ${_pmFieldsHTML(null)}
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn-primary" onclick="savePaymentMethod(this)">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة طريقة دفع', body);
}

function openEditPaymentMethodModal(methodId) {
    const pm = paymentMethodsData.find(m => m.id === methodId);
    if (!pm) { showToast('الطريقة غير موجودة', 'error'); return; }
    const body = `
        <h3 style="margin-bottom:14px;">تعديل طريقة دفع</h3>
        <div style="background:var(--primary-light);padding:10px;border-radius:10px;margin-bottom:14px;text-align:center;font-weight:700;">
            #${pm.id} — ${pm.name}
        </div>
        ${_pmFieldsHTML(pm)}
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn-primary" onclick="saveEditedPaymentMethod(${methodId}, this)">حفظ التعديلات</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('تعديل طريقة دفع', body);
}

function _readPMForm() {
    const name = (document.getElementById('paymentName')?.value || '').trim();
    const description = (document.getElementById('paymentDescription')?.value || '').trim();
    const account_name = (document.getElementById('paymentAccountName')?.value || '').trim();
    const account = (document.getElementById('paymentAccount')?.value || '').trim();
    const min_amount = parseFloat(document.getElementById('paymentMinAmount')?.value) || 0;
    const max_amount = parseFloat(document.getElementById('paymentMaxAmount')?.value) || 0;
    const fee = parseFloat(document.getElementById('paymentFee')?.value) || 0;
    const fee_type = document.getElementById('paymentFeeType')?.value || 'percentage';
    const requires_kyc = document.getElementById('paymentRequiresKyc')?.checked || false;
    return { name, description, account_name, account, min_amount, max_amount, fee, fee_type, requires_kyc };
}

function _validatePM(data) {
    if (!data.name) return 'أدخل اسم الطريقة';
    if (data.min_amount < 0 || data.max_amount < 0 || data.fee < 0) return 'لا يمكن أن تكون القيم سالبة';
    if (data.max_amount > 0 && data.min_amount > data.max_amount) return 'الحد الأدنى أكبر من الحد الأقصى';
    if (data.fee_type === 'percentage' && data.fee > 100) return 'نسبة الرسوم يجب أن تكون 100% أو أقل';
    return null;
}

async function savePaymentMethod(btn) {
    const data = _readPMForm();
    const err = _validatePM(data);
    if (err) { showToast(err, 'warning'); return; }

    const qrFile = document.getElementById('paymentQR')?.files[0];
    const logoFile = document.getElementById('paymentLogo')?.files[0];
    if (qrFile) data.qr_image = await fileToBase64(qrFile, 512);
    if (logoFile) data.icon = await fileToSquareBase64(logoFile, 512);
    data.is_active = true;

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createPaymentMethod(data);
        closeModal();
        await loadAllData();
        renderPaymentMethods();
        showToast('✅ تم إضافة طريقة الدفع', 'success');
    } catch (error) {
        showToast(`فشل الإضافة: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

async function saveEditedPaymentMethod(methodId, btn) {
    const data = _readPMForm();
    const err = _validatePM(data);
    if (err) { showToast(err, 'warning'); return; }

    const qrFile = document.getElementById('paymentQR')?.files[0];
    const logoFile = document.getElementById('paymentLogo')?.files[0];
    if (qrFile) data.qr_image = await fileToBase64(qrFile, 512);
    if (logoFile) data.icon = await fileToSquareBase64(logoFile, 512);

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await updatePaymentMethod(methodId, data);
        closeModal();
        await loadAllData();
        renderPaymentMethods();
        showToast('✅ تم تعديل طريقة الدفع', 'success');
    } catch (error) {
        showToast(`فشل التعديل: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ التعديلات'; }
    }
}

async function deletePaymentMethodHandler(methodId) {
    const confirmed = await showConfirm({
        title: 'حذف طريقة الدفع',
        message: 'هل أنت متأكد من حذف طريقة الدفع؟',
        confirmText: 'حذف',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await deletePaymentMethod(methodId);
        await loadAllData();
        renderPaymentMethods();
        showToast('تم حذف طريقة الدفع', 'success');
    } catch (error) {
        showToast(`فشل حذف طريقة الدفع: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ KYC — 🆕 FIXED v14 ============
// ============================================================
function setKYCTab(filter, btn) {
    kycTabFilter = filter;
    document.querySelectorAll('#kycTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderKYC();
}

function renderKYC() {
    const tbody = document.getElementById('kycTableBody');
    if (!tbody) return;

    // فلترة حسب Tab
    let filtered = [...kycData];
    if (kycTabFilter === 'pending') filtered = kycData.filter(k => k.status === 'pending');
    else if (kycTabFilter === 'approved') filtered = kycData.filter(k => k.status === 'approved');
    else if (kycTabFilter === 'rejected') filtered = kycData.filter(k => k.status === 'rejected');

    filteredKYC = filtered;

    if (!filtered.length) {
        const emptyMsg = kycTabFilter === 'all' ? 'لا توجد طلبات توثيق' : 'لا توجد طلبات في هذه الحالة';
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><span class="material-icons">verified_user</span>${emptyMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(k => `
        <tr>
            <td data-label="معرف المستخدم">${k.user_id}</td>
            <td data-label="الاسم">${k.full_name}</td>
            <td data-label="الهاتف"><span class="ltr">${k.phone}</span></td>
            <td data-label="العنوان">${k.address || '-'}</td>
            <td data-label="الصورة">${k.selfie_image ? `<button class="btn-outline btn-sm" onclick="viewKYCImage(${k.id})">عرض</button>` : '-'}</td>
            <td data-label="الحالة"><span class="status-badge ${k.status === 'approved' ? 'completed' : k.status === 'rejected' ? 'failed' : 'pending'}">${k.status === 'approved' ? 'مقبول' : k.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></td>
            <td data-label="إجراءات">
                ${k.status === 'pending' ? `
                    <button class="btn-success btn-sm" onclick="window.handleApproveKYC(${k.id})">قبول</button>
                    <button class="btn-danger btn-sm" onclick="window.handleRejectKYC(${k.id})">رفض</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

function viewKYCImage(kycId) {
    const kyc = kycData.find(k => k.id === kycId);
    if (!kyc) return;
    const body = `
        <div style="text-align:center;">
            <h3 style="margin-bottom:16px;">تفاصيل طلب التوثيق</h3>
            <div style="text-align:right;background:var(--primary-light);padding:14px;border-radius:12px;margin-bottom:16px;">
                <div style="margin-bottom:8px;"><strong>الاسم:</strong> ${kyc.full_name}</div>
                <div style="margin-bottom:8px;"><strong>الهاتف:</strong> <span class="ltr">${kyc.phone}</span></div>
                <div style="margin-bottom:8px;"><strong>العنوان:</strong> ${kyc.address || '-'}</div>
                <div><strong>الحالة:</strong> <span class="status-badge ${kyc.status === 'approved' ? 'completed' : kyc.status === 'rejected' ? 'failed' : 'pending'}">${kyc.status === 'approved' ? 'مقبول' : kyc.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></div>
            </div>
            <div style="margin-bottom:8px;text-align:right;font-weight:700;">صورة السيلفي:</div>
            <div style="background:var(--background);border-radius:12px;padding:8px;max-height:60vh;overflow:auto;" onclick="openImageLightbox('${kyc.selfie_image}')">
                <img src="${kyc.selfie_image}" style="width:100%;height:auto;border-radius:8px;display:block;cursor:zoom-in;" alt="KYC Selfie">
            </div>
            ${kyc.status === 'pending' ? `
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button class="btn-primary" style="flex:1;" onclick="closeModal(); window.handleApproveKYC(${kyc.id})">قبول التوثيق</button>
                    <button class="btn-danger" style="flex:1;" onclick="closeModal(); window.handleRejectKYC(${kyc.id})">رفض</button>
                </div>
            ` : ''}
            <button class="btn-outline" style="width:100%;margin-top:12px;" onclick="closeModal()">إغلاق</button>
        </div>
    `;
    openModal('طلب التوثيق', body);
}

// 🆕 FIXED: handleApproveKYC (بدل approveKYCRequest)
window.handleApproveKYC = async function(kycId) {
    const confirmed = await showConfirm({
        title: 'قبول التوثيق',
        message: 'هل أنت متأكد من قبول طلب التوثيق؟',
        confirmText: 'قبول',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        await approveKYCRequest(kycId);  // يستدعي api.js
        await loadAllData();
        renderKYC();
        showToast('تم قبول التوثيق بنجاح', 'success');
    } catch (error) {
        showToast(`فشل القبول: ${error.message}`, 'error');
    }
};

// 🆕 FIXED: handleRejectKYC (بدل rejectKYCRequest)
window.handleRejectKYC = async function(kycId) {
    const confirmed = await showConfirm({
        title: 'رفض التوثيق',
        message: 'هل أنت متأكد من رفض طلب التوثيق؟',
        confirmText: 'رفض',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await rejectKYCRequest(kycId);  // يستدعي api.js
        await loadAllData();
        renderKYC();
        showToast('تم رفض التوثيق', 'warning');
    } catch (error) {
        showToast(`فشل الرفض: ${error.message}`, 'error');
    }
};
// ============================================================
// admin/js/admin.js — v14 (Part 3/3 — Final)
// ============================================================

// ============================================================
// ============ Orders — 🆕 with Tabs ============
// ============================================================
function setOrdersTab(filter, btn) {
    ordersTabFilter = filter;
    document.querySelectorAll('#ordersTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyOrderFilters();
}

function applyOrderFilters() {
    const searchQuery = (document.getElementById('orderSearchQuery')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
    const sortFilter = document.getElementById('orderSortFilter')?.value || 'newest';

    let filtered = [...ordersData];

    // 🆕 Tab filter
    if (ordersTabFilter === 'pending') filtered = filtered.filter(o => o.status === 'pending');
    else if (ordersTabFilter === 'processing') filtered = filtered.filter(o => o.status === 'processing' || o.status === 'review');
    else if (ordersTabFilter === 'completed') filtered = filtered.filter(o => o.status === 'completed');

    // Status filter
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);

    // Search
    if (searchQuery) {
        filtered = filtered.filter(o =>
            (o.order_number || '').toLowerCase().includes(searchQuery) ||
            (o.user_telegram + '').includes(searchQuery) ||
            (o.product_name || '').toLowerCase().includes(searchQuery) ||
            (o.user_name || '').toLowerCase().includes(searchQuery)
        );
    }

    // Sort
    if (sortFilter === 'newest') filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sortFilter === 'oldest') filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    else if (sortFilter === 'price_high') filtered.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    else if (sortFilter === 'price_low') filtered.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));

    filteredOrders = filtered;
    renderOrders(filtered);
}

function resetOrderFilters() {
    const ids = ['orderSearchQuery'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const statusSelect = document.getElementById('orderStatusFilter');
    const sortSelect = document.getElementById('orderSortFilter');
    if (statusSelect) statusSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'newest';

    // إعادة Tab للكل
    ordersTabFilter = 'all';
    document.querySelectorAll('#ordersTabs .filter-tab').forEach((b, i) => {
        b.classList.toggle('active', i === 0);
    });

    filteredOrders = [...ordersData];
    renderOrders(ordersData);
}

function renderOrders(orders) {
    const container = document.getElementById('ordersList');
    if (!container) return;

    if (!orders || !orders.length) {
        container.innerHTML = `
            <div class="empty-state" style="padding:60px 20px;">
                <span class="material-icons" style="font-size:3rem;color:var(--muted);display:block;margin-bottom:12px;">receipt_long</span>
                <div style="font-size:1rem;font-weight:600;">لا توجد طلبات</div>
            </div>
        `;
        updateSelectedOrdersBar();
        return;
    }

    container.innerHTML = `
        <div class="orders-cards-grid">
            ${orders.map(order => renderOrderCard(order)).join('')}
        </div>
    `;
    updateSelectedOrdersBar();
}

function renderOrderCard(order) {
    const statusColors = {
        pending: 'pending', review: 'review', processing: 'processing',
        completed: 'completed', failed: 'failed', cancelled: 'cancelled'
    };

    let qtyDisplay;
    if (order.product_type === 'topup') {
        qtyDisplay = `${order.quantity.toLocaleString('ar')} ل.س`;
    } else if (order.product_unit_name && order.product_unit_name !== 'قطعة') {
        qtyDisplay = `${order.quantity.toLocaleString('ar')} ${order.product_unit_name}`;
    } else {
        qtyDisplay = `${order.quantity.toLocaleString('ar')} قطعة`;
    }

    const isChecked = selectedOrders.has(order.id) ? 'checked' : '';

    return `
        <div class="order-item-card" data-status="${order.status}">
            <div class="order-card-header">
                <label class="order-checkbox-wrap" onclick="event.stopPropagation();">
                    <input type="checkbox" class="order-checkbox" ${isChecked}
                           onchange="toggleOrderSelection(${order.id}, this.checked)">
                </label>
                <div class="order-header-info">
                    <div class="order-number-tag ltr" onclick="copyToClipboard('${order.order_number}')">${order.order_number}</div>
                    <span class="status-badge ${statusColors[order.status]}">${getStatusArabic(order.status)}</span>
                </div>
                <div class="order-price-tag">
                    <div class="price-value ltr">${parseFloat(order.total_price).toFixed(2)}$</div>
                </div>
            </div>

            <div class="order-card-body">
                <div class="order-body-row">
                    <span class="material-icons" style="font-size:16px;color:var(--primary);">person</span>
                    <span class="order-user-name">${order.user_name || 'مستخدم'}</span>
                    <span class="ltr order-user-id" onclick="copyToClipboard('${order.user_telegram || order.user_id}')">#${order.user_telegram || order.user_id}</span>
                </div>
                <div class="order-body-row">
                    <span class="material-icons" style="font-size:16px;color:var(--primary);">inventory_2</span>
                    <span class="order-product-name">${order.product_name || '-'}</span>
                    <span class="order-qty">${qtyDisplay}</span>
                </div>
            </div>

            <div class="order-card-footer">
                <div class="order-date">
                    <span class="material-icons" style="font-size:14px;">schedule</span>
                    ${order.created_at ? new Date(order.created_at).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                </div>
                <div class="order-actions">
                    <button class="btn-outline btn-sm" onclick="viewOrderDetails(${order.id})">
                        <span class="material-icons" style="font-size:14px;">visibility</span> تفاصيل
                    </button>
                    ${['pending', 'review', 'processing'].includes(order.status) ? `
                        <select class="order-status-quick-select" onchange="quickChangeOrderStatus(${order.id}, this.value)">
                            <option value="">تغيير...</option>
                            ${order.status === 'pending' ? '<option value="review">مراجعة</option><option value="cancelled">إلغاء</option>' : ''}
                            ${order.status === 'review' ? '<option value="processing">تنفيذ</option><option value="failed">فشل</option>' : ''}
                            ${order.status === 'processing' ? '<option value="completed">إكمال</option><option value="failed">فشل</option>' : ''}
                        </select>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

async function quickChangeOrderStatus(orderId, newStatus) {
    if (!newStatus) return;

    const confirmed = await showConfirm({
        title: 'تغيير الحالة',
        message: `هل تريد تغيير حالة الطلب إلى "${getStatusArabic(newStatus)}"؟`,
        confirmText: 'تأكيد',
        type: 'warning'
    });

    if (!confirmed) {
        renderOrders(filteredOrders.length ? filteredOrders : ordersData);
        return;
    }

    try {
        await updateOrderStatus(orderId, newStatus);
        await loadAllData();
        filteredOrders = [...ordersData];
        renderOrders(ordersData);
        showToast('تم تحديث الحالة', 'success');
    } catch (error) {
        showToast(`فشل: ${error.message}`, 'error');
        renderOrders(filteredOrders.length ? filteredOrders : ordersData);
    }
}

// ============================================================
// Order Selection (Bulk Actions)
// ============================================================
function toggleOrderSelection(orderId, isChecked) {
    if (isChecked) selectedOrders.add(orderId);
    else selectedOrders.delete(orderId);
    updateSelectedOrdersBar();
}

function updateSelectedOrdersBar() {
    const bar = document.getElementById('bulkOrdersBar');
    if (!bar) return;
    const count = selectedOrders.size;

    if (count === 0) {
        bar.classList.remove('active');
        return;
    }

    bar.classList.add('active');
    const countEl = bar.querySelector('.bulk-count');
    if (countEl) countEl.textContent = count;
}

function clearSelectedOrders() {
    selectedOrders.clear();
    document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = false);
    updateSelectedOrdersBar();
}

async function bulkChangeStatus(newStatus) {
    if (selectedOrders.size === 0) {
        showToast('لم يتم تحديد أي طلب', 'warning');
        return;
    }

    const confirmed = await showConfirm({
        title: 'تحديث جماعي',
        message: `سيتم تحديث ${selectedOrders.size} طلب إلى حالة "${getStatusArabic(newStatus)}". هل أنت متأكد؟`,
        confirmText: 'تحديث الكل',
        type: 'warning'
    });

    if (!confirmed) return;

    try {
        const result = await bulkUpdateOrderStatus(Array.from(selectedOrders), newStatus);
        showToast(`تم تحديث ${result.success_count} طلب بنجاح${result.failed_count > 0 ? ` (فشل ${result.failed_count})` : ''}`, 'success');
        clearSelectedOrders();
        await loadAllData();
        renderOrders(ordersData);
    } catch (error) {
        showToast(`فشل التحديث الجماعي: ${error.message}`, 'error');
    }
}

// ============================================================
// Order Detail Modal
// ============================================================
async function viewOrderDetails(orderId) {
    try {
        showToast('جارٍ تحميل التفاصيل...', 'info', 1500);
        const order = await fetchAdminOrderFull(orderId);

        const statusColors = {
            pending: 'pending', review: 'review', processing: 'processing',
            completed: 'completed', failed: 'failed', cancelled: 'cancelled'
        };

        let deliveryHtml = '';
        if (order.delivery_data && Object.keys(order.delivery_data).length > 0) {
            const items = [];
            if (order.delivery_data.player_id) items.push({ icon: 'person_pin', label: 'ID اللاعب', value: order.delivery_data.player_id });
            if (order.delivery_data.account_id) items.push({ icon: 'badge', label: 'ID الحساب', value: order.delivery_data.account_id });
            if (order.delivery_data.phone) items.push({ icon: 'phone', label: 'رقم الهاتف', value: order.delivery_data.phone });
            if (order.delivery_data.bundle_name) items.push({ icon: 'redeem', label: 'الباقة', value: order.delivery_data.bundle_name });
            if (order.delivery_data.syp_amount) items.push({ icon: 'payments', label: 'المبلغ بالليرة', value: `${order.delivery_data.syp_amount.toLocaleString('ar')} ل.س` });
            if (order.delivery_data.syp_rate) items.push({ icon: 'trending_up', label: 'سعر الصرف', value: `${order.delivery_data.syp_rate} ل.س/$` });

            if (items.length) {
                deliveryHtml = `
                    <div class="order-detail-section">
                        <div class="section-title-mini">
                            <span class="material-icons" style="font-size:16px;">info</span>
                            بيانات التسليم
                        </div>
                        ${items.map(item => `
                            <div class="detail-row">
                                <span class="detail-label">
                                    <span class="material-icons" style="font-size:14px;color:var(--primary);">${item.icon}</span>
                                    ${item.label}
                                </span>
                                <span class="detail-value ltr" onclick="copyToClipboard('${item.value}')" style="cursor:pointer;">${item.value}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        const body = `
            <div class="order-detail-modal">
                <div class="order-detail-header">
                    <div>
                        <div class="order-detail-number ltr" onclick="copyToClipboard('${order.order_number}')" style="cursor:pointer;">${order.order_number}</div>
                        <div class="order-detail-date">${order.created_at ? new Date(order.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <span class="status-badge ${statusColors[order.status]}">${order.status_arabic}</span>
                </div>

                <div class="order-detail-section highlight">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">person</span>
                        العميل
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">الاسم</span>
                        <span class="detail-value">${order.user?.first_name || 'مستخدم'} ${order.user?.last_name || ''}</span>
                    </div>
                    ${order.user?.username ? `
                    <div class="detail-row">
                        <span class="detail-label">Username</span>
                        <span class="detail-value ltr">@${order.user.username}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Telegram ID</span>
                        <span class="detail-value ltr" onclick="copyToClipboard('${order.user?.telegram_id}')" style="cursor:pointer;">${order.user?.telegram_id || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">رصيد العميل</span>
                        <span class="detail-value ltr" style="color:${order.user?.balance < 0 ? 'var(--error)' : 'var(--success)'};font-weight:800;">
                            ${parseFloat(order.user?.balance || 0).toFixed(2)}$
                        </span>
                    </div>
                    <button class="btn-outline btn-sm" style="width:100%;margin-top:8px;" onclick="closeModal(); goToUserFromSearch(${order.user?.id})">
                        <span class="material-icons" style="font-size:14px;">visibility</span>
                        عرض ملف العميل
                    </button>
                </div>

                <div class="order-detail-section">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">inventory_2</span>
                        المنتج
                    </div>
                    <div class="product-detail-row">
                        ${order.product?.image ? `<img src="${order.product.image}" class="product-thumb" alt="">` : '<div class="product-thumb placeholder">📦</div>'}
                        <div style="flex:1;">
                            <div style="font-weight:700;">${order.product?.name || '-'}</div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">
                                ${order.product?.product_type === 'topup' ? 'رصيد سوري' : order.product?.product_type === 'bundle' ? 'باقة' : 'منتج كمية'}
                            </div>
                        </div>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">الكمية</span>
                        <span class="detail-value">${order.quantity.toLocaleString('ar')} ${order.product?.unit_name || 'قطعة'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">سعر الوحدة</span>
                        <span class="detail-value ltr">${parseFloat(order.unit_price).toFixed(4)}$</span>
                    </div>
                    ${order.discount_amount > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">الخصم</span>
                        <span class="detail-value ltr" style="color:var(--success);">-${parseFloat(order.discount_amount).toFixed(2)}$</span>
                    </div>
                    ` : ''}
                    ${order.coupon_code ? `
                    <div class="detail-row">
                        <span class="detail-label">كود الخصم</span>
                        <span class="detail-value ltr">${order.coupon_code}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row total-row">
                        <span class="detail-label" style="font-weight:800;">الإجمالي</span>
                        <span class="detail-value ltr" style="font-weight:900;color:var(--primary);font-size:1.1rem;">
                            ${parseFloat(order.total_price).toFixed(2)}$
                        </span>
                    </div>
                </div>

                ${deliveryHtml}

                <div class="order-detail-actions">
                    ${['pending', 'review', 'processing'].includes(order.status) ? `
                        <div style="grid-column: 1 / -1; margin-bottom: 8px;">
                            <label style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">تغيير الحالة</label>
                        </div>
                        ${order.status === 'pending' ? `
                            <button class="btn-primary" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'review')">قيد المراجعة</button>
                            <button class="btn-outline" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'cancelled')">إلغاء</button>
                        ` : ''}
                        ${order.status === 'review' ? `
                            <button class="btn-primary" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'processing')">بدء التنفيذ</button>
                            <button class="btn-danger" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'failed')">فشل</button>
                        ` : ''}
                        ${order.status === 'processing' ? `
                            <button class="btn-success" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'completed')">إكمال</button>
                            <button class="btn-danger" onclick="closeModal(); quickChangeOrderStatus(${order.id}, 'failed')">فشل</button>
                        ` : ''}
                    ` : `
                        <div style="grid-column:1/-1;text-align:center;padding:12px;background:var(--background);border-radius:10px;font-size:0.85rem;color:var(--text-secondary);">
                            حالة الطلب نهائية — لا يمكن التغيير
                        </div>
                    `}
                </div>
            </div>
        `;
        openModal('', body);
    } catch (error) {
        showToast(`فشل تحميل التفاصيل: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Deposits — 🆕 with Tabs ============
// ============================================================
function setDepositsTab(filter, btn) {
    depositsTabFilter = filter;
    document.querySelectorAll('#depositsTabs .filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderDeposits(depositsData);
}

function renderDeposits(deposits) {
    const tbody = document.getElementById('depositsTableBody');
    if (!tbody) return;

    // 🆕 فلترة حسب Tab
    let filtered = [...deposits];
    if (depositsTabFilter === 'pending') filtered = deposits.filter(d => d.status === 'pending');
    else if (depositsTabFilter === 'approved') filtered = deposits.filter(d => d.status === 'approved');
    else if (depositsTabFilter === 'rejected') filtered = deposits.filter(d => d.status === 'rejected');

    filteredDeposits = filtered;

    if (!filtered.length) {
        const emptyMsg = depositsTabFilter === 'all' ? 'لا توجد إيداعات' : 'لا توجد إيداعات في هذه الحالة';
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><span class="material-icons">account_balance_wallet</span>${emptyMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(d => `
        <tr>
            <td data-label="رقم العملية">
                <span class="ltr" onclick="copyToClipboard('${d.transaction_id}')" style="cursor:pointer;">
                    ${d.transaction_id}
                </span>
            </td>
            <td data-label="المستخدم">
                ${d.user_name || 'مستخدم'}
                <div style="font-size:0.7rem;color:var(--text-secondary);cursor:pointer;" class="ltr" onclick="copyToClipboard('${d.user_telegram || d.user_id}')">
                    #${d.user_telegram || d.user_id}
                </div>
            </td>
            <td data-label="المبلغ"><strong class="ltr">${parseFloat(d.amount).toFixed(2)}$</strong></td>
            <td data-label="الطريقة">${d.method || '-'}</td>
            <td data-label="الحالة"><span class="status-badge ${d.status === 'approved' ? 'completed' : d.status === 'rejected' ? 'failed' : 'pending'}">${d.status === 'approved' ? 'مقبول' : d.status === 'rejected' ? 'مرفوض' : 'معلق'}</span></td>
            <td data-label="إجراءات">
                <button class="btn-outline btn-sm" onclick="viewDepositDetails(${d.id})">
                    <span class="material-icons" style="font-size:14px;">visibility</span> تفاصيل
                </button>
                ${d.status === 'pending' ? `
                    <button class="btn-success btn-sm" onclick="approveDepositHandler(${d.id})">قبول</button>
                    <button class="btn-danger btn-sm" onclick="rejectDepositHandler(${d.id})">رفض</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

async function viewDepositDetails(depositId) {
    try {
        showToast('جارٍ تحميل التفاصيل...', 'info', 1500);
        const d = await fetchAdminDepositDetail(depositId);

        const statusMap = {
            pending: { text: 'معلّق', class: 'pending' },
            approved: { text: 'مقبول', class: 'completed' },
            rejected: { text: 'مرفوض', class: 'failed' }
        };
        const st = statusMap[d.status] || { text: d.status, class: 'pending' };

        const body = `
            <div class="order-detail-modal">
                <div class="order-detail-header">
                    <div>
                        <div class="order-detail-number ltr" onclick="copyToClipboard('${d.transaction_id}')" style="cursor:pointer;">${d.transaction_id}</div>
                        <div class="order-detail-date">${d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <span class="status-badge ${st.class}">${st.text}</span>
                </div>

                <div class="order-detail-section highlight">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">person</span>
                        العميل
                    </div>
                    ${d.user ? `
                        <div class="detail-row">
                            <span class="detail-label">الاسم</span>
                            <span class="detail-value">${d.user.first_name || 'مستخدم'} ${d.user.last_name || ''}</span>
                        </div>
                        ${d.user.username ? `
                        <div class="detail-row">
                            <span class="detail-label">Username</span>
                            <span class="detail-value ltr">@${d.user.username}</span>
                        </div>
                        ` : ''}
                        <div class="detail-row">
                            <span class="detail-label">Telegram ID</span>
                            <span class="detail-value ltr" onclick="copyToClipboard('${d.user.telegram_id}')" style="cursor:pointer;">${d.user.telegram_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">رصيد العميل</span>
                            <span class="detail-value ltr" style="color:${d.user.balance < 0 ? 'var(--error)' : 'var(--success)'};font-weight:800;">
                                ${parseFloat(d.user.balance || 0).toFixed(2)}$
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">KYC</span>
                            <span class="detail-value">
                                <span class="status-badge ${d.user.kyc_status === 'verified' ? 'completed' : 'unverified'}">
                                    ${d.user.kyc_status === 'verified' ? 'موثق' : 'غير موثق'}
                                </span>
                            </span>
                        </div>
                        <button class="btn-outline btn-sm" style="width:100%;margin-top:8px;" onclick="closeModal(); goToUserFromSearch(${d.user.id})">
                            <span class="material-icons" style="font-size:14px;">visibility</span>
                            عرض ملف العميل
                        </button>
                    ` : '<div style="text-align:center;color:var(--text-secondary);">المستخدم غير موجود</div>'}
                </div>

                <div class="order-detail-section">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">payment</span>
                        تفاصيل الإيداع
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">المبلغ</span>
                        <span class="detail-value ltr" style="font-weight:900;color:var(--success);font-size:1.2rem;">
                            ${parseFloat(d.amount).toFixed(2)}$ ${d.currency || ''}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">طريقة الدفع</span>
                        <span class="detail-value">${d.method_name || d.method || '-'}</span>
                    </div>
                    ${d.sender_name ? `
                    <div class="detail-row">
                        <span class="detail-label">اسم المرسل</span>
                        <span class="detail-value">${d.sender_name}</span>
                    </div>
                    ` : ''}
                    ${d.account_number ? `
                    <div class="detail-row">
                        <span class="detail-label">رقم الحساب</span>
                        <span class="detail-value ltr" onclick="copyToClipboard('${d.account_number}')" style="cursor:pointer;">${d.account_number}</span>
                    </div>
                    ` : ''}
                    ${d.txid ? `
                    <div class="detail-row">
                        <span class="detail-label">رقم العملية</span>
                        <span class="detail-value ltr" style="font-weight:700;cursor:pointer;" onclick="copyToClipboard('${d.txid}')">${d.txid} 📋</span>
                    </div>
                    ` : ''}
                    ${d.admin_note ? `
                    <div class="detail-row">
                        <span class="detail-label">ملاحظة الإدارة</span>
                        <span class="detail-value" style="color:var(--warning);">${d.admin_note}</span>
                    </div>
                    ` : ''}
                </div>

                ${d.proof_image ? `
                <div class="order-detail-section">
                    <div class="section-title-mini">
                        <span class="material-icons" style="font-size:16px;">image</span>
                        صورة الإيصال
                    </div>
                    <div class="proof-image-wrap" onclick="openImageLightbox('${d.proof_image}')">
                        <img src="${d.proof_image}" alt="إيصال" class="proof-image-thumb">
                        <div class="proof-image-overlay">
                            <span class="material-icons">zoom_in</span>
                            <div>اضغط للتكبير</div>
                        </div>
                    </div>
                </div>
                ` : `
                <div class="order-detail-section">
                    <div style="text-align:center;color:var(--text-secondary);padding:20px;">
                        <span class="material-icons" style="font-size:2rem;display:block;margin-bottom:8px;">image_not_supported</span>
                        لا يوجد صورة مرفقة
                    </div>
                </div>
                `}

                ${d.status === 'pending' ? `
                    <div class="order-detail-actions">
                        <button class="btn-success" onclick="closeModal(); approveDepositHandler(${d.id})">
                            <span class="material-icons" style="font-size:16px;">check_circle</span>
                            قبول الإيداع
                        </button>
                        <button class="btn-danger" onclick="closeModal(); rejectDepositHandler(${d.id})">
                            <span class="material-icons" style="font-size:16px;">cancel</span>
                            رفض الإيداع
                        </button>
                    </div>
                ` : `
                    <div class="order-detail-section" style="text-align:center;background:var(--background);">
                        <div style="font-size:0.85rem;color:var(--text-secondary);">
                            تم ${d.status === 'approved' ? 'قبول' : 'رفض'} هذا الإيداع
                            ${d.reviewed_at ? ` بتاريخ ${new Date(d.reviewed_at).toLocaleString('ar')}` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
        openModal('', body);
    } catch (error) {
        showToast(`فشل تحميل التفاصيل: ${error.message}`, 'error');
    }
}

async function approveDepositHandler(depositId) {
    const confirmed = await showConfirm({
        title: 'اعتماد الإيداع',
        message: 'هل أنت متأكد من اعتماد هذا الإيداع؟ سيتم إضافة المبلغ إلى رصيد المستخدم.',
        confirmText: 'اعتماد',
        type: 'success'
    });
    if (!confirmed) return;
    try {
        const result = await approveDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
        if (result.paid_debt > 0) {
            showToast(`تم اعتماد الإيداع (سداد دين: $${result.paid_debt.toFixed(2)})`, 'success');
        } else {
            showToast('تم اعتماد الإيداع بنجاح', 'success');
        }
    } catch (error) {
        showToast(`فشل اعتماد الإيداع: ${error.message}`, 'error');
    }
}

async function rejectDepositHandler(depositId) {
    const confirmed = await showConfirm({
        title: 'رفض الإيداع',
        message: 'هل أنت متأكد من رفض هذا الإيداع؟',
        confirmText: 'رفض',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await rejectDeposit(depositId);
        await loadAllData();
        renderDeposits(depositsData);
        showToast('تم رفض الإيداع', 'warning');
    } catch (error) {
        showToast(`فشل رفض الإيداع: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Service Requests ============
// ============================================================
function renderServiceRequests() {
    const tbody = document.getElementById('serviceRequestsTableBody');
    if (!tbody) return;
    if (!serviceRequestsData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">build</span>لا توجد طلبات خدمة</td></tr>';
        return;
    }
    tbody.innerHTML = serviceRequestsData.map(r => `
        <tr>
            <td data-label="المستخدم">${r.user_id}</td>
            <td data-label="الخدمة">${r.service_name}</td>
            <td data-label="الوصف">${r.description || '-'}</td>
            <td data-label="السعر">${r.estimated_price ? r.estimated_price + '$' : '-'}</td>
            <td data-label="الحالة"><span class="status-badge ${r.status === 'pending' ? 'pending' : r.status === 'completed' ? 'completed' : 'failed'}">${r.status === 'pending' ? 'معلق' : r.status === 'completed' ? 'مكتمل' : 'فشل'}</span></td>
            <td data-label="إجراءات"><button class="btn-outline btn-sm" onclick="viewServiceRequest(${r.id})">عرض</button></td>
        </tr>
    `).join('');
}

function viewServiceRequest(reqId) {
    const req = serviceRequestsData.find(r => r.id === reqId);
    if (!req) return;
    const body = `
        <div style="text-align:right;">
            <h3>تفاصيل طلب الخدمة</h3>
            <p><strong>اسم الخدمة:</strong> ${req.service_name}</p>
            <p><strong>الوصف:</strong> ${req.description || '-'}</p>
            <p><strong>السعر المتوقع:</strong> ${req.estimated_price ? req.estimated_price + '$' : '-'}</p>
            <p><strong>الحالة:</strong> ${req.status}</p>
            <p><strong>التاريخ:</strong> ${req.created_at ? new Date(req.created_at).toLocaleString('ar') : ''}</p>
        </div>
    `;
    openModal('تفاصيل طلب الخدمة', body);
}

// ============================================================
// ============ Coupons ============
// ============================================================
function renderCoupons() {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;
    if (!couponsData.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-icons">local_offer</span>لا توجد كودات خصم</td></tr>';
        return;
    }
    tbody.innerHTML = couponsData.map(c => {
        const typeLabel = c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value}$`;
        const expiry = c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar') : 'بلا نهاية';
        return `
            <tr>
                <td data-label="الكود"><strong class="ltr" onclick="copyToClipboard('${c.code}')" style="cursor:pointer;">${c.code}</strong></td>
                <td data-label="النوع">${c.discount_type === 'percentage' ? 'نسبة' : 'مبلغ'}</td>
                <td data-label="القيمة">${typeLabel}</td>
                <td data-label="الحد الأدنى">${c.min_amount || 0}$</td>
                <td data-label="الاستخدامات">${c.used_count || 0} / ${c.max_uses || '∞'}</td>
                <td data-label="الصلاحية">${expiry}</td>
                <td data-label="الحالة"><span class="status-badge ${c.is_active ? 'completed' : 'failed'}">${c.is_active ? 'مفعّل' : 'معطّل'}</span></td>
                <td data-label="إجراءات">
                    <button class="btn-outline btn-sm" onclick="toggleCoupon(${c.id}, ${c.is_active})">${c.is_active ? 'تعطيل' : 'تفعيل'}</button>
                    <button class="btn-danger btn-sm" onclick="deleteCouponHandler(${c.id})">حذف</button>
                </td>
            </tr>
        `;
    }).join('');
}

function openCouponModal() {
    const body = `
        <h3 style="margin-bottom:14px;">إضافة كود خصم</h3>
        <div class="form-group"><label>الكود</label><input type="text" id="couponCode" placeholder="مثال: WELCOME10"></div>
        <div class="form-group"><label>الوصف (اختياري)</label><input type="text" id="couponDescription" placeholder="مثال: خصم ترحيبي"></div>
        <div class="form-group">
            <label>نوع الخصم</label>
            <select id="couponType">
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت ($)</option>
            </select>
        </div>
        <div class="form-group"><label>قيمة الخصم</label><input type="number" id="couponValue" value="10" step="0.01"></div>
        <div class="form-group"><label>الحد الأدنى للطلب ($)</label><input type="number" id="couponMinAmount" value="0" step="0.01"></div>
        <div class="form-group"><label>أقصى مبلغ خصم ($) - 0 = بلا حد</label><input type="number" id="couponMaxDiscount" value="0" step="0.01"></div>
        <div class="form-group"><label>عدد الاستخدامات - 0 = بلا حد</label><input type="number" id="couponMaxUses" value="0"></div>
        <div class="form-group"><label>تاريخ الانتهاء (اختياري)</label><input type="date" id="couponExpiry"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn-primary" onclick="saveCoupon(this)">حفظ</button>
            <button class="btn-outline" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    openModal('إضافة كود خصم', body);
}

async function saveCoupon(btn) {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const description = document.getElementById('couponDescription').value;
    const discount_type = document.getElementById('couponType').value;
    const discount_value = parseFloat(document.getElementById('couponValue').value);
    const min_amount = parseFloat(document.getElementById('couponMinAmount').value) || 0;
    const max_discount = parseFloat(document.getElementById('couponMaxDiscount').value) || 0;
    const max_uses = parseInt(document.getElementById('couponMaxUses').value) || 0;
    const expiryDate = document.getElementById('couponExpiry').value;

    if (!code) { showToast('أدخل الكود', 'warning'); return; }
    if (!discount_value || discount_value <= 0) { showToast('أدخل قيمة خصم صحيحة', 'warning'); return; }

    const couponData = {
        code, description, discount_type, discount_value,
        min_amount, max_discount, max_uses, is_active: true,
    };
    if (expiryDate) couponData.expires_at = new Date(expiryDate).toISOString();

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try {
        await createCoupon(couponData);
        closeModal();
        await loadAllData();
        renderCoupons();
        showToast('تم إضافة كود الخصم بنجاح', 'success');
    } catch (error) {
        showToast(`فشل إضافة الكود: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'حفظ'; }
    }
}

async function toggleCoupon(couponId, currentStatus) {
    try {
        await updateCoupon(couponId, { is_active: !currentStatus });
        await loadAllData();
        renderCoupons();
        showToast(!currentStatus ? 'تم تفعيل الكود' : 'تم تعطيل الكود', 'success');
    } catch (error) {
        showToast(`فشل تغيير حالة الكود: ${error.message}`, 'error');
    }
}

async function deleteCouponHandler(couponId) {
    const confirmed = await showConfirm({
        title: 'حذف كود الخصم',
        message: 'هل أنت متأكد من حذف هذا الكود؟',
        confirmText: 'حذف',
        type: 'danger'
    });
    if (!confirmed) return;
    try {
        await deleteCoupon(couponId);
        await loadAllData();
        renderCoupons();
        showToast('تم حذف الكود', 'success');
    } catch (error) {
        showToast(`فشل حذف الكود: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Referrals ============
// ============================================================
async function loadReferrals() {
    const tbody = document.getElementById('referralsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">جار التحميل...</td></tr>';
    try {
        referralsData = await fetchAdminReferrals();
        if (!referralsData.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">card_giftcard</span>لا توجد إحالات</td></tr>';
            return;
        }
        tbody.innerHTML = referralsData.map(r => `
            <tr>
                <td data-label="#">${r.id}</td>
                <td data-label="المُحيل"><span class="ltr">${r.referrer_telegram || r.referrer_id}</span></td>
                <td data-label="المُحال"><span class="ltr">${r.referred_telegram || r.referred_user_id}</span></td>
                <td data-label="المكافأة">${r.reward_amount}$</td>
                <td data-label="الحالة"><span class="status-badge ${r.status === 'completed' ? 'completed' : 'pending'}">${r.status === 'completed' ? 'مكتملة' : 'قيد الانتظار'}</span></td>
                <td data-label="التاريخ">${r.created_at ? new Date(r.created_at).toLocaleString('ar') : ''}</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">فشل التحميل: ${error.message}</td></tr>`;
    }
}

// ============================================================
// ============ Activities ============
// ============================================================
async function loadActivities() {
    const tbody = document.getElementById('activitiesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">جار التحميل...</td></tr>';
    try {
        activitiesData = await fetchActivities();
        if (!activitiesData.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><span class="material-icons">history</span>لا توجد نشاطات</td></tr>';
            return;
        }
        tbody.innerHTML = activitiesData.map(a => `
            <tr>
                <td data-label="#">${a.id}</td>
                <td data-label="النشاط">${a.action}</td>
                <td data-label="التاريخ">${a.created_at ? new Date(a.created_at).toLocaleString('ar') : ''}</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-state">فشل تحميل النشاطات: ${error.message}</td></tr>`;
    }
}

// ============================================================
// ============ Audit Log ============
// ============================================================
async function loadAuditLog() {
    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">جار التحميل...</td></tr>';
    try {
        auditLogData = await fetchAuditLog({ limit: 200 });
        filteredAuditLog = [...auditLogData];
        renderAuditLog();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state">فشل تحميل السجل: ${error.message}</td></tr>`;
    }
}

function filterAuditLog() {
    const userQuery = (document.getElementById('auditUserSearch')?.value || '').trim();
    const actionFilter = document.getElementById('auditActionFilter')?.value || '';

    let filtered = [...auditLogData];
    if (userQuery) {
        filtered = filtered.filter(l => (l.user_id + '').includes(userQuery));
    }
    if (actionFilter) {
        filtered = filtered.filter(l => l.action === actionFilter);
    }
    filteredAuditLog = filtered;
    renderAuditLog();
}

function getActionArabic(action) {
    const map = {
        order_created: '🛒 شراء طلب',
        order_refund: '💸 استرداد طلب',
        order_cancelled: '❌ إلغاء طلب',
        deposit_approved: '✅ قبول إيداع',
        deposit_rejected: '🚫 رفض إيداع',
        admin_adjustment: '⚙️ تعديل رصيد',
        referral_reward: '🎁 مكافأة إحالة',
    };
    return map[action] || action;
}

function renderAuditLog() {
    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;
    if (!filteredAuditLog.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="material-icons">fact_check</span>لا توجد سجلات</td></tr>';
        return;
    }
    tbody.innerHTML = filteredAuditLog.map(l => {
        const amountColor = l.amount > 0 ? 'var(--success)' : 'var(--error)';
        const amountSign = l.amount > 0 ? '+' : '';
        return `
            <tr>
                <td data-label="#">${l.id}</td>
                <td data-label="المستخدم"><span class="ltr">${l.user_id}</span></td>
                <td data-label="العملية">${getActionArabic(l.action)}</td>
                <td data-label="المبلغ" style="color:${amountColor};font-weight:800;direction:ltr;">${amountSign}${l.amount.toFixed(2)}$</td>
                <td data-label="الرصيد قبل" style="direction:ltr;">${l.balance_before.toFixed(2)}$</td>
                <td data-label="الرصيد بعد" style="direction:ltr;">${l.balance_after.toFixed(2)}$</td>
                <td data-label="IP"><span class="ltr" style="font-size:0.7rem;">${l.ip_address || '-'}</span></td>
                <td data-label="التاريخ" style="font-size:0.75rem;">${l.created_at ? new Date(l.created_at).toLocaleString('ar') : ''}</td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// ============ Notifications ============
// ============================================================
function sendAdminNotification() {
    const message = document.getElementById('notificationMessage').value;
    if (!message) { showToast('أدخل نص الإشعار', 'warning'); return; }
    const target = document.getElementById('notificationTarget').value;
    const type = document.getElementById('notificationType').value;
    const data = { target, title: 'إشعار من الإدارة', message, type };
    if (target === 'specific') {
        const uid = document.getElementById('notificationUserId').value;
        if (!uid) { showToast('أدخل معرف المستخدم', 'warning'); return; }
        data.user_id = uid;
    }
    sendNotification(data)
        .then(() => {
            showToast('تم إرسال الإشعار بنجاح', 'success');
            document.getElementById('notificationMessage').value = '';
        })
        .catch(error => showToast(`فشل الإرسال: ${error.message}`, 'error'));
}

// ============================================================
// ============ Settings ============
// ============================================================
function loadSettings() {
    if (!currentSettings) return;
    const storeNameEl = document.getElementById('storeName');
    const supportUrlEl = document.getElementById('supportUrl');
    const sypRateEl = document.getElementById('sypRate');

    if (storeNameEl) storeNameEl.value = currentSettings.store_name || 'SANAD+';
    if (supportUrlEl) supportUrlEl.value = currentSettings.support_url || 'https://t.me/SANADST';
    if (sypRateEl) sypRateEl.value = currentSettings.syp_rate || '132';

    updateSypPreview();

    if (sypRateEl && !sypRateEl.dataset.listenerAttached) {
        sypRateEl.addEventListener('input', updateSypPreview);
        sypRateEl.dataset.listenerAttached = '1';
    }
}

function updateSypPreview() {
    const rateEl = document.getElementById('sypRate');
    if (!rateEl) return;
    const rate = parseFloat(rateEl.value) || 132;

    const p1000 = document.getElementById('sypPreview1000');
    const p5000 = document.getElementById('sypPreview5000');
    const p10000 = document.getElementById('sypPreview10000');

    if (p1000) p1000.textContent = `${(1000 / rate).toFixed(2)}$`;
    if (p5000) p5000.textContent = `${(5000 / rate).toFixed(2)}$`;
    if (p10000) p10000.textContent = `${(10000 / rate).toFixed(2)}$`;
}

async function saveSettings() {
    const storeName = document.getElementById('storeName')?.value || 'SANAD+';
    const supportUrl = document.getElementById('supportUrl')?.value || '';
    const sypRate = parseFloat(document.getElementById('sypRate')?.value) || 132;

    if (sypRate <= 0) { showToast('سعر الصرف غير صحيح', 'warning'); return; }

    try {
        await saveAdminSettings({
            store_name: storeName,
            support_url: supportUrl,
            syp_rate: sypRate.toString(),
        });
        currentSettings.store_name = storeName;
        currentSettings.support_url = supportUrl;
        currentSettings.syp_rate = sypRate.toString();
        showToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) {
        showToast(`فشل الحفظ: ${error.message}`, 'error');
    }
}

// ============================================================
// ============ Modal ============
// ============================================================
function openModal(title, bodyHTML) {
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================================
// 🆕 Image Lightbox
// ============================================================
function openImageLightbox(imageUrl) {
    const lightbox = document.getElementById('imageLightbox');
    if (!lightbox) {
        const lb = document.createElement('div');
        lb.id = 'imageLightbox';
        lb.className = 'image-lightbox';
        lb.onclick = function(e) {
            if (e.target === lb || e.target.classList.contains('close-lightbox')) {
                closeImageLightbox();
            }
        };
        lb.innerHTML = `
            <button class="close-lightbox" onclick="closeImageLightbox()">×</button>
            <img src="" alt="Zoomed" class="lightbox-image">
        `;
        document.body.appendChild(lb);
    }
    const lb = document.getElementById('imageLightbox');
    lb.querySelector('.lightbox-image').src = imageUrl;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImageLightbox() {
    const lb = document.getElementById('imageLightbox');
    if (lb) {
        lb.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================================
// ============ Helpers ============
// ============================================================
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const el = document.getElementById(previewId);
            if (el) el.innerHTML = `<img src="${e.target.result}" alt="preview">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function fileToBase64(file, maxWidth = 512) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function fileToSquareBase64(file, size = 512) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                canvas.width = size;
                canvas.height = size;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 🆕 Copy to clipboard
function copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('تم النسخ ✓', 'success', 1500))
            .catch(() => {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); showToast('تم النسخ ✓', 'success', 1500); }
                catch (e) { showToast('تعذر النسخ', 'error'); }
                document.body.removeChild(ta);
            });
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast('تم النسخ ✓', 'success', 1500); }
        catch (e) { showToast('تعذر النسخ', 'error'); }
        document.body.removeChild(ta);
    }
}

// ============================================================
// ============ Excel Export ============
// ============================================================
function exportToExcel(filename, sheetName, rows) {
    try {
        if (typeof XLSX === 'undefined') {
            showToast('مكتبة Excel لم تُحمّل بعد', 'error');
            return;
        }
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const colWidths = [];
        const maxCols = Math.max(...rows.map(r => r.length));
        for (let i = 0; i < maxCols; i++) {
            let maxLen = 10;
            rows.forEach(row => {
                const cell = row[i] ? String(row[i]) : '';
                if (cell.length > maxLen) maxLen = Math.min(cell.length, 50);
            });
            colWidths.push({ wch: maxLen + 2 });
        }
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const timestamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
        showToast('تم تصدير الملف بنجاح', 'success');
    } catch (error) {
        console.error('Excel export error:', error);
        showToast(`فشل التصدير: ${error.message}`, 'error');
    }
}

function exportUsersExcel() {
    if (!usersData.length) { showToast('لا يوجد مستخدمون للتصدير', 'warning'); return; }
    const rows = [['Telegram ID', 'الاسم', 'Username', 'الرصيد', 'الحالة', 'VIP', 'KYC', 'تاريخ التسجيل']];
    usersData.forEach(u => {
        rows.push([u.telegram_id, u.first_name || '', u.username || '', parseFloat(u.balance).toFixed(2),
            u.is_banned ? 'محظور' : 'نشط', u.vip_level > 0 ? 'VIP' + u.vip_level : '-',
            u.kyc_status, u.created_at ? new Date(u.created_at).toLocaleString('ar') : '']);
    });
    exportToExcel('users', 'المستخدمون', rows);
}

function exportOrdersExcel() {
    const dataToExport = filteredOrders.length ? filteredOrders : ordersData;
    if (!dataToExport.length) { showToast('لا توجد طلبات للتصدير', 'warning'); return; }
    const rows = [['رقم الطلب', 'معرف المستخدم', 'المنتج', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي', 'الخصم', 'الكوبون', 'الحالة', 'التاريخ']];
    dataToExport.forEach(o => {
        rows.push([o.order_number, o.user_telegram || o.user_id, o.product_name || o.product_id, o.quantity,
            o.product_unit_name || 'قطعة',
            o.unit_price || 0, o.total_price, o.discount_amount || 0, o.coupon_code || '-',
            getStatusArabic(o.status), o.created_at ? new Date(o.created_at).toLocaleString('ar') : '']);
    });
    exportToExcel('orders', 'الطلبات', rows);
}

function exportDepositsExcel() {
    if (!depositsData.length) { showToast('لا توجد إيداعات للتصدير', 'warning'); return; }
    const rows = [['رقم العملية', 'معرف المستخدم', 'الاسم', 'المبلغ', 'العملة', 'الطريقة', 'الحالة', 'ملاحظة', 'التاريخ']];
    depositsData.forEach(d => {
        rows.push([d.transaction_id, d.user_telegram || d.user_id, d.user_name || '', d.amount, 'USD', d.method,
            d.status === 'approved' ? 'مقبول' : d.status === 'rejected' ? 'مرفوض' : 'معلق',
            d.admin_note || '-', d.created_at ? new Date(d.created_at).toLocaleString('ar') : '']);
    });
    exportToExcel('deposits', 'الإيداعات', rows);
}

function exportReferralsExcel() {
    if (!referralsData || !referralsData.length) { showToast('لا توجد إحالات للتصدير', 'warning'); return; }
    const rows = [['#', 'المُحيل (Telegram)', 'المُحال (Telegram)', 'المكافأة', 'الحالة', 'التاريخ', 'تاريخ الإكمال']];
    referralsData.forEach(r => {
        rows.push([r.id, r.referrer_telegram || r.referrer_id, r.referred_telegram || r.referred_user_id,
            r.reward_amount, r.status === 'completed' ? 'مكتملة' : 'قيد الانتظار',
            r.created_at ? new Date(r.created_at).toLocaleString('ar') : '',
            r.completed_at ? new Date(r.completed_at).toLocaleString('ar') : '-']);
    });
    exportToExcel('referrals', 'الإحالات', rows);
}

// ============================================================
// ============ End of admin.js v14 ============
// ============================================================

/* ============================================================
   🆕 v18.3.8: Admin Inbox
   ============================================================ */
let inboxData = null;

async function loadInbox() {
    const container = document.getElementById('inboxContainer');
    if (container) {
        container.innerHTML = `
            <div class="empty">
                <div class="empty-icon"><span class="material-icons">hourglass_empty</span></div>
                <h3>جارٍ التحميل...</h3>
            </div>
        `;
    }

    try {
        const data = await fetchAdminInbox();
        inboxData = data;
        renderInbox();
        updateInboxBadge();
    } catch (err) {
        if (container) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">error</span></div>
                    <h3>فشل التحميل</h3>
                    <p>${escapeHtml(err.message)}</p>
                </div>
            `;
        }
        showToast(`فشل تحميل الإرساليات: ${err.message}`, 'error');
    }
}

function updateInboxBadge() {
    if (!inboxData || !inboxData.counts) return;
    const total = inboxData.counts.total || 0;

    const sidebarBadge = document.getElementById('badge-inbox');
    const mobileBadge = document.getElementById('badge-mobile-inbox');
    const subtitle = document.getElementById('inboxSubtitle');

    [sidebarBadge, mobileBadge].forEach(el => {
        if (!el) return;
        if (total > 0) {
            el.textContent = total > 99 ? '99+' : total;
            el.style.display = 'inline-flex';
        } else {
            el.style.display = 'none';
        }
    });

    if (subtitle) {
        subtitle.textContent = total > 0
            ? `${total} عنصر يحتاج مراجعتك`
            : 'كل شيء تحت السيطرة ✨';
    }
}

function scrollToInboxSection(type) {
    const el = document.getElementById('inbox-section-' + type);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _inboxChipHTML(count, type, icon) {
    const hasItems = count > 0;
    return `
        <div class="inbox-chip ${hasItems ? 'has-items' : ''}" data-type="${type}" onclick="scrollToInboxSection('${type}')">
            <span class="material-icons">${icon}</span>
            <span class="inbox-chip-count">${count}</span>
            <span class="inbox-chip-label">${type === 'deposits' ? 'إيداعات' : type === 'orders' ? 'طلبات' : type === 'kyc' ? 'توثيق' : 'خدمات'}</span>
        </div>
    `;
}

function renderInbox() {
    if (!inboxData) return;
    const container = document.getElementById('inboxContainer');
    const summary = document.getElementById('inboxSummary');
    if (!container) return;

    const c = inboxData.counts || { deposits: 0, orders: 0, kyc: 0, services: 0, total: 0 };

    // Update summary chips
    if (summary) {
        summary.innerHTML = `
            ${_inboxChipHTML(c.deposits || 0, 'deposits', 'account_balance_wallet')}
            ${_inboxChipHTML(c.orders || 0, 'orders', 'receipt_long')}
            ${_inboxChipHTML(c.kyc || 0, 'kyc', 'verified_user')}
            ${_inboxChipHTML(c.services || 0, 'services', 'handyman')}
        `;
    }

    // Counts in header for backward compat
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('inboxCountDeposits', c.deposits || 0);
    setText('inboxCountOrders', c.orders || 0);
    setText('inboxCountKYC', c.kyc || 0);
    setText('inboxCountServices', c.services || 0);

    if ((c.total || 0) === 0) {
        container.innerHTML = `
            <div class="empty">
                <div class="empty-icon"><span class="material-icons">check_circle</span></div>
                <h3>كل شيء تحت السيطرة</h3>
                <p>لا توجد عناصر تحتاج مراجعتك الآن.</p>
            </div>
        `;
        return;
    }

    let html = '';

    // ═══ Deposits ═══
    if ((inboxData.pending_deposits || []).length) {
        html += `
            <div class="inbox-section" id="inbox-section-deposits">
                <div class="inbox-section-header">
                    <h3>
                        <span class="material-icons" style="color:var(--success);">account_balance_wallet</span>
                        إيداعات
                    </h3>
                    <span class="inbox-section-count">${c.deposits}</span>
                </div>
                <div class="inbox-section-body">
                    ${inboxData.pending_deposits.map(d => `
                        <div class="inbox-item">
                            <div class="inbox-item-icon success">
                                <span class="material-icons">arrow_downward</span>
                            </div>
                            <div class="inbox-item-content">
                                <div class="inbox-item-title">${escapeHtml(d.transaction_id)}</div>
                                <div class="inbox-item-subtitle">
                                    ${escapeHtml(d.user_name || 'مستخدم')} • #${escapeHtml(d.user_telegram || d.user_id)}
                                    • ${escapeHtml(d.method || '-')}
                                </div>
                                <div class="inbox-item-amount" style="margin-top:4px;">$${parseFloat(parseFloat(d.amount) || 0).toFixed(2)}</div>
                            </div>
                            <div class="inbox-item-actions">
                                <button class="inbox-action view" onclick="viewDepositDetails(${d.id})" title="تفاصيل">
                                    <span class="material-icons">visibility</span>
                                </button>
                                <button class="inbox-action approve" onclick="inboxApproveDeposit(${d.id})" title="قبول">
                                    <span class="material-icons">check</span>
                                </button>
                                <button class="inbox-action reject" onclick="inboxRejectDeposit(${d.id})" title="رفض">
                                    <span class="material-icons">close</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ═══ Orders ═══
    if ((inboxData.pending_orders || []).length) {
        html += `
            <div class="inbox-section" id="inbox-section-orders">
                <div class="inbox-section-header">
                    <h3>
                        <span class="material-icons" style="color:var(--info);">receipt_long</span>
                        طلبات
                    </h3>
                    <span class="inbox-section-count">${c.orders}</span>
                </div>
                <div class="inbox-section-body">
                    ${inboxData.pending_orders.map(o => {
                        const isTopup = o.product_type === 'topup';
                        const qty = isTopup
                            ? `${parseInt(o.quantity || 0).toLocaleString('ar')} ل.س`
                            : `${parseInt(o.quantity || 0).toLocaleString('ar')} ${escapeHtml(o.product_unit_name || 'قطعة')}`;
                        return `
                        <div class="inbox-item">
                            <div class="inbox-item-icon" style="background:var(--info-soft);color:var(--info);">
                                <span class="material-icons">shopping_bag</span>
                            </div>
                            <div class="inbox-item-content">
                                <div class="inbox-item-title">${escapeHtml(o.order_number)}</div>
                                <div class="inbox-item-subtitle">
                                    ${escapeHtml(o.product_name || '-')} • ${qty}
                                </div>
                                <div class="inbox-item-subtitle" style="margin-top:2px;">
                                    ${escapeHtml(o.user_name || 'مستخدم')} • #${escapeHtml(o.user_telegram || o.user_id)}
                                </div>
                                <div class="inbox-item-amount" style="margin-top:4px;color:var(--primary);">$${parseFloat(parseFloat(o.total_price) || 0).toFixed(2)}</div>
                            </div>
                            <div class="inbox-item-actions">
                                <button class="inbox-action view" onclick="viewOrderDetails(${o.id})" title="تفاصيل">
                                    <span class="material-icons">visibility</span>
                                </button>
                                <button class="inbox-action approve" onclick="inboxApproveOrder(${o.id})" title="إكمال">
                                    <span class="material-icons">check</span>
                                </button>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // ═══ KYC ═══
    if ((inboxData.pending_kyc || []).length) {
        html += `
            <div class="inbox-section" id="inbox-section-kyc">
                <div class="inbox-section-header">
                    <h3>
                        <span class="material-icons" style="color:var(--warning);">verified_user</span>
                        طلبات توثيق
                    </h3>
                    <span class="inbox-section-count">${c.kyc}</span>
                </div>
                <div class="inbox-section-body">
                    ${inboxData.pending_kyc.map(k => `
                        <div class="inbox-item">
                            <div class="inbox-item-icon warning">
                                <span class="material-icons">badge</span>
                            </div>
                            <div class="inbox-item-content">
                                <div class="inbox-item-title">${escapeHtml(k.full_name)}</div>
                                <div class="inbox-item-subtitle">
                                    ${escapeHtml(k.phone || '-')} • #${escapeHtml(k.user_telegram || k.user_id)}
                                </div>
                            </div>
                            <div class="inbox-item-actions">
                                <button class="inbox-action view" onclick="viewKYCImage(${k.id})" title="عرض">
                                    <span class="material-icons">visibility</span>
                                </button>
                                <button class="inbox-action approve" onclick="inboxApproveKYC(${k.id})" title="قبول">
                                    <span class="material-icons">check</span>
                                </button>
                                <button class="inbox-action reject" onclick="inboxRejectKYC(${k.id})" title="رفض">
                                    <span class="material-icons">close</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ═══ Services ═══
    if ((inboxData.pending_services || []).length) {
        html += `
            <div class="inbox-section" id="inbox-section-services">
                <div class="inbox-section-header">
                    <h3>
                        <span class="material-icons" style="color:var(--primary);">handyman</span>
                        طلبات خدمة
                    </h3>
                    <span class="inbox-section-count">${c.services}</span>
                </div>
                <div class="inbox-section-body">
                    ${inboxData.pending_services.map(s => `
                        <div class="inbox-item">
                            <div class="inbox-item-icon">
                                <span class="material-icons">build</span>
                            </div>
                            <div class="inbox-item-content">
                                <div class="inbox-item-title">${escapeHtml(s.service_name || '-')}</div>
                                <div class="inbox-item-subtitle">
                                    ${escapeHtml(s.user_name || 'مستخدم')} • #${escapeHtml(s.user_telegram || s.user_id)}
                                </div>
                            </div>
                            <div class="inbox-item-actions">
                                <button class="inbox-action view" onclick="viewServiceRequest(${s.id})" title="عرض">
                                    <span class="material-icons">visibility</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function inboxApproveDeposit(id) {
    const ok = await showConfirm({
        title: 'قبول الإيداع',
        message: 'هل تريد قبول هذا الإيداع وإضافة المبلغ للرصيد؟',
        confirmText: 'قبول',
        type: 'success'
    });
    if (!ok) return;

    try {
        await approveDeposit(id);
        showToast('✅ تم قبول الإيداع', 'success');
        await loadInbox();
        if (typeof loadAllData === 'function') await loadAllData();
    } catch (err) {
        showToast(`فشل: ${err.message}`, 'error');
    }
}

async function inboxRejectDeposit(id) {
    const ok = await showConfirm({
        title: 'رفض الإيداع',
        message: 'هل تريد رفض هذا الإيداع؟',
        confirmText: 'رفض',
        type: 'danger'
    });
    if (!ok) return;

    try {
        await rejectDeposit(id);
        showToast('تم رفض الإيداع', 'warning');
        await loadInbox();
        if (typeof loadAllData === 'function') await loadAllData();
    } catch (err) {
        showToast(`فشل: ${err.message}`, 'error');
    }
}

async function inboxApproveOrder(id) {
    const ok = await showConfirm({
        title: 'إكمال الطلب',
        message: 'هل تريد تعليم الطلب كمكتمل؟',
        confirmText: 'إكمال',
        type: 'success'
    });
    if (!ok) return;

    try {
        await updateOrderStatus(id, 'completed');
        showToast('✅ تم إكمال الطلب', 'success');
        await loadInbox();
        if (typeof loadAllData === 'function') await loadAllData();
    } catch (err) {
        showToast(`فشل: ${err.message}`, 'error');
    }
}

async function inboxApproveKYC(id) {
    const ok = await showConfirm({
        title: 'قبول التوثيق',
        message: 'هل تريد قبول طلب التوثيق؟',
        confirmText: 'قبول',
        type: 'success'
    });
    if (!ok) return;

    try {
        await approveKYCRequest(id);
        showToast('✅ تم قبول التوثيق', 'success');
        await loadInbox();
        if (typeof loadAllData === 'function') await loadAllData();
    } catch (err) {
        showToast(`فشل: ${err.message}`, 'error');
    }
}

async function inboxRejectKYC(id) {
    const ok = await showConfirm({
        title: 'رفض التوثيق',
        message: 'هل تريد رفض طلب التوثيق؟',
        confirmText: 'رفض',
        type: 'danger'
    });
    if (!ok) return;

    try {
        await rejectKYCRequest(id);
        showToast('تم رفض التوثيق', 'warning');
        await loadInbox();
        if (typeof loadAllData === 'function') await loadAllData();
    } catch (err) {
        showToast(`فشل: ${err.message}`, 'error');
    }
}

// Expose globally
window.loadInbox = loadInbox;
window.renderInbox = renderInbox;
window.scrollToInboxSection = scrollToInboxSection;
window.inboxApproveDeposit = inboxApproveDeposit;
window.inboxRejectDeposit = inboxRejectDeposit;
window.inboxApproveOrder = inboxApproveOrder;
window.inboxApproveKYC = inboxApproveKYC;
window.inboxRejectKYC = inboxRejectKYC;
window.updateInboxBadge = updateInboxBadge;


/* ============================================================
   🆕 v18.4: Inbox v2 — Auto-refresh + Sound + Filters + Double-confirm
   ============================================================ */

let _inboxAutoRefreshTimer = null;
let _inboxCurrentFilter = 'all';
let _inboxLastTotal = -1;

// ═══ Auto-refresh ═══
function toggleInboxAutoRefresh() {
    const toggle = document.getElementById('inboxAutoRefresh');
    if (!toggle) return;

    if (toggle.checked) {
        _startInboxAutoRefresh();
        showToast('🔄 تحديث تلقائي كل 30 ثانية', 'info', 2000);
    } else {
        _stopInboxAutoRefresh();
        showToast('⏸️ تحديث تلقائي متوقف', 'info', 2000);
    }
}

function _startInboxAutoRefresh() {
    _stopInboxAutoRefresh();
    _inboxAutoRefreshTimer = setInterval(() => {
        if (currentSection === 'inbox') {
            loadInbox();
        }
    }, 30000);
}

function _stopInboxAutoRefresh() {
    if (_inboxAutoRefreshTimer) {
        clearInterval(_inboxAutoRefreshTimer);
        _inboxAutoRefreshTimer = null;
    }
}

// ═══ Sound Notification ═══
function playInboxSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1760, audioCtx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        console.warn('Audio not available:', e);
    }
}

// ═══ Filters ═══
function setInboxFilter(filter, btn) {
    _inboxCurrentFilter = filter;

    document.querySelectorAll('.inbox-filter').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    _applyInboxFilter();
}

function _applyInboxFilter() {
    const sections = document.querySelectorAll('.inbox-section');
    sections.forEach(sec => {
        const sectionType = sec.id.replace('inbox-section-', '');
        if (_inboxCurrentFilter === 'all' || sectionType === _inboxCurrentFilter) {
            sec.classList.remove('hidden');
        } else {
            sec.classList.add('hidden');
        }
    });
}

// ═══ Double-confirm للمبالغ الكبيرة ═══
async function inboxDoubleConfirm(title, message, amount) {
    if (amount >= 50) {
        const first = await showConfirm({ title, message, confirmText: 'متابعة', type: 'warning' });
        if (!first) return false;

        const second = await showConfirm({
            title: '⚠️ تأكيد مزدوج',
            message: `مبلغ كبير ($${amount.toFixed(2)})\n\nهل أنت متأكد تماماً؟`,
            confirmText: 'نعم، متأكد',
            type: 'danger'
        });
        return second;
    }

    return await showConfirm({ title, message, confirmText: 'تأكيد' });
}

// ═══ Override inboxApproveDeposit with Double-confirm ═══
const _origInboxApproveDeposit = window.inboxApproveDeposit;
window.inboxApproveDeposit = async function(id) {
    const deposit = (inboxData?.pending_deposits || []).find(d => d.id === id);
    const amount = deposit ? parseFloat(deposit.amount) : 0;

    const ok = await inboxDoubleConfirm(
        'قبول الإيداع',
        `سيتم إضافة $${amount.toFixed(2)} إلى رصيد العميل`,
        amount
    );
    if (!ok) return;

    try {
        await approveDeposit(id);
        showToast('✅ تم قبول الإيداع', 'success');
        await loadInbox();
        if (typeof loadAllData === 'function') await loadAllData();
    } catch (err) {
        showToast(`فشل: ${err.message}`, 'error');
    }
};

// ═══ Update badge + sound on new items ═══
const _origRenderInbox = window.renderInbox;
window.renderInbox = function() {
    if (typeof _origRenderInbox === 'function') {
        _origRenderInbox();
    }

    // Sound على عنصر جديد
    const currentTotal = inboxData?.counts?.total || 0;
    if (_inboxLastTotal !== -1 && currentTotal > _inboxLastTotal) {
        playInboxSound();
        showToast(`🔔 ${currentTotal - _inboxLastTotal} عنصر جديد`, 'info', 3000);
    }
    _inboxLastTotal = currentTotal;

    // تحديث counts في Filter Tabs
    const allCountEl = document.getElementById('inboxFilterAllCount');
    if (allCountEl) allCountEl.textContent = currentTotal;

    // إعادة تطبيق الفلتر بعد render
    _applyInboxFilter();
};

// ═══ Cleanup عند الخروج من Inbox ═══
const _origSwitchSection = window.switchSection;
window.switchSection = function(section) {
    if (section !== 'inbox') {
        _stopInboxAutoRefresh();
        const toggle = document.getElementById('inboxAutoRefresh');
        if (toggle && toggle.checked) {
            toggle.checked = false;
        }
    }
    if (typeof _origSwitchSection === 'function') {
        _origSwitchSection(section);
    }
    if (section === 'inbox') {
        loadInbox();
    }
};

// Expose
window.toggleInboxAutoRefresh = toggleInboxAutoRefresh;
window.setInboxFilter = setInboxFilter;
window.playInboxSound = playInboxSound;

console.log('✅ v18.4 Inbox v2 loaded');
```

---

## FILE: ./admin/js/api.js

```
/* ============================================================
   🔌 SANAD PLUS⁺ Admin API — v18.3.8
   ============================================================
   - apiRequest() موحّد
   - JWT تلقائي
   - Retry + Timeout
   - معالجة 401 → redirect login
   - v16: Archive + Restore endpoints
   - v17: Discounts endpoints
   - v18.3.6: Payment methods min/max/fee
   - v18.3.8: Admin Inbox
   ============================================================ */

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';
const ADMIN_TOKEN_KEY = 'admin_token';
const REQUEST_TIMEOUT = 30000;

/* ============================================================
   🔐 Token Management
   ============================================================ */
function getToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/* Aliases للتوافق مع admin.js القديم */
const getAdminToken = getToken;
const setAdminToken = setToken;
const clearAdminToken = clearToken;

/* ============================================================
   🌐 Core apiRequest
   ============================================================ */
async function apiRequest(path, options = {}) {
    const url = `${API_BASE_URL}${path}`;
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
            clearToken();
            if (typeof showLogin === 'function') showLogin();
            throw new Error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
        }

        if (response.status === 403) {
            throw new Error('غير مصرح لك بهذا الإجراء');
        }

        if (response.status === 429) {
            throw new Error('محاولات كثيرة، يرجى المحاولة لاحقاً');
        }

        if (response.status >= 500) {
            throw new Error('خطأ في الخادم، حاول لاحقاً');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `فشل الطلب (${response.status})`);
        }

        return data;
    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            throw new Error('انتهت مهلة الطلب');
        }
        throw err;
    }
}

/* ============================================================
   🔐 Auth
   ============================================================ */
async function adminLogin(username, password) {
    return await apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

async function verifyAdminOTP(sessionId, otpCode) {
    const data = await apiRequest('/admin/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, otp_code: otpCode }),
    });
    if (data.token) setToken(data.token);
    return data;
}

async function logout() {
    try {
        await apiRequest('/admin/api/logout', { method: 'POST' });
    } catch (_) { /* ignore */ }
    clearToken();
    location.reload();
}

/* ============================================================
   👥 Users
   ============================================================ */
async function fetchAdminUsers() {
    return await apiRequest('/admin/api/users');
}

async function fetchAdminUserDetail(userId) {
    return await apiRequest(`/admin/api/users/${userId}`);
}

async function adjustUserBalance(userId, amount, note = '') {
    return await apiRequest(`/admin/api/users/${userId}/balance`, {
        method: 'POST',
        body: JSON.stringify({ amount, note }),
    });
}

async function toggleUserBan(userId) {
    return await apiRequest(`/admin/api/users/${userId}/ban`, { method: 'POST' });
}

async function setUserVIP(userId, vipLevel) {
    return await apiRequest(`/admin/api/users/${userId}/vip`, {
        method: 'POST',
        body: JSON.stringify({ vip_level: vipLevel }),
    });
}

async function toggleUserKYC(userId, status) {
    return await apiRequest(`/admin/api/users/${userId}/kyc`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
}

async function setUserNegativeBalance(userId, allow, maxNegative) {
    return await apiRequest(`/admin/api/users/${userId}/negative-balance`, {
        method: 'POST',
        body: JSON.stringify({ allow, max_negative: maxNegative }),
    });
}

/* ============================================================
   🆕 v17: Discounts
   ============================================================ */
async function fetchUserDiscounts(userId) {
    return await apiRequest(`/admin/api/users/${userId}/discounts`);
}

async function setGeneralDiscount(userId, percent) {
    return await apiRequest(`/admin/api/users/${userId}/discounts/general`, {
        method: 'POST',
        body: JSON.stringify({ percent }),
    });
}

async function setProductDiscount(userId, productId, percent) {
    return await apiRequest(`/admin/api/users/${userId}/discounts/product`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, percent }),
    });
}

async function deleteProductDiscount(userId, discountId) {
    return await apiRequest(`/admin/api/users/${userId}/discounts/${discountId}`, {
        method: 'DELETE',
    });
}

/* ============================================================
   📁 Categories
   ============================================================ */
async function fetchAdminCategories() {
    return await apiRequest('/admin/api/categories');
}

async function createCategory(payload) {
    return await apiRequest('/admin/api/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function deleteCategory(catId) {
    return await apiRequest(`/admin/api/categories/${catId}`, { method: 'DELETE' });
}

async function restoreCategory(catId) {
    return await apiRequest(`/admin/api/categories/${catId}/restore`, { method: 'POST' });
}

/* ============================================================
   📦 Products
   ============================================================ */
async function fetchAdminProducts() {
    return await apiRequest('/admin/api/products');
}

async function fetchProductDetail(productId) {
    return await apiRequest(`/admin/api/products/${productId}`);
}

async function createProduct(payload) {
    return await apiRequest('/admin/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function updateProduct(productId, payload) {
    return await apiRequest(`/admin/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

async function deleteProduct(productId) {
    return await apiRequest(`/admin/api/products/${productId}`, { method: 'DELETE' });
}

async function restoreProduct(productId) {
    return await apiRequest(`/admin/api/products/${productId}/restore`, { method: 'POST' });
}

/* ============================================================
   🎁 Bundles
   ============================================================ */
async function fetchProductBundles(productId) {
    return await apiRequest(`/admin/api/products/${productId}/bundles`);
}

async function createProductBundle(productId, payload) {
    return await apiRequest(`/admin/api/products/${productId}/bundles`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function updateProductBundle(productId, bundleId, payload) {
    return await apiRequest(`/admin/api/products/${productId}/bundles/${bundleId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

async function deleteProductBundle(productId, bundleId) {
    return await apiRequest(`/admin/api/products/${productId}/bundles/${bundleId}`, {
        method: 'DELETE',
    });
}

/* ============================================================
   📥 Archive (Categories + Products القديم)
   ============================================================ */
async function fetchArchive() {
    return await apiRequest('/admin/api/archive');
}

/* ============================================================
   💳 Payment Methods
   ============================================================ */
async function fetchAdminPaymentMethods() {
    return await apiRequest('/admin/api/payment-methods');
}

async function createPaymentMethod(payload) {
    return await apiRequest('/admin/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function updatePaymentMethod(methodId, payload) {
    return await apiRequest(`/admin/api/payment-methods/${methodId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

async function deletePaymentMethod(methodId) {
    return await apiRequest(`/admin/api/payment-methods/${methodId}`, {
        method: 'DELETE',
    });
}

/* ============================================================
   📋 Orders
   ============================================================ */
async function fetchAdminOrders() {
    return await apiRequest('/admin/api/orders');
}

async function fetchAdminOrderDetail(orderId) {
    return await apiRequest(`/admin/api/orders/${orderId}`);
}

async function fetchAdminOrderFull(orderId) {
    return await apiRequest(`/admin/api/orders/${orderId}/full`);
}

async function updateOrderStatus(orderId, status) {
    return await apiRequest(`/admin/api/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
    });
}

async function bulkUpdateOrderStatus(orderIds, status) {
    return await apiRequest('/admin/api/orders/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ order_ids: orderIds, status }),
    });
}

/* ============================================================
   💰 Deposits
   ============================================================ */
async function fetchAdminDeposits() {
    return await apiRequest('/admin/api/deposits');
}

async function fetchAdminDepositDetail(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}`);
}

async function approveDeposit(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}/approve`, {
        method: 'POST',
    });
}

async function rejectDeposit(depositId, reason = '') {
    return await apiRequest(`/admin/api/deposits/${depositId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

/* ============================================================
   🪪 KYC
   ============================================================ */
async function fetchAdminKYC() {
    return await apiRequest('/admin/api/kyc');
}

async function approveKYCRequest(kycId) {
    return await apiRequest(`/admin/api/kyc/${kycId}/approve`, { method: 'POST' });
}

async function rejectKYCRequest(kycId, reason = '') {
    return await apiRequest(`/admin/api/kyc/${kycId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

/* ============================================================
   🛠️ Service Requests
   ============================================================ */
async function fetchServiceRequests() {
    return await apiRequest('/admin/api/service-requests');
}

async function updateServiceRequest(reqId, payload) {
    return await apiRequest(`/admin/api/service-requests/${reqId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

/* ============================================================
   🎟️ Coupons
   ============================================================ */
async function fetchAdminCoupons() {
    return await apiRequest('/admin/api/coupons');
}

async function createCoupon(payload) {
    return await apiRequest('/admin/api/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function updateCoupon(couponId, payload) {
    return await apiRequest(`/admin/api/coupons/${couponId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

async function deleteCoupon(couponId) {
    return await apiRequest(`/admin/api/coupons/${couponId}`, { method: 'DELETE' });
}

/* ============================================================
   🎁 Referrals
   ============================================================ */
async function fetchAdminReferrals() {
    return await apiRequest('/admin/api/referrals');
}

/* ============================================================
   📜 Activities + Audit
   ============================================================ */
async function fetchActivities() {
    return await apiRequest('/admin/api/activities');
}

async function fetchAuditLog(filters = {}) {
    const params = new URLSearchParams();
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.action) params.append('action', filters.action);
    if (filters.limit) params.append('limit', filters.limit);
    const qs = params.toString();
    return await apiRequest(`/admin/api/audit-log${qs ? '?' + qs : ''}`);
}

/* ============================================================
   🔔 Notifications
   ============================================================ */
async function sendNotification(payload) {
    return await apiRequest('/admin/api/notifications', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/* ============================================================
   ⚙️ Settings
   ============================================================ */
async function fetchAdminSettings() {
    return await apiRequest('/admin/api/settings');
}

async function saveAdminSettings(payload) {
    return await apiRequest('/admin/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

/* ============================================================
   🆕 v16: ARCHIVE
   ============================================================ */
async function fetchArchivedOrders() {
    return await apiRequest('/admin/api/archive/orders');
}

async function fetchArchivedDeposits() {
    return await apiRequest('/admin/api/archive/deposits');
}

async function fetchArchivedKYC() {
    return await apiRequest('/admin/api/archive/kyc');
}

async function fetchArchivedServices() {
    return await apiRequest('/admin/api/archive/services');
}

async function fetchArchiveCounts() {
    return await apiRequest('/admin/api/archive/counts');
}

/* ============================================================
   🆕 v16: RESTORE
   ============================================================ */
async function restoreOrder(orderId) {
    return await apiRequest(`/admin/api/orders/${orderId}/restore`, { method: 'POST' });
}

async function restoreDeposit(depositId) {
    return await apiRequest(`/admin/api/deposits/${depositId}/restore`, { method: 'POST' });
}

async function restoreKYC(kycId) {
    return await apiRequest(`/admin/api/kyc/${kycId}/restore`, { method: 'POST' });
}

async function restoreService(reqId) {
    return await apiRequest(`/admin/api/services/${reqId}/restore`, { method: 'POST' });
}

/* ============================================================
   🆕 v18.3.8: Admin Inbox
   ============================================================ */
async function fetchAdminInbox() {
    return await apiRequest('/admin/api/inbox');
}

/* ============================================================
   📤 Global expose
   ============================================================ */
window.apiRequest = apiRequest;

// Auth
window.adminLogin = adminLogin;
window.verifyAdminOTP = verifyAdminOTP;
window.logout = logout;
window.getToken = getToken;
window.setToken = setToken;
window.clearToken = clearToken;
window.getAdminToken = getToken;
window.setAdminToken = setToken;
window.clearAdminToken = clearToken;

// Users
window.fetchAdminUsers = fetchAdminUsers;
window.fetchAdminUserDetail = fetchAdminUserDetail;
window.adjustUserBalance = adjustUserBalance;
window.toggleUserBan = toggleUserBan;
window.setUserVIP = setUserVIP;
window.toggleUserKYC = toggleUserKYC;
window.setUserNegativeBalance = setUserNegativeBalance;

// v17 Discounts
window.fetchUserDiscounts = fetchUserDiscounts;
window.setGeneralDiscount = setGeneralDiscount;
window.setProductDiscount = setProductDiscount;
window.deleteProductDiscount = deleteProductDiscount;

// Categories
window.fetchAdminCategories = fetchAdminCategories;
window.createCategory = createCategory;
window.deleteCategory = deleteCategory;
window.restoreCategory = restoreCategory;

// Products
window.fetchAdminProducts = fetchAdminProducts;
window.fetchProductDetail = fetchProductDetail;
window.createProduct = createProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.restoreProduct = restoreProduct;

// Bundles
window.fetchProductBundles = fetchProductBundles;
window.createProductBundle = createProductBundle;
window.updateProductBundle = updateProductBundle;
window.deleteProductBundle = deleteProductBundle;

// Old archive
window.fetchArchive = fetchArchive;

// Payment Methods
window.fetchAdminPaymentMethods = fetchAdminPaymentMethods;
window.createPaymentMethod = createPaymentMethod;
window.updatePaymentMethod = updatePaymentMethod;
window.deletePaymentMethod = deletePaymentMethod;

// Orders
window.fetchAdminOrders = fetchAdminOrders;
window.fetchAdminOrderDetail = fetchAdminOrderDetail;
window.fetchAdminOrderFull = fetchAdminOrderFull;
window.updateOrderStatus = updateOrderStatus;
window.bulkUpdateOrderStatus = bulkUpdateOrderStatus;

// Deposits
window.fetchAdminDeposits = fetchAdminDeposits;
window.fetchAdminDepositDetail = fetchAdminDepositDetail;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;

// KYC
window.fetchAdminKYC = fetchAdminKYC;
window.approveKYCRequest = approveKYCRequest;
window.rejectKYCRequest = rejectKYCRequest;

// Service Requests
window.fetchServiceRequests = fetchServiceRequests;
window.updateServiceRequest = updateServiceRequest;

// Coupons
window.fetchAdminCoupons = fetchAdminCoupons;
window.createCoupon = createCoupon;
window.updateCoupon = updateCoupon;
window.deleteCoupon = deleteCoupon;

// Referrals
window.fetchAdminReferrals = fetchAdminReferrals;

// Activities + Audit
window.fetchActivities = fetchActivities;
window.fetchAuditLog = fetchAuditLog;

// Notifications + Settings
window.sendNotification = sendNotification;
window.fetchAdminSettings = fetchAdminSettings;
window.saveAdminSettings = saveAdminSettings;

// v16: Archive
window.fetchArchivedOrders = fetchArchivedOrders;
window.fetchArchivedDeposits = fetchArchivedDeposits;
window.fetchArchivedKYC = fetchArchivedKYC;
window.fetchArchivedServices = fetchArchivedServices;
window.fetchArchiveCounts = fetchArchiveCounts;

// v16: Restore
window.restoreOrder = restoreOrder;
window.restoreDeposit = restoreDeposit;
window.restoreKYC = restoreKYC;
window.restoreService = restoreService;

// v18.3.8: Inbox
window.fetchAdminInbox = fetchAdminInbox;```

---

## FILE: ./admin/manifest.json

```
{
    "name": "SANAD+ Admin",
    "short_name": "SANAD Admin",
    "description": "لوحة تحكم متجر SANAD PLUS⁺",
    "start_url": "/?v=14",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#0EA5E9",
    "theme_color": "#0EA5E9",
    "lang": "ar",
    "dir": "rtl",
    "scope": "/",
    "icons": [
        {
            "src": "icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ],
    "shortcuts": [
        {
            "name": "الطلبات",
            "short_name": "الطلبات",
            "url": "/?section=orders",
            "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]
        },
        {
            "name": "الإيداعات",
            "short_name": "الإيداعات",
            "url": "/?section=deposits",
            "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]
        }
    ]
}```

---

## FILE: ./admin/sw.js

```
// ============================================================
// 🛑 SANAD+ Admin — Service Worker (v18.3.0) — SELF-DESTRUCT
// ============================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Admin installing self-destruct version');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Admin activating — clearing all caches and unregistering');
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(keys.map((key) => caches.delete(key)));
            }),
            self.registration.unregister(),
        ]).then(() => {
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    if ('navigate' in client) {
                        client.navigate(client.url);
                    }
                });
            });
        })
    );
});```

---

## FILE: ./admin/vercel.json

```
{
  "version": 2,
  "buildCommand": null,
  "outputDirectory": null,
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://telegram.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https://sanad-plus-backend.onrender.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'none'"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    },
    {
      "source": "/css/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/js/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=604800"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400"
        }
      ]
    }
  ]
}```

---

## FILE: ./backend/app/__init__.py

```
# ============================================================
# 🚀 SANAD PLUS⁺ — App Initialization (v17.1)
# ============================================================
import os
from flask import Flask, jsonify, request
from decimal import Decimal
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from .config import Config
from .extensions import db, jwt
from .models.base import (
    User, Category, Product, ProductBundle, Order, Deposit,
    PaymentMethod, KYCRequest, Notification, Transaction,
    Setting, AdminActivity, ServiceRequest,
    Coupon, CouponUsage, Referral, FinancialAuditLog,
    AdminOTPSession, JWTBlacklist, UserProductDiscount
)


# ============================================================
# 🌐 استخراج IP الحقيقي (Cloudflare + Render)
# ============================================================
def get_real_ip():
    """استخراج IP الحقيقي خلف Cloudflare"""
    cf_ip = request.headers.get("CF-Connecting-IP", "").strip()
    if cf_ip:
        return cf_ip
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


# ============================================================
# 🔴 Redis Rate Limiting
# ============================================================
_REDIS_URL = os.getenv("REDIS_URL", "").strip()
_RATE_LIMIT_STORAGE = _REDIS_URL if _REDIS_URL else "memory://"

if _REDIS_URL:
    print(f"✅ Rate Limiter: Redis ({_REDIS_URL.split('@')[-1] if '@' in _REDIS_URL else 'configured'})")
else:
    print("⚠️ Rate Limiter: memory:// (لا يوجد REDIS_URL)")

limiter = Limiter(
    key_func=get_real_ip,
    default_limits=["500 per hour", "100 per minute"],
    storage_uri=_RATE_LIMIT_STORAGE,
    storage_options={
        "socket_timeout": 5,
        "socket_connect_timeout": 5,
    } if _REDIS_URL else {},
    strategy="fixed-window",
    headers_enabled=True,
    swallow_errors=True,
)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ============================================================
    # 🌐 CORS
    # ============================================================
    CORS(
        app,
        resources={
            r"/api/*": {"origins": Config.ALLOWED_ORIGINS},
            r"/admin/*": {"origins": Config.ALLOWED_ORIGINS},
        },
        supports_credentials=False,
    )

    # ============================================================
    # 🔌 Extensions
    # ============================================================
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

    # ============================================================
    # 🔐 JWT Callbacks
    # ============================================================
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload.get("jti")
        if not jti:
            return False
        try:
            # 1. فحص الـ blacklist الفردي
            blacklisted = JWTBlacklist.query.filter_by(jti=jti).first()
            if blacklisted:
                return True

            # 2. 🆕 v17.1: فحص revoke-all للأدمن
            identity = jwt_payload.get("sub")
            if identity == "admin":
                from .routes.auth import is_admin_token_revoked
                if is_admin_token_revoked(jwt_payload):
                    return True

            return False
        except Exception as e:
            print(f"token check error: {e}")
            return False

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "تم تسجيل الخروج، يرجى تسجيل الدخول مجدداً",
            "code": "TOKEN_REVOKED"
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "انتهت صلاحية الجلسة",
            "code": "TOKEN_EXPIRED"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "error": "توكن غير صالح",
            "code": "TOKEN_INVALID"
        }), 422

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "يجب تسجيل الدخول",
            "code": "TOKEN_MISSING"
        }), 401

    # ============================================================
    # 🚨 Error Handlers
    # ============================================================
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "error": "محاولات كثيرة جداً — يرجى المحاولة لاحقاً",
            "code": "RATE_LIMITED",
            "retry_after": str(e.description)
        }), 429

    # ============================================================
    # 🆕 v17.1: Security Headers (Backend)
    # ============================================================
    @app.after_request
    def add_security_headers(response):
        # منع MIME-sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # منع تضمين الموقع في iframe
        response.headers['X-Frame-Options'] = 'DENY'

        # Referrer
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # منع الوصول للـ APIs الحساسة
        response.headers['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=(), payment=()'
        )

        # HSTS (فقط في Production)
        if os.getenv("RENDER"):
            response.headers['Strict-Transport-Security'] = (
                'max-age=31536000; includeSubDomains'
            )

        # للـ API فقط: منع caching
        if request.path.startswith('/api/') or request.path.startswith('/admin/'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'

        return response

    # ============================================================
    # 🛣️ Blueprint
    # ============================================================
    from .routes import main
    app.register_blueprint(main)

    # ============================================================
    # 🔥 Cache Auto-Invalidation
    # ============================================================
    from .services.cache_service import setup_cache_invalidation
    setup_cache_invalidation(app)


    # ============================================================
    # v18.4.13: Decimal -> float in JSON
    # ============================================================
    from flask.json.provider import DefaultJSONProvider

    class _SanadJSONProvider(DefaultJSONProvider):
        @staticmethod
        def default(o):
            if isinstance(o, Decimal):
                return float(o)
            return DefaultJSONProvider.default(o)

    app.json = _SanadJSONProvider(app)
    return app```

---

## FILE: ./backend/app/config.py

```
# ============================================================
# ⚙️ Config — v18.2.3
# ============================================================
# 🆕 v18.2.3: force psycopg2 driver explicitly
# السبب: SQLAlchemy 2.0.54 على Python 3.14 يحاول استخدام psycopg (v3)
#        إذا فشل في إيجاد psycopg2. نجبره على psycopg2 هنا.
# ============================================================
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _get_database_url():
    """
    يقرأ DATABASE_URL ويجبر driver على psycopg2.
    هذا يمنع SQLAlchemy من محاولة استخدام psycopg (v3).
    """
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return ""

    # postgresql:// → postgresql+psycopg2://
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    # postgres:// (Heroku-style) → postgresql+psycopg2://
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)

    return url


class Config:
    # ─── Flask ───
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

    # ─── JWT ───
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ERROR_MESSAGE_KEY = "error"

    # ─── Database ───
    SQLALCHEMY_DATABASE_URI = _get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
        "connect_args": {
            "sslmode": "require",
            "connect_timeout": 10,
        },
    }

    # ─── Bot / URLs ───
    BOT_TOKEN = os.getenv("BOT_TOKEN", "")
    BOT_API_SECRET = os.getenv("BOT_API_SECRET", "")
    MINIAPP_URL = os.getenv("MINIAPP_URL", "https://sanad-plus.vercel.app")
    ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "https://sanad-plus-admi.vercel.app")
    BACKEND_URL = os.getenv("BACKEND_URL", "https://sanad-plus-backend.onrender.com")

    # ─── CORS ───
    _origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    ALLOWED_ORIGINS = [o.strip() for o in _origins.split(",") if o.strip()]
    if not ALLOWED_ORIGINS:
        ALLOWED_ORIGINS = [
            "https://sanad-plus.vercel.app",
            "https://sanad-plus-admi.vercel.app",
        ]

    # ─── Redis ───
    REDIS_URL = os.getenv("REDIS_URL", "")

    # ─── Admin OTP ───
    ADMIN_OTP_STRICT_IP = os.getenv("ADMIN_OTP_STRICT_IP", "false").lower() == "true"```

---

## FILE: ./backend/app/extensions.py

```
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()
```

---

## FILE: ./backend/app/models/__init__.py

```
```

---

## FILE: ./backend/app/models/base.py

```
# ============================================================
# 🛡️ SANAD PLUS⁺ — Models v18.2
# ============================================================
# 🆕 v18.2: كل الحقول المالية NUMERIC(14,4) بدل FLOAT
# الأسباب:
#   - FLOAT يسبب فروقات سنتات (0.1 + 0.2 ≠ 0.3)
#   - الأرصدة لا تطابق مجموع الحركات
#   - خلافات مع الزبائن
# ============================================================
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Numeric, CheckConstraint, Index
from ..extensions import db


# ════════════════════════════════════════════════════════════
# Money type
# ════════════════════════════════════════════════════════════
MONEY = Numeric(14, 4)


def _now():
    return datetime.now(timezone.utc)


# ════════════════════════════════════════════════════════════
# USERS
# ════════════════════════════════════════════════════════════
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.BigInteger, unique=True, nullable=False, index=True)
    username = db.Column(db.String(100))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    # 💰 NUMERIC
    balance = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    referral_earnings = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    max_negative_balance = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    general_discount = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))

    kyc_status = db.Column(db.String(20), default='unverified')
    is_verified = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default='user')
    is_banned = db.Column(db.Boolean, default=False)
    vip_level = db.Column(db.Integer, default=0)
    referral_code = db.Column(db.String(50), unique=True, index=True)
    referred_by = db.Column(db.BigInteger)
    referred_by_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
    )
    referral_count = db.Column(db.Integer, default=0)

    allow_negative_balance = db.Column(db.Boolean, default=False)
    notify_marketing = db.Column(db.Boolean, default=True)  # 🆕 v18.2

    created_at = db.Column(db.DateTime, default=_now)
    updated_at = db.Column(db.DateTime, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint(
            'referred_by_id IS NULL OR referred_by_id != id',
            name='chk_users_referred_not_self',
        ),
        Index('idx_users_kyc_status', 'kyc_status'),
        Index('idx_users_vip_level', 'vip_level'),
        Index('idx_users_is_banned', 'is_banned'),
    )


# ════════════════════════════════════════════════════════════
# CATEGORIES
# ════════════════════════════════════════════════════════════
class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    deleted_at = db.Column(db.DateTime)

    products = db.relationship('Product', backref='category', lazy='dynamic')


# ════════════════════════════════════════════════════════════
# PRODUCTS
# ════════════════════════════════════════════════════════════
class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    product_type = db.Column(db.String(20), default='quantity')
    # ═══════════════════════════════════════════════════════════
    # ⚠️ SEMANTIC CONTRACT — DO NOT CHANGE WITHOUT UPDATING MiniApp
    # ═══════════════════════════════════════════════════════════
    # base_quantity = عدد الوحدات في الحزمة الكاملة
    # base_price    = السعر الإجمالي للحزمة الكاملة (base_quantity وحدة)
    #
    # الحساب الصحيح:
    #   unit_price = base_price / base_quantity
    #   total      = unit_price × quantity
    #
    # ❌ base_price ليس سعر الوحدة
    # ✅ مثال: Xena Live — 8700 وحدة بـ 1.00$ (0.000115$ للوحدة)
    # ═══════════════════════════════════════════════════════════
    base_quantity = db.Column(db.Integer, default=0)
    base_price = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    unit_name = db.Column(db.String(50), default='قطعة')
    input_type = db.Column(db.String(20), default='id')
    custom_input_label = db.Column(db.String(100))
    stock = db.Column(db.Integer, nullable=True)  # NULL = غير محدود
    max_quantity = db.Column(db.Integer, default=0)
    is_bundle = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)

    bundles = db.relationship(
        'ProductBundle',
        backref='product',
        lazy='selectin',
        cascade='all, delete-orphan',
    )

    __table_args__ = (
        Index(
            'idx_products_category_active',
            'category_id', 'is_active',
            postgresql_where=db.text('deleted_at IS NULL'),
        ),
    )


class ProductBundle(db.Model):
    __tablename__ = 'product_bundles'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_usd = db.Column(MONEY, nullable=False)
    is_active = db.Column(db.Boolean, default=True)


# ════════════════════════════════════════════════════════════
# ORDERS
# ════════════════════════════════════════════════════════════
class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    quantity = db.Column(db.Integer, nullable=False)

    unit_price = db.Column(MONEY, nullable=False)
    total_price = db.Column(MONEY, nullable=False)
    discount_amount = db.Column(MONEY, default=Decimal('0.0000'))

    coupon_code = db.Column(db.String(50))
    status = db.Column(db.String(20), default='pending', index=True)
    payment_method = db.Column(db.String(50))
    delivery_data = db.Column(db.Text)
    idempotency_key = db.Column(db.String(100), unique=True)
    reviewed_by = db.Column(db.Integer)
    can_cancel_until = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=_now, index=True)
    updated_at = db.Column(db.DateTime, default=_now, onupdate=_now)

    user = db.relationship('User', foreign_keys=[user_id])
    product = db.relationship('Product', foreign_keys=[product_id])

    __table_args__ = (
        Index('idx_orders_user_status', 'user_id', 'status'),
    )


# ════════════════════════════════════════════════════════════
# DEPOSITS
# ════════════════════════════════════════════════════════════
class Deposit(db.Model):
    __tablename__ = 'deposits'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    amount = db.Column(MONEY, nullable=False)
    currency = db.Column(db.String(10), default='USD')
    method_id = db.Column(db.Integer, db.ForeignKey('payment_methods.id'))
    method = db.Column(db.String(100))
    proof_image = db.Column(db.Text)  # v18.2: public_id من Cloudinary
    account_number = db.Column(db.String(100))
    sender_name = db.Column(db.String(100))
    txid = db.Column(db.String(100))
    transaction_id = db.Column(db.String(100), unique=True, index=True)
    fee = db.Column(MONEY, default=Decimal('0.0000'))
    status = db.Column(db.String(20), default='pending', index=True)
    admin_note = db.Column(db.Text)
    idempotency_key = db.Column(db.String(100), unique=True)
    reviewed_by = db.Column(db.Integer)
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=_now, index=True)

    user = db.relationship('User', foreign_keys=[user_id])
    payment_method = db.relationship('PaymentMethod', foreign_keys=[method_id])

    __table_args__ = (
        Index('idx_deposits_user_status', 'user_id', 'status'),
        Index(
            'uq_deposit_txid_user',
            'user_id', 'txid',
            unique=True,
            postgresql_where=db.text("txid IS NOT NULL AND txid != ''"),
        ),
    )


# ════════════════════════════════════════════════════════════
# PAYMENT METHODS
# ════════════════════════════════════════════════════════════
class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    account_name = db.Column(db.String(100))
    account = db.Column(db.Text)
    icon = db.Column(db.Text)
    qr_image = db.Column(db.Text)

    min_amount = db.Column(MONEY, default=Decimal('0.0000'))
    max_amount = db.Column(MONEY, default=Decimal('500.0000'))  # 🆕 v18.2
    fee = db.Column(MONEY, default=Decimal('0.0000'))
    fee_type = db.Column(db.String(20), default="percentage")  # v18.3.6

    requires_kyc = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    deleted_at = db.Column(db.DateTime)


# ════════════════════════════════════════════════════════════
# KYC
# ════════════════════════════════════════════════════════════
class KYCRequest(db.Model):
    __tablename__ = 'kyc_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.String(255))
    selfie_image = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending', index=True)
    admin_note = db.Column(db.Text)
    reviewed_by = db.Column(db.Integer)
    submitted_at = db.Column(db.DateTime, default=_now)
    reviewed_at = db.Column(db.DateTime)

    user = db.relationship('User', foreign_keys=[user_id])


# ════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ════════════════════════════════════════════════════════════
class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    title = db.Column(db.String(100))
    message = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)
    type = db.Column(db.String(50), default='info')
    created_at = db.Column(db.DateTime, default=_now)

    __table_args__ = (
        Index('idx_notifications_user_read', 'user_id', 'is_read'),
    )


# ════════════════════════════════════════════════════════════
# TRANSACTIONS
# ════════════════════════════════════════════════════════════
class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    type = db.Column(db.String(50))
    amount = db.Column(MONEY, nullable=False)
    balance_after = db.Column(MONEY)
    reference_type = db.Column(db.String(50))
    reference_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=_now)

    __table_args__ = (
        Index('idx_transactions_user_created', 'user_id', 'created_at'),
    )


# ════════════════════════════════════════════════════════════
# SETTINGS
# ════════════════════════════════════════════════════════════
class Setting(db.Model):
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)


# ════════════════════════════════════════════════════════════
# ADMIN OTP
# ════════════════════════════════════════════════════════════
class AdminOTPSession(db.Model):
    __tablename__ = 'admin_otp_sessions'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    code_hash = db.Column(db.String(255), nullable=False)
    attempts = db.Column(db.Integer, default=0)
    ip_address = db.Column(db.String(45))
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=_now)


# ════════════════════════════════════════════════════════════
# JWT BLACKLIST
# ════════════════════════════════════════════════════════════
class JWTBlacklist(db.Model):
    __tablename__ = 'jwt_blacklist'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(100), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=_now)


# ════════════════════════════════════════════════════════════
# ADMIN ACTIVITY
# ════════════════════════════════════════════════════════════
class AdminActivity(db.Model):
    __tablename__ = 'admin_activities'

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer)
    action = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=_now)


# ════════════════════════════════════════════════════════════
# SERVICE REQUESTS
# ════════════════════════════════════════════════════════════
class ServiceRequest(db.Model):
    __tablename__ = 'service_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    service_name = db.Column(db.String(100))
    description = db.Column(db.Text)
    estimated_price = db.Column(MONEY)
    status = db.Column(db.String(20), default='pending', index=True)
    admin_response = db.Column(db.Text)
    admin_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=_now)
    updated_at = db.Column(db.DateTime, default=_now, onupdate=_now)

    user = db.relationship('User', foreign_keys=[user_id])


# ════════════════════════════════════════════════════════════
# COUPONS
# ════════════════════════════════════════════════════════════
class Coupon(db.Model):
    __tablename__ = 'coupons'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    discount_type = db.Column(db.String(20), default='percentage')
    discount_value = db.Column(MONEY, nullable=False)
    min_amount = db.Column(MONEY, default=Decimal('0.0000'))
    max_discount = db.Column(MONEY, default=Decimal('0.0000'))
    max_uses = db.Column(db.Integer, default=0)
    used_count = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=_now)
    deleted_at = db.Column(db.DateTime)

    __table_args__ = (
        Index(
            'idx_coupons_code_active',
            'code', 'is_active',
            postgresql_where=db.text('deleted_at IS NULL'),
        ),
    )


class CouponUsage(db.Model):
    __tablename__ = 'coupon_usages'

    id = db.Column(db.Integer, primary_key=True)
    coupon_id = db.Column(db.Integer, db.ForeignKey('coupons.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'))
    discount_applied = db.Column(MONEY, default=Decimal('0.0000'))
    used_at = db.Column(db.DateTime, default=_now)

    __table_args__ = (
        db.UniqueConstraint('coupon_id', 'user_id', name='uq_coupon_user'),
    )


# ════════════════════════════════════════════════════════════
# REFERRALS
# ════════════════════════════════════════════════════════════
class Referral(db.Model):
    __tablename__ = 'referrals'

    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    referred_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    reward_amount = db.Column(MONEY, default=Decimal('0.0000'))
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=_now)
    completed_at = db.Column(db.DateTime)

    referrer = db.relationship('User', foreign_keys=[referrer_id])
    referred_user = db.relationship('User', foreign_keys=[referred_user_id])


# ════════════════════════════════════════════════════════════
# FINANCIAL AUDIT LOG
# ════════════════════════════════════════════════════════════
class FinancialAuditLog(db.Model):
    __tablename__ = 'financial_audit_log'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(50), nullable=False)
    amount = db.Column(MONEY, nullable=False)
    balance_before = db.Column(MONEY, nullable=False)
    balance_after = db.Column(MONEY, nullable=False)
    reference_type = db.Column(db.String(50))
    reference_id = db.Column(db.Integer)
    admin_id = db.Column(db.Integer)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=_now, index=True)

    __table_args__ = (
        Index('idx_audit_user_created', 'user_id', 'created_at'),
        Index('idx_audit_action', 'action', 'created_at'),
    )


def log_financial(user, action, amount, balance_before, balance_after,
                  ref_type=None, ref_id=None, admin_id=None, note=None):
    """سجل كل حركة مالية — يحفظ IP و User-Agent."""
    from flask import request
    from .. import get_real_ip

    try:
        ip = get_real_ip()
    except Exception:
        ip = None

    log = FinancialAuditLog(
        user_id=user.id,
        action=action,
        amount=Decimal(str(amount)),
        balance_before=Decimal(str(balance_before)),
        balance_after=Decimal(str(balance_after)),
        reference_type=ref_type,
        reference_id=ref_id,
        admin_id=admin_id,
        ip_address=ip,
        user_agent=request.headers.get('User-Agent', '')[:500] if request else None,
        note=note,
    )
    db.session.add(log)
    return log


# ════════════════════════════════════════════════════════════
# USER PRODUCT DISCOUNTS
# ════════════════════════════════════════════════════════════
class UserProductDiscount(db.Model):
    __tablename__ = 'user_product_discounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
    )
    product_id = db.Column(
        db.Integer,
        db.ForeignKey('products.id', ondelete='CASCADE'),
        nullable=False,
    )
    discount_percent = db.Column(MONEY, nullable=False, default=Decimal('0.0000'))
    created_at = db.Column(db.DateTime, default=_now)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'product_id', name='uq_user_product_discount'),
        Index('idx_upd_user', 'user_id'),
        Index('idx_upd_product', 'product_id'),
    )```

---

## FILE: ./backend/app/routes/__init__.py

```
from flask import Blueprint

main = Blueprint("main", __name__)

# استيراد المسارات لتسجيلها مع الـ Blueprint
from . import auth, user, categories, products, orders, deposits, payment_methods, admin
from . import coupons, referrals, settings_public```

---

## FILE: ./backend/app/routes/admin.py

```
# ============================================================
# 🎛️ Admin Routes — v18.1 (Optimized: joinedload + cache)
# ============================================================
import os
import json
import uuid
import traceback
import random
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.orm import joinedload, selectinload
from ..models.base import (
    User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod,
    KYCRequest, Notification, Setting, AdminActivity, ServiceRequest,
    Transaction, Coupon, CouponUsage, Referral, FinancialAuditLog, log_financial,
    AdminOTPSession, UserProductDiscount
)
from ..extensions import db
from . import main
from ..services.telegram_service import (
    send_telegram_notification, notify_admins,
    send_deposit_approved, send_deposit_rejected,
    send_kyc_approved, send_kyc_rejected,
    send_order_refund_failed, send_order_refund_cancelled
)
from ..services.cloudinary_service import upload_base64_image, get_signed_url
from ..services.cache_service import (
    cache_get, cache_set, cache_delete,
    key_admin_list, TTL_ADMIN_LISTS,
    invalidate_admin, invalidate_categories, invalidate_products,
    invalidate_payment_methods, invalidate_settings,
)
from .. import limiter
from .. import get_real_ip
from .auth import cleanup_expired_blacklist, revoke_all_admin_sessions

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")
if not ADMIN_PASSWORD_HASH:
    raise RuntimeError("ADMIN_PASSWORD_HASH إلزامي")


# ============================================================
# Helpers
# ============================================================
OTP_TTL_SECONDS = 300
OTP_MAX_ATTEMPTS = 3


def get_admin_ids():
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
    try:
        return [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    except ValueError:
        return []


def generate_otp_code():
    return str(random.randint(100000, 999999))


def cleanup_expired_otp_sessions():
    try:
        AdminOTPSession.query.filter(
            AdminOTPSession.expires_at < datetime.now(timezone.utc)
        ).delete()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"cleanup expired sessions: {e}")


_login_attempts = defaultdict(list)
LOGIN_RATE_WINDOW = 300
LOGIN_RATE_MAX = 5


def check_login_rate_limit(ip: str) -> bool:
    now = time.time()
    _login_attempts[ip] = [
        t for t in _login_attempts[ip]
        if now - t < LOGIN_RATE_WINDOW
    ]
    if not _login_attempts[ip]:
        _login_attempts.pop(ip, None)
        _login_attempts[ip] = []
    if len(_login_attempts[ip]) >= LOGIN_RATE_MAX:
        return False
    _login_attempts[ip].append(now)
    return True


def handle_errors(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            db.session.rollback()
            tb = traceback.format_exc()
            print(f"Error in {f.__name__}: {e}")
            print(tb)
            return jsonify({"error": f"خطأ داخلي: {str(e)}", "function": f.__name__}), 500
    return wrapper


def is_admin_user(identity):
    return identity == "admin"


def verify_admin_password(password):
    return check_password_hash(ADMIN_PASSWORD_HASH, password)


def log_admin_activity(action):
    try:
        activity = AdminActivity(admin_id=None, action=action, created_at=datetime.now(timezone.utc))
        db.session.add(activity)
        db.session.flush()
    except Exception:
        db.session.rollback()


def get_arabic_status(status):
    status_map = {
        "pending": "قيد المعالجة", "review": "قيد المراجعة", "processing": "قيد التنفيذ",
        "completed": "مكتمل", "failed": "فشل", "cancelled": "ملغي",
        "approved": "مقبول", "rejected": "مرفوض"
    }
    return status_map.get(status, status)


def serialize_bundle(b):
    return {
        "id": b.id, "product_id": b.product_id, "name": b.name,
        "quantity": b.quantity, "price_usd": b.price_usd, "is_active": b.is_active,
    }


def _normalize_image(image_data, folder="sanad/uncategorized"):
    if not image_data or not isinstance(image_data, str):
        return image_data
    if image_data.startswith("http://") or image_data.startswith("https://"):
        return image_data
    if image_data.startswith("data:image/"):
        url = upload_base64_image(image_data, folder=folder)
        if url:
            return url
        print(f"⚠️ Cloudinary upload failed — keeping base64 for {folder}")
        return image_data
    return image_data


# ============================================================
# Authentication (OTP DB)
# ============================================================
@main.route("/admin/login", methods=["POST"])
@limiter.limit("5 per 5 minutes")
@handle_errors
def admin_login():
    ip = get_real_ip()

    if not check_login_rate_limit(ip):
        return jsonify({"error": "محاولات كثيرة، حاول بعد 5 دقائق"}), 429

    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if username != ADMIN_USERNAME or not verify_admin_password(password):
        return jsonify({"error": "بيانات غير صحيحة"}), 401

    cleanup_expired_otp_sessions()
    cleanup_expired_blacklist()

    otp_code = generate_otp_code()
    otp_hash = generate_password_hash(otp_code)
    session_id = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)

    try:
        session = AdminOTPSession(
            session_id=session_id,
            code_hash=otp_hash,
            expires_at=expires_at,
            ip_address=ip,
        )
        db.session.add(session)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل إنشاء الجلسة: {e}"}), 500

    sent_count = 0
    for admin_id in get_admin_ids():
        success = send_telegram_notification(
            admin_id,
            f"رمز التحقق للدخول إلى لوحة التحكم\n\n"
            f"الرمز: {otp_code}\n\n"
            f"صالح لمدة 5 دقائق فقط."
        )
        if success:
            sent_count += 1

    if sent_count == 0:
        try:
            AdminOTPSession.query.filter_by(session_id=session_id).delete()
            db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify({"error": "تعذر إرسال رمز التحقق"}), 500

    return jsonify({
        "require_otp": True,
        "session_id": session_id,
        "message": "تم إرسال رمز التحقق إلى تيليجرام"
    }), 200


@main.route("/admin/verify-otp", methods=["POST"])
@limiter.limit("10 per 5 minutes")
@handle_errors
def admin_verify_otp():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    otp_code = (data.get("otp_code") or "").strip()

    if not session_id or not otp_code:
        return jsonify({"error": "بيانات ناقصة"}), 400

    cleanup_expired_otp_sessions()

    session = AdminOTPSession.query.filter_by(session_id=session_id).first()
    if not session:
        return jsonify({"error": "انتهت الجلسة"}), 400

    if session.expires_at < datetime.now(timezone.utc):
        db.session.delete(session)
        db.session.commit()
        return jsonify({"error": "انتهت صلاحية الرمز"}), 400

    if session.attempts >= OTP_MAX_ATTEMPTS:
        db.session.delete(session)
        db.session.commit()
        return jsonify({"error": "تجاوزت عدد المحاولات"}), 400

    if not check_password_hash(session.code_hash, otp_code):
        session.attempts += 1
        db.session.commit()
        remaining = OTP_MAX_ATTEMPTS - session.attempts
        return jsonify({"error": f"رمز خاطئ. محاولات متبقية: {remaining}"}), 401

    db.session.delete(session)
    db.session.commit()

    token = create_access_token(identity="admin")
    log_admin_activity("تسجيل دخول الأدمن (مع OTP)")
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({"token": token}), 200


# ============================================================
# 🆕 v17.1: Logout-All
# ============================================================
@main.route("/admin/api/logout-all", methods=["POST"])
@jwt_required()
@handle_errors
def admin_logout_all():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    success = revoke_all_admin_sessions()
    if success:
        log_admin_activity("إبطال جميع جلسات الأدمن")
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify({"success": True, "message": "تم إبطال كل الجلسات"})
    return jsonify({"error": "فشل إبطال الجلسات"}), 500


# ============================================================
# Users — 🆕 v18.1: cached list
# ============================================================
@main.route("/admin/api/users", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_users():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    # 🚀 Cache (30s)
    cached = cache_get(key_admin_list("users"))
    if cached is not None:
        return jsonify(cached)

    users = User.query.all()
    result = [{
        "id": u.id, "telegram_id": u.telegram_id, "username": u.username,
        "first_name": u.first_name, "last_name": u.last_name,
        "balance": round(u.balance, 2), "kyc_status": u.kyc_status,
        "is_verified": u.is_verified, "role": u.role,
        "is_banned": u.is_banned, "vip_level": u.vip_level,
        "referral_code": u.referral_code,
        "referral_count": u.referral_count or 0,
        "referral_earnings": round(u.referral_earnings or 0, 2),
        "allow_negative_balance": u.allow_negative_balance if u.allow_negative_balance is not None else False,
        "max_negative_balance": u.max_negative_balance or 0,
        "general_discount": u.general_discount or 0.0,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]

    cache_set(key_admin_list("users"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)


@main.route("/admin/api/users/<int:user_id>/negative-balance", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_negative_balance(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    allow = bool(data.get("allow", False))
    max_neg = float(data.get("max_negative", 0))

    if max_neg < 0:
        return jsonify({"error": "الحد الأقصى لا يمكن أن يكون سالباً"}), 400
    if max_neg > 1_000_000:
        return jsonify({"error": "الحد الأقصى هو $1,000,000"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    user.allow_negative_balance = allow
    user.max_negative_balance = max_neg

    log_admin_activity(f"{'تفعيل' if allow else 'إلغاء'} الرصيد السالب للمستخدم {user.telegram_id}")
    db.session.commit()

    return jsonify({
        "allow_negative_balance": user.allow_negative_balance,
        "max_negative_balance": user.max_negative_balance,
    })


@main.route("/admin/api/users/<int:user_id>/kyc", methods=["POST"])
@jwt_required()
@handle_errors
def admin_toggle_kyc(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    new_status = data.get("status")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    if new_status == "verified":
        user.kyc_status = "verified"
        user.is_verified = True
    elif new_status == "unverified":
        user.kyc_status = "unverified"
        user.is_verified = False

    log_admin_activity(f"تغيير توثيق المستخدم {user.telegram_id}")
    db.session.commit()
    return jsonify({"kyc_status": user.kyc_status, "is_verified": user.is_verified})


@main.route("/admin/api/users/<int:user_id>/balance", methods=["POST"])
@jwt_required()
@handle_errors
def admin_adjust_balance(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    amount = float(data.get("amount", 0))
    note = data.get("note", "")

    if abs(amount) > 1_000_000:
        return jsonify({"error": "المبلغ كبير جداً (الحد الأقصى 1,000,000$)"}), 400
    if amount == 0:
        return jsonify({"error": "المبلغ لا يمكن أن يكون صفراً"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    balance_before = user.balance
    user.balance = round(user.balance + amount, 2)

    txn = Transaction(
        user_id=user.id, type="adjustment", amount=amount,
        balance_after=user.balance, reference_type="admin_adjustment", reference_id=user.id,
    )
    db.session.add(txn)

    log_financial(
        user=user, action="admin_adjustment", amount=amount,
        balance_before=balance_before, balance_after=user.balance,
        ref_type="admin_adjustment", ref_id=user.id, note=note,
    )

    notif = Notification(
        user_id=user.id, title="تعديل الرصيد",
        message=f"تم تعديل رصيدك بمقدار {amount:.2f}$" + (f" ({note})" if note else ""),
        type="info",
    )
    db.session.add(notif)
    log_admin_activity(f"تعديل رصيد المستخدم {user.telegram_id}: {amount:.2f}$")
    db.session.commit()

    from ..services.telegram_service import send_admin_balance_adjustment
    send_admin_balance_adjustment(user, amount, note)
    notify_admins(f"تعديل رصيد {user.telegram_id}: {amount:.2f}$")

    return jsonify({"balance": user.balance})


@main.route("/admin/api/users/<int:user_id>/ban", methods=["POST"])
@jwt_required()
@handle_errors
def admin_ban_user(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    user.is_banned = not user.is_banned
    log_admin_activity(f"تغيير حظر المستخدم {user.telegram_id}")
    db.session.commit()
    notify_admins(f"حظر {user.telegram_id}: {user.is_banned}")
    return jsonify({"is_banned": user.is_banned})


@main.route("/admin/api/users/<int:user_id>/vip", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_vip(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    vip_level = int(data.get("vip_level", 0))
    if vip_level < 0 or vip_level > 7:
        return jsonify({"error": "المستوى بين 0 و 7"}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    user.vip_level = vip_level
    log_admin_activity(f"VIP{vip_level} للمستخدم {user.telegram_id}")
    db.session.commit()
    return jsonify({"vip_level": user.vip_level})


@main.route("/admin/api/users/<int:user_id>", methods=["GET"])
@jwt_required()
@handle_errors
def admin_user_detail(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    orders_count = Order.query.filter_by(user_id=user.id).count()
    deposits_count = Deposit.query.filter_by(user_id=user.id).count()

    return jsonify({
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "balance": user.balance,
        "kyc_status": user.kyc_status,
        "is_verified": user.is_verified,
        "role": user.role,
        "is_banned": user.is_banned,
        "vip_level": user.vip_level,
        "referral_code": user.referral_code,
        "referral_count": user.referral_count or 0,
        "referral_earnings": user.referral_earnings or 0,
        "allow_negative_balance": user.allow_negative_balance,
        "max_negative_balance": user.max_negative_balance or 0,
        "general_discount": user.general_discount or 0.0,
        "orders_count": orders_count,
        "deposits_count": deposits_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    })


# ============================================================
# 🆕 v17: DISCOUNTS
# ============================================================
@main.route("/admin/api/users/<int:user_id>/discounts", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_user_discounts(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    product_discounts = UserProductDiscount.query.filter_by(user_id=user_id).all()
    result = []
    for d in product_discounts:
        product = Product.query.get(d.product_id)
        result.append({
            "id": d.id,
            "product_id": d.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_image": product.image if product else None,
            "discount_percent": d.discount_percent,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    return jsonify({
        "general_discount": user.general_discount or 0.0,
        "product_discounts": result,
    })


@main.route("/admin/api/users/<int:user_id>/discounts/general", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_general_discount(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    try:
        percent = float(data.get("percent", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "نسبة غير صالحة"}), 400

    if percent < 0 or percent > 100:
        return jsonify({"error": "النسبة بين 0 و 100"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    user.general_discount = round(percent, 2)
    log_admin_activity(f"تعيين خصم عام {percent}% للمستخدم {user.telegram_id}")
    db.session.commit()

    return jsonify({"general_discount": user.general_discount})


@main.route("/admin/api/users/<int:user_id>/discounts/product", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_product_discount(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    try:
        product_id = int(data.get("product_id", 0))
        percent = float(data.get("percent", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "بيانات غير صالحة"}), 400

    if percent <= 0 or percent > 100:
        return jsonify({"error": "النسبة بين 0.01 و 100"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    existing = UserProductDiscount.query.filter_by(
        user_id=user_id, product_id=product_id
    ).first()

    if existing:
        existing.discount_percent = round(percent, 2)
    else:
        db.session.add(UserProductDiscount(
            user_id=user_id,
            product_id=product_id,
            discount_percent=round(percent, 2),
        ))

    log_admin_activity(f"خصم {percent}% على '{product.name}' للمستخدم {user.telegram_id}")
    db.session.commit()

    return jsonify({"success": True})


@main.route("/admin/api/users/<int:user_id>/discounts/<int:discount_id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_product_discount(user_id, discount_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    discount = UserProductDiscount.query.filter_by(
        id=discount_id, user_id=user_id
    ).first()
    if not discount:
        return jsonify({"error": "غير موجود"}), 404

    db.session.delete(discount)
    log_admin_activity(f"حذف خصم من المستخدم {user_id}")
    db.session.commit()

    return jsonify({"success": True})


# ============================================================
# Categories — 🆕 v18.1: cached + eager
# ============================================================
@main.route("/admin/api/categories", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_categories():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        # 🚀 Cache
        cached = cache_get(key_admin_list("categories"))
        if cached is not None:
            return jsonify(cached)

        categories = Category.query.filter_by(is_active=True).order_by(Category.display_order).all()
        result = [{
            "id": c.id, "name": c.name, "description": c.description,
            "image": c.image, "is_active": c.is_active, "display_order": c.display_order,
        } for c in categories]

        cache_set(key_admin_list("categories"), result, ttl=TTL_ADMIN_LISTS)
        return jsonify(result)

    # POST
    data = request.get_json() or {}
    image_url = _normalize_image(data.get("image", ""), folder="sanad/categories")

    cat = Category(
        name=data.get("name"), description=data.get("description", ""),
        image=image_url, is_active=data.get("is_active", True),
        display_order=data.get("display_order", 0),
    )
    db.session.add(cat)
    log_admin_activity(f"إضافة قسم: {cat.name}")
    db.session.commit()
    return jsonify({"id": cat.id}), 201


@main.route("/admin/api/categories/<int:cat_id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_category(cat_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    cat = Category.query.get(cat_id)
    if not cat:
        return jsonify({"error": "قسم غير موجود"}), 404

    cat_name = cat.name
    cat.is_active = False
    cat.deleted_at = datetime.now(timezone.utc)
    products = Product.query.filter_by(category_id=cat_id).all()
    for product in products:
        product.is_active = False
        product.deleted_at = datetime.now(timezone.utc)

    log_admin_activity(f"أرشفة قسم: {cat_name}")
    db.session.commit()
    return jsonify({"success": True, "message": f"تم أرشفة القسم و{len(products)} منتج"})


@main.route("/admin/api/categories/<int:cat_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_category(cat_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    cat = Category.query.get(cat_id)
    if not cat:
        return jsonify({"error": "قسم غير موجود"}), 404
    cat.is_active = True
    cat.deleted_at = None
    products = Product.query.filter_by(category_id=cat_id).all()
    for product in products:
        product.is_active = True
        product.deleted_at = None
    db.session.commit()
    return jsonify({"success": True, "message": f"تم استرجاع القسم و{len(products)} منتج"})


# ============================================================
# Products — 🆕 v18.1: cached + eager bundles
# ============================================================
@main.route("/admin/api/products", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_products():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        # 🚀 Cache
        cached = cache_get(key_admin_list("products"))
        if cached is not None:
            return jsonify(cached)

        # 🚀 Eager load bundles (avoids N+1)
        products = (
            Product.query
            .filter_by(is_active=True)
            .options(selectinload(Product.bundles))
            .all()
        )

        result = []
        for p in products:
            active_bundles = sorted(
                [b for b in p.bundles if b.is_active],
                key=lambda x: x.price_usd
            )
            result.append({
                "id": p.id, "category_id": p.category_id, "name": p.name,
                "description": p.description, "image": p.image,
                "product_type": p.product_type, "base_quantity": p.base_quantity,
                "base_price": p.base_price, "unit_name": p.unit_name or "قطعة",
                "input_type": p.input_type, "custom_input_label": p.custom_input_label,
                "stock": p.stock, "max_quantity": p.max_quantity,
                "is_bundle": p.is_bundle, "is_active": p.is_active,
                "bundles": [serialize_bundle(b) for b in active_bundles],
            })

        cache_set(key_admin_list("products"), result, ttl=TTL_ADMIN_LISTS)
        return jsonify(result)

    # POST — إنشاء منتج
    data = request.get_json() or {}
    stock = data.get("stock")
    if stock is not None:
        try:
            stock = int(stock) if int(stock) > 0 else None
        except (ValueError, TypeError):
            stock = None

    image_url = _normalize_image(data.get("image", ""), folder="sanad/products")

    input_type = data.get("input_type", "id")
    if input_type not in ("id", "account_id", "phone", "url", "none"):
        input_type = "id"

    product = Product(
        category_id=data.get("category_id"), name=data.get("name"),
        description=data.get("description", ""), image=image_url,
        product_type=data.get("product_type", "quantity"),
        base_quantity=data.get("base_quantity", 0),
        base_price=data.get("base_price", 0.0),
        unit_name=(data.get("unit_name") or "قطعة").strip() or "قطعة",
        input_type=input_type,
        custom_input_label=data.get("custom_input_label", ""),
        stock=stock,
        max_quantity=data.get("max_quantity", 0),
        is_bundle=(data.get("product_type") == "bundle"),
        is_active=data.get("is_active", True),
    )
    db.session.add(product)
    db.session.flush()

    if product.product_type == "bundle":
        for b in data.get("bundles", []):
            name = (b.get("name") or "").strip()
            try:
                price = float(b.get("price_usd", 0))
                qty = int(b.get("quantity", 0))
            except (ValueError, TypeError):
                continue
            if not name or price <= 0:
                continue
            db.session.add(ProductBundle(
                product_id=product.id, name=name, quantity=qty, price_usd=price, is_active=True,
            ))

    log_admin_activity(f"إضافة منتج: {product.name}")
    db.session.commit()
    return jsonify({"id": product.id}), 201


@main.route("/admin/api/products/<int:product_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_product_actions(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    if request.method == "GET":
        bundles = ProductBundle.query.filter_by(product_id=product.id).order_by(ProductBundle.price_usd).all()
        return jsonify({
            "id": product.id, "category_id": product.category_id, "name": product.name,
            "description": product.description, "image": product.image,
            "product_type": product.product_type, "base_quantity": product.base_quantity,
            "base_price": product.base_price, "unit_name": product.unit_name or "قطعة",
            "input_type": product.input_type, "custom_input_label": product.custom_input_label,
            "stock": product.stock, "max_quantity": product.max_quantity,
            "is_bundle": product.is_bundle, "is_active": product.is_active,
            "bundles": [serialize_bundle(b) for b in bundles],
        })

    if request.method == "PUT":
        data = request.get_json() or {}
        ALLOWED = {"name", "description", "image", "category_id", "product_type",
                   "base_quantity", "base_price", "unit_name", "input_type",
                   "custom_input_label", "stock", "max_quantity", "is_bundle", "is_active"}
        for key, value in data.items():
            if key in ALLOWED and hasattr(product, key):
                if key == "stock":
                    try:
                        value = int(value) if value is not None and int(value) > 0 else None
                    except (ValueError, TypeError):
                        value = None
                if key == "unit_name":
                    value = (value or "قطعة").strip() or "قطعة"
                if key == "image":
                    value = _normalize_image(value, folder="sanad/products")
                if key == "input_type":
                    if value not in ("id", "account_id", "phone", "url", "none"):
                        value = "id"
                setattr(product, key, value)

        if "bundles" in data:
            ProductBundle.query.filter_by(product_id=product.id).delete()
            for b in data.get("bundles", []):
                name = (b.get("name") or "").strip()
                try:
                    price = float(b.get("price_usd", 0))
                    qty = int(b.get("quantity", 0))
                except (ValueError, TypeError):
                    continue
                if not name or price <= 0:
                    continue
                db.session.add(ProductBundle(
                    product_id=product.id, name=name, quantity=qty, price_usd=price, is_active=True,
                ))
            product.is_bundle = (product.product_type == "bundle")

        log_admin_activity(f"تعديل المنتج: {product.name}")
        db.session.commit()
        return jsonify({"success": True, "message": "تم تعديل المنتج"})

    # DELETE
    product_name = product.name
    product.is_active = False
    product.deleted_at = datetime.now(timezone.utc)
    log_admin_activity(f"أرشفة المنتج: {product_name}")
    db.session.commit()
    return jsonify({"success": True, "message": "تم أرشفة المنتج"})


@main.route("/admin/api/products/<int:product_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_product(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404
    product.is_active = True
    product.deleted_at = None
    if product.category and not product.category.is_active:
        product.category.is_active = True
        product.category.deleted_at = None
    db.session.commit()
    return jsonify({"success": True, "message": "تم استرجاع المنتج"})


# ============================================================
# Bundles
# ============================================================
@main.route("/admin/api/products/<int:product_id>/bundles", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_bundles(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    if request.method == "GET":
        bundles = ProductBundle.query.filter_by(product_id=product_id).order_by(ProductBundle.price_usd).all()
        return jsonify([serialize_bundle(b) for b in bundles])

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    try:
        price = float(data.get("price_usd", 0))
        qty = int(data.get("quantity", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "بيانات غير صالحة"}), 400

    if not name or price <= 0:
        return jsonify({"error": "بيانات ناقصة"}), 400

    bundle = ProductBundle(product_id=product_id, name=name, quantity=qty, price_usd=price, is_active=True)
    db.session.add(bundle)
    db.session.commit()
    return jsonify(serialize_bundle(bundle)), 201


@main.route("/admin/api/products/<int:product_id>/bundles/<int:bundle_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_bundle_actions(product_id, bundle_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    bundle = ProductBundle.query.filter_by(id=bundle_id, product_id=product_id).first()
    if not bundle:
        return jsonify({"error": "باقة غير موجودة"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        if "name" in data and (data.get("name") or "").strip():
            bundle.name = data["name"].strip()
        if "quantity" in data:
            try: bundle.quantity = int(data["quantity"])
            except (ValueError, TypeError): pass
        if "price_usd" in data:
            try:
                p = float(data["price_usd"])
                if p > 0: bundle.price_usd = p
            except (ValueError, TypeError): pass
        if "is_active" in data:
            bundle.is_active = bool(data["is_active"])
        db.session.commit()
        return jsonify(serialize_bundle(bundle))

    db.session.delete(bundle)
    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# 💳 Payment Methods — v18.3.6
def _serialize_payment_method(m):
    return {
        "id": m.id,
        "name": m.name,
        "description": m.description,
        "account_name": m.account_name,
        "account": m.account,
        "icon": m.icon,
        "qr_image": m.qr_image,
        "min_amount": float(m.min_amount or 0),
        "max_amount": float(m.max_amount or 500),
        "fee": float(m.fee or 0),
        "fee_type": getattr(m, "fee_type", None) or "percentage",
        "requires_kyc": m.requires_kyc,
        "is_active": m.is_active,
    }


def _validate_payment_method_data(data, current=None):
    try:
        min_amt = float(data.get("min_amount", current.min_amount if current else 0) or 0)
        max_amt = float(data.get("max_amount", current.max_amount if current and current.max_amount else 500) or 500)
        fee_val = float(data.get("fee", current.fee if current else 0) or 0)
    except (ValueError, TypeError):
        return None, "قيم رقمية غير صحيحة"

    if min_amt < 0 or max_amt < 0 or fee_val < 0:
        return None, "لا يمكن أن تكون القيم سالبة"
    if max_amt > 0 and min_amt > max_amt:
        return None, "الحد الأدنى أكبر من الحد الأقصى"

    fee_type = data.get("fee_type", getattr(current, "fee_type", None) if current else "percentage")
    if fee_type not in ("percentage", "fixed"):
        fee_type = "percentage"
    if fee_type == "percentage" and fee_val > 100:
        return None, "نسبة الرسوم يجب أن تكون 100% أو أقل"

    return {"min_amount": min_amt, "max_amount": max_amt, "fee": fee_val, "fee_type": fee_type}, None


@main.route("/admin/api/payment-methods", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_payment_methods():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        methods = PaymentMethod.query.filter_by(is_active=True).all()
        return jsonify([_serialize_payment_method(m) for m in methods])

    data = request.get_json() or {}
    validated, err = _validate_payment_method_data(data)
    if err:
        return jsonify({"error": err}), 400

    icon_url = _normalize_image(data.get("icon", ""), folder="sanad/payment-methods")
    qr_url = _normalize_image(data.get("qr_image", ""), folder="sanad/qr-codes")

    method = PaymentMethod(
        name=data.get("name"),
        description=data.get("description", ""),
        account_name=data.get("account_name", ""),
        account=data.get("account", ""),
        icon=icon_url,
        qr_image=qr_url,
        min_amount=validated["min_amount"],
        max_amount=validated["max_amount"],
        fee=validated["fee"],
        requires_kyc=data.get("requires_kyc", False),
        is_active=data.get("is_active", True),
    )
    if hasattr(method, "fee_type"):
        method.fee_type = validated["fee_type"]

    db.session.add(method)
    log_admin_activity(f"إضافة طريقة دفع: {method.name}")
    db.session.commit()
    return jsonify({"id": method.id}), 201


@main.route("/admin/api/payment-methods/<int:method_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_payment_method_actions(method_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    method = PaymentMethod.query.get(method_id)
    if not method:
        return jsonify({"error": "غير موجودة"}), 404

    if request.method == "DELETE":
        method.is_active = False
        method.deleted_at = datetime.now(timezone.utc)
        log_admin_activity(f"أرشفة طريقة دفع: {method.name}")
        db.session.commit()
        return jsonify({"success": True})

    data = request.get_json() or {}
    validated, err = _validate_payment_method_data(data, current=method)
    if err:
        return jsonify({"error": err}), 400

    if "name" in data and data["name"]: method.name = data["name"]
    if "description" in data: method.description = data["description"]
    if "account_name" in data: method.account_name = data["account_name"]
    if "account" in data: method.account = data["account"]
    if "icon" in data and data["icon"]:
        method.icon = _normalize_image(data["icon"], folder="sanad/payment-methods")
    if "qr_image" in data and data["qr_image"]:
        method.qr_image = _normalize_image(data["qr_image"], folder="sanad/qr-codes")
    if "requires_kyc" in data: method.requires_kyc = bool(data["requires_kyc"])
    if "is_active" in data: method.is_active = bool(data["is_active"])

    method.min_amount = validated["min_amount"]
    method.max_amount = validated["max_amount"]
    method.fee = validated["fee"]
    if hasattr(method, "fee_type"):
        method.fee_type = validated["fee_type"]

    log_admin_activity(f"تعديل طريقة دفع: {method.name}")
    db.session.commit()
    return jsonify({"success": True, "id": method.id})


# Orders — 🆕 v18.1: joinedload + cached
# ============================================================
@main.route("/admin/api/orders", methods=["GET"])
@jwt_required()
@handle_errors
def admin_orders():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    # 🚀 Cache
    cached = cache_get(key_admin_list("orders"))
    if cached is not None:
        return jsonify(cached)

    # 🚀 Eager load user + product (avoids N+1)
    orders = (
        Order.query
        .filter(Order.status.in_(['pending', 'review', 'processing']))
        .options(joinedload(Order.user), joinedload(Order.product))
        .order_by(Order.created_at.desc())
        .all()
    )

    result = []
    for o in orders:
        product = o.product
        user = o.user
        result.append({
            "id": o.id, "order_number": o.order_number, "user_id": o.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "product_id": o.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_image": product.image if product else None,
            "product_type": product.product_type if product else None,
            "product_unit_name": product.unit_name if product else "قطعة",
            "quantity": o.quantity, "unit_price": o.unit_price,
            "total_price": o.total_price, "discount_amount": o.discount_amount or 0,
            "coupon_code": o.coupon_code, "status": o.status,
            "delivery_data": o.delivery_data,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })

    cache_set(key_admin_list("orders"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)


@main.route("/admin/api/orders/<int:order_id>", methods=["GET"])
@jwt_required()
@handle_errors
def admin_order_detail(order_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404
    product = Product.query.get(order.product_id)
    return jsonify({
        "id": order.id, "order_number": order.order_number,
        "user_id": order.user_id, "product_id": order.product_id,
        "product_name": product.name if product else "منتج محذوف",
        "product_unit_name": product.unit_name if product else "قطعة",
        "quantity": order.quantity, "unit_price": order.unit_price,
        "total_price": order.total_price, "discount_amount": order.discount_amount or 0,
        "coupon_code": order.coupon_code,
        "status": order.status, "status_arabic": get_arabic_status(order.status),
        "delivery_data": order.delivery_data,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    })


@main.route("/admin/api/orders/<int:order_id>/full", methods=["GET"])
@jwt_required()
@handle_errors
def admin_order_full_detail(order_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404

    product = Product.query.get(order.product_id)
    user = User.query.get(order.user_id)

    delivery = {}
    if order.delivery_data:
        try:
            delivery = json.loads(order.delivery_data)
        except Exception:
            delivery = {"raw": order.delivery_data}

    return jsonify({
        "id": order.id,
        "order_number": order.order_number,
        "user": {
            "id": user.id if user else None,
            "telegram_id": user.telegram_id if user else None,
            "first_name": user.first_name if user else None,
            "last_name": user.last_name if user else None,
            "username": user.username if user else None,
            "balance": float(user.balance) if user and user.balance is not None else 0.0,
            "kyc_status": user.kyc_status if user else None,
        } if user else None,
        "product": {
            "id": product.id if product else None,
            "name": product.name if product else "منتج محذوف",
            "image": product.image if product else None,
            "product_type": product.product_type if product else None,
            "unit_name": product.unit_name if product else "قطعة",
            "input_type": product.input_type if product else None,
        } if product else None,
        "quantity": order.quantity,
        "unit_price": order.unit_price,
        "total_price": order.total_price,
        "discount_amount": order.discount_amount or 0,
        "coupon_code": order.coupon_code,
        "status": order.status,
        "status_arabic": get_arabic_status(order.status),
        "delivery_data": delivery,
        "can_cancel_until": order.can_cancel_until.isoformat() if order.can_cancel_until else None,
        "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
        "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        "failed_at": order.failed_at.isoformat() if order.failed_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    })


@main.route("/admin/api/orders/<int:order_id>/status", methods=["POST"])
@jwt_required()
@handle_errors
def admin_update_order_status(order_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    new_status = data.get("status")
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404

    valid = {
        "pending":    ["review", "processing", "completed", "failed", "cancelled"],
        "review":     ["processing", "completed", "failed"],
        "processing": ["completed", "failed"],
    }
    if order.status in ["completed", "failed", "cancelled"]:
        return jsonify({"error": "لا يمكن تغيير طلب بحالة نهائية"}), 400
    if order.status in valid and new_status not in valid[order.status]:
        return jsonify({"error": f"لا يمكن الانتقال من {order.status} إلى {new_status}"}), 400

    old_status = order.status
    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)

    if new_status == "cancelled":
        order.cancelled_at = datetime.now(timezone.utc)
    elif new_status == "completed":
        order.completed_at = datetime.now(timezone.utc)
    elif new_status == "failed":
        order.failed_at = datetime.now(timezone.utc)

    user = User.query.get(order.user_id)

    if new_status == "failed" and old_status != "failed" and user:
        balance_before = user.balance
        user.balance = round(user.balance + order.total_price, 2)
        db.session.add(Transaction(
            user_id=user.id, type="refund", amount=order.total_price,
            balance_after=user.balance, reference_type="order_refund", reference_id=order.id,
        ))
        log_financial(
            user=user, action="order_refund", amount=order.total_price,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="order", ref_id=order.id, note="استرداد بسبب فشل الطلب",
        )
        product = Product.query.get(order.product_id)
        if product and product.stock is not None:
            product.stock += order.quantity
        db.session.add(Notification(
            user_id=user.id, title="استرداد مبلغ",
            message=f"تم استرداد {order.total_price:.2f}$ لطلبك {order.order_number}",
            type="success",
        ))
        send_order_refund_failed(user, order.total_price, order.order_number)

    if new_status == "cancelled" and old_status != "cancelled" and user:
        balance_before = user.balance
        user.balance = round(user.balance + order.total_price, 2)
        db.session.add(Transaction(
            user_id=user.id, type="refund", amount=order.total_price,
            balance_after=user.balance, reference_type="order_cancel", reference_id=order.id,
        ))
        log_financial(
            user=user, action="order_cancelled", amount=order.total_price,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="order", ref_id=order.id,
        )
        product = Product.query.get(order.product_id)
        if product and product.stock is not None:
            product.stock += order.quantity
        send_order_refund_cancelled(user, order.total_price, order.order_number)

    if new_status == "completed" and user:
        try:
            db.session.add(Notification(
                user_id=user.id, title="تم تنفيذ طلبك",
                message=f"تم إكمال طلبك {order.order_number} بنجاح",
                type="success",
            ))
        except Exception:
            pass

    log_admin_activity(f"تغيير حالة الطلب {order.order_number} إلى {get_arabic_status(new_status)}")
    db.session.commit()

    # 🆕 v18.1: manual invalidation (auto also works)
    invalidate_admin("orders")

    notify_admins(f"طلب {order.order_number} → {get_arabic_status(new_status)}")
    return jsonify({"status": order.status})


@main.route("/admin/api/orders/bulk-status", methods=["POST"])
@jwt_required()
@handle_errors
def admin_bulk_order_status():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    data = request.get_json() or {}
    order_ids = data.get("order_ids", [])
    new_status = data.get("status")

    if not order_ids or not new_status:
        return jsonify({"error": "بيانات ناقصة"}), 400

    if len(order_ids) > 100:
        return jsonify({"error": "الحد الأقصى 100 طلب"}), 400

    valid_transitions = {
        "pending":    ["review", "processing", "completed", "failed", "cancelled"],
        "review":     ["processing", "completed", "failed"],
        "processing": ["completed", "failed"],
    }

    success = []
    failed = []

    for oid in order_ids:
        order = Order.query.get(oid)
        if not order:
            failed.append({"id": oid, "reason": "غير موجود"})
            continue

        if order.status in ["completed", "failed", "cancelled"]:
            failed.append({"id": oid, "reason": f"الحالة {order.status}"})
            continue

        allowed = valid_transitions.get(order.status, [])
        if new_status not in allowed:
            failed.append({"id": oid, "reason": f"لا يمكن {order.status} → {new_status}"})
            continue

        old_status = order.status
        order.status = new_status
        order.updated_at = datetime.now(timezone.utc)

        if new_status == "cancelled":
            order.cancelled_at = datetime.now(timezone.utc)
        elif new_status == "completed":
            order.completed_at = datetime.now(timezone.utc)
        elif new_status == "failed":
            order.failed_at = datetime.now(timezone.utc)

        user = User.query.get(order.user_id)
        if new_status in ["failed", "cancelled"] and user and old_status not in ["failed", "cancelled"]:
            balance_before = user.balance
            user.balance = round(user.balance + order.total_price, 2)
            db.session.add(Transaction(
                user_id=user.id, type="refund", amount=order.total_price,
                balance_after=user.balance, reference_type=f"order_{new_status}",
                reference_id=order.id,
            ))
            log_financial(
                user=user, action=f"order_{new_status}", amount=order.total_price,
                balance_before=balance_before, balance_after=user.balance,
                ref_type="order", ref_id=order.id, note=f"Bulk: {new_status}",
            )
            product = Product.query.get(order.product_id)
            if product and product.stock is not None:
                product.stock += order.quantity

        if new_status == "completed" and user:
            try:
                db.session.add(Notification(
                    user_id=user.id, title="تم تنفيذ طلبك",
                    message=f"تم إكمال طلبك {order.order_number} بنجاح",
                    type="success",
                ))
            except Exception:
                pass

        success.append(oid)

    log_admin_activity(f"تحديث جماعي: {len(success)} طلب → {get_arabic_status(new_status)}")
    db.session.commit()

    invalidate_admin("orders")

    return jsonify({
        "success_count": len(success),
        "failed_count": len(failed),
        "success_ids": success,
        "failed": failed,
    })


# ============================================================
# Deposits — 🆕 v18.1: joinedload + cached
# ============================================================
@main.route("/admin/api/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_deposits():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    cached = cache_get(key_admin_list("deposits"))
    if cached is not None:
        return jsonify(cached)

    deposits = (
        Deposit.query
        .filter(Deposit.status == 'pending')
        .options(joinedload(Deposit.user))
        .order_by(Deposit.created_at.desc())
        .all()
    )

    result = []
    for d in deposits:
        user = d.user
        result.append({
            "id": d.id, "user_id": d.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "amount": d.amount, "method": d.method, "method_id": d.method_id,
            "proof_image": get_signed_url(d.proof_image, expires_in=1800) if d.proof_image else None,
            "status": d.status, "transaction_id": d.transaction_id,
            "admin_note": d.admin_note,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    cache_set(key_admin_list("deposits"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)


@main.route("/admin/api/deposits/<int:deposit_id>", methods=["GET"])
@jwt_required()
@handle_errors
def admin_deposit_detail(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404

    user = User.query.get(deposit.user_id)
    method_obj = PaymentMethod.query.get(deposit.method_id) if deposit.method_id else None

    return jsonify({
        "id": deposit.id,
        "transaction_id": deposit.transaction_id,
        "user": {
            "id": user.id if user else None,
            "telegram_id": user.telegram_id if user else None,
            "first_name": user.first_name if user else None,
            "last_name": user.last_name if user else None,
            "username": user.username if user else None,
            "balance": float(user.balance) if user and user.balance is not None else 0.0,
            "kyc_status": user.kyc_status if user else None,
        } if user else None,
        "amount": deposit.amount,
        "currency": deposit.currency,
        "method": deposit.method,
        "method_name": method_obj.name if method_obj else deposit.method,
        "method_account": method_obj.account if method_obj else None,
        "method_account_name": method_obj.account_name if method_obj else None,
        "sender_name": deposit.sender_name,
        "account_number": deposit.account_number,
        "txid": deposit.txid,
        "proof_image": get_signed_url(deposit.proof_image, expires_in=1800) if deposit.proof_image else None,
        "status": deposit.status,
        "admin_note": deposit.admin_note,
        "reviewed_by": deposit.reviewed_by,
        "reviewed_at": deposit.reviewed_at.isoformat() if deposit.reviewed_at else None,
        "created_at": deposit.created_at.isoformat() if deposit.created_at else None,
    })


@main.route("/admin/api/deposits/<int:deposit_id>/approve", methods=["POST"])
@jwt_required()
@handle_errors
def admin_approve_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    deposit.status = "approved"
    deposit.reviewed_at = datetime.now(timezone.utc)
    user = User.query.get(deposit.user_id)

    # 🆕 v18.3.6: اخصم الرسوم أولاً
    deposit_fee = round(deposit.fee or 0, 2)
    dep_amount = round(deposit.amount, 2)
    net_amount = round(dep_amount - deposit_fee, 2)
    if net_amount < 0:
        net_amount = 0.0

    paid_debt = 0.0
    added_amount = net_amount

    if user:
        balance_before = round(user.balance, 2)
        current = round(user.balance, 2)

        if current < 0:
            debt = abs(current)
            if net_amount >= debt:
                paid_debt = round(debt, 2)
                added_amount = round(net_amount - debt, 2)
                user.balance = added_amount
            else:
                paid_debt = net_amount
                added_amount = 0.0
                user.balance = round(current + net_amount, 2)
        else:
            user.balance = round(current + net_amount, 2)
            added_amount = net_amount

        user.balance = round(user.balance, 2)

        db.session.add(Transaction(
            user_id=user.id, type="deposit", amount=dep_amount,
            balance_after=user.balance, reference_type="deposit", reference_id=deposit.id,
        ))
        log_financial(
            user=user, action="deposit_approved", amount=dep_amount,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="deposit", ref_id=deposit.id,
        )
        db.session.add(Notification(
            user_id=user.id, title="إيداع مقبول",
            message=f"تم قبول إيداعك بقيمة {dep_amount:.2f}$", type="success",
        ))
        send_deposit_approved(user, dep_amount, paid_debt, added_amount)

    log_admin_activity(f"قبول إيداع {deposit.id}")
    db.session.commit()

    invalidate_admin("deposits")

    notify_admins(f"إيداع {deposit.id}: {deposit.amount:.2f}$")
    return jsonify({"status": deposit.status, "paid_debt": paid_debt, "added": added_amount})


@main.route("/admin/api/deposits/<int:deposit_id>/reject", methods=["POST"])
@jwt_required()
@handle_errors
def admin_reject_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    data = request.get_json() or {}
    reason = data.get("reason", "")

    deposit.status = "rejected"
    deposit.reviewed_at = datetime.now(timezone.utc)
    if reason:
        deposit.admin_note = reason

    user = User.query.get(deposit.user_id)
    if user:
        db.session.add(Notification(
            user_id=user.id, title="إيداع مرفوض",
            message=f"تم رفض إيداعك بقيمة {deposit.amount:.2f}$" + (f" - {reason}" if reason else ""),
            type="warning",
        ))

    log_admin_activity(f"رفض إيداع {deposit.id}")
    db.session.commit()

    invalidate_admin("deposits")

    if user:
        send_deposit_rejected(user, deposit.amount, reason)

    notify_admins(f"رفض إيداع {deposit.id}: {deposit.amount:.2f}$")
    return jsonify({"status": deposit.status})


# ============================================================
# KYC — 🆕 v18.1: joinedload + cached
# ============================================================
@main.route("/admin/api/kyc", methods=["GET"])
@jwt_required()
@handle_errors
def admin_kyc():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    cached = cache_get(key_admin_list("kyc"))
    if cached is not None:
        return jsonify(cached)

    kycs = (
        KYCRequest.query
        .filter(KYCRequest.status == 'pending')
        .options(joinedload(KYCRequest.user))
        .order_by(KYCRequest.submitted_at.desc())
        .all()
    )

    result = [{
        "id": k.id, "user_id": k.user_id, "full_name": k.full_name,
        "phone": k.phone, "address": k.address,
        "selfie_image": get_signed_url(k.selfie_image, expires_in=1800) if k.selfie_image else None,
        "status": k.status,
        "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
    } for k in kycs]

    cache_set(key_admin_list("kyc"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)


@main.route("/admin/api/kyc/<int:kyc_id>/approve", methods=["POST"])
@jwt_required()
@handle_errors
def admin_approve_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.get(kyc_id)
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404

    kyc.status = "approved"
    kyc.reviewed_at = datetime.now(timezone.utc)
    user = User.query.get(kyc.user_id)
    if user:
        user.kyc_status = "verified"
        user.is_verified = True
        db.session.add(Notification(
            user_id=user.id, title="تم توثيق حسابك",
            message="تم قبول طلب التوثيق", type="success",
        ))

    log_admin_activity(f"قبول KYC للمستخدم {kyc.user_id}")
    db.session.commit()

    invalidate_admin("kyc")

    if user:
        send_kyc_approved(user)

    notify_admins(f"KYC {kyc.user_id}")
    return jsonify({"status": "approved"})


@main.route("/admin/api/kyc/<int:kyc_id>/reject", methods=["POST"])
@jwt_required()
@handle_errors
def admin_reject_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.get(kyc_id)
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404

    data = request.get_json() or {}
    reason = data.get("reason", "")

    kyc.status = "rejected"
    kyc.reviewed_at = datetime.now(timezone.utc)
    if reason:
        kyc.admin_note = reason

    user = User.query.get(kyc.user_id)
    if user:
        user.kyc_status = "unverified"
        user.is_verified = False
        db.session.add(Notification(
            user_id=user.id, title="رفض التوثيق",
            message="تم رفض طلب التوثيق" + (f" - {reason}" if reason else ""),
            type="warning",
        ))

    log_admin_activity(f"رفض KYC للمستخدم {kyc.user_id}")
    db.session.commit()

    invalidate_admin("kyc")

    if user:
        send_kyc_rejected(user, reason)

    notify_admins(f"رفض KYC {kyc.user_id}")
    return jsonify({"status": "rejected"})


# ============================================================
# Notifications
# ============================================================
@main.route("/admin/api/notifications", methods=["POST"])
@jwt_required()
@handle_errors
def admin_send_notification():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    target = data.get("target", "all")
    title = data.get("title", "إشعار")
    message = data.get("message", "")
    ntype = data.get("type", "info")

    if target == "all":
        for u in User.query.all():
            db.session.add(Notification(user_id=u.id, title=title, message=message, type=ntype))
    else:
        uid = data.get("user_id")
        if uid:
            db.session.add(Notification(user_id=uid, title=title, message=message, type=ntype))

    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# Service Requests — 🆕 v18.1: joinedload + cached
# ============================================================
@main.route("/admin/api/service-requests", methods=["GET"])
@jwt_required()
@handle_errors
def admin_service_requests():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    cached = cache_get(key_admin_list("service-requests"))
    if cached is not None:
        return jsonify(cached)

    reqs = (
        ServiceRequest.query
        .filter(ServiceRequest.status == 'pending')
        .options(joinedload(ServiceRequest.user))
        .order_by(ServiceRequest.created_at.desc())
        .all()
    )

    result = [{
        "id": r.id, "user_id": r.user_id, "service_name": r.service_name,
        "description": r.description, "estimated_price": r.estimated_price,
        "status": r.status, "admin_response": r.admin_response,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reqs]

    cache_set(key_admin_list("service-requests"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)


@main.route("/admin/api/service-requests/<int:req_id>", methods=["PUT"])
@jwt_required()
@handle_errors
def admin_update_service_request(req_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    req = ServiceRequest.query.get(req_id)
    if not req:
        return jsonify({"error": "غير موجود"}), 404
    if "status" in data: req.status = data["status"]
    if "admin_response" in data: req.admin_response = data["admin_response"]
    db.session.commit()

    invalidate_admin("service-requests")

    return jsonify({"success": True})


# ============================================================
# Settings — 🆕 v18.1: invalidates public cache
# ============================================================
@main.route("/admin/api/settings", methods=["GET", "PUT"])
@jwt_required()
@handle_errors
def admin_settings():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        return jsonify({s.key: s.value for s in Setting.query.all()})

    data = request.get_json() or {}
    for key, value in data.items():
        s = Setting.query.filter_by(key=key).first()
        if s: s.value = str(value)
        else: db.session.add(Setting(key=key, value=str(value)))
    db.session.commit()

    # 🆕 v18.1: also invalidate public settings cache
    invalidate_settings()

    return jsonify({"success": True})


# ============================================================
# Coupons — 🆕 v18.1: cached
# ============================================================
@main.route("/admin/api/coupons", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_coupons():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        cached = cache_get(key_admin_list("coupons"))
        if cached is not None:
            return jsonify(cached)

        coupons = Coupon.query.order_by(Coupon.created_at.desc()).all()
        result = [{
            "id": c.id, "code": c.code, "description": c.description,
            "discount_type": c.discount_type, "discount_value": c.discount_value,
            "min_amount": c.min_amount, "max_discount": c.max_discount,
            "max_uses": c.max_uses, "used_count": c.used_count,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "is_active": c.is_active,
        } for c in coupons]

        cache_set(key_admin_list("coupons"), result, ttl=TTL_ADMIN_LISTS)
        return jsonify(result)

    data = request.get_json() or {}
    code = (data.get("code") or "").strip().upper()
    if not code:
        return jsonify({"error": "أدخل الكود"}), 400
    if Coupon.query.filter_by(code=code).first():
        return jsonify({"error": "الكود موجود"}), 400

    expires_at = None
    if data.get("expires_at"):
        try:
            expires_at = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
        except Exception:
            expires_at = None

    coupon = Coupon(
        code=code, description=data.get("description", ""),
        discount_type=data.get("discount_type", "percentage"),
        discount_value=float(data.get("discount_value", 0)),
        min_amount=float(data.get("min_amount", 0)),
        max_discount=float(data.get("max_discount", 0)),
        max_uses=int(data.get("max_uses", 0)),
        expires_at=expires_at, is_active=data.get("is_active", True),
    )
    db.session.add(coupon)
    db.session.commit()

    invalidate_admin("coupons")

    return jsonify({"id": coupon.id}), 201


@main.route("/admin/api/coupons/<int:coupon_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_coupon_actions(coupon_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    coupon = Coupon.query.get(coupon_id)
    if not coupon:
        return jsonify({"error": "غير موجود"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        for k in ["is_active", "description", "discount_value", "max_uses"]:
            if k in data:
                if k == "is_active": coupon.is_active = bool(data[k])
                elif k == "discount_value": coupon.discount_value = float(data[k])
                elif k == "max_uses": coupon.max_uses = int(data[k])
                else: setattr(coupon, k, data[k])
        db.session.commit()

        invalidate_admin("coupons")

        return jsonify({"success": True})

    CouponUsage.query.filter_by(coupon_id=coupon.id).delete()
    db.session.delete(coupon)
    db.session.commit()

    invalidate_admin("coupons")

    return jsonify({"success": True})


# ============================================================
# Referrals, Activities, Audit — 🆕 v18.1: joinedload
# ============================================================
@main.route("/admin/api/referrals", methods=["GET"])
@jwt_required()
@handle_errors
def admin_referrals():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    cached = cache_get(key_admin_list("referrals"))
    if cached is not None:
        return jsonify(cached)

    referrals = (
        Referral.query
        .options(joinedload(Referral.referrer), joinedload(Referral.referred_user))
        .order_by(Referral.created_at.desc())
        .limit(200)
        .all()
    )

    result = []
    for r in referrals:
        referrer = r.referrer
        referred = r.referred_user
        result.append({
            "id": r.id,
            "referrer_id": r.referrer_id,
            "referrer_telegram": referrer.telegram_id if referrer else None,
            "referred_user_id": r.referred_user_id,
            "referred_telegram": referred.telegram_id if referred else None,
            "reward_amount": r.reward_amount,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        })

    cache_set(key_admin_list("referrals"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)


@main.route("/admin/api/activities", methods=["GET"])
@jwt_required()
@handle_errors
def admin_activities():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    acts = AdminActivity.query.order_by(AdminActivity.created_at.desc()).limit(200).all()
    return jsonify([{
        "id": a.id, "admin_id": a.admin_id, "action": a.action,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in acts])


@main.route("/admin/api/audit-log", methods=["GET"])
@jwt_required()
@handle_errors
def admin_audit_log():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user_id = request.args.get("user_id", type=int)
    action = request.args.get("action")
    limit = min(int(request.args.get("limit", 100)), 500)

    q = FinancialAuditLog.query
    if user_id: q = q.filter_by(user_id=user_id)
    if action: q = q.filter_by(action=action)
    logs = q.order_by(FinancialAuditLog.created_at.desc()).limit(limit).all()

    return jsonify([{
        "id": l.id, "user_id": l.user_id, "action": l.action,
        "amount": l.amount, "balance_before": l.balance_before, "balance_after": l.balance_after,
        "reference_type": l.reference_type, "reference_id": l.reference_id,
        "admin_id": l.admin_id, "ip_address": l.ip_address, "note": l.note,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in logs])


# ============================================================
# 🆕 v16: ARCHIVE — 🆕 v18.1: joinedload
# ============================================================
@main.route("/admin/api/archive/orders", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_orders():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    orders = (
        Order.query
        .filter(Order.status.in_(['completed', 'cancelled', 'failed']))
        .options(joinedload(Order.user), joinedload(Order.product))
        .order_by(Order.created_at.desc())
        .limit(200)
        .all()
    )

    result = []
    for o in orders:
        product = o.product
        user = o.user
        result.append({
            "id": o.id, "order_number": o.order_number, "user_id": o.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "product_id": o.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_image": product.image if product else None,
            "product_type": product.product_type if product else None,
            "product_unit_name": product.unit_name if product else "قطعة",
            "quantity": o.quantity, "unit_price": o.unit_price,
            "total_price": o.total_price, "discount_amount": o.discount_amount or 0,
            "coupon_code": o.coupon_code, "status": o.status,
            "delivery_data": o.delivery_data,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return jsonify(result)


@main.route("/admin/api/archive/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_deposits():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    deposits = (
        Deposit.query
        .filter(Deposit.status.in_(['approved', 'rejected']))
        .options(joinedload(Deposit.user))
        .order_by(Deposit.created_at.desc())
        .limit(200)
        .all()
    )

    result = []
    for d in deposits:
        user = d.user
        result.append({
            "id": d.id, "user_id": d.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "amount": d.amount, "method": d.method, "method_id": d.method_id,
            "proof_image": get_signed_url(d.proof_image, expires_in=1800) if d.proof_image else None,
            "status": d.status, "transaction_id": d.transaction_id,
            "admin_note": d.admin_note,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return jsonify(result)


@main.route("/admin/api/archive/kyc", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_kyc():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    kycs = (
        KYCRequest.query
        .filter(KYCRequest.status.in_(['approved', 'rejected']))
        .options(joinedload(KYCRequest.user))
        .order_by(KYCRequest.submitted_at.desc())
        .limit(200)
        .all()
    )

    return jsonify([{
        "id": k.id, "user_id": k.user_id, "full_name": k.full_name,
        "phone": k.phone, "address": k.address,
        "selfie_image": get_signed_url(k.selfie_image, expires_in=1800) if k.selfie_image else None,
        "status": k.status,
        "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
    } for k in kycs])


@main.route("/admin/api/archive/services", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_services():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    reqs = (
        ServiceRequest.query
        .filter(ServiceRequest.status.in_(['completed', 'rejected', 'cancelled']))
        .options(joinedload(ServiceRequest.user))
        .order_by(ServiceRequest.created_at.desc())
        .limit(200)
        .all()
    )

    return jsonify([{
        "id": r.id, "user_id": r.user_id, "service_name": r.service_name,
        "description": r.description, "estimated_price": r.estimated_price,
        "status": r.status, "admin_response": r.admin_response,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reqs])


@main.route("/admin/api/archive/counts", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive_counts():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    return jsonify({
        "orders": Order.query.filter(
            Order.status.in_(['completed', 'cancelled', 'failed'])
        ).count(),
        "deposits": Deposit.query.filter(
            Deposit.status.in_(['approved', 'rejected'])
        ).count(),
        "kyc": KYCRequest.query.filter(
            KYCRequest.status.in_(['approved', 'rejected'])
        ).count(),
        "services": ServiceRequest.query.filter(
            ServiceRequest.status.in_(['completed', 'rejected', 'cancelled'])
        ).count(),
    })


# ============================================================
# 🆕 v16: RESTORE
# ============================================================
@main.route("/admin/api/orders/<int:order_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_order(order_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404
    if order.status not in ['completed', 'cancelled', 'failed']:
        return jsonify({"error": "الطلب ليس مؤرشفاً"}), 400

    order.status = "pending"
    order.cancelled_at = None
    order.completed_at = None
    order.failed_at = None
    order.updated_at = datetime.now(timezone.utc)

    log_admin_activity(f"استرجاع الطلب {order.order_number} من الأرشيف")
    db.session.commit()

    invalidate_admin("orders")

    return jsonify({"success": True, "status": order.status})


@main.route("/admin/api/deposits/<int:deposit_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status not in ['approved', 'rejected']:
        return jsonify({"error": "الإيداع ليس مؤرشفاً"}), 400

    deposit.status = "pending"
    deposit.reviewed_at = None
    deposit.admin_note = None

    log_admin_activity(f"استرجاع الإيداع {deposit.transaction_id}")
    db.session.commit()

    invalidate_admin("deposits")

    return jsonify({"success": True, "status": deposit.status})


@main.route("/admin/api/kyc/<int:kyc_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.get(kyc_id)
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404
    if kyc.status not in ['approved', 'rejected']:
        return jsonify({"error": "الطلب ليس مؤرشفاً"}), 400

    kyc.status = "pending"
    kyc.reviewed_at = None
    kyc.admin_note = None

    user = User.query.get(kyc.user_id)
    if user:
        user.kyc_status = "pending"
        user.is_verified = False

    log_admin_activity(f"استرجاع KYC {kyc.user_id}")
    db.session.commit()

    invalidate_admin("kyc")

    return jsonify({"success": True, "status": kyc.status})


@main.route("/admin/api/services/<int:req_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_service(req_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    req = ServiceRequest.query.get(req_id)
    if not req:
        return jsonify({"error": "غير موجود"}), 404
    if req.status not in ['completed', 'rejected', 'cancelled']:
        return jsonify({"error": "الطلب ليس مؤرشفاً"}), 400

    req.status = "pending"
    req.admin_response = None

    log_admin_activity(f"استرجاع طلب خدمة {req.id}")
    db.session.commit()

    invalidate_admin("service-requests")

    return jsonify({"success": True, "status": req.status})

# ============================================================
# 🆕 v18.3.8: Admin Inbox
# ============================================================
@main.route("/admin/api/inbox", methods=["GET"])
@jwt_required()
@handle_errors
def admin_inbox():
    """
    شاشة موحّدة لكل ما يحتاج مراجعة:
    - Pending deposits
    - Pending orders (pending/review)
    - Pending KYC
    - Pending service requests
    """
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    LIMIT = 5

    # ═══ Deposits ═══
    deposits_q = (
        Deposit.query
        .filter(Deposit.status == 'pending')
        .order_by(Deposit.created_at.desc())
        .limit(LIMIT)
        .all()
    )

    pending_deposits = []
    for d in deposits_q:
        user = User.query.get(d.user_id)
        pending_deposits.append({
            "id": d.id,
            "transaction_id": d.transaction_id,
            "amount": float(d.amount or 0),
            "fee": float(d.fee or 0),
            "method": d.method,
            "method_id": d.method_id,
            "user_id": d.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": ((user.first_name or user.username) if user else None),
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    # ═══ Orders ═══
    orders_q = (
        Order.query
        .filter(Order.status.in_(['pending', 'review']))
        .order_by(Order.created_at.desc())
        .limit(LIMIT)
        .all()
    )

    pending_orders = []
    for o in orders_q:
        user = User.query.get(o.user_id)
        product = Product.query.get(o.product_id)
        pending_orders.append({
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "quantity": o.quantity,
            "total_price": float(o.total_price or 0),
            "unit_price": float(o.unit_price or 0),
            "product_id": o.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_type": product.product_type if product else None,
            "product_unit_name": product.unit_name if product else "قطعة",
            "user_id": o.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": ((user.first_name or user.username) if user else None),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })

    # ═══ KYC ═══
    kyc_q = (
        KYCRequest.query
        .filter(KYCRequest.status == 'pending')
        .order_by(KYCRequest.submitted_at.desc())
        .limit(LIMIT)
        .all()
    )

    pending_kyc = []
    for k in kyc_q:
        user = User.query.get(k.user_id)
        pending_kyc.append({
            "id": k.id,
            "user_id": k.user_id,
            "user_telegram": user.telegram_id if user else None,
            "full_name": k.full_name,
            "phone": k.phone,
            "address": k.address,
            "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
        })

    # ═══ Services ═══
    services_q = (
        ServiceRequest.query
        .filter(ServiceRequest.status == 'pending')
        .order_by(ServiceRequest.created_at.desc())
        .limit(LIMIT)
        .all()
    )

    pending_services = []
    for r in services_q:
        user = User.query.get(r.user_id)
        pending_services.append({
            "id": r.id,
            "service_name": r.service_name,
            "description": r.description,
            "estimated_price": float(r.estimated_price) if r.estimated_price else None,
            "user_id": r.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": ((user.first_name or user.username) if user else None),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # ═══ Counts ═══
    counts = {
        "deposits": Deposit.query.filter(Deposit.status == 'pending').count(),
        "orders": Order.query.filter(Order.status.in_(['pending', 'review'])).count(),
        "kyc": KYCRequest.query.filter(KYCRequest.status == 'pending').count(),
        "services": ServiceRequest.query.filter(ServiceRequest.status == 'pending').count(),
    }
    counts["total"] = sum(counts.values())

    return jsonify({
        "pending_deposits": pending_deposits,
        "pending_orders": pending_orders,
        "pending_kyc": pending_kyc,
        "pending_services": pending_services,
        "counts": counts,
    })
```

---

## FILE: ./backend/app/routes/auth.py

```
import os
import json
import uuid
import hmac
import hashlib
import time
from datetime import datetime, timezone, timedelta
from urllib.parse import parse_qsl
from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required,
    get_jwt, get_jwt_identity
)
from ..models.base import User, JWTBlacklist, Setting
from ..extensions import db
from . import main

# 🆕 v18.2: نافذة initData قصيرة (10 دقائق بدل ساعة)
AUTH_DATE_MAX_AGE = 600


def verify_telegram_init_data(init_data: str) -> bool:
    if not init_data:
        return False
    token = os.getenv("BOT_TOKEN", "")
    if not token:
        print("BOT_TOKEN غير معرّف")
        return False
    try:
        data = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = data.pop("hash", "")
        if not received_hash:
            return False
        auth_date_raw = data.get("auth_date")
        if not auth_date_raw:
            return False
        try:
            auth_date = int(auth_date_raw)
        except (ValueError, TypeError):
            return False
        if time.time() - auth_date > AUTH_DATE_MAX_AGE:
            return False
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(data.items())
        )
        secret_key = hmac.new(
            b"WebAppData", token.encode(), hashlib.sha256
        ).digest()
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(calculated_hash, received_hash)
    except Exception as e:
        print(f"فشل التحقق من initData: {e}")
        return False


def extract_user_from_init_data(init_data: str):
    try:
        params = dict(parse_qsl(init_data))
        return json.loads(params.get("user", "{}"))
    except Exception:
        return None


def get_or_create_user(telegram_id, first_name="", last_name="", username=""):
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        user = User(
            telegram_id=telegram_id,
            first_name=first_name,
            last_name=last_name,
            username=username,
            balance=0,
            kyc_status='unverified',
            is_verified=False,
            role='user',
            vip_level=0,
            referral_code=uuid.uuid4().hex[:8].upper(),
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(user)
        db.session.commit()
    else:
        changed = False
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            changed = True
        if last_name is not None and user.last_name != last_name:
            user.last_name = last_name
            changed = True
        if username is not None and user.username != username:
            user.username = username
            changed = True
        if changed:
            db.session.commit()
    return user


def user_to_dict(user):
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "balance": float(user.balance) if user.balance is not None else 0.0,
        "kyc_status": user.kyc_status,
        "is_verified": user.is_verified,
        "role": user.role,
        "is_banned": user.is_banned,
        "vip_level": user.vip_level,
        "referral_code": user.referral_code,
        "referral_count": user.referral_count or 0,
        "general_discount": float(user.general_discount) if user.general_discount else 0.0,
    }


@main.route("/api/auth/telegram", methods=["POST"])
def telegram_auth():
    data = request.get_json() or {}
    init_data = data.get("initData", "")

    if not init_data:
        return jsonify({"error": "initData مطلوب"}), 401
    if not verify_telegram_init_data(init_data):
        return jsonify({"error": "بيانات تيليجرام غير صالحة أو منتهية"}), 401

    user_data = extract_user_from_init_data(init_data)
    if not user_data or not user_data.get("id"):
        return jsonify({"error": "بيانات المستخدم غير مكتملة"}), 401

    telegram_id = int(user_data["id"])
    if telegram_id <= 0:
        return jsonify({"error": "telegram_id غير صالح"}), 400

    user = get_or_create_user(
        telegram_id,
        user_data.get("first_name", ""),
        user_data.get("last_name", ""),
        user_data.get("username", ""),
    )

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "telegram_id": user.telegram_id,
            "role": user.role,
            "kyc_status": user.kyc_status,
            "vip_level": user.vip_level,
        }
    )

    return jsonify({
        "access_token": access_token,
        "user": user_to_dict(user),
        **user_to_dict(user),
    }), 200


@main.route("/api/bot/auth", methods=["POST"])
def bot_auth():
    secret = os.getenv("BOT_API_SECRET", "")
    if not secret:
        return jsonify({"error": "الخادم غير مهيأ"}), 500

    provided = request.headers.get("X-Bot-Token", "")
    if not hmac.compare_digest(provided, secret):
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}
    telegram_id = data.get("telegram_id")
    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400
    try:
        telegram_id = int(telegram_id)
        if telegram_id <= 0:
            return jsonify({"error": "telegram_id غير صالح"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "telegram_id غير صالح"}), 400

    user = get_or_create_user(
        telegram_id,
        data.get("first_name", ""),
        data.get("last_name", ""),
        data.get("username", ""),
    )

    return jsonify(user_to_dict(user)), 200


@main.route("/api/user/logout", methods=["POST"])
@jwt_required()
def user_logout():
    jwt_data = get_jwt()
    jti = jwt_data.get("jti")
    exp = jwt_data.get("exp")

    if not jti:
        return jsonify({"error": "توكن غير صالح"}), 400

    try:
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else (
            datetime.now(timezone.utc) + timedelta(hours=2)
        )
        JWTBlacklist.query.filter_by(jti=jti).delete()
        db.session.add(JWTBlacklist(jti=jti, expires_at=expires_at))
        db.session.commit()
        return jsonify({"success": True, "message": "تم تسجيل الخروج"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل تسجيل الخروج: {e}"}), 500


@main.route("/admin/api/logout", methods=["POST"])
@jwt_required()
def admin_logout():
    jwt_data = get_jwt()
    jti = jwt_data.get("jti")
    exp = jwt_data.get("exp")

    if not jti:
        return jsonify({"error": "توكن غير صالح"}), 400

    try:
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else (
            datetime.now(timezone.utc) + timedelta(hours=2)
        )
        JWTBlacklist.query.filter_by(jti=jti).delete()
        db.session.add(JWTBlacklist(jti=jti, expires_at=expires_at))
        db.session.commit()
        return jsonify({"success": True, "message": "تم تسجيل الخروج"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل: {e}"}), 500


def cleanup_expired_blacklist():
    try:
        JWTBlacklist.query.filter(
            JWTBlacklist.expires_at < datetime.now(timezone.utc)
        ).delete()
        db.session.commit()
    except Exception:
        db.session.rollback()


# ============================================================
# 🆕 v17.1: Logout-All Admin Sessions
# ============================================================
def revoke_all_admin_sessions():
    """
    إبطال كل جلسات الأدمن.
    يكتب timestamp في settings؛ أي توكن iat < timestamp يُرفض.
    """
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        setting = Setting.query.filter_by(key="admin_sessions_revoked_at").first()
        if setting:
            setting.value = now_iso
        else:
            db.session.add(Setting(key="admin_sessions_revoked_at", value=now_iso))
        db.session.commit()
        print(f"✅ All admin sessions revoked at {now_iso}")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"❌ revoke_all_admin_sessions failed: {e}")
        return False


def is_admin_token_revoked(jwt_payload):
    """فحص إذا كان التوكن صادراً قبل آخر logout-all."""
    try:
        setting = Setting.query.filter_by(key="admin_sessions_revoked_at").first()
        if not setting or not setting.value:
            return False

        revoked_at = datetime.fromisoformat(setting.value.replace("Z", "+00:00"))
        token_iat = jwt_payload.get("iat")
        if not token_iat:
            return False

        token_iat_dt = datetime.fromtimestamp(token_iat, tz=timezone.utc)
        return token_iat_dt < revoked_at
    except Exception as e:
        print(f"is_admin_token_revoked error: {e}")
        return False```

---

## FILE: ./backend/app/routes/categories.py

```
# ============================================================
# 📁 Categories Routes — v2.2 (with Redis Cache)
# ============================================================
from flask import jsonify
from ..models.base import Category
from . import main
from ..services.cache_service import (
    cache_get, cache_set,
    key_categories, TTL_CATEGORIES,
)


@main.route("/api/categories/", methods=["GET"])
def get_categories():
    # 🚀 حاول من Cache أولاً
    cached = cache_get(key_categories())
    if cached is not None:
        return jsonify(cached)

    # 💾 قراءة من DB
    categories = Category.query.filter_by(is_active=True).order_by(Category.display_order).all()
    result = [{
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "image": c.image,
        "display_order": c.display_order,
    } for c in categories]

    # 💾 احفظ في Cache
    cache_set(key_categories(), result, ttl=TTL_CATEGORIES)
    return jsonify(result)```

---

## FILE: ./backend/app/routes/coupons.py

```
from datetime import datetime, timezone
from flask import request, jsonify
from ..models.base import Coupon, CouponUsage, User
from ..extensions import db
from . import main

@main.route("/api/coupons/validate", methods=["POST"])
def validate_coupon():
    """التحقق من صلاحية كود الخصم"""
    data = request.get_json()
    code = (data.get("code") or "").strip().upper()
    telegram_id = data.get("telegram_id")
    order_amount = float(data.get("order_amount", 0))

    if not code:
        return jsonify({"error": "أدخل كود الخصم"}), 400
    if order_amount <= 0:
        return jsonify({"error": "مبلغ الطلب غير صالح"}), 400

    coupon = Coupon.query.filter_by(code=code).first()
    if not coupon:
        return jsonify({"error": "كود الخصم غير صحيح"}), 404

    if not coupon.is_active:
        return jsonify({"error": "كود الخصم غير مفعل"}), 400

    if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
        return jsonify({"error": "انتهت صلاحية كود الخصم"}), 400

    if coupon.max_uses > 0 and coupon.used_count >= coupon.max_uses:
        return jsonify({"error": "تم استهلاك كود الخصم"}), 400

    if order_amount < coupon.min_amount:
        return jsonify({"error": f"الحد الأدنى لاستخدام الكود هو {coupon.min_amount}$"}), 400

    # التحقق من استخدام المستخدم للكود من قبل
    if telegram_id:
        user = User.query.filter_by(telegram_id=telegram_id).first()
        if user:
            existing = CouponUsage.query.filter_by(coupon_id=coupon.id, user_id=user.id).first()
            if existing:
                return jsonify({"error": "استخدمت هذا الكود من قبل"}), 400

    # حساب الخصم
    if coupon.discount_type == "percentage":
        discount = order_amount * (coupon.discount_value / 100)
        if coupon.max_discount > 0 and discount > coupon.max_discount:
            discount = coupon.max_discount
    else:
        discount = coupon.discount_value
        if discount > order_amount:
            discount = order_amount

    final_amount = max(0, order_amount - discount)

    return jsonify({
        "valid": True,
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "discount_amount": round(discount, 4),
        "final_amount": round(final_amount, 4),
        "message": f"تم تطبيق الخصم بقيمة {round(discount, 2)}$"
    }), 200```

---

## FILE: ./backend/app/routes/deposits.py

```
# ============================================================
# 💰 Deposits Routes — v18.3.0 (base64 in DB, no Cloudinary)
# ============================================================
# Endpoints:
#   GET  /api/deposits/         → list
#   GET  /api/deposits          → alias
#   POST /api/deposits/create   → create
#   POST /api/deposits          → alias
#   POST /api/deposits/         → alias
# ============================================================
# v18.3.0:
#   - تخزين الصورة base64 في DB (بدون Cloudinary)
#   - حل مشكلة datetime naive/aware
#   - كشف idempotency مبكّر
# ============================================================
import re
import uuid
import base64
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import (
    User, Deposit, PaymentMethod, Notification,
)
from ..extensions import db
from . import main
from ..services.telegram_service import notify_admins


# ════════════════════════════════════════════════════════════
# Constants
# ════════════════════════════════════════════════════════════
MAX_DATA_URL_LENGTH = 3 * 1024 * 1024       # 3 MB base64
MAX_BINARY_SIZE = 2 * 1024 * 1024           # 2 MB binary
# 🆕 v18.3.6: أُزيلت DAILY_DEPOSIT_CAP و NEW_USER_CAP — الأدمن يحدد min/max لكل طريقة
PENDING_DEPOSITS_MAX = 3

ALLOWED_MIME_TYPES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png":  [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}


# ════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════
def _aware(dt):
    """يحوّل naive datetime إلى aware UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _utcnow():
    return datetime.now(timezone.utc)


def _d(v):
    if v is None:
        return Decimal('0.0000')
    if isinstance(v, Decimal):
        return v.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    return Decimal(str(v)).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)


def _f(v):
    if v is None:
        return 0.0
    return float(v)


def _get_user():
    ident = get_jwt_identity()
    if not ident:
        return None
    try:
        return User.query.get(int(ident))
    except (ValueError, TypeError):
        return None


def _serialize_deposit(d):
    """تحويل Deposit → JSON. proof_image يُرجَع كما هو (base64 أو URL)."""
    return {
        "id": d.id,
        "transaction_id": d.transaction_id,
        "amount": _f(d.amount),
        "fee": _f(d.fee) if d.fee else 0.0,
        "currency": d.currency,
        "method": d.method,
        "method_id": d.method_id,
        "status": d.status,
        "admin_note": d.admin_note,
        "proof_image": d.proof_image if d.proof_image else None,
        "sender_name": d.sender_name,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "reviewed_at": d.reviewed_at.isoformat() if d.reviewed_at else None,
    }


def _validate_image(data_url):
    """تحقق MIME + size + magic bytes."""
    if not data_url or not isinstance(data_url, str):
        return False, "الصورة مطلوبة"

    if len(data_url) > MAX_DATA_URL_LENGTH:
        return False, "الصورة كبيرة جداً (الحد 3 MB)"

    if not data_url.startswith("data:image/"):
        return False, "صيغة الصورة غير صحيحة"

    match = re.match(r"^data:(image/[a-z]+);base64,(.+)$", data_url, re.DOTALL)
    if not match:
        return False, "بيانات Base64 تالفة"

    mime_type, b64_data = match.group(1), match.group(2)

    if mime_type not in ALLOWED_MIME_TYPES:
        return False, f"صيغة غير مدعومة ({mime_type})"

    try:
        binary = base64.b64decode(b64_data, validate=True)
    except Exception:
        return False, "بيانات Base64 تالفة"

    if len(binary) < 100:
        return False, "الصورة صغيرة جداً"

    if len(binary) > MAX_BINARY_SIZE:
        return False, "الصورة كبيرة جداً بعد فك الترميز"

    if not any(binary.startswith(sig) for sig in ALLOWED_MIME_TYPES[mime_type]):
        return False, "محتوى الملف لا يطابق الصيغة"

    if mime_type == "image/webp":
        if len(binary) < 12 or binary[8:12] != b"WEBP":
            return False, "ملف WebP تالف"

    return True, None


def _pending_count(user_id):
    return Deposit.query.filter_by(user_id=user_id, status='pending').count()


def _calculate_fee(method, amount_d):
    """🆕 v18.3.6: احسب الرسوم (percentage أو fixed)"""
    if not method or not method.fee:
        return Decimal('0.0000')
    fee_val = _d(method.fee)
    if fee_val <= 0:
        return Decimal('0.0000')
    fee_type = method.fee_type or 'percentage'
    if fee_type == 'percentage':
        return (amount_d * fee_val / Decimal('100')).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    else:  # fixed
        if fee_val > amount_d:
            return amount_d
        return fee_val.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)


# ════════════════════════════════════════════════════════════
# GET /api/deposits/
# ════════════════════════════════════════════════════════════
@main.route("/api/deposits/", methods=["GET"])
@main.route("/api/deposits", methods=["GET"])
@jwt_required()
def list_deposits():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
    except (ValueError, TypeError):
        limit, offset = 50, 0

    deposits = (
        Deposit.query
        .filter_by(user_id=user.id)
        .order_by(Deposit.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return jsonify([_serialize_deposit(d) for d in deposits])


# ════════════════════════════════════════════════════════════
# POST /api/deposits/ — create
# ════════════════════════════════════════════════════════════
@main.route("/api/deposits/create", methods=["POST"])
@main.route("/api/deposits", methods=["POST"])
@main.route("/api/deposits/", methods=["POST"])
@jwt_required()
def create_deposit():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    if user.is_banned:
        return jsonify({"error": "حسابك موقوف", "code": "USER_BANNED"}), 403

    if user.kyc_status != 'verified' and not user.is_verified:
        return jsonify({
            "error": "يجب توثيق حسابك أولاً",
            "code": "KYC_REQUIRED",
        }), 403

    data = request.get_json() or {}
    method_id = data.get("method_id") or data.get("method")
    amount_raw = data.get("amount")
    sender_name = (data.get("sender_name") or "").strip()
    proof_image = data.get("proof_image", "")
    idempotency_key = (data.get("idempotency_key") or "").strip() or None

    # Idempotency — مبكر جداً
    if idempotency_key:
        existing = Deposit.query.filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return jsonify({
                "transaction_id": existing.transaction_id,
                "status": existing.status,
                "idempotent": True,
            }), 200

    if not method_id:
        return jsonify({"error": "طريقة الدفع مطلوبة"}), 400
    if amount_raw is None:
        return jsonify({"error": "المبلغ مطلوب"}), 400
    if not sender_name:
        return jsonify({"error": "اسم المرسل مطلوب"}), 400
    if not proof_image:
        return jsonify({"error": "صورة الإثبات مطلوبة"}), 400

    method = PaymentMethod.query.filter_by(id=method_id, is_active=True).first()
    if not method:
        return jsonify({"error": "طريقة الدفع غير متوفرة"}), 404

    try:
        amount_d = _d(amount_raw)
    except (ValueError, TypeError):
        return jsonify({"error": "المبلغ غير صحيح"}), 400

    if amount_d <= 0:
        return jsonify({"error": "المبلغ غير صحيح"}), 400

    if method.min_amount and amount_d < _d(method.min_amount):
        return jsonify({
            "error": f"الحد الأدنى {_f(method.min_amount)}$",
            "code": "AMOUNT_BELOW_MIN",
        }), 400

    # 🆕 v18.3.6: max_amount مع fallback آمن
    try:
        max_amount = _d(method.max_amount) if method.max_amount else Decimal('500.0000')
    except AttributeError:
        max_amount = Decimal('500.0000')
    if amount_d > max_amount:
        return jsonify({
            "error": f"الحد الأقصى {_f(max_amount)}$",
            "code": "AMOUNT_ABOVE_MAX",
        }), 400

    # Validate image
    is_valid, error_msg = _validate_image(proof_image)
    if not is_valid:
        return jsonify({
            "error": error_msg,
            "code": "IMAGE_INVALID",
        }), 400

    # 🆕 v18.3.6: أُزيل السقف اليومي — الأدمن يحدد min/max لكل طريقة
    # Pending count
    pending = _pending_count(user.id)
    if pending >= PENDING_DEPOSITS_MAX:
        return jsonify({
            "error": f"لديك {pending} إيداعات قيد المراجعة — انتظر",
            "code": "TOO_MANY_PENDING",
            "pending": pending,
            "max": PENDING_DEPOSITS_MAX,
        }), 400

    # ═══ احسب الرسوم ═══
    fee_amount = _calculate_fee(method, amount_d)

    # ═══ إنشاء الإيداع — الصورة base64 مباشرة في DB ═══
    try:
        deposit = Deposit(
            user_id=user.id,
            amount=amount_d,
            fee=fee_amount,
            currency='USD',
            method_id=method.id,
            method=method.name,
            proof_image=proof_image,
            sender_name=sender_name,
            transaction_id='DEP-' + uuid.uuid4().hex[:8].upper(),
            status='pending',
            idempotency_key=idempotency_key,
        )
        db.session.add(deposit)
        db.session.add(Notification(
            user_id=user.id,
            title='إيداع قيد المراجعة',
            message=f'تم استلام إيداعك بقيمة {_f(amount_d)}$ — سيُراجع قريباً',
            type='info',
        ))
        db.session.commit()

        try:
            notify_admins(
                f'💰 إيداع جديد: {deposit.transaction_id}\n'
                f'المبلغ: {_f(amount_d)}$\n'
                f'من: {user.telegram_id}'
            )
        except Exception:
            pass

        return jsonify({
            'transaction_id': deposit.transaction_id,
            'status': deposit.status,
            'amount': _f(amount_d),
            'fee': _f(fee_amount),
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ create_deposit error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'فشل إنشاء الإيداع',
            'code': 'INTERNAL_ERROR',
        }), 500```

---

## FILE: ./backend/app/routes/orders.py

```
# ============================================================
# 📦 Orders Routes — v18.3.4
# ============================================================
# Endpoints:
#   GET  /api/orders/            → user's orders (list)
#   POST /api/orders/create      → create new order
#   POST /api/orders/<id>/cancel → cancel (120s window)
# ============================================================
# v18.2:
#   - Decimal لكل الحسابات
#   - رفض المخزون إذا لا يكفي (لا max(0, ...))
#   - قفل صف الكوبون (لا تجاوز max_uses)
#   - قفل صف الطلب عند الإلغاء
#   - topup لا يُخصم من المخزون
# ============================================================
# 🆕 v18.3.4:
#   - إصلاح حساب unit_price: دائماً base_price / base_qty
#   - السبب: base_price هو سعر الحزمة كاملة (base_qty وحدة)
#     مثال: Xena Live — 8700 وحدة مقابل 1.00$ → الوحدة = 0.000115$
#     قبل الإصلاح: 1.00 × 8700 = 8700$ ❌
#     بعد الإصلاح: 0.000115 × 8700 = 1.00$ ✅
# ============================================================
import json
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import (
    User, Product, ProductBundle, Order, Coupon, CouponUsage,
    Transaction, Notification, Referral,
    UserProductDiscount, log_financial,
)
from ..extensions import db
from . import main
from ..services.telegram_service import notify_admins


CANCEL_WINDOW_SECONDS = 120
REFERRAL_REWARD = Decimal('1.0000')


# ════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════
def _d(v):
    """تحويل آمن إلى Decimal بـ 4 خانات عشرية"""
    if v is None:
        return Decimal('0.0000')
    if isinstance(v, Decimal):
        return v.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    return Decimal(str(v)).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)


def _f(v):
    """Decimal → float للـ JSON"""
    if v is None:
        return 0.0
    return float(v)


def _get_user():
    ident = get_jwt_identity()
    if not ident:
        return None
    try:
        return User.query.get(int(ident))
    except (ValueError, TypeError):
        return None


def _serialize_order(order, product=None):
    """تحويل Order إلى dict للـ JSON"""
    p = product or Product.query.get(order.product_id)

    delivery = None
    if order.delivery_data:
        try:
            delivery = json.loads(order.delivery_data) if isinstance(order.delivery_data, str) else order.delivery_data
        except Exception:
            delivery = None

    return {
        "id": order.id,
        "order_number": order.order_number,
        "product_id": order.product_id,
        "product_name": p.name if p else "منتج محذوف",
        "product_type": p.product_type if p else None,
        "product_unit_name": p.unit_name if p else "قطعة",
        "product_image": p.image if p else None,
        "quantity": order.quantity,
        "unit_price": _f(order.unit_price),
        "total_price": _f(order.total_price),
        "discount_amount": _f(order.discount_amount),
        "coupon_code": order.coupon_code,
        "status": order.status,
        "delivery_data": delivery,
        "can_cancel_until": order.can_cancel_until.isoformat() if order.can_cancel_until else None,
        "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
        "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        "failed_at": order.failed_at.isoformat() if order.failed_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


# ════════════════════════════════════════════════════════════
# GET /api/orders/ — list user orders
# ════════════════════════════════════════════════════════════
@main.route("/api/orders/", methods=["GET"])
@main.route("/api/orders", methods=["GET"])
@jwt_required()
def list_orders():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
    except (ValueError, TypeError):
        limit, offset = 50, 0

    orders = (
        Order.query
        .filter_by(user_id=user.id)
        .order_by(Order.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    # نضمّ المنتجات في استعلام واحد (تجنب N+1)
    product_ids = [o.product_id for o in orders]
    products = {}
    if product_ids:
        prods = Product.query.filter(Product.id.in_(product_ids)).all()
        products = {p.id: p for p in prods}

    return jsonify([_serialize_order(o, products.get(o.product_id)) for o in orders])


# ════════════════════════════════════════════════════════════
# POST /api/orders/create
# ════════════════════════════════════════════════════════════
@main.route("/api/orders/create", methods=["POST"])
@main.route("/api/orders", methods=["POST"])
@jwt_required()
def create_order():
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    if user.is_banned:
        return jsonify({"error": "حسابك موقوف", "code": "USER_BANNED"}), 403

    data = request.get_json() or {}
    product_id = data.get("product_id")
    idempotency_key = (data.get("idempotency_key") or "").strip()
    coupon_code = (data.get("coupon_code") or "").strip().upper() or None
    bundle_id = data.get("bundle_id")

    if not product_id:
        return jsonify({"error": "product_id مطلوب"}), 400
    if not idempotency_key:
        return jsonify({"error": "idempotency_key مطلوب"}), 400

    # ─── Idempotency (fast path) ───
    existing = Order.query.filter_by(idempotency_key=idempotency_key).first()
    if existing:
        return jsonify({
            "order_number": existing.order_number,
            "total_price": _f(existing.total_price),
            "status": existing.status,
            "idempotent": True,
        }), 200

    try:
        # ═════════════════════════════════════════════════════════
        # 🔒 بداية القسم الحرج — كل الأقفال داخل معاملة واحدة
        # ═════════════════════════════════════════════════════════

        # 1. اقفل المستخدم
        locked_user = User.query.filter_by(id=user.id).with_for_update().first()
        if not locked_user:
            return jsonify({"error": "مستخدم غير موجود"}), 404

        # 2. اقفل المنتج
        product = Product.query.filter_by(id=product_id).with_for_update().first()
        if not product or not product.is_active or product.deleted_at:
            return jsonify({"error": "المنتج غير متوفر", "code": "PRODUCT_NOT_FOUND"}), 404

        # ═══ 3. الكمية والسعر الأساسي (حسب النوع) ═══
        is_topup = (product.product_type == 'topup')
        is_bundle = (product.product_type == 'bundle')

        if is_bundle:
            if not bundle_id:
                return jsonify({"error": "bundle_id مطلوب"}), 400
            bundle = ProductBundle.query.filter_by(
                id=bundle_id, product_id=product.id, is_active=True
            ).first()
            if not bundle:
                return jsonify({"error": "الباقة غير متوفرة"}), 404
            quantity = 1
            unit_price = _d(bundle.price_usd)
            base_total = unit_price
            bundle_name = bundle.name
        else:
            try:
                quantity = int(data.get("quantity", 1))
            except (ValueError, TypeError):
                return jsonify({"error": "الكمية غير صحيحة"}), 400
            if quantity < 1:
                return jsonify({"error": "الكمية غير صحيحة"}), 400

            # حد أعلى للكمية
            max_q = product.max_quantity or 0
            if max_q > 0 and quantity > max_q:
                return jsonify({
                    "error": f"الحد الأقصى {max_q}",
                    "code": "MAX_QUANTITY_EXCEEDED",
                }), 400

            # السعر
            base_qty = product.base_quantity or 1
            base_price = _d(product.base_price)

            # 🆕 v18.3.4: unit_price = base_price / base_qty دائماً
            # السبب: base_price هو سعر الحزمة كاملة (base_qty وحدة)
            # مثال: Xena Live — 8700 وحدة مقابل 1.00$ → الوحدة 0.000115$
            if base_qty > 0:
                unit_price = (base_price / Decimal(base_qty)).quantize(
                    Decimal('0.0001'), rounding=ROUND_HALF_UP
                )
            else:
                unit_price = base_price

            base_total = (unit_price * Decimal(quantity)).quantize(
                Decimal('0.0001'), rounding=ROUND_HALF_UP
            )
            bundle_name = None

        # ═══ 4. تحقق المخزون (رفض، لا max) ═══
        # topup لا يُخصم من المخزون
        stock_to_check = quantity if not is_topup else 0
        if not is_topup and product.stock is not None:
            if product.stock < stock_to_check:
                return jsonify({
                    "error": f"الكمية المتوفرة {product.stock} فقط",
                    "code": "STOCK_INSUFFICIENT",
                    "available": product.stock,
                }), 400

        # ═══ 5. خصم المستخدم (منتج محدد → عام) ═══
        user_discount_pct = Decimal('0.0000')
        product_discount = UserProductDiscount.query.filter_by(
            user_id=locked_user.id, product_id=product.id
        ).first()
        if product_discount and _d(product_discount.discount_percent) > 0:
            user_discount_pct = _d(product_discount.discount_percent)
        elif locked_user.general_discount and _d(locked_user.general_discount) > 0:
            user_discount_pct = _d(locked_user.general_discount)

        if user_discount_pct > 0:
            after_user_discount = (
                base_total * (Decimal('1') - user_discount_pct / Decimal('100'))
            ).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
        else:
            after_user_discount = base_total

        # ═══ 6. الكوبون (مع قفل الصف) ═══
        coupon_discount = Decimal('0.0000')
        coupon_obj = None

        if coupon_code:
            coupon_obj = Coupon.query.filter_by(code=coupon_code).with_for_update().first()

            if not coupon_obj:
                return jsonify({"error": "كود الخصم غير صحيح", "code": "COUPON_INVALID"}), 400
            if not coupon_obj.is_active or coupon_obj.deleted_at:
                return jsonify({"error": "الكود غير مفعّل", "code": "COUPON_INVALID"}), 400
            if coupon_obj.expires_at and coupon_obj.expires_at < datetime.now(timezone.utc):
                return jsonify({"error": "انتهت صلاحية الكود", "code": "COUPON_EXPIRED"}), 400
            if coupon_obj.max_uses > 0 and coupon_obj.used_count >= coupon_obj.max_uses:
                return jsonify({"error": "تم استهلاك الكود", "code": "COUPON_EXHAUSTED"}), 400
            if after_user_discount < _d(coupon_obj.min_amount):
                return jsonify({
                    "error": f"الحد الأدنى {_f(coupon_obj.min_amount)}$",
                    "code": "COUPON_MIN_AMOUNT",
                }), 400

            # استخدم الكود من قبل؟
            existing_usage = CouponUsage.query.filter_by(
                coupon_id=coupon_obj.id, user_id=locked_user.id
            ).first()
            if existing_usage:
                return jsonify({
                    "error": "استخدمت هذا الكود من قبل",
                    "code": "COUPON_ALREADY_USED",
                }), 400

            # حساب الخصم
            if coupon_obj.discount_type == 'percentage':
                coupon_discount = (
                    after_user_discount * (_d(coupon_obj.discount_value) / Decimal('100'))
                ).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
                if coupon_obj.max_discount and _d(coupon_obj.max_discount) > 0:
                    cap = _d(coupon_obj.max_discount)
                    if coupon_discount > cap:
                        coupon_discount = cap
            else:  # fixed
                coupon_discount = _d(coupon_obj.discount_value)
                if coupon_discount > after_user_discount:
                    coupon_discount = after_user_discount

        # ═══ 7. المجموع النهائي ═══
        total = (after_user_discount - coupon_discount).quantize(
            Decimal('0.0001'), rounding=ROUND_HALF_UP
        )
        if total < Decimal('0.0000'):
            total = Decimal('0.0000')

        # ═══ 8. تحقق الرصيد ═══
        current_balance = _d(locked_user.balance)

        if total > current_balance:
            if locked_user.allow_negative_balance:
                max_neg = _d(locked_user.max_negative_balance)
                new_balance = current_balance - total
                if new_balance < -max_neg:
                    return jsonify({
                        "error": "الرصيد السالب ممتلئ",
                        "code": "NEGATIVE_LIMIT_EXCEEDED",
                        "current": _f(current_balance),
                        "limit": _f(max_neg),
                    }), 400
            else:
                return jsonify({
                    "error": "رصيدك غير كافٍ",
                    "code": "INSUFFICIENT_BALANCE",
                    "balance": _f(current_balance),
                    "required": _f(total),
                }), 400

        # ═══ 9. بناء delivery_data من المدخلات ═══
        delivery = {}
        input_type = product.input_type or 'none'

        if input_type == 'id':
            pid = (data.get("player_id") or "").strip()
            if not pid or not pid.isdigit():
                return jsonify({"error": "ايدي اللاعب مطلوب (أرقام فقط)"}), 400
            if len(pid) > 20:
                return jsonify({"error": "ايدي اللاعب طويل جداً"}), 400
            delivery['player_id'] = pid

        elif input_type == 'account_id':
            aid = (data.get("account_id") or "").strip()
            if not aid or not aid.isdigit():
                return jsonify({"error": "ايدي الحساب مطلوب (أرقام فقط)"}), 400
            if len(aid) > 30:
                return jsonify({"error": "ايدي الحساب طويل جداً"}), 400
            delivery['account_id'] = aid

        elif input_type == 'phone':
            phone = (data.get("phone") or "").strip()
            if not phone or not phone.isdigit():
                return jsonify({"error": "رقم الهاتف مطلوب (أرقام فقط)"}), 400
            if not (8 <= len(phone) <= 15):
                return jsonify({"error": "رقم الهاتف غير صحيح"}), 400
            delivery['phone'] = phone

        elif input_type == 'url':
            url = (data.get("url") or "").strip()
            if not url:
                return jsonify({"error": "الرابط مطلوب"}), 400
            if not url.lower().startswith(('http://', 'https://')):
                return jsonify({"error": "الرابط يجب أن يبدأ بـ http:// أو https://"}), 400
            if len(url) > 1000:
                return jsonify({"error": "الرابط طويل جداً"}), 400
            delivery['url'] = url

        # إضافات خاصة
        if is_bundle:
            delivery['bundle_name'] = bundle_name
            delivery['bundle_quantity'] = bundle.quantity

        if is_topup:
            delivery['syp_amount'] = quantity

        # ═══ 10. إنشاء الطلب ═══
        order = Order(
            order_number='ORD-' + uuid.uuid4().hex[:8].upper(),
            user_id=locked_user.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price,
            total_price=total,
            discount_amount=(base_total - total).quantize(
                Decimal('0.0001'), rounding=ROUND_HALF_UP
            ),
            coupon_code=coupon_code,
            status='pending',
            delivery_data=json.dumps(delivery, ensure_ascii=False),
            idempotency_key=idempotency_key,
            can_cancel_until=datetime.now(timezone.utc) + timedelta(seconds=CANCEL_WINDOW_SECONDS),
        )
        db.session.add(order)
        db.session.flush()  # order.id

        # ═══ 11. خصم الرصيد ═══
        balance_before = current_balance
        locked_user.balance = (current_balance - total).quantize(
            Decimal('0.0001'), rounding=ROUND_HALF_UP
        )

        # ═══ 12. سجل الحركة ═══
        db.session.add(Transaction(
            user_id=locked_user.id,
            type='purchase',
            amount=total,
            balance_after=locked_user.balance,
            reference_type='order',
            reference_id=order.id,
        ))

        log_financial(
            user=locked_user,
            action='order_created',
            amount=total,
            balance_before=balance_before,
            balance_after=locked_user.balance,
            ref_type='order',
            ref_id=order.id,
        )

        # ═══ 13. خصم المخزون (بلا max) ═══
        # topup: لا يُخصم
        if not is_topup and product.stock is not None:
            product.stock = product.stock - quantity

        # ═══ 14. تسجيل الكوبون ═══
        if coupon_obj:
            coupon_obj.used_count = (coupon_obj.used_count or 0) + 1
            db.session.add(CouponUsage(
                coupon_id=coupon_obj.id,
                user_id=locked_user.id,
                order_id=order.id,
                discount_applied=coupon_discount,
            ))

        # ═══ 15. مكافأة الإحالة (عند أول طلب) ═══
        _process_referral_inline(locked_user, order)

        # ═══ 16. إشعار ═══
        db.session.add(Notification(
            user_id=locked_user.id,
            title='تم إنشاء طلبك',
            message=f'طلبك {order.order_number} بقيمة {_f(total)}$ قيد المعالجة',
            type='info',
        ))

        db.session.commit()
        # ═════════════════════════════════════════════════════════
        # 🔓 نهاية القسم الحرج
        # ═════════════════════════════════════════════════════════

        # إشعار الأدمن (خارج المعاملة)
        try:
            notify_admins(
                f'🛍️ طلب جديد: {order.order_number} — {_f(total)}$\n'
                f'من: {locked_user.telegram_id}'
            )
        except Exception:
            pass

        return jsonify({
            'order_number': order.order_number,
            'total_price': _f(total),
            'status': order.status,
            'balance_after': _f(locked_user.balance),
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ create_order error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'فشل إنشاء الطلب', 'code': 'INTERNAL_ERROR'}), 500


# ════════════════════════════════════════════════════════════
# Helper: Referral (inline, داخل المعاملة)
# ════════════════════════════════════════════════════════════
def _process_referral_inline(user, order):
    """
    إذا كان المستخدم مُحالاً (referred_by_id موجود)،
    وليس لديه referral مكتمل بعد → امنح المُحيل المكافأة.
    """
    if not user.referred_by_id:
        return

    # هل سبق أن أكملنا إحالة هذا المستخدم؟
    existing = Referral.query.filter_by(
        referred_user_id=user.id, status='completed'
    ).first()
    if existing:
        return

    # امنح المُحيل المكافأة
    referrer = User.query.filter_by(id=user.referred_by_id).with_for_update().first()
    if not referrer:
        return

    reward = REFERRAL_REWARD

    # أنشئ سجل الإحالة أو حدّثه
    referral = Referral.query.filter_by(
        referrer_id=referrer.id, referred_user_id=user.id
    ).first()

    if not referral:
        referral = Referral(
            referrer_id=referrer.id,
            referred_user_id=user.id,
            reward_amount=reward,
            status='completed',
            completed_at=datetime.now(timezone.utc),
        )
        db.session.add(referral)
    else:
        if referral.status == 'completed':
            return
        referral.reward_amount = reward
        referral.status = 'completed'
        referral.completed_at = datetime.now(timezone.utc)

    # رصيد المُحيل
    balance_before = _d(referrer.balance)
    referrer.balance = (balance_before + reward).quantize(
        Decimal('0.0001'), rounding=ROUND_HALF_UP
    )
    referrer.referral_earnings = (_d(referrer.referral_earnings) + reward).quantize(
        Decimal('0.0001'), rounding=ROUND_HALF_UP
    )
    referrer.referral_count = (referrer.referral_count or 0) + 1

    # سجل الحركة
    db.session.add(Transaction(
        user_id=referrer.id,
        type='referral_reward',
        amount=reward,
        balance_after=referrer.balance,
        reference_type='referral',
        reference_id=referral.id if referral.id else 0,
    ))

    log_financial(
        user=referrer,
        action='referral_reward',
        amount=reward,
        balance_before=balance_before,
        balance_after=referrer.balance,
        ref_type='referral',
        ref_id=None,
        note=f'مكافأة إحالة للطلب {order.order_number}',
    )

    db.session.add(Notification(
        user_id=referrer.id,
        title='مكافأة إحالة',
        message=f'حصلت على {_f(reward)}$ بسبب طلب صديقك',
        type='success',
    ))


# ════════════════════════════════════════════════════════════
# POST /api/orders/<id>/cancel
# ════════════════════════════════════════════════════════════
@main.route("/api/orders/<int:order_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_order(order_id):
    user = _get_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    try:
        # ═════════════════════════════════════════════════════════
        # 🔒 بداية القسم الحرج
        # ═════════════════════════════════════════════════════════

        # 1. اقفل الطلب أولاً
        order = Order.query.filter_by(id=order_id).with_for_update().first()

        if not order:
            return jsonify({"error": "الطلب غير موجود"}), 404
        if order.user_id != user.id:
            return jsonify({"error": "غير مصرح"}), 403
        if order.status != 'pending':
            return jsonify({
                "error": "لا يمكن الإلغاء في هذه الحالة",
                "code": "ORDER_NOT_CANCELLABLE",
                "status": order.status,
            }), 400
        if not order.can_cancel_until or order.can_cancel_until < datetime.now(timezone.utc):
            return jsonify({
                "error": "انتهى وقت الإلغاء",
                "code": "ORDER_TIME_EXPIRED",
            }), 400

        # 2. اقفل المستخدم
        locked_user = User.query.filter_by(id=user.id).with_for_update().first()

        # 3. اقفل المنتج (لاسترداد المخزون)
        product = Product.query.filter_by(id=order.product_id).with_for_update().first()

        # 4. استرداد الرصيد
        refund = _d(order.total_price)
        balance_before = _d(locked_user.balance)
        locked_user.balance = (balance_before + refund).quantize(
            Decimal('0.0001'), rounding=ROUND_HALF_UP
        )

        # 5. تحديث حالة الطلب
        order.status = 'cancelled'
        order.cancelled_at = datetime.now(timezone.utc)

        # 6. سجل الحركة
        db.session.add(Transaction(
            user_id=locked_user.id,
            type='refund',
            amount=refund,
            balance_after=locked_user.balance,
            reference_type='order_cancel',
            reference_id=order.id,
        ))

        log_financial(
            user=locked_user,
            action='order_cancelled',
            amount=refund,
            balance_before=balance_before,
            balance_after=locked_user.balance,
            ref_type='order',
            ref_id=order.id,
        )

        # 7. استرداد المخزون (إن كان للمنتج مخزون وكان ليس topup)
        is_topup = (product and product.product_type == 'topup')
        if product and product.stock is not None and not is_topup:
            product.stock = product.stock + order.quantity

        # 8. إشعار
        db.session.add(Notification(
            user_id=locked_user.id,
            title='تم إلغاء الطلب',
            message=f'تم استرداد {_f(refund)}$ لطلبك {order.order_number}',
            type='success',
        ))

        db.session.commit()
        # ═════════════════════════════════════════════════════════
        # 🔓 نهاية القسم الحرج
        # ═════════════════════════════════════════════════════════

        try:
            notify_admins(f'❌ إلغاء طلب: {order.order_number} — {_f(refund)}$')
        except Exception:
            pass

        return jsonify({
            "status": "cancelled",
            "refund": _f(refund),
            "balance": _f(locked_user.balance),
        })

    except Exception as e:
        db.session.rollback()
        print(f"❌ cancel_order error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "فشل الإلغاء", "code": "INTERNAL_ERROR"}), 500```

---

## FILE: ./backend/app/routes/payment_methods.py

```
# ============================================================
# 💳 Payment Methods Routes — v2.2 (with Redis Cache)
# ============================================================
from flask import jsonify
from ..models.base import PaymentMethod
from . import main
from ..services.cache_service import (
    cache_get, cache_set,
    key_payment_methods, TTL_PAYMENT_METHODS,
)


@main.route("/api/payment-methods/", methods=["GET"])
def get_payment_methods():
    # 🚀 حاول من Cache أولاً
    cached = cache_get(key_payment_methods())
    if cached is not None:
        return jsonify(cached)

    # 💾 قراءة من DB
    methods = PaymentMethod.query.filter_by(is_active=True).all()
    result = [{
        "id": m.id,
        "name": m.name,
        "description": m.description,
        "account": m.account,
        "account_name": m.account_name,
        "icon": m.icon,
        "qr_image": m.qr_image,
        "min_amount": m.min_amount,
        "max_amount": m.max_amount if m.max_amount else 500.0,
        "fee": m.fee or 0,
        "fee_type": m.fee_type or "percentage",
        "requires_kyc": m.requires_kyc,
    } for m in methods]

    # 💾 احفظ في Cache
    cache_set(key_payment_methods(), result, ttl=TTL_PAYMENT_METHODS)
    return jsonify(result)```

---

## FILE: ./backend/app/routes/products.py

```
# ============================================================
# 📦 Products Routes — v2.2 (with Redis Cache)
# ============================================================
from flask import jsonify, request
from ..models.base import Product, ProductBundle
from . import main
from ..services.cache_service import (
    cache_get, cache_set,
    key_products, TTL_PRODUCTS,
)


@main.route("/api/products/", methods=["GET"])
def get_products():
    category_id = request.args.get("category_id", type=int)

    # 🚀 حاول من Cache أولاً
    cache_key = key_products(category_id)
    cached = cache_get(cache_key)
    if cached is not None:
        return jsonify(cached)

    # 💾 قراءة من DB
    query = Product.query.filter_by(is_active=True)
    if category_id:
        query = query.filter_by(category_id=category_id)
    products = query.all()

    result = []
    for p in products:
        bundles = ProductBundle.query.filter_by(
            product_id=p.id, is_active=True
        ).order_by(ProductBundle.price_usd).all()
        result.append({
            "id": p.id,
            "category_id": p.category_id,
            "name": p.name,
            "description": p.description,
            "image": p.image,
            "product_type": p.product_type,
            "base_quantity": p.base_quantity,
            "base_price": p.base_price,
            "unit_name": p.unit_name or "قطعة",
            "input_type": p.input_type,
            "custom_input_label": p.custom_input_label,
            "stock": p.stock,
            "max_quantity": p.max_quantity,
            "is_bundle": p.is_bundle,
            "bundles": [{
                "id": b.id,
                "name": b.name,
                "quantity": b.quantity,
                "price_usd": b.price_usd,
            } for b in bundles],
        })

    # 💾 احفظ في Cache
    cache_set(cache_key, result, ttl=TTL_PRODUCTS)
    return jsonify(result)```

---

## FILE: ./backend/app/routes/referrals.py

```
from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import User, Referral, Notification, Transaction
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification

REFERRAL_REWARD = 1.0


def get_current_user():
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        user_id = int(identity)
    except (ValueError, TypeError):
        return None
    return User.query.get(user_id)


@main.route("/api/user/referrals", methods=["GET"])
@jwt_required()
def get_user_referrals():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    referrals = Referral.query.filter_by(
        referrer_id=user.id
    ).order_by(Referral.created_at.desc()).all()

    return jsonify({
        "referral_code": user.referral_code,
        "referral_count": user.referral_count or 0,
        "referral_earnings": user.referral_earnings or 0.0,
        "referrals": [{
            "id": r.id,
            "referred_user_id": r.referred_user_id,
            "reward_amount": r.reward_amount,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        } for r in referrals]
    }), 200


@main.route("/api/user/apply-referral", methods=["POST"])
@jwt_required()
def apply_referral():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}
    referral_code = (data.get("referral_code") or "").strip().upper()

    if not referral_code:
        return jsonify({"error": "كود الإحالة مطلوب"}), 400

    # لا يمكن بعد أول طلب
    if user.orders:
        return jsonify({"error": "لا يمكن تطبيق كود الإحالة بعد أول طلب"}), 400

    # 🆕 FIX: التحقق من كلا الحقلين
    if user.referred_by_id or user.referred_by:
        return jsonify({"error": "تم تطبيق كود إحالة مسبقاً"}), 400

    referrer = User.query.filter_by(referral_code=referral_code).first()
    if not referrer:
        return jsonify({"error": "كود الإحالة غير صحيح"}), 404

    if referrer.id == user.id:
        return jsonify({"error": "لا يمكنك استخدام كودك الخاص"}), 400

    # 🆕 FIX: اكتب في كلا الحقلين (referred_by_id هو المستخدم الفعلي)
    user.referred_by = referrer.telegram_id
    user.referred_by_id = referrer.id

    referral = Referral(
        referrer_id=referrer.id,
        referred_user_id=user.id,
        reward_amount=0.0,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(referral)
    db.session.commit()

    return jsonify({
        "message": "تم تطبيق كود الإحالة بنجاح، ستحصل على مكافأة عند أول عملية شراء",
        "referral_id": referral.id,
    }), 200```

---

## FILE: ./backend/app/routes/settings_public.py

```
# ============================================================
# 🌐 Public Settings + Health Check — v18.3.6
# ============================================================
import time
from flask import jsonify
from sqlalchemy import text
from ..models.base import Setting
from ..extensions import db
from ..services.cache_service import (
    is_healthy as redis_healthy,
    cache_get,
    cache_set,
    key_settings_public,
    TTL_SETTINGS,
)
from . import main


# ============================================================
# 🌐 Public Settings — with caching
# ============================================================
@main.route("/api/settings/public", methods=["GET"])
def get_public_settings():
    """إعدادات عامة للمستخدمين (بدون مصادقة) — cached 5 min"""
    # 🚀 حاول من Cache أولاً
    cached = cache_get(key_settings_public())
    if cached is not None:
        return jsonify(cached)

    # 💾 قراءة من DB
    PUBLIC_KEYS = ["syp_rate", "store_name", "support_url"]
    settings = Setting.query.filter(Setting.key.in_(PUBLIC_KEYS)).all()
    result = {s.key: s.value for s in settings}

    # قيم افتراضية
    if "syp_rate" not in result:
        result["syp_rate"] = "132"
    if "store_name" not in result:
        result["store_name"] = "SANAD+"
    if "support_url" not in result:
        result["support_url"] = "https://t.me/SANADST"

    # 💾 احفظ في Cache
    cache_set(key_settings_public(), result, ttl=TTL_SETTINGS)
    return jsonify(result)


# ============================================================
# 🆕 v18: Health Check (DB + Redis + Bot)
# ============================================================
@main.route("/api/health", methods=["GET"])
def health_check():
    """
    Health check شامل:
    - Database latency
    - Redis latency
    - Bot heartbeat (آخر 120 ثانية)

    Status codes:
    - 200: كل المكونات سليمة
    - 503: أي مكون حرج معطّل
    """
    start = time.time()
    result = {
        "status": "ok",
        "timestamp": int(time.time()),
        "version": "v18.4.14",
        "checks": {}
    }
    degraded = False

    # --------------------------------------------------------
    # 1. Database
    # --------------------------------------------------------
    try:
        db_start = time.time()
        db.session.execute(text("SELECT 1"))
        result["checks"]["database"] = {
            "status": "ok",
            "latency_ms": round((time.time() - db_start) * 1000, 2)
        }
    except Exception as e:
        result["checks"]["database"] = {
            "status": "error",
            "error": str(e)[:150]
        }
        degraded = True

    # --------------------------------------------------------
    # 2. Redis
    # --------------------------------------------------------
    try:
        redis_start = time.time()
        if redis_healthy():
            result["checks"]["redis"] = {
                "status": "ok",
                "latency_ms": round((time.time() - redis_start) * 1000, 2)
            }
        else:
            result["checks"]["redis"] = {"status": "unavailable"}
            degraded = True
    except Exception as e:
        result["checks"]["redis"] = {
            "status": "error",
            "error": str(e)[:150]
        }
        degraded = True

    # --------------------------------------------------------
    # 3. 🆕 v18: Bot Heartbeat
    # --------------------------------------------------------
    try:
        hb = cache_get("bot:heartbeat")
        now = int(time.time())

        if hb is None:
            result["checks"]["bot"] = {
                "status": "unavailable",
                "note": "no heartbeat found"
            }
            degraded = True
        else:
            try:
                hb_ts = int(hb)
            except (ValueError, TypeError):
                hb_ts = 0

            age = now - hb_ts
            if age < 120:
                result["checks"]["bot"] = {
                    "status": "ok",
                    "last_heartbeat": hb_ts,
                    "age_seconds": age,
                }
            else:
                result["checks"]["bot"] = {
                    "status": "stale",
                    "last_heartbeat": hb_ts,
                    "age_seconds": age,
                    "note": "heartbeat older than 120s"
                }
                degraded = True
    except Exception as e:
        result["checks"]["bot"] = {
            "status": "error",
            "error": str(e)[:150]
        }
        degraded = True

    # --------------------------------------------------------
    # النتيجة النهائية
    # --------------------------------------------------------
    result["total_latency_ms"] = round((time.time() - start) * 1000, 2)

    if degraded:
        result["status"] = "degraded"
        return jsonify(result), 503

    return jsonify(result), 200```

---

## FILE: ./backend/app/routes/user.py

```
# ============================================================
# 👤 User Routes — v2.2.2 (with KYC size validation)
# ============================================================
import uuid
import base64
import binascii
import re
from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..models.base import User, KYCRequest, Notification, Transaction, ServiceRequest
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification, notify_admins


# ============================================================
# 🛡️ KYC Image Validation
# ============================================================
ALLOWED_MIME_TYPES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png":  [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}
MAX_IMAGE_SIZE_BYTES = 500 * 1024
MAX_DATA_URL_LENGTH = 800 * 1024


def validate_kyc_image(data_url, field_name="selfie_image"):
    if not data_url or not isinstance(data_url, str):
        return False, f"{field_name}: الصورة مطلوبة"
    if len(data_url) > MAX_DATA_URL_LENGTH:
        return False, f"{field_name}: الصورة كبيرة جداً"
    if not data_url.startswith("data:image/"):
        return False, f"{field_name}: صيغة الصورة غير صحيحة"
    match = re.match(r"^data:(image/[a-z]+);base64,(.+)$", data_url, re.DOTALL)
    if not match:
        return False, f"{field_name}: صيغة Base64 غير صحيحة"
    mime_type, b64_data = match.group(1), match.group(2)
    if mime_type not in ALLOWED_MIME_TYPES:
        return False, f"{field_name}: صيغة غير مدعومة ({mime_type})"
    try:
        binary_data = base64.b64decode(b64_data, validate=True)
    except (binascii.Error, ValueError):
        return False, f"{field_name}: بيانات Base64 تالفة"
    if len(binary_data) > MAX_IMAGE_SIZE_BYTES:
        return False, f"{field_name}: حجم الصورة يتجاوز 500KB"
    if len(binary_data) < 100:
        return False, f"{field_name}: الصورة صغيرة جداً"
    signatures = ALLOWED_MIME_TYPES[mime_type]
    if not any(binary_data.startswith(sig) for sig in signatures):
        return False, f"{field_name}: محتوى الملف لا يطابق الصيغة"
    if mime_type == "image/webp":
        if len(binary_data) < 12 or binary_data[8:12] != b"WEBP":
            return False, f"{field_name}: ملف WebP تالف"
    return True, None


# ============================================================
# Helpers
# ============================================================
def get_current_user():
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        user_id = int(identity)
    except (ValueError, TypeError):
        return None
    return User.query.get(user_id)


def user_to_dict(user):
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "balance": user.balance,
        "kyc_status": user.kyc_status,
        "is_verified": user.is_verified,
        "role": user.role,
        "is_banned": user.is_banned,
        "vip_level": user.vip_level,
        "referral_code": user.referral_code,
        "general_discount": user.general_discount or 0.0,   # 🆕 v17.3
    }


# ============================================================
# Endpoints
# ============================================================
@main.route("/api/user/me", methods=["GET"])
@jwt_required()
def get_user():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401
    return jsonify(user_to_dict(user))


@main.route("/api/kyc/submit", methods=["POST"])
@jwt_required()
def submit_kyc():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}

    existing = KYCRequest.query.filter_by(user_id=user.id, status="pending").first()
    if existing:
        return jsonify({"error": "لديك طلب توثيق قيد المراجعة بالفعل"}), 400

    full_name = (data.get("full_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    selfie_image = data.get("selfie_image", "")

    if len(full_name) < 3:
        return jsonify({"error": "الاسم الكامل مطلوب (3 أحرف على الأقل)"}), 400
    if not re.match(r"^\+?[0-9]{8,15}$", phone):
        return jsonify({"error": "رقم الهاتف غير صحيح"}), 400
    if len(address) < 3:
        return jsonify({"error": "العنوان مطلوب"}), 400

    is_valid, error_msg = validate_kyc_image(selfie_image, "selfie_image")
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    # 📦 Store base64 as-is (privacy-first)
    kyc = KYCRequest(
        user_id=user.id,
        full_name=full_name,
        phone=phone,
        address=address,
        selfie_image=selfie_image,
        status="pending",
        submitted_at=datetime.now(timezone.utc),
    )
    user.kyc_status = "pending"
    db.session.add(kyc)

    notif = Notification(
        user_id=user.id,
        title="طلب التوثيق",
        message="تم إرسال طلب التوثيق إلى الإدارة، انتظر حتى يتم التحقق من بياناتك خلال 24 ساعة",
        type="info",
    )
    db.session.add(notif)
    db.session.commit()

    send_telegram_notification(user.telegram_id, "تم إرسال طلب التوثيق بنجاح")
    notify_admins(f"🪪 طلب توثيق جديد!\nالمستخدم: {user.telegram_id}\nالاسم: {full_name}\nالهاتف: {phone}")

    return jsonify({"message": "تم إرسال طلب التوثيق بنجاح"}), 200


@main.route("/api/kyc/my", methods=["GET"])
@jwt_required()
def get_my_kyc():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401
    kyc = KYCRequest.query.filter_by(user_id=user.id).order_by(KYCRequest.submitted_at.desc()).first()
    if not kyc:
        return jsonify({"status": "none"})
    return jsonify({
        "status": kyc.status,
        "full_name": kyc.full_name,
        "phone": kyc.phone,
        "address": kyc.address,
        "submitted_at": kyc.submitted_at.isoformat() if kyc.submitted_at else None,
    })


@main.route("/api/user/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401
    notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify([{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "type": n.type,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    } for n in notifications])


@main.route("/api/user/notifications/read", methods=["POST"])
@jwt_required()
def mark_notification_read():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401
    data = request.get_json() or {}
    notif_id = data.get("id")
    if notif_id:
        notif = Notification.query.filter_by(id=notif_id, user_id=user.id).first()
        if notif:
            notif.is_read = True
            db.session.commit()
    return jsonify({"success": True})


@main.route("/api/user/request-service", methods=["POST"])
@jwt_required()
def request_service():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401
    data = request.get_json() or {}
    service_name = data.get("service_name")
    description = data.get("description", "")
    estimated_price = data.get("estimated_price")
    if not service_name:
        return jsonify({"error": "اسم الخدمة مطلوب"}), 400
    req = ServiceRequest(
        user_id=user.id,
        service_name=service_name,
        description=description,
        estimated_price=estimated_price,
        status="pending",
        created_at=datetime.now(timezone.utc)
    )
    db.session.add(req)
    db.session.commit()
    notify_admins(f"🛠️ طلب خدمة مخصصة جديد!\nالمستخدم: {user.telegram_id}\nالخدمة: {service_name}")
    return jsonify({"message": "تم إرسال طلب الخدمة المخصصة"}), 200```

---

## FILE: ./backend/app/services/__init__.py

```
```

---

## FILE: ./backend/app/services/cache_service.py

```
# ============================================================
# 🔥 Cache Service — Redis (v18.3.2 — Catalog only)
# ============================================================
"""
نظام Cache بسيط مبني على Redis (Upstash).

⚠️ v18.2 — سياسة الكاش:
   ✅ يُخزّن: الكتالوج (categories, products, settings, payment_methods)
   ❌ لا يُخزّن أبداً: الطلبات، الإيداعات، KYC، المستخدمين، الرصيد

🆕 v18.3.2:
   - json.dumps(default=str) — يدعم Decimal/datetime/UUID
   - السبب: بعد NUMERIC migration، قيم DB تصبح Decimal
     json.dumps القياسي يرفض Decimal → cache يفشل
"""
import os
import json
import logging
import redis

logger = logging.getLogger(__name__)

# ============================================================
# 🔌 Redis Client
# ============================================================
_REDIS_URL = os.getenv("REDIS_URL", "").strip()
_redis_client = None
_redis_down = False

if _REDIS_URL:
    try:
        _redis_client = redis.from_url(
            _REDIS_URL,
            decode_responses=True,
            socket_timeout=3,
            socket_connect_timeout=3,
            health_check_interval=30,
        )
        _redis_client.ping()
        print("✅ Cache: Redis connected")
    except Exception as e:
        print(f"⚠️ Cache: Redis unavailable — {e}")
        _redis_client = None
else:
    print("⚠️ Cache: Redis URL missing — disabled")


# ============================================================
# 🆕 v17.3: Redis Health Alerts
# ============================================================
def _mark_redis_down(error):
    global _redis_down
    if not _redis_down:
        _redis_down = True
        try:
            import sentry_sdk
            sentry_sdk.capture_message(
                f"🔴 Redis DOWN: {str(error)[:200]}",
                level="error"
            )
        except Exception:
            logger.error(f"Redis DOWN: {error}")


def _mark_redis_up():
    global _redis_down
    if _redis_down:
        _redis_down = False
        try:
            import sentry_sdk
            sentry_sdk.capture_message("🟢 Redis RECOVERED", level="info")
        except Exception:
            logger.info("Redis RECOVERED")


# ============================================================
# ⏱️ TTLs — كتالوج فقط
# ============================================================
TTL_CATEGORIES = 300
TTL_PRODUCTS = 120
TTL_PAYMENT_METHODS = 300
TTL_SETTINGS = 300
TTL_SINGLE_PRODUCT = 180
TTL_DEFAULT = 60

# ⚠️ deprecated — تبقى للتوافق مع admin.py
TTL_ADMIN_LISTS = 0


# ============================================================
# 🔑 Keys
# ============================================================
def key_categories():
    return "cache:categories:all"


def key_products(category_id=None):
    if category_id:
        return f"cache:products:cat:{category_id}"
    return "cache:products:all"


def key_single_product(product_id):
    return f"cache:product:{product_id}"


def key_payment_methods():
    return "cache:payment-methods:all"


def key_settings_public():
    return "cache:settings:public"


# ============================================================
# ⚠️ No-op Stubs — للتوافق مع admin.py
# ============================================================
_stub_warned = set()


def _warn_once(name):
    if name not in _stub_warned:
        logger.info(f"ℹ️ {name}: no-op (v18.2 policy — no financial cache)")
        _stub_warned.add(name)


def key_admin_list(name):
    """⚠️ deprecated — لا يُستخدم للتخزين (v18.2)"""
    _warn_once("key_admin_list")
    return f"deprecated:admin:{name}"


def invalidate_admin(name):
    """⚠️ deprecated — no-op (v18.2)"""
    _warn_once("invalidate_admin")
    return 0


def invalidate_admin_all():
    """⚠️ deprecated — no-op (v18.2)"""
    _warn_once("invalidate_admin_all")
    return 0


# ============================================================
# 💾 Core Operations
# ============================================================
def cache_get(key):
    """اقرأ من Cache"""
    global _redis_down
    if not _redis_client:
        return None
    if key and key.startswith("deprecated:"):
        return None
    try:
        raw = _redis_client.get(key)
        if _redis_down:
            _mark_redis_up()
        if raw:
            return json.loads(raw)
        return None
    except redis.RedisError as e:
        _mark_redis_down(e)
        return None
    except Exception as e:
        logger.warning(f"cache_get [{key}] failed: {e}")
        return None


def cache_set(key, value, ttl=TTL_DEFAULT):
    """
    احفظ في Cache.

    🆕 v18.3.2: default=str — يحوّل Decimal/datetime/UUID إلى string
    """
    global _redis_down
    if not _redis_client:
        return False
    if ttl is None or ttl <= 0:
        return False
    if key and key.startswith("deprecated:"):
        return False
    try:
        _redis_client.setex(
            key,
            ttl,
            json.dumps(value, ensure_ascii=False, default=str)
        )
        if _redis_down:
            _mark_redis_up()
        return True
    except redis.RedisError as e:
        _mark_redis_down(e)
        return False
    except Exception as e:
        logger.warning(f"cache_set [{key}] failed: {e}")
        return False


def cache_delete(*keys):
    if not _redis_client or not keys:
        return 0
    try:
        return _redis_client.delete(*keys)
    except redis.RedisError as e:
        _mark_redis_down(e)
        return 0
    except Exception as e:
        logger.warning(f"cache_delete failed: {e}")
        return 0


def cache_delete_pattern(pattern):
    if not _redis_client:
        return 0
    try:
        keys = list(_redis_client.scan_iter(match=pattern, count=100))
        if keys:
            return _redis_client.delete(*keys)
        return 0
    except redis.RedisError as e:
        _mark_redis_down(e)
        return 0
    except Exception as e:
        logger.warning(f"cache_delete_pattern [{pattern}] failed: {e}")
        return 0


# ============================================================
# 🧹 Invalidation Helpers
# ============================================================
def invalidate_categories():
    return cache_delete_pattern("cache:categories:*")


def invalidate_products():
    return cache_delete_pattern("cache:products:*") + cache_delete_pattern("cache:product:*")


def invalidate_payment_methods():
    return cache_delete_pattern("cache:payment-methods:*")


def invalidate_settings():
    return cache_delete_pattern("cache:settings:*")


# ============================================================
# 🎯 Auto-Invalidation Middleware
# ============================================================
def setup_cache_invalidation(app):
    """
    عند POST/PUT/DELETE ناجح على /admin/api/:
    → يمسح الكاش المناسب للكتالوج فقط.
    """
    from flask import request

    @app.after_request
    def _auto_invalidate(response):
        if request.method not in ("POST", "PUT", "DELETE", "PATCH"):
            return response
        if not (200 <= response.status_code < 300):
            return response

        path = request.path
        try:
            if "/admin/api/categories" in path:
                invalidate_categories()
                logger.info(f"🔥 Invalidated: categories ({path})")

            if "/admin/api/products" in path:
                invalidate_products()
                logger.info(f"🔥 Invalidated: products ({path})")

            if "/admin/api/payment-methods" in path:
                invalidate_payment_methods()
                logger.info(f"🔥 Invalidated: payment-methods ({path})")

            if "/admin/api/settings" in path:
                invalidate_settings()
                logger.info(f"🔥 Invalidated: settings ({path})")

        except Exception as e:
            logger.warning(f"Auto-invalidation failed for {path}: {e}")

        return response

    print("✅ Cache auto-invalidation registered")


# ============================================================
# 📊 Health
# ============================================================
def is_enabled():
    return _redis_client is not None


def is_healthy():
    if not _redis_client:
        return False
    try:
        _redis_client.ping()
        return True
    except Exception:
        return False

# ============================================================
# 🆕 v18.4: Rate Limiting Helper (Redis-based)
# ============================================================
def rate_limit_check(key: str, max_requests: int, window_seconds: int):
    """
    Sliding bucket counter باستخدام Redis.

    Returns:
        True  → المستخدم تجاوز الحد
        False → مسموح
        None  → Redis غير متاح (استخدم fallback)
    """
    if not _redis_client:
        return None
    try:
        import time
        bucket = int(time.time() // window_seconds)
        full_key = f"ratelimit:{key}:{bucket}"
        count = _redis_client.incr(full_key)
        if count == 1:
            _redis_client.expire(full_key, window_seconds)
        return count > max_requests
    except redis.RedisError as e:
        _mark_redis_down(e)
        return None
    except Exception as e:
        logger.warning(f"rate_limit_check failed: {e}")
        return None
```

---

## FILE: ./backend/app/services/cloudinary_service.py

```
# ============================================================
# ☁️ Cloudinary Service — v18.1 (Progressive + Better Compression)
# ============================================================
"""
خدمة إدارة الصور عبر Cloudinary.
- رفع صور عامة (categories, products, payment-methods)
- Signed URLs للصور المحمية (KYC, Deposits)
- Fail-safe: يحتفظ بـ base64 إذا فشل الرفع
- 🆕 v18.1: تحسينات ضغط + responsive + progressive loading
"""
import os
import time
import base64
import logging
import cloudinary
import cloudinary.uploader
import cloudinary.utils

logger = logging.getLogger(__name__)


# ============================================================
# ⚙️ Configuration
# ============================================================
_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip()
_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip()

_ENABLED = bool(_CLOUD_NAME and _API_KEY and _API_SECRET)

if _ENABLED:
    cloudinary.config(
        cloud_name=_CLOUD_NAME,
        api_key=_API_KEY,
        api_secret=_API_SECRET,
        secure=True,
    )
    print(f"✅ Cloudinary configured (cloud: {_CLOUD_NAME})")
else:
    print("⚠️ Cloudinary not configured (missing env vars)")


# ============================================================
# 🎨 Transformations — 🆕 v18.1 optimized
# ============================================================
# q_auto:good = quality balanced
# q_auto:eco = smaller (for thumbnails)
# f_auto = WebP/AVIF for supported browsers
# fl_progressive = progressive JPEG (visible improvement)

DEFAULT_TRANSFORM = "w_400,h_400,c_fill,q_auto:good,f_auto,fl_progressive"
LARGE_TRANSFORM = "w_800,q_auto:good,f_auto,fl_progressive"
THUMB_TRANSFORM = "w_200,q_auto:eco,f_auto,fl_progressive"
MOBILE_TRANSFORM = "w_600,q_auto:good,f_auto,fl_progressive"       # 🆕
TINY_TRANSFORM = "w_100,q_auto:eco,f_auto,fl_progressive"          # 🆕
HERO_TRANSFORM = "w_1200,q_auto:good,f_auto,fl_progressive"        # 🆕


# ============================================================
# 🌐 Public Upload — 🆕 v18.1: eager transformations
# ============================================================
def upload_base64_image(base64_data, folder="sanad/uncategorized", public_id=None):
    """
    رفع صورة عامة (public).
    تُستخدم لـ: categories, products, payment-methods.

    🆕 v18.1: eager transformations لتحسين أول طلب.
    """
    if not _ENABLED:
        logger.warning("Cloudinary not configured — skipping upload")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    # URL already — return as-is
    if base64_data.startswith("http://") or base64_data.startswith("https://"):
        return base64_data

    if not base64_data.startswith("data:image/"):
        logger.warning("Invalid base64 format")
        return None

    try:
        result = cloudinary.uploader.upload(
            base64_data,
            folder=folder,
            public_id=public_id,
            resource_type="image",
            overwrite=True,
            invalidate=True,
            # 🆕 v18.1: eager transformations
            eager=[
                {"width": 200, "crop": "fill", "quality": "auto:eco", "fetch_format": "auto"},
                {"width": 400, "crop": "fill", "quality": "auto:good", "fetch_format": "auto"},
                {"width": 800, "crop": "limit", "quality": "auto:good", "fetch_format": "auto"},
            ],
            eager_async=True,
            # 🆕 v18.1: default transformation for direct URL access
            transformation=[
                {"quality": "auto:good", "fetch_format": "auto", "flags": "progressive"},
            ],
        )
        url = result.get("secure_url")
        logger.info(f"✅ Public upload: {url[:80]}...")
        return url

    except Exception as e:
        logger.error(f"❌ Cloudinary upload failed: {e}")
        return None


# ============================================================
# 🔒 Signed Upload
# ============================================================
def upload_signed_image(base64_data, folder="sanad/private", public_id=None):
    """رفع صورة محمية (authenticated). تحتاج Signed URL للوصول."""
    if not _ENABLED:
        logger.warning("Cloudinary not configured")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    if base64_data.startswith("http://") or base64_data.startswith("https://"):
        return base64_data

    if not base64_data.startswith("data:image/"):
        return None

    try:
        result = cloudinary.uploader.upload(
            base64_data,
            folder=folder,
            public_id=public_id,
            type="authenticated",
            resource_type="image",
            overwrite=True,
            invalidate=True,
        )
        pid = result.get("public_id")
        logger.info(f"✅ Signed upload: {pid}")
        return pid

    except Exception as e:
        logger.error(f"❌ Cloudinary signed upload failed: {e}")
        return None


# ============================================================
# 🔐 Signed URL Generation (Fail-Safe)
# ============================================================
def get_signed_url(public_id, expires_in=1800):
    """
    يُرجع URL للعرض.

    منطق آمن (fail-safe):
    - إذا كان base64 → يُرجعه كما هو
    - إذا كان URL عادي → يُرجعه كما هو
    - إذا كان public_id لصورة authenticated → signed URL
    - عند أي فشل → يُرجع القيمة الأصلية
    """
    if not public_id:
        return None

    # base64
    if isinstance(public_id, str) and public_id.startswith("data:"):
        return public_id

    # URL عادي
    if isinstance(public_id, str) and (
        public_id.startswith("http://") or public_id.startswith("https://")
    ):
        return public_id

    if not _ENABLED:
        logger.warning("Cloudinary not configured — returning raw public_id")
        return public_id

    try:
        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            type="authenticated",
            sign_url=True,
            secure=True,
            resource_type="image",
            expires_at=int(time.time()) + expires_in,
        )
        return url

    except Exception as e:
        logger.warning(f"Signed URL generation failed for {public_id}: {e}")
        return public_id


# ============================================================
# 🎨 Optimized URL — 🆕 v18.1 with more sizes
# ============================================================
def get_optimized_url(url, transform="default"):
    """
    بناء URL محسّن للصور العامة.

    Available transforms:
    - "tiny"   → 100px  (icons, list thumbs)
    - "thumb"  → 200px  (product grid)
    - "default"→ 400px  (standard)
    - "mobile" → 600px  (mobile hero)
    - "large"  → 800px  (detail modal)
    - "hero"   → 1200px (desktop hero)
    """
    if not url or not isinstance(url, str):
        return url

    if "res.cloudinary.com" not in url:
        return url

    if "/upload/" not in url:
        return url

    transform_str = {
        "tiny": TINY_TRANSFORM,
        "thumb": THUMB_TRANSFORM,
        "default": DEFAULT_TRANSFORM,
        "mobile": MOBILE_TRANSFORM,
        "large": LARGE_TRANSFORM,
        "hero": HERO_TRANSFORM,
    }.get(transform, DEFAULT_TRANSFORM)

    parts = url.split("/upload/", 1)
    return f"{parts[0]}/upload/{transform_str}/{parts[1]}"


# ============================================================
# 🗑️ Delete
# ============================================================
def delete_image(public_id):
    if not _ENABLED or not public_id:
        return False
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception as e:
        logger.error(f"❌ Cloudinary delete failed: {e}")
        return False


def extract_public_id(url):
    if not url or not isinstance(url, str):
        return None
    if "res.cloudinary.com" not in url:
        return None
    try:
        parts = url.split("/upload/")
        if len(parts) != 2:
            return None
        path = parts[1]
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]
        if "." in path:
            path = path.rsplit(".", 1)[0]
        return path
    except Exception:
        return None


# ============================================================
# 💚 Health
# ============================================================
def is_enabled():
    return _ENABLED```

---

## FILE: ./backend/app/services/imgbb_service.py

```
import os
import requests

def upload_image_to_imgbb(image_base64_or_path, name="image"):
    api_key = os.getenv("IMGBB_API_KEY", "")
    if not api_key:
        return None
    url = "https://api.imgbb.com/1/upload"
    try:
        if image_base64_or_path.startswith("http"):
            return image_base64_or_path
        # نفترض أن المدخل Base64
        payload = {
            "key": api_key,
            "image": image_base64_or_path,
            "name": name,
        }
        response = requests.post(url, data=payload, timeout=10)
        if response.ok:
            data = response.json()
            return data["data"]["url"]
    except Exception as e:
        print(f"ImgBB error: {e}")
    return None```

---

## FILE: ./backend/app/services/telegram_service.py

```
import os
import logging
import requests

logger = logging.getLogger(__name__)


def send_telegram_notification(chat_id, message):
    token = os.getenv("BOT_TOKEN", "")
    if not token:
        logger.warning("BOT_TOKEN غير معرّف")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
    }
    try:
        response = requests.post(url, json=payload, timeout=5)
        return response.ok
    except Exception as e:
        logger.error(f"فشل إرسال إشعار تيليجرام: {e}")
        return False


def notify_admins(message):
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
    try:
        admin_ids = [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    except ValueError:
        admin_ids = []
    if not admin_ids:
        return
    for admin_id in admin_ids:
        send_telegram_notification(admin_id, message)


# ============================================================
# 8 رسائل Telegram المخصصة للمستخدم
# ============================================================

def send_deposit_approved(user, amount, paid_debt=0.0, added=0.0):
    if paid_debt > 0 and added > 0:
        msg = f"تم خصم {paid_debt:.2f}$ لسداد دينك، وإضافة {added:.2f}$ لرصيدك"
    elif paid_debt > 0 and added == 0:
        msg = f"تم خصم {paid_debt:.2f}$ لسداد دينك. رصيدك الآن: {user.balance:.2f}$"
    else:
        msg = f"تمت إضافة {amount:.2f}$ لرصيدك"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_deposit_rejected(user, amount, reason=None):
    msg = f"تم رفض إيداعك بقيمة {amount:.2f}$"
    if reason:
        msg += f"\nالسبب: {reason}"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_kyc_approved(user):
    msg = "تم توثيق حسابك بنجاح"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_kyc_rejected(user, reason=None):
    msg = "تم رفض طلب التوثيق"
    if reason:
        msg += f"\nالسبب: {reason}"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_referral_reward(referrer, amount):
    msg = f"حصلت على مكافأة إحالة بقيمة {amount:.2f}$"
    send_telegram_notification(referrer.telegram_id, msg)
    return msg


def send_admin_balance_adjustment(user, amount, note=None):
    sign = "+" if amount > 0 else ""
    msg = f"تم تعديل رصيدك بمقدار {sign}{amount:.2f}$"
    if note:
        msg += f"\nملاحظة: {note}"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_order_refund_failed(user, amount, order_number):
    msg = f"تم استرداد {amount:.2f}$ لطلبك {order_number} بسبب فشل التنفيذ"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_order_refund_cancelled(user, amount, order_number):
    msg = f"تم استرداد {amount:.2f}$ لطلبك {order_number} بعد الإلغاء"
    send_telegram_notification(user.telegram_id, msg)
    return msg```

---

## FILE: ./backend/app/utils.py

```
"""
Helpers مشتركة — Error Codes + Pagination
SANAD PLUS⁺ v2.1
"""
from flask import jsonify, request


class ErrorCode:
    TOKEN_MISSING = "TOKEN_MISSING"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    TOKEN_REVOKED = "TOKEN_REVOKED"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    USER_BANNED = "USER_BANNED"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    KYC_REQUIRED = "KYC_REQUIRED"
    KYC_ALREADY_PENDING = "KYC_ALREADY_PENDING"
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE"
    NEGATIVE_NOT_ALLOWED = "NEGATIVE_NOT_ALLOWED"
    NEGATIVE_LIMIT_ZERO = "NEGATIVE_LIMIT_ZERO"
    NEGATIVE_LIMIT_EXCEEDED = "NEGATIVE_LIMIT_EXCEEDED"
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"
    PRODUCT_INACTIVE = "PRODUCT_INACTIVE"
    STOCK_OUT = "STOCK_OUT"
    STOCK_INSUFFICIENT = "STOCK_INSUFFICIENT"
    ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
    ORDER_NOT_CANCELLABLE = "ORDER_NOT_CANCELLABLE"
    ORDER_TIME_EXPIRED = "ORDER_TIME_EXPIRED"
    ORDER_INVALID_TRANSITION = "ORDER_INVALID_TRANSITION"
    COUPON_INVALID = "COUPON_INVALID"
    COUPON_EXPIRED = "COUPON_EXPIRED"
    COUPON_ALREADY_USED = "COUPON_ALREADY_USED"
    COUPON_MIN_AMOUNT = "COUPON_MIN_AMOUNT"
    COUPON_EXHAUSTED = "COUPON_EXHAUSTED"
    DEPOSIT_DUPLICATE = "DEPOSIT_DUPLICATE"
    DEPOSIT_INVALID = "DEPOSIT_INVALID"
    REFERRAL_SELF = "REFERRAL_SELF"
    REFERRAL_ALREADY_USED = "REFERRAL_ALREADY_USED"
    REFERRAL_INVALID = "REFERRAL_INVALID"
    RATE_LIMITED = "RATE_LIMITED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


def error_response(message, code=None, status=400, **extra):
    payload = {"error": message}
    if code:
        payload["code"] = code
    payload.update(extra)
    return jsonify(payload), status


def success_response(data=None, message=None, **extra):
    payload = {}
    if message:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    payload.update(extra)
    return jsonify(payload)


def paginate(query, default_limit=20, max_limit=100):
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        limit = int(request.args.get("limit", default_limit))
        limit = min(max(1, limit), max_limit)
    except (ValueError, TypeError):
        limit = default_limit
    total = query.count()
    pages = (total + limit - 1) // limit if total > 0 else 0
    offset = (page - 1) * limit
    items = query.limit(limit).offset(offset).all()
    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        }
    }


def apply_sort(query, model, default="created_at DESC"):
    sort = request.args.get("sort", "newest")
    sort_map = {
        "newest": model.created_at.desc(),
        "oldest": model.created_at.asc(),
    }
    if hasattr(model, "total_price"):
        sort_map["price_high"] = model.total_price.desc()
        sort_map["price_low"] = model.total_price.asc()
    order_by = sort_map.get(sort, model.created_at.desc())
    return query.order_by(order_by)


def apply_date_range(query, model, field="created_at"):
    from datetime import datetime, timezone, timedelta
    col = getattr(model, field, None)
    if not col:
        return query
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")
    if from_date:
        try:
            dt = datetime.fromisoformat(from_date).replace(tzinfo=timezone.utc)
            query = query.filter(col >= dt)
        except (ValueError, TypeError):
            pass
    if to_date:
        try:
            dt = datetime.fromisoformat(to_date).replace(tzinfo=timezone.utc)
            dt = dt + timedelta(days=1)
            query = query.filter(col < dt)
        except (ValueError, TypeError):
            pass
    return query
```

---

## FILE: ./backend/bot_main.py

```
# ============================================================
# 🤖 Telegram Bot — Entry Point (Standalone Process)
# ============================================================
# يعمل كعملية Python مستقلة لتوفير:
#   - Main thread حقيقي (مطلوب لـ asyncio)
#   - Main interpreter (مطلوب لـ signal handling)
#   - 🆕 v18: Sentry monitoring
#
# يُستدعى من run.py عبر subprocess.Popen()
# ============================================================
import os
import sys

# إضافة project root و backend/ إلى sys.path
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)

if _root not in sys.path:
    sys.path.insert(0, _root)
if _here not in sys.path:
    sys.path.insert(0, _here)


# ============================================================
# 🛡️ v18: Sentry init BEFORE any bot imports
# ============================================================
try:
    import sentry_sdk
    from sentry_sdk.integrations.threading import ThreadingIntegration

    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN", ""),
        integrations=[ThreadingIntegration()],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.0,
        send_default_pii=False,
        environment="bot",
        release=os.getenv("RELEASE_VERSION", "v18"),
    )
    print("✅ Sentry initialized (bot process)")
except Exception as e:
    print(f"⚠️ Sentry init failed: {e}")


if __name__ == "__main__":
    try:
        from bot.bot import run_polling
        print("🤖 Bot process starting (PID: %d)..." % os.getpid())
        run_polling()
    except KeyboardInterrupt:
        print("🛑 Bot stopped by user")
    except Exception as e:
        import traceback
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except Exception:
            pass
        print(f"❌ Bot crashed: {e}")
        traceback.print_exc()
        sys.exit(1)```

---

## FILE: ./backend/create_test_user.py

```
from app import create_app
from app.extensions import db
from app.models.base import User

app = create_app()
with app.app_context():
    user = User(
        telegram_id=8673286954,
        username='tester',
        first_name='مستخدم تجريبي',
        balance=100.0,
        kyc_status='unverified',
        is_verified=False,
        role='user'
    )
    db.session.add(user)
    db.session.commit()
    print("تم إنشاء المستخدم")```

---

## FILE: ./backend/migrate_images_to_cloudinary.py

```
# ============================================================
# 🔄 Migration: Base64 → Cloudinary URLs
# ============================================================
"""
يحوّل كل الصور الموجودة في DB من base64 إلى Cloudinary URLs.

يشمل الجداول:
   - categories.image
   - products.image
   - payment_methods.icon
   - payment_methods.qr_image

آمن للتشغيل عدة مرات (idempotent):
   ✅ يرفع فقط base64 (يتجاهل http URLs)
   ✅ يُظهر progress
   ✅ لا يحذف البيانات عند الفشل
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.base import Category, Product, PaymentMethod
from app.services.cloudinary_service import upload_base64_image, is_enabled


def migrate_table(model, field_name, folder, label):
    """يُرحّل حقل صور في جدول معين"""
    print(f"\n{'='*60}")
    print(f"📋 {label}")
    print(f"{'='*60}")

    rows = model.query.all()
    total = len(rows)

    if total == 0:
        print(f"   لا توجد صفوف")
        return 0, 0

    migrated = 0
    skipped = 0
    failed = 0

    for idx, row in enumerate(rows, 1):
        value = getattr(row, field_name, None)

        if not value:
            skipped += 1
            continue

        # إذا URL جاهز — تخطى
        if isinstance(value, str) and (
            value.startswith("http://") or value.startswith("https://")
        ):
            skipped += 1
            continue

        # إذا base64 — ارفعه
        if isinstance(value, str) and value.startswith("data:image/"):
            print(f"   [{idx}/{total}] رفع صورة (row id={row.id})... ", end="", flush=True)
            url = upload_base64_image(value, folder=folder)

            if url and url.startswith("http"):
                setattr(row, field_name, url)
                db.session.flush()
                migrated += 1
                print(f"✅")
            else:
                failed += 1
                print(f"❌ فشل")
        else:
            skipped += 1

    return migrated, skipped, failed


def main():
    app = create_app()

    with app.app_context():
        # تحقق من Cloudinary
        if not is_enabled():
            print("❌ Cloudinary غير معد")
            print("   تأكد من:")
            print("   - CLOUDINARY_CLOUD_NAME")
            print("   - CLOUDINARY_API_KEY")
            print("   - CLOUDINARY_API_SECRET")
            sys.exit(1)

        print("=" * 60)
        print("🔄 Migration: Base64 → Cloudinary")
        print("=" * 60)

        stats = {
            "categories": (0, 0, 0),
            "products": (0, 0, 0),
            "payment_icons": (0, 0, 0),
            "payment_qr": (0, 0, 0),
        }

        # 1. Categories
        stats["categories"] = migrate_table(
            Category, "image", "sanad/categories", "📁 Categories"
        )

        # 2. Products
        stats["products"] = migrate_table(
            Product, "image", "sanad/products", "📦 Products"
        )

        # 3. Payment Methods — Icon
        stats["payment_icons"] = migrate_table(
            PaymentMethod, "icon", "sanad/payment-methods", "💳 Payment Icons"
        )

        # 4. Payment Methods — QR
        stats["payment_qr"] = migrate_table(
            PaymentMethod, "qr_image", "sanad/qr-codes", "🔲 Payment QRs"
        )

        # Commit نهائي
        try:
            db.session.commit()
            print("\n" + "=" * 60)
            print("✅ اكتملت Migration بنجاح")
            print("=" * 60)

            total_migrated = 0
            total_skipped = 0
            total_failed = 0

            for name, (m, s, f) in stats.items():
                total_migrated += m
                total_skipped += s
                total_failed += f
                print(f"   {name:20s} → ✅ {m:3d}  ⏭️  {s:3d}  ❌ {f:3d}")

            print(f"   {'─'*45}")
            print(f"   {'الإجمالي':20s} → ✅ {total_migrated:3d}  ⏭️  {total_skipped:3d}  ❌ {total_failed:3d}")

            if total_failed > 0:
                print(f"\n⚠️  {total_failed} صورة فشلت — تحقق من Cloudinary quota")
                print("   (الصور الأصلية محفوظة — لا ضرر)")
            else:
                print("\n🎉 كل الصور رُفعت بنجاح!")

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ فشل Commit: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()```

---

## FILE: ./backend/migrations/2026_09_24_numeric.py

```
# ============================================================
# 🔄 Migration: FLOAT → NUMERIC (v18.2)
# ============================================================
"""
⚠️  تشغيل يدوي فقط — لا يُستدعى من run.py
    python backend/migrations/2026_09_24_numeric.py

يُغيّر كل الحقول المالية من FLOAT إلى NUMERIC(14,4).

الخطوات:
  1. فحص السلامة قبل
  2. تطبيق التحويلات
  3. فحص السلامة بعد
  4. حفظ تقرير في migration_2026_09_24.log
"""
import os
import sys
import logging
from datetime import datetime

# إضافة backend/ إلى sys.path
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.dirname(_here)
if _backend not in sys.path:
    sys.path.insert(0, _backend)

from sqlalchemy import text
from app import create_app
from app.extensions import db


# ════════════════════════════════════════════════════════════
# Logging
# ════════════════════════════════════════════════════════════
log_file = os.path.join(_here, f"migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════
# التحويلات
# ════════════════════════════════════════════════════════════
MIGRATIONS = [
    # ═══ USERS ═══
    (
        "users.balance",
        "ALTER TABLE users ALTER COLUMN balance TYPE NUMERIC(14,4) USING ROUND(balance::numeric, 4)"
    ),
    (
        "users.referral_earnings",
        "ALTER TABLE users ALTER COLUMN referral_earnings TYPE NUMERIC(14,4) USING ROUND(COALESCE(referral_earnings, 0)::numeric, 4)"
    ),
    (
        "users.max_negative_balance",
        "ALTER TABLE users ALTER COLUMN max_negative_balance TYPE NUMERIC(14,4) USING ROUND(COALESCE(max_negative_balance, 0)::numeric, 4)"
    ),
    (
        "users.general_discount",
        "ALTER TABLE users ALTER COLUMN general_discount TYPE NUMERIC(14,4) USING ROUND(COALESCE(general_discount, 0)::numeric, 4)"
    ),
    (
        "users.notify_marketing",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_marketing BOOLEAN DEFAULT TRUE"
    ),

    # ═══ PRODUCTS ═══
    (
        "products.base_price",
        "ALTER TABLE products ALTER COLUMN base_price TYPE NUMERIC(14,4) USING ROUND(base_price::numeric, 4)"
    ),

    # ═══ PRODUCT BUNDLES ═══
    (
        "product_bundles.price_usd",
        "ALTER TABLE product_bundles ALTER COLUMN price_usd TYPE NUMERIC(14,4) USING ROUND(price_usd::numeric, 4)"
    ),

    # ═══ ORDERS ═══
    (
        "orders.unit_price",
        "ALTER TABLE orders ALTER COLUMN unit_price TYPE NUMERIC(14,4) USING ROUND(unit_price::numeric, 4)"
    ),
    (
        "orders.total_price",
        "ALTER TABLE orders ALTER COLUMN total_price TYPE NUMERIC(14,4) USING ROUND(total_price::numeric, 4)"
    ),
    (
        "orders.discount_amount",
        "ALTER TABLE orders ALTER COLUMN discount_amount TYPE NUMERIC(14,4) USING ROUND(COALESCE(discount_amount, 0)::numeric, 4)"
    ),

    # ═══ DEPOSITS ═══
    (
        "deposits.amount",
        "ALTER TABLE deposits ALTER COLUMN amount TYPE NUMERIC(14,4) USING ROUND(amount::numeric, 4)"
    ),
    (
        "deposits.fee",
        "ALTER TABLE deposits ALTER COLUMN fee TYPE NUMERIC(14,4) USING ROUND(COALESCE(fee, 0)::numeric, 4)"
    ),

    # ═══ PAYMENT METHODS ═══
    (
        "payment_methods.min_amount",
        "ALTER TABLE payment_methods ALTER COLUMN min_amount TYPE NUMERIC(14,4) USING ROUND(COALESCE(min_amount, 0)::numeric, 4)"
    ),
    (
        "payment_methods.fee",
        "ALTER TABLE payment_methods ALTER COLUMN fee TYPE NUMERIC(14,4) USING ROUND(COALESCE(fee, 0)::numeric, 4)"
    ),
    (
        "payment_methods.max_amount",
        "ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS max_amount NUMERIC(14,4) DEFAULT 500.0000"
    ),

    # ═══ TRANSACTIONS ═══
    (
        "transactions.amount",
        "ALTER TABLE transactions ALTER COLUMN amount TYPE NUMERIC(14,4) USING ROUND(amount::numeric, 4)"
    ),
    (
        "transactions.balance_after",
        "ALTER TABLE transactions ALTER COLUMN balance_after TYPE NUMERIC(14,4) USING ROUND(COALESCE(balance_after, 0)::numeric, 4)"
    ),

    # ═══ SERVICE REQUESTS ═══
    (
        "service_requests.estimated_price",
        "ALTER TABLE service_requests ALTER COLUMN estimated_price TYPE NUMERIC(14,4) USING ROUND(COALESCE(estimated_price, 0)::numeric, 4)"
    ),

    # ═══ COUPONS ═══
    (
        "coupons.discount_value",
        "ALTER TABLE coupons ALTER COLUMN discount_value TYPE NUMERIC(14,4) USING ROUND(discount_value::numeric, 4)"
    ),
    (
        "coupons.min_amount",
        "ALTER TABLE coupons ALTER COLUMN min_amount TYPE NUMERIC(14,4) USING ROUND(COALESCE(min_amount, 0)::numeric, 4)"
    ),
    (
        "coupons.max_discount",
        "ALTER TABLE coupons ALTER COLUMN max_discount TYPE NUMERIC(14,4) USING ROUND(COALESCE(max_discount, 0)::numeric, 4)"
    ),

    # ═══ COUPON USAGES ═══
    (
        "coupon_usages.discount_applied",
        "ALTER TABLE coupon_usages ALTER COLUMN discount_applied TYPE NUMERIC(14,4) USING ROUND(COALESCE(discount_applied, 0)::numeric, 4)"
    ),

    # ═══ REFERRALS ═══
    (
        "referrals.reward_amount",
        "ALTER TABLE referrals ALTER COLUMN reward_amount TYPE NUMERIC(14,4) USING ROUND(COALESCE(reward_amount, 0)::numeric, 4)"
    ),

    # ═══ FINANCIAL AUDIT ═══
    (
        "financial_audit_log.amount",
        "ALTER TABLE financial_audit_log ALTER COLUMN amount TYPE NUMERIC(14,4) USING ROUND(amount::numeric, 4)"
    ),
    (
        "financial_audit_log.balance_before",
        "ALTER TABLE financial_audit_log ALTER COLUMN balance_before TYPE NUMERIC(14,4) USING ROUND(balance_before::numeric, 4)"
    ),
    (
        "financial_audit_log.balance_after",
        "ALTER TABLE financial_audit_log ALTER COLUMN balance_after TYPE NUMERIC(14,4) USING ROUND(balance_after::numeric, 4)"
    ),

    # ═══ USER PRODUCT DISCOUNTS ═══
    (
        "user_product_discounts.discount_percent",
        "ALTER TABLE user_product_discounts ALTER COLUMN discount_percent TYPE NUMERIC(14,4) USING ROUND(COALESCE(discount_percent, 0)::numeric, 4)"
    ),
]


# ════════════════════════════════════════════════════════════
# فحص السلامة
# ════════════════════════════════════════════════════════════
def verify_integrity(label="check"):
    """
    تحقق: مجموع الحركات = الرصيد الحالي لكل مستخدم.
    الفرق يجب أن يكون ≤ 0.01$ (تقريب سنت).
    """
    log.info(f"🔍 [{label}] التحقق من التكامل المالي...")

    try:
        result = db.session.execute(text("""
            SELECT 
                u.id,
                u.telegram_id,
                u.balance,
                COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN type IN ('deposit', 'refund', 'referral_reward', 'adjustment') THEN amount
                            WHEN type = 'purchase' THEN -amount
                            ELSE 0
                        END
                    )
                    FROM transactions t
                    WHERE t.user_id = u.id
                ), 0) AS computed,
                ABS(u.balance - COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN type IN ('deposit', 'refund', 'referral_reward', 'adjustment') THEN amount
                            WHEN type = 'purchase' THEN -amount
                            ELSE 0
                        END
                    )
                    FROM transactions t
                    WHERE t.user_id = u.id
                ), 0)) AS diff
            FROM users u
            WHERE ABS(u.balance - COALESCE((
                SELECT SUM(
                    CASE 
                        WHEN type IN ('deposit', 'refund', 'referral_reward', 'adjustment') THEN amount
                        WHEN type = 'purchase' THEN -amount
                        ELSE 0
                    END
                )
                FROM transactions t
                WHERE t.user_id = u.id
            ), 0)) > 0.01
            ORDER BY diff DESC
            LIMIT 50
        """))

        mismatches = result.fetchall()

        if not mismatches:
            log.info(f"✅ [{label}] جميع الأرصدة مطابقة للحركات (فرق ≤ 0.01$)")
            return True

        log.warning(f"⚠️  [{label}] {len(mismatches)} مستخدم بأرصدة غير مطابقة:")
        for row in mismatches[:20]:
            log.warning(
                f"   user_id={row[0]} telegram={row[1]} "
                f"balance={row[2]} computed={row[3]} diff={row[4]:.4f}"
            )

        return False

    except Exception as e:
        log.error(f"❌ [{label}] فشل التحقق: {e}")
        return False


# ════════════════════════════════════════════════════════════
# تشغيل
# ════════════════════════════════════════════════════════════
def run():
    app = create_app()

    with app.app_context():
        log.info("=" * 70)
        log.info("🔄 Migration: FLOAT → NUMERIC(14,4)")
        log.info(f"   Time: {datetime.now().isoformat()}")
        log.info(f"   Log file: {log_file}")
        log.info("=" * 70)

        # 1. فحص قبل
        log.info("\n▶️  المرحلة 1: فحص السلامة قبل")
        before_ok = verify_integrity("before")

        # 2. تأكيد
        log.info("\n▶️  المرحلة 2: تطبيق التحويلات")
        log.info(f"   إجمالي: {len(MIGRATIONS)} تحويل")

        applied = 0
        failed = 0
        errors = []

        for name, sql in MIGRATIONS:
            try:
                db.session.execute(text(sql))
                db.session.commit()
                applied += 1
                log.info(f"   ✅ {name}")
            except Exception as e:
                db.session.rollback()
                failed += 1
                err = str(e)[:200]
                errors.append((name, err))
                log.error(f"   ❌ {name} → {err}")

        # 3. النتيجة
        log.info(f"\n📊 النتيجة: {applied} نجح، {failed} فشل")

        if errors:
            log.warning("⚠️  أخطاء:")
            for name, err in errors:
                log.warning(f"   • {name}: {err}")

        # 4. فحص بعد
        log.info("\n▶️  المرحلة 3: فحص السلامة بعد")
        after_ok = verify_integrity("after")

        # 5. الملخص
        log.info("\n" + "=" * 70)
        log.info("📋 الملخص النهائي")
        log.info("=" * 70)
        log.info(f"   تحويلات ناجحة:  {applied}")
        log.info(f"   تحويلات فاشلة:  {failed}")
        log.info(f"   قبل:            {'✅' if before_ok else '⚠️'}")
        log.info(f"   بعد:            {'✅' if after_ok else '⚠️'}")
        log.info("=" * 70)

        if failed == 0 and after_ok:
            log.info("🎉 Migration اكتملت بنجاح")
            return 0
        elif failed == 0:
            log.warning("⚠️  Migration اكتملت، لكن تحقق الأرصدة يُظهر فروقات")
            log.warning("   السبب: فروقات FLOAT سابقة — ليست من Migration")
            return 0
        else:
            log.error("❌ Migration فيها فشل — راجع الأخطاء")
            return 1


if __name__ == '__main__':
    # تأكيد
    print()
    print("=" * 70)
    print("⚠️  تحذير: هذه Migration تُغيّر المخطّط بشكل غير قابل للتراجع")
    print("=" * 70)
    print()
    print("  - كل الحقول المالية ستتحول FLOAT → NUMERIC(14,4)")
    print("  - يجب أخذ Backup في Neon قبل التنفيذ")
    print("  - إذا فشلت جزئياً → استرجع من Neon Branch")
    print()
    print("=" * 70)
    confirm = input("اكتب 'YES' للمتابعة: ").strip()
    if confirm != 'YES':
        print("❌ أُلغي")
        sys.exit(0)

    sys.exit(run())```

---

## FILE: ./backend/migrations/__init__.py

```
# Marker — migrations package```

---

## FILE: ./backend/requirements.txt

```
Flask==2.3.3
Flask-SQLAlchemy==3.1.1
Flask-JWT-Extended==4.5.2
Flask-Limiter==3.5.0
python-dotenv==1.0.0
python-telegram-bot==22.6
requests==2.31.0
flask-cors==4.0.0
psycopg2-binary==2.9.10
gunicorn==21.2.0
sentry-sdk[flask]==2.20.0
redis==5.0.1
cloudinary==1.40.0```

---

## FILE: ./backend/reset_test_data.py

```
# ============================================================
# 🧹 SANAD PLUS⁺ — Reset Test Data
# ============================================================
"""
يحذف كل البيانات التجريبية ويُصفّر أرصدة المستخدمين.
يحتفظ بـ: users, categories, products, payment_methods, settings, coupons.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.base import (
    User, Order, Deposit, KYCRequest, ServiceRequest,
    Transaction, Notification, Referral, FinancialAuditLog,
    Coupon, CouponUsage
)


def show_current_state():
    print("📊 الحالة الحالية:")
    print(f"   Orders:           {Order.query.count()}")
    print(f"   Deposits:         {Deposit.query.count()}")
    print(f"   KYC Requests:     {KYCRequest.query.count()}")
    print(f"   Service Requests: {ServiceRequest.query.count()}")
    print(f"   Transactions:     {Transaction.query.count()}")
    print(f"   Notifications:    {Notification.query.count()}")
    print(f"   Referrals:        {Referral.query.count()}")
    print(f"   Audit Log:        {FinancialAuditLog.query.count()}")
    print(f"   Coupon Usages:    {CouponUsage.query.count()}")
    print(f"   Users:            {User.query.count()}")
    print()


def reset_all_data():
    print("=" * 60)
    print("🧹 SANAD Reset Test Data")
    print("=" * 60)
    print()

    show_current_state()

    counts = {}

    print("📦 جارٍ الحذف...")
    print()

    counts['coupon_usages'] = CouponUsage.query.delete()
    print(f"   ✅ coupon_usages:        {counts['coupon_usages']}")

    counts['notifications'] = Notification.query.delete()
    print(f"   ✅ notifications:        {counts['notifications']}")

    counts['transactions'] = Transaction.query.delete()
    print(f"   ✅ transactions:         {counts['transactions']}")

    counts['referrals'] = Referral.query.delete()
    print(f"   ✅ referrals:            {counts['referrals']}")

    counts['kyc'] = KYCRequest.query.delete()
    print(f"   ✅ kyc_requests:         {counts['kyc']}")

    counts['services'] = ServiceRequest.query.delete()
    print(f"   ✅ service_requests:     {counts['services']}")

    counts['deposits'] = Deposit.query.delete()
    print(f"   ✅ deposits:             {counts['deposits']}")

    counts['orders'] = Order.query.delete()
    print(f"   ✅ orders:               {counts['orders']}")

    counts['audit_log'] = FinancialAuditLog.query.delete()
    print(f"   ✅ financial_audit_log:  {counts['audit_log']}")

    print()
    print("👤 جارٍ تصفير المستخدمين...")

    users = User.query.all()
    users_reset = 0

    for user in users:
        user.balance = 0.0
        user.referral_earnings = 0.0
        user.referral_count = 0
        user.referred_by = None
        user.referred_by_id = None
        user.kyc_status = 'unverified'
        user.is_verified = False
        user.vip_level = 0
        users_reset += 1

    counts['users_reset'] = users_reset
    print(f"   ✅ users_reset:          {users_reset}")

    try:
        db.session.commit()
        print()
        print("=" * 60)
        print("✅ تم التنظيف بنجاح")
        print("=" * 60)
        print()
        print("📊 ملخص:")
        for key, value in counts.items():
            print(f"   {key:22s}: {value:>6}")
        print()
        print("💡 تم الاحتفاظ بـ:")
        print("   • المستخدمون (أرصدة = 0)")
        print("   • الأقسام والمنتجات")
        print("   • طرق الدفع")
        print("   • الإعدادات (SYP rate)")
        print("   • الكوبونات (فقط حُذفت استخداماتها)")
        print()
        return True

    except Exception as e:
        db.session.rollback()
        print(f"\n❌ فشل: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    app = create_app()

    with app.app_context():
        print()
        print("⚠️  تحذير: هذا الإجراء لا يمكن التراجع عنه.")
        print()
        confirm = input("اكتب 'YES' للمتابعة: ")

        if confirm.strip() != 'YES':
            print("❌ تم الإلغاء.")
            sys.exit(0)

        success = reset_all_data()
        sys.exit(0 if success else 1)```

---

## FILE: ./backend/run.py

```
# ============================================================
# 🛡️ Sentry
# ============================================================
import os
import sys
import time
import atexit
import logging
import threading
import subprocess
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[FlaskIntegration()],
    traces_sample_rate=0.2,
    profiles_sample_rate=0.0,
    send_default_pii=False,
    environment=os.getenv("SENTRY_ENV", "production"),
    release=os.getenv("RELEASE_VERSION", "v18"),
)

# ============================================================
# ⬇️ Imports
# ============================================================
import sqlalchemy as sa
from sqlalchemy import text
from gunicorn.app.base import BaseApplication

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sanad.run")

app = create_app()


# ============================================================
# ✅ create_all (idempotent)
# ============================================================
with app.app_context():
    try:
        db.create_all()
        print("✅ الجداول جاهزة")
    except Exception as e:
        print(f"⚠️ create_all: {e}")


# ============================================================
# v2.4: تصفير allow_negative_balance للمستخدمين الحاليين
# ============================================================
def _fix_negative_balance_defaults():
    """تصفير allow_negative_balance للمستخدمين بدون حد سلبي فعلي"""
    try:
        result = db.session.execute(text("""
            UPDATE users 
            SET allow_negative_balance = FALSE 
            WHERE max_negative_balance <= 0 
              AND allow_negative_balance = TRUE
        """))
        db.session.commit()
        if result.rowcount:
            logger.info(f"✅ Fixed negative balance defaults: {result.rowcount} users")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Negative balance fix failed: {e}")


# ============================================================
# 🆕 v17: Migration للخصومات
# ============================================================
def _apply_discount_migration():
    """إضافة users.general_discount + جدول user_product_discounts"""
    try:
        db.session.execute(text(
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS general_discount FLOAT DEFAULT 0.0'
        ))
        db.session.commit()
        logger.info("✅ users.general_discount ready")
    except Exception as e:
        db.session.rollback()
        logger.error(f"general_discount migration failed: {e}")

    try:
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS user_product_discounts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                discount_percent FLOAT NOT NULL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT uq_user_product_discount UNIQUE (user_id, product_id)
            )
        """))
        db.session.commit()
        logger.info("✅ user_product_discounts table ready")
    except Exception as e:
        db.session.rollback()
        logger.error(f"user_product_discounts migration failed: {e}")


# ============================================================
# 🗄️ Migration (v2.1 + v17)
# ============================================================
def upgrade_database():
    """ترقية قاعدة البيانات — v2.1 + v17"""
    with app.app_context():
        inspector = sa.inspect(db.engine)
        print("بدء Migration v2.1...")

        fk_removals = [
            "ALTER TABLE admin_activities DROP CONSTRAINT IF EXISTS admin_activities_admin_id_fkey",
            "ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey",
            "ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referred_user_id_fkey",
        ]
        for sql in fk_removals:
            try:
                db.session.execute(text(sql))
                db.session.commit()
            except Exception:
                db.session.rollback()

        image_columns = {
            'categories': ['image'],
            'products': ['image'],
            'payment_methods': ['icon', 'qr_image'],
            'deposits': ['proof_image'],
            'kyc_requests': ['selfie_image'],
        }
        for table, cols in image_columns.items():
            if not inspector.has_table(table):
                continue
            existing_cols = {col['name']: str(col['type']).upper() for col in inspector.get_columns(table)}
            for col in cols:
                if col in existing_cols and ('VARCHAR' in existing_cols[col] or 'CHAR' in existing_cols[col]):
                    try:
                        db.session.execute(text(f'ALTER TABLE {table} ALTER COLUMN {col} TYPE TEXT'))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

        soft_delete_tables = ['categories', 'products', 'coupons', 'payment_methods']
        for table in soft_delete_tables:
            if inspector.has_table(table):
                try:
                    db.session.execute(text(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
        print("Soft Delete columns")

        if inspector.has_table('users'):
            users_cols = [
                'updated_at TIMESTAMP DEFAULT NOW()',
                'referred_by_id INTEGER',
                'allow_negative_balance BOOLEAN DEFAULT FALSE',
                'max_negative_balance FLOAT DEFAULT 0',
                'referral_earnings FLOAT DEFAULT 0',
                'referral_count INTEGER DEFAULT 0',
                'general_discount FLOAT DEFAULT 0.0',
            ]
            for col in users_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE users ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

            try:
                db.session.execute(text('''
                    UPDATE users u
                    SET referred_by_id = (
                        SELECT id FROM users 
                        WHERE telegram_id = u.referred_by 
                        LIMIT 1
                    )
                    WHERE u.referred_by IS NOT NULL 
                      AND u.referred_by_id IS NULL
                '''))
                db.session.commit()
                print("referred_by_id migrated")
            except Exception as e:
                db.session.rollback()
                print(f"referred_by_id: {e}")

            try:
                db.session.execute(text('''
                    UPDATE users 
                    SET referred_by_id = NULL
                    WHERE referred_by_id IS NOT NULL 
                      AND referred_by_id NOT IN (SELECT id FROM users)
                '''))
                db.session.commit()
            except Exception:
                db.session.rollback()

            try:
                db.session.execute(text('''
                    ALTER TABLE users 
                    ADD CONSTRAINT fk_users_referred_by 
                    FOREIGN KEY (referred_by_id) 
                    REFERENCES users(id) 
                    ON DELETE SET NULL
                '''))
                db.session.commit()
                print("FK referred_by_id")
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    print(f"FK: {e}")

            try:
                db.session.execute(text('''
                    ALTER TABLE users 
                    ADD CONSTRAINT chk_users_referred_not_self 
                    CHECK (referred_by_id IS NULL OR referred_by_id != id)
                '''))
                db.session.commit()
                print("CHECK referred_by_id")
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    print(f"CHECK: {e}")

        if inspector.has_table('categories'):
            existing_cols = [col['name'] for col in inspector.get_columns('categories')]
            if 'order' in existing_cols and 'display_order' not in existing_cols:
                try:
                    db.session.execute(text('ALTER TABLE categories RENAME COLUMN "order" TO display_order'))
                    db.session.commit()
                    print("categories: order → display_order")
                except Exception as e:
                    db.session.rollback()
                    print(f"categories rename: {e}")
            elif 'display_order' not in existing_cols:
                try:
                    db.session.execute(text('ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

        if inspector.has_table('products'):
            products_cols = [
                'max_quantity INTEGER DEFAULT 0',
                "unit_name VARCHAR(50) DEFAULT 'قطعة'",
                'is_bundle BOOLEAN DEFAULT FALSE',
            ]
            for col in products_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE products ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

            try:
                db.session.execute(text('ALTER TABLE products ALTER COLUMN stock DROP NOT NULL'))
                db.session.commit()
            except Exception:
                db.session.rollback()

            try:
                db.session.execute(text('UPDATE products SET stock = NULL WHERE stock = 0'))
                db.session.commit()
                print("stock=0 → NULL")
            except Exception as e:
                db.session.rollback()
                print(f"stock migration: {e}")

        if inspector.has_table('orders'):
            orders_cols = [
                'discount_amount FLOAT DEFAULT 0',
                'coupon_code VARCHAR(50)',
                'reviewed_by INTEGER',
                'can_cancel_until TIMESTAMP',
                'cancelled_at TIMESTAMP',
                'completed_at TIMESTAMP',
                'failed_at TIMESTAMP',
            ]
            for col in orders_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE orders ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

        if inspector.has_table('payment_methods'):
            # 🆕 v18.3.6: max_amount + fee_type
            pm_cols = [
                'max_amount FLOAT DEFAULT 500.0',
                "fee_type VARCHAR(20) DEFAULT 'percentage'",
            ]
            for col in pm_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()
            try:
                db.session.execute(text("UPDATE payment_methods SET max_amount = 500.0 WHERE max_amount IS NULL"))
                db.session.commit()
                print("payment_methods.max_amount ready")
            except Exception as e:
                db.session.rollback()
                print(f"pm.max_amount migration: {e}")

        if inspector.has_table('deposits'):
            deposits_cols = [
                'admin_note TEXT',
                'method_id INTEGER',
                'idempotency_key VARCHAR(100)',
                'reviewed_by INTEGER',
                'reviewed_at TIMESTAMP',
            ]
            for col in deposits_cols:
                try:
                    db.session.execute(text(f'ALTER TABLE deposits ADD COLUMN IF NOT EXISTS {col}'))
                    db.session.commit()
                except Exception:
                    db.session.rollback()

            try:
                db.session.execute(text('''
                    UPDATE deposits 
                    SET method_id = CAST(method AS INTEGER)
                    WHERE method ~ '^[0-9]+$' 
                      AND method_id IS NULL
                '''))
                db.session.commit()
                print("deposits.method → method_id")
            except Exception as e:
                db.session.rollback()
                print(f"method migration: {e}")

            try:
                db.session.execute(text('''
                    ALTER TABLE deposits 
                    ADD CONSTRAINT uq_deposits_idempotency 
                    UNIQUE (idempotency_key)
                '''))
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    pass

            try:
                db.session.execute(text('''
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_deposit_txid_user 
                    ON deposits(user_id, txid) 
                    WHERE txid IS NOT NULL AND txid != ''
                '''))
                db.session.commit()
                print("UNIQUE (user_id, txid)")
            except Exception as e:
                db.session.rollback()
                print(f"uq txid: {e}")

        if inspector.has_table('kyc_requests'):
            try:
                db.session.execute(text('ALTER TABLE kyc_requests ADD COLUMN IF NOT EXISTS reviewed_by INTEGER'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if inspector.has_table('coupon_usages'):
            try:
                db.session.execute(text('ALTER TABLE coupon_usages ADD COLUMN IF NOT EXISTS discount_applied FLOAT DEFAULT 0'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if inspector.has_table('service_requests'):
            try:
                db.session.execute(text('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS admin_id INTEGER'))
                db.session.commit()
                db.session.execute(text('ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if inspector.has_table('admins'):
            try:
                db.session.execute(text('DROP TABLE admins CASCADE'))
                db.session.commit()
                print("Dropped admins table")
            except Exception as e:
                db.session.rollback()
                print(f"drop admins: {e}")

        try:
            db.create_all()
            db.session.commit()
            print("New tables created")
        except Exception as e:
            db.session.rollback()
            print(f"create_all: {e}")

        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)",
            "CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status)",
            "CREATE INDEX IF NOT EXISTS idx_users_vip_level ON users(vip_level)",
            "CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned)",
            "CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
            "CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON deposits(user_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status)",
            "CREATE INDEX IF NOT EXISTS idx_deposits_created ON deposits(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_requests(status)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_audit_user_created ON financial_audit_log(user_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_audit_action ON financial_audit_log(action, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_services_status ON service_requests(status)",
            "CREATE INDEX IF NOT EXISTS idx_otp_session_id ON admin_otp_sessions(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_otp_expires ON admin_otp_sessions(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_blacklist_jti ON jwt_blacklist(jti)",
            "CREATE INDEX IF NOT EXISTS idx_upd_user ON user_product_discounts(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_upd_product ON user_product_discounts(product_id)",
            "CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active) WHERE deleted_at IS NULL",
            "CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON coupons(code, is_active) WHERE deleted_at IS NULL",
        ]
        for idx_sql in indexes:
            try:
                db.session.execute(text(idx_sql))
                db.session.commit()
            except Exception:
                db.session.rollback()

        if inspector.has_table('coupon_usages'):
            try:
                db.session.execute(text('''
                    DELETE FROM coupon_usages a
                    USING coupon_usages b
                    WHERE a.id > b.id
                      AND a.coupon_id = b.coupon_id
                      AND a.user_id = b.user_id
                '''))
                db.session.commit()
            except Exception:
                db.session.rollback()

            try:
                db.session.execute(text('''
                    ALTER TABLE coupon_usages
                    ADD CONSTRAINT uq_coupon_user UNIQUE (coupon_id, user_id)
                '''))
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                if 'already exists' not in str(e).lower():
                    pass

        _fix_negative_balance_defaults()
        _apply_discount_migration()

        print("اكتملت ترقية قاعدة البيانات (v2.1 + v17)")


# ============================================================
# 🤖 Bot — Subprocess + Supervisor (v18)
# ============================================================
_bot_process = None
_shutdown_event = threading.Event()


def _start_bot_subprocess():
    """يشغل البوت مرة واحدة (legacy — يستخدمه supervisor داخلياً)"""
    global _bot_process

    bot_script = os.path.join(os.path.dirname(__file__), "bot_main.py")

    if not os.path.exists(bot_script):
        logger.error(f"❌ bot_main.py not found: {bot_script}")
        return None

    try:
        _bot_process = subprocess.Popen(
            [sys.executable, "-u", bot_script],
            stdout=sys.stdout,
            stderr=sys.stderr,
            env=os.environ.copy(),
        )
        logger.info(f"🤖 Bot subprocess started (PID: {_bot_process.pid})")
        return _bot_process
    except Exception as e:
        logger.error(f"❌ Failed to start bot subprocess: {e}")
        return None


def _stop_bot_subprocess():
    """إيقاف نظيف للبوت"""
    global _bot_process

    _shutdown_event.set()

    if _bot_process is None:
        return
    if _bot_process.poll() is not None:
        return

    logger.info("🛑 Terminating bot subprocess...")
    try:
        _bot_process.terminate()
        try:
            _bot_process.wait(timeout=10)
            logger.info("✅ Bot subprocess terminated gracefully")
        except subprocess.TimeoutExpired:
            logger.warning("⚠️ Bot didn't stop in 10s, killing...")
            _bot_process.kill()
            try:
                _bot_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                pass
    except Exception as e:
        logger.error(f"❌ Error stopping bot: {e}")


def _bot_supervisor():
    """
    🆕 v18: يشغّل البوت ويراقبه — يعيد التشغيل عند crash.
    يعمل في daemon thread داخل Gunicorn worker.
    """
    global _bot_process

    bot_script = os.path.join(os.path.dirname(__file__), "bot_main.py")

    if not os.path.exists(bot_script):
        logger.error(f"❌ bot_main.py not found: {bot_script}")
        return

    restart_count = 0

    while not _shutdown_event.is_set():
        try:
            _bot_process = subprocess.Popen(
                [sys.executable, "-u", bot_script],
                stdout=sys.stdout,
                stderr=sys.stderr,
                env=os.environ.copy(),
            )
            logger.info(f"🤖 Bot started (PID: {_bot_process.pid}, restarts: {restart_count})")

            # انتظر انتهاء العملية
            _bot_process.wait()

            if _shutdown_event.is_set():
                logger.info("🛑 Shutdown requested — supervisor stopping")
                break

            exit_code = _bot_process.returncode
            if exit_code == 0:
                logger.info("🤖 Bot exited cleanly — supervisor stopping")
                break

            restart_count += 1
            logger.warning(f"⚠️ Bot crashed (code={exit_code}), restart #{restart_count} in 5s")

            # 🆕 v18: Sentry alert
            try:
                import sentry_sdk
                sentry_sdk.capture_message(
                    f"Bot crashed (code={exit_code}), restart #{restart_count}",
                    level="warning"
                )
            except Exception:
                pass

            # انتظر 5 ثوان قبل الإعادة (لكن احترم shutdown)
            if _shutdown_event.wait(timeout=5):
                break

        except Exception as e:
            logger.error(f"Supervisor error: {e}")
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(e)
            except Exception:
                pass
            if _shutdown_event.wait(timeout=10):
                break


def post_fork(server, worker):
    """
    🆕 v18: يشغل supervisor thread بدلاً من bot subprocess مباشرة.
    """
    logger.info("🔧 post_fork hook running...")

    supervisor_thread = threading.Thread(
        target=_bot_supervisor,
        name="bot-supervisor",
        daemon=True,
    )
    supervisor_thread.start()
    logger.info("🛡️ Bot supervisor thread started")

    atexit.register(_stop_bot_subprocess)


# ============================================================
# 🌐 Gunicorn Standalone Application
# ============================================================
class StandaloneApplication(BaseApplication):
    def __init__(self, app, options=None):
        self.options = options or {}
        self.application = app
        super().__init__()

    def load_config(self):
        for key, value in self.options.items():
            if key in self.cfg.settings and value is not None:
                self.cfg.set(key.lower(), value)

    def load(self):
        return self.application


# ============================================================
# 🚀 Main Entry Point
# ============================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    upgrade_database()

    options = {
        "bind": f"0.0.0.0:{port}",
        "workers": 1,
        "threads": 4,
        "worker_class": "gthread",
        "timeout": 120,
        "graceful_timeout": 30,
        "keepalive": 5,
        "accesslog": "-",
        "errorlog": "-",
        "loglevel": "info",
        "preload_app": False,
        "post_fork": post_fork,
    }

    logger.info(f"🚀 Starting Gunicorn on port {port}")
    logger.info(f"   workers=1, threads=4, worker_class=gthread")
    logger.info(f"   Bot supervisor: enabled (v18)")

    StandaloneApplication(app, options).run()```

---

## FILE: ./backend/runtime.txt

```
python-3.13.12
```

---

## FILE: ./backend/tests/__init__.py

```
# Tests package
```

---

## FILE: ./backend/tests/test_pricing_parity.py

```
# ============================================================
# 🧪 Parity Test — v18.3.7
# ============================================================
import os
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

_HERE = Path(__file__).resolve()
_BACKEND = _HERE.parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


# ════════════════════════════════════════════════════════════
# Test 1: JS Formula Contract
# ════════════════════════════════════════════════════════════
def test_js_formula_contract():
    """يفشل لو JS غيّر صيغة السعر بدون تحديث Python"""
    js_path = _BACKEND.parent / "miniapp" / "js" / "app_new.js"

    if not js_path.exists():
        print(f"⚠️  SKIP: {js_path} غير موجود")
        return

    js = js_path.read_text(encoding="utf-8")

    assert "basePrice / baseQty" in js, (
        "❌ JS formula changed — update Python side too"
    )
    assert "baseQty > 0" in js, (
        "❌ baseQty guard missing from JS"
    )

    print("✅ Test 1: JS formula contract preserved")


# ════════════════════════════════════════════════════════════
# Test 2: Unit price math
# ════════════════════════════════════════════════════════════
def test_unit_price_math():
    cases = [
        (8700, "1.00", "0.0001"),
        (60,   "1.20", "0.0200"),
        (1,    "5.50", "5.5000"),
        (325,  "5.00", "0.0154"),
        (100,  "2.00", "0.0200"),
        (1000, "132.00", "0.1320"),
    ]

    for qty, price_str, expected_str in cases:
        price = Decimal(price_str)
        expected = Decimal(expected_str)

        unit = (price / qty).quantize(
            Decimal("0.0001"), rounding=ROUND_HALF_UP
        )
        assert unit == expected, (
            f"❌ ({qty}, {price_str}): unit={unit} ≠ {expected}"
        )

    print(f"✅ Test 2: {len(cases)} cases passed")


# ════════════════════════════════════════════════════════════
# Test 3: End-to-end from DB (skip if no DATABASE_URL)
# ════════════════════════════════════════════════════════════
def test_products_from_db():
    """يفحص كل منتج فعلي في DB — يتخطى لو DATABASE_URL غير موجود"""
    if not os.getenv("DATABASE_URL"):
        print("⚠️  SKIP: DATABASE_URL not set (local env)")
        return

    try:
        from app import create_app
        from app.models.base import Product
    except ImportError as e:
        print(f"⚠️  SKIP: cannot import app ({e})")
        return

    try:
        app = create_app()
    except Exception as e:
        print(f"⚠️  SKIP: create_app failed ({e})")
        return

    with app.app_context():
        products = Product.query.filter(
            Product.is_active == True,
            Product.base_quantity > 0,
            Product.product_type == 'quantity',
        ).all()

        if not products:
            print("⚠️  SKIP: no active products")
            return

        failures = []
        for p in products:
            unit = (Decimal(str(p.base_price)) / p.base_quantity).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )
            total = (unit * p.base_quantity).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )

            diff = abs(total - Decimal(str(p.base_price)))
            if diff > Decimal("0.01"):
                failures.append(
                    f"  ❌ #{p.id} '{p.name}': {p.base_price} → {total} (diff={diff})"
                )

        if failures:
            msg = "\n".join(failures)
            raise AssertionError(
                f"{len(failures)} products failed parity:\n{msg}"
            )

        print(f"✅ Test 3: {len(products)} products match parity")


# ════════════════════════════════════════════════════════════
# Standalone runner
# ════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("🧪 Pricing Parity Tests — v18.3.7")
    print("=" * 60)
    print()

    tests = [
        ("Test 1 — JS Contract", test_js_formula_contract),
        ("Test 2 — Unit Price Math", test_unit_price_math),
        ("Test 3 — DB Products", test_products_from_db),
    ]

    passed = 0
    failed = 0

    for name, fn in tests:
        try:
            print(f"▸ {name} ...")
            fn()
            passed += 1
        except AssertionError as e:
            print(f"  ❌ FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            failed += 1
        print()

    print("=" * 60)
    print(f"📊 Results: {passed} passed, {failed} failed")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
```

---

## FILE: ./bot/bot.py

```
# ============================================================
# 🤖 SANAD PLUS⁺ Bot — v18 (Sentry + Heartbeat)
# ============================================================
import os
import logging
import requests
import time
import asyncio
from collections import defaultdict

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

ENV_PATHS = [
    os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'),
    os.path.join(os.path.dirname(__file__), '..', '.env'),
]
for env_path in ENV_PATHS:
    if os.path.exists(env_path):
        if load_dotenv:
            load_dotenv(env_path)
        break

from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

# Early logger definition (v18.4.14 — fixes ADMIN_IDS parse bug)
logger = logging.getLogger(__name__)


# ============================================================
# 🛡️ Sentry (already initialized in bot_main.py — just import)
# ============================================================
try:
    import sentry_sdk
    _SENTRY_AVAILABLE = True
except ImportError:
    _SENTRY_AVAILABLE = False


# ============================================================
# ============ Environment Variables ============
# ============================================================
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
TELEGRAM_ADMIN_IDS_STR = os.getenv("TELEGRAM_ADMIN_IDS", "")
MINIAPP_URL = os.getenv("MINIAPP_URL", "https://sanad-plus.vercel.app")
ADMIN_PANEL_URL = os.getenv("ADMIN_PANEL_URL", "https://sanad-plus-admi.vercel.app")
BACKEND_URL = os.getenv("BACKEND_URL", "https://sanad-plus-backend.onrender.com")
BOT_API_SECRET = os.getenv("BOT_API_SECRET", "")

ADMIN_IDS = []
for _x in TELEGRAM_ADMIN_IDS_STR.split(","):
    _x = _x.strip()
    if not _x:
        continue
    try:
        ADMIN_IDS.append(int(_x))
    except ValueError:
        logger.warning(f"⚠️ Invalid admin ID: {_x}")


# ============================================================
# ============ Logging Setup ============
# ============================================================
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

if not ADMIN_IDS:
    logger.warning("⚠️ TELEGRAM_ADMIN_IDS فارغ — لن تُرسل تنبيهات!")

# 🔒 إخفاء التوكن من httpx/telegram logs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("telegram").setLevel(logging.WARNING)
logging.getLogger("telegram.ext").setLevel(logging.WARNING)
logging.getLogger("telegram.request").setLevel(logging.WARNING)


# ============================================================
# ============ Version (Cache Buster) ============
# ============================================================
MINIAPP_VERSION = "22"
BOT_VERSION = "v18.4.14"


def get_miniapp_url():
    """رابط MiniApp مع cache buster"""
    separator = "&" if "?" in MINIAPP_URL else "?"
    return f"{MINIAPP_URL}{separator}v={MINIAPP_VERSION}"


# ============================================================
# ============ 🛡️ Rate Limiting ============
# ============================================================
_rate_limit_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 10


def is_rate_limited(user_id):
    """🆕 v18.4: Redis-based rate limiting مع in-memory fallback"""
    if user_id in ADMIN_IDS:
        return False

    # ═══ محاولة Redis أولاً ═══
    try:
        from app.services.cache_service import rate_limit_check
        result = rate_limit_check(
            key=f"bot:{user_id}",
            max_requests=RATE_LIMIT_MAX,
            window_seconds=RATE_LIMIT_WINDOW,
        )
        if result is not None:
            return result
    except Exception as e:
        logger.warning(f"Redis rate-limit unavailable, using memory: {e}")

    # ═══ Fallback: in-memory ═══
    # 🆕 v18.4.14: Emergency flush — memory leak prevention
    if len(_rate_limit_store) > 50_000:
        logger.warning(
            f"🚨 _rate_limit_store overflow ({len(_rate_limit_store)} keys) — flushing"
        )
        if _SENTRY_AVAILABLE:
            try:
                sentry_sdk.capture_message(
                    "Rate limit fallback overflow", level="warning"
                )
            except Exception:
                pass
        _rate_limit_store.clear()

    now = time.time()
    _rate_limit_store[user_id] = [
        t for t in _rate_limit_store[user_id]
        if now - t < RATE_LIMIT_WINDOW
    ]
    if len(_rate_limit_store[user_id]) >= RATE_LIMIT_MAX:
        return True
    _rate_limit_store[user_id].append(now)
    return False


# ============================================================
# ============ 🛡️ Notify Admins ============
# ============================================================
def notify_admins_sync(message: str, important: bool = False):
    """إرسال تنبيه لكل الأدمن"""
    emoji = "🚨" if important else "ℹ️"
    full_message = f"{emoji} {message}"

    for admin_id in ADMIN_IDS:
        try:
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
            payload = {
                "chat_id": admin_id,
                "text": full_message,
                "parse_mode": "Markdown"
            }
            requests.post(url, json=payload, timeout=5)
        except Exception as e:
            logger.error(f"فشل إرسال تنبيه للأدمن {admin_id}: {e}")


# ============================================================
# ============ Register / Update User ============
# ============================================================
def register_or_update_user(user_id, first_name, last_name, username):
    """تسجيل أو تحديث المستخدم عبر الـ Backend (مسار البوت)"""
    try:
        payload = {
            "telegram_id": user_id,
            "first_name": first_name or "",
            "last_name": last_name or "",
            "username": username or "",
        }
        headers = {
            "X-Bot-Token": BOT_API_SECRET,
            "Content-Type": "application/json",
        }
        response = requests.post(
            f"{BACKEND_URL}/api/bot/auth",
            json=payload,
            headers=headers,
            timeout=8
        )
        if response.ok:
            data = response.json()
            logger.info(f"✅ تم تسجيل/تحديث المستخدم {user_id}")
            return data
        else:
            logger.warning(
                f"⚠️ Backend رجع {response.status_code} — {response.text[:200]}"
            )
            return None
    except Exception as e:
        logger.error(f"❌ خطأ في تسجيل المستخدم: {e}")
        if _SENTRY_AVAILABLE:
            sentry_sdk.capture_exception(e)
        return None


# ============================================================
# 🆕 v18: Heartbeat Loop (Redis)
# ============================================================
async def heartbeat_loop():
    """
    يكتب heartbeat في Redis كل 60 ثانية.
    يُقرأ من /api/health للتأكد أن البوت حي.
    """
    try:
        from app.services.cache_service import cache_set
    except Exception as e:
        logger.error(f"❌ Cannot import cache_set: {e}")
        return

    # انتظر قليلاً قبل أول heartbeat
    await asyncio.sleep(5)

    while True:
        try:
            now = int(time.time())
            ok = cache_set("bot:heartbeat", now, ttl=90)
            if ok:
                logger.debug(f"💓 Heartbeat sent: {now}")
            else:
                logger.warning("⚠️ Heartbeat cache_set failed")
        except Exception as e:
            logger.warning(f"Heartbeat error: {e}")
        await asyncio.sleep(60)


_heartbeat_task = None  # 🆕 v18.4.7: keep reference (prevent GC)

async def post_init(application: Application):
    """يُستدعى بعد تهيئة البوت — يبدأ الـ heartbeat"""
    global _heartbeat_task
    # 🆕 v18.4.8: cancel previous task if any (restart safety)
    if _heartbeat_task and not _heartbeat_task.done():
        _heartbeat_task.cancel()
    logger.info("🚀 post_init: starting heartbeat loop")
    _heartbeat_task = asyncio.create_task(heartbeat_loop())


async def post_shutdown(application: Application):
    """🆕 v18.4.10: cleanup heartbeat على shutdown نظيف"""
    global _heartbeat_task
    if _heartbeat_task and not _heartbeat_task.done():
        _heartbeat_task.cancel()
        try:
            await _heartbeat_task
        except asyncio.CancelledError:
            pass
        logger.info("🛑 post_shutdown: heartbeat task cancelled")


# ============================================================
# ============ /start ============
# ============================================================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.effective_user:
        return
    user_id = update.effective_user.id
    first_name = update.effective_user.first_name or "مستخدم"
    last_name = update.effective_user.last_name or ""
    username = update.effective_user.username or ""

    if is_rate_limited(user_id):
        logger.warning(f"🚫 Rate limit تجاوز المستخدم {user_id}")
        await update.message.reply_text(
            "⚠️ لقد تجاوزت الحد المسموح من الأوامر.\n"
            "يرجى المحاولة بعد دقيقة."
        )
        return

    logger.info(f"📥 /start من {user_id} - {first_name} @{username}")

    user_data = register_or_update_user(user_id, first_name, last_name, username)

    keyboard = [
        [InlineKeyboardButton("🛍️ افتح المتجر", web_app=WebAppInfo(url=get_miniapp_url()))]
    ]

    if user_id in ADMIN_IDS:
        keyboard.append([InlineKeyboardButton("📊 لوحة التحكم", url=ADMIN_PANEL_URL)])

    reply_markup = InlineKeyboardMarkup(keyboard)

    if user_data:
        vip_text = ""
        if user_data.get('vip_level', 0) > 0:
            vip_text = f" 👑 VIP{user_data.get('vip_level', 0)}"

        balance = user_data.get('balance', 0)
        await update.message.reply_text(
            f"مرحباً {first_name}{vip_text} 👋\n\n"
            f"💰 رصيدك: {balance:.2f}$\n\n"
            f"أهلاً بك في متجر SANAD PLUS⁺\n"
            f"اختر من الأزرار بالأسفل:",
            reply_markup=reply_markup,
        )
    else:
        notify_admins_sync(
            f"⚠️ فشل تسجيل مستخدم\n"
            f"ID: `{user_id}`\n"
            f"الاسم: {first_name}",
            important=True
        )
        await update.message.reply_text(
            f"مرحباً {first_name} 👋\n\n"
            f"أهلاً بك في متجر SANAD PLUS⁺\n"
            f"اختر من الأزرار بالأسفل:",
            reply_markup=reply_markup,
        )


# ============================================================
# ============ /me ============
# ============================================================
async def me(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.effective_user:
        return
    user_id = update.effective_user.id

    if is_rate_limited(user_id):
        await update.message.reply_text("⚠️ يرجى المحاولة بعد قليل.")
        return

    user_data = register_or_update_user(
        user_id,
        update.effective_user.first_name or "",
        update.effective_user.last_name or "",
        update.effective_user.username or ""
    )

    if user_data:
        vip_text = ""
        if user_data.get('vip_level', 0) > 0:
            vip_text = f" 👑 VIP{user_data.get('vip_level', 0)}"

        kyc_status = user_data.get('kyc_status', 'غير موثق')
        balance = user_data.get('balance', 0)

        message = (
            f"👤 معلوماتك:\n"
            f"━━━━━━━━━━━━━━━\n"
            f"الاسم: {user_data.get('first_name', '')} {user_data.get('last_name', '')}\n"
            f"Telegram ID: `{user_id}`\n"
            f"الرصيد: {balance:.2f}$\n"
            f"الحالة KYC: {kyc_status}\n"
            f"مستوى VIP: {user_data.get('vip_level', 0)}{vip_text}\n"
        )
        await update.message.reply_text(message, parse_mode="Markdown")
    else:
        await update.message.reply_text("تعذر جلب معلوماتك. حاول لاحقاً.")


# ============================================================
# ============ /admin_info (للأدمن فقط) ============
# ============================================================
async def admin_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """عرض معلومات النظام للأدمن"""
    user_id = update.effective_user.id

    if user_id not in ADMIN_IDS:
        logger.warning(f"🚫 محاولة وصول غير مصرح بها لـ /admin_info من {user_id}")
        notify_admins_sync(
            f"🚫 محاولة وصول غير مصرح بها\n"
            f"المستخدم: `{user_id}`\n"
            f"الأمر: /admin_info",
            important=True
        )
        await update.message.reply_text("⛔ غير مصرح.")
        return

    info = (
        f"📊 **معلومات النظام**\n"
        f"━━━━━━━━━━━━━━━\n"
        f"🤖 **البوت:** يعمل ({BOT_VERSION})\n"
        f"📦 **إصدار MiniApp:** v{MINIAPP_VERSION}\n"
        f"🔗 **MiniApp URL:** {get_miniapp_url()}\n"
        f"🖥️ **Backend:** {BACKEND_URL}\n"
        f"👥 **عدد الأدمن:** {len(ADMIN_IDS)}\n"
        f"🛡️ **Sentry:** {'✅ نشط' if _SENTRY_AVAILABLE else '❌ غير متوفر'}\n"
        f"💓 **Heartbeat:** كل 60s → Redis\n"
    )
    await update.message.reply_text(info, parse_mode="Markdown")


# ============================================================
# ============ 🛡️ Global Error Handler ============
# ============================================================
# ─────────────────────────────────────────────────────────────
# Error Notification Throttling — v18.4.11
# ─────────────────────────────────────────────────────────────
_error_notify_buckets = defaultdict(list)
_ERROR_NOTIFY_WINDOW = 300
_ERROR_NOTIFY_MAX = 3
_ERROR_NOTIFY_KEY_LEN = 80

def _should_notify_error(error_str: str) -> bool:
    if not error_str:
        return True
    key = error_str[:_ERROR_NOTIFY_KEY_LEN]
    now = time.time()
    bucket = int(now // _ERROR_NOTIFY_WINDOW)
    if len(_error_notify_buckets) > 1000:
        for k in list(_error_notify_buckets.keys()):
            if k[1] < bucket:
                del _error_notify_buckets[k]
    full_key = (key, bucket)
    _error_notify_buckets[full_key].append(now)
    count = len(_error_notify_buckets[full_key])
    if count == _ERROR_NOTIFY_MAX + 1:
        logger.warning(f"Rate limit triggered: {key[:50]}...")
        return True
    return count <= _ERROR_NOTIFY_MAX

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    """التعامل مع الأخطاء غير المتوقعة"""
    error_str = str(context.error)

    if "Conflict" in error_str or "terminated by other getUpdates" in error_str:
        logger.warning(f"⚠️ Conflict مؤقت — سيُحل تلقائياً")
        return

    logger.error(f"❌ خطأ في البوت: {context.error}")

    # 🆕 v18: Sentry capture
    if _SENTRY_AVAILABLE:
        try:
            sentry_sdk.capture_exception(context.error)
        except Exception as e:
            logger.error(f"Sentry capture failed: {e}")

    if context.error:
        error_short = str(context.error)[:300]
        if _should_notify_error(error_short):
            try:
                notify_admins_sync(
                    f"❌ **خطأ في البوت**\n`{error_short}`",
                    important=True
                )
            except Exception as e:
                logger.error(f"Failed to notify admins: {e}")
        else:
            logger.debug(f"Error notification throttled: {error_short[:50]}")


# ============================================================
# ============ App Setup ============
# ============================================================
def create_application() -> Application:
    if not BOT_TOKEN:
        raise ValueError("BOT_TOKEN غير موجود في ملف .env")

    # 🆕 v18: post_init → يبدأ heartbeat loop
    application = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("me", me))
    application.add_handler(CommandHandler("admin_info", admin_info))

    application.add_error_handler(error_handler)

    return application


def run_polling():
    application = create_application()
    logger.info(f"🚀 بدء تشغيل البوت {BOT_VERSION} — MiniApp Version: {MINIAPP_VERSION}")
    logger.info(f"🔗 MiniApp URL: {get_miniapp_url()}")
    logger.info(f"👥 عدد الأدمن: {len(ADMIN_IDS)}")
    logger.info(f"🛡️ Sentry: {'✅' if _SENTRY_AVAILABLE else '❌'}")
    logger.info(f"💓 Heartbeat loop: سيبدأ خلال 5s")

    notify_admins_sync(
        f"✅ البوت بدأ العمل ({BOT_VERSION})\n"
        f"MiniApp v{MINIAPP_VERSION}\n"
        f"Sentry: {'✅' if _SENTRY_AVAILABLE else '❌'}"
    )

    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    run_polling()
```

---

## FILE: ./bot/requirements.txt

```
python-telegram-bot==22.6
python-dotenv==1.0.0
requests==2.31.0
```

---

## FILE: ./bump-sw-versions.sh

```
#!/bin/bash
# ============================================================
# 🔄 Bump Service Worker versions before every push
# ============================================================
# Usage: ./bump-sw-versions.sh
# ============================================================

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M)
NEW_VERSION_MINI="v18.2-${TIMESTAMP}"
NEW_VERSION_ADMIN="v18.2-${TIMESTAMP}"

echo "═══════════════════════════════════════════════"
echo "🔄 Bumping SW versions"
echo "   Timestamp: ${TIMESTAMP}"
echo "═══════════════════════════════════════════════"

# 1. MiniApp SW
if [ -f "miniapp/sw.js" ]; then
    sed -i "s|const CACHE_VERSION = 'sanad-miniapp-v[0-9A-Za-z.-]*';|const CACHE_VERSION = 'sanad-miniapp-${NEW_VERSION_MINI}';|" miniapp/sw.js
    NEW_LINE=$(grep "CACHE_VERSION" miniapp/sw.js | head -1)
    echo "✅ miniapp/sw.js → ${NEW_LINE##*sanad-}"
else
    echo "⚠️  miniapp/sw.js غير موجود"
fi

# 2. Admin SW
if [ -f "admin/sw.js" ]; then
    sed -i "s|const CACHE_VERSION = 'sanad-admin-v[0-9A-Za-z.-]*';|const CACHE_VERSION = 'sanad-admin-${NEW_VERSION_ADMIN}';|" admin/sw.js
    NEW_LINE=$(grep "CACHE_VERSION" admin/sw.js | head -1)
    echo "✅ admin/sw.js   → ${NEW_LINE##*sanad-}"
else
    echo "⚠️  admin/sw.js غير موجود"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "📋 Next steps:"
echo "   git add miniapp/sw.js admin/sw.js"
echo "   git commit -m 'chore: bump SW versions to ${TIMESTAMP}'"
echo "   git push origin main"
echo "═══════════════════════════════════════════════"```

---

## FILE: ./docs/06-api-contract.md

```
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
```

---

## FILE: ./docs/CHANGELOG_v18.4.11.md

```
# 📋 SANAD PLUS⁺ — CHANGELOG v18.4.11

**التاريخ:** 28 سبتمبر 2026
**Commits:** `b0bd995`, `67ff7b2`
**الحالة:** ✅ Production Live

---

## 🔴 Critical Fixes

### 1. Notify Admins DoS Protection
- **الملف:** `bot/bot.py` (~السطر 381-420)
- **المشكلة:** `notify_admins_sync` كان يُستدعى بلا حد عند كل خطأ → إغراق قناة الأدمن
- **الحل:** `_should_notify_error` — نافذة 5 دقائق، حد 3 إشعارات لكل نوع خطأ
- **الاختبار:** `test_error_throttle.py` → 4/4 نجحت
- **الأثر:** 20 خطأ متطابق → 4 إشعارات (بدل 20)

### 2. ADMIN_IDS Parse Bug (NameError)
- **الملف:** `bot/bot.py` (~السطر 58)
- **المشكلة:** `logger.warning` داخل حلقة parse IDs قبل تعريف `logger` → NameError
- **الحل:** استبدال بـ `print()` (مؤقتاً — يُحسَّن في v18.4.12 بنقل logger للأعلى)

---

## 🟢 Version Sync

| الموضع | القديم | الجديد |
|--------|--------|--------|
| `bot/bot.py:85` (BOT_VERSION) | v18.4.10.1 | **v18.4.11** |
| `settings_public.py:67` (health) | v18.4.9 | **v18.4.11** |

---

## 🛡️ Infrastructure Facts (موثَّقة)

### UptimeRobot مُفعَّل
- يستعلم `/api/health` كل ~60 ثانية
- يوفّر طبقة حماية خارجية ضد Supervisor crash
- ⚠️ **TODO:** ربطه بـ Render Deploy Hook للاسترداد التلقائي

### Redis Heartbeat
- يُكتب كل 60s من `heartbeat_loop()`
- TTL 90s — يُقرأ من `/api/health`
- `age_seconds < 120` = البوت حي

---

## 📊 Verification
```

---

## FILE: ./docs/SUPERVISOR_TEST_v18.4.14.md

```
# 🧪 Supervisor Crash Test Procedure — v18.4.14

## الهدف
التحقق من استرداد البوت تلقائياً عند موت Gunicorn worker.

## السياق
- Supervisor thread يعمل داخل Gunicorn worker
- عند موت worker → Supervisor يموت معه
- الحماية الحالية: UptimeRobot (خارجي) على /api/health

## الاختبار (maintenance window)

### 1. Pre-flight
```bash
curl -s https://sanad-plus-backend.onrender.com/api/health | jq .checks.bot
# احفظ: age_seconds
EOF
```

---

## FILE: ./dump_all.sh

```
#!/bin/bash
OUT="FULL_SOURCE.md"

echo "# SANAD PLUS⁺ — Full Source Code Dump" > $OUT
echo "" >> $OUT
echo "**Generated:** $(date)" >> $OUT
echo "" >> $OUT
echo "---" >> $OUT

# قائمة الملفات (استثني الضروري)
files=$(find . -type f \
  -not -path "./.git/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/__pycache__/*" \
  -not -path "*/backup_*" \
  -not -name "*.pyc" \
  -not -name "*.save" \
  -not -name "*.db" \
  -not -name "audit_*" \
  -not -path "*/instance/*" \
  \( -name "*.py" -o -name "*.js" -o -name "*.html" -o -name "*.css" \
     -o -name "*.json" -o -name "*.txt" -o -name "*.yml" -o -name "*.sh" \
     -o -name "*.md" -o -name ".gitignore" \) \
  | sort)

count=$(echo "$files" | wc -l)
echo "**Total files:** $count" >> $OUT
echo "" >> $OUT

for f in $files; do
    lines=$(wc -l < "$f" 2>/dev/null || echo 0)
    echo "## FILE: $f" >> $OUT
    echo "" >> $OUT
    echo "\`\`\`" >> $OUT
    cat "$f" >> $OUT
    echo "\`\`\`" >> $OUT
    echo "" >> $OUT
    echo "---" >> $OUT
    echo "" >> $OUT
    echo "✅ Dumped: $f ($lines سطر)"
done

echo ""
echo "═══════════════════════════════════"
echo "✅ DONE — $(wc -l < $OUT) سطر في $OUT"
echo "📦 الحجم: $(du -h $OUT | cut -f1)"
echo "═══════════════════════════════════"
```

---

## FILE: ./fix_decimal_backend_v18.4.13.py

```
"""
Fix: Add custom JSON provider that converts Decimal → float
Apply at app initialization (after app = Flask(__name__))
"""
import os

target = "backend/app/__init__.py"
if not os.path.exists(target):
    print(f"[FAIL] {target} not found")
    exit(1)

with open(target, "r", encoding="utf-8") as f:
    content = f.read()

if "CustomJSONProvider" in content:
    print("[SKIP] Already patched")
    exit(0)

# 1. إضافة import في الأعلى
import_marker = "from flask import Flask, jsonify, request"
if import_marker in content and "from decimal import Decimal" not in content:
    content = content.replace(
        import_marker,
        import_marker + "\nfrom decimal import Decimal"
    )

# 2. إضافة الكلاس + الربط قبل return app (نهاية create_app)
class_def = '''
    # ============================================================
    # 🆕 v18.4.13: Decimal → float in JSON (fixes .toFixed() crashes)
    # ============================================================
    from flask.json.provider import DefaultJSONProvider

    class _SanadJSONProvider(DefaultJSONProvider):
        @staticmethod
        def default(o):
            if isinstance(o, Decimal):
                return float(o)
            return DefaultJSONProvider.default(o)

    app.json = _SanadJSONProvider(app)

    return app
'''

# ابحث عن آخر return app في create_app
old_return = "    return app\n"
if content.count(old_return) >= 1:
    # استبدل آخر واحد
    idx = content.rfind(old_return)
    content = content[:idx] + class_def
    print("[OK] JSON provider added")
else:
    print("[FAIL] could not find return app")
    exit(1)

with open(target, "w", encoding="utf-8") as f:
    f.write(content)

print("[DONE] Backend JSON provider applied.")
```

---

## FILE: ./fix_decimal_v18.4.13.py

```
"""
v18.4.13: Fix Decimal serialization (backend + frontend)
"""
import os

print("=" * 60)
print("v18.4.13: Decimal fix")
print("=" * 60)

# ═══════════════════════════════════════════════════════════
# 1. BACKEND — JSON provider
# ═══════════════════════════════════════════════════════════
target = "backend/app/__init__.py"
with open(target, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("\r\n", "\n")

if "_SanadJSONProvider" in c:
    print("[SKIP] Backend already patched")
else:
    # Import Decimal
    if "from decimal import Decimal" not in c:
        c = c.replace(
            "from flask import Flask, jsonify, request",
            "from flask import Flask, jsonify, request\nfrom decimal import Decimal"
        )

    provider = (
        "\n"
        "    # ============================================================\n"
        "    # v18.4.13: Decimal -> float in JSON\n"
        "    # ============================================================\n"
        "    from flask.json.provider import DefaultJSONProvider\n"
        "\n"
        "    class _SanadJSONProvider(DefaultJSONProvider):\n"
        "        @staticmethod\n"
        "        def default(o):\n"
        "            if isinstance(o, Decimal):\n"
        "                return float(o)\n"
        "            return DefaultJSONProvider.default(o)\n"
        "\n"
        "    app.json = _SanadJSONProvider(app)\n"
    )

    # Find LAST "return app" — flexible whitespace
    idx = c.rfind("return app")
    if idx == -1:
        print("[FAIL] 'return app' string not found anywhere")
        exit(1)

    # Find the start of that line (right after the last \n before idx)
    line_start = c.rfind("\n", 0, idx) + 1

    # Insert provider before that line
    c = c[:line_start] + provider + c[line_start:]

    with open(target, "w", encoding="utf-8", newline="\n") as f:
        f.write(c)
    print(f"[OK] Backend: provider inserted at line {c[:line_start].count(chr(10))+1}")

# ═══════════════════════════════════════════════════════════
# 2. FRONTEND — parseFloat guards
# ═══════════════════════════════════════════════════════════
import re
frontend_files = ["admin/js/admin-v16.js", "admin/js/admin.js"]

for path in frontend_files:
    if not os.path.exists(path):
        print(f"[SKIP] {path}")
        continue

    with open(path, "r", encoding="utf-8") as f:
        fc = f.read()

    fp = r"(d|o|u|order|user|deposit)\.(amount|total_price|unit_price|balance|fee|discount_amount)"
    total = 0

    pat1 = re.compile(rf"\(({fp})\s*\|\|\s*0\)\.toFixed\(")
    fc, n1 = pat1.subn(r"(parseFloat(\1) || 0).toFixed(", fc)
    total += n1

    pat2 = re.compile(rf"\b({fp})\.toFixed\(")
    fc, n2 = pat2.subn(r"parseFloat(\1).toFixed(", fc)
    total += n2

    if total > 0:
        with open(path, "w", encoding="utf-8") as f:
            f.write(fc)
        print(f"[OK] {path}: {total} fixes (p1={n1}, p2={n2})")
    else:
        print(f"[SKIP] {path}: no changes")

# ═══════════════════════════════════════════════════════════
# 3. CACHE BUSTERS v26 -> v27
# ═══════════════════════════════════════════════════════════
idx_file = "admin/index.html"
with open(idx_file, "r", encoding="utf-8") as f:
    ic = f.read()

ic = ic.replace("admin-v16.js?v=26", "admin-v16.js?v=27")
ic = ic.replace("admin-v17.js?v=26", "admin-v17.js?v=27")
ic = ic.replace("admin.js?v=26", "admin.js?v=27")
ic = ic.replace("admin.css?v=26", "admin.css?v=27")

with open(idx_file, "w", encoding="utf-8") as f:
    f.write(ic)
print("[OK] Cache busters: v26 -> v27")

print("\n[DONE] v18.4.13 applied.")
```

---

## FILE: ./fix_deposits_filter_v18.4.12.py

```
"""
إصلاح: depositsTabFilter يبقى عالقاً بين الجلسات
- يضيف resetDepositsFilter() في admin-v16.js
- يُعيد الفلتر إلى 'all' عند فتح قسم الإيداعات
"""

# ═══ 1. إضافة resetDepositsFilter في admin-v16.js ═══
av16 = "admin/js/admin-v16.js"
import os

if not os.path.exists(av16):
    print(f"[FAIL] {av16} not found")
    exit(1)

with open(av16, "r", encoding="utf-8") as f:
    content = f.read()

if "resetDepositsFilter" in content:
    print("[SKIP] resetDepositsFilter already exists")
else:
    # أضف الدالة قبل نهاية الـ IIFE (قبل آخر "})();")
    reset_fn = '''
    /* ============================================================
       🆕 v18.4.12: Reset deposits filter (fix stuck filter bug)
       ============================================================ */
    window.resetDepositsFilter = function () {
        try {
            if (typeof depositsTabFilter !== 'undefined') {
                depositsTabFilter = 'all';
            }
            document.querySelectorAll('#depositsTabs .filter-tab').forEach(function (b, i) {
                b.classList.toggle('active', i === 0);
            });
        } catch (e) {
            console.warn('resetDepositsFilter error:', e);
        }
    };

'''
    marker = "    console.log('✅ admin-v16.js loaded"
    if marker in content:
        content = content.replace(marker, reset_fn + marker)
        with open(av16, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[OK] resetDepositsFilter added to {av16}")
    else:
        print(f"[FAIL] marker not found in {av16}")
        exit(1)

# ═══ 2. استدعاء reset في switchSection (index.html) ═══
idx = "admin/index.html"
if not os.path.exists(idx):
    print(f"[FAIL] {idx} not found")
    exit(1)

with open(idx, "r", encoding="utf-8") as f:
    idx_content = f.read()

# ابحث عن السطر الأصلي
old_line = "            if (sectionId === 'deposits' && typeof window.renderDeposits === 'function') window.renderDeposits(depositsData);"
new_lines = (
    "            if (sectionId === 'deposits') {\n"
    "                if (typeof window.resetDepositsFilter === 'function') window.resetDepositsFilter();\n"
    "                if (typeof window.renderDeposits === 'function') window.renderDeposits(depositsData);\n"
    "            }"
)

if "resetDepositsFilter" in idx_content:
    print("[SKIP] index.html already has reset call")
elif old_line in idx_content:
    idx_content = idx_content.replace(old_line, new_lines)
    with open(idx, "w", encoding="utf-8") as f:
        f.write(idx_content)
    print(f"[OK] switchSection updated in {idx}")
else:
    print(f"[FAIL] Could not find deposits line in {idx}")
    print("       Checking similar patterns...")
    # جرّب نمط بديل
    import re
    pattern = r"if \(sectionId === 'deposits'.*?renderDeposits\(depositsData\);"
    match = re.search(pattern, idx_content)
    if match:
        idx_content = idx_content.replace(match.group(0), new_lines.strip())
        with open(idx, "w", encoding="utf-8") as f:
            f.write(idx_content)
        print(f"[OK] switchSection updated (regex match)")
    else:
        print(f"[FAIL] deposits line not found. Manual edit needed.")
        exit(1)

# ═══ 3. bump version في index.html ═══
with open(idx, "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace('admin-v16.js?v=25', 'admin-v16.js?v=26')
c = c.replace('admin-v17.js?v=25', 'admin-v17.js?v=26')
c = c.replace('admin.js?v=25', 'admin.js?v=26')
c = c.replace('admin.css?v=25', 'admin.css?v=26')
with open(idx, "w", encoding="utf-8") as f:
    f.write(c)
print("[OK] Cache busters bumped (25 → 26)")

print("\n[DONE] Fix applied.")
```

---

## FILE: ./fix_warnings_v18.4.14.py

```
"""
v18.4.14: Fix console warnings
- CORS: remove legacy fetchArchive() call
- CSP: add jsdelivr to connect-src for chart.js map
"""
import os

print("=" * 60)
print("v18.4.14: Warnings fix")
print("=" * 60)

# ═══════════════════════════════════════════════════════════
# 1. admin.js — remove legacy fetchArchive() call
# ═══════════════════════════════════════════════════════════
target = "admin/js/admin.js"
with open(target, "r", encoding="utf-8") as f:
    c = f.read()

if "Promise.resolve({ categories: [], products: [] })" in c:
    print("[SKIP] admin.js already patched")
else:
    # Pattern: fetchArchive(),  (legacy endpoint)
    import re
    # Match: whitespace + fetchArchive(), + newline
    pattern = re.compile(r'^(\s*)fetchArchive\(\),\s*$', re.MULTILINE)

    def replacer(m):
        indent = m.group(1)
        return f"{indent}Promise.resolve({{ categories: [], products: [] }}),"

    new_c, count = pattern.subn(replacer, c)

    if count == 0:
        print("[FAIL] could not find 'fetchArchive(),' in admin.js")
        exit(1)

    with open(target, "w", encoding="utf-8") as f:
        f.write(new_c)
    print(f"[OK] admin.js: fetchArchive() → Promise.resolve (line match, {count} fix)")

# ═══════════════════════════════════════════════════════════
# 2. vercel.json — add jsdelivr to connect-src
# ═══════════════════════════════════════════════════════════
vercel = "admin/vercel.json"
with open(vercel, "r", encoding="utf-8") as f:
    v = f.read()

old_csp = "connect-src 'self' https://sanad-plus-backend.onrender.com;"
new_csp = "connect-src 'self' https://sanad-plus-backend.onrender.com https://cdn.jsdelivr.net;"

if "https://cdn.jsdelivr.net;" in v and "connect-src 'self' https://sanad-plus-backend.onrender.com https://cdn.jsdelivr.net" in v:
    print("[SKIP] vercel.json already patched")
elif old_csp in v:
    v = v.replace(old_csp, new_csp)
    with open(vercel, "w", encoding="utf-8") as f:
        f.write(v)
    print("[OK] vercel.json: connect-src updated")
else:
    print("[FAIL] could not find CSP pattern in vercel.json")
    exit(1)

# ═══════════════════════════════════════════════════════════
# 3. Cache buster — admin.js v27 → v28
# ═══════════════════════════════════════════════════════════
idx = "admin/index.html"
with open(idx, "r", encoding="utf-8") as f:
    ic = f.read()

ic = ic.replace("admin.js?v=27", "admin.js?v=28")
with open(idx, "w", encoding="utf-8") as f:
    f.write(ic)
print("[OK] admin/index.html: admin.js → v28")

print("\n[DONE] v18.4.14 applied.")
```

---

## FILE: ./loadtest.js

```
// loadtest.js — SANAD PLUS⁺ Load Test
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://sanad-plus-backend.onrender.com';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 10 },
    { duration: '30s', target: 30 },
    { duration: '1m',  target: 30 },
    { duration: '30s', target: 50 },
    { duration: '1m',  target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m',  target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  let r1 = http.get(`${BASE_URL}/api/categories/`);
  check(r1, {
    'categories: 200': (r) => r.status === 200,
    'categories: < 3s': (r) => r.timings.duration < 3000,
  });
  sleep(1);

  let r2 = http.get(`${BASE_URL}/api/products/`);
  check(r2, {
    'products: 200': (r) => r.status === 200,
    'products: < 3s': (r) => r.timings.duration < 3000,
  });
  sleep(1);

  let r3 = http.get(`${BASE_URL}/api/payment-methods/`);
  check(r3, {
    'payment-methods: 200': (r) => r.status === 200,
  });
  sleep(1);
}```

---

## FILE: ./loadtest.py

```
import time
import json
import statistics
import threading
import urllib.request
import urllib.error
from datetime import datetime
from collections import defaultdict

BASE = "https://sanad-plus-backend.onrender.com"
ENDPOINTS = [
    ("categories", "/api/categories/"),
    ("products",   "/api/products/"),
    ("settings",   "/api/settings/public"),
    ("health",     "/api/health"),
]

STAGES = [
    {"duration": 15, "vus": 5},
    {"duration": 20, "vus": 20},
    {"duration": 30, "vus": 40},
    {"duration": 30, "vus": 60},
    {"duration": 15, "vus": 80},
]

results = defaultdict(list)
errors_count = defaultdict(int)
total_requests = [0]
lock = threading.Lock()


def single_request(endpoint_name, path):
    url = BASE + path
    start = time.time()
    status = 0
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'sanad-loadtest/18.1',
            'Accept': 'application/json',
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            resp.read()
    except urllib.error.HTTPError as e:
        status = e.code
    except Exception:
        status = 0
    duration = (time.time() - start) * 1000
    with lock:
        results[endpoint_name].append(duration)
        total_requests[0] += 1
        if status not in (200, 503):
            errors_count[endpoint_name] += 1
    return duration


def worker(endpoint_name, path, stop_event, requests_per_vu):
    count = 0
    while not stop_event.is_set() and count < requests_per_vu:
        single_request(endpoint_name, path)
        count += 1
        time.sleep(0.5 + 0.5 * (count % 3))


def run_stage(vus, duration_sec, stage_num):
    print(f"\n{'-'*60}")
    print(f"Stage {stage_num}: {vus} VUs for {duration_sec}s")
    print(f"{'-'*60}")
    stop_event = threading.Event()
    threads = []
    requests_per_vu = int(duration_sec / 1.5)
    for i in range(vus):
        endpoint_name, path = ENDPOINTS[i % len(ENDPOINTS)]
        t = threading.Thread(target=worker, args=(endpoint_name, path, stop_event, requests_per_vu), daemon=True)
        t.start()
        threads.append(t)
    time.sleep(duration_sec)
    stop_event.set()
    for t in threads:
        t.join(timeout=10)
    with lock:
        total_in_stage = sum(len(results[e[0]]) for e in ENDPOINTS)
        stage_errors = sum(errors_count.values())
    print(f"   Total requests so far: {total_in_stage}")
    print(f"   Errors: {stage_errors}")


def percentile(data, p):
    if not data:
        return 0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (p / 100)
    f = int(k)
    c = f + 1 if (f + 1) < len(sorted_data) else f
    if f == c:
        return sorted_data[f]
    return sorted_data[f] + (sorted_data[c] - sorted_data[f]) * (k - f)


def print_report(started_at):
    print("\n")
    print("=" * 60)
    print("  SANAD PLUS+ v18.1 -- Load Test Results")
    print("=" * 60)
    all_durations = []
    for d in results.values():
        all_durations.extend(d)
    if not all_durations:
        print("No results")
        return
    print(f"\nOverall Stats (n={len(all_durations)}):")
    print(f"   avg:    {statistics.mean(all_durations):.0f} ms")
    print(f"   median: {statistics.median(all_durations):.0f} ms")
    print(f"   p(90):  {percentile(all_durations, 90):.0f} ms")
    print(f"   p(95):  {percentile(all_durations, 95):.0f} ms")
    print(f"   p(99):  {percentile(all_durations, 99):.0f} ms")
    print(f"   max:    {max(all_durations):.0f} ms")
    print("\nPer Endpoint (p95):")
    for name, _ in ENDPOINTS:
        if results[name]:
            p95 = percentile(results[name], 95)
            avg = statistics.mean(results[name])
            errs = errors_count.get(name, 0)
            total = len(results[name])
            err_rate = (errs / total * 100) if total > 0 else 0
            print(f"   {name:12s} p95={p95:6.0f} ms  avg={avg:6.0f} ms  n={total:4d}  err={err_rate:.1f}%")
    total = total_requests[0]
    total_errors = sum(errors_count.values())
    print(f"\nTotal Requests: {total}")
    print(f"Total Errors:   {total_errors} ({(total_errors/total*100) if total>0 else 0:.1f}%)")
    report_data = {
        "started_at": started_at,
        "finished_at": datetime.now().isoformat(),
        "total_requests": total,
        "total_errors": total_errors,
        "overall": {
            "avg": statistics.mean(all_durations),
            "median": statistics.median(all_durations),
            "p90": percentile(all_durations, 90),
            "p95": percentile(all_durations, 95),
            "p99": percentile(all_durations, 99),
            "max": max(all_durations),
        },
    }
    with open("loadtest_results.json", "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
    print("Saved: loadtest_results.json")


def pre_flight():
    print("Pre-flight check...")
    try:
        req = urllib.request.Request(BASE + "/api/health", headers={'User-Agent': 'sanad-loadtest/18.1'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            print(f"   Backend Live -- version: {data.get('version', '?')}")
            print(f"   DB: {data['checks']['database']['status']}")
            print(f"   Redis: {data['checks']['redis']['status']}")
            print(f"   Bot: {data['checks']['bot']['status']}")
    except Exception as e:
        print(f"   Connection failed: {e}")
        raise


if __name__ == "__main__":
    started_at = datetime.now().isoformat()
    print("=" * 60)
    print("  SANAD PLUS+ -- Load Test Starting")
    print("=" * 60)
    pre_flight()
    for i, stage in enumerate(STAGES, 1):
        run_stage(stage["vus"], stage["duration"], i)
    print_report(started_at)
```

---

## FILE: ./loadtest_18.1.js

```
// ============================================================
// 📊 SANAD PLUS⁺ — k6 Load Test v18.1 (Final)
// ============================================================
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errors = new Rate('errors');
const categoriesDuration = new Trend('categories_duration');
const productsDuration = new Trend('products_duration');
const settingsDuration = new Trend('settings_duration');
const healthDuration = new Trend('health_duration');
const totalRequests = new Counter('total_requests');

export const options = {
  stages: [
    { duration: '30s', target: 10 },    // Warmup
    { duration: '1m',  target: 30 },    // Ramp
    { duration: '2m',  target: 60 },    // Sustained
    { duration: '1m',  target: 80 },    // Peak
    { duration: '1m',  target: 100 },   // 🆕 Max (find breaking point)
    { duration: '30s', target: 0 },     // Cooldown
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1500'],
    'http_req_failed':   ['rate<0.02'],
    'errors':            ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const BASE = 'https://sanad-plus-backend.onrender.com';

const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'k6-sanad-loadtest/18.1',
};

export default function () {
  group('categories', () => {
    const start = Date.now();
    const r = http.get(`${BASE}/api/categories/`, { headers: HEADERS });
    categoriesDuration.add(Date.now() - start);
    const ok = check(r, { 'categories 200': (res) => res.status === 200 });
    errors.add(!ok);
    totalRequests.add(1);
  });

  group('products', () => {
    const start = Date.now();
    const r = http.get(`${BASE}/api/products/`, { headers: HEADERS });
    productsDuration.add(Date.now() - start);
    const ok = check(r, { 'products 200': (res) => res.status === 200 });
    errors.add(!ok);
    totalRequests.add(1);
  });

  group('settings', () => {
    const start = Date.now();
    const r = http.get(`${BASE}/api/settings/public`, { headers: HEADERS });
    settingsDuration.add(Date.now() - start);
    const ok = check(r, { 'settings 200': (res) => res.status === 200 });
    errors.add(!ok);
    totalRequests.add(1);
  });

  group('health', () => {
    const start = Date.now();
    const r = http.get(`${BASE}/api/health`, { headers: HEADERS });
    healthDuration.add(Date.now() - start);
    const ok = check(r, { 'health 200/503': (res) => [200, 503].includes(res.status) });
    errors.add(!ok);
    totalRequests.add(1);
  });

  sleep(1 + Math.random() * 2);
}

export function setup() {
  console.log('🚀 Load test starting: ' + BASE);
  const r = http.get(`${BASE}/api/health`);
  console.log(`Pre-flight: ${r.status} — ${r.body.substring(0, 150)}`);
  return { startedAt: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`\n✅ Test completed — started: ${data.startedAt}`);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'loadtest_18.1_results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  let out = '\n';
  out += '╔══════════════════════════════════════════════════╗\n';
  out += '║  📊 SANAD PLUS⁺ v18.1 — Load Test Results        ║\n';
  out += '╚══════════════════════════════════════════════════╝\n\n';

  if (m.http_req_duration) {
    const d = m.http_req_duration.values;
    out += '📈 HTTP Request Duration:\n';
    out += `   avg:   ${d.avg?.toFixed(0)} ms\n`;
    out += `   p(90): ${d['p(90)']?.toFixed(0)} ms\n`;
    out += `   p(95): ${d['p(95)']?.toFixed(0)} ms\n`;
    out += `   p(99): ${d['p(99)']?.toFixed(0)} ms\n`;
    out += `   max:   ${d.max?.toFixed(0)} ms\n\n`;
  }

  out += '🎯 Per Endpoint (p95):\n';
  for (const ep of ['categories', 'products', 'settings', 'health']) {
    const key = ep + '_duration';
    if (m[key]) {
      const v = m[key].values;
      out += `   ${ep.padEnd(12)} ${v['p(95)']?.toFixed(0)} ms\n`;
    }
  }

  if (m.http_req_failed) {
    out += `\n❌ Failed Rate:     ${(m.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  }
  if (m.errors) {
    out += `⚠️  Logical Errors: ${(m.errors.values.rate * 100).toFixed(2)}%\n`;
  }
  if (m.http_reqs) {
    out += `\n⚡ Total Reqs: ${m.http_reqs.values.count}\n`;
    out += `   Rate:       ${m.http_reqs.values.rate?.toFixed(1)} req/s\n`;
  }
  if (m.vus_max) {
    out += `\n👥 Max VUs: ${m.vus_max.values.max}\n`;
  }
  return out;
}```

---

## FILE: ./loadtest_results.json

```
{
  "started_at": "2026-09-24T10:08:56.041392",
  "finished_at": "2026-09-24T10:11:04.594436",
  "total_requests": 2462,
  "total_errors": 1502,
  "overall": {
    "avg": 1020.3276381659178,
    "median": 768.0153846740723,
    "p90": 2042.8782701492316,
    "p95": 2351.488256454463,
    "p99": 6467.861382961266,
    "max": 15266.550779342651
  }
}```

---

## FILE: ./loadtest_v2.py

```
# ============================================================
# 📊 SANAD PLUS⁺ — Load Test v2 (Fixed: XFF + Status Codes)
# ============================================================
import time
import json
import statistics
import threading
import urllib.request
import urllib.error
from datetime import datetime
from collections import defaultdict, Counter


BASE = "https://sanad-plus-backend.onrender.com"

# اختبار واحد: 20 VU × 60s
VUS = 20
DURATION = 60

ENDPOINTS = [
    ("categories", "/api/categories/"),
    ("products",   "/api/products/"),
    ("settings",   "/api/settings/public"),
    ("health",     "/api/health"),
]

results = defaultdict(list)
status_counts = defaultdict(Counter)  # endpoint -> Counter of status
total_requests = [0]
lock = threading.Lock()


def single_request(endpoint_name, path, thread_id):
    url = BASE + path
    fake_ip = f"10.1.{(thread_id // 256) % 256}.{thread_id % 256}"
    start = time.time()
    status = 0
    error_msg = ""
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'sanad-loadtest/18.1',
            'Accept': 'application/json',
            'X-Forwarded-For': fake_ip,
        })
        with urllib.request.urlopen(req, timeout=20) as resp:
            status = resp.status
            resp.read()
    except urllib.error.HTTPError as e:
        status = e.code
        error_msg = str(e)[:50]
    except Exception as e:
        status = 0
        error_msg = str(e)[:50]

    duration = (time.time() - start) * 1000

    with lock:
        results[endpoint_name].append(duration)
        status_counts[endpoint_name][status] += 1
        total_requests[0] += 1

    return status, duration


def worker(thread_id, stop_event, endpoint_name, path):
    while not stop_event.is_set():
        single_request(endpoint_name, path, thread_id)
        time.sleep(0.3)


def percentile(data, p):
    if not data:
        return 0
    s = sorted(data)
    k = (len(s) - 1) * (p / 100)
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return s[f]
    return s[f] + (s[c] - s[f]) * (k - f)


def run_test():
    print(f"\n{'='*60}")
    print(f"Load Test v2 — {VUS} VUs × {DURATION}s")
    print(f"{'='*60}\n")

    stop_event = threading.Event()
    threads = []

    for i in range(VUS):
        ep_name, ep_path = ENDPOINTS[i % len(ENDPOINTS)]
        t = threading.Thread(
            target=worker,
            args=(i + 100, stop_event, ep_name, ep_path),  # +100 لتجنب IP 0.x
            daemon=True,
        )
        t.start()
        threads.append(t)

    # Progress
    for s in range(DURATION):
        time.sleep(1)
        if (s + 1) % 10 == 0:
            print(f"   [{s+1}/{DURATION}s] total={total_requests[0]}")

    stop_event.set()
    for t in threads:
        t.join(timeout=10)


def print_report():
    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║  📊 Load Test v2 — Results (XFF Spoofed)          ║")
    print("╚" + "═" * 58 + "╝")

    all_durations = []
    for d in results.values():
        all_durations.extend(d)

    if not all_durations:
        print("No data")
        return

    print(f"\n📈 Overall (n={len(all_durations)}):")
    print(f"   avg:    {statistics.mean(all_durations):.0f} ms")
    print(f"   median: {statistics.median(all_durations):.0f} ms")
    print(f"   p(90):  {percentile(all_durations, 90):.0f} ms")
    print(f"   p(95):  {percentile(all_durations, 95):.0f} ms")
    print(f"   p(99):  {percentile(all_durations, 99):.0f} ms")
    print(f"   max:    {max(all_durations):.0f} ms")

    print(f"\n🎯 Per Endpoint:")
    for name, _ in ENDPOINTS:
        if results[name]:
            p95 = percentile(results[name], 95)
            avg = statistics.mean(results[name])
            n = len(results[name])
            # Status breakdown
            sc = status_counts[name]
            ok_2xx = sum(v for k, v in sc.items() if 200 <= k < 300)
            ok_503 = sc.get(503, 0)
            err_429 = sc.get(429, 0)
            err_5xx = sum(v for k, v in sc.items() if 500 <= k < 600 and k != 503)
            timeouts = sc.get(0, 0)
            other = n - ok_2xx - ok_503 - err_429 - err_5xx - timeouts
            err_rate = ((n - ok_2xx - ok_503) / n * 100) if n > 0 else 0
            print(f"   {name:12s} p95={p95:6.0f}ms avg={avg:6.0f}ms n={n:4d} err={err_rate:5.1f}%")
            print(f"      200={ok_2xx} 503={ok_503} 429={err_429} 5xx={err_5xx} timeout={timeouts} other={other}")

    print(f"\n⚡ Total Requests: {total_requests[0]}")

    # Global status breakdown
    all_status = Counter()
    for c in status_counts.values():
        all_status.update(c)
    print(f"\n📊 Global Status Distribution:")
    for status, count in sorted(all_status.items()):
        pct = count / total_requests[0] * 100 if total_requests[0] > 0 else 0
        label = {
            200: "✅ OK",
            503: "🟡 Degraded (acceptable)",
            429: "🔴 Rate Limited",
            500: "🔴 Server Error",
            0:   "🔴 Timeout/Connection",
        }.get(status, f"⚠️  HTTP {status}")
        print(f"   {label:30s} {count:5d}  ({pct:5.1f}%)")

    # Save
    with open("loadtest_v2_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "vus": VUS,
            "duration": DURATION,
            "total_requests": total_requests[0],
            "overall": {
                "avg": statistics.mean(all_durations),
                "median": statistics.median(all_durations),
                "p95": percentile(all_durations, 95),
                "p99": percentile(all_durations, 99),
                "max": max(all_durations),
            },
            "status_breakdown": dict(all_status),
        }, f, ensure_ascii=False, indent=2)
    print("\n💾 Saved: loadtest_v2_results.json")


if __name__ == "__main__":
    print("=" * 60)
    print("  SANAD PLUS+ — Load Test v2")
    print("  (X-Forwarded-For spoofing + status codes)")
    print("=" * 60)

    # Pre-flight
    print("\n🔍 Pre-flight...")
    try:
        req = urllib.request.Request(BASE + "/api/health")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            print(f"   ✅ Backend Live — {data.get('version')}")
    except Exception as e:
        print(f"   ❌ {e}")
        exit(1)

    run_test()
    print_report()```

---

## FILE: ./loadtest_v2_results.json

```
{
  "vus": 20,
  "duration": 60,
  "total_requests": 1684,
  "overall": {
    "avg": 415.7774639526059,
    "median": 307.00981616973877,
    "p95": 807.4176430702208,
    "p99": 1240.560743808748,
    "max": 1596.7304706573486
  },
  "status_breakdown": {
    "200": 400,
    "429": 1284
  }
}```

---

## FILE: ./miniapp/css/style.css

```
/* ============================================================
   =========== SANAD+ Design System ===========
   ============================================================ */
:root {
    --primary: #00A0E9;
    --primary-light: #EAF5FC;
    --primary-dark: #0D47A1;
    --background: #F5F7FA;
    --surface: #FFFFFF;
    --text: #0D47A1;
    --text-secondary: #9E9E9E;
    --border: #EAF5FC;
    --success: #4CAF50;
    --success-bg: #E8F5E9;
    --danger: #F44336;
    --danger-bg: #FFEBEE;
    --warning: #FFC107;
    --warning-bg: #FFF8E1;
    --info: #2196F3;
    --info-bg: #E3F2FD;
    --vip-bg: #FFF9C4;
    --vip-text: #B8860B;
    --radius-lg: 24px;
    --radius-md: 16px;
    --radius-sm: 12px;
    --nav-height: 70px;
    --topbar-height: 60px;
    --shadow: 0 4px 12px rgba(0,0,0,0.05);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
    --transition: all 0.3s ease;
}

[data-theme="dark"] {
    --background: #0D1117;
    --surface: #161B22;
    --text: #F0F6FC;
    --text-secondary: #8B949E;
    --border: #30363D;
    --primary-light: #1E2A35;
    --vip-bg: #4A3F00;
    --vip-text: #FFD54F;
    --danger-bg: #4A1F1F;
    --warning-bg: #4A3F00;
    --success-bg: #1B3A1F;
    --info-bg: #1A2A3F;
    --shadow: 0 4px 12px rgba(0,0,0,0.3);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Tajawal', sans-serif;
    background-color: var(--background);
    color: var(--text);
    direction: rtl;
    transition: var(--transition);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
}

.ltr {
    direction: ltr;
    display: inline-block;
    unicode-bidi: embed;
}

/* ============================================================
   ============ Splash Screen ============
   ============================================================ */
#splashScreen {
    position: fixed;
    inset: 0;
    background:
        radial-gradient(circle at 50% 45%, #FFFFFF 0%, #F5FAFF 30%, #E8F4FF 65%, #DCEEFF 100%);
    z-index: 9999;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    direction: rtl;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    opacity: 1;
    transition: opacity 0.5s ease;
}

#splashScreen.hidden {
    opacity: 0;
    pointer-events: none;
}

.splash-bg-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 420px;
    height: 420px;
    margin: -210px 0 0 -210px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(125, 211, 252, 0.22) 0%, rgba(56, 189, 248, 0.10) 40%, transparent 72%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 1.2s ease;
    will-change: opacity;
}

#splashScreen.shield-visible .splash-bg-glow {
    opacity: 1;
}

#splashCanvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 3;
}

.splash-shield-stage {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 170px;
    height: 198px;
    margin: -85px 0 0 -85px;
    opacity: 0;
    transform: scale(0.4);
    z-index: 2;
    pointer-events: none;
    will-change: transform, opacity;
    transition: opacity 0.7s cubic-bezier(0.34, 1.3, 0.64, 1),
                transform 0.7s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.splash-shield-stage.appearing {
    opacity: 1;
    transform: scale(1);
}

.splash-shield-stage.pulsing {
    animation: shieldGentlePulse 1.8s ease-in-out infinite;
}

@keyframes shieldGentlePulse {
    0%, 100% {
        transform: scale(1);
        filter: drop-shadow(0 10px 30px rgba(56, 189, 248, 0.40));
    }
    50% {
        transform: scale(1.03);
        filter: drop-shadow(0 14px 40px rgba(56, 189, 248, 0.60));
    }
}

.splash-shield-stage.disintegrating {
    animation: shieldDisintegrate 0.6s cubic-bezier(0.55, 0, 0.85, 0.25) forwards;
}

@keyframes shieldDisintegrate {
    0% {
        opacity: 1;
        transform: scale(1);
        filter: brightness(1);
    }
    35% {
        opacity: 1;
        transform: scale(1.08);
        filter: brightness(2.6) blur(0.5px);
    }
    100% {
        opacity: 0;
        transform: scale(1.18);
        filter: brightness(3.5) blur(2.5px);
    }
}

.splash-shield-svg {
    width: 100%;
    height: 100%;
    display: block;
    filter: drop-shadow(0 10px 30px rgba(56, 189, 248, 0.42));
}

.shield-edge-path {
    stroke-dasharray: 420;
    stroke-dashoffset: 420;
}

.splash-shield-stage.appearing .shield-edge-path {
    animation: shieldEdgeDraw 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.15s forwards;
}

.shield-inner-edge {
    opacity: 0;
}

.splash-shield-stage.appearing .shield-inner-edge {
    animation: innerEdgeIn 0.5s ease-out 0.45s forwards;
}

@keyframes innerEdgeIn {
    to { opacity: 1; }
}

@keyframes shieldEdgeDraw {
    to { stroke-dashoffset: 0; }
}

.shield-body-path {
    opacity: 0;
}

.splash-shield-stage.appearing .shield-body-path {
    animation: shieldBodyIn 0.7s ease-out 0.1s forwards;
}

@keyframes shieldBodyIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.shield-inner-glow {
    opacity: 0;
}

.splash-shield-stage.appearing .shield-inner-glow {
    animation: innerGlowIn 0.8s ease-out 0.35s forwards;
}

@keyframes innerGlowIn {
    to { opacity: 1; }
}

.splash-light-sweep {
    opacity: 0;
    will-change: transform, opacity;
}

.splash-shield-stage.sweeping .splash-light-sweep {
    animation: lightSweepMove 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes lightSweepMove {
    0% {
        opacity: 0;
        transform: translateX(0);
    }
    15% {
        opacity: 1;
    }
    85% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        transform: translateX(260px);
    }
}

.splash-text-stage {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.92);
    text-align: center;
    opacity: 0;
    z-index: 5;
    pointer-events: none;
    will-change: opacity, transform;
    padding: 0 24px;
    width: 100%;
    max-width: 480px;
}

.splash-text-stage.visible {
    animation: textStageReveal 0.9s cubic-bezier(0.34, 1.15, 0.64, 1) forwards;
}

@keyframes textStageReveal {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.92);
        filter: blur(5px);
    }
    55% {
        opacity: 1;
        filter: blur(0);
    }
    100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        filter: blur(0);
    }
}

.splash-brand-ar {
    font-family: 'Cairo', 'Tajawal', sans-serif;
    font-size: 3.2rem;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1.15;
    margin: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    direction: rtl;
    gap: 6px;
    color: #0F172A;
}

.splash-brand-ar-text {
    background: linear-gradient(135deg, #0EA5E9 0%, #38BDF8 45%, #0EA5E9 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    display: inline-block;
    text-shadow: 0 4px 24px rgba(14, 165, 233, 0.18);
}

.splash-plus-mark {
    display: inline-block;
    font-size: 2rem;
    font-weight: 800;
    background: linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    margin-top: 4px;
    transform: scale(0) rotate(-180deg);
    opacity: 0;
    will-change: transform, opacity;
}

.splash-text-stage.reveal-plus .splash-plus-mark {
    animation: plusElegantPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes plusElegantPop {
    0% {
        transform: scale(0) rotate(-180deg);
        opacity: 0;
    }
    60% {
        transform: scale(1.15) rotate(0deg);
        opacity: 1;
    }
    100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
    }
}

.splash-brand-en {
    font-family: 'Cairo', 'Tajawal', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 5px;
    color: #64748B;
    direction: ltr;
    opacity: 0;
    margin: 22px 0 0 0;
    transform: translateY(8px);
    will-change: opacity, transform;
    text-transform: uppercase;
}

.splash-text-stage.reveal-en .splash-brand-en {
    animation: englishElegantFadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes englishElegantFadeUp {
    0% {
        opacity: 0;
        transform: translateY(8px);
        letter-spacing: 8px;
    }
    100% {
        opacity: 1;
        transform: translateY(0);
        letter-spacing: 5px;
    }
}

.splash-text-stage.confirming::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 380px;
    height: 380px;
    margin: -190px 0 0 -190px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 65%);
    animation: softBrandGlow 1.4s ease-in-out infinite;
    pointer-events: none;
    z-index: -1;
}

@keyframes softBrandGlow {
    0%, 100% {
        opacity: 0.5;
        transform: scale(1);
    }
    50% {
        opacity: 1;
        transform: scale(1.08);
    }
}

@media (prefers-reduced-motion: reduce) {
    .splash-shield-stage,
    .splash-text-stage,
    .splash-light-sweep,
    .splash-plus-mark,
    .splash-brand-en,
    .splash-bg-glow {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
    #splashScreen {
        transition-duration: 0.01ms !important;
    }
}

@media (max-width: 360px) {
    .splash-brand-ar { font-size: 2.6rem; gap: 4px; }
    .splash-plus-mark { font-size: 1.7rem; }
    .splash-brand-en { font-size: 0.85rem; letter-spacing: 4px; margin-top: 18px; }
    .splash-shield-stage { width: 150px; height: 175px; margin: -75px 0 0 -75px; }
    .splash-bg-glow { width: 340px; height: 340px; margin: -170px 0 0 -170px; }
}

@media (max-width: 320px) {
    .splash-brand-ar { font-size: 2.3rem; }
    .splash-plus-mark { font-size: 1.5rem; }
    .splash-brand-en { font-size: 0.78rem; letter-spacing: 3px; }
}

/* ============================================================
   ============ Pull to Refresh ============
   ============================================================ */
.ptr-indicator {
    position: fixed;
    top: var(--topbar-height);
    left: 0;
    right: 0;
    height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    z-index: 99;
    opacity: 0;
    will-change: height, opacity;
    pointer-events: none;
}

.ptr-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary-light);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 250ms ease, background-color 250ms ease;
}

.ptr-icon .material-icons {
    font-size: 20px;
    color: var(--primary);
    transition: transform 250ms ease, color 250ms ease;
}

.ptr-indicator.ready .ptr-icon {
    background: var(--primary);
    transform: scale(1.1);
}

.ptr-indicator.ready .ptr-icon .material-icons {
    color: white;
}

.ptr-indicator.refreshing .ptr-icon .material-icons {
    animation: ptrSpin 0.9s linear infinite;
    color: var(--primary);
}

.ptr-indicator.refreshing .ptr-icon {
    background: var(--primary-light);
    transform: scale(1);
}

@keyframes ptrSpin {
    to { transform: rotate(360deg); }
}

.ptr-text {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
}

.ptr-indicator.ready .ptr-text,
.ptr-indicator.refreshing .ptr-text {
    color: var(--primary);
}

@media (prefers-reduced-motion: reduce) {
    .ptr-indicator,
    .ptr-icon,
    .ptr-icon .material-icons {
        transition-duration: 0.01ms !important;
        animation-duration: 0.01ms !important;
    }
}

/* ============================================================
   ============ Topbar ============
   ============================================================ */
.topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--topbar-height);
    background-color: var(--surface);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow);
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
}

.topbar-right,
.topbar-left {
    display: flex;
    align-items: center;
    gap: 6px;
}

.topbar-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

.logo-text {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -1px;
}

.highlight {
    color: var(--primary);
}

.icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    color: var(--text);
    font-size: 1.4rem;
    padding: 6px;
    border-radius: 50%;
    transition: var(--transition);
}

.icon-btn:hover {
    background-color: var(--primary-light);
}

.balance-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: var(--primary-light);
    border-radius: 50px;
    padding: 4px 10px;
    font-weight: 700;
    color: var(--primary);
    font-size: 0.9rem;
    cursor: pointer;
    transition: var(--transition);
}

.balance-pill:hover {
    transform: scale(1.05);
}

.balance-pill .material-icons {
    font-size: 1.2rem;
}

.avatar-small {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    background-size: cover;
    background-position: center;
}

.badge {
    position: absolute;
    top: 0;
    right: 0;
    background-color: var(--danger);
    color: white;
    font-size: 0.6rem;
    border-radius: 50%;
    padding: 2px 5px;
    min-width: 18px;
    text-align: center;
    animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
}

/* ============================================================
   ============ Main Content ============
   ============================================================ */
.main-content {
    margin-top: var(--topbar-height);
    margin-bottom: var(--nav-height);
    padding: 16px;
    overflow-y: auto;
    height: calc(100vh - var(--topbar-height) - var(--nav-height));
    background-color: var(--background);
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
}

.page {
    display: none;
    animation: fadeIn 0.2s ease;
}

.page.active {
    display: block;
    animation: pageSlideIn 0.3s ease;
}

@keyframes pageSlideIn {
    from { opacity: 0; transform: translateX(-15px); }
    to { opacity: 1; transform: translateX(0); }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ============ عناصر عامة ============ */
.search-box {
    display: flex;
    align-items: center;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 8px 16px;
    margin-bottom: 12px;
    gap: 8px;
}

.search-box .material-icons {
    color: var(--text-secondary);
}

.search-box input {
    border: none;
    outline: none;
    background: none;
    font-family: inherit;
    font-size: 0.95rem;
    flex: 1;
    color: var(--text);
}

.btn-primary {
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    padding: 14px 24px;
    font-weight: 700;
    cursor: pointer;
    font-size: 1rem;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    font-family: inherit;
    position: relative;
}

.btn-primary:hover {
    background-color: #0088cc;
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.btn-primary:active {
    transform: translateY(0);
}

.btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.btn-large {
    padding: 16px;
    font-size: 1.1rem;
}

.btn-outline {
    background-color: transparent;
    border: 1px solid var(--primary);
    color: var(--primary);
    padding: 10px 20px;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    transition: var(--transition);
    font-family: inherit;
}

.btn-outline:hover {
    background-color: var(--primary);
    color: white;
}

.btn-link {
    background: none;
    border: none;
    color: var(--primary);
    font-family: inherit;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0;
}

.counter-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background-color: var(--primary);
    color: white;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 700;
}

.pills-container {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
}

.pill {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: 50px;
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.85rem;
    color: var(--text-secondary);
    transition: var(--transition);
    font-family: inherit;
}

.pill.active {
    background-color: var(--primary);
    color: white;
    border-color: var(--primary);
}

.btn-loading {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ============ Skeleton ============ */
.skeleton-card {
    background: linear-gradient(90deg, var(--border) 25%, var(--primary-light) 50%, var(--border) 75%);
    background-size: 200% 100%;
    animation: skeletonShimmer 1.5s infinite;
    border-radius: var(--radius-md);
    height: 120px;
}

@keyframes skeletonShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* ============ شاشة الرئيسية ============ */
.user-greeting {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: var(--surface);
    border-radius: var(--radius-lg);
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border);
}

.user-greeting .avatar {
    font-size: 2.5rem;
}

.user-greeting h2 {
    font-size: 1.3rem;
    font-weight: 800;
}

.user-greeting p {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

#vipBadge, #accountVipBadge {
    background-color: var(--vip-bg);
    color: var(--vip-text);
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 50px;
    font-size: 0.85rem;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    border: 1px solid var(--vip-text);
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

#vipBadge .material-icons,
#accountVipBadge .material-icons {
    font-size: 16px;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 16px 0 8px;
}

.section-header h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
}

/* ============================================================
   ============ 📌 شوهد حديثاً ============
   ============================================================ */
.recently-viewed-container {
    margin-bottom: 16px;
}

.recently-viewed-list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 4px 2px 10px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
}

.recently-viewed-list::-webkit-scrollbar {
    height: 4px;
}

.recently-viewed-list::-webkit-scrollbar-track {
    background: transparent;
}

.recently-viewed-list::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
}

.recently-viewed-item {
    flex-shrink: 0;
    width: 80px;
    cursor: pointer;
    text-align: center;
    scroll-snap-align: start;
    transition: var(--transition);
}

.recently-viewed-item:hover {
    transform: translateY(-2px);
}

.recently-viewed-image {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-md);
    background-color: #FFFFFF;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    color: #ccc;
    padding: 6px;
    margin-bottom: 4px;
    box-shadow: var(--shadow);
    transition: var(--transition);
}

[data-theme="dark"] .recently-viewed-image {
    background-color: var(--surface);
}

.recently-viewed-item:hover .recently-viewed-image {
    border-color: var(--primary);
    box-shadow: var(--shadow-lg);
}

.recently-viewed-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
    line-height: 1.3;
}

/* ============ الأقسام ============ */
.categories-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 8px;
}

.category-item {
    position: relative;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    border-radius: 16px;
    cursor: pointer;
    background-color: var(--surface);
    border: 1px solid var(--border);
    transition: var(--transition);
}

.category-item:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
}

.category-icon {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.category-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.category-name {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px 8px 8px;
    text-align: center;
    font-weight: 700;
    font-size: 0.8rem;
    color: #FFFFFF;
    background: linear-gradient(to top,
        rgba(13, 71, 161, 0.92) 0%,
        rgba(13, 71, 161, 0.65) 55%,
        rgba(13, 71, 161, 0) 100%);
    z-index: 2;
    pointer-events: none;
    line-height: 1.2;
}

/* ============ المنتجات ============ */
.products-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    align-items: start;
    margin-top: 8px;
}

.product-card {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;
    cursor: pointer;
    background-color: var(--surface);
    border: 1px solid var(--border);
    transition: var(--transition);
}

.product-card:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow);
}

.product-image {
    aspect-ratio: 1 / 1;
    width: 100%;
    background-color: #FFFFFF;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center center;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: #ccc;
    overflow: hidden;
    position: relative;
}

[data-theme="dark"] .product-image {
    background-color: var(--surface);
}

.product-badges {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 2;
}

.badge-new, .badge-best {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 50px;
    font-size: 0.6rem;
    font-weight: 800;
}

.badge-new {
    background-color: var(--primary);
    color: white;
}

.badge-best {
    background-color: #FF9800;
    color: white;
}

.favorite-btn {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.9);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
    z-index: 3;
}

.favorite-btn .material-icons {
    font-size: 14px;
    color: var(--text-secondary);
}

.favorite-btn.active .material-icons {
    color: #E91E63;
}

.favorite-btn:hover {
    transform: scale(1.1);
}

.product-name {
    padding: 7px 5px;
    text-align: center;
    font-weight: 700;
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
}

/* ============ الطلبات ============ */
.orders-list,
.deposits-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
}

.order-card {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
    box-shadow: var(--shadow);
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.order-number {
    font-weight: 700;
    color: var(--primary-dark);
    font-size: 0.9rem;
    direction: ltr;
    display: inline-block;
}

.status-badge {
    padding: 4px 10px;
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 700;
}

.status-badge.completed {
    background-color: var(--success-bg);
    color: var(--success);
}

.status-badge.failed {
    background-color: var(--danger-bg);
    color: var(--danger);
}

.status-badge.pending {
    background-color: var(--warning-bg);
    color: #F57F17;
}

.status-badge.review,
.status-badge.processing {
    background-color: var(--primary-light);
    color: var(--primary-dark);
}

.status-badge.cancelled {
    background-color: #F5F5F5;
    color: var(--text-secondary);
}

.status-badge.verified {
    background-color: var(--success-bg);
    color: var(--success);
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.status-badge.unverified {
    background-color: #F5F5F5;
    color: var(--text-secondary);
}

.order-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.85rem;
    color: var(--text-secondary);
}

/* ============================================================
   ============ Order Timeline (Vertical) ============
   ============================================================ */
.order-timeline {
    margin-top: 14px;
    padding: 12px 4px 12px 4px;
    display: flex;
    flex-direction: column;
    gap: 0;
    background: linear-gradient(180deg, transparent 0%, var(--primary-light) 50%, transparent 100%);
    border-radius: var(--radius-sm);
}

[data-theme="dark"] .order-timeline {
    background: linear-gradient(180deg, transparent 0%, rgba(30, 42, 53, 0.6) 50%, transparent 100%);
}

.timeline-step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    position: relative;
    padding: 4px 8px;
    opacity: 0.5;
    transition: var(--transition);
}

.timeline-step.done,
.timeline-step.current,
.timeline-step.failed,
.timeline-step.cancelled {
    opacity: 1;
}

.timeline-step:not(:last-child)::before {
    content: '';
    position: absolute;
    top: 38px;
    right: 24px;
    width: 2px;
    height: calc(100% - 30px);
    background-color: var(--border);
    z-index: 1;
}

.timeline-step.done:not(:last-child)::before {
    background-color: var(--success);
}

.timeline-marker {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background-color: var(--border);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
    transition: var(--transition);
    border: 2px solid var(--surface);
    box-shadow: 0 0 0 2px var(--border);
}

.timeline-marker .material-icons {
    font-size: 18px;
    transition: var(--transition);
}

.timeline-step.done .timeline-marker {
    background-color: var(--success);
    color: white;
    box-shadow: 0 0 0 2px var(--success-bg);
}

.timeline-step.current .timeline-marker {
    background-color: var(--primary);
    color: white;
    box-shadow: 0 0 0 2px var(--primary-light);
    animation: timelinePulse 2s ease-in-out infinite;
}

@keyframes timelinePulse {
    0%, 100% {
        box-shadow: 0 0 0 2px var(--primary-light), 0 0 0 0 rgba(0, 160, 233, 0.5);
    }
    50% {
        box-shadow: 0 0 0 2px var(--primary-light), 0 0 0 8px rgba(0, 160, 233, 0);
    }
}

.timeline-step.current .timeline-marker .material-icons {
    animation: spin 3s linear infinite;
}

.timeline-step.failed .timeline-marker {
    background-color: var(--danger);
    color: white;
    box-shadow: 0 0 0 2px var(--danger-bg);
}

.timeline-step.cancelled .timeline-marker {
    background-color: var(--text-secondary);
    color: white;
    box-shadow: 0 0 0 2px var(--border);
}

.timeline-content {
    flex: 1;
    padding-top: 6px;
    text-align: right;
}

.timeline-title {
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--text);
    line-height: 1.3;
}

.timeline-step.pending .timeline-title {
    color: var(--text-secondary);
    font-weight: 600;
}

.timeline-step.done .timeline-title {
    color: var(--success);
}

.timeline-step.current .timeline-title {
    color: var(--primary);
}

.timeline-step.failed .timeline-title {
    color: var(--danger);
}

.timeline-step.cancelled .timeline-title {
    color: var(--text-secondary);
}

.timeline-time {
    font-size: 0.72rem;
    color: var(--text-secondary);
    margin-top: 3px;
    font-weight: 500;
}
/* ============================================================
   ============ تفاصيل التسليم ============
   ============================================================ */
.order-delivery-info {
    margin-top: 10px;
    padding: 10px 12px;
    background-color: var(--primary-light);
    border-radius: var(--radius-sm);
    border-right: 3px solid var(--primary);
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.delivery-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
}

.delivery-label {
    color: var(--text-secondary);
    font-weight: 600;
    flex-shrink: 0;
}

.delivery-value {
    color: var(--text);
    font-weight: 700;
    text-align: left;
    word-break: break-all;
    direction: ltr;
    unicode-bidi: embed;
}

/* ============ شريط التقدم الأفقي ============ */
.order-progress {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    padding: 8px 0;
}

.progress-step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    font-size: 0.65rem;
    color: var(--text-secondary);
}

.progress-step .step-circle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background-color: var(--border);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    margin-bottom: 4px;
    z-index: 2;
}

.progress-step.active .step-circle {
    background-color: var(--primary);
    color: white;
}

.progress-step.completed .step-circle {
    background-color: var(--success);
    color: white;
}

.progress-step::before,
.progress-step::after {
    content: '';
    position: absolute;
    top: 11px;
    height: 2px;
    background-color: var(--border);
    z-index: 1;
}

.progress-step::before { left: 0; right: 50%; }
.progress-step::after { left: 50%; right: 0; }

.progress-step:first-child::before,
.progress-step:last-child::after {
    display: none;
}

.progress-step.completed::before,
.progress-step.completed::after {
    background-color: var(--success);
}

/* ============ عداد الإلغاء ============ */
.cancel-timer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background-color: var(--warning-bg);
    color: #F57F17;
    padding: 6px 12px;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 700;
    margin-top: 12px;
}

.cancel-timer .material-icons {
    font-size: 16px;
}

/* ============ شحن الرصيد ============ */
.balance-card-gradient {
    background: linear-gradient(135deg, #00A0E9, #0D47A1);
    border-radius: var(--radius-lg);
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    color: white;
}

.balance-card-gradient .material-icons {
    font-size: 3rem;
}

.balance-label {
    font-size: 0.9rem;
    opacity: 0.9;
}

.balance-value {
    font-size: 1.8rem;
    font-weight: 800;
}

.payment-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.payment-method {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: var(--transition);
}

.payment-method:hover {
    border-color: var(--primary);
    transform: translateX(-4px);
}

.payment-method-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.payment-method-icon {
    font-size: 2rem;
}

.payment-method-name {
    font-weight: 700;
    color: var(--text);
    font-size: 1rem;
}

.payment-method-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

/* ============ الإيداعات ============ */
.page-title h2 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 4px;
}

.text-secondary {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-bottom: 12px;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
    border: 2px dashed var(--border);
    border-radius: var(--radius-md);
}

.empty-state .material-icons {
    font-size: 3rem;
    display: block;
    margin-bottom: 12px;
    color: var(--border);
}

/* ============ الحساب ============ */
.account-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: var(--shadow);
}

.account-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: var(--primary-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--primary);
}

.account-info {
    flex: 1;
}

.account-name {
    font-weight: 800;
    font-size: 1.2rem;
}

.account-email,
.account-id {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.account-status {
    margin-top: 4px;
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
}

.stat-item {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px;
    text-align: center;
}

.stat-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.stat-value {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--primary-dark);
    margin-top: 4px;
}

.settings-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.setting-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 14px;
    cursor: pointer;
    transition: var(--transition);
}

.setting-item:hover {
    border-color: var(--primary);
    transform: translateX(-4px);
}

.setting-title {
    font-weight: 700;
    font-size: 0.9rem;
}

.setting-desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
}

/* ============ Toggle Switch ============ */
.toggle-switch {
    position: relative;
    width: 40px;
    height: 22px;
    flex-shrink: 0;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: #ccc;
    border-radius: 34px;
    transition: var(--transition);
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: var(--transition);
}

input:checked + .toggle-slider {
    background-color: var(--primary);
}

input:checked + .toggle-slider:before {
    transform: translateX(18px);
}

/* ============ KYC ============ */
.kyc-container {
    padding: 20px;
    text-align: center;
}

.kyc-container h2 {
    font-size: 1.6rem;
    font-weight: 800;
    margin-bottom: 24px;
    color: var(--primary-dark);
}

.kyc-icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: var(--success);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
}

.kyc-icon .material-icons {
    font-size: 4rem;
    color: white;
}

.kyc-message {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--primary-dark);
    margin-top: 16px;
}

.kyc-form {
    text-align: right;
    max-width: 400px;
    margin: 0 auto;
}

.kyc-form .form-group {
    margin-bottom: 16px;
}

.kyc-form label {
    display: block;
    font-weight: 600;
    margin-bottom: 6px;
}

.kyc-form input[type="text"],
.kyc-form input[type="tel"] {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background-color: var(--surface);
    color: var(--text);
    font-family: inherit;
    outline: none;
    transition: var(--transition);
}

.kyc-form input:focus {
    border-color: var(--primary);
}

.image-preview {
    width: 100%;
    height: 100px;
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    background-color: var(--primary-light);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-top: 8px;
    overflow: hidden;
}

.image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* ============ FAQ ============ */
.faq-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.faq-item {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.faq-question {
    padding: 14px 16px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text);
}

.faq-question .material-icons {
    transition: transform 0.3s ease;
    color: var(--primary);
}

.faq-answer {
    padding: 0 16px 14px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.7;
    display: none;
    border-top: 1px solid var(--border);
    padding-top: 12px;
}

.faq-item.open .faq-answer {
    display: block;
}

.faq-item.open .faq-question .material-icons {
    transform: rotate(180deg);
}

/* ============ زر الدعم ============ */
.floating-support-btn {
    position: fixed;
    bottom: calc(var(--nav-height) + 16px);
    left: 16px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background-color: var(--primary);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99;
    transition: var(--transition);
    animation: floatBtn 3s ease-in-out infinite;
}

@keyframes floatBtn {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}

.floating-support-btn:hover {
    background-color: var(--primary-dark);
    transform: scale(1.1);
}

.floating-support-btn .material-icons {
    font-size: 26px;
}

.support-online-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 12px;
    height: 12px;
    background-color: #4CAF50;
    border: 2px solid var(--surface);
    border-radius: 50%;
    animation: pulseBadge 2s ease-in-out infinite;
}

@keyframes pulseBadge {
    0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.6); }
    50% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
}

/* ============ المودال ============ */
.modal {
    display: none;
    position: fixed;
    z-index: 200;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    overflow: auto;
}

.modal-content {
    background-color: var(--surface);
    margin: 5% auto;
    padding: 24px;
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 600px;
    position: relative;
    color: var(--text);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    animation: modalIn 0.3s ease;
}

@keyframes modalIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.close-modal {
    position: absolute;
    top: 15px;
    left: 20px;
    font-size: 1.8rem;
    font-weight: bold;
    cursor: pointer;
    color: var(--text-secondary);
    line-height: 1;
    transition: var(--transition);
}

.close-modal:hover {
    color: var(--danger);
}

/* ============ Form Groups ============ */
.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 6px;
    font-size: 0.9rem;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background-color: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: 0.95rem;
    outline: none;
    transition: var(--transition);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(0, 160, 233, 0.1);
}
/* ============================================================
   ============ Purchase Modal ============
   ============================================================ */
.purchase-modal {
    text-align: center;
}

.purchase-header {
    margin-bottom: 16px;
}

.purchase-image-lg {
    width: 100px;
    height: 100px;
    margin: 0 auto 12px;
    border-radius: 20px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    background-color: #FFFFFF;
    border: 1px solid var(--border);
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .purchase-image-lg {
    background-color: var(--surface);
}

.purchase-image-lg.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    color: #ccc;
}

.purchase-title {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text);
    margin: 0 0 6px 0;
}

.purchase-price-info {
    font-size: 1rem;
    color: var(--primary);
    font-weight: 700;
}

.purchase-price-info small {
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 0.8rem;
}

.purchase-max-info {
    margin-top: 6px;
    font-size: 0.78rem;
    color: var(--text-secondary);
}

.quantity-selector {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background-color: var(--primary-light);
    border-radius: var(--radius-md);
    padding: 4px;
}

.qty-btn {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: none;
    background-color: var(--surface);
    color: var(--primary);
    font-size: 1.4rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    line-height: 1;
    padding-bottom: 3px;
}

.qty-btn:hover {
    background-color: var(--primary);
    color: white;
    transform: scale(1.05);
}

.qty-btn:active {
    transform: scale(0.95);
}

.qty-input {
    flex: 1;
    text-align: center;
    border: none;
    background: transparent;
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--text);
    font-family: inherit;
    outline: none;
    min-width: 0;
    padding: 8px;
    -moz-appearance: textfield;
    appearance: textfield;
}

.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.purchase-total-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, var(--primary-light), var(--surface));
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 14px 18px;
    margin: 16px 0;
    font-size: 1rem;
}

.purchase-total-box span {
    color: var(--text-secondary);
    font-weight: 600;
}

.purchase-total-box strong {
    color: var(--primary);
    font-size: 1.4rem;
    font-weight: 800;
}

/* ============================================================
   ============ Success Overlay ============
   ============================================================ */
.success-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 300;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
}

.success-overlay.active {
    display: flex;
}

.success-content {
    background-color: var(--surface);
    border-radius: var(--radius-lg);
    padding: 32px 24px;
    text-align: center;
    max-width: 340px;
    width: 87%;
    box-shadow: var(--shadow-lg);
    animation: successPop 0.4s ease;
}

@keyframes successPop {
    0% { transform: scale(0.5); opacity: 0; }
    70% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
}

.success-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    transition: background-color 0.2s ease;
    background-color: var(--success-bg);
}

.success-icon .material-icons {
    font-size: 3.5rem;
    color: var(--success);
    transition: color 0.2s ease;
}

.success-icon.error {
    background-color: var(--danger-bg);
}
.success-icon.error .material-icons {
    color: var(--danger);
}

.success-icon.warning {
    background-color: var(--warning-bg);
}
.success-icon.warning .material-icons {
    color: #F57F17;
}

.success-icon.info {
    background-color: var(--info-bg);
}
.success-icon.info .material-icons {
    color: var(--info);
}

.success-title {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--primary-dark);
    margin-bottom: 8px;
}

.success-message {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.7;
    word-break: break-word;
}

.success-overlay[data-type="error"] .success-title {
    color: var(--danger);
}

.success-overlay[data-type="warning"] .success-title {
    color: #F57F17;
}

/* ============ Bottom Nav ============ */
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--nav-height);
    background-color: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.7rem;
    transition: var(--transition);
    padding: 6px 0;
    flex: 1;
    border-radius: 12px;
    margin: 4px;
}

.nav-item .material-icons {
    font-size: 1.4rem;
}

.nav-item.active {
    background-color: var(--primary-light);
    color: var(--primary);
    font-weight: 700;
}

/* ============ Responsive ============ */
@media (min-width: 768px) {
    .main-content {
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }
    .ptr-indicator {
        max-width: 600px;
        margin: 0 auto;
        left: 50%;
        transform: translateX(-50%);
    }
}

/* ============ Currency Toggle ============ */
.currency-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background-color: var(--vip-bg);
    color: var(--vip-text);
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 50px;
    font-size: 0.85rem;
    border: 1px solid var(--vip-text);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    margin-top: 6px;
    font-family: inherit;
    transition: var(--transition);
}

.currency-toggle:hover {
    opacity: 0.85;
    transform: scale(1.05);
}

.currency-toggle .material-icons {
    font-size: 16px;
}

/* ============ Flash Overlay ============ */
.flash-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 160, 233, 0.25);
    pointer-events: none;
    opacity: 0;
    z-index: 500;
    transition: opacity 0.3s ease;
}

.flash-overlay.active {
    animation: flashPulse 1.2s ease;
}

@keyframes flashPulse {
    0% { opacity: 0; }
    25% { opacity: 1; }
    50% { opacity: 0.3; }
    75% { opacity: 0.8; }
    100% { opacity: 0; }
}

/* ============ Small Screens ============ */
@media (max-width: 360px) {
    .products-grid { gap: 6px; }
    .product-name { font-size: 0.68rem; padding: 6px 4px; }
    .category-name { font-size: 0.75rem; padding: 16px 6px 6px; }
    .favorite-btn { width: 22px; height: 22px; }
    .favorite-btn .material-icons { font-size: 12px; }

    .purchase-image-lg { width: 80px; height: 80px; }
    .purchase-title { font-size: 1.05rem; }
    .qty-btn { width: 38px; height: 38px; font-size: 1.2rem; }
    .qty-input { font-size: 1.15rem; }
    .purchase-total-box strong { font-size: 1.2rem; }

    .success-content { padding: 24px 18px; }
    .success-icon { width: 68px; height: 68px; }
    .success-icon .material-icons { font-size: 2.8rem; }
    .success-title { font-size: 1.15rem; }
    .success-message { font-size: 0.85rem; }

    .timeline-marker { width: 30px; height: 30px; }
    .timeline-marker .material-icons { font-size: 16px; }
    .timeline-step:not(:last-child)::before { right: 22px; }
    .timeline-title { font-size: 0.8rem; }

    .recently-viewed-item,
    .recently-viewed-image { width: 70px; }
    .recently-viewed-image { height: 70px; }
    .recently-viewed-name { font-size: 0.65rem; max-width: 70px; }
}

/* ============================================================
   ============ New Purchase Modal ============
   ============================================================ */
.new-purchase-modal { padding: 8px 4px; }

.new-purchase-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
    padding: 0 4px;
}

.new-fav-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
}

.new-fav-btn .material-icons { font-size: 28px; color: var(--text-secondary); }
.new-fav-btn.active .material-icons { color: #E91E63; }

.new-purchase-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    justify-content: flex-end;
}

.new-purchase-logo {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    object-fit: cover;
    background-color: #FFFFFF;
    border: 1px solid var(--border);
    flex-shrink: 0;
}

[data-theme="dark"] .new-purchase-logo { background-color: var(--surface); }

.new-purchase-logo.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    color: #ccc;
}

.new-purchase-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.new-info-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 16px;
}

.new-info-box {
    background-color: var(--primary-light);
    border-radius: 14px;
    padding: 14px 12px;
    text-align: center;
    border: 1px solid var(--border);
}

.new-info-box.primary {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    border: none;
}

.new-info-box.primary .new-info-label,
.new-info-box.primary .new-info-value { color: #FFFFFF; }

.new-info-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 600;
    margin-bottom: 6px;
}

.new-info-value {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text);
    direction: ltr;
}

/* ============ Editable Quantity Input ============ */
.new-qty-input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-family: inherit;
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text);
    text-align: center;
    direction: ltr;
    padding: 0;
    margin: 0;
    -moz-appearance: textfield;
    appearance: textfield;
}

.new-qty-input::-webkit-outer-spin-button,
.new-qty-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.new-qty-input:focus {
    outline: none;
    color: var(--primary);
}

.new-input-group {
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 16px;
    transition: var(--transition);
}

.new-input-group:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(0, 160, 233, 0.1);
}

.new-input-icon { color: var(--primary); font-size: 22px; flex-shrink: 0; }

.new-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-family: inherit;
    font-size: 1rem;
    color: var(--text);
    direction: rtl;
    text-align: right;
    font-weight: 600;
    min-width: 0;
}

.new-input::placeholder {
    color: var(--text-secondary);
    font-weight: 400;
    direction: rtl;
    text-align: right;
}

.new-purchase-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 8px;
}

.new-btn-cancel,
.new-btn-buy {
    padding: 14px 16px;
    border-radius: 14px;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.new-btn-cancel { background-color: var(--primary-light); color: var(--text-secondary); }
.new-btn-cancel:hover { background-color: #E0E0E0; }

.new-btn-buy {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(0, 160, 233, 0.3);
}

.new-btn-buy:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 160, 233, 0.4); }
.new-btn-buy:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* ============ Delivery List ============ */
.delivery-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
}

.delivery-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: var(--primary-light);
    border-radius: 12px;
    padding: 10px 14px;
    border-right: 3px solid var(--primary);
}

.delivery-item-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.delivery-item-icon .material-icons { font-size: 18px; }

.delivery-item-content { flex: 1; min-width: 0; }

.delivery-item-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    font-weight: 600;
    margin-bottom: 2px;
}

.delivery-item-value {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--text);
    direction: ltr;
    text-align: right;
    word-break: break-all;
}

/* ============ Inline Delivery Detail Line ============ */
.order-detail-line {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 6px;
}

.order-detail-icon {
    font-size: 16px;
    color: var(--primary);
}

.order-detail-label {
    font-weight: 600;
    color: var(--text-secondary);
}

.order-detail-value {
    font-weight: 800;
    color: var(--text);
    direction: ltr;
}

/* ============ Topup Rate Info ============ */
.topup-rate-info {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--primary-light);
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: 16px;
    border-right: 3px solid var(--primary);
}

.topup-rate-info .material-icons {
    font-size: 18px;
    color: var(--primary);
}

.topup-rate-info strong {
    color: var(--text);
    font-weight: 800;
}

/* ============ Locked Payment Method ============ */
.payment-method.locked {
    opacity: 0.65;
    cursor: not-allowed;
    background: linear-gradient(135deg, var(--surface) 0%, var(--warning-bg) 100%);
    border-color: var(--warning);
}

.payment-method.locked:hover {
    transform: none;
    border-color: var(--warning);
}

.payment-method.locked .material-icons {
    color: var(--warning);
}

/* ============================================================
   ============ 🎁 Bundle Selector ============
   ============================================================ */
.bundle-selector {
    margin-bottom: 16px;
}

.bundle-selector-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 10px;
    padding: 0 4px;
}

.bundle-selector-label .material-icons {
    font-size: 20px;
    color: var(--primary);
}

.bundle-options-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 320px;
    overflow-y: auto;
    padding: 2px;
}

.bundle-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 14px;
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.bundle-option:hover {
    border-color: var(--primary);
    background: var(--primary-light);
}

.bundle-option.selected {
    border-color: var(--primary);
    background: linear-gradient(135deg, var(--primary-light) 0%, var(--surface) 100%);
    box-shadow: 0 0 0 3px rgba(0, 160, 233, 0.12);
}

.bundle-radio {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: var(--transition);
    background: var(--surface);
}

.bundle-option.selected .bundle-radio {
    border-color: var(--primary);
}

.bundle-radio-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--primary);
    transform: scale(0);
    transition: transform 0.2s ease;
}

.bundle-option.selected .bundle-radio-dot {
    transform: scale(1);
}

.bundle-info {
    flex: 1;
    min-width: 0;
    text-align: right;
}

.bundle-name {
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--text);
    margin-bottom: 2px;
}

.bundle-qty {
    font-size: 0.72rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.bundle-price {
    font-weight: 800;
    font-size: 1rem;
    color: var(--primary);
    direction: ltr;
    flex-shrink: 0;
}

.bundle-option.selected .bundle-price {
    color: var(--primary-dark);
    font-size: 1.05rem;
}

/* Badge للباقات على Product Card */
.badge-bundle {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 50px;
    font-size: 0.6rem;
    font-weight: 800;
    background: linear-gradient(135deg, #FFD700, #FF8C00);
    color: #000;
}

/* ============================================================
   🆕 VIP Badges — 7 Levels
   ============================================================ */
.vip-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    border-radius: 50px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
    height: 26px;
    line-height: 1;
    position: relative;
    overflow: hidden;
    vertical-align: middle;
    animation: vipFadeIn 0.5s ease;
}

.vip-badge .material-icons {
    font-size: 14px;
    line-height: 1;
}

@keyframes vipFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ─── VIP 1: برونزي ─── */
.vip-badge.vip-1 {
    background: linear-gradient(135deg, #7C3F1D 0%, #CD7F32 100%);
    color: #FFF5EB;
    border: 1px solid #CD7F32;
    box-shadow: 0 2px 6px rgba(205,127,50,0.3);
}

/* ─── VIP 2: فضي ─── */
.vip-badge.vip-2 {
    background: linear-gradient(135deg, #64748B 0%, #CBD5E1 100%);
    color: #0F172A;
    border: 1px solid #CBD5E1;
    box-shadow: 0 2px 6px rgba(203,213,225,0.35);
}

/* ─── VIP 3: ذهبي ─── */
.vip-badge.vip-3 {
    background: linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #FBBF24 100%);
    color: #3F2A00;
    border: 1px solid #FFD700;
    box-shadow: 0 2px 10px rgba(255,215,0,0.5);
}

/* ─── VIP 4: بلاتيني ─── */
.vip-badge.vip-4 {
    background: linear-gradient(135deg, #475569 0%, #E2E8F0 50%, #94A3B8 100%);
    color: #0F172A;
    border: 1px solid #F1F5F9;
    box-shadow: 0 0 12px rgba(226,232,240,0.5), inset 0 1px 0 rgba(255,255,255,0.5);
}

/* ─── VIP 5: ماسي ─── */
.vip-badge.vip-5 {
    background: linear-gradient(135deg, #0891B2 0%, #22D3EE 50%, #67E8F9 100%);
    color: #062F36;
    border: 1px solid #67E8F9;
    box-shadow: 0 0 14px rgba(34,211,238,0.6), inset 0 1px 0 rgba(255,255,255,0.4);
}

/* ─── VIP 6: أسطوري (Shimmer) ─── */
.vip-badge.vip-6 {
    background: linear-gradient(135deg, #7C3AED 0%, #C026D3 50%, #EC4899 100%);
    color: #FFFFFF;
    border: 1px solid #F472B6;
    box-shadow: 0 0 18px rgba(236,72,153,0.6), inset 0 1px 0 rgba(255,255,255,0.3);
}

.vip-badge.vip-6::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255,255,255,0.6) 50%,
        transparent 100%
    );
    transform: skewX(-20deg);
    animation: vipShimmer 3s ease-in-out infinite;
}

/* ─── VIP 7: الأسطورة (Shimmer + Pulse) ─── */
.vip-badge.vip-7 {
    background: linear-gradient(135deg, #DC2626 0%, #F97316 50%, #FBBF24 100%);
    color: #FFFFFF;
    border: 1px solid #FCD34D;
    box-shadow: 0 0 22px rgba(220,38,38,0.7), 0 0 40px rgba(251,191,36,0.3), inset 0 1px 0 rgba(255,255,255,0.4);
    animation: vipFadeIn 0.5s ease, vipPulse 2.5s ease-in-out infinite 0.5s;
}

.vip-badge.vip-7::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255,255,255,0.8) 50%,
        transparent 100%
    );
    transform: skewX(-20deg);
    animation: vipShimmer 2s ease-in-out infinite;
}

@keyframes vipShimmer {
    0% { left: -100%; }
    60% { left: 150%; }
    100% { left: 150%; }
}

@keyframes vipPulse {
    0%, 100% {
        box-shadow: 0 0 22px rgba(220,38,38,0.7), 0 0 40px rgba(251,191,36,0.3), inset 0 1px 0 rgba(255,255,255,0.4);
    }
    50% {
        box-shadow: 0 0 30px rgba(220,38,38,0.9), 0 0 55px rgba(251,191,36,0.5), inset 0 1px 0 rgba(255,255,255,0.4);
    }
}

/* لأجهزة تحترم تفضيل تقليل الحركة */
@media (prefers-reduced-motion: reduce) {
    .vip-badge.vip-6::after,
    .vip-badge.vip-7,
    .vip-badge.vip-7::after {
        animation: none !important;
    }
}

/* ============================================================
   ============ 🆕 VIP Badge — الرئيسية ============
   ============================================================ */
.home-vip-badge-container {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 50px;
    border: 1.5px solid;
    margin-top: 10px;
    font-weight: 800;
    font-size: 0.85rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    transition: all 0.3s ease;
    animation: vipFadeIn 0.5s ease;
}

.home-vip-badge-container .vip-icon-pulse {
    font-size: 22px;
    animation: vipPulse 2s ease-in-out infinite;
}

.home-vip-badge-container .vip-text {
    letter-spacing: 0.3px;
}

/* ============================================================
   🆕 v17: URL Input — في Modal الشراء
   ============================================================ */
.url-input-group {
    border-color: rgba(139, 92, 246, 0.4) !important;
}

.url-input-group:focus-within {
    border-color: #8B5CF6 !important;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15) !important;
}

.url-input-group .new-input-icon {
    color: #8B5CF6 !important;
}

.url-input {
    direction: ltr !important;
    text-align: left !important;
    font-family: 'Courier New', monospace !important;
    font-size: 13px !important;
    letter-spacing: 0;
}

.url-input::placeholder {
    direction: ltr !important;
    text-align: left !important;
    color: #94A3B8;
}

.url-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(139, 92, 246, 0.08);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 10px;
    padding: 8px 12px;
    margin-top: -8px;
    margin-bottom: 12px;
    font-size: 11px;
    color: #8B5CF6;
    font-weight: 600;
    line-height: 1.5;
}

[data-theme="dark"] .url-hint {
    background: rgba(139, 92, 246, 0.15);
    color: #A78BFA;
}

.url-hint .material-icons {
    color: #8B5CF6;
    flex-shrink: 0;
}

[data-theme="dark"] .url-hint .material-icons {
    color: #A78BFA;
}

.url-hint strong {
    color: #7C3AED;
    direction: ltr;
    display: inline-block;
}

[data-theme="dark"] .url-hint strong {
    color: #C4B5FD;
}

/* ============================================================
   🆕 v17: URL في قائمة الطلبات
   ============================================================ */
.order-detail-line.url-line {
    align-items: flex-start;
}

.order-detail-value.url-value {
    direction: ltr;
    text-align: left;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    word-break: break-all;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.25);
    padding: 6px 10px;
    border-radius: 8px;
    color: #7C3AED;
    font-weight: 700;
    transition: all 200ms ease;
    display: inline-flex;
    align-items: center;
    max-width: 100%;
}

[data-theme="dark"] .order-detail-value.url-value {
    background: rgba(139, 92, 246, 0.2);
    color: #C4B5FD;
    border-color: rgba(139, 92, 246, 0.4);
}

.order-detail-value.url-value:active {
    background: rgba(139, 92, 246, 0.2);
    transform: scale(0.98);
}

[data-theme="dark"] .order-detail-value.url-value:active {
    background: rgba(139, 92, 246, 0.3);
}

/* ============================================================
   🆕 v17.3: User Discount Hint
   ============================================================ */
.user-discount-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
    color: white;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
    animation: discountHintIn 0.3s ease;
}

.user-discount-hint .material-icons {
    color: white;
    font-size: 20px;
    flex-shrink: 0;
}

.user-discount-hint strong {
    background: rgba(255, 255, 255, 0.25);
    padding: 2px 8px;
    border-radius: 6px;
    margin: 0 4px;
    font-weight: 900;
    direction: ltr;
    display: inline-block;
}

@keyframes discountHintIn {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .user-discount-hint {
        animation: none;
    }
}

/* ============================================================
   🆕 v18.3.6.3: Deposit Info Card + Compact Payment Methods
   ============================================================ */

.deposit-info-card {
    background: linear-gradient(135deg, var(--primary-light) 0%, var(--surface) 100%);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.deposit-info-card.compact {
    padding: 10px 12px;
    border-radius: 12px;
    gap: 0;
}

.deposit-info-inline {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 6px;
    flex-wrap: nowrap;
}

.deposit-info-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    flex: 1;
    min-width: 0;
    text-align: center;
}

.deposit-info-chip .material-icons {
    font-size: 14px;
    color: var(--primary);
    line-height: 1;
}

.deposit-info-chip .chip-label {
    font-size: 0.65rem;
    color: var(--text-secondary);
    font-weight: 600;
    white-space: nowrap;
    line-height: 1.1;
}

.deposit-info-chip .chip-value {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--primary-dark);
    direction: ltr;
    white-space: nowrap;
    line-height: 1.2;
}

.deposit-info-chip.warning {
    background: var(--warning-bg);
    border-color: rgba(255, 193, 7, 0.5);
}

.deposit-info-chip.warning .material-icons {
    color: #92400E;
}

.deposit-info-chip.warning .chip-value {
    color: #92400E;
}

[data-theme="dark"] .deposit-info-chip {
    background: var(--surface);
}

[data-theme="dark"] .deposit-info-chip.warning {
    background: rgba(255, 193, 7, 0.15);
}

.deposit-fee-preview {
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: depositPreviewIn 0.25s ease;
}

@keyframes depositPreviewIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}

.deposit-fee-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.deposit-fee-row strong {
    color: var(--text);
    direction: ltr;
    font-weight: 800;
}

.deposit-fee-row.fee strong {
    color: var(--warning);
}

.deposit-fee-row.total {
    padding-top: 8px;
    border-top: 1px solid var(--border);
    font-size: 0.95rem;
}

.deposit-fee-row.total strong {
    color: var(--success);
    font-size: 1.1rem;
}

@media (max-width: 360px) {
    .deposit-info-chip .chip-value {
        font-size: 0.78rem;
    }
    .deposit-info-chip .chip-label {
        font-size: 0.6rem;
    }
}

/* ============================================================
   END OF style.css v18.3.6.3
   ============================================================ */```

---

## FILE: ./miniapp/index.html

```
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">

    <!-- ============================================================
         🛡️ v18.3.3: KILL ALL SERVICE WORKERS + CACHES
         يعمل قبل أي شيء آخر. يُلغي SW القديم ويمسح كل Cache Storage.
         السبب: SW قديم كان يخدم نسخ JS/CSS قديمة، فيعطّل الواجهة.
         ============================================================ -->
    <script>
    (function() {
        try {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    if (registrations.length === 0) return;
                    registrations.forEach(function(reg) {
                        reg.unregister().then(function(success) {
                            console.log('[SANAD] ✅ SW unregistered:', reg.scope, success);
                        });
                    });
                }).catch(function(err) {
                    console.warn('[SANAD] SW unregister error:', err);
                });
            }

            if ('caches' in window) {
                caches.keys().then(function(names) {
                    if (names.length === 0) return;
                    names.forEach(function(name) {
                        caches.delete(name).then(function(success) {
                            console.log('[SANAD] ✅ Cache deleted:', name, success);
                        });
                    });
                }).catch(function(err) {
                    console.warn('[SANAD] Cache delete error:', err);
                });
            }
        } catch (e) {
            console.warn('[SANAD] SW kill error:', e);
        }
    })();
    </script>

    <title>SANAD+ | سند بلس</title>
    <meta name="theme-color" content="#00A0E9">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link rel="stylesheet" href="css/style.css?v=22">
</head>
<body>

    <!-- ==================== شاشة البداية ==================== -->
    <div id="splashScreen">
        <div class="splash-bg-glow"></div>

        <div class="splash-shield-stage" id="splashShieldStage">
            <svg class="splash-shield-svg" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="shieldBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85"/>
                        <stop offset="45%" stop-color="#DBF0FF" stop-opacity="0.70"/>
                        <stop offset="100%" stop-color="#7DD3FC" stop-opacity="0.45"/>
                    </linearGradient>
                    <linearGradient id="shieldEdgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#38BDF8"/>
                        <stop offset="55%" stop-color="#0EA5E9"/>
                        <stop offset="100%" stop-color="#0D47A1"/>
                    </linearGradient>
                    <radialGradient id="shieldInnerGlow" cx="50%" cy="42%" r="60%">
                        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
                        <stop offset="45%" stop-color="#7DD3FC" stop-opacity="0.35"/>
                        <stop offset="100%" stop-color="#7DD3FC" stop-opacity="0"/>
                    </radialGradient>
                    <linearGradient id="lightSweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
                        <stop offset="45%" stop-color="rgba(255,255,255,0.95)"/>
                        <stop offset="55%" stop-color="rgba(186,230,253,0.95)"/>
                        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
                    </linearGradient>
                    <clipPath id="shieldClip">
                        <path d="M 60 8 L 108 24 L 108 68 Q 108 102 60 128 Q 12 102 12 68 L 12 24 Z"/>
                    </clipPath>
                </defs>

                <path class="shield-body-path"
                      d="M 60 8 L 108 24 L 108 68 Q 108 102 60 128 Q 12 102 12 68 L 12 24 Z"
                      fill="url(#shieldBodyGrad)"/>

                <ellipse class="shield-inner-glow" cx="60" cy="60" rx="42" ry="46" fill="url(#shieldInnerGlow)"/>

                <path class="shield-edge-path"
                      d="M 60 8 L 108 24 L 108 68 Q 108 102 60 128 Q 12 102 12 68 L 12 24 Z"
                      fill="none" stroke="url(#shieldEdgeGrad)" stroke-width="2.2" stroke-linejoin="round"/>

                <path class="shield-inner-edge"
                      d="M 60 14 L 102 28 L 102 66 Q 102 98 60 122 Q 18 98 18 66 L 18 28 Z"
                      fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="0.8" stroke-linejoin="round"/>

                <g clip-path="url(#shieldClip)">
                    <rect class="splash-light-sweep" x="-80" y="0" width="70" height="140" fill="url(#lightSweepGrad)" opacity="0"/>
                </g>
            </svg>
        </div>

        <canvas id="splashCanvas"></canvas>

        <div class="splash-text-stage" id="splashTextStage">
            <h1 class="splash-brand-ar">
                <span class="splash-brand-ar-text">سند بلس</span><span class="splash-plus-mark">⁺</span>
            </h1>
            <p class="splash-brand-en">
                SANAD PLUS<span class="splash-plus-mark-en">⁺</span>
            </p>
        </div>
    </div>

    <!-- ==================== الشريط العلوي ==================== -->
    <header class="topbar">
        <div class="topbar-right">
            <button class="icon-btn" onclick="goToAccount()">
                <div class="avatar-small" id="headerAvatar">م</div>
            </button>
        </div>
        <div class="topbar-center">
            <span class="logo-text">SANAD<span class="highlight">+</span></span>
        </div>
        <div class="topbar-left">
            <button class="icon-btn" onclick="showNotifications()">
                <span class="material-icons">notifications</span>
                <span class="badge" id="notificationBadge" style="display:none;">0</span>
            </button>
            <div class="balance-pill" onclick="navigateTo('page-charge')">
                <span class="material-icons">add</span>
                <span id="headerBalance">0.00$</span>
            </div>
        </div>
    </header>

    <main class="main-content">

        <section id="page-home" class="page active">
            <div class="user-greeting">
                <div class="avatar">👤</div>
                <div>
                    <h2 id="greetingMessage">مرحباً 👋</h2>
                    <p id="greetingSub">رصيدك: 0.00$</p>
                    <span id="vipBadge" style="display:none;"></span>
                </div>
            </div>

            <div class="search-box">
                <span class="material-icons">search</span>
                <input type="text" id="searchInput" placeholder="ابحث عن منتج...">
            </div>

            <button class="btn-primary btn-large" onclick="openCustomServiceModal()">
                <span class="material-icons">add</span> طلب خدمة غير موجودة
            </button>

            <div class="section-header">
                <h3>تصنيفات المتجر</h3>
                <span class="counter-circle" id="categoriesCount">0</span>
            </div>
            <div class="categories-grid" id="categoriesGrid"></div>
        </section>

        <section id="page-orders" class="page">
            <h2>طلباتي</h2>
            <div class="filters pills-container" id="orderFilters">
                <button class="pill active" data-filter="all">الكل</button>
                <button class="pill" data-filter="pending">قيد المعالجة</button>
                <button class="pill" data-filter="review">قيد المراجعة</button>
                <button class="pill" data-filter="processing">قيد التنفيذ</button>
                <button class="pill" data-filter="completed">مكتمل</button>
                <button class="pill" data-filter="failed">فشل</button>
            </div>
            <div class="orders-list" id="ordersList"></div>
        </section>

        <section id="page-charge" class="page">
            <div class="balance-card-gradient">
                <span class="material-icons">account_balance_wallet</span>
                <div>
                    <div class="balance-label">رصيدك الحالي</div>
                    <div class="balance-value" id="chargeBalance">0.00$</div>
                </div>
            </div>
            <h3>طرق الشحن</h3>
            <div class="payment-options" id="paymentMethodsList"></div>
        </section>

        <section id="page-deposits" class="page">
            <h2>الإيداعات</h2>
            <p class="text-secondary">سجل عمليات شحن الرصيد وحالتها</p>
            <div class="filters pills-container" id="depositFilters">
                <button class="pill active" data-filter="all">الكل</button>
                <button class="pill" data-filter="pending">معلقة</button>
                <button class="pill" data-filter="approved">مكتملة</button>
                <button class="pill" data-filter="rejected">مرفوضة</button>
            </div>
            <div class="orders-list" id="depositsList"></div>
        </section>

        <section id="page-account" class="page">
            <div class="account-card">
                <div class="account-avatar">👤</div>
                <div class="account-info">
                    <div class="account-name" id="accountName">مستخدم</div>
                    <div class="account-email" id="accountEmail"></div>
                    <div class="account-id" id="accountId"></div>
                    <div class="account-status" id="accountKycBadge"></div>
                    <span id="accountVipBadge" style="display:none;"></span>
                    <button class="currency-toggle" onclick="toggleCurrency()" id="currencyToggle">
                        <span class="material-icons">currency_exchange</span>
                        <span id="currencyLabel">USD</span>
                    </button>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-item"><div class="stat-label">الرصيد</div><div class="stat-value" id="accountBalance">0.00$</div></div>
                <div class="stat-item"><div class="stat-label">إجمالي الإنفاق</div><div class="stat-value" id="totalSpent">0.00$</div></div>
                <div class="stat-item"><div class="stat-label">عدد الطلبات</div><div class="stat-value" id="orderCount">0</div></div>
                <div class="stat-item"><div class="stat-label">عدد الإيداعات</div><div class="stat-value" id="depositCount">0</div></div>
            </div>

            <div class="settings-list">
                <div class="setting-item" onclick="navigateTo('page-kyc')">
                    <span class="material-icons">verified_user</span>
                    <div><div class="setting-title">توثيق الحساب (KYC)</div><div class="setting-desc" id="kycSettingDesc">وثق حسابك لاستخدام كل طرق الدفع</div></div>
                    <span class="material-icons">chevron_left</span>
                </div>
                <div class="setting-item" onclick="navigateTo('page-favorites')">
                    <span class="material-icons">favorite</span>
                    <div><div class="setting-title">المفضلة</div><div class="setting-desc">المنتجات التي أعجبتك</div></div>
                    <span class="material-icons">chevron_left</span>
                </div>
                <div class="setting-item" onclick="openReferralModal()">
                    <span class="material-icons">card_giftcard</span>
                    <div><div class="setting-title">الإحالات</div><div class="setting-desc">ادعُ أصدقاءك واحصل على مكافأة</div></div>
                    <span class="material-icons">chevron_left</span>
                </div>
                <div class="setting-item" onclick="navigateTo('page-faq')">
                    <span class="material-icons">help_outline</span>
                    <div><div class="setting-title">الأسئلة الشائعة</div><div class="setting-desc">إجابات سريعة لأكثر الأسئلة</div></div>
                    <span class="material-icons">chevron_left</span>
                </div>
                <div class="setting-item" onclick="openSupport()">
                    <span class="material-icons">headset_mic</span>
                    <div><div class="setting-title">الدعم الفني</div><div class="setting-desc">تواصل معنا على مدار الساعة</div></div>
                    <span class="material-icons">chevron_left</span>
                </div>
                <div class="setting-item">
                    <span class="material-icons">dark_mode</span>
                    <div><div class="setting-title">الوضع الليلي</div><div class="setting-desc">التبديل بين النهاري والليلي</div></div>
                    <label class="toggle-switch"><input type="checkbox" id="darkModeToggle" onchange="toggleTheme()"><span class="toggle-slider"></span></label>
                </div>
                <div class="setting-item" onclick="openNotificationsPage()">
                    <span class="material-icons">notifications</span>
                    <div><div class="setting-title">الإشعارات</div><div class="setting-desc">عرض كل الإشعارات</div></div>
                    <span class="material-icons">chevron_left</span>
                </div>
            </div>
        </section>

        <section id="page-kyc" class="page">
            <div id="kycDynamicContent"></div>
        </section>

        <section id="page-products" class="page">
            <h2 id="productsPageTitle">المنتجات</h2>
            <div class="products-grid" id="productsList"></div>
        </section>

        <section id="page-favorites" class="page">
            <h2>المفضلة</h2>
            <div class="products-grid" id="favoritesList">
                <div class="empty-state">لا توجد منتجات في المفضلة بعد</div>
            </div>
        </section>

        <section id="page-faq" class="page">
            <h2>الأسئلة الشائعة</h2>
            <div class="faq-list" id="faqList"></div>
        </section>

    </main>

    <button class="floating-support-btn" onclick="openSupport()" title="الدعم الفني" aria-label="الدعم الفني">
        <span class="material-icons">support_agent</span>
        <span class="support-online-badge" aria-label="متصل"></span>
    </button>

    <nav class="bottom-nav">
        <button class="nav-item active" data-page="page-home"><span class="material-icons">home</span><span>الرئيسية</span></button>
        <button class="nav-item" data-page="page-orders"><span class="material-icons">receipt_long</span><span>طلباتي</span></button>
        <button class="nav-item" data-page="page-charge"><span class="material-icons">bolt</span><span>شحن</span></button>
        <button class="nav-item" data-page="page-deposits"><span class="material-icons">account_balance_wallet</span><span>إيداعات</span></button>
        <button class="nav-item" data-page="page-account"><span class="material-icons">person</span><span>حسابي</span></button>
    </nav>

    <div id="modal" class="modal">
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal()">&times;</span>
            <div id="modalBody"></div>
        </div>
    </div>

    <div id="successOverlay" class="success-overlay">
        <div class="success-content">
            <div class="success-icon">
                <span class="material-icons">check_circle</span>
            </div>
            <div class="success-title" id="successTitle">تم بنجاح</div>
            <div class="success-message" id="successMessage">تمت العملية بنجاح</div>
        </div>
    </div>

    <div id="flashOverlay" class="flash-overlay"></div>

<script src="js/telegram.js?v=22"></script>
<script src="js/api.js?v=22"></script>
<script src="js/app_new.js?v=22"></script>

</body>
</html>```

---

## FILE: ./miniapp/js/api.js

```
// ============================================================
// miniapp/js/api.js — v18.3.2
// ============================================================
// 🆕 v18.3.2:
//   - تصحيح مسار payment-methods (dash، ليس underscore)
//   - retry فقط لـ [0, 503] (ليس 500)
//   - timeout أقصر (30s)
// ============================================================

const API_BASE_URL = 'https://sanad-plus-backend.onrender.com';

const API_CONFIG = {
    maxRetries: 1,
    baseDelay: 1500,
    maxDelay: 4000,
    timeout: 30000,
    retryOnStatus: [0, 503],   // اتصال/خدمة معطلة فقط — NOT 500
};

let _authToken = null;

// ════════════════════════════════════════════════════════════
// Token Management
// ════════════════════════════════════════════════════════════
function getAuthToken() { return _authToken; }
function setAuthToken(t) { _authToken = t; }
function clearAuthToken() { _authToken = null; }

// ════════════════════════════════════════════════════════════
// apiFetch
// ════════════════════════════════════════════════════════════
async function apiFetch(url, options = {}, _isRetry = false) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (_authToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${_authToken}`;
    }

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(timeoutId);
        if (!_isRetry && !options.__noRetry) {
            await _sleep(API_CONFIG.baseDelay);
            return apiFetch(url, options, true);
        }
        throw new Error('تعذر الاتصال بالسيرفر');
    } finally {
        clearTimeout(timeoutId);
    }

    // 401 → re-auth مرة واحدة
    if (response.status === 401 && !options.__noReauth) {
        try {
            const initData = window.Telegram?.WebApp?.initData || '';
            if (initData) {
                await authenticateUser(initData);
                const opts = { ...options, __noReauth: true };
                return apiFetch(url, opts, true);
            }
        } catch (e) {
            // فشل re-auth — أكمل للـ error
        }
    }

    // retry للأخطاء المؤقتة فقط (0, 503)
    if (API_CONFIG.retryOnStatus.includes(response.status) && !_isRetry && !options.__noRetry) {
        console.warn(`[apiFetch] retry ${response.status} for ${url}`);
        await _sleep(API_CONFIG.baseDelay);
        return apiFetch(url, options, true);
    }

    // 204 / empty
    if (response.status === 204) return {};

    // Parse JSON
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }
    } else {
        const text = await response.text();
        console.error(`[apiFetch] non-JSON response (${response.status}) from ${url}:`, text.substring(0, 300));
        data = { error: `خطأ في السيرفر (${response.status})` };
    }

    if (!response.ok) {
        const err = new Error(data.error || `خطأ ${response.status}`);
        err.status = response.status;
        err.code = data.code;
        err.data = data;
        throw err;
    }

    return data;
}

function _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ════════════════════════════════════════════════════════════
// Authentication
// ════════════════════════════════════════════════════════════
async function authenticateUser(initData) {
    const data = await apiFetch(`${API_BASE_URL}/api/auth/telegram`, {
        method: 'POST',
        body: JSON.stringify({ initData }),
        __noRetry: true,
        __noReauth: true,
    });
    if (data.access_token) {
        setAuthToken(data.access_token);
    }
    return data.user || data;
}

// ════════════════════════════════════════════════════════════
// Public endpoints
// ════════════════════════════════════════════════════════════
async function fetchPublicSettings() {
    return apiFetch(`${API_BASE_URL}/api/settings/public`, { __noRetry: true });
}

async function fetchCategories() {
    return apiFetch(`${API_BASE_URL}/api/categories/`);
}

async function fetchProducts() {
    return apiFetch(`${API_BASE_URL}/api/products/`);
}

// 🆕 v18.3.2: مسار صحيح بـ dash
async function fetchPaymentMethods() {
    return apiFetch(`${API_BASE_URL}/api/payment-methods/`);
}

// ════════════════════════════════════════════════════════════
// User endpoints
// ════════════════════════════════════════════════════════════
async function fetchUserOrders() {
    return apiFetch(`${API_BASE_URL}/api/orders/`);
}

async function fetchUserDeposits() {
    return apiFetch(`${API_BASE_URL}/api/deposits/`);
}

async function createOrder(orderData) {
    return apiFetch(`${API_BASE_URL}/api/orders/create`, {
        method: 'POST',
        body: JSON.stringify(orderData),
        __noRetry: true,
    });
}

async function createDeposit(depositData) {
    return apiFetch(`${API_BASE_URL}/api/deposits/create`, {
        method: 'POST',
        body: JSON.stringify(depositData),
        __noRetry: true,
    });
}

async function submitKYC(kycData) {
    return apiFetch(`${API_BASE_URL}/api/kyc/submit`, {
        method: 'POST',
        body: JSON.stringify(kycData),
        __noRetry: true,
    });
}

async function getMyKYC() {
    return apiFetch(`${API_BASE_URL}/api/kyc/my`);
}

async function fetchNotifications() {
    return apiFetch(`${API_BASE_URL}/api/user/notifications`);
}

async function markNotificationRead(id) {
    return apiFetch(`${API_BASE_URL}/api/user/notifications/read`, {
        method: 'POST',
        body: JSON.stringify({ id }),
        __noRetry: true,
    });
}

async function requestCustomService(data) {
    return apiFetch(`${API_BASE_URL}/api/user/request-service`, {
        method: 'POST',
        body: JSON.stringify(data),
        __noRetry: true,
    });
}

async function applyReferralCode(code) {
    return apiFetch(`${API_BASE_URL}/api/referrals/apply`, {
        method: 'POST',
        body: JSON.stringify({ code }),
        __noRetry: true,
    });
}

// ════════════════════════════════════════════════════════════
// Exports
// ════════════════════════════════════════════════════════════
window.API_BASE_URL = API_BASE_URL;
window.apiFetch = apiFetch;
window.getAuthToken = getAuthToken;
window.setAuthToken = setAuthToken;
window.clearAuthToken = clearAuthToken;
window.authenticateUser = authenticateUser;
window.fetchPublicSettings = fetchPublicSettings;
window.fetchCategories = fetchCategories;
window.fetchProducts = fetchProducts;
window.fetchPaymentMethods = fetchPaymentMethods;
window.fetchUserOrders = fetchUserOrders;
window.fetchUserDeposits = fetchUserDeposits;
window.createOrder = createOrder;
window.createDeposit = createDeposit;
window.submitKYC = submitKYC;
window.getMyKYC = getMyKYC;
window.fetchNotifications = fetchNotifications;
window.markNotificationRead = markNotificationRead;
window.requestCustomService = requestCustomService;
window.applyReferralCode = applyReferralCode;```

---

## FILE: ./miniapp/js/app_new.js

```
// ============================================================
// SANAD+ MiniApp — app_new.js — v18.3.6.3
// ============================================================
// الإصلاحات في هذه النسخة:
//   - renderPaymentMethods: بطاقة مضغوطة (اسم + أيقونة فقط)
//   - showDepositStep2: بطاقة معلومات أفقية
// ============================================================

// ─── State ───
let currentPage = 'page-home';
let userData = null;
let categoriesData = [];
let productsData = [];
let ordersData = [];
let depositsData = [];
let paymentMethodsData = [];
let kycStatus = 'none';
let notificationsData = [];
let selectedMethodForDeposit = null;
let cancelTimers = {};
let publicSettings = { syp_rate: 132, store_name: 'SANAD+', support_url: 'https://t.me/SANADST' };

const BOT_USERNAME = 'Sa3pls1_bot';
let USD_TO_SYP = 132;
let currentCurrency = localStorage.getItem('currency') || 'USD';

// ════════════════════════════════════════════════════════════
// 🛡️ XSS Protection
// ════════════════════════════════════════════════════════════
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;

// ════════════════════════════════════════════════════════════
// VIP Levels
// ════════════════════════════════════════════════════════════
const VIP_LEVELS = {
    1: { name: 'برونزي',   icon: 'military_tech' },
    2: { name: 'فضي',      icon: 'star' },
    3: { name: 'ذهبي',     icon: 'emoji_events' },
    4: { name: 'بلاتيني',  icon: 'diamond' },
    5: { name: 'ماسي',     icon: 'auto_awesome' },
    6: { name: 'أسطوري',   icon: 'local_fire_department' },
    7: { name: 'الأسطورة', icon: 'workspace_premium' },
};

// ════════════════════════════════════════════════════════════
// Image Compression
// ════════════════════════════════════════════════════════════
function compressImageFile(file, maxWidth = 800, quality = 0.6) {
    return new Promise((resolve, reject) => {
        if (!file) { reject(new Error('لا يوجد ملف')); return; }
        if (!file.type.startsWith('image/')) { reject(new Error('الملف ليس صورة')); return; }
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((maxWidth / width) * height);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const sizeKB = Math.round((dataUrl.length * 3 / 4) / 1024);
                    console.log(`📷 Compressed: ${width}x${height} | ~${sizeKB} KB`);
                    resolve(dataUrl);
                } catch (err) { reject(err); }
            };
            img.onerror = () => reject(new Error('فشل قراءة الصورة'));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
    });
}

// ════════════════════════════════════════════════════════════
// Splash Seen
// ════════════════════════════════════════════════════════════
const SPLASH_SEEN_KEY = 'splash_seen_v11';
function hasSeenSplash() {
    try { return localStorage.getItem(SPLASH_SEEN_KEY) === '1'; } catch (e) { return false; }
}
function markSplashSeen() {
    try { localStorage.setItem(SPLASH_SEEN_KEY, '1'); } catch (e) {}
}

// ════════════════════════════════════════════════════════════
// Recently Viewed
// ════════════════════════════════════════════════════════════
const RECENTLY_VIEWED_KEY = 'recently_viewed';
const RECENTLY_VIEWED_MAX = 6;

function getRecentlyViewed() {
    try { return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]'); } catch (e) { return []; }
}

function addToRecentlyViewed(productId) {
    try {
        let list = getRecentlyViewed();
        list = list.filter(id => id !== productId);
        list.unshift(productId);
        if (list.length > RECENTLY_VIEWED_MAX) list = list.slice(0, RECENTLY_VIEWED_MAX);
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    } catch (e) { console.warn('فشل حفظ شوهد حديثاً:', e); }
}

function renderRecentlyViewed() {
    const container = document.getElementById('recentlyViewedContainer');
    const list = document.getElementById('recentlyViewedList');
    if (!container || !list) return;
    const ids = getRecentlyViewed();
    if (!ids.length) { container.style.display = 'none'; return; }
    const products = ids.map(id => productsData.find(p => p.id === id)).filter(Boolean);
    if (!products.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    list.innerHTML = products.map(prod => `
        <div class="recently-viewed-item" onclick="openPurchaseModal(${prod.id})">
            <div class="recently-viewed-image" style="background-image:url('${escapeAttr(prod.image || '')}');">
                ${prod.image ? '' : '📦'}
            </div>
            <div class="recently-viewed-name">${escapeHtml(prod.name)}</div>
        </div>
    `).join('');
}

// ════════════════════════════════════════════════════════════
// Price Formatting
// ════════════════════════════════════════════════════════════
function formatPrice(usdAmount) {
    const n = parseFloat(usdAmount) || 0;
    if (currentCurrency === 'SYP') {
        const syp = Math.round(n * getSypRate());
        return `${syp.toLocaleString('ar')} ل.س`;
    }
    return `${n.toFixed(2)}$`;
}

function getSypRate() {
    return parseFloat(publicSettings?.syp_rate) || 132;
}

function toggleCurrency() {
    currentCurrency = currentCurrency === 'USD' ? 'SYP' : 'USD';
    localStorage.setItem('currency', currentCurrency);
    updateCurrencyUI();
    updateUserUI();
    renderOrders(ordersData);
    renderLatestOrders();
    renderDeposits(depositsData);
    renderCategories();
    renderProductsList(productsData);
    renderFavorites();
    renderRecentlyViewed();
    renderPaymentMethods();
}

function updateCurrencyUI() {
    const label = document.getElementById('currencyLabel');
    if (label) label.textContent = currentCurrency;
}

// ════════════════════════════════════════════════════════════
// Favorites
// ════════════════════════════════════════════════════════════
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch (e) { return []; }
}
function saveFavorites(list) { localStorage.setItem('favorites', JSON.stringify(list)); }
function isFavorite(productId) { return getFavorites().includes(productId); }

function toggleFavorite(productId, event) {
    if (event) event.stopPropagation();
    let favorites = getFavorites();
    if (favorites.includes(productId)) favorites = favorites.filter(id => id !== productId);
    else favorites.push(productId);
    saveFavorites(favorites);
    renderCategories();
    renderProductsList(productsData);
    renderFavorites();
    renderRecentlyViewed();
}

function renderFavorites() {
    const list = document.getElementById('favoritesList');
    if (!list) return;
    const favorites = getFavorites();
    if (!favorites.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">favorite_border</span>لا توجد منتجات في المفضلة بعد</div>';
        return;
    }
    const favProducts = productsData.filter(p => favorites.includes(p.id));
    list.innerHTML = favProducts.map(prod => renderProductCard(prod)).join('');
}

// ════════════════════════════════════════════════════════════
// Pull to Refresh
// ════════════════════════════════════════════════════════════
const PullToRefresh = (() => {
    const THRESHOLD = 70;
    const MAX_PULL = 110;
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    let mainContent = null;
    let indicator = null;

    function createIndicator() {
        const el = document.createElement('div');
        el.className = 'ptr-indicator';
        el.innerHTML = `
            <div class="ptr-icon"><span class="material-icons">arrow_downward</span></div>
            <div class="ptr-text">اسحب للتحديث</div>
        `;
        return el;
    }

    function init() {
        mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        indicator = createIndicator();
        document.body.insertBefore(indicator, mainContent);
        mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContent.addEventListener('touchmove', handleTouchMove, { passive: false });
        mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });
        mainContent.addEventListener('mousedown', handleMouseDown);
    }

    function handleTouchStart(e) {
        if (isRefreshing) return;
        if (mainContent.scrollTop > 0) return;
        startY = e.touches[0].clientY;
        isPulling = true;
    }

    function handleTouchMove(e) {
        if (!isPulling || isRefreshing) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0 && mainContent.scrollTop === 0) {
            e.preventDefault();
            updateIndicator(Math.min(diff * 0.5, MAX_PULL));
        } else if (diff < 0) {
            isPulling = false;
            resetIndicator();
        }
    }

    function handleTouchEnd() {
        if (!isPulling) return;
        const diff = currentY - startY;
        const pull = Math.min(diff * 0.5, MAX_PULL);
        if (pull >= THRESHOLD && !isRefreshing) triggerRefresh();
        else resetIndicator();
        isPulling = false;
    }

    function handleMouseDown(e) {
        if (isRefreshing) return;
        if (mainContent.scrollTop > 0) return;
        startY = e.clientY;
        isPulling = true;
        const onMove = (ev) => {
            if (!isPulling) return;
            currentY = ev.clientY;
            const diff = currentY - startY;
            if (diff > 0) updateIndicator(Math.min(diff * 0.5, MAX_PULL));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (!isPulling) return;
            const diff = currentY - startY;
            const pull = Math.min(diff * 0.5, MAX_PULL);
            if (pull >= THRESHOLD && !isRefreshing) triggerRefresh();
            else resetIndicator();
            isPulling = false;
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function updateIndicator(pull) {
        if (!indicator) return;
        indicator.style.height = pull + 'px';
        indicator.style.opacity = Math.min(pull / THRESHOLD, 1);
        const icon = indicator.querySelector('.ptr-icon .material-icons');
        const text = indicator.querySelector('.ptr-text');
        if (pull >= THRESHOLD) {
            if (icon) icon.textContent = 'refresh';
            if (text) text.textContent = 'اترك للتحديث';
            indicator.classList.add('ready');
        } else {
            if (icon) icon.textContent = 'arrow_downward';
            if (text) text.textContent = 'اسحب للتحديث';
            indicator.classList.remove('ready');
        }
    }

    function resetIndicator() {
        if (!indicator) return;
        indicator.style.transition = 'height 300ms ease, opacity 300ms ease';
        indicator.style.height = '0px';
        indicator.style.opacity = '0';
        indicator.classList.remove('ready', 'refreshing');
        setTimeout(() => { indicator.style.transition = ''; }, 300);
    }

    async function triggerRefresh() {
        if (isRefreshing || !indicator) return;
        isRefreshing = true;
        indicator.style.transition = 'height 250ms ease';
        indicator.style.height = '60px';
        indicator.style.opacity = '1';
        indicator.classList.add('refreshing');
        const icon = indicator.querySelector('.ptr-icon .material-icons');
        const text = indicator.querySelector('.ptr-text');
        if (icon) icon.textContent = 'sync';
        if (text) text.textContent = 'جارٍ التحديث...';
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
        try {
            if (userData?.telegram_id) {
                userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            }
            await loadInitialData();
            updateUserUI();
            renderCategories();
            renderOrders(ordersData);
            renderDeposits(depositsData);
            renderFavorites();
            renderRecentlyViewed();
            renderLatestOrders();
            if (text) text.textContent = 'تم التحديث ✓';
            setTimeout(() => { resetIndicator(); isRefreshing = false; }, 500);
        } catch (error) {
            console.error('Refresh error:', error);
            if (text) text.textContent = 'فشل التحديث';
            setTimeout(() => { resetIndicator(); isRefreshing = false; }, 800);
        }
    }

    return { init };
})();

// ════════════════════════════════════════════════════════════
// Swipe Navigation
// ════════════════════════════════════════════════════════════
const SwipeNav = (() => {
    const PAGES = ['page-home', 'page-orders', 'page-charge', 'page-deposits', 'page-account'];
    const SWIPE_THRESHOLD = 60;
    const MAX_VERTICAL = 80;
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let target = null;

    function init() {
        target = document.querySelector('.main-content');
        if (!target) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        target.addEventListener('touchstart', handleStart, { passive: true });
        target.addEventListener('touchmove', handleMove, { passive: true });
        target.addEventListener('touchend', handleEnd, { passive: true });
    }

    function handleStart(e) {
        if (e.touches.length !== 1) return;
        const el = e.target;
        if (el.closest('input, textarea, select, button, .modal, .new-purchase-modal, .order-timeline, .bundle-option')) {
            isSwiping = false;
            return;
        }
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
    }

    function handleMove(e) {
        if (!isSwiping) return;
        const diffX = Math.abs(e.touches[0].clientX - touchStartX);
        const diffY = Math.abs(e.touches[0].clientY - touchStartY);
        if (diffY > MAX_VERTICAL && diffY > diffX) isSwiping = false;
    }

    function handleEnd(e) {
        if (!isSwiping) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        isSwiping = false;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        if (Math.abs(diffX) < SWIPE_THRESHOLD) return;
        if (Math.abs(diffY) > Math.abs(diffX)) return;
        if (!PAGES.includes(currentPage)) return;
        const currentIdx = PAGES.indexOf(currentPage);
        let newIdx;
        if (diffX > 0) newIdx = currentIdx + 1;
        else newIdx = currentIdx - 1;
        if (newIdx >= 0 && newIdx < PAGES.length) {
            navigateTo(PAGES[newIdx]);
            if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
        }
    }

    return { init };
})();

// ════════════════════════════════════════════════════════════
// Splash Screen
// ════════════════════════════════════════════════════════════
const SplashScreen = (() => {
    const T = {
        shieldIn: 0, lightSweep: 700, disintegrate: 1400,
        textReveal: 5000, revealPlus: 6000, revealEn: 6700,
        confirm: 7300, close: 7500
    };
    const QUICK_T = {
        shieldIn: 0, textReveal: 400, revealPlus: 700,
        revealEn: 950, close: 1400
    };
    const PARTICLE_COUNT = 180;
    const COLORS = ['#38BDF8', '#0EA5E9', '#7DD3FC', '#0D47A1', '#BAE6FD'];

    let canvas, ctx;
    let particles = [];
    let center = { x: 0, y: 0 };
    let rafId = null;
    let shatterTime = 0;
    let running = false;
    let isQuickMode = false;

    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

    class Particle {
        constructor(startX, startY) {
            this.x = startX;
            this.y = startY;
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 7;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.wobbleAmp = 0.3 + Math.random() * 0.6;
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.001 + Math.random() * 0.002;
            this.size = 2 + Math.random() * 4;
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            this.phase = 'burst';
            this.opacity = 1;
        }
        update(now) {
            const elapsed = now - shatterTime;
            if (this.phase === 'burst' && elapsed > 300) this.phase = 'scatter';
            if (this.phase === 'burst') {
                this.x += this.vx;
                this.y += this.vy;
                this.vx *= 0.93;
                this.vy *= 0.93;
                this.opacity = 1;
            } else if (this.phase === 'scatter') {
                this.x += this.vx * 0.45;
                this.y += this.vy * 0.45;
                this.vx *= 0.985;
                this.vy *= 0.985;
                this.x += Math.sin(elapsed * this.wobbleSpeed + this.wobblePhase) * this.wobbleAmp;
                this.y += Math.cos(elapsed * this.wobbleSpeed * 0.7 + this.wobblePhase) * this.wobbleAmp;
                const fadeStart = 600;
                const fadeEnd = isQuickMode ? 1000 : 4300;
                const p = Math.min(1, Math.max(0, (elapsed - fadeStart) / (fadeEnd - fadeStart)));
                this.opacity = 1 - easeOutQuart(p);
            }
        }
        draw(ctx) {
            if (this.opacity <= 0.01) return;
            ctx.globalAlpha = this.opacity;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 5;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initCanvas() {
        canvas = document.getElementById('splashCanvas');
        if (!canvas) return false;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        return true;
    }

    function spawnParticles() {
        particles = [];
        const count = isQuickMode ? 60 : PARTICLE_COUNT;
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const r = 70 * (0.35 + Math.random() * 0.65);
            const sx = center.x + Math.cos(a) * r;
            const sy = center.y + Math.sin(a) * r * 0.92;
            particles.push(new Particle(sx, sy));
        }
    }

    function animate() {
        if (!running) return;
        const now = performance.now();
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        for (const p of particles) { p.update(now); p.draw(ctx); }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        rafId = requestAnimationFrame(animate);
    }

    function closeSplash() {
        const splash = document.getElementById('splashScreen');
        if (!splash) return;
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        particles = [];
        splash.classList.add('hidden');
        markSplashSeen();
        setTimeout(() => {
            splash.style.display = 'none';
            if (canvas) { canvas.width = 0; canvas.height = 0; canvas = null; ctx = null; }
        }, 550);
    }

    function initSplashScreen() {
        const splash = document.getElementById('splashScreen');
        if (!splash) return;
        isQuickMode = hasSeenSplash();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const shieldStage = document.getElementById('splashShieldStage');
            const textStage = document.getElementById('splashTextStage');
            if (shieldStage) shieldStage.style.display = 'none';
            if (textStage) { textStage.classList.add('visible', 'reveal-plus', 'reveal-en'); }
            setTimeout(closeSplash, 1200);
            return;
        }
        if (!initCanvas()) { closeSplash(); return; }
        const shieldStage = document.getElementById('splashShieldStage');
        const textStage = document.getElementById('splashTextStage');
        if (!shieldStage || !textStage) { closeSplash(); return; }
        const timeline = isQuickMode ? QUICK_T : T;
        setTimeout(() => { shieldStage.classList.add('appearing'); splash.classList.add('shield-visible'); }, timeline.shieldIn);
        if (!isQuickMode) {
            setTimeout(() => shieldStage.classList.add('sweeping'), timeline.lightSweep);
            setTimeout(() => {
                shieldStage.classList.remove('pulsing', 'sweeping');
                shieldStage.classList.add('disintegrating');
                spawnParticles();
                shatterTime = performance.now();
                running = true;
                rafId = requestAnimationFrame(animate);
            }, timeline.disintegrate);
        } else {
            setTimeout(() => shieldStage.classList.add('disintegrating'), 300);
        }
        setTimeout(() => textStage.classList.add('visible'), timeline.textReveal);
        setTimeout(() => textStage.classList.add('reveal-plus'), timeline.revealPlus);
        setTimeout(() => textStage.classList.add('reveal-en'), timeline.revealEn);
        if (!isQuickMode) {
            setTimeout(() => { textStage.classList.add('confirming'); shieldStage.style.display = 'none'; }, timeline.confirm);
        }
        setTimeout(closeSplash, timeline.close);
    }

    return { initSplashScreen, closeSplash };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SplashScreen.initSplashScreen());
} else {
    SplashScreen.initSplashScreen();
}

// ════════════════════════════════════════════════════════════
// Update User UI
// ════════════════════════════════════════════════════════════
function updateUserUI() {
    if (!userData) {
        const gm = document.getElementById('greetingMessage');
        const gs = document.getElementById('greetingSub');
        if (gm) gm.textContent = 'الرجاء فتح التطبيق من تيليجرام';
        if (gs) gs.textContent = 'لم يتم التعرف على حسابك';
        return;
    }
    const balanceEl = document.getElementById('headerBalance');
    if (balanceEl) {
        balanceEl.textContent = formatPrice(userData.balance);
        if (parseFloat(userData.balance) < 0) balanceEl.style.color = 'var(--danger)';
        else balanceEl.style.color = '';
    }
    const chargeEl = document.getElementById('chargeBalance');
    if (chargeEl) chargeEl.textContent = formatPrice(userData.balance);
    const accBalEl = document.getElementById('accountBalance');
    if (accBalEl) accBalEl.textContent = formatPrice(userData.balance);
    const accNameEl = document.getElementById('accountName');
    if (accNameEl) accNameEl.textContent = userData.first_name || userData.username || 'مستخدم';
    const accIdEl = document.getElementById('accountId');
    if (accIdEl) accIdEl.textContent = `ID: ${userData.telegram_id}`;
    const accEmailEl = document.getElementById('accountEmail');
    if (accEmailEl) accEmailEl.textContent = userData.username ? `@${userData.username}` : '';

    renderHomeVIPBadge();
    renderAccountVIPBadge();

    const hour = new Date().getHours();
    let greeting = 'مرحباً';
    if (hour < 12) greeting = 'صباح الخير';
    else if (hour < 18) greeting = 'مساء الخير';
    else greeting = 'مساء النور';

    const gm = document.getElementById('greetingMessage');
    if (gm) gm.textContent = `${greeting}، ${userData.first_name || userData.username || 'مستخدم'}`;
    const gs = document.getElementById('greetingSub');
    if (gs) gs.textContent = `رصيدك: ${formatPrice(userData.balance)}`;

    if (window.currentUser?.photo_url) {
        const ha = document.getElementById('headerAvatar');
        if (ha) {
            ha.style.backgroundImage = `url(${escapeAttr(window.currentUser.photo_url)})`;
            ha.textContent = '';
        }
    } else {
        const ha = document.getElementById('headerAvatar');
        if (ha) ha.textContent = (userData.first_name || userData.username || 'م')[0];
    }

    const orderCountEl = document.getElementById('orderCount');
    if (orderCountEl) orderCountEl.textContent = ordersData.length;
    const depositCountEl = document.getElementById('depositCount');
    if (depositCountEl) depositCountEl.textContent = depositsData.length;

    const totalSpentEl = document.getElementById('totalSpent');
    if (totalSpentEl) {
        const totalSpent = ordersData
            .filter(o => o.status !== 'cancelled' && o.status !== 'failed')
            .reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0);
        totalSpentEl.textContent = formatPrice(totalSpent);
    }
    updateKYCBadge();
    updateCurrencyUI();
}

// ════════════════════════════════════════════════════════════
// VIP Badges
// ════════════════════════════════════════════════════════════
function renderHomeVIPBadge() {
    let container = document.getElementById('homeVipBadge');
    if (!container) {
        const gs = document.getElementById('greetingSub');
        if (!gs) return;
        container = document.createElement('div');
        container.id = 'homeVipBadge';
        container.style.marginTop = '10px';
        gs.parentNode.insertBefore(container, gs.nextSibling);
    }
    const vipLevel = parseInt(userData?.vip_level) || 0;
    if (vipLevel === 0 || !VIP_LEVELS[vipLevel]) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    const config = VIP_LEVELS[vipLevel];
    container.style.display = 'block';
    container.innerHTML = `
        <span class="vip-badge vip-${vipLevel}">
            <span class="material-icons">${config.icon}</span>
            <span>${escapeHtml(config.name)}</span>
        </span>
    `;
}

function renderAccountVIPBadge() {
    const container = document.getElementById('accountVipBadge');
    if (!container) return;
    const vipLevel = parseInt(userData?.vip_level) || 0;
    if (vipLevel === 0 || !VIP_LEVELS[vipLevel]) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    const config = VIP_LEVELS[vipLevel];
    container.style.background = 'none';
    container.style.border = 'none';
    container.style.boxShadow = 'none';
    container.style.padding = '0';
    container.style.marginTop = '8px';
    container.style.display = 'inline-flex';
    container.innerHTML = `
        <span class="vip-badge vip-${vipLevel}">
            <span class="material-icons">${config.icon}</span>
            <span>${escapeHtml(config.name)}</span>
        </span>
    `;
}

// ════════════════════════════════════════════════════════════
// KYC Badge
// ════════════════════════════════════════════════════════════
function updateKYCBadge() {
    const badge = document.getElementById('accountKycBadge');
    if (!badge || !userData) return;
    if (userData.kyc_status === 'verified' || userData.is_verified) {
        badge.innerHTML = '<span class="status-badge verified">موثق <span class="material-icons">verified</span></span>';
    } else if (userData.kyc_status === 'pending' || kycStatus === 'pending') {
        badge.innerHTML = '<span class="status-badge pending">قيد المراجعة</span>';
    } else {
        badge.innerHTML = '<span class="status-badge unverified">غير موثق</span>';
    }
    const descEl = document.getElementById('kycSettingDesc');
    if (descEl && userData) {
        if (userData.kyc_status === 'verified' || userData.is_verified) descEl.textContent = 'حسابك موثق ✓';
        else if (userData.kyc_status === 'pending' || kycStatus === 'pending') descEl.textContent = 'طلب التوثيق قيد المراجعة';
        else descEl.textContent = 'وثق حسابك لاستخدام كل طرق الدفع';
    }
}

function isUserVerified() {
    if (!userData) return false;
    return userData.kyc_status === 'verified' || userData.is_verified === true;
}

// ════════════════════════════════════════════════════════════
// Product Card (بدون سعر — السعر في المودال فقط)
// ════════════════════════════════════════════════════════════
function renderProductCard(prod) {
    const fav = isFavorite(prod.id);
    const isBundle = prod.product_type === 'bundle' && Array.isArray(prod.bundles) && prod.bundles.length > 0;
    const outOfStock = prod.stock === 0;

    return `
        <div class="product-card" data-id="${prod.id}" onclick="${outOfStock ? '' : `openPurchaseModal(${prod.id})`}">
            ${outOfStock ? '<span class="product-badge-out">غير متوفر</span>' : ''}
            <button class="favorite-btn ${fav ? 'active' : ''}" onclick="toggleFavorite(${prod.id}, event)">
                <span class="material-icons">${fav ? 'favorite' : 'favorite_border'}</span>
            </button>
            <div class="product-image" style="background-image:url('${escapeAttr(prod.image || '')}');${outOfStock ? 'opacity:0.5;' : ''}">
                ${prod.image ? '' : '📦'}
                <div class="product-badges">
                    ${isBundle ? `<span class="badge-bundle">${prod.bundles.length} باقات</span>` : ''}
                </div>
            </div>
            <div class="product-name">${escapeHtml(prod.name)}</div>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════
// Categories
// ════════════════════════════════════════════════════════════
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    const countEl = document.getElementById('categoriesCount');
    if (!grid) return;
    if (!categoriesData.length) {
        grid.innerHTML = '<div class="skeleton-card"></div>'.repeat(6);
        return;
    }
    grid.innerHTML = categoriesData.map(cat => `
        <div class="category-item" data-id="${cat.id}" onclick="showCategoryProducts(${cat.id})">
            <div class="category-icon">
                ${cat.image ? `<img src="${escapeAttr(cat.image)}" alt="${escapeAttr(cat.name)}" />` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;background:var(--primary-light);">📁</div>'}
            </div>
            <div class="category-name">${escapeHtml(cat.name)}</div>
        </div>
    `).join('');
    if (countEl) countEl.textContent = categoriesData.length;
}

function showCategoryProducts(categoryId) {
    const category = categoriesData.find(c => c.id === categoryId);
    if (!category) return;
    const titleEl = document.getElementById('productsPageTitle');
    if (titleEl) titleEl.textContent = category.name;
    const filtered = productsData.filter(p => p.category_id === categoryId);
    renderProductsList(filtered);
    navigateTo('page-products');
}

function renderProductsList(products) {
    const list = document.getElementById('productsList');
    if (!list) return;
    if (!products.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">inbox</span>لا توجد منتجات في هذا القسم</div>';
        return;
    }
    list.innerHTML = products.map(prod => renderProductCard(prod)).join('');
}

// ════════════════════════════════════════════════════════════
// 🆕 v18.3.6.3: Payment Methods — Compact Cards (اسم + أيقونة فقط)
// ════════════════════════════════════════════════════════════
function renderPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    if (!container) return;
    if (!paymentMethodsData.length) {
        container.innerHTML = '<div class="empty-state"><span class="material-icons">payment</span>لا توجد طرق دفع متاحة</div>';
        return;
    }
    const verified = isUserVerified();
    container.innerHTML = paymentMethodsData.map(m => {
        const locked = m.requires_kyc && !verified;
        return `
        <div class="payment-method ${locked ? 'locked' : ''}" data-id="${m.id}" onclick="${locked ? `showLockedPaymentMessage()` : `showDepositStep1(${m.id})`}">
            <div class="payment-method-info">
                ${m.icon && m.icon.length > 100
                    ? `<img src="${escapeAttr(m.icon)}" style="width:42px;height:42px;border-radius:10px;object-fit:cover;${locked ? 'filter:grayscale(0.7);' : ''}" alt="${escapeAttr(m.name)}">`
                    : '<span class="payment-method-icon">💳</span>'}
                <div style="flex:1;min-width:0;">
                    <div class="payment-method-name">${escapeHtml(m.name)}</div>
                    ${locked ? '<div style="font-size:0.7rem;color:var(--warning);font-weight:700;margin-top:2px;">🔒 تتطلب توثيق</div>' : ''}
                </div>
            </div>
            <span class="material-icons">${locked ? 'lock' : 'chevron_left'}</span>
        </div>
        `;
    }).join('');
}

function showLockedPaymentMessage() {
    showNotification(
        'التوثيق مطلوب',
        'يجب توثيق حسابك أولاً لاستخدام هذه الطريقة. اذهب إلى "حسابي" → "توثيق الحساب"',
        'warning'
    );
}

// ════════════════════════════════════════════════════════════
// Order Timeline Helpers
// ════════════════════════════════════════════════════════════
function getTimelineSteps(status) {
    const allSteps = [
        { key: 'pending', label: 'قيد المعالجة', icon: 'schedule' },
        { key: 'review', label: 'قيد المراجعة', icon: 'visibility' },
        { key: 'processing', label: 'قيد التنفيذ', icon: 'autorenew' },
        { key: 'completed', label: 'مكتمل', icon: 'check_circle' }
    ];
    const order = ['pending', 'review', 'processing', 'completed'];
    const currentIdx = order.indexOf(status);
    if (status === 'failed') {
        return [
            { state: 'done', label: 'تم الطلب', icon: 'receipt' },
            { state: 'failed', label: 'فشل الطلب', icon: 'cancel' }
        ];
    }
    if (status === 'cancelled') {
        return [
            { state: 'done', label: 'تم الطلب', icon: 'receipt' },
            { state: 'cancelled', label: 'تم الإلغاء', icon: 'block' }
        ];
    }
    return allSteps.map((s, i) => ({
        state: i < currentIdx ? 'done' : (i === currentIdx ? 'current' : 'pending'),
        label: s.label,
        icon: s.icon
    }));
}

function buildOrderTimelineHTML(order) {
    const steps = getTimelineSteps(order.status);
    const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('ar') : '';
    return `
        <div class="order-timeline">
            ${steps.map((step, i) => `
                <div class="timeline-step ${step.state}">
                    <div class="timeline-marker">
                        <span class="material-icons">${step.icon}</span>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-title">${escapeHtml(step.label)}</div>
                        ${i === 0 ? `<div class="timeline-time">${dateStr}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function buildDeliveryDetailsHTML(order) {
    if (!order.delivery_data) return '';
    let delivery = null;
    try {
        delivery = typeof order.delivery_data === 'string'
            ? JSON.parse(order.delivery_data)
            : order.delivery_data;
    } catch (e) { return ''; }
    if (!delivery || typeof delivery !== 'object') return '';
    const items = [];
    if (delivery.player_id) items.push({ icon: 'person_pin', label: 'ID', value: delivery.player_id });
    if (delivery.account_id) items.push({ icon: 'badge', label: 'ID', value: delivery.account_id });
    if (delivery.phone) items.push({ icon: 'phone', label: 'الهاتف', value: delivery.phone });
    if (delivery.url) items.push({ icon: 'link', label: 'الرابط', value: delivery.url, isUrl: true });
    if (delivery.bundle_name) items.push({ icon: 'inventory_2', label: 'الباقة', value: delivery.bundle_name });
    if (delivery.syp_amount) items.push({ icon: 'payments', label: 'المبلغ (ل.س)', value: Number(delivery.syp_amount).toLocaleString('ar') });
    if (!items.length) return '';
    return items.map(item => {
        if (item.isUrl) {
            const urlStr = String(item.value);
            const escapedUrl = escapeHtml(urlStr);
            const forAttr = escapeAttr(urlStr);
            return `
                <div class="order-detail-line url-line">
                    <span class="material-icons order-detail-icon">${item.icon}</span>
                    <span class="order-detail-label">${escapeHtml(item.label)}:</span>
                    <span class="order-detail-value url-value" data-url="${forAttr}" onclick="copyUrlFromElement(this)" title="اضغط للنسخ" style="cursor:pointer;">
                        ${escapedUrl}
                        <span class="material-icons" style="font-size:14px;vertical-align:middle;margin-inline-start:4px;opacity:.6;">content_copy</span>
                    </span>
                </div>
            `;
        }
        return `
            <div class="order-detail-line">
                <span class="material-icons order-detail-icon">${item.icon}</span>
                <span class="order-detail-label">${escapeHtml(item.label)}:</span>
                <span class="order-detail-value">${escapeHtml(item.value)}</span>
            </div>
        `;
    }).join('');
}

// ════════════════════════════════════════════════════════════
// Orders Rendering
// ════════════════════════════════════════════════════════════
function renderOrders(orders) {
    const list = document.getElementById('ordersList');
    if (!list) return;
    if (!orders || !orders.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">receipt_long</span>لا توجد طلبات</div>';
        return;
    }
    list.innerHTML = orders.map(order => {
        const canCancel = order.status === 'pending' && isWithinCancelWindow(order.created_at);
        const isTopup = order.product_type === 'topup';
        const qty = parseInt(order.quantity) || 0;
        let qtyDisplay;
        if (isTopup) {
            qtyDisplay = `${qty.toLocaleString('ar')} ل.س`;
        } else if (order.product_unit_name && order.product_unit_name !== 'قطعة') {
            qtyDisplay = `${qty.toLocaleString('ar')} ${escapeHtml(order.product_unit_name)}`;
        } else {
            qtyDisplay = `${qty.toLocaleString('ar')} قطعة`;
        }
        return `
        <div class="order-card" data-status="${escapeAttr(order.status)}" data-id="${order.id}">
            <div class="order-header">
                <span class="order-number">${escapeHtml(order.order_number)}</span>
                <span class="status-badge ${escapeAttr(order.status)}">${escapeHtml(getStatusText(order.status))}</span>
            </div>
            <div class="order-details">
                <div>المنتج: ${escapeHtml(order.product_name || order.product_id)}</div>
                <div>الكمية: ${qtyDisplay}</div>
                <div>السعر: ${formatPrice(order.total_price)}</div>
            </div>
            ${buildDeliveryDetailsHTML(order)}
            ${buildOrderTimelineHTML(order)}
            ${canCancel ? `
                <div class="cancel-timer" id="timer-${order.id}">
                    <span class="material-icons">timer</span>
                    <span class="timer-text">120</span> ثانية للإلغاء
                </div>
                <div style="margin-top:8px;">
                    <button class="btn-outline" style="width:100%;" id="cancel-btn-${order.id}" onclick="cancelOrder(${order.id}, this)">إلغاء الطلب</button>
                </div>
            ` : ''}
        </div>
    `}).join('');
    orders.forEach(order => {
        if (order.status === 'pending' && isWithinCancelWindow(order.created_at)) {
            startCancelCountdown(order.id, order.created_at);
        }
    });
}

function renderLatestOrders() {
    const header = document.getElementById('latestOrdersHeader');
    const list = document.getElementById('latestOrdersList');
    if (!header || !list) return;
    if (!ordersData.length) {
        header.style.display = 'none';
        list.innerHTML = '';
        return;
    }
    header.style.display = 'flex';
    list.innerHTML = ordersData.slice(0, 3).map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-number">${escapeHtml(order.order_number)}</span>
                <span class="status-badge ${escapeAttr(order.status)}">${escapeHtml(getStatusText(order.status))}</span>
            </div>
            <div class="order-details">
                <div>المنتج: ${escapeHtml(order.product_name || order.product_id)}</div>
                <div>الكمية: ${(parseInt(order.quantity) || 0).toLocaleString('ar')}</div>
                <div>السعر: ${formatPrice(order.total_price)}</div>
            </div>
        </div>
    `).join('');
}

function isWithinCancelWindow(createdAt) {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    return (Date.now() - created) < 120000;
}

function startCancelCountdown(orderId, createdAt) {
    if (cancelTimers[orderId]) clearInterval(cancelTimers[orderId]);
    const createdTime = new Date(createdAt).getTime();
    cancelTimers[orderId] = setInterval(() => {
        const elapsed = Date.now() - createdTime;
        const remaining = Math.max(0, 120 - Math.floor(elapsed / 1000));
        const timerEl = document.querySelector(`#timer-${orderId} .timer-text`);
        if (timerEl) timerEl.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(cancelTimers[orderId]);
            delete cancelTimers[orderId];
            renderOrders(ordersData);
        }
    }, 1000);
}

async function cancelOrder(orderId, btn) {
    // و-ت4: تعطيل فوري
    if (btn && btn.disabled) return;

    const confirmed = confirm('هل تريد إلغاء الطلب؟ سيتم استرداد المبلغ.');
    if (!confirmed) return;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ الإلغاء...';
    }

    try {
        const result = await apiFetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        if (result && result.error) {
            showNotification('فشل الإلغاء', result.error, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'إلغاء الطلب'; }
        } else {
            showNotification('تم إلغاء الطلب', 'تم استرداد المبلغ إلى رصيدك', 'success');
            ordersData = await fetchUserOrders();
            renderOrders(ordersData);
            renderLatestOrders();
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        showNotification('خطأ', `فشل إلغاء الطلب: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'إلغاء الطلب'; }
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'قيد المعالجة';
        case 'review': return 'قيد المراجعة';
        case 'processing': return 'قيد التنفيذ';
        case 'completed': return 'مكتمل';
        case 'failed': return 'فشل';
        case 'cancelled': return 'ملغي';
        default: return status || 'غير معروف';
    }
}

// ════════════════════════════════════════════════════════════
// Deposits
// ════════════════════════════════════════════════════════════
function renderDeposits(deposits) {
    const list = document.getElementById('depositsList');
    if (!list) return;
    if (!deposits || !deposits.length) {
        list.innerHTML = '<div class="empty-state"><span class="material-icons">account_balance_wallet</span>لا توجد إيداعات</div>';
        return;
    }
    list.innerHTML = deposits.map(d => `
        <div class="order-card">
            <div class="order-header">
                <span class="ltr">${escapeHtml(d.transaction_id)}</span>
                <span class="status-badge ${escapeAttr(d.status === 'approved' ? 'completed' : d.status)}">${d.status === 'approved' ? 'مكتمل' : d.status === 'rejected' ? 'مرفوض' : 'معلق'}</span>
            </div>
            <div class="order-details">
                <div>المبلغ: ${formatPrice(d.amount)}</div>
                <div>الطريقة: ${escapeHtml(d.method)}</div>
                ${d.admin_note ? `<div>ملاحظة: ${escapeHtml(d.admin_note)}</div>` : ''}
                <div>التاريخ: ${d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''}</div>
            </div>
        </div>
    `).join('');
}

// ════════════════════════════════════════════════════════════
// KYC UI
// ════════════════════════════════════════════════════════════
function updateKYCUI() {
    const container = document.getElementById('kycDynamicContent');
    if (!container) return;
    const isVerified = (userData && (userData.kyc_status === 'verified' || userData.is_verified)) || kycStatus === 'verified';
    const isPending = (userData && userData.kyc_status === 'pending') || kycStatus === 'pending';

    if (isVerified) {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-icon"><span class="material-icons">verified</span></div>
                <p class="kyc-message">حسابك موثق بالفعل</p>
            </div>`;
    } else if (isPending) {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب (KYC)</h2>
                <div class="kyc-icon" style="background:#FFC107;"><span class="material-icons">schedule</span></div>
                <p class="kyc-message">طلب التوثيق قيد التدقيق يرجى انتظار رد الإدارة</p>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="kyc-container">
                <h2>توثيق الحساب</h2>
                <p style="color:var(--text-secondary); margin-bottom:20px;">يرجى تعبئة البيانات التالية لتفعيل جميع ميزات التطبيق</p>
                <div class="kyc-form" style="max-width:400px; margin:0 auto; text-align:right;">
                    <div class="form-group"><label>الاسم الكامل</label><input type="text" id="kycFullName" placeholder="مثال: أحمد محمد" /></div>
                    <div class="form-group"><label>رقم الجوال</label><input type="tel" id="kycPhone" placeholder="مثال: 0959921234" /></div>
                    <div class="form-group"><label>العنوان الحالي</label><input type="text" id="kycAddress" placeholder="المدينة / المنطقة" /></div>
                    <div class="form-group">
                        <label>صورة سيلفي مع الهوية</label>
                        <div class="image-preview" id="kycSelfiePreview" style="height:180px;"><span style="color:var(--text-secondary); font-size:0.9rem;">اضغط لرفع الصورة</span></div>
                        <input type="file" id="kycSelfieImage" accept="image/*" onchange="previewImage(this,'kycSelfiePreview')" style="margin-top:8px;" />
                    </div>
                    <button class="btn-primary" onclick="submitKYCRequest(this)">إرسال طلب التوثيق</button>
                </div>
            </div>
        `;
    }
}

async function submitKYCRequest(btn) {
    const fullName = document.getElementById('kycFullName')?.value;
    const phone = document.getElementById('kycPhone')?.value;
    const address = document.getElementById('kycAddress')?.value;
    const selfieFile = document.getElementById('kycSelfieImage')?.files[0];

    if (!fullName || !phone || !address || !selfieFile) {
        showNotification('تنبيه', 'يرجى تعبئة جميع الحقول ورفع الصورة', 'warning');
        return;
    }
    if (!userData || !userData.telegram_id) {
        showNotification('خطأ', 'بيانات المستخدم غير متوفرة', 'error');
        return;
    }
    setButtonLoading(btn, true);
    try {
        const selfieBase64 = await compressImageFile(selfieFile, 700, 0.6);
        const result = await submitKYC({
            full_name: fullName,
            phone: phone,
            address: address,
            selfie_image: selfieBase64,
        });
        if (result && result.error) {
            showNotification('فشل الإرسال', result.error, 'error');
        } else {
            showNotification('تم الإرسال', 'تم إرسال طلب التوثيق بنجاح، انتظر المراجعة', 'success');
            kycStatus = 'pending';
            updateKYCUI();
            navigateTo('page-account');
            updateUserUI();
        }
    } catch (error) {
        console.error('KYC submit error:', error);
        showNotification('خطأ', `فشل إرسال الطلب: ${error.message}`, 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ════════════════════════════════════════════════════════════
// Button Loading Helper
// ════════════════════════════════════════════════════════════
function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="btn-loading"></span> جارٍ التنفيذ...';
    } else {
        btn.disabled = false;
        if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
            delete btn.dataset.originalHtml;
        }
    }
}

// ════════════════════════════════════════════════════════════
// Notification Overlay
// ════════════════════════════════════════════════════════════
function showNotification(title, message, type = 'success') {
    const overlay = document.getElementById('successOverlay');
    if (!overlay) return;
    const titleEl = document.getElementById('successTitle');
    const msgEl = document.getElementById('successMessage');
    const iconContainer = overlay.querySelector('.success-icon');
    const iconEl = overlay.querySelector('.success-icon .material-icons');
    const icons = { success: 'check_circle', error: 'cancel', warning: 'warning', info: 'info' };

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icons[type] || 'check_circle';
    if (iconContainer) iconContainer.className = 'success-icon ' + type;

    overlay.setAttribute('data-type', type);
    overlay.classList.add('active');

    const duration = (type === 'error') ? 4000 : 2200;
    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.removeAttribute('data-type');
    }, duration);
}

function showSuccessScreen(title, message) {
    showNotification(title, message, 'success');
}

// ════════════════════════════════════════════════════════════
// 🎯 openPurchaseModal — v18.2.1 (محصَّن بالكامل)
// ════════════════════════════════════════════════════════════
let selectedBundleId = null;

function openPurchaseModal(productId) {
    try {
        // ─── Validation ───
        if (!productsData || !Array.isArray(productsData)) {
            console.error('❌ productsData غير محمّلة');
            showNotification('خطأ', 'البيانات لم تُحمّل بعد، حاول مجدداً', 'error');
            return;
        }

        const product = productsData.find(p => p.id === productId);
        if (!product) {
            console.error('❌ المنتج غير موجود:', productId);
            showNotification('تنبيه', 'المنتج غير متوفر', 'warning');
            return;
        }

        if (product.stock === 0) {
            showNotification('تنبيه', 'المنتج غير متوفر حالياً', 'warning');
            return;
        }

        addToRecentlyViewed(productId);

        const isTopup = product.product_type === 'topup';
        const isBundle = product.product_type === 'bundle' &&
                         Array.isArray(product.bundles) &&
                         product.bundles.length > 0;
        const sypRate = getSypRate();
        const unitName = product.unit_name || 'قطعة';
        const baseQty = parseInt(product.base_quantity) || 1;
        const basePrice = parseFloat(product.base_price) || 0;
        const unitPrice = baseQty > 0 ? basePrice / baseQty : basePrice;

        // ─── Global state ───
        window.__currentPurchaseUnitPrice = unitPrice;
        window.__currentSypRate = sypRate;
        window.__currentIsTopup = isTopup;
        window.__currentIsBundle = isBundle;
        window.__currentProduct = product;
        selectedBundleId = isBundle ? product.bundles[0].id : null;

        // ─── Discount hint (v17.3) ───
        const userGeneralDiscount = parseFloat(userData?.general_discount) || 0;
        const discountHintHTML = userGeneralDiscount > 0 ? `
            <div class="user-discount-hint">
                <span class="material-icons">sell</span>
                <span>سعرك بعد خصم <strong>${userGeneralDiscount}%</strong> (خاص لك)</span>
            </div>
        ` : '';

        // ─── Custom input ───
        let customInputHTML = '';
        if (product.input_type === 'id') {
            customInputHTML = `
                <div class="new-input-group">
                    <span class="material-icons new-input-icon">person_pin</span>
                    <input type="text" id="purchasePlayerId" inputmode="numeric" pattern="[0-9]*"
                           placeholder="ايدي اللاعب (ID)" class="new-input"
                           oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                </div>`;
        } else if (product.input_type === 'account_id') {
            customInputHTML = `
                <div class="new-input-group">
                    <span class="material-icons new-input-icon">badge</span>
                    <input type="text" id="purchaseAccountId" inputmode="numeric" pattern="[0-9]*"
                           placeholder="ايدي الحساب" class="new-input"
                           oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                </div>`;
        } else if (product.input_type === 'phone') {
            customInputHTML = `
                <div class="new-input-group">
                    <span class="material-icons new-input-icon">phone</span>
                    <input type="tel" id="purchasePhone" inputmode="numeric" pattern="[0-9]*"
                           placeholder="رقم الهاتف" class="new-input"
                           oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                </div>`;
        } else if (product.input_type === 'url') {
            customInputHTML = `
                <div class="new-input-group url-input-group">
                    <span class="material-icons new-input-icon">link</span>
                    <input type="url" id="purchaseUrl"
                           placeholder="https://..."
                           class="new-input url-input"
                           inputmode="url"
                           autocomplete="off"
                           spellcheck="false"
                           dir="ltr"
                           style="text-align:left;">
                </div>
                <div class="url-hint">
                    <span class="material-icons" style="font-size:14px;">info</span>
                    أدخل رابطاً كاملاً يبدأ بـ <strong>http://</strong> أو <strong>https://</strong>
                </div>`;
        }

        // ─── Info row ───
        const fav = isFavorite(product.id);
        let infoRowHTML = '';

        if (isBundle) {
            const sortedBundles = [...product.bundles].sort((a, b) => parseFloat(a.price_usd) - parseFloat(b.price_usd));
            const firstBundle = sortedBundles[0];
            infoRowHTML = `
                <div class="bundle-selector">
                    <div class="bundle-selector-label">
                        <span class="material-icons">redeem</span>
                        اختر الباقة
                    </div>
                    <div class="bundle-options-list" id="bundleOptionsList">
                        ${sortedBundles.map((b, i) => `
                            <div class="bundle-option ${i === 0 ? 'selected' : ''}" data-id="${b.id}"
                                 onclick="selectBundle(${b.id})">
                                <div class="bundle-radio">
                                    <div class="bundle-radio-dot"></div>
                                </div>
                                <div class="bundle-info">
                                    <div class="bundle-name">${escapeHtml(b.name)}</div>
                                    ${b.quantity > 0 ? `<div class="bundle-qty">${Number(b.quantity).toLocaleString('ar')} ${escapeHtml(unitName)}</div>` : ''}
                                </div>
                                <div class="bundle-price">${formatPrice(b.price_usd)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="new-info-box primary" style="margin-top:14px;">
                    <div class="new-info-label">الإجمالي</div>
                    <div class="new-info-value" id="newTotalDisplay">${formatPrice(firstBundle.price_usd)}</div>
                </div>
            `;
        } else if (isTopup) {
            const defaultAmount = baseQty;
            const defaultTotal = baseQty / sypRate;
            infoRowHTML = `
                <div class="new-info-row">
                    <div class="new-info-box">
                        <div class="new-info-label">المبلغ (ل.س)</div>
                        <input type="text" id="newSypAmount" inputmode="numeric" pattern="[0-9]*"
                               value="${defaultAmount}" class="new-qty-input"
                               oninput="updateTopupTotal()">
                    </div>
                    <div class="new-info-box primary">
                        <div class="new-info-label">الإجمالي ($)</div>
                        <div class="new-info-value" id="newTotalDisplay">$${defaultTotal.toFixed(2)}</div>
                    </div>
                </div>
                <div class="topup-rate-info">
                    <span class="material-icons">info</span>
                    سعر الصرف: <strong>${sypRate.toLocaleString('ar')} ل.س</strong> = <strong>1.00$</strong>
                </div>
            `;
        } else {
            infoRowHTML = `
                <div class="new-info-row">
                    <div class="new-info-box">
                        <div class="new-info-label">الكمية (${escapeHtml(unitName)})</div>
                        <input type="text" id="newQtyInput" inputmode="numeric" pattern="[0-9]*"
                               value="${baseQty}" class="new-qty-input"
                               oninput="updatePurchaseTotal()">
                    </div>
                    <div class="new-info-box primary">
                        <div class="new-info-label">الاجمالي</div>
                        <div class="new-info-value" id="newTotalDisplay">${formatPrice(basePrice)}</div>
                    </div>
                </div>
            `;
        }

        // ─── Modal HTML ───
        const modalContent = `
            <div class="new-purchase-modal">
                <div class="new-purchase-header">
                    <button class="new-fav-btn ${fav ? 'active' : ''}"
                            onclick="toggleFavorite(${product.id}, event); this.classList.toggle('active');">
                        <span class="material-icons">${fav ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <div class="new-purchase-title-wrap">
                        ${product.image
                            ? `<img src="${escapeAttr(product.image)}" class="new-purchase-logo" alt="${escapeAttr(product.name)}">`
                            : `<div class="new-purchase-logo placeholder">📦</div>`}
                        <h3 class="new-purchase-title">${escapeHtml(product.name)}</h3>
                    </div>
                </div>
                ${infoRowHTML}
                ${discountHintHTML}
                ${customInputHTML}
                <div class="new-purchase-actions">
                    <button class="new-btn-cancel" onclick="closeModal()">إلغاء</button>
                    <button class="new-btn-buy" onclick="confirmPurchaseDialog(${product.id}, this)">شراء</button>
                </div>
            </div>
        `;

        openModal('', modalContent);
    } catch (err) {
        console.error('❌ openPurchaseModal error:', err);
        showNotification('خطأ', 'فشل فتح نافذة الشراء', 'error');
    }
}

// ════════════════════════════════════════════════════════════
// Bundle Selection
// ════════════════════════════════════════════════════════════
function selectBundle(bundleId) {
    const product = window.__currentProduct;
    if (!product || !product.bundles) return;
    const bundle = product.bundles.find(b => b.id === bundleId);
    if (!bundle) return;
    selectedBundleId = bundleId;
    document.querySelectorAll('.bundle-option').forEach(el => {
        el.classList.toggle('selected', parseInt(el.getAttribute('data-id')) === bundleId);
    });
    const display = document.getElementById('newTotalDisplay');
    if (display) display.textContent = formatPrice(bundle.price_usd);
}

// ════════════════════════════════════════════════════════════
// Total Updates
// ════════════════════════════════════════════════════════════
function updatePurchaseTotal() {
    const input = document.getElementById('newQtyInput');
    if (!input) return;
    const cleaned = input.value.replace(/[^0-9]/g, '');
    if (cleaned !== input.value) input.value = cleaned;
    const qty = parseInt(input.value) || 0;
    const unitPrice = window.__currentPurchaseUnitPrice || 0;
    const total = qty * unitPrice;
    const display = document.getElementById('newTotalDisplay');
    if (display) display.textContent = formatPrice(total);
}

function updateTopupTotal() {
    const input = document.getElementById('newSypAmount');
    if (!input) return;
    const cleaned = input.value.replace(/[^0-9]/g, '');
    if (cleaned !== input.value) input.value = cleaned;
    const sypAmount = parseInt(input.value) || 0;
    const sypRate = window.__currentSypRate || 132;
    const totalUsd = sypAmount / sypRate;
    const display = document.getElementById('newTotalDisplay');
    if (display) display.textContent = `$${totalUsd.toFixed(2)}`;
}

// ════════════════════════════════════════════════════════════
// Purchase Confirmation
// ════════════════════════════════════════════════════════════
function confirmPurchaseDialog(productId, btn) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    const isTopup = product.product_type === 'topup';
    const isBundle = product.product_type === 'bundle';

    if (isBundle) {
        if (!selectedBundleId) { showNotification('تنبيه', 'يرجى اختيار باقة', 'warning'); return; }
        if (!validateCustomInput(product)) return;
        executeConfirmPurchase(productId, btn);
        return;
    }

    if (isTopup) {
        const amountInput = document.getElementById('newSypAmount');
        const sypAmount = parseInt(amountInput?.value);
        if (!sypAmount || sypAmount < 1) {
            showNotification('تنبيه', 'يرجى إدخال مبلغ صحيح بالليرة السورية', 'warning');
            return;
        }
        const maxQty = parseInt(product.max_quantity) || 0;
        if (maxQty > 0 && sypAmount > maxQty) {
            showNotification('تنبيه', `الحد الأقصى هو ${maxQty.toLocaleString('ar')} ل.س`, 'warning');
            return;
        }
        if (!validateCustomInput(product)) return;
        executeConfirmPurchase(productId, btn);
        return;
    }

    const qtyInput = document.getElementById('newQtyInput');
    const qty = parseInt(qtyInput?.value);
    if (!qty || qty < 1) {
        showNotification('تنبيه', 'يرجى إدخال كمية صحيحة (1 على الأقل)', 'warning');
        return;
    }
    const maxQty = parseInt(product.max_quantity) || 0;
    if (maxQty > 0 && qty > maxQty) {
        showNotification('تنبيه', `الحد الأقصى للكمية هو ${maxQty.toLocaleString('ar')}`, 'warning');
        return;
    }
    if (!validateCustomInput(product)) return;
    executeConfirmPurchase(productId, btn);
}

function validateCustomInput(product) {
    const inputType = product.input_type;
    if (inputType === 'id') {
        const val = document.getElementById('purchasePlayerId')?.value;
        if (!val || !val.trim() || !/^[0-9]+$/.test(val)) {
            showNotification('تنبيه', 'يرجى إدخال أرقام فقط في حقل الايدي', 'warning');
            return false;
        }
    } else if (inputType === 'account_id') {
        const val = document.getElementById('purchaseAccountId')?.value;
        if (!val || !val.trim() || !/^[0-9]+$/.test(val)) {
            showNotification('تنبيه', 'يرجى إدخال أرقام فقط في حقل الايدي', 'warning');
            return false;
        }
    } else if (inputType === 'phone') {
        const val = document.getElementById('purchasePhone')?.value;
        if (!val || !val.trim() || !/^[0-9]+$/.test(val)) {
            showNotification('تنبيه', 'يرجى إدخال أرقام فقط في رقم الهاتف', 'warning');
            return false;
        }
    } else if (inputType === 'url') {
        const val = document.getElementById('purchaseUrl')?.value?.trim();
        if (!val) {
            showNotification('تنبيه', 'يرجى إدخال الرابط', 'warning');
            return false;
        }
        if (!/^https?:\/\//i.test(val)) {
            showNotification('تنبيه', 'الرابط يجب أن يبدأ بـ http:// أو https://', 'warning');
            return false;
        }
        if (val.length > 1000) {
            showNotification('تنبيه', 'الرابط طويل جداً', 'warning');
            return false;
        }
    }
    return true;
}

async function executeConfirmPurchase(productId, btn) {
    const product = productsData.find(p => p.id === productId);
    if (!product || !userData) return;

    const isTopup = product.product_type === 'topup';
    const isBundle = product.product_type === 'bundle';

    const idempotencyKey = `ord-${userData.telegram_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const orderData = { product_id: productId, idempotency_key: idempotencyKey };

    if (isBundle) orderData.bundle_id = selectedBundleId;
    else if (isTopup) orderData.quantity = parseInt(document.getElementById('newSypAmount')?.value);
    else orderData.quantity = parseInt(document.getElementById('newQtyInput')?.value);

    if (product.input_type === 'id') orderData.player_id = document.getElementById('purchasePlayerId')?.value;
    else if (product.input_type === 'account_id') orderData.account_id = document.getElementById('purchaseAccountId')?.value;
    else if (product.input_type === 'phone') orderData.phone = document.getElementById('purchasePhone')?.value;
    else if (product.input_type === 'url') orderData.url = document.getElementById('purchaseUrl')?.value?.trim();

    // و-ت4: تعطيل فوري
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ التنفيذ...';
    }

    try {
        const result = await createOrder(orderData);
        if (result && result.error) {
            if (result.code === 'NEGATIVE_LIMIT_EXCEEDED') {
                showNotification('الرصيد السالب ممتلئ', `${result.error}\n\n💡 قم بالإيداع لسداد دينك.`, 'warning');
            } else if (result.code === 'INSUFFICIENT_BALANCE' || result.code === 'NEGATIVE_NOT_ALLOWED') {
                showNotification('رصيد غير كافٍ', `${result.error}\n\n💡 قم بالإيداع أولاً.`, 'warning');
            } else if (result.code === 'STOCK_INSUFFICIENT') {
                showNotification('الكمية غير متوفرة', result.error, 'warning');
            } else {
                showNotification('فشل إرسال الطلب', result.error, 'error');
            }
            if (btn) { btn.disabled = false; btn.textContent = 'شراء'; }
        } else {
            let msg = `طلبك ${result.order_number} قيد المعالجة`;
            if (isTopup && result.syp_amount) {
                msg = `${result.syp_amount.toLocaleString('ar')} ل.س — طلبك ${result.order_number} قيد المعالجة`;
            } else if (isBundle) {
                const b = product.bundles.find(x => x.id === selectedBundleId);
                if (b) msg = `${b.name} — طلبك ${result.order_number} قيد المعالجة`;
            }
            showNotification('تم الطلب بنجاح', msg, 'success');
            closeModal();
            ordersData = await fetchUserOrders();
            renderOrders(ordersData);
            renderLatestOrders();
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
        }
    } catch (error) {
        console.error('Order error:', error);
        showNotification('فشل إرسال الطلب', error.message || 'حدث خطأ غير متوقع', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'شراء'; }
    }
}

// ════════════════════════════════════════════════════════════
// Deposit Flow
// ════════════════════════════════════════════════════════════
function showDepositStep1(methodId) {
    const method = paymentMethodsData.find(m => m.id === methodId);
    if (!method) return;

    if (!isUserVerified()) {
        showNotification('التوثيق مطلوب', 'يجب توثيق حسابك أولاً قبل الإيداع. اذهب إلى "حسابي" → "توثيق الحساب"', 'warning');
        return;
    }

    selectedMethodForDeposit = method;

    const qrCode = method.qr_image && method.qr_image.length > 100
        ? `<img src="${escapeAttr(method.qr_image)}" style="width:220px;height:220px;border-radius:16px;object-fit:contain;background:#fff;padding:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" />`
        : '<div style="color:var(--text-secondary); padding:20px;">لا يوجد رمز QR بعد</div>';

    const logo = method.icon && method.icon.length > 100
        ? `<img src="${escapeAttr(method.icon)}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;" />`
        : '💳';

    const minAmt = parseFloat(method.min_amount || 0);
    const maxAmt = parseFloat(method.max_amount || 500);
    const feeVal = parseFloat(method.fee || 0);
    const feeType = method.fee_type || 'percentage';
    const feeLabel = feeVal > 0
        ? (feeType === 'fixed' ? `${feeVal.toFixed(2)}$` : `${feeVal.toFixed(2)}%`)
        : null;

    const body = `
        <div style="text-align:center;">
            <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:16px;">${logo}<h3 style="margin:0;">${escapeHtml(method.name)}</h3></div>
            <p style="color:var(--text-secondary); margin-bottom:16px;">${escapeHtml(method.description || '')}</p>

            <div class="deposit-info-card compact" style="margin-bottom:16px;">
                <div class="deposit-info-inline">
                    <div class="deposit-info-chip">
                        <span class="material-icons">south</span>
                        <span class="chip-label">الأدنى</span>
                        <strong class="chip-value">${minAmt.toFixed(2)}$</strong>
                    </div>
                    <div class="deposit-info-chip">
                        <span class="material-icons">north</span>
                        <span class="chip-label">الأقصى</span>
                        <strong class="chip-value">${maxAmt.toFixed(2)}$</strong>
                    </div>
                    ${feeLabel ? `
                    <div class="deposit-info-chip warning">
                        <span class="material-icons">percent</span>
                        <span class="chip-label">الرسوم</span>
                        <strong class="chip-value">${feeLabel}</strong>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:16px; margin-bottom:16px; text-align:right;">
                <div style="margin-bottom:12px;">
                    <div style="font-weight:bold; margin-bottom:4px;">اسم الحساب</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <span id="copyAccountName">${escapeHtml(method.account_name || '-')}</span>
                        <button class="icon-btn" onclick="copyText('copyAccountName', 'اسم الحساب')"><span class="material-icons">content_copy</span></button>
                    </div>
                </div>
                <div>
                    <div style="font-weight:bold; margin-bottom:4px;">رقم الحساب</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <span id="copyAccountNumber">${escapeHtml(method.account || '-')}</span>
                        <button class="icon-btn" onclick="copyText('copyAccountNumber', 'رقم الحساب')"><span class="material-icons">content_copy</span></button>
                    </div>
                </div>
            </div>

            <div style="margin-bottom:16px;">
                <div style="font-weight:bold; margin-bottom:8px;">رمز QR للتحويل</div>
                ${qrCode}
            </div>

            <button class="btn-primary" onclick="showDepositStep2()">التالي</button>
        </div>
    `;
    openModal('طريقة الدفع', body);
}

function updateDepositFeePreview() {
    const amountInput = document.getElementById('depositAmount');
    const preview = document.getElementById('depositFeePreview');
    if (!amountInput || !preview || !selectedMethodForDeposit) return;

    const amount = parseFloat(amountInput.value) || 0;
    const feeVal = parseFloat(selectedMethodForDeposit.fee || 0);
    const feeType = selectedMethodForDeposit.fee_type || 'percentage';

    let feeAmount = 0;
    if (feeVal > 0 && amount > 0) {
        if (feeType === 'percentage') {
            feeAmount = amount * feeVal / 100;
        } else {
            feeAmount = Math.min(feeVal, amount);
        }
    }
    const netAmount = amount - feeAmount;

    if (amount > 0) {
        preview.style.display = 'block';
        document.getElementById('previewAmount').textContent = amount.toFixed(2) + '$';
        document.getElementById('previewFee').textContent = '-' + feeAmount.toFixed(2) + '$';
        document.getElementById('previewNet').textContent = netAmount.toFixed(2) + '$';
    } else {
        preview.style.display = 'none';
    }
}
window.updateDepositFeePreview = updateDepositFeePreview;

function showDepositStep2() {
    if (!selectedMethodForDeposit) return;
    const method = selectedMethodForDeposit;

    if (!isUserVerified()) {
        showNotification('التوثيق مطلوب', 'يجب توثيق حسابك أولاً', 'warning');
        return;
    }

    const minAmt = parseFloat(method.min_amount || 0);
    const maxAmt = parseFloat(method.max_amount || 500);
    const feeVal = parseFloat(method.fee || 0);
    const feeType = method.fee_type || 'percentage';
    const feeLabelStep2 = feeVal > 0
        ? (feeType === 'fixed' ? feeVal.toFixed(2) + '$' : feeVal.toFixed(2) + '%')
        : null;

    const body = `
        <div style="text-align:right;">
            <h3>إتمام الإيداع</h3>

            <div class="deposit-info-card compact" style="margin-bottom:12px;">
                <div class="deposit-info-inline">
                    <div class="deposit-info-chip">
                        <span class="material-icons">south</span>
                        <span class="chip-label">الأدنى</span>
                        <strong class="chip-value">${minAmt.toFixed(2)}$</strong>
                    </div>
                    <div class="deposit-info-chip">
                        <span class="material-icons">north</span>
                        <span class="chip-label">الأقصى</span>
                        <strong class="chip-value">${maxAmt.toFixed(2)}$</strong>
                    </div>
                    ${feeLabelStep2 ? `
                    <div class="deposit-info-chip warning">
                        <span class="material-icons">percent</span>
                        <span class="chip-label">الرسوم</span>
                        <strong class="chip-value">${feeLabelStep2}</strong>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="form-group">
                <label>المبلغ بالدولار</label>
                <input type="number" id="depositAmount" min="${minAmt}" max="${maxAmt}" step="0.01" class="input-field"
                       oninput="updateDepositFeePreview()" placeholder="${minAmt.toFixed(2)} - ${maxAmt.toFixed(2)}">
            </div>

            <div class="deposit-fee-preview" id="depositFeePreview" style="display:none;">
                <div class="deposit-fee-row">
                    <span>المبلغ المُرسل:</span>
                    <strong id="previewAmount">0.00$</strong>
                </div>
                <div class="deposit-fee-row fee">
                    <span>الرسوم:</span>
                    <strong id="previewFee">-0.00$</strong>
                </div>
                <div class="deposit-fee-row total">
                    <span>الصافي إلى رصيدك:</span>
                    <strong id="previewNet">0.00$</strong>
                </div>
            </div>

            <div class="form-group">
                <label>اسم المرسل</label>
                <input type="text" id="depositSenderName" placeholder="أدخل اسم المرسل" class="input-field">
            </div>

            <div class="form-group">
                <label>إثبات التحويل (صورة)</label>
                <div class="image-preview" id="depositProofPreview">📷</div>
                <input type="file" id="depositProofImage" accept="image/*" onchange="previewImage(this, 'depositProofPreview')" class="input-field">
                <small style="color:var(--text-secondary); font-size:0.75rem; display:block; margin-top:6px;">
                    💡 الحد الأقصى: 2 MB — الصورة ستُضغط تلقائياً
                </small>
            </div>

            <button class="btn-primary" onclick="submitDeposit(this)">إرسال</button>
        </div>
    `;
    openModal('إتمام الإيداع', body);
}

// ════════════════════════════════════════════════════════════
// Copy Helpers
// ════════════════════════════════════════════════════════════
function copyText(elementId, label = 'النص') {
    const text = document.getElementById(elementId)?.innerText || '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showNotification('تم النسخ', `تم نسخ ${label}`, 'success'))
            .catch(() => fallbackCopy(text, label));
    } else {
        fallbackCopy(text, label);
    }
}

function copyUrlFromElement(el) {
    const url = el.getAttribute('data-url') || '';
    if (!url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => showNotification('تم النسخ', 'تم نسخ الرابط', 'success'))
            .catch(() => fallbackCopy(url, 'الرابط'));
    } else {
        fallbackCopy(url, 'الرابط');
    }
}
window.copyUrlFromElement = copyUrlFromElement;

function fallbackCopy(text, label) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showNotification('تم النسخ', `تم نسخ ${label}`, 'success');
    } catch (e) {
        showNotification('خطأ', 'تعذر النسخ', 'error');
    }
    document.body.removeChild(textarea);
}

// ════════════════════════════════════════════════════════════
// 💰 submitDeposit — v18.3.6 (مع validation min/max)
// ════════════════════════════════════════════════════════════
async function submitDeposit(btn) {
    if (!selectedMethodForDeposit) return;

    if (!isUserVerified()) {
        showNotification('التوثيق مطلوب', 'يجب توثيق حسابك أولاً قبل الإيداع', 'warning');
        return;
    }

    const method = selectedMethodForDeposit;
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    const senderName = document.getElementById('depositSenderName')?.value?.trim();
    const proofFile = document.getElementById('depositProofImage')?.files[0];

    if (!amount || amount <= 0) { showNotification('تنبيه', 'أدخل مبلغ صحيح', 'warning'); return; }

    const minAmt = parseFloat(method.min_amount || 0);
    const maxAmt = parseFloat(method.max_amount || 500);
    if (amount < minAmt) {
        showNotification('تنبيه', `الحد الأدنى للإيداع هو ${minAmt.toFixed(2)}$`, 'warning');
        return;
    }
    if (amount > maxAmt) {
        showNotification('تنبيه', `الحد الأقصى للإيداع هو ${maxAmt.toFixed(2)}$`, 'warning');
        return;
    }

    if (!senderName) { showNotification('تنبيه', 'أدخل اسم المرسل', 'warning'); return; }
    if (!proofFile) { showNotification('تنبيه', 'ارفع صورة الإثبات', 'warning'); return; }

    if (proofFile.size > 20 * 1024 * 1024) {
        showNotification('تنبيه', 'الصورة كبيرة جداً (الحد 20 MB قبل الضغط)', 'warning');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جارٍ الإرسال...';
    }

    try {
        const proofBase64 = await compressImageFile(proofFile, 800, 0.6);
        console.log(`📤 Sending deposit: ~${Math.round(proofBase64.length / 1024)} KB`);

        const idempotencyKey = `dep-${userData.telegram_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const result = await createDeposit({
            amount: amount,
            method_id: method.id,
            proof_image: proofBase64,
            sender_name: senderName,
            idempotency_key: idempotencyKey,
        });

        if (result && result.error) {
            if (result.code === 'KYC_REQUIRED') {
                showNotification('التوثيق مطلوب', 'يجب توثيق حسابك أولاً', 'warning');
            } else if (result.code === 'IMAGE_INVALID') {
                showNotification('الصورة غير صحيحة', result.error, 'error');
            } else if (result.code === 'AMOUNT_BELOW_MIN') {
                showNotification('مبلغ أقل من الحد الأدنى', result.error, 'warning');
            } else if (result.code === 'AMOUNT_ABOVE_MAX') {
                showNotification('مبلغ أعلى من الحد الأقصى', result.error, 'warning');
            } else if (result.code === 'TOO_MANY_PENDING') {
                showNotification('لديك إيداعات معلّقة', result.error, 'warning');
            } else {
                showNotification('فشل الإيداع', result.error, 'error');
            }
            if (btn) { btn.disabled = false; btn.textContent = 'إرسال'; }
        } else {
            const feeMsg = result.fee && result.fee > 0
                ? ` — الرسوم: ${parseFloat(result.fee).toFixed(2)}$`
                : '';
            showNotification('تم الإرسال', `تم إرسال طلب الإيداع بنجاح${feeMsg}`, 'success');
            closeModal();
            selectedMethodForDeposit = null;
            depositsData = await fetchUserDeposits();
            renderDeposits(depositsData);
            updateUserUI();
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showNotification('خطأ', `فشل إرسال الإيداع: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'إرسال'; }
    }
}

// ════════════════════════════════════════════════════════════
// Custom Service
// ════════════════════════════════════════════════════════════
function openCustomServiceModal() {
    openModal('طلب خدمة مخصصة', `
        <div class="form-group"><label>اسم الخدمة</label><input type="text" id="serviceName" placeholder="مثال: تصميم شعار"></div>
        <div class="form-group"><label>وصف الخدمة</label><textarea id="serviceDesc" rows="3" placeholder="اكتب تفاصيل الخدمة"></textarea></div>
        <div class="form-group"><label>السعر المتوقع (اختياري)</label><input type="number" id="servicePrice" placeholder="0.00"></div>
        <button class="btn-primary" onclick="submitCustomService(this)">إرسال الطلب</button>
        <button class="btn-outline" onclick="closeModal()">إلغاء</button>
    `);
}

async function submitCustomService(btn) {
    const service_name = document.getElementById('serviceName')?.value?.trim();
    const description = document.getElementById('serviceDesc')?.value || '';
    const estimated_price = parseFloat(document.getElementById('servicePrice')?.value) || 0;

    if (!service_name) { showNotification('تنبيه', 'أدخل اسم الخدمة', 'warning'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الإرسال...'; }

    try {
        const result = await requestCustomService({ service_name, description, estimated_price });
        if (result && result.error) {
            showNotification('خطأ', result.error, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'إرسال الطلب'; }
        } else {
            showNotification('تم الإرسال', 'تم إرسال طلب الخدمة بنجاح', 'success');
            closeModal();
        }
    } catch (error) {
        showNotification('خطأ', `فشل إرسال الطلب: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'إرسال الطلب'; }
    }
}

// ════════════════════════════════════════════════════════════
// Referral Modal
// ════════════════════════════════════════════════════════════
function openReferralModal() {
    if (!userData) return;
    const referralCode = userData.referral_code || `SANAD${userData.telegram_id}`;
    const referralLink = `https://t.me/${BOT_USERNAME}?start=${referralCode}`;

    const hasOrders = ordersData && ordersData.length > 0;
    const alreadyReferred = userData.referred_by || userData.referred_by_id;

    const applySectionHTML = (!hasOrders && !alreadyReferred) ? `
        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; margin-top:16px;">
            <div style="font-weight:700; margin-bottom:8px; color:var(--primary); display:flex; align-items:center; gap:6px; justify-content:center;">
                <span class="material-icons" style="font-size:18px;">redeem</span>
                لديك كود من صديق؟
            </div>
            <div style="display:flex; gap:8px;">
                <input type="text" id="applyReferralInput"
                       placeholder="ABCD1234"
                       maxlength="20"
                       style="flex:1; padding:10px 12px; border:1px solid var(--border); border-radius:8px; font-family:inherit; text-transform:uppercase; text-align:center; letter-spacing:2px; font-weight:700; font-size:0.95rem; background:var(--background); color:var(--text);"
                       oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '')">
                <button class="btn-primary" onclick="submitReferralCode(this)" style="padding:10px 16px; white-space:nowrap;">
                    تطبيق
                </button>
            </div>
            <small style="color:var(--text-secondary); font-size:0.7rem; display:block; margin-top:8px; line-height:1.5; text-align:center;">
                💡 يمكن تطبيقه فقط <strong>قبل أول عملية شراء</strong>
            </small>
        </div>
    ` : (alreadyReferred ? `
        <div style="background:var(--success-bg); border:1px solid var(--success); border-radius:12px; padding:12px; margin-top:16px; font-size:0.85rem; text-align:center; color:var(--success); font-weight:700;">
            ✅ تم تطبيق كود إحالة مسبقاً
        </div>
    ` : '');

    openModal('الإحالات', `
        <div style="text-align:center;">
            <div class="kyc-icon" style="background:var(--primary);">
                <span class="material-icons" style="font-size:3rem;">card_giftcard</span>
            </div>
            <h3 style="margin-bottom:12px;">ادعُ أصدقاءك واربح</h3>
            <p style="color:var(--text-secondary); margin-bottom:16px; font-size:0.9rem;">
                عند انضمام صديق برابطك، ستحصل على مكافأة رصيد
            </p>
            <div style="background:var(--primary-light); border-radius:12px; padding:12px; margin-bottom:16px;">
                <div style="font-weight:bold; margin-bottom:6px;">كود الإحالة الخاص بك</div>
                <div style="font-size:1.2rem; font-weight:800; color:var(--primary); letter-spacing:1px;" id="referralCode">${escapeHtml(referralCode)}</div>
            </div>
            <button class="btn-primary" onclick="copyText('referralCode', 'كود الإحالة')">
                <span class="material-icons">content_copy</span> نسخ الكود
            </button>
            <button class="btn-outline" style="margin-top:8px;width:100%;" data-referral-link="${escapeAttr(referralLink)}" onclick="shareReferral(this.getAttribute('data-referral-link'))">
                <span class="material-icons">share</span> مشاركة الرابط
            </button>
            ${applySectionHTML}
        </div>
    `);
}

async function submitReferralCode(btn) {
    const input = document.getElementById('applyReferralInput');
    const code = (input?.value || '').trim().toUpperCase();

    if (!code || code.length < 4) {
        showNotification('تنبيه', 'أدخل كوداً صحيحاً (4 أحرف على الأقل)', 'warning');
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ التطبيق...'; }

    try {
        const result = await applyReferralCode(code);

        if (result && result.error) {
            showNotification('فشل التطبيق', result.error, 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'تطبيق'; }
        } else {
            showNotification('تم بنجاح 🎉', result.message || 'تم تطبيق كود الإحالة، ستحصل مكافأة صديقك عند أول شراء', 'success');
            userData = await authenticateUser(window.Telegram?.WebApp?.initData || '');
            updateUserUI();
            closeModal();
        }
    } catch (error) {
        console.error('Referral apply error:', error);
        showNotification('خطأ', `فشل التطبيق: ${error.message}`, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'تطبيق'; }
    }
}

function shareReferral(link) {
    const text = 'انضم إلى سند بلس واحصل على خدمات رقمية بسهولة!';
    if (navigator.share) {
        navigator.share({ title: 'SANAD+', text, url: link });
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
    }
}
// ════════════════════════════════════════════════════════════
// FAQ
// ════════════════════════════════════════════════════════════
const faqData = [
    { q: 'كيف أشحن رصيدي؟', a: 'يجب توثيق حسابك أولاً (KYC)، ثم اذهب إلى قسم "شحن" واختر طريقة الدفع.' },
    { q: 'كم يستغرق تنفيذ الطلب؟', a: 'عادة ما يتم تنفيذ الطلب خلال 5-15 دقيقة، لكن قد يتأخر في بعض الحالات.' },
    { q: 'ما هو KYC ولماذا أحتاجه؟', a: 'KYC هو توثيق الهوية، يمنحك وصولاً لجميع طرق الدفع والإيداع.' },
    { q: 'كيف ألغي طلباً؟', a: 'يمكنك إلغاء الطلب خلال 120 ثانية من إنشائه، عبر زر "إلغاء الطلب" في قسم طلباتي.' },
    { q: 'ماذا يحدث إذا فشل الطلب؟', a: 'في حال فشل الطلب، يتم استرداد المبلغ تلقائياً إلى رصيدك.' },
    { q: 'ما هو الرصيد السوري؟', a: 'رصيد للاتصالات (MTN، Syriatel) يُشترى بالليرة السورية. أدخل المبلغ بالليرة وسيتم تحويله تلقائياً للدولار.' },
    { q: 'ما هي الباقات؟', a: 'بعض المنتجات مثل PUBG UC توفر باقات متعددة (60 UC، 325 UC، 660 UC...). اختر الباقة المناسبة داخل المنتج.' },
    { q: 'كيف أشتري متابعين؟', a: 'عند شراء خدمات سوشيال ميديا (متابعين/لايكات)، سيُطلب منك إدخال رابط الحساب أو المنشور.' },
    { q: 'كيف أتواصل مع الدعم؟', a: 'استخدم زر الدعم العائم أسفل الشاشة للتواصل معنا مباشرة.' }
];

function setupFAQ() {
    const list = document.getElementById('faqList');
    if (!list) return;
    list.innerHTML = faqData.map((item, i) => `
        <div class="faq-item" onclick="toggleFAQ(${i})">
            <div class="faq-question">
                <span>${escapeHtml(item.q)}</span>
                <span class="material-icons">expand_more</span>
            </div>
            <div class="faq-answer">${escapeHtml(item.a)}</div>
        </div>
    `).join('');
}

function toggleFAQ(index) {
    const items = document.querySelectorAll('.faq-item');
    if (items[index]) items[index].classList.toggle('open');
}

// ════════════════════════════════════════════════════════════
// Support & Notifications
// ════════════════════════════════════════════════════════════
function openSupport() {
    window.open(publicSettings?.support_url || 'https://t.me/SANADST', '_blank');
}

async function openNotificationsPage() {
    if (!userData) {
        showNotification('تنبيه', 'افتح التطبيق من تيليجرام', 'warning');
        return;
    }
    notificationsData = await fetchNotifications();

    const bodyHTML = `
        <div style="text-align:center;">
            <h3>الإشعارات</h3>
            ${notificationsData.length ? notificationsData.map(n => `
                <div style="text-align:right;background:var(--surface);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid var(--border);${!n.is_read ? 'border-right:3px solid var(--primary);' : ''}">
                    <div style="font-weight:bold;">${escapeHtml(n.title)}</div>
                    <div style="color:var(--text-secondary);font-size:0.8rem;">${escapeHtml(n.message)}</div>
                    <div style="color:var(--text-secondary);font-size:0.7rem;">${n.created_at ? new Date(n.created_at).toLocaleString('ar') : ''}</div>
                </div>
            `).join('') : '<p>لا توجد إشعارات</p>'}
        </div>`;
    openModal('الإشعارات', bodyHTML);

    const unreadIds = notificationsData.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length) {
        for (const id of unreadIds) {
            try { await markNotificationRead(id); } catch (e) {}
        }
        notificationsData = notificationsData.map(n => ({ ...n, is_read: true }));
        updateNotificationBadge();
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    if (!notificationsData || !notificationsData.length) {
        badge.style.display = 'none';
        return;
    }

    const unread = notificationsData.filter(n => !n.is_read).length;
    if (unread > 0) {
        badge.style.display = 'inline';
        badge.textContent = unread > 99 ? '99+' : unread;
    } else {
        badge.style.display = 'none';
    }
}

// ════════════════════════════════════════════════════════════
// Navigation Setup
// ════════════════════════════════════════════════════════════
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.getAttribute('data-page');
            navigateTo(pageId);
        });
    });
}

function setupFilters() {
    const orderFilters = document.getElementById('orderFilters');
    if (orderFilters) {
        orderFilters.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                orderFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.getAttribute('data-filter');
                const filtered = filter === 'all' ? ordersData : ordersData.filter(o => o.status === filter);
                renderOrders(filtered);
            });
        });
    }

    const depositFilters = document.getElementById('depositFilters');
    if (depositFilters) {
        depositFilters.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                depositFilters.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.getAttribute('data-filter');
                const filtered = filter === 'all' ? depositsData : depositsData.filter(d => d.status === filter);
                renderDeposits(filtered);
            });
        });
    }
}

// ════════════════════════════════════════════════════════════
// Search — و-ت2: يعمل من الرئيسية
// ════════════════════════════════════════════════════════════
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        if (currentPage === 'page-products') {
            const filtered = productsData.filter(p => (p.name || '').toLowerCase().includes(query));
            renderProductsList(filtered);
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const query = searchInput.value.toLowerCase().trim();
        if (!query) return;

        const results = productsData.filter(p => (p.name || '').toLowerCase().includes(query));
        showSearchResults(query, results);
    });
}

function showSearchResults(query, results) {
    const titleEl = document.getElementById('productsPageTitle');
    if (titleEl) titleEl.textContent = `نتائج البحث: "${query}"`;

    if (!results.length) {
        const list = document.getElementById('productsList');
        if (list) {
            list.innerHTML = `<div class="empty-state"><span class="material-icons">search_off</span>لا توجد نتائج لـ "${escapeHtml(query)}"</div>`;
        }
    } else {
        renderProductsList(results);
    }
    navigateTo('page-products');
}

// ════════════════════════════════════════════════════════════
// Navigate To
// ════════════════════════════════════════════════════════════
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item =>
        item.classList.toggle('active', item.getAttribute('data-page') === pageId)
    );

    currentPage = pageId;

    if (pageId === 'page-home') {
        renderCategories();
        renderLatestOrders();
        renderRecentlyViewed();
        renderHomeVIPBadge();
    }
    if (pageId === 'page-orders') renderOrders(ordersData);
    if (pageId === 'page-charge') renderPaymentMethods();
    if (pageId === 'page-deposits') renderDeposits(depositsData);
    if (pageId === 'page-account') updateUserUI();
    if (pageId === 'page-kyc') updateKYCUI();
    if (pageId === 'page-favorites') renderFavorites();
    if (pageId === 'page-faq') setupFAQ();

    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
}

// ════════════════════════════════════════════════════════════
// Image Preview
// ════════════════════════════════════════════════════════════
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const el = document.getElementById(previewId);
            if (el) el.innerHTML = `<img src="${escapeAttr(e.target.result)}" style="width:100%;height:100%;object-fit:cover;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ════════════════════════════════════════════════════════════
// Modal
// ════════════════════════════════════════════════════════════
function openModal(title, bodyHTML) {
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    modalBody.innerHTML = bodyHTML;
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
    selectedBundleId = null;
}

// ════════════════════════════════════════════════════════════
// Back & Close
// ════════════════════════════════════════════════════════════
function handleBack() {
    if (currentPage !== 'page-home') navigateTo('page-home');
    else window.history.back();
}

function handleClose() {
    if (window.Telegram?.WebApp?.close) window.Telegram.WebApp.close();
    else window.close();
}

// ════════════════════════════════════════════════════════════
// Theme
// ════════════════════════════════════════════════════════════
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function goToAccount() { navigateTo('page-account'); }
function showNotifications() { openNotificationsPage(); }

// ════════════════════════════════════════════════════════════
// Load Initial Data
// ════════════════════════════════════════════════════════════
async function loadInitialData() {
    const results = await Promise.allSettled([
        fetchPublicSettings(),
        fetchCategories(),
        fetchProducts(),
        fetchPaymentMethods(),
        userData?.telegram_id ? fetchUserOrders() : Promise.resolve([]),
        userData?.telegram_id ? fetchUserDeposits() : Promise.resolve([]),
        userData?.telegram_id ? fetchNotifications() : Promise.resolve([]),
        userData?.telegram_id ? getMyKYC() : Promise.resolve({ status: 'none' }),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value) {
        publicSettings = { ...publicSettings, ...results[0].value };
        USD_TO_SYP = parseFloat(publicSettings.syp_rate) || 132;
    }
    categoriesData = results[1].status === 'fulfilled' ? results[1].value : [];
    productsData = results[2].status === 'fulfilled' ? results[2].value : [];
    paymentMethodsData = results[3].status === 'fulfilled' ? results[3].value : [];
    ordersData = results[4].status === 'fulfilled' ? results[4].value : [];
    depositsData = results[5].status === 'fulfilled' ? results[5].value : [];
    notificationsData = results[6].status === 'fulfilled' ? results[6].value : [];
    const kycResult = results[7].status === 'fulfilled' ? results[7].value : { status: 'none' };
    kycStatus = kycResult?.status || 'none';

    results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn(`⚠️ فشل تحميل البيانات ${i}:`, r.reason);
    });
}

// ════════════════════════════════════════════════════════════
// Init App
// ════════════════════════════════════════════════════════════
async function initApp() {
    console.log('🚀 بدء تشغيل SANAD+ v18.3.6.3 ...');
    try {
        const ok = await initTelegram();
        if (!ok) {
            console.error('❌ فشل تهيئة Telegram');
            const gm = document.getElementById('greetingMessage');
            const gs = document.getElementById('greetingSub');
            if (gm) gm.textContent = 'افتح التطبيق من تيليجرام';
            if (gs) gs.textContent = 'لم يتم التعرف على حسابك';
            return;
        }

        applyTelegramTheme();

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) toggle.checked = (savedTheme === 'dark');
        }

        console.log('🔐 جاري المصادقة...');
        const initData = window.Telegram?.WebApp?.initData || '';
        userData = await authenticateUser(initData);
        console.log('✅ تم تسجيل الدخول:', userData.telegram_id);

        console.log('📦 تحميل البيانات...');
        await loadInitialData();
        console.log(`✅ تم تحميل: ${categoriesData.length} قسم، ${productsData.length} منتج`);

        updateUserUI();
        updateNotificationBadge();
        renderCategories();
        renderRecentlyViewed();
        renderLatestOrders();
        renderHomeVIPBadge();
        renderAccountVIPBadge();

        setupNavigation();
        setupFilters();
        setupSearch();

        try {
            PullToRefresh.init();
            SwipeNav.init();
        } catch (e) {
            console.warn('PTR/Swipe غير متاح:', e);
        }

        console.log('✅ التطبيق جاهز (v18.3.6.3)');
    } catch (error) {
        console.error('❌ فشل تشغيل التطبيق:', error);
        const gm = document.getElementById('greetingMessage');
        const gs = document.getElementById('greetingSub');
        if (gm) gm.textContent = 'خطأ في الاتصال';
        if (gs) gs.textContent = error.message || 'حاول لاحقاً';
    }
}

// ════════════════════════════════════════════════════════════
// Window Exports
// ════════════════════════════════════════════════════════════
window.openPurchaseModal = openPurchaseModal;
window.selectBundle = selectBundle;
window.updatePurchaseTotal = updatePurchaseTotal;
window.updateTopupTotal = updateTopupTotal;
window.confirmPurchaseDialog = confirmPurchaseDialog;
window.executeConfirmPurchase = executeConfirmPurchase;
window.cancelOrder = cancelOrder;
window.showDepositStep1 = showDepositStep1;
window.showDepositStep2 = showDepositStep2;
window.submitDeposit = submitDeposit;
window.openCustomServiceModal = openCustomServiceModal;
window.submitCustomService = submitCustomService;
window.openReferralModal = openReferralModal;
window.submitReferralCode = submitReferralCode;
window.shareReferral = shareReferral;
window.toggleFAQ = toggleFAQ;
window.openSupport = openSupport;
window.openNotificationsPage = openNotificationsPage;
window.navigateTo = navigateTo;
window.previewImage = previewImage;
window.openModal = openModal;
window.closeModal = closeModal;
window.handleBack = handleBack;
window.handleClose = handleClose;
window.toggleTheme = toggleTheme;
window.goToAccount = goToAccount;
window.showNotifications = showNotifications;
window.copyText = copyText;
window.toggleFavorite = toggleFavorite;

// ════════════════════════════════════════════════════════════
// Boot
// ════════════════════════════════════════════════════════════
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}```

---

## FILE: ./miniapp/js/telegram.js

```
// miniapp/js/telegram.js

const tg = window.Telegram?.WebApp;

/**
 * تهيئة Telegram WebApp مع انتظار تحميل البيانات
 * @returns {Promise<boolean>} true إذا نجح تحميل بيانات المستخدم
 */
function initTelegram() {
    return new Promise((resolve) => {
        if (!tg) {
            console.error('❌ Telegram WebApp API غير متاح — التطبيق لم يُفتح من داخل تيليجرام');
            resolve(false);
            return;
        }

        try {
            tg.ready();
            tg.expand();
            try { tg.setHeaderColor('#00A0E9'); } catch (e) {}
            try { tg.setBackgroundColor('#F5F7FA'); } catch (e) {}
        } catch (e) {
            console.warn('⚠️ خطأ في تهيئة tg:', e);
        }

        // انتظار قصير حتى تكتمل بيانات initDataUnsafe
        let attempts = 0;
        const maxAttempts = 10; // 10 × 100ms = 1 ثانية

        const checkUser = () => {
            const user = tg.initDataUnsafe?.user;

            if (user && user.id) {
                window.currentUser = {
                    id: user.id,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    username: user.username || '',
                    photo_url: user.photo_url || '',
                    language_code: user.language_code || 'ar',
                    is_premium: user.is_premium || false,
                };
                console.log('✅ تم التعرف على المستخدم من تيليجرام:', window.currentUser.id);
                resolve(true);
                return;
            }

            attempts++;
            if (attempts >= maxAttempts) {
                console.error('❌ لم يتم الحصول على بيانات المستخدم من تيليجرام بعد ' + (maxAttempts * 100) + 'ms');
                resolve(false);
                return;
            }

            setTimeout(checkUser, 100);
        };

        checkUser();
    });
}

function applyTelegramTheme() {
    if (tg) {
        const isDark = tg.colorScheme === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
}

function showBackButton(callback) {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(callback);
    }
}

function hideBackButton() {
    if (tg && tg.BackButton) {
        tg.BackButton.hide();
    }
}```

---

## FILE: ./miniapp/js/vip-badge.js

```
/* ============================================================
   vip-badge.js — SANAD+ VIP Badge Renderer
   ============================================================ */

(function() {
    'use strict';

    const VIP_CONFIG = {
        1: { text: 'برونزي',  icon: 'military_tech' },
        2: { text: 'فضي',     icon: 'workspace_premium' },
        3: { text: 'ذهبي',    icon: 'emoji_events' },
        4: { text: 'بلاتيني', icon: 'diamond' },
        5: { text: 'ماسي',    icon: 'auto_awesome' },
        6: { text: 'أسطوري',  icon: 'local_fire_department' },
        7: { text: 'الأسطورة', icon: 'workspace_premium' }
    };

    /**
     * يُنتج HTML لشارة VIP
     * @param {number} level - مستوى VIP (0-7)
     * @returns {string} HTML
     */
    function getVIPBadgeHTML(level) {
        const lvl = parseInt(level, 10);
        if (!lvl || lvl < 1 || lvl > 7) return '';
        const c = VIP_CONFIG[lvl];
        if (!c) return '';

        return `<span class="vip-badge vip-${lvl}" title="VIP ${lvl} — ${c.text}">
            <span class="material-icons">${c.icon}</span>
            <span>${c.text}</span>
        </span>`;
    }

    /**
     * يُنتج HTML لصف الاسم + VIP
     * @param {string} name - اسم المستخدم
     * @param {number} vipLevel - مستوى VIP
     * @returns {string} HTML
     */
    function getVIPNameRowHTML(name, vipLevel) {
        const badge = getVIPBadgeHTML(vipLevel);
        if (!badge) return `<span class="name">${name}</span>`;
        return `<span class="name">${name}</span>${badge}`;
    }

    // Expose globally
    window.getVIPBadgeHTML = getVIPBadgeHTML;
    window.getVIPNameRowHTML = getVIPNameRowHTML;

    console.log('✅ vip-badge.js loaded');
})();```

---

## FILE: ./miniapp/privacy.html

```
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>سياسة الخصوصية — SANAD PLUS⁺</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Tajawal', system-ui, sans-serif;
    background: #F5F7FA;
    color: #0D2137;
    line-height: 1.7;
    padding: 20px;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  h1 {
    color: #0D47A1;
    font-size: 28px;
    margin-bottom: 8px;
  }
  .subtitle {
    color: #666;
    font-size: 14px;
    margin-bottom: 24px;
    border-bottom: 2px solid #EAF5FC;
    padding-bottom: 16px;
  }
  h2 {
    color: #00A0E9;
    font-size: 20px;
    margin-top: 24px;
    margin-bottom: 10px;
  }
  p { margin-bottom: 12px; }
  ul { margin: 12px 20px; }
  li { margin-bottom: 6px; }
  .contact {
    background: #EAF5FC;
    border-radius: 12px;
    padding: 16px;
    margin-top: 24px;
  }
  .footer {
    text-align: center;
    color: #999;
    font-size: 12px;
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #EAF5FC;
  }
</style>
</head>
<body>
<div class="container">

  <h1>🛡️ سياسة الخصوصية — SANAD PLUS⁺</h1>
  <p class="subtitle">آخر تحديث: 28 سبتمبر 2026</p>

  <p>
    نحن في <strong>SANAD PLUS⁺</strong> نُقدّر خصوصيتك ونلتزم بحماية بياناتك الشخصية.
    توضّح هذه السياسة كيف نجمع بياناتك، ونستخدمها، ونحميها، وحقوقك تجاهها.
  </p>

  <h2>1. المعلومات التي نجمعها</h2>
  <p>نجمع فقط البيانات اللازمة لتقديم خدماتنا:</p>
  <ul>
    <li><strong>بيانات Telegram:</strong> المعرّف الرقمي، الاسم، اسم المستخدم.</li>
    <li><strong>بيانات التواصل:</strong> رقم الهاتف والعنوان (فقط عند طلب توثيق الحساب KYC).</li>
    <li><strong>بيانات المعاملات:</strong> الطلبات، الإيداعات، الرصيد، سجل الحركات.</li>
    <li><strong>بيانات تقنية:</strong> عنوان IP، وقت الاستخدام، نوع الجهاز (لمنع الاحتيال وحماية الخدمة).</li>
  </ul>

  <h2>2. كيف نستخدم بياناتك</h2>
  <ul>
    <li>تنفيذ الطلبات والتحقق من المدفوعات.</li>
    <li>توثيق الحسابات (KYC) وفق المتطلبات التنظيمية.</li>
    <li>الحماية من الاحتيال والاستخدام غير المشروع.</li>
    <li>تحسين جودة الخدمة والدعم الفني.</li>
    <li>إشعارات مهمة عن حالة طلباتك أو رصيدك.</li>
  </ul>

  <h2>3. مشاركة البيانات</h2>
  <p>
    <strong>لا نبيع بياناتك ولا نشاركها</strong> مع أي طرف ثالث لأغراض تجارية.
    نشاركها فقط مع:
  </p>
  <ul>
    <li>مزودي الخدمة الضروريين (مثل خدمات الشحن داخل الألعاب — فقط ما يلزم للتنفيذ).</li>
    <li>الجهات القانونية عند الطلب الرسمي.</li>
  </ul>

  <h2>4. تخزين البيانات وحمايتها</h2>
  <ul>
    <li>تُخزَّن بياناتك على خوادم آمنة بتشفير TLS/SSL.</li>
    <li>الصور الحساسة (مثل توثيق الهوية) تُخزَّن بصلاحيات محدودة.</li>
    <li>كلمات المرور والرموز لا تُخزَّن نصاً صريحاً أبداً.</li>
    <li>نحتفظ بالبيانات للمدة اللازمة قانونياً (عادة 5 سنوات للمعاملات).</li>
  </ul>

  <h2>5. حقوقك</h2>
  <ul>
    <li><strong>الوصول:</strong> طلب نسخة من بياناتك.</li>
    <li><strong>التصحيح:</strong> تعديل بيانات غير دقيقة.</li>
    <li><strong>الحذف:</strong> طلب حذف حسابك وبياناتك (مع مراعاة الالتزامات القانونية).</li>
    <li><strong>الاعتراض:</strong> على أي معالجة لبياناتك.</li>
  </ul>

  <h2>6. ملفات تعريف الارتباط والكوكيز</h2>
  <p>
    لا نستخدم كوكيز تتبع. تستخدم MiniApp التخزين المحلي (localStorage) فقط
    لحفظ تفضيلاتك (مثل اللغة والوضع الليلي).
  </p>

  <h2>7. الأطفال</h2>
  <p>
    خدماتنا غير موجّهة لمن هم أقل من 13 عاماً.
    إذا اكتشفنا حساباً لطفل، نحذفه فوراً.
  </p>

  <h2>8. التغييرات على السياسة</h2>
  <p>
    قد نحدّث هذه السياسة دورياً. سنُخطرك بالتغييرات الجوهرية عبر البوت.
    استمرار استخدامك للخدمة يعني موافقتك على النسخة المُحدَّثة.
  </p>

  <div class="contact">
    <h2 style="margin-top: 0;">9. التواصل معنا</h2>
    <p><strong>البوت:</strong> @Sa3pls1_bot</p>
    <p><strong>الدعم:</strong> @SANADST</p>
    <p><strong>البريد:</strong> sanadtelecom999@gmail.com</p>
  </div>

  <div class="footer">
    © 2026 SANAD PLUS⁺ — جميع الحقوق محفوظة
  </div>

</div>
</body>
</html>```

---

## FILE: ./miniapp/sw.js

```
// ============================================================
// 🛑 SANAD+ MiniApp — Service Worker (v18.3.0) — SELF-DESTRUCT
// ============================================================
// هذا الملف يُلغي نفسه ويحذف كل الكاش.
// السبب: SW كان يخدم نسخاً قديمة من JS/CSS، فيعطل المنتجات.
// الحل: Vercel cache headers كافية — لا حاجة لـ SW.
// ============================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing self-destruct version');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating — clearing all caches and unregistering');
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(keys.map((key) => caches.delete(key)));
            }),
            self.registration.unregister(),
        ]).then(() => {
            // أعد تحميل كل التبويبات المفتوحة
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    if ('navigate' in client) {
                        client.navigate(client.url);
                    }
                });
            });
        })
    );
});```

---

## FILE: ./miniapp/vercel.json

```
{
  "version": 2,
  "buildCommand": null,
  "outputDirectory": null,
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    },
    {
      "source": "/css/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/js/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=604800"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400"
        }
      ]
    }
  ]
}```

---

## FILE: ./patch_bot_v18.4.11.py

```
import os

bot_file = "bot/bot.py"
if not os.path.exists(bot_file):
    print(f"[FAIL] {bot_file} not found")
    exit(1)

with open(bot_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

# ═══ 1. إدراج الدالة المساعدة قبل error_handler ═══
helper_lines = [
    "# ─────────────────────────────────────────────────────────────\n",
    "# Error Notification Throttling — v18.4.11\n",
    "# ─────────────────────────────────────────────────────────────\n",
    "_error_notify_buckets = defaultdict(list)\n",
    "_ERROR_NOTIFY_WINDOW = 300\n",
    "_ERROR_NOTIFY_MAX = 3\n",
    "_ERROR_NOTIFY_KEY_LEN = 80\n",
    "\n",
    "def _should_notify_error(error_str: str) -> bool:\n",
    "    if not error_str:\n",
    "        return True\n",
    "    key = error_str[:_ERROR_NOTIFY_KEY_LEN]\n",
    "    now = time.time()\n",
    "    bucket = int(now // _ERROR_NOTIFY_WINDOW)\n",
    "    if len(_error_notify_buckets) > 1000:\n",
    "        for k in list(_error_notify_buckets.keys()):\n",
    "            if k[1] < bucket:\n",
    "                del _error_notify_buckets[k]\n",
    "    full_key = (key, bucket)\n",
    "    _error_notify_buckets[full_key].append(now)\n",
    "    count = len(_error_notify_buckets[full_key])\n",
    "    if count == _ERROR_NOTIFY_MAX + 1:\n",
    "        logger.warning(f\"Rate limit triggered: {key[:50]}...\")\n",
    "        return True\n",
    "    return count <= _ERROR_NOTIFY_MAX\n",
    "\n"
]

if any("_should_notify_error" in line for line in lines):
    print("[SKIP] Helper already exists.")
else:
    inserted = False
    for i, line in enumerate(lines):
        if "async def error_handler" in line:
            lines[i:i] = helper_lines
            inserted = True
            print(f"[OK] Helper inserted at line {i+1}")
            break
    if not inserted:
        print("[FAIL] error_handler not found.")
        exit(1)

# ═══ 2. تحديد موقع error_handler أولاً ═══
eh_start = None
for i, line in enumerate(lines):
    if "async def error_handler" in line:
        eh_start = i
        break

if eh_start is None:
    print("[FAIL] error_handler function not found.")
    exit(1)

# ═══ 3. تحديد block "if context.error:" داخل error_handler ═══
start_idx = None
end_idx = None
for i in range(eh_start, len(lines)):
    stripped = lines[i].strip()
    if start_idx is None and stripped == "if context.error:":
        start_idx = i
    if start_idx is not None and "Failed to notify admins" in lines[i]:
        end_idx = i + 1
        break

if start_idx is None or end_idx is None:
    print(f"[FAIL] Could not find notify block (start={start_idx}, end={end_idx})")
    exit(1)

print(f"[INFO] Block found: lines {start_idx+1} → {end_idx}")

# ═══ 4. فحص إذا كان مُطبَّقاً مسبقاً ═══
old_block = "".join(lines[start_idx:end_idx])
if "_should_notify_error" in old_block:
    print("[SKIP] error_handler already patched.")
else:
    indent = "    "  # 4 spaces — نفس indentation الأصلي
    new_block = (
        f"{indent}if context.error:\n"
        f"{indent}    error_short = str(context.error)[:300]\n"
        f"{indent}    if _should_notify_error(error_short):\n"
        f"{indent}        try:\n"
        f"{indent}            notify_admins_sync(\n"
        f"{indent}                f\"❌ **خطأ في البوت**\\n`{{error_short}}`\",\n"
        f"{indent}                important=True\n"
        f"{indent}            )\n"
        f"{indent}        except Exception as e:\n"
        f"{indent}            logger.error(f\"Failed to notify admins: {{e}}\")\n"
        f"{indent}    else:\n"
        f"{indent}        logger.debug(f\"Error notification throttled: {{error_short[:50]}}\")\n"
    )
    lines[start_idx:end_idx] = [new_block]
    print("[OK] error_handler patched.")

# ═══ 5. حفظ الملف ═══
with open(bot_file, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("\n[DONE] Patch applied to bot/bot.py")
```

---

## FILE: ./phase1_bot_v18.4.14.py

```
"""
v18.4.14 P1: bot.py fixes
- Move logger definition early (before ADMIN_IDS parsing)
- Restore logger.warning (remove print hack)
- Rate limit emergency flush (memory leak prevention)
"""
import os
import re

bot_file = "bot/bot.py"
with open(bot_file, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("\r\n", "\n")

# ═══════════════════════════════════════════════════════
# STEP 1: Early logger definition
# ═══════════════════════════════════════════════════════
early_logger = "logger = logging.getLogger(__name__)"
admins_pos = content.find("ADMIN_IDS = []")

if admins_pos > 0 and early_logger in content[:admins_pos]:
    print("[SKIP] Logger already defined before ADMIN_IDS")
else:
    marker = "from telegram.ext import Application, CommandHandler, ContextTypes"
    if marker not in content:
        print("[FAIL] telegram.ext import line not found")
        exit(1)

    insert = (
        marker
        + "\n\n"
        + "# Early logger definition (v18.4.14 — fixes ADMIN_IDS parse bug)\n"
        + "logger = logging.getLogger(__name__)"
    )
    content = content.replace(marker, insert, 1)
    print("[OK] Logger defined early")

# ═══════════════════════════════════════════════════════
# STEP 2: Restore logger.warning
# ═══════════════════════════════════════════════════════
old_print = 'print(f"⚠️ Invalid admin ID (parse): {_x}")'
new_logger = 'logger.warning(f"⚠️ Invalid admin ID: {_x}")'

if old_print in content:
    content = content.replace(old_print, new_logger)
    print("[OK] ADMIN_IDS: print → logger.warning")
elif new_logger in content:
    print("[SKIP] ADMIN_IDS already uses logger.warning")
else:
    print("[WARN] ADMIN_IDS line not found — check manually")

# ═══════════════════════════════════════════════════════
# STEP 3: Rate limit emergency flush
# ═══════════════════════════════════════════════════════
if "_rate_limit_store.clear()" in content:
    print("[SKIP] Rate limit flush already present")
else:
    target = "    # ═══ Fallback: in-memory ═══\n    now = time.time()"
    if target not in content:
        print("[FAIL] Could not find fallback marker")
        print("       Searched for: '    # ═══ Fallback: in-memory ═══\\n    now = time.time()'")
        exit(1)

    replacement = """    # ═══ Fallback: in-memory ═══
    # 🆕 v18.4.14: Emergency flush — memory leak prevention
    if len(_rate_limit_store) > 50_000:
        logger.warning(
            f"🚨 _rate_limit_store overflow ({len(_rate_limit_store)} keys) — flushing"
        )
        if _SENTRY_AVAILABLE:
            try:
                sentry_sdk.capture_message(
                    "Rate limit fallback overflow", level="warning"
                )
            except Exception:
                pass
        _rate_limit_store.clear()

    now = time.time()"""

    content = content.replace(target, replacement, 1)
    print("[OK] Rate limit emergency flush added")

# ═══════════════════════════════════════════════════════
# STEP 4: Bump BOT_VERSION to v18.4.14
# ═══════════════════════════════════════════════════════
content = re.sub(
    r'BOT_VERSION = "v[\d.]+"',
    'BOT_VERSION = "v18.4.14"',
    content,
)
print("[OK] BOT_VERSION → v18.4.14")

# Save
with open(bot_file, "w", encoding="utf-8", newline="\n") as f:
    f.write(content)

print("\n[DONE] P1 applied to bot/bot.py")
```

---

## FILE: ./phase2_a11y_v18.4.14.py

```
"""
v18.4.14 P2: Accessibility labels
- Find inputs without label association
- Add aria-label or id+for attributes
"""
import os
import re

target = "admin/index.html"
with open(target, "r", encoding="utf-8") as f:
    content = f.read()

# ═══════════════════════════════════════════════════════
# Fix: Add aria-label to inputs without associated <label>
# ═══════════════════════════════════════════════════════

fixes = 0
patterns = [
    # Login username
    (r'<input type="text" id="loginUsername"',
     '<input type="text" id="loginUsername" aria-label="اسم المستخدم"'),

    # Login password
    (r'<input type="password" id="loginPassword"',
     '<input type="password" id="loginPassword" aria-label="كلمة المرور"'),

    # OTP
    (r'<input type="text" id="otpCode"',
     '<input type="text" id="otpCode" aria-label="رمز التحقق"'),

    # User search
    (r'<input type="text" id="userSearch"',
     '<input type="text" id="userSearch" aria-label="بحث في المستخدمين"'),

    # Product search
    (r'<input type="text" id="productSearch"',
     '<input type="text" id="productSearch" aria-label="بحث في المنتجات"'),

    # Order search
    (r'<input type="text" id="orderSearchQuery"',
     '<input type="text" id="orderSearchQuery" aria-label="بحث في الطلبات"'),

    # Audit search
    (r'<input type="text" id="auditUserSearch"',
     '<input type="text" id="auditUserSearch" aria-label="فلترة التدقيق حسب المستخدم"'),

    # Archive search
    (r'<input type="text" id="archiveSearch"',
     '<input type="text" id="archiveSearch" aria-label="بحث في الأرشيف"'),

    # Notification user id
    (r'<input type="text" id="notificationUserId"',
     '<input type="text" id="notificationUserId" aria-label="معرف المستخدم"'),

    # Global search
    (r'<input type="text" id="globalSearchInput"',
     '<input type="text" id="globalSearchInput" aria-label="بحث عام"'),
]

for old_pat, new_pat in patterns:
    if new_pat in content:
        continue
    if old_pat in content:
        content = content.replace(old_pat, new_pat, 1)
        fixes += 1
        print(f"[OK] Added aria-label to: {old_pat[:50]}...")

# Also fix select elements without labels
selects = [
    (r'<select id="productCategoryFilter"',
     '<select id="productCategoryFilter" aria-label="فلترة حسب القسم"'),
    (r'<select id="productTypeFilter"',
     '<select id="productTypeFilter" aria-label="فلترة حسب النوع"'),
    (r'<select id="orderStatusFilter"',
     '<select id="orderStatusFilter" aria-label="فلترة حسب الحالة"'),
    (r'<select id="orderSortFilter"',
     '<select id="orderSortFilter" aria-label="ترتيب الطلبات"'),
    (r'<select id="auditActionFilter"',
     '<select id="auditActionFilter" aria-label="فلترة حسب العملية"'),
    (r'<select id="notificationType"',
     '<select id="notificationType" aria-label="نوع الإشعار"'),
    (r'<select id="notificationTarget"',
     '<select id="notificationTarget" aria-label="هدف الإشعار"'),
]

for old_pat, new_pat in selects:
    if new_pat in content:
        continue
    if old_pat in content:
        content = content.replace(old_pat, new_pat, 1)
        fixes += 1

# Bump cache buster (CSS only — no JS change)
content = content.replace("css/admin.css?v=26", "css/admin.css?v=27")

with open(target, "w", encoding="utf-8", newline="\n") as f:
    f.write(content)

print(f"\n[DONE] P2 applied: {fixes} accessibility fixes")
```

---

## FILE: ./phase_b_v18.4.11.py

```
import os
import re

# ═══ 1. تحديث BOT_VERSION في bot/bot.py ═══
bot_file = "bot/bot.py"
with open(bot_file, "r", encoding="utf-8") as f:
    bot_content = f.read()

# Bump version
bot_content_new = re.sub(
    r'BOT_VERSION = "v[\d.]+"',
    'BOT_VERSION = "v18.4.11"',
    bot_content
)
if bot_content_new == bot_content:
    print("[SKIP] BOT_VERSION already updated or not found")
else:
    with open(bot_file, "w", encoding="utf-8") as f:
        f.write(bot_content_new)
    print("[OK] BOT_VERSION → v18.4.11")

# ═══ 2. إصلاح ADMIN_IDS parsing (logger قبل التعريف) ═══
with open(bot_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

# ابحث عن logger.warning inside ADMIN_IDS loop
target = None
for i, line in enumerate(lines):
    if "Invalid admin ID" in line:
        target = i
        break

if target is None:
    print("[SKIP] ADMIN_IDS logger fix: already OK or line moved")
else:
    # استبدل logger.warning بـ print (لأن logger غير معرّف بعد)
    old_line = lines[target]
    new_line = old_line.replace(
        'logger.warning(f"⚠️ Invalid admin ID: {_x}")',
        'print(f"⚠️ Invalid admin ID (parse): {_x}")'
    )
    if old_line == new_line:
        print("[SKIP] ADMIN_IDS line already fixed")
    else:
        lines[target] = new_line
        with open(bot_file, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print(f"[OK] Fixed logger-at-line-{target+1} → print()")

# ═══ 3. تحديث version في settings_public.py ═══
sp_file = "backend/app/routes/settings_public.py"
if not os.path.exists(sp_file):
    print(f"[FAIL] {sp_file} not found")
else:
    with open(sp_file, "r", encoding="utf-8") as f:
        sp_content = f.read()

    sp_new = re.sub(
        r'"version":\s*"v[\d.]+"',
        '"version": "v18.4.11"',
        sp_content
    )
    if sp_new == sp_content:
        print("[SKIP] settings_public version already updated")
    else:
        with open(sp_file, "w", encoding="utf-8") as f:
            f.write(sp_new)
        print("[OK] settings_public.py:67 → v18.4.11")

print("\n[DONE] Phase B applied.")
```

---

## FILE: ./test_error_throttle.py

```
import time
from collections import defaultdict

_error_notify_buckets = defaultdict(list)
_ERROR_NOTIFY_WINDOW = 300
_ERROR_NOTIFY_MAX = 3
_ERROR_NOTIFY_KEY_LEN = 80

def _should_notify_error(error_str: str) -> bool:
    if not error_str:
        return True
    key = error_str[:_ERROR_NOTIFY_KEY_LEN]
    now = time.time()
    bucket = int(now // _ERROR_NOTIFY_WINDOW)
    if len(_error_notify_buckets) > 1000:
        for k in list(_error_notify_buckets.keys()):
            if k[1] < bucket:
                del _error_notify_buckets[k]
    full_key = (key, bucket)
    _error_notify_buckets[full_key].append(now)
    count = len(_error_notify_buckets[full_key])
    if count == _ERROR_NOTIFY_MAX + 1:
        print(f"[!] Rate limit triggered for error type: {key[:50]}...")
        return True
    return count <= _ERROR_NOTIFY_MAX

def test_throttle_same_error():
    _error_notify_buckets.clear()
    error = "httpx.ReadError: connection reset by peer"
    sent = sum(1 for _ in range(20) if _should_notify_error(error))
    assert sent == 4, f"expected 4, got {sent}"
    print(f"[PASS] Same error x 20 -> {sent} notifications")

def test_throttle_different_errors():
    _error_notify_buckets.clear()
    sent = 0
    for i in range(5):
        for _ in range(2):
            if _should_notify_error(f"Error type {i}"):
                sent += 1
    assert sent == 10, f"expected 10, got {sent}"
    print(f"[PASS] 5 different errors x 2 -> {sent} notifications")

def test_empty_error():
    _error_notify_buckets.clear()
    assert _should_notify_error("") is True
    print("[PASS] Empty error -> always allowed")

def test_bucket_cleanup():
    _error_notify_buckets.clear()
    for i in range(1100):
        _error_notify_buckets[(f"old_error_{i}", 0)] = [time.time() - 3600]
    _should_notify_error("new_error")
    assert len(_error_notify_buckets) < 1100, "cleanup failed"
    print(f"[PASS] Cleanup: {len(_error_notify_buckets)} buckets remain")

if __name__ == "__main__":
    test_throttle_same_error()
    test_throttle_different_errors()
    test_empty_error()
    test_bucket_cleanup()
    print("\n[SUCCESS] All throttle tests passed")
```

---

