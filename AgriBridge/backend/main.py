from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime
from typing import Optional, List
import base64
import json

from database import engine, get_db, SessionLocal
import models
from models import User, OTP, Product, Order, OrderItem, Review, Message, GovtScheme, Delivery
from auth_utils import generate_otp, get_otp_expiry, is_otp_valid, create_access_token, send_otp_sms
from email_service import send_otp_email, send_order_confirmation_email, generate_otp as gen_email_otp, otp_expiry
from ai_engine import (
    get_fertilizer_advice, diagnose_crop_disease,
    farming_chatbot, get_weather, calculate_transport_cost,
    simulate_farm_crops, detect_farmer_stress, analyze_soil_health,
    predict_seasonal_yield, get_farming_tutorials, key_manager, PROVIDER_LABELS
)
from config import settings
from pydantic import BaseModel, EmailStr

# ─── App Init ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AgriBridge API",
    version="1.0.0",
    description="End-to-End Agri Ecosystem: Commerce, AI Farm Management & Communication"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
models.Base.metadata.create_all(bind=engine)

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    phone: str
    role: Optional[str] = "consumer"
    name: Optional[str] = "AgriBridge User"

class OTPVerify(BaseModel):
    phone: str
    code: str

# ── Email OTP schemas (new) ──────────────────────────────────────────────
class EmailOTPRequest(BaseModel):
    email: str
    role: str = "consumer"          # "farmer" | "consumer"
    name: Optional[str] = ""

class EmailOTPVerify(BaseModel):
    email: str
    code: str
    role: str = "consumer"
    name: Optional[str] = ""
    location: Optional[str] = ""

class ProductCreate(BaseModel):
    name: str
    category: str = "Vegetable"
    description: str = ""
    retail_price: float
    bulk_price: float
    min_bulk_qty: int = 50
    unit: str = "kg"
    stock_qty: float = 0
    image_url: str = ""

class OrderCreate(BaseModel):
    buyer_id: int
    product_id: int
    quantity: float
    order_type: str = "retail"
    delivery_address: str = ""

class ReviewCreate(BaseModel):
    product_id: int
    reviewer_id: int
    farmer_id: int
    rating: int
    comment: str = ""

class MessageCreate(BaseModel):
    sender_id: int
    receiver_id: int
    content: str

class FertilizerRequest(BaseModel):
    farmer_id: int
    crop: str
    soil_type: str
    ph: float
    nitrogen: float
    phosphorus: float
    potassium: float
    area_acres: float

class ChatMessage(BaseModel):
    user_message: str
    conversation_history: Optional[List[dict]] = []

class TransportRequest(BaseModel):
    origin: str
    destination: str
    vehicle_type: str = "truck"

class FarmSimulatorRequest(BaseModel):
    land_size_acres: float
    location: str
    budget_inr: float
    soil_type: str = "Loamy"
    season: str = "Kharif"

class StressDetectorRequest(BaseModel):
    messages: List[dict]             # [{role, content}, ...]
    response_delay_seconds: float = 0.0  # time gap before last farmer message (seconds)

class YieldPredictionRequest(BaseModel):
    crop_type: str = "Vegetable"      # "Vegetable" | "Fruit"
    crop_name: str
    season: str = "Kharif"            # "Kharif" | "Rabi" | "Zaid"
    location: str
    land_size_acres: float = 1.0
    soil_type: str = "Loamy"
    irrigation: str = "Canal"
    variety: Optional[str] = ""

class FarmingTutorialsRequest(BaseModel):
    category: str = "all"       # "home_farming" | "micro_farming" | "organic" | "hydroponics" | "terrace" | "all"
    topic: str = ""             # optional specific topic
    user_level: str = "beginner" # "beginner" | "intermediate" | "advanced"

class DeliveryAssign(BaseModel):
    order_id: int
    agent_id: int

class DeliveryStatusUpdate(BaseModel):
    status: str  # picked_up | in_transit | delivered | failed
    notes: Optional[str] = ""

# ─── Startup: Seed Data ───────────────────────────────────────────────────────

