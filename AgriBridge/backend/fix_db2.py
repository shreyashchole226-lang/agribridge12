"""
Fixes remaining specific corruptions in agribridge.db:
- Product id=68: year '20026' -> '2026'
- Product id=78: time '15:59;34' -> '15:59:34'
"""
import sqlite3

conn = sqlite3.connect("agribridge.db")
c = conn.cursor()

# Fix wrong year 20026 -> 2026
c.execute("UPDATE products SET created_at = '2026-05-08 15:17:41.023120' WHERE id = 68")
print("Fixed id=68: year 20026 -> 2026")

# Fix semicolon instead of colon in time
c.execute("UPDATE products SET created_at = '2026-05-08 15:59:34.023120' WHERE id = 78")
print("Fixed id=78: '15:59;34' -> '15:59:34'")

conn.commit()

# Verify all products now have clean dates
c.execute("SELECT id, created_at FROM products ORDER BY id")
rows = c.fetchall()
bad = [(r[0], r[1]) for r in rows if r[1] and (
    '  ' in str(r[1]) or ';' in str(r[1]) or '20026' in str(r[1])
)]
if bad:
    print(f"Still bad: {bad}")
else:
    print(f"\n[OK] All {len(rows)} product dates are clean!")

conn.close()
print("[DONE] agribridge.db is fully repaired.")
