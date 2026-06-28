from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)   # optional now
    email = Column(String, unique=True, index=True, nullable=True)   # primary login identifier
    name = Column(String, nullable=False, default="AgriBridge User")
    role = Column(String, default="consumer")  # farmer | consumer | business | delivery_agent
    location = Column(String, default="")
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    products = relationship("Product", back_populates="farmer")
    orders_placed = relationship("Order", foreign_keys="Order.buyer_id", back_populates="buyer")
    reviews_given = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer")
    messages_sent = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    deliveries_assigned = relationship("Delivery", foreign_keys="Delivery.agent_id", back_populates="agent")


class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True, nullable=True)     # kept for backward compat
    email = Column(String, index=True, nullable=True)     # email-based OTP
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    category = Column(String, default="Vegetable")
    description = Column(Text, default="")
    retail_price = Column(Float, nullable=False)
    bulk_price = Column(Float, nullable=False)
    min_bulk_qty = Column(Integer, default=50)
    unit = Column(String, default="kg")
    stock_qty = Column(Float, default=0)
    image_url = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farmer = relationship("User", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")  # pending | confirmed | shipped | delivered | cancelled
    total_amount = Column(Float, default=0.0)
    order_type = Column(String, default="retail")  # retail | bulk
    delivery_address = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="orders_placed")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    farmer_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="messages_sent")


class GovtScheme(Base):
    __tablename__ = "govt_schemes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    benefit_amount = Column(String, default="")
    eligibility = Column(Text, default="")
    deadline = Column(String, default="")
    ministry = Column(String, default="")
    apply_link = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # pending_assignment | assigned | picked_up | in_transit | delivered | failed
    status = Column(String, default="pending_assignment")
    pickup_address = Column(Text, default="")    # farmer's location
    delivery_address = Column(Text, default="")  # consumer's address
    notes = Column(Text, default="")
    earning = Column(Float, default=50.0)        # ₹ per delivery
    pickup_time = Column(DateTime, nullable=True)
    delivery_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order = relationship("Order", backref="delivery")
    agent = relationship("User", foreign_keys=[agent_id], back_populates="deliveries_assigned")