@app.on_event("startup")
async def seed_database():
    db = SessionLocal()
    try:
        # Seed demo users if empty
        if db.query(User).count() == 0:
            users = [
                # ── Farmers (all Pune region) ──
                User(id=1,  phone="9999999901", name="Ramesh Patil",           role="farmer",   location="Pune, Maharashtra"),
                User(id=2,  phone="9999999902", name="Sunita Devi",            role="farmer",   location="Pune, Maharashtra"),
                User(id=4,  phone="9999999904", name="Santosh Jadhav",         role="farmer",   location="Baramati, Pune"),
                User(id=5,  phone="9999999905", name="Mahadev Shinde",         role="farmer",   location="Indapur, Pune"),
                User(id=6,  phone="9999999906", name="Tukaram Pawar",          role="farmer",   location="Shirur, Pune"),
                User(id=7,  phone="9999999907", name="Babanrao Kale",          role="farmer",   location="Daund, Pune"),
                User(id=8,  phone="9999999908", name="Nitin Chavan",           role="farmer",   location="Junnar, Pune"),
                User(id=9,  phone="9999999909", name="Ganesh Bhosale",         role="farmer",   location="Ambegaon, Pune"),
                User(id=10, phone="9999999910", name="Vitthal More",           role="farmer",   location="Mulshi, Pune"),
                User(id=11, phone="9999999911", name="Prakash Gaikwad",        role="farmer",   location="Purandar, Pune"),
                User(id=12, phone="9999999912", name="Suresh Dhumal",          role="farmer",   location="Talegaon Dabhade, Pune"),
                User(id=13, phone="9999999913", name="Ramesh Kendre",          role="farmer",   location="Bhor, Pune"),
                User(id=14, phone="9999999914", name="Dnyaneshwar Jagtap",     role="farmer",   location="Haveli, Pune"),
                User(id=15, phone="9999999915", name="Sunil Thorat",           role="farmer",   location="Saswad, Pune"),
                # ── Consumers ──
                User(id=3,  phone="9999999903", name="Arjun Sharma",           role="consumer", location="Bakul Hall, Pune"),
                User(id=21, phone="9999999921", name="Rohit Deshmukh",         role="consumer", location="Wakad, Pune"),
                User(id=22, phone="9999999922", name="Snehal Patil",           role="consumer", location="Katraj, Pune"),
                User(id=23, phone="9999999923", name="Vaishnavi Kulkarni",     role="consumer", location="Baner, Pune"),
                User(id=24, phone="9999999924", name="Akash Tambe",            role="consumer", location="Sinhagad Road, Pune"),
                User(id=25, phone="9999999925", name="Priya Shingade",         role="consumer", location="Hadapsar, Pune"),
                User(id=26, phone="9999999926", name="Tejaswini More",         role="consumer", location="Viman Nagar, Pune"),
                User(id=27, phone="9999999927", name="Omkar Landge",           role="consumer", location="Nigdi, Pune"),
                # ── B2B Businesses (all Pune) ──
                User(id=16, phone="9999999916", name="Sahyadri Agro Traders",      role="business", location="Market Yard, Pune"),
                User(id=17, phone="9999999917", name="Pune Fresh Farm Supplies",   role="business", location="Hadapsar, Pune"),
                User(id=18, phone="9999999918", name="Shivneri Krushi Seva Kendra",role="business", location="Narayangaon, Pune"),
                User(id=19, phone="9999999919", name="GreenHarvest Agro Solutions",role="business", location="Chakan, Pune"),
                User(id=20, phone="9999999920", name="Maharashtra Organic Bazaar", role="business", location="Kothrud, Pune"),
                # ── Delivery Agents ──
                User(id=31, phone="9999999931", name="Ravi Kumar",                 role="delivery_agent", location="Shivajinagar, Pune"),
                User(id=32, phone="9999999932", name="Sunil Waghmare",             role="delivery_agent", location="Kothrud, Pune"),
                User(id=33, phone="9999999933", name="Pradeep Salve",              role="delivery_agent", location="Hadapsar, Pune"),
                User(id=34, phone="9999999934", name="Amol Bansode",               role="delivery_agent", location="Wakad, Pune"),
            ]
            db.add_all(users)
            db.commit()

        # Seed demo products — add any missing ones by name
        ALL_PRODUCTS = [
            # ── Vegetables ──────────────────────────────────────────────────────
            dict(farmer_id=1,  name="Organic Tomatoes",    category="Vegetable",   retail_price=45.0,  bulk_price=28.0,  min_bulk_qty=100, unit="kg",  stock_qty=500,  description="Farm-fresh organic tomatoes, sun-ripened for best taste",            image_url="https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=400"),
            dict(farmer_id=8,  name="Red Onion",           category="Vegetable",   retail_price=35.0,  bulk_price=22.0,  min_bulk_qty=200, unit="kg",  stock_qty=1200, description="High-quality red onions, pungent and firm — Punjab harvest",       image_url="https://images.unsplash.com/photo-1508747703725-719777637510?w=400"),
            dict(farmer_id=6,  name="Green Chilli",        category="Spice",       retail_price=80.0,  bulk_price=55.0,  min_bulk_qty=50,  unit="kg",  stock_qty=200,  description="Guntur hot green chillies, the king of Indian spices",              image_url="https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400"),
            dict(farmer_id=8,  name="Potato",              category="Vegetable",   retail_price=28.0,  bulk_price=18.0,  min_bulk_qty=200, unit="kg",  stock_qty=3000, description="Fresh Jyoti variety potatoes from Punjab, perfect for all dishes",  image_url="https://images.unsplash.com/photo-1508747703725-719777637510?w=400"),
            dict(farmer_id=2,  name="Cauliflower",         category="Vegetable",   retail_price=40.0,  bulk_price=26.0,  min_bulk_qty=100, unit="kg",  stock_qty=400,  description="White, firm cauliflower heads — freshly harvested",                  image_url="https://images.unsplash.com/photo-1568584711271-6bf7c4bfae6e?w=400"),
            dict(farmer_id=6,  name="Brinjal (Eggplant)",  category="Vegetable",   retail_price=38.0,  bulk_price=24.0,  min_bulk_qty=100, unit="kg",  stock_qty=350,  description="Purple, tender brinjal from Andhra organic farms",                  image_url="https://images.unsplash.com/photo-1608190691954-7e52b4c9fc98?w=400"),
            dict(farmer_id=7,  name="Bitter Gourd",        category="Vegetable",   retail_price=55.0,  bulk_price=38.0,  min_bulk_qty=50,  unit="kg",  stock_qty=180,  description="Crisp bitter gourd from Kerala, rich in vitamins and minerals",     image_url="https://images.unsplash.com/photo-1600003263720-95b45a34d654?w=400"),
            dict(farmer_id=9,  name="Garlic",              category="Spice",       retail_price=120.0, bulk_price=85.0,  min_bulk_qty=50,  unit="kg",  stock_qty=500,  description="Madhya Pradesh garlic, large-clove, pesticide-free",                image_url="https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400"),
            dict(farmer_id=7,  name="Ginger",              category="Spice",       retail_price=90.0,  bulk_price=65.0,  min_bulk_qty=50,  unit="kg",  stock_qty=300,  description="Kerala ginger roots, excellent fragrance and flavour",              image_url="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400"),
            dict(farmer_id=2,  name="Carrot",              category="Vegetable",   retail_price=42.0,  bulk_price=28.0,  min_bulk_qty=100, unit="kg",  stock_qty=600,  description="Nantes variety sweet carrots, bright orange",                        image_url="https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400"),
            dict(farmer_id=2, name="Cabbage",             category="Vegetable",   retail_price=25.0,  bulk_price=16.0,  min_bulk_qty=150, unit="kg",  stock_qty=800,  description="Fresh green cabbage heads, tender and crisp",                        image_url="https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400"),
            dict(farmer_id=1, name="Lady Finger (Okra)",  category="Vegetable",   retail_price=50.0,  bulk_price=34.0,  min_bulk_qty=50,  unit="kg",  stock_qty=220,  description="Tender okra pods, freshly picked each morning",                      image_url="https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400"),
            dict(farmer_id=2, name="Pumpkin",             category="Vegetable",   retail_price=22.0,  bulk_price=14.0,  min_bulk_qty=200, unit="kg",  stock_qty=700,  description="Sweet orange pumpkin, excellent for curries and soups",              image_url="https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400"),
            # ── Fruits ──────────────────────────────────────────────────────────
            dict(farmer_id=2, name="Alphonso Mangoes",    category="Fruit",       retail_price=150.0, bulk_price=95.0,  min_bulk_qty=50,  unit="kg",  stock_qty=300,  description="Premium Alphonso mangoes from Ratnagiri, GI-tagged",                  image_url="https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400"),
            dict(farmer_id=2, name="Banana (Robusta)",    category="Fruit",       retail_price=40.0,  bulk_price=26.0,  min_bulk_qty=100, unit="kg",  stock_qty=1000, description="Ripe Robusta bananas, sweet and energy-rich",                        image_url="https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400"),
            dict(farmer_id=1, name="Pomegranate",         category="Fruit",       retail_price=130.0, bulk_price=90.0,  min_bulk_qty=50,  unit="kg",  stock_qty=250,  description="Bhagwa variety pomegranate, rich red arils",                         image_url="https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=400"),
            dict(farmer_id=2, name="Papaya",              category="Fruit",       retail_price=35.0,  bulk_price=22.0,  min_bulk_qty=100, unit="kg",  stock_qty=500,  description="Red Lady papaya, naturally sweet and nutrient-dense",                 image_url="https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400"),
            dict(farmer_id=1, name="Watermelon",          category="Fruit",       retail_price=18.0,  bulk_price=11.0,  min_bulk_qty=300, unit="kg",  stock_qty=2000, description="Crisp sweet watermelons, perfect for summer",                        image_url="https://images.unsplash.com/photo-1563114773-84221bd62daa?w=400"),
            dict(farmer_id=2, name="Grapes (Thompson)",   category="Fruit",       retail_price=95.0,  bulk_price=68.0,  min_bulk_qty=50,  unit="kg",  stock_qty=400,  description="Seedless Thompson green grapes from Sangli",                         image_url="https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400"),
            dict(farmer_id=1, name="Guava",               category="Fruit",       retail_price=50.0,  bulk_price=33.0,  min_bulk_qty=50,  unit="kg",  stock_qty=300,  description="Allahabad Safeda guava, fragrant and vitamin-C rich",                 image_url="https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=400"),
            # ── Grains & Pulses ─────────────────────────────────────────────────
            dict(farmer_id=1, name="Basmati Rice",        category="Grain",       retail_price=85.0,  bulk_price=60.0,  min_bulk_qty=500, unit="kg",  stock_qty=2000, description="Long-grain aromatic Premium Basmati rice",                           image_url="https://images.unsplash.com/photo-1536304993881-ff86e0c5e11c?w=400"),
            dict(farmer_id=1, name="Wheat (Lokwan)",      category="Grain",       retail_price=32.0,  bulk_price=22.0,  min_bulk_qty=500, unit="kg",  stock_qty=5000, description="Lokwan wheat — India's most popular roti wheat",                     image_url="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400"),
            dict(farmer_id=2, name="Soybean",             category="Grain",       retail_price=58.0,  bulk_price=42.0,  min_bulk_qty=200, unit="kg",  stock_qty=1500, description="Non-GMO yellow soybean, high protein content",                       image_url="https://images.unsplash.com/photo-1571076680736-b8a4e0a1ca60?w=400"),
            dict(farmer_id=1, name="Toor Dal (Pigeon Pea)",category="Pulse",      retail_price=110.0, bulk_price=82.0,  min_bulk_qty=100, unit="kg",  stock_qty=800,  description="Clean split pigeon peas, staple Indian pulse",                       image_url="https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400"),
            dict(farmer_id=2, name="Moong Dal",           category="Pulse",       retail_price=98.0,  bulk_price=72.0,  min_bulk_qty=100, unit="kg",  stock_qty=600,  description="Green moong dal, highly digestible and nutritious",                  image_url="https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400"),
            dict(farmer_id=1, name="Chana Dal",           category="Pulse",       retail_price=92.0,  bulk_price=68.0,  min_bulk_qty=100, unit="kg",  stock_qty=900,  description="Split Bengal gram, nutty flavour and high fibre",                    image_url="https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400"),
            dict(farmer_id=1, name="Jowar (Sorghum)",     category="Grain",       retail_price=40.0,  bulk_price=28.0,  min_bulk_qty=200, unit="kg",  stock_qty=1200, description="Gluten-free sorghum grain, high in iron and calcium",                image_url="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400"),
            # ── Leafy Greens ─────────────────────────────────────────────────────
            dict(farmer_id=2, name="Fresh Spinach",       category="Leafy Green", retail_price=30.0,  bulk_price=18.0,  min_bulk_qty=100, unit="kg",  stock_qty=150,  description="Organic farm spinach, tender dark-green leaves",                     image_url="https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400"),
            dict(farmer_id=2, name="Fenugreek (Methi)",   category="Leafy Green", retail_price=35.0,  bulk_price=22.0,  min_bulk_qty=50,  unit="kg",  stock_qty=120,  description="Fresh methi leaves, slightly bitter and aromatic",                   image_url="https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400"),
            dict(farmer_id=1, name="Coriander (Dhania)",  category="Herb",        retail_price=25.0,  bulk_price=15.0,  min_bulk_qty=50,  unit="kg",  stock_qty=200,  description="Fresh coriander bunches, strong aromatic flavour",                   image_url="https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=400"),
            dict(farmer_id=2, name="Mint (Pudina)",       category="Herb",        retail_price=30.0,  bulk_price=18.0,  min_bulk_qty=30,  unit="kg",  stock_qty=100,  description="Fresh mint leaves for chutney, drinks and garnish",                  image_url="https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400"),
            dict(farmer_id=1, name="Curry Leaves",        category="Herb",        retail_price=60.0,  bulk_price=40.0,  min_bulk_qty=20,  unit="kg",  stock_qty=80,   description="Fresh curry leaves, essential South Indian seasoning",               image_url="https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=400"),
            # ── Spices ──────────────────────────────────────────────────────────
            dict(farmer_id=2, name="Turmeric (Haldi)",    category="Spice",       retail_price=140.0, bulk_price=100.0, min_bulk_qty=50,  unit="kg",  stock_qty=400,  description="Salem variety turmeric fingers, 4%+ curcumin content",               image_url="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400"),
            dict(farmer_id=1, name="Dry Red Chilli",      category="Spice",       retail_price=200.0, bulk_price=145.0, min_bulk_qty=30,  unit="kg",  stock_qty=250,  description="Byadagi variety dry red chilli, vibrant colour and heat",            image_url="https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400"),
            dict(farmer_id=2, name="Cumin Seeds (Jeera)", category="Spice",       retail_price=250.0, bulk_price=190.0, min_bulk_qty=25,  unit="kg",  stock_qty=200,  description="Rajasthani cumin seeds, strong aroma and flavour",                   image_url="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400"),
            dict(farmer_id=1, name="Mustard Seeds",       category="Spice",       retail_price=80.0,  bulk_price=58.0,  min_bulk_qty=50,  unit="kg",  stock_qty=600,  description="Black mustard seeds, essential for Indian tempering",                 image_url="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400"),
            # ── Extra 14 products to reach 50 total ─────────────────────────────
            dict(farmer_id=1, name="Sweet Corn",          category="Vegetable",   retail_price=32.0,  bulk_price=21.0,  min_bulk_qty=100, unit="kg",  stock_qty=450,  description="Fresh golden sweet corn, perfect for roasting and curries",          image_url="https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400"),
            dict(farmer_id=2, name="Drumstick (Moringa)", category="Vegetable",   retail_price=60.0,  bulk_price=42.0,  min_bulk_qty=50,  unit="kg",  stock_qty=180,  description="Fresh moringa drumsticks, rich in vitamins A and C",                  image_url="https://images.unsplash.com/photo-1585159812596-fac104408186?w=400"),
            dict(farmer_id=1, name="Bottle Gourd (Lauki)",category="Vegetable",   retail_price=20.0,  bulk_price=13.0,  min_bulk_qty=100, unit="kg",  stock_qty=600,  description="Tender bottle gourd, light and easily digestible",                    image_url="https://images.unsplash.com/photo-1600003263720-95b45a34d654?w=400"),
            dict(farmer_id=2, name="Raw Banana",          category="Fruit",       retail_price=28.0,  bulk_price=18.0,  min_bulk_qty=100, unit="kg",  stock_qty=400,  description="Raw green bananas, great for chips and curries",                     image_url="https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400"),
            dict(farmer_id=1, name="Pineapple",           category="Fruit",       retail_price=45.0,  bulk_price=30.0,  min_bulk_qty=50,  unit="kg",  stock_qty=300,  description="Sweet Kew pineapples from Assam, juicy and tangy",                    image_url="https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400"),
            dict(farmer_id=2, name="Coconut",             category="Fruit",       retail_price=30.0,  bulk_price=20.0,  min_bulk_qty=200, unit="piece",stock_qty=1000, description="Fresh mature coconuts, rich in water and white flesh",               image_url="https://images.unsplash.com/photo-1580984969071-a8da8e898c4d?w=400"),
            dict(farmer_id=1, name="Muskmelon",           category="Fruit",       retail_price=25.0,  bulk_price=16.0,  min_bulk_qty=100, unit="kg",  stock_qty=500,  description="Sweet aromatic muskmelons, excellent summer fruit",                   image_url="https://images.unsplash.com/photo-1571680322279-a226e6a4cc2a?w=400"),
            dict(farmer_id=2, name="Black Pepper",        category="Spice",       retail_price=350.0, bulk_price=270.0, min_bulk_qty=20,  unit="kg",  stock_qty=150,  description="Kerala black pepper, king of spices, bold flavour",                  image_url="https://images.unsplash.com/photo-1600189261867-30e5ffe7b8da?w=400"),
            dict(farmer_id=1, name="Cardamom (Elaichi)",  category="Spice",       retail_price=1200.0,bulk_price=950.0, min_bulk_qty=10,  unit="kg",  stock_qty=50,   description="Green cardamom pods from Idukki, aromatic and flavourful",            image_url="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400"),
            dict(farmer_id=2, name="Bajra (Pearl Millet)",category="Grain",       retail_price=35.0,  bulk_price=24.0,  min_bulk_qty=200, unit="kg",  stock_qty=2000, description="Nutritious bajra grain, drought-resistant and energy-rich",          image_url="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400"),
            dict(farmer_id=1, name="Maize (Corn)",        category="Grain",       retail_price=22.0,  bulk_price=15.0,  min_bulk_qty=500, unit="kg",  stock_qty=3000, description="Yellow field maize, used for flour, starch and animal feed",         image_url="https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400"),
            dict(farmer_id=2, name="Masoor Dal (Red Lentil)",category="Pulse",    retail_price=88.0,  bulk_price=65.0,  min_bulk_qty=100, unit="kg",  stock_qty=700,  description="Split red lentils, quick-cooking and protein-rich",                  image_url="https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400"),
            dict(farmer_id=1, name="Urad Dal (Black Gram)",category="Pulse",      retail_price=105.0, bulk_price=78.0,  min_bulk_qty=100, unit="kg",  stock_qty=500,  description="Whole black gram, essential for dal makhani and idli batter",        image_url="https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400"),
            dict(farmer_id=2, name="Drumstick Leaves",    category="Leafy Green", retail_price=40.0,  bulk_price=26.0,  min_bulk_qty=30,  unit="kg",  stock_qty=90,   description="Fresh moringa leaves, superfood packed with iron and protein",      image_url="https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400"),
            dict(farmer_id=1, name="Lemon (Nimbu)",       category="Fruit",       retail_price=70.0,  bulk_price=48.0,  min_bulk_qty=50,  unit="kg",    stock_qty=400,  description="Juicy Kagzi lemons, high acidity and refreshing aroma",             image_url="https://images.unsplash.com/photo-1582087439450-6fc660faab1a?w=400"),
            # ── Dairy ──────────────────────────────────────────────────────────
            dict(farmer_id=2, name="Milk",                category="Dairy",       retail_price=58.0,  bulk_price=49.0,  min_bulk_qty=20,  unit="litre", stock_qty=50,   description="Fresh cow milk, pure and nutritious, delivered daily",               image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400"),
            dict(farmer_id=2, name="Cow Milk",            category="Dairy",       retail_price=75.0,  bulk_price=65.0,  min_bulk_qty=20,  unit="litre", stock_qty=50,   description="Pure Gir cow milk, rich in A2 protein and natural fat",             image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400"),
            dict(farmer_id=1, name="Buffalo Milk",        category="Dairy",       retail_price=80.0,  bulk_price=71.0,  min_bulk_qty=20,  unit="litre", stock_qty=26,   description="Creamy buffalo milk, high-fat content ideal for making sweets",     image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400"),
            dict(farmer_id=1, name="Toned Milk",          category="Dairy",       retail_price=59.0,  bulk_price=53.0,  min_bulk_qty=50,  unit="litre", stock_qty=49,   description="Standardized toned milk, low fat, ideal for everyday use",          image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400"),
            dict(farmer_id=1, name="Full Cream Milk",     category="Dairy",       retail_price=89.0,  bulk_price=83.0,  min_bulk_qty=20,  unit="litre", stock_qty=20,   description="Rich full cream milk with all natural fats preserved",              image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400"),
            dict(farmer_id=2, name="Curd (Dahi)",         category="Dairy",       retail_price=23.0,  bulk_price=18.0,  min_bulk_qty=10,  unit="kg",    stock_qty=10,   description="Fresh homemade curd, thick and creamy, perfect for summer",         image_url="https://images.unsplash.com/photo-1571167366136-b57e07f69082?w=400"),
            dict(farmer_id=1, name="Butter",              category="Dairy",       retail_price=230.0, bulk_price=198.0, min_bulk_qty=5,   unit="kg",    stock_qty=998,  description="Fresh white butter churned from cream, pure and natural",           image_url="https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400"),
            dict(farmer_id=2, name="Ghee",                category="Dairy",       retail_price=250.0, bulk_price=230.0, min_bulk_qty=5,   unit="kg",    stock_qty=10,   description="Pure desi ghee made from cow milk, aromatic and golden",            image_url="https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400"),
            dict(farmer_id=1, name="Paneer",              category="Dairy",       retail_price=80.0,  bulk_price=75.0,  min_bulk_qty=5,   unit="kg",    stock_qty=10,   description="Soft fresh paneer made daily, perfect for curries and grills",      image_url="https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400"),
            dict(farmer_id=2, name="Cheese",              category="Dairy",       retail_price=110.0, bulk_price=98.0,  min_bulk_qty=5,   unit="kg",    stock_qty=10,   description="Natural farm cheese, mild and creamy, great for cooking",          image_url="https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"),
            dict(farmer_id=1, name="Buttermilk",          category="Dairy",       retail_price=43.0,  bulk_price=35.0,  min_bulk_qty=10,  unit="litre", stock_qty=10,   description="Chilled spiced buttermilk (chaas), refreshing summer drink",        image_url="https://images.unsplash.com/photo-1571167366136-b57e07f69082?w=400"),
        ]
        existing_names = {p.name for p in db.query(Product).all()}
        new_products = [
            Product(**p) for p in ALL_PRODUCTS if p["name"] not in existing_names
        ]
        if new_products:
            db.add_all(new_products)
            db.commit()


        # ── Fix product image URLs (runs every startup to keep images correct) ──
        IMAGE_FIXES = {
            "Organic Tomatoes":     "https://images.unsplash.com/photo-1592924357228-8c4285be0d93?w=400",
            "Red Onion":            "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400",
            "Green Chilli":         "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400",
            "Potato":               "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400",
            "Cauliflower":          "https://images.unsplash.com/photo-1510627489930-0c1b0bfb6785?w=400",
            "Brinjal (Eggplant)":   "https://images.unsplash.com/photo-1659587560699-c6e6e9ce7c1e?w=400",
            "Bitter Gourd":         "https://images.unsplash.com/photo-1637494434290-7117e9ab0e7e?w=400",
            "Garlic":               "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=400",
            "Ginger":               "https://images.unsplash.com/photo-1597690894285-c31e7cae2af9?w=400",
            "Carrot":               "https://images.unsplash.com/photo-1447175008436-054170c2e979?w=400",
            "Cabbage":              "https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400",
            "Lady Finger (Okra)":   "https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=400",
            "Pumpkin":              "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=400",
            "Alphonso Mangoes":     "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400",
            "Banana (Robusta)":     "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400",
            "Pomegranate":          "https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=400",
            "Papaya":               "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400",
            "Watermelon":           "https://images.unsplash.com/photo-1563114773-84221bd62daa?w=400",
            "Grapes (Thompson)":    "https://images.unsplash.com/photo-1423044856288-70e765d55a41?w=400",
            "Guava":                "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400",
            "Basmati Rice":         "https://images.unsplash.com/photo-1536304993881-ff86e0c5e11c?w=400",
            "Wheat (Lokwan)":       "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400",
            "Soybean":              "https://images.unsplash.com/photo-1533622597524-a1215e26c0a2?w=400",
            "Toor Dal (Pigeon Pea)":"https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400",
            "Moong Dal":            "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
            "Chana Dal":            "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
            "Jowar (Sorghum)":      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400",
            "Fresh Spinach":        "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",
            "Fenugreek (Methi)":    "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400",
            "Coriander (Dhania)":   "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400",
            "Mint (Pudina)":        "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400",
            "Curry Leaves":         "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400",
            "Turmeric (Haldi)":     "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400",
            "Dry Red Chilli":       "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400",
            "Cumin Seeds (Jeera)":  "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400",
            "Mustard Seeds":        "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400",
            "Sweet Corn":           "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400",
            "Drumstick (Moringa)":  "https://images.unsplash.com/photo-1585159812596-fac104408186?w=400",
            "Bottle Gourd (Lauki)": "https://images.unsplash.com/photo-1600003263720-95b45a34d654?w=400",
            "Raw Banana":           "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400",
            "Pineapple":            "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400",
            "Coconut":              "https://images.unsplash.com/photo-1580984969071-a8da8e898c4d?w=400",
            "Muskmelon":            "https://images.unsplash.com/photo-1571680322279-a226e6a4cc2a?w=400",
            "Black Pepper":         "https://images.unsplash.com/photo-1600189261867-30e5ffe7b8da?w=400",
            "Cardamom (Elaichi)":   "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400",
            "Bajra (Pearl Millet)": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400",
            "Maize (Corn)":         "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400",
            "Masoor Dal (Red Lentil)":"https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400",
            "Urad Dal (Black Gram)":"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
            "Drumstick Leaves":     "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",
            "Lemon (Nimbu)":        "https://images.unsplash.com/photo-1582087439450-6fc660faab1a?w=400",
        }
        for name, url in IMAGE_FIXES.items():
            db.query(Product).filter(Product.name == name).update({"image_url": url})
        db.commit()

        # Seed reviews
        if db.query(Review).count() == 0:
            reviews = [
                Review(product_id=1, reviewer_id=3, farmer_id=1, rating=5, comment="Excellent quality tomatoes! Very fresh."),
                Review(product_id=1, reviewer_id=4, farmer_id=1, rating=4, comment="Good bulk pricing, on-time delivery."),
                Review(product_id=3, reviewer_id=3, farmer_id=2, rating=5, comment="Best Alphonso mangoes I've ever had!"),
                Review(product_id=2, reviewer_id=5, farmer_id=1, rating=4, comment="Great onions for our restaurant chain."),
                Review(product_id=5, reviewer_id=4, farmer_id=1, rating=5, comment="Premium quality rice. Will reorder."),
            ]
            db.add_all(reviews)
            db.commit()

        # Seed orders
        if db.query(Order).count() == 0:
            orders_data = [
                {"buyer_id": 3, "product_id": 1, "qty": 10, "price": 45.0, "type": "retail", "month": 1},
                {"buyer_id": 4, "product_id": 1, "qty": 200, "price": 28.0, "type": "bulk", "month": 1},
                {"buyer_id": 3, "product_id": 3, "qty": 5, "price": 150.0, "type": "retail", "month": 2},
                {"buyer_id": 5, "product_id": 2, "qty": 500, "price": 22.0, "type": "bulk", "month": 2},
                {"buyer_id": 4, "product_id": 5, "qty": 1000, "price": 60.0, "type": "bulk", "month": 3},
                {"buyer_id": 3, "product_id": 6, "qty": 8, "price": 30.0, "type": "retail", "month": 3},
                {"buyer_id": 5, "product_id": 1, "qty": 300, "price": 28.0, "type": "bulk", "month": 4},
                {"buyer_id": 3, "product_id": 4, "qty": 2, "price": 80.0, "type": "retail", "month": 4},
                {"buyer_id": 4, "product_id": 2, "qty": 400, "price": 22.0, "type": "bulk", "month": 5},
                {"buyer_id": 3, "product_id": 5, "qty": 20, "price": 85.0, "type": "retail", "month": 5},
                {"buyer_id": 5, "product_id": 3, "qty": 100, "price": 95.0, "type": "bulk", "month": 6},
            ]
            for o in orders_data:
                subtotal = o["qty"] * o["price"]
                order = Order(buyer_id=o["buyer_id"], status="delivered", total_amount=subtotal, order_type=o["type"])
                db.add(order)
                db.flush()
                item = OrderItem(order_id=order.id, product_id=o["product_id"], quantity=o["qty"], unit_price=o["price"], subtotal=subtotal)
                db.add(item)
            db.commit()

        # Seed messages
        if db.query(Message).count() == 0:
            messages = [
                Message(sender_id=3, receiver_id=1, content="Hi! Can I get a bulk quote for 500kg tomatoes?"),
                Message(sender_id=1, receiver_id=3, content="Sure! For 500kg, I can offer ₹25/kg. Delivery included."),
                Message(sender_id=3, receiver_id=1, content="That works! Can you deliver by Friday?"),
                Message(sender_id=1, receiver_id=3, content="Yes, Friday delivery is possible. Shall I confirm the order?"),
            ]
            db.add_all(messages)
            db.commit()

        # Seed Govt Schemes — 31 schemes across 8+ ministries
        if db.query(GovtScheme).count() == 0:
            schemes = [
                GovtScheme(title="PM Kisan Samman Nidhi", description="Direct income support of ₹6,000/year to farmer families in 3 installments of ₹2,000.", benefit_amount="₹6,000/year", eligibility="Small & marginal farmers with cultivable land", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://pmkisan.gov.in"),
                GovtScheme(title="Pradhan Mantri Fasal Bima Yojana", description="Crop insurance scheme providing financial support to farmers suffering crop loss/damage due to unforeseen events.", benefit_amount="Up to ₹2 lakh coverage", eligibility="All farmers growing notified crops", deadline="Before sowing season", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://pmfby.gov.in"),
                GovtScheme(title="Kisan Credit Card (KCC)", description="Provides timely credit support to farmers for their agricultural operations and allied activities.", benefit_amount="Credit up to ₹3 lakh at 4% interest", eligibility="All farmers, sharecroppers, tenant farmers", deadline="Ongoing", ministry="Ministry of Finance", apply_link="https://www.nabard.org"),
                GovtScheme(title="e-NAM (National Agriculture Market)", description="Pan-India electronic trading portal networking existing APMC mandis to create a unified national market.", benefit_amount="Better price realization", eligibility="Registered farmers in linked mandis", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://enam.gov.in"),
                GovtScheme(title="Soil Health Card Scheme", description="Provides soil health cards to all farmers with crop-wise recommendations for nutrients and fertilizers.", benefit_amount="Free soil testing & recommendations", eligibility="All farmers", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://soilhealth.dac.gov.in"),
                GovtScheme(title="PM Krishi Sinchai Yojana", description="Provides water to every field (Har Khet Ko Paani) and improves water use efficiency (More Crop Per Drop).", benefit_amount="Subsidy on irrigation equipment", eligibility="Farmers with water source", deadline="Ongoing", ministry="Ministry of Jal Shakti", apply_link="https://pmksy.gov.in"),
                GovtScheme(title="PM KUSUM Scheme", description="Promotes solar energy use in agriculture by supporting solar pump installation and solar power plants on barren land.", benefit_amount="Up to 60% subsidy", eligibility="Individual farmers, FPOs, cooperatives", deadline="2026", ministry="Ministry of New & Renewable Energy", apply_link="https://mnre.gov.in"),
                GovtScheme(title="PM Kisan Maandhan Yojana", description="Old age pension scheme for small and marginal farmers providing monthly pension after age 60.", benefit_amount="₹3,000 monthly pension after age 60", eligibility="Farmers aged 18-40 with less than 2 hectares land", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://pmkmy.gov.in"),
                GovtScheme(title="Paramparagat Krishi Vikas Yojana (PKVY)", description="Promotes organic farming through adoption of organic village by cluster approach and PGS certification.", benefit_amount="₹50,000 per hectare for 3 years", eligibility="Farmers willing to adopt organic farming", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://pgsindia-ncof.gov.in"),
                GovtScheme(title="Rashtriya Krishi Vikas Yojana (RKVY)", description="Provides flexibility and autonomy to states to plan and execute programmes for agricultural development.", benefit_amount="Project-based funding", eligibility="State governments & farmers through state schemes", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://rkvy.nic.in"),
                GovtScheme(title="Agriculture Infrastructure Fund (AIF)", description="Medium-long term debt financing facility for post-harvest management infrastructure and community farming assets.", benefit_amount="3% interest subsidy up to ₹2 crore loan", eligibility="Farmers, FPOs, SHGs, cooperatives, startups", deadline="2032", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://agriinfra.dac.gov.in"),
                GovtScheme(title="National Food Security Mission (NFSM)", description="Increases production of rice, wheat, pulses, coarse cereals and nutri-cereals through area expansion and productivity enhancement.", benefit_amount="Subsidy for seeds & inputs", eligibility="Farmers in identified districts", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://nfsm.gov.in"),
                GovtScheme(title="National Bamboo Mission", description="Promotes holistic development of bamboo sector to increase area under bamboo cultivation and improve post-harvest management.", benefit_amount="Up to 50% subsidy for bamboo cultivation", eligibility="Farmers & entrepreneurs in bamboo sector", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://nbm.nic.in"),
                GovtScheme(title="Mission for Integrated Development of Horticulture (MIDH)", description="Promotes holistic growth of horticulture sector including fruits, vegetables, root & tuber crops, mushrooms, spices, flowers, aromatic plants, coconut, cashew, cocoa and bamboo.", benefit_amount="40%-60% subsidy on horticulture projects", eligibility="Farmers & entrepreneurs in horticulture", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://midh.gov.in"),
                GovtScheme(title="Sub-Mission on Agricultural Mechanization (SMAM)", description="Promotes farm mechanization by making farm machinery and equipment accessible to farmers, especially small and marginal ones.", benefit_amount="40%-50% subsidy on farm machinery", eligibility="Small & marginal farmers", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://agrimachinery.nic.in"),
                GovtScheme(title="PM Formalisation of Micro Food Processing Enterprises (PM-FME)", description="Provides financial, technical and business support for upgradation of existing micro food processing enterprises.", benefit_amount="35% subsidy up to ₹10 lakh", eligibility="Micro food processing enterprises & farmers", deadline="Ongoing", ministry="Ministry of Food Processing Industries", apply_link="https://pmfme.mofpi.gov.in"),
                GovtScheme(title="National Mission on Sustainable Agriculture (NMSA)", description="Promotes sustainable agriculture through climate change adaptation, soil health management and enhancing water use efficiency.", benefit_amount="Financial support", eligibility="All farmers", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://nmsa.dac.gov.in"),
                GovtScheme(title="Micro Irrigation Fund", description="Dedicated fund with NABARD to facilitate state governments in mobilizing resources for expanding micro irrigation coverage.", benefit_amount="Low-interest financial support", eligibility="Farmers adopting drip/sprinkler irrigation", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://www.nabard.org"),
                GovtScheme(title="Gramin Bhandaran Yojana", description="Creates scientific storage capacity with allied facilities in rural areas to prevent distress sale and promote grading of farm produce.", benefit_amount="25%-33% subsidy on warehouse construction", eligibility="Farmers, cooperatives, FPOs", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://agriinfra.dac.gov.in"),
                GovtScheme(title="PM Matsya Sampada Yojana (PMMSY)", description="Addresses critical gaps in fish production and productivity, quality, technology, post-harvest infrastructure and modernisation.", benefit_amount="Up to 60% subsidy for fisheries projects", eligibility="Fishers, fish farmers, SHGs, cooperatives", deadline="Ongoing", ministry="Ministry of Fisheries", apply_link="https://pmmsy.dof.gov.in"),
                GovtScheme(title="National Beekeeping & Honey Mission", description="Promotes scientific beekeeping for income generation and employment for farmers and tribal people.", benefit_amount="Subsidy for beekeeping", eligibility="Farmers & entrepreneurs", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://nbb.gov.in"),
                GovtScheme(title="Animal Husbandry Infrastructure Development Fund (AHIDF)", description="Incentivises investments by individual entrepreneurs, private companies, SHGs in dairy, meat processing and animal feed plants.", benefit_amount="3% interest subsidy with credit guarantee", eligibility="Farmers, cooperatives, private companies", deadline="Ongoing", ministry="Ministry of Fisheries, Animal Husbandry & Dairying", apply_link="https://ahidf.udyamimitra.in"),
                GovtScheme(title="Dairy Entrepreneurship Development Scheme (DEDS)", description="Promotes setting up of modern dairy farms for generation of self-employment and infrastructure for unorganized sector.", benefit_amount="25%-33% subsidy for dairy farming units", eligibility="Farmers, NGOs, cooperatives, companies", deadline="Ongoing", ministry="Department of Animal Husbandry", apply_link="https://dahd.nic.in"),
                GovtScheme(title="Blue Revolution Scheme", description="Integrated development and management of fisheries for sustainable, responsible, inclusive and holistic development of the fisheries sector.", benefit_amount="Financial assistance", eligibility="Fish farmers & fishers", deadline="Ongoing", ministry="Ministry of Fisheries", apply_link="https://dof.gov.in"),
                GovtScheme(title="Integrated Scheme on Agriculture Marketing (ISAM)", description="Creates agricultural marketing infrastructure and promotes e-trading and IT connectivity in regulated markets.", benefit_amount="Infrastructure funding", eligibility="States, cooperatives, agri entrepreneurs", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://agmarknet.gov.in"),
                GovtScheme(title="Seed Village Programme", description="Ensures supply of quality seeds to farmers at affordable prices in areas where certified seeds are not easily available.", benefit_amount="Seed assistance", eligibility="Registered farmers in identified villages", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://seednet.gov.in"),
                GovtScheme(title="National Mission for Oilseeds & Oil Palm (NMOOP)", description="Increases production and productivity of oilseeds and oil palm to reduce import dependence on edible oils.", benefit_amount="Subsidy & technical support", eligibility="Oilseed growing farmers", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://nmoop.gov.in"),
                GovtScheme(title="Crop Diversification Programme", description="Promotes crop diversification from paddy to alternate crops in Punjab, Haryana and Western UP to conserve water and improve soil health.", benefit_amount="Financial assistance", eligibility="Farmers in identified districts", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://agricoop.nic.in"),
                GovtScheme(title="National Organic Farming Mission", description="Promotes organic farming in the country to improve soil fertility, reduce input cost and provide premium returns to organic farmers.", benefit_amount="Financial assistance", eligibility="Farmers adopting organic practices", deadline="Ongoing", ministry="Ministry of Agriculture & Farmers Welfare", apply_link="https://ncof.dacnet.nic.in"),
                GovtScheme(title="Kisan Rail Scheme", description="Special train service for farmers to transport perishable goods quickly across India with minimal transit time and cost.", benefit_amount="Subsidized rail transport", eligibility="Farmers transporting perishable produce", deadline="Ongoing", ministry="Ministry of Railways", apply_link="https://www.indianrailways.gov.in"),
                GovtScheme(title="Krishi Udan Scheme", description="Facilitates air transport of agricultural produce from remote/hilly areas to better market access through dedicated air connectivity.", benefit_amount="Reduced logistics cost", eligibility="Farmers in remote & north-eastern regions", deadline="Ongoing", ministry="Ministry of Civil Aviation", apply_link="https://www.civilaviation.gov.in"),
            ]
            db.add_all(schemes)
            db.commit()

        # Seed deliveries for existing orders (if none exist)
        if db.query(Delivery).count() == 0:
            orders = db.query(Order).all()
            for order in orders:
                farmer_product = db.query(OrderItem).filter(OrderItem.order_id == order.id).first()
                farmer_loc = "Pune, Maharashtra"
                if farmer_product:
                    prod = db.query(Product).filter(Product.id == farmer_product.product_id).first()
                    if prod:
                        farmer = db.query(User).filter(User.id == prod.farmer_id).first()
                        if farmer:
                            farmer_loc = farmer.location or "Pune, Maharashtra"
                buyer = db.query(User).filter(User.id == order.buyer_id).first()
                buyer_addr = buyer.location if buyer else order.delivery_address or "Pune"
                d = Delivery(
                    order_id=order.id,
                    agent_id=31,  # demo agent
                    status="delivered",
                    pickup_address=farmer_loc,
                    delivery_address=buyer_addr,
                    earning=50.0,
                    pickup_time=order.created_at,
                    delivery_time=order.created_at,
                )
                db.add(d)
            db.commit()

    finally:
        db.close()

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "🌾 AgriBridge API Running", "version": "1.0.0", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ─── OTP Auth Routes (Phone) ─ kept for backward compat ─────────────────────

@app.post("/auth/request-otp")
def request_otp(body: OTPRequest, db: Session = Depends(get_db)):
    """Generate and send OTP to phone number."""
    phone = body.phone.strip()

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(phone=phone, name=body.name, role=body.role)
        db.add(user)
        db.commit()
        db.refresh(user)

    db.query(OTP).filter(OTP.phone == phone, OTP.is_used == False).delete()
    code = generate_otp()
    otp = OTP(phone=phone, code=code, expires_at=get_otp_expiry())
    db.add(otp)
    db.commit()
    send_otp_sms(phone, code)
    return {"success": True, "message": f"OTP sent to {phone}", "demo_otp": code, "expires_in": "10 minutes"}

@app.post("/auth/verify-otp")
def verify_otp(body: OTPVerify, db: Session = Depends(get_db)):
    """Verify OTP and return JWT token."""
    otp_record = db.query(OTP).filter(
        OTP.phone == body.phone,
        OTP.code == body.code,
        OTP.is_used == False
    ).first()
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if not is_otp_valid(otp_record.expires_at):
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    otp_record.is_used = True
    db.commit()
    user = db.query(User).filter(User.phone == body.phone).first()
    token = create_access_token({"user_id": user.id, "phone": user.phone, "role": user.role, "name": user.name})
    return {"success": True, "token": token, "user": {"id": user.id, "name": user.name, "phone": user.phone, "role": user.role, "location": user.location}}

# ─── Email OTP Auth Routes (New) ─────────────────────────────────────────────

@app.post("/auth/send-email-otp")
async def send_email_otp(body: EmailOTPRequest, db: Session = Depends(get_db)):
    """
    Step 1: Send a 6-digit OTP to the user's email address.
    Creates user account if first login.
    """
    email = body.email.strip().lower()
    role  = body.role.strip() or "consumer"

    # Invalidate any old unused OTPs for this email
    db.query(OTP).filter(OTP.email == email, OTP.is_used == False).delete()
    db.commit()

    # Generate fresh OTP
    code    = gen_email_otp()
    expires = otp_expiry(minutes=10)
    db.add(OTP(email=email, code=code, expires_at=expires))
    db.commit()

    # Send via email (falls back to console print if MAIL_* not configured)
    name = body.name or email.split("@")[0].title()
    await send_otp_email(email=email, otp=code, name=name, role=role)

    return {
        "success": True,
        "message": f"OTP sent to {email}",
        "expires_in": "10 minutes",
        # dev_otp is only shown when MAIL is not configured (console fallback)
        "dev_otp": code if not settings.MAIL_USERNAME else None,
    }

@app.post("/auth/verify-email-otp")
async def verify_email_otp(body: EmailOTPVerify, db: Session = Depends(get_db)):
    """
    Step 2: Verify OTP. If correct, auto-register user (first login) or log in.
    Returns JWT token + user profile.
    """
    email = body.email.strip().lower()
    role  = body.role.strip() or "consumer"

    otp_record = db.query(OTP).filter(
        OTP.email == email,
        OTP.code  == body.code.strip(),
        OTP.is_used == False,
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please check and try again.")
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # Mark OTP used
    otp_record.is_used = True
    db.commit()

    # Get or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # New user — register them
        display_name = body.name.strip() if body.name else email.split("@")[0].replace(".", " ").title()
        user = User(
            email=email,
            name=display_name,
            role=role,
            location=body.location or "",
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Existing user — update email_verified and role if needed
        user.email_verified = True
        if body.role and body.role != user.role:
            user.role = role          # allow role switch on login
        db.commit()
        db.refresh(user)

    token = create_access_token({
        "user_id": user.id,
        "email":   user.email,
        "role":    user.role,
        "name":    user.name,
    })

    return {
        "success": True,
        "token": token,
        "is_new_user": user.created_at == user.created_at,  # always return
        "user": {
            "id":       user.id,
            "name":     user.name,
            "email":    user.email,
            "role":     user.role,
            "location": user.location,
        }
    }

# ─── Users ────────────────────────────────────────────────────────────────────

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "phone": u.phone, "role": u.role, "location": u.location} for u in users]

@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "name": user.name, "phone": user.phone, "role": user.role, "location": user.location}

# ─── Products ─────────────────────────────────────────────────────────────────

@app.get("/products")
def get_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Product).filter(Product.is_active == True)
    if category:
        q = q.filter(Product.category == category)
    products = q.all()
    result = []
    for p in products:
        avg_rating = db.query(func.avg(Review.rating)).filter(Review.product_id == p.id).scalar() or 0
        review_count = db.query(Review).filter(Review.product_id == p.id).count()
        result.append({
            "id": p.id, "farmer_id": p.farmer_id, "name": p.name,
            "category": p.category, "description": p.description,
            "retail_price": p.retail_price, "bulk_price": p.bulk_price,
            "min_bulk_qty": p.min_bulk_qty, "unit": p.unit,
            "stock_qty": p.stock_qty, "image_url": p.image_url,
            "avg_rating": round(avg_rating, 1), "review_count": review_count,
            "farmer_name": p.farmer.name if p.farmer else "Unknown"
        })
    return result

@app.post("/products")
def create_product(product: ProductCreate, farmer_id: int, db: Session = Depends(get_db)):
    p = Product(**product.dict(), farmer_id=farmer_id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"success": True, "product_id": p.id}

@app.get("/products/farmer/{farmer_id}")
def get_farmer_products(farmer_id: int, db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.farmer_id == farmer_id, Product.is_active == True).all()
    result = []
    for p in products:
        avg_rating = db.query(func.avg(Review.rating)).filter(Review.product_id == p.id).scalar() or 0
        review_count = db.query(Review).filter(Review.product_id == p.id).count()
        result.append({
            "id": p.id, "farmer_id": p.farmer_id, "name": p.name,
            "category": p.category, "description": p.description,
            "retail_price": p.retail_price, "bulk_price": p.bulk_price,
            "min_bulk_qty": p.min_bulk_qty, "unit": p.unit,
            "stock_qty": p.stock_qty, "image_url": p.image_url,
            "avg_rating": round(avg_rating, 1), "review_count": review_count,
            "farmer_name": p.farmer.name if p.farmer else "Unknown"
        })
    return result

@app.put("/products/{product_id}")
def update_product(product_id: int, product: ProductCreate, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in product.dict().items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return {"success": True, "product_id": p.id}

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p.is_active = False   # soft delete
    db.commit()
    return {"success": True}


# ─── Orders ───────────────────────────────────────────────────────────────────

@app.post("/orders")
async def place_order(body: OrderCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == body.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Determine pricing
    is_bulk = body.order_type == "bulk" and body.quantity >= product.min_bulk_qty
    unit_price = product.bulk_price if is_bulk else product.retail_price
    subtotal = unit_price * body.quantity

    order = Order(buyer_id=body.buyer_id, total_amount=subtotal, order_type=body.order_type, delivery_address=body.delivery_address)
    db.add(order)
    db.flush()

    item = OrderItem(order_id=order.id, product_id=body.product_id, quantity=body.quantity, unit_price=unit_price, subtotal=subtotal)
    db.add(item)
    db.commit()

    # ── Send order confirmation email to buyer ─────────────────────────────
    try:
        buyer = db.query(User).filter(User.id == body.buyer_id).first()
        farmer = db.query(User).filter(User.id == product.farmer_id).first()
        if buyer and buyer.email:
            await send_order_confirmation_email(
                email=buyer.email,
                buyer_name=buyer.name or buyer.email.split("@")[0].title(),
                order_id=order.id,
                product_name=product.name,
                quantity=body.quantity,
                unit=product.unit or "kg",
                unit_price=unit_price,
                total=subtotal,
                delivery_address=body.delivery_address or buyer.location or "India",
                payment_method=getattr(body, "payment_method", "Online"),
                farmer_name=farmer.name if farmer else "Farmer",
            )
    except Exception as email_err:
        print(f"[Email] Order email error (non-fatal): {email_err}")
    # ── End email ──────────────────────────────────────────────────────────

    return {"success": True, "order_id": order.id, "total": subtotal, "unit_price": unit_price, "is_bulk": is_bulk}

@app.get("/orders/buyer/{buyer_id}")
def get_buyer_orders(buyer_id: int, db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.buyer_id == buyer_id).all()
    result = []
    for o in orders:
        # Get first order item for product/farmer info
        item = db.query(OrderItem).filter(OrderItem.order_id == o.id).first()
        product_name = "Product"
        farmer_name = "Farmer"
        quantity = 0
        if item:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product_name = product.name
                farmer = db.query(User).filter(User.id == product.farmer_id).first()
                if farmer:
                    farmer_name = farmer.name
            quantity = item.quantity
        result.append({
            "id": o.id, "status": o.status,
            "total": o.total_amount, "total_price": o.total_amount,
            "order_type": o.order_type, "type": o.order_type,
            "date": o.created_at,
            "product_name": product_name,
            "farmer_name": farmer_name,
            "quantity": quantity,
        })
    return result

@app.get("/orders/farmer/{farmer_id}")
def get_farmer_orders(farmer_id: int, db: Session = Depends(get_db)):
    """Get all orders for products owned by this farmer."""
    # Join through OrderItem -> Product -> farmer_id
    from sqlalchemy.orm import joinedload
    items = (
        db.query(OrderItem)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(Product.farmer_id == farmer_id)
        .options(joinedload(OrderItem.order))
        .all()
    )
    result = []
    for item in items:
        o = item.order
        buyer = db.query(User).filter(User.id == o.buyer_id).first()
        product = db.query(Product).filter(Product.id == item.product_id).first()
        result.append({
            "id": o.id,
            "order_item_id": item.id,
            "product_id": item.product_id,
            "product_name": product.name if product else "Unknown",
            "buyer_id": o.buyer_id,
            "buyer_name": buyer.name if buyer else "Customer",
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.subtotal,
            "order_type": o.order_type,
            "status": o.status,
            "date": o.created_at
        })
    return result


# ─── Reviews ──────────────────────────────────────────────────────────────────

@app.post("/reviews")
def add_review(review: ReviewCreate, db: Session = Depends(get_db)):
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    r = Review(**review.dict())
    db.add(r)
    db.commit()
    return {"success": True}

@app.get("/reviews/product/{product_id}")
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.product_id == product_id).all()
    return [{
        "id": r.id, "rating": r.rating, "comment": r.comment,
        "reviewer_name": r.reviewer.name if r.reviewer else "Anonymous",
        "date": r.created_at
    } for r in reviews]

# ─── Messages / Chat ──────────────────────────────────────────────────────────

@app.post("/messages")
def send_message(msg: MessageCreate, db: Session = Depends(get_db)):
    m = Message(**msg.dict())
    db.add(m)
    db.commit()
    return {"success": True, "message_id": m.id}

@app.get("/messages/{user1_id}/{user2_id}")
def get_conversation(user1_id: int, user2_id: int, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(
        ((Message.sender_id == user1_id) & (Message.receiver_id == user2_id)) |
        ((Message.sender_id == user2_id) & (Message.receiver_id == user1_id))
    ).order_by(Message.created_at).all()
    return [{
        "id": m.id, "sender_id": m.sender_id, "receiver_id": m.receiver_id,
        "content": m.content, "created_at": m.created_at,
        "sender_name": m.sender.name if m.sender else "Unknown"
    } for m in messages]

# ─── Govt Schemes ─────────────────────────────────────────────────────────────

@app.get("/schemes")
def get_schemes(db: Session = Depends(get_db)):
    schemes = db.query(GovtScheme).filter(GovtScheme.is_active == True).all()
    return [{"id": s.id, "title": s.title, "description": s.description,
             "benefit_amount": s.benefit_amount, "eligibility": s.eligibility,
             "deadline": s.deadline, "ministry": s.ministry, "apply_link": s.apply_link} for s in schemes]

# ─── Analytics ────────────────────────────────────────────────────────────────

@app.get("/analytics/farmer/{farmer_id}")
def farmer_analytics(farmer_id: int, db: Session = Depends(get_db)):
    # Monthly revenue from farmer's products
    monthly_data = {}
    farmer_products = db.query(Product).filter(Product.farmer_id == farmer_id).all()
    product_ids = [p.id for p in farmer_products]

    orders_with_items = db.query(OrderItem).filter(OrderItem.product_id.in_(product_ids)).all()
    for item in orders_with_items:
        order = db.query(Order).filter(Order.id == item.order_id).first()
        if order:
            month = order.created_at.strftime("%b")
            monthly_data[month] = monthly_data.get(month, 0) + item.subtotal

    monthly_revenue = [{"month": k, "revenue": round(v)} for k, v in monthly_data.items()]

    # Most sold crops
    crop_sales = {}
    for item in orders_with_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            crop_sales[product.name] = crop_sales.get(product.name, 0) + item.quantity

    top_crops = sorted([{"crop": k, "qty_sold": round(v)} for k, v in crop_sales.items()], key=lambda x: x["qty_sold"], reverse=True)[:5]

    # Average rating per product
    ratings = []
    for p in farmer_products:
        avg = db.query(func.avg(Review.rating)).filter(Review.product_id == p.id).scalar() or 0
        ratings.append({"product": p.name, "avg_rating": round(avg, 1)})

    # Totals
    total_revenue = sum(d["revenue"] for d in monthly_revenue)
    total_orders = db.query(OrderItem).filter(OrderItem.product_id.in_(product_ids)).count()
    overall_rating = db.query(func.avg(Review.rating)).filter(Review.farmer_id == farmer_id).scalar() or 0

    return {
        "monthly_revenue": monthly_revenue,
        "top_crops": top_crops,
        "product_ratings": ratings,
        "summary": {
            "total_revenue": round(total_revenue),
            "total_orders": total_orders,
            "avg_rating": round(overall_rating, 1),
            "active_products": len(farmer_products)
        }
    }

@app.get("/analytics/market")
def market_analytics(db: Session = Depends(get_db)):
    total_products = db.query(Product).count()
    total_orders = db.query(Order).count()
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0
    total_farmers = db.query(User).filter(User.role == "farmer").count()
    total_buyers = db.query(User).filter(User.role.in_(["consumer", "business"])).count()

    return {
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue),
        "total_farmers": total_farmers,
        "total_buyers": total_buyers
    }

# ─── AI Endpoints ─────────────────────────────────────────────────────────────

@app.post("/ai/fertilizer-advisor")
async def fertilizer_advisor(body: FertilizerRequest):
    advice = await get_fertilizer_advice(
        body.crop, body.soil_type, body.ph,
        body.nitrogen, body.phosphorus, body.potassium, body.area_acres
    )
    return {"advice": advice, "crop": body.crop}

@app.post("/ai/crop-doctor")
async def crop_doctor(
    image: UploadFile = File(...),
    crop_name: str = Form(default="Unknown Crop"),
    symptoms: str = Form(default="Discoloration, spots visible")
):
    image_bytes = await image.read()
    image_b64 = base64.b64encode(image_bytes).decode()
    diagnosis = await diagnose_crop_disease(image_b64, crop_name, symptoms)
    return {"diagnosis": diagnosis, "crop": crop_name}

@app.post("/ai/chatbot")
async def chatbot(body: ChatMessage):
    response = await farming_chatbot(body.user_message, body.conversation_history)
    return {"response": response}

# ─── Weather & Maps ───────────────────────────────────────────────────────────

@app.get("/weather")
async def weather(city: str = "Pune"):
    data = await get_weather(city)
    return data

@app.post("/transport-cost")
async def transport_cost(body: TransportRequest):
    data = await calculate_transport_cost(body.origin, body.destination, body.vehicle_type)
    return data

@app.post("/ai/farm-simulator")
async def farm_simulator(body: FarmSimulatorRequest):
    """Virtual Farm Simulator — given land size, location & budget, simulate 5 best crops."""
    result = await simulate_farm_crops(
        land_size_acres=body.land_size_acres,
        location=body.location,
        budget_inr=body.budget_inr,
        soil_type=body.soil_type,
        season=body.season
    )
    return result

@app.post("/ai/stress-detector")
async def stress_detector(body: StressDetectorRequest):
    """
    Farmer Stress Detector — silently analyses chat messages for distress signals.
    Returns a stress score (0-10), level, detected signals, and recommended support action.
    Designed to run in the background after every chatbot exchange.
    """
    result = await detect_farmer_stress(
        messages=body.messages,
        response_delay_seconds=body.response_delay_seconds
    )
    return result


# ─── AI Soil Health Analyzer ─────────────────────────────────────────────────────

@app.post("/ai/soil-health")
async def soil_health_analyzer(
    image: UploadFile = File(...),
    location: str = Form(""),
    crop_intent: str = Form(""),
):
    """
    AI Soil Health Analyzer — Upload a soil photo for instant AI analysis.
    Uses Groq Vision (LLaMA 4 Scout) to assess soil color, texture, moisture,
    nutrient estimates, pH range, and crop suitability.
    """
    contents = await image.read()
    image_base64 = base64.b64encode(contents).decode("utf-8")

    # Determine MIME type
    mime_type = image.content_type or "image/jpeg"

    result = await analyze_soil_health(
        image_base64=image_base64,
        location=location,
        crop_intent=crop_intent,
    )
    return result


# ─── AI Season-wise Yield Predictor ──────────────────────────────────────────

@app.post("/ai/yield-prediction")
async def yield_prediction(body: YieldPredictionRequest):
    """
    AI Season-wise Yield Predictor — Get month-by-month yield forecasts,
    revenue projections, risk analysis, and variety recommendations
    for vegetables and fruits based on season, location, and farm inputs.
    Powered by Groq AI (LLaMA 3.3 70B).
    """
    result = await predict_seasonal_yield(
        crop_type=body.crop_type,
        crop_name=body.crop_name,
        season=body.season,
        location=body.location,
        land_size_acres=body.land_size_acres,
        soil_type=body.soil_type,
        irrigation=body.irrigation,
        variety=body.variety or "",
    )
    return result


# ─── AI Farming Tutorials & Micro Farming ────────────────────────────────────

@app.post("/ai/farming-tutorials")
async def farming_tutorials_endpoint(body: FarmingTutorialsRequest):
    """
    AI-generated home farming & micro farming tutorial cards with step-by-step
    guides, video tutorial links, business plans, and space-based crop recommendations.
    Powered by Groq AI (LLaMA 3.3 70B).
    """
    result = await get_farming_tutorials(
        category=body.category,
        topic=body.topic,
        user_level=body.user_level,
    )
    return result


# ─── AI Key Status ─────────────────────────────────────────────────────────────

@app.get("/ai/key-status")
async def get_key_status():
    """
    Returns the current health status of all configured Groq API keys.
    Shows which keys are active, rate-limited, cooldown remaining, and total requests served.
    """
    return key_manager.status()


@app.get("/ai/providers")
async def get_ai_providers():
    """
    Returns the AI provider routing for each feature.
    Shows which providers are configured (have API keys set).
    """
    def is_configured(key_val: str) -> bool:
        return bool(key_val and key_val.strip())

    return {
        "routing": [
            {
                "feature": "Chatbot",
                "icon": "💬",
                "primary": "Groq",
                "primary_emoji": "⚡",
                "primary_configured": is_configured(settings.GROQ_API_KEY),
                "fallback": "DeepSeek → Gemini → OpenRouter",
                "model": settings.GROQ_MODEL,
            },
            {
                "feature": "Crop Doctor",
                "icon": "🔬",
                "primary": "Gemini Vision",
                "primary_emoji": "✨",
                "primary_configured": is_configured(settings.GEMINI_API_KEY),
                "fallback": "Groq Vision",
                "model": settings.GEMINI_VISION_MODEL,
            },
            {
                "feature": "Fertilizer Advisor",
                "icon": "🌱",
                "primary": "DeepSeek",
                "primary_emoji": "🔬",
                "primary_configured": is_configured(settings.DEEPSEEK_API_KEY),
                "fallback": "Groq",
                "model": settings.DEEPSEEK_MODEL,
            },
            {
                "feature": "Yield Prediction",
                "icon": "📈",
                "primary": "OpenRouter",
                "primary_emoji": "🌐",
                "primary_configured": is_configured(settings.OPENROUTER_API_KEY),
                "fallback": "Groq",
                "model": settings.OPENROUTER_MODEL,
            },
            {
                "feature": "Farm Simulator",
                "icon": "🚜",
                "primary": "Groq",
                "primary_emoji": "⚡",
                "primary_configured": is_configured(settings.GROQ_API_KEY),
                "fallback": "DeepSeek",
                "model": settings.GROQ_MODEL,
            },
            {
                "feature": "Live Prices",
                "icon": "💰",
                "primary": "Groq",
                "primary_emoji": "⚡",
                "primary_configured": is_configured(settings.GROQ_API_KEY),
                "fallback": "Fallback data",
                "model": settings.GROQ_MODEL,
            },
            {
                "feature": "Farming Academy",
                "icon": "🎓",
                "primary": "Groq",
                "primary_emoji": "⚡",
                "primary_configured": is_configured(settings.GROQ_API_KEY),
                "fallback": "DeepSeek",
                "model": settings.GROQ_MODEL,
            },
        ],
        "provider_labels": PROVIDER_LABELS,
    }


# Simple in-memory cache: { market_key: { "data": {...}, "cached_at": datetime } }

_price_cache: dict = {}
CACHE_TTL_SECONDS = 300  # 5 minutes

# Realistic fallback data shown when Groq rate-limits us
FALLBACK_PRICES = {
    "market": "Pune APMC",
    "market_sentiment": "Neutral",
    "sentiment_reason": "Mixed signals — vegetables up on reduced arrivals, grains stable ahead of rabi harvest.",
    "top_gainer": "Green Chilli",
    "top_loser": "Watermelon",
    "advisory": "Good time to sell stored Tomatoes and Green Chilli. Hold grains until post-harvest prices settle.",
    "ai_insights": [
        "Tomato prices remain elevated due to heat-stress crop damage in Nashik belt — expect ₹40–55/kg this week.",
        "Onion stock at Lasalgaon APMC is 18% lower than last year same period, supporting firm prices.",
        "Cumin seed demand from Gujarat spice traders is driving Pune mandi prices 12% above MSP."
    ],
    "prices": [
        {"commodity":"Tomato","category":"Vegetable","emoji":"🍅","current_price":48,"previous_price":40,"unit":"kg","change_percent":20.0,"trend":"up","min_price":38,"max_price":58,"quality":"Grade A","arrival_tonnes":95,"demand":"High","price_forecast":"Likely to stay above ₹45 for 2 more weeks","best_selling_time":"Morning (6-9 AM)"},
        {"commodity":"Onion","category":"Vegetable","emoji":"🧅","current_price":34,"previous_price":36,"unit":"kg","change_percent":-5.6,"trend":"down","min_price":28,"max_price":40,"quality":"Grade A","arrival_tonnes":210,"demand":"Moderate","price_forecast":"Slight dip expected as new stock arrives","best_selling_time":"Early morning"},
        {"commodity":"Potato","category":"Vegetable","emoji":"🥔","current_price":27,"previous_price":27,"unit":"kg","change_percent":0.0,"trend":"stable","min_price":22,"max_price":32,"quality":"Grade B","arrival_tonnes":180,"demand":"Moderate","price_forecast":"Stable through next fortnight","best_selling_time":"Anytime"},
        {"commodity":"Rice (Basmati)","category":"Grain","emoji":"🌾","current_price":88,"previous_price":84,"unit":"kg","change_percent":4.8,"trend":"up","min_price":80,"max_price":98,"quality":"Premium","arrival_tonnes":60,"demand":"High","price_forecast":"Export demand keeping prices firm","best_selling_time":"Afternoon (2-5 PM)"},
        {"commodity":"Wheat","category":"Grain","emoji":"🌾","current_price":31,"previous_price":31,"unit":"kg","change_percent":0.0,"trend":"stable","min_price":28,"max_price":34,"quality":"Grade A","arrival_tonnes":300,"demand":"Moderate","price_forecast":"MSP support keeping floor intact","best_selling_time":"Anytime"},
        {"commodity":"Alphonso Mango","category":"Fruit","emoji":"🥭","current_price":145,"previous_price":160,"unit":"kg","change_percent":-9.4,"trend":"down","min_price":120,"max_price":180,"quality":"Premium","arrival_tonnes":35,"demand":"High","price_forecast":"Season ending — sell remaining stock soon","best_selling_time":"Morning (7-10 AM)"},
        {"commodity":"Toor Dal","category":"Pulse","emoji":"🫘","current_price":118,"previous_price":112,"unit":"kg","change_percent":5.4,"trend":"up","min_price":110,"max_price":128,"quality":"Grade A","arrival_tonnes":45,"demand":"High","price_forecast":"Festive season demand will keep prices elevated","best_selling_time":"Afternoon"},
        {"commodity":"Moong Dal","category":"Pulse","emoji":"🫘","current_price":105,"previous_price":100,"unit":"kg","change_percent":5.0,"trend":"up","min_price":95,"max_price":115,"quality":"Grade A","arrival_tonnes":30,"demand":"Moderate","price_forecast":"Steady rise expected","best_selling_time":"Morning"},
        {"commodity":"Turmeric","category":"Spice","emoji":"🟡","current_price":148,"previous_price":132,"unit":"kg","change_percent":12.1,"trend":"up","min_price":135,"max_price":165,"quality":"Erode Grade","arrival_tonnes":18,"demand":"Very High","price_forecast":"Export orders from Middle East driving prices","best_selling_time":"Morning"},
        {"commodity":"Garlic","category":"Spice","emoji":"🧄","current_price":120,"previous_price":128,"unit":"kg","change_percent":-6.3,"trend":"down","min_price":105,"max_price":138,"quality":"Grade A","arrival_tonnes":55,"demand":"Moderate","price_forecast":"New season stock arriving — prices softening","best_selling_time":"Afternoon"},
        {"commodity":"Ginger","category":"Spice","emoji":"🫚","current_price":92,"previous_price":88,"unit":"kg","change_percent":4.5,"trend":"up","min_price":82,"max_price":105,"quality":"Fresh","arrival_tonnes":22,"demand":"Moderate","price_forecast":"Stable with slight upward bias","best_selling_time":"Morning"},
        {"commodity":"Green Chilli","category":"Vegetable","emoji":"🌶️","current_price":88,"previous_price":72,"unit":"kg","change_percent":22.2,"trend":"up","min_price":75,"max_price":105,"quality":"Grade A","arrival_tonnes":28,"demand":"Very High","price_forecast":"Heat wave reducing production — prices may touch ₹100","best_selling_time":"Early morning (5-8 AM)"},
        {"commodity":"Cauliflower","category":"Vegetable","emoji":"🥦","current_price":32,"previous_price":35,"unit":"kg","change_percent":-8.6,"trend":"down","min_price":25,"max_price":40,"quality":"Grade A","arrival_tonnes":75,"demand":"Low","price_forecast":"Good arrivals keeping prices soft","best_selling_time":"Morning"},
        {"commodity":"Cabbage","category":"Vegetable","emoji":"🥬","current_price":18,"previous_price":20,"unit":"kg","change_percent":-10.0,"trend":"down","min_price":14,"max_price":24,"quality":"Grade B","arrival_tonnes":90,"demand":"Low","price_forecast":"Oversupply — sell quickly","best_selling_time":"Early morning"},
        {"commodity":"Carrot","category":"Vegetable","emoji":"🥕","current_price":42,"previous_price":40,"unit":"kg","change_percent":5.0,"trend":"up","min_price":35,"max_price":50,"quality":"Grade A","arrival_tonnes":48,"demand":"Moderate","price_forecast":"Steady demand from juice industry","best_selling_time":"Morning"},
        {"commodity":"Banana","category":"Fruit","emoji":"🍌","current_price":38,"previous_price":36,"unit":"dozen","change_percent":5.6,"trend":"up","min_price":30,"max_price":45,"quality":"Grade A","arrival_tonnes":85,"demand":"High","price_forecast":"Festival season demand rising","best_selling_time":"Anytime"},
        {"commodity":"Pomegranate","category":"Fruit","emoji":"💎","current_price":125,"previous_price":120,"unit":"kg","change_percent":4.2,"trend":"up","min_price":110,"max_price":145,"quality":"Bhagwa Grade","arrival_tonnes":32,"demand":"High","price_forecast":"Export quality fetching premium","best_selling_time":"Morning (8-11 AM)"},
        {"commodity":"Watermelon","category":"Fruit","emoji":"🍉","current_price":14,"previous_price":18,"unit":"kg","change_percent":-22.2,"trend":"down","min_price":10,"max_price":20,"quality":"Grade B","arrival_tonnes":220,"demand":"Low","price_forecast":"Peak season glut — prices recovering slowly","best_selling_time":"Evening"},
        {"commodity":"Soybean","category":"Grain","emoji":"🟤","current_price":44,"previous_price":44,"unit":"kg","change_percent":0.0,"trend":"stable","min_price":40,"max_price":48,"quality":"Grade A","arrival_tonnes":120,"demand":"Moderate","price_forecast":"MSP support at ₹4892/quintal keeping floor","best_selling_time":"Afternoon"},
        {"commodity":"Cumin Seeds","category":"Spice","emoji":"🌿","current_price":278,"previous_price":248,"unit":"kg","change_percent":12.1,"trend":"up","min_price":255,"max_price":310,"quality":"Machine Cleaned","arrival_tonnes":12,"demand":"Very High","price_forecast":"Gujarat traders buying aggressively — hold if possible","best_selling_time":"Morning (9 AM-12 PM)"},
    ]
}

class LivePriceRequest(BaseModel):
    commodities: Optional[List[str]] = None
    market: Optional[str] = "Pune APMC"

@app.post("/ai/live-prices")
async def live_prices(body: LivePriceRequest):
    """
    AI-powered live commodity price tracker.
    Uses Groq AI to generate realistic, up-to-date mandi prices for Indian agricultural commodities.
    Caches results for 5 minutes to avoid rate limiting. Falls back to static data on 429.
    """
    import json as json_lib
    import httpx
    from config import settings

    commodities = body.commodities or [
        "Tomato", "Onion", "Potato", "Rice (Basmati)", "Wheat",
        "Alphonso Mango", "Toor Dal", "Moong Dal", "Turmeric", "Garlic",
        "Ginger", "Green Chilli", "Cauliflower", "Cabbage", "Carrot",
        "Banana", "Pomegranate", "Watermelon", "Soybean", "Cumin Seeds"
    ]
    market = body.market or "Pune APMC"
    cache_key = market.lower().replace(" ", "_")

    # ── Return from cache if fresh ────────────────────────────────────────────
    if cache_key in _price_cache:
        cached = _price_cache[cache_key]
        age = (datetime.now() - cached["cached_at"]).total_seconds()
        if age < CACHE_TTL_SECONDS:
            result = dict(cached["data"])
            result["success"] = True
            result["cached"] = True
            result["cache_age_seconds"] = int(age)
            return result

    prompt = f"""You are an Indian agricultural market intelligence system with access to real-time APMC mandi data.

Generate current wholesale market prices for the following commodities at {market} market.
Today's date context: {datetime.now().strftime("%B %Y")}.

Commodities: {', '.join(commodities)}

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{{
  "market": "{market}",
  "last_updated": "{datetime.now().strftime("%d %b %Y, %H:%M")} IST",
  "market_sentiment": "Bullish",
  "sentiment_reason": "One-sentence reason for overall market sentiment",
  "prices": [
    {{
      "commodity": "Tomato",
      "category": "Vegetable",
      "emoji": "🍅",
      "current_price": 45,
      "previous_price": 38,
      "unit": "kg",
      "change_percent": 18.4,
      "trend": "up",
      "min_price": 35,
      "max_price": 55,
      "quality": "Grade A",
      "arrival_tonnes": 120,
      "demand": "High",
      "price_forecast": "Expected to stabilize next week",
      "best_selling_time": "Morning (6-9 AM)"
    }}
  ],
  "ai_insights": ["Insight 1", "Insight 2", "Insight 3"],
  "top_gainer": "Commodity name",
  "top_loser": "Commodity name",
  "advisory": "Short actionable advisory for farmers today"
}}

Rules:
- Prices must be realistic for Indian wholesale markets (₹/kg) in {datetime.now().strftime("%B %Y")}
- trend must be exactly "up", "down", or "stable"
- change_percent is negative for downward trends
- arrival_tonnes reflects realistic daily mandi arrivals
- Make insights specific and actionable for Indian farmers"""

    try:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an Indian agricultural market data system. Respond ONLY with valid JSON. No markdown, no explanation."
                },
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4,
            "max_tokens": 3500,
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

            # ── Handle rate limit: return fallback ────────────────────────────
            if resp.status_code == 429:
                fallback = dict(FALLBACK_PRICES)
                fallback["market"] = market
                fallback["last_updated"] = datetime.now().strftime("%d %b %Y, %H:%M") + " IST"
                fallback["success"] = True
                fallback["fallback"] = True
                fallback["note"] = "Showing cached reference prices — AI quota temporarily reached. Prices are indicative."
                return fallback

            if resp.status_code != 200:
                # Try to return stale cache if available
                if cache_key in _price_cache:
                    stale = dict(_price_cache[cache_key]["data"])
                    stale["success"] = True
                    stale["cached"] = True
                    stale["stale"] = True
                    return stale
                return {"success": False, "error": f"Groq API error ({resp.status_code})"}

            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()

            # Strip markdown fences if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            if content.endswith("```"):
                content = content[:-3]

            result = json_lib.loads(content.strip())

            # ── Cache the fresh result ────────────────────────────────────────
            _price_cache[cache_key] = {
                "data": result,
                "cached_at": datetime.now()
            }

            result["success"] = True
            result["cached"] = False
            return result

    except json_lib.JSONDecodeError:
        # Parsing failed — return fallback
        fallback = dict(FALLBACK_PRICES)
        fallback["market"] = market
        fallback["last_updated"] = datetime.now().strftime("%d %b %Y, %H:%M") + " IST"
        fallback["success"] = True
        fallback["fallback"] = True
        return fallback
    except Exception as e:
        # Any other error — try stale cache then fallback
        if cache_key in _price_cache:
            stale = dict(_price_cache[cache_key]["data"])
            stale["success"] = True
            stale["stale"] = True
            return stale
        fallback = dict(FALLBACK_PRICES)
        fallback["market"] = market
        fallback["last_updated"] = datetime.now().strftime("%d %b %Y, %H:%M") + " IST"
        fallback["success"] = True
        fallback["fallback"] = True
        return fallback


# ─── Delivery Endpoints ────────────────────────────────────────────────────────

@app.get("/deliveries/available")
def get_available_deliveries(db: Session = Depends(get_db)):
    """Return all confirmed/pending orders that have no delivery assigned yet."""
    # Find orders that don't have a delivery record OR have status pending_assignment
    assigned_order_ids = [d.order_id for d in db.query(Delivery).filter(
        Delivery.status.notin_(["pending_assignment"])
    ).all()]

    orders = db.query(Order).filter(
        Order.status.in_(["pending", "confirmed", "shipped"]),
        ~Order.id.in_(assigned_order_ids)
    ).all()

    result = []
    for order in orders:
        buyer = db.query(User).filter(User.id == order.buyer_id).first()
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        product_names = []
        farmer_location = "Pune, Maharashtra"
        for item in items:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if prod:
                product_names.append(f"{prod.name} × {item.quantity}{prod.unit}")
                farmer = db.query(User).filter(User.id == prod.farmer_id).first()
                if farmer:
                    farmer_location = farmer.location or farmer_location
        result.append({
            "order_id": order.id,
            "order_type": order.order_type,
            "total_amount": order.total_amount,
            "pickup_address": farmer_location,
            "delivery_address": buyer.location if buyer else order.delivery_address or "Pune",
            "buyer_name": buyer.name if buyer else "Consumer",
            "products": ", ".join(product_names) if product_names else "Mixed products",
            "created_at": order.created_at.isoformat() if order.created_at else "",
            "earning": 50.0,
        })
    return result


@app.get("/deliveries/agent/{agent_id}")
def get_agent_deliveries(agent_id: int, db: Session = Depends(get_db)):
    """Return all deliveries assigned to a specific delivery agent."""
    deliveries = db.query(Delivery).filter(Delivery.agent_id == agent_id).all()
    result = []
    for d in deliveries:
        order = db.query(Order).filter(Order.id == d.order_id).first()
        buyer = db.query(User).filter(User.id == order.buyer_id).first() if order else None
        items = db.query(OrderItem).filter(OrderItem.order_id == d.order_id).all()
        product_names = []
        for item in items:
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if prod:
                product_names.append(f"{prod.name} × {item.quantity}{prod.unit}")
        result.append({
            "delivery_id": d.id,
            "order_id": d.order_id,
            "status": d.status,
            "pickup_address": d.pickup_address,
            "delivery_address": d.delivery_address,
            "buyer_name": buyer.name if buyer else "Consumer",
            "products": ", ".join(product_names) if product_names else "Mixed products",
            "earning": d.earning,
            "notes": d.notes,
            "pickup_time": d.pickup_time.isoformat() if d.pickup_time else None,
            "delivery_time": d.delivery_time.isoformat() if d.delivery_time else None,
            "created_at": d.created_at.isoformat() if d.created_at else "",
            "total_amount": order.total_amount if order else 0,
        })
    return result


@app.post("/deliveries/assign")
def assign_delivery(body: DeliveryAssign, db: Session = Depends(get_db)):
    """Delivery agent self-assigns an available order."""
    # Check if already assigned
    existing = db.query(Delivery).filter(Delivery.order_id == body.order_id).first()
    if existing and existing.status != "pending_assignment":
        raise HTTPException(status_code=400, detail="This order already has a delivery agent assigned.")

    order = db.query(Order).filter(Order.id == body.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    agent = db.query(User).filter(User.id == body.agent_id, User.role == "delivery_agent").first()
    if not agent:
        raise HTTPException(status_code=404, detail="Delivery agent not found.")

    # Get pickup/delivery info
    items = db.query(OrderItem).filter(OrderItem.order_id == body.order_id).all()
    farmer_location = "Pune, Maharashtra"
    for item in items:
        prod = db.query(Product).filter(Product.id == item.product_id).first()
        if prod:
            farmer = db.query(User).filter(User.id == prod.farmer_id).first()
            if farmer and farmer.location:
                farmer_location = farmer.location
                break

    buyer = db.query(User).filter(User.id == order.buyer_id).first()
    buyer_addr = buyer.location if buyer else order.delivery_address or "Pune"

    if existing:
        existing.agent_id = body.agent_id
        existing.status = "assigned"
        existing.pickup_address = farmer_location
        existing.delivery_address = buyer_addr
        existing.updated_at = datetime.utcnow()
    else:
        new_delivery = Delivery(
            order_id=body.order_id,
            agent_id=body.agent_id,
            status="assigned",
            pickup_address=farmer_location,
            delivery_address=buyer_addr,
            earning=50.0,
        )
        db.add(new_delivery)

    # Update order status to processing
    order.status = "processing"
    db.commit()
    return {"success": True, "message": "Order assigned successfully! You can now pick it up."}


@app.put("/deliveries/{delivery_id}/status")
def update_delivery_status(delivery_id: int, body: DeliveryStatusUpdate, db: Session = Depends(get_db)):
    """Update the status of a delivery."""
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found.")

    valid_statuses = ["assigned", "picked_up", "in_transit", "delivered", "failed"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    delivery.status = body.status
    delivery.notes = body.notes or delivery.notes
    delivery.updated_at = datetime.utcnow()

    if body.status == "picked_up":
        delivery.pickup_time = datetime.utcnow()
        # Update order status to shipped
        order = db.query(Order).filter(Order.id == delivery.order_id).first()
        if order:
            order.status = "shipped"

    elif body.status == "delivered":
        delivery.delivery_time = datetime.utcnow()
        # Update order status to delivered
        order = db.query(Order).filter(Order.id == delivery.order_id).first()
        if order:
            order.status = "delivered"

    elif body.status == "failed":
        order = db.query(Order).filter(Order.id == delivery.order_id).first()
        if order:
            order.status = "pending"

    db.commit()
    return {"success": True, "message": f"Delivery status updated to '{body.status}'."}


@app.get("/deliveries/order/{order_id}")
def get_order_delivery(order_id: int, db: Session = Depends(get_db)):
    """Get the delivery record for a specific order (for consumer tracking)."""
    delivery = db.query(Delivery).filter(Delivery.order_id == order_id).first()
    if not delivery:
        return {"delivery": None}

    agent = db.query(User).filter(User.id == delivery.agent_id).first() if delivery.agent_id else None
    return {
        "delivery": {
            "delivery_id": delivery.id,
            "status": delivery.status,
            "pickup_address": delivery.pickup_address,
            "delivery_address": delivery.delivery_address,
            "agent_name": agent.name if agent else "Unassigned",
            "agent_phone": agent.phone if agent else "",
            "agent_location": agent.location if agent else "",
            "earning": delivery.earning,
            "notes": delivery.notes,
            "pickup_time": delivery.pickup_time.isoformat() if delivery.pickup_time else None,
            "delivery_time": delivery.delivery_time.isoformat() if delivery.delivery_time else None,
        }
    }
