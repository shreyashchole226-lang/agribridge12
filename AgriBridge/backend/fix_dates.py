import sqlite3

conn = sqlite3.connect('agribridge.db')
cur = conn.cursor()

tables = ['users', 'products', 'orders', 'messages', 'reviews']

for table in tables:
    # Check for rows where created_at is a 4-digit year integer
    cur.execute(f"SELECT COUNT(*) FROM {table} WHERE length(CAST(created_at AS TEXT)) = 4")
    bad = cur.fetchone()[0]
    if bad > 0:
        print(f"{table}: {bad} bad rows, fixing...")
        suffix = "-01-01 00:00:00.000000"
        cur.execute(
            f"UPDATE {table} SET created_at = CAST(created_at AS TEXT) || ? "
            f"WHERE length(CAST(created_at AS TEXT)) = 4",
            (suffix,)
        )
        print(f"  Fixed {cur.rowcount} rows")
    else:
        print(f"{table}: OK")

conn.commit()
conn.close()
print("Done!")
