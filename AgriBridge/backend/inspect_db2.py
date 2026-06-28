import sqlite3

conn = sqlite3.connect("agribridge.db")
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables)

for t in tables:
    tname = t[0]
    cursor.execute(f"SELECT COUNT(*) FROM {tname}")
    count = cursor.fetchone()[0]
    cursor.execute(f"PRAGMA table_info({tname})")
    cols = [c[1] for c in cursor.fetchall()]
    print(f"  {tname}: {count} rows | columns: {cols}")
    if count > 0 and count <= 5:
        cursor.execute(f"SELECT * FROM {tname} LIMIT 3")
        rows = cursor.fetchall()
        for r in rows:
            print(f"    sample: {r}")

conn.close()
