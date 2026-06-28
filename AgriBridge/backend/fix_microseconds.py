"""
Fixes ALL datetime values in every table by padding microseconds to 6 digits.
Only touches created_at / expires_at columns. Does NOT touch any other field.
"""
import sqlite3
import re

DB_PATH = "agribridge.db"

TABLES = {
    "users":        ["created_at"],
    "otps":         ["expires_at", "created_at"],
    "products":     ["created_at"],
    "orders":       ["created_at"],
    "reviews":      ["created_at"],
    "messages":     ["created_at"],
    "govt_schemes": ["created_at"],
}

def pad_microseconds(val):
    """Ensure microseconds are exactly 6 digits."""
    if not val:
        return val
    s = str(val).strip()
    # Match pattern: YYYY-MM-DD HH:MM:SS.microseconds
    m = re.match(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.(\d+)$', s)
    if m:
        base, micro = m.group(1), m.group(2)
        micro = micro.ljust(6, '0')[:6]  # pad to 6 or truncate to 6
        return f"{base}.{micro}"
    return s

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
total = 0

for table, cols in TABLES.items():
    for col in cols:
        try:
            c.execute(f"SELECT id, {col} FROM {table}")
            rows = c.fetchall()
            for row_id, val in rows:
                fixed = pad_microseconds(val)
                if fixed != val:
                    c.execute(f"UPDATE {table} SET {col} = ? WHERE id = ?", (fixed, row_id))
                    print(f"  [{table}] id={row_id}: '{val}' -> '{fixed}'")
                    total += 1
        except Exception as e:
            print(f"  Skipped {table}.{col}: {e}")

conn.commit()
conn.close()
print(f"\n[DONE] Fixed {total} values. Database is ready.")
