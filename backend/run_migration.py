import sqlite3
import sys
from pathlib import Path

# Path to database
db_path = "./app/database/data.db"

# Read migration SQL
sql_file = sys.argv[1] if len(sys.argv) > 1 else "migrations/002_add_kling_accounts.sql"
with open(sql_file) as f:
    sql = f.read()

# Execute migration
conn = sqlite3.connect(db_path)
try:
    conn.executescript(sql)
    conn.commit()
    print(f"✅ Migration completed: {sql_file}")
except Exception as e:
    print(f"❌ Migration failed: {e}")
    sys.exit(1)
finally:
    conn.close()
