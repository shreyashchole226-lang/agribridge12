"""Fix users table — make phone nullable and ensure email column exists."""
from database import engine
import sqlalchemy as sa

with engine.connect() as conn:
    # Show current columns
    result = conn.execute(sa.text("PRAGMA table_info(users)"))
    cols = result.fetchall()
    print("Current users columns:")
    for c in cols:
        print(f"  {c[1]:20s}  notnull={c[3]}")

    # Recreate users table with correct nullable columns
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone VARCHAR UNIQUE,
            email VARCHAR UNIQUE,
            name VARCHAR NOT NULL DEFAULT 'AgriBridge User',
            role VARCHAR DEFAULT 'consumer',
            location VARCHAR DEFAULT '',
            email_verified BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """))

    # Copy data — use COALESCE for new columns that may not exist
    try:
        conn.execute(sa.text("""
            INSERT INTO users_new (id, phone, email, name, role, location, email_verified, created_at)
            SELECT id, phone, email, name, role, location,
                   COALESCE(email_verified, 0),
                   created_at
            FROM users
        """))
    except Exception:
        # Fallback if email/email_verified columns don't exist
        conn.execute(sa.text("""
            INSERT INTO users_new (id, phone, name, role, location, created_at)
            SELECT id, phone, name, role, location, created_at FROM users
        """))

    conn.execute(sa.text("DROP TABLE users"))
    conn.execute(sa.text("ALTER TABLE users_new RENAME TO users"))
    conn.commit()
    print("SUCCESS: users table updated — phone nullable, email supported")
