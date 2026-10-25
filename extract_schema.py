import os, sys, subprocess
try:
    import psycopg2
except ImportError:
    print("⏳ Installing psycopg2-binary...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("❌ ERROR: DATABASE_URL not set")
    sys.exit(1)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;")
    tables = [row[0] for row in cur.fetchall()]
    
    with open('schema_dump.txt', 'w', encoding='utf-8') as f:
        for table in tables:
            f.write(f"=== TABLE: {table} ===\n")
            cur.execute("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position;", (table,))
            for col in cur.fetchall():
                f.write(f"  {col[0]} | {col[1]} | Nullable: {col[2]} | Default: {col[3]}\n")
            cur.execute("SELECT tc.constraint_type, kcu.column_name, ccu.table_name, ccu.column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name LEFT JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.table_name = %s;", (table,))
            for con in cur.fetchall():
                f.write(f"  CONSTRAINT: {con[0]} on {con[1]} -> {con[2]}.{con[3]}\n")
            f.write("\n")
            
    with open('row_counts.txt', 'w', encoding='utf-8') as f:
        for table in tables:
            cur.execute(f'SELECT COUNT(*) FROM "{table}";')
            count = cur.fetchone()[0]
            f.write(f"{table}: {count}\n")
    print(f"✅ Success: Extracted {len(tables)} tables to schema_dump.txt")
except Exception as e:
    print(f"❌ Error: {e}")
