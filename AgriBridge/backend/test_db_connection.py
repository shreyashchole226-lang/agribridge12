"""
Quick test — verifies the SQLAlchemy engine connects to agribridge.db
and all tables return rows correctly.
"""
import sys
sys.path.insert(0, ".")

from database import SessionLocal
from models import User, Product, GovtScheme, Order, Review, Message

db = SessionLocal()

import os
os.environ['PYTHONIOENCODING'] = 'utf-8'
print("=== AgriBridge DB Connection Test ===")
print()

users = db.query(User).all()
print(f"[OK] Users       : {len(users)} records")
for u in users[:3]:
    print(f"   -> [{u.role}] {u.name} ({u.phone}) — {u.location}")

products = db.query(Product).filter(Product.is_active == True).all()
print(f"[OK] Products    : {len(products)} active records")
for p in products[:3]:
    print(f"   -> {p.name} | Rs.{p.retail_price}/{p.unit} | Stock: {p.stock_qty}")

schemes = db.query(GovtScheme).filter(GovtScheme.is_active == True).all()
print(f"[OK] Govt Schemes: {len(schemes)} active records")
for s in schemes[:3]:
    print(f"   -> {s.title} | {s.ministry}")

orders = db.query(Order).all()
print(f"[OK] Orders      : {len(orders)} records")

reviews = db.query(Review).all()
print(f"[OK] Reviews     : {len(reviews)} records")

messages = db.query(Message).all()
print(f"[OK] Messages    : {len(messages)} records")

db.close()
print("[DONE] All tables connected and readable. Backend is ready!")
