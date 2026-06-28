import sqlite3
conn = sqlite3.connect("agribridge.db")
c = conn.cursor()
c.execute("SELECT id, name, image_url FROM products ORDER BY id")
rows = c.fetchall()
print(f"Total products: {len(rows)}\n")
for r in rows:
    print(f"id={r[0]} | {r[1]}")
    print(f"  URL: {r[2]}")
    print()
conn.close()
