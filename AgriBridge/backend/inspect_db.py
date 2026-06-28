import sqlite3

conn = sqlite3.connect('agribridge.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('=== TABLES ===')
for t in tables:
    print(t[0])

# Print schema and row count for each table
for t in tables:
    tname = t[0]
    print(f'\n=== {tname} SCHEMA ===')
    cursor.execute(f'PRAGMA table_info({tname})')
    cols = cursor.fetchall()
    for col in cols:
        print(col)
    cursor.execute(f'SELECT COUNT(*) FROM {tname}')
    print(f'Row count: {cursor.fetchone()[0]}')

# Print sample data from key tables
print('\n=== PRODUCTS (first 10) ===')
cursor.execute('SELECT id, name, category, retail_price, bulk_price, stock_qty, farmer_id FROM products LIMIT 10')
for row in cursor.fetchall():
    print(row)

print('\n=== USERS ===')
cursor.execute('SELECT id, name, role, location FROM users')
for row in cursor.fetchall():
    print(row)

print('\n=== GOVT SCHEMES ===')
cursor.execute('SELECT id, title, benefit_amount, deadline, ministry FROM govt_schemes')
for row in cursor.fetchall():
    print(row)

print('\n=== ALL PRODUCT NAMES ===')
cursor.execute('SELECT id, name, category FROM products ORDER BY category, name')
for row in cursor.fetchall():
    print(row)

conn.close()
