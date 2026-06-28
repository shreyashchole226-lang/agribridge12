"""
Comprehensive fix for ALL malformed datetime values in agribridge.db.
Only fixes dates - does NOT touch any URLs, names, prices, or other fields.
"""
import sqlite3
import re
from datetime import datetime

DB_PATH = "agribridge.db"

TABLES_WITH_DATES = {
    "users":        ["created_at"],
    "otps":         ["expires_at", "created_at"],
    "products":     ["created_at"],
    "orders":       ["created_at"],
    "reviews":      ["created_at"],
    "messages":     ["created_at"],
    "govt_schemes": ["created_at"],
}

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

total = 0

def is_valid_datetime(val):
    """Check if the value is a valid SQLite datetime string."""
    if not val:
        return True
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    ]
    for fmt in formats:
        try:
            datetime.strptime(str(val).strip(), fmt)
            return True
        except:
            pass
    return False

def repair_datetime(val):
    """Try to repair a bad datetime string."""
    if not val:
        return val
    s = str(val).strip()
    # Fix year typo like 20026 -> 2026
    s = re.sub(r'\b200(\d{2})\b', r'20\1', s)
    # Collapse multiple spaces between date and time
    s = re.sub(r'(\d{4}-\d{2}-\d{2})\s+(\d{2})', r'\1 \2', s)
    # Fix semicolon used instead of colon in time part
    parts = s.split(' ')
    if len(parts) == 2:
        time_part = parts[1].replace(';', ':')
        # Fix truncated microseconds (e.g. .02312 -> .023120)
        time_part = re.sub(r'\.(\d{1,5})$', lambda m: '.' + m.group(1).ljust(6, '0'), time_part)
        s = parts[0] + ' ' + time_part
    return s

for table, cols in TABLES_WITH_DATES.items():
    for col in cols:
        try:
            c.execute(f"SELECT id, {col} FROM {table}")
            rows = c.fetchall()
            for row_id, val in rows:
                if val and not is_valid_datetime(val):
                    fixed = repair_datetime(val)
                    if is_valid_datetime(fixed):
                        c.execute(f"UPDATE {table} SET {col} = ? WHERE id = ?", (fixed, row_id))
                        print(f"  FIXED [{table}] id={row_id}: '{val}' -> '{fixed}'")
                        total += 1
                    else:
                        # Last resort: set to a safe default date
                        safe = "2026-05-08 12:00:00.000000"
                        c.execute(f"UPDATE {table} SET {col} = ? WHERE id = ?", (safe, row_id))
                        print(f"  RESET [{table}] id={row_id}: '{val}' -> '{safe}'")
                        total += 1
        except Exception as e:
            print(f"  Error in {table}.{col}: {e}")

conn.commit()
conn.close()
print(f"\n[DONE] Repaired {total} datetime value(s). agribridge.db is ready.")
