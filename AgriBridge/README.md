# 🌾 AgriBridge — End-to-End Agri Ecosystem

> **Secure Commerce · AI Farm Management · Live Price Intelligence · Direct Communication**
> Built with FastAPI + React · Powered by Groq AI (LLaMA 3.3) · Trilingual: English / हिंदी / मराठी

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3-FF6B35)](https://groq.com)
[![License](https://img.shields.io/badge/License-Educational-green)](./LICENSE)

---

## 📋 Project Overview

AgriBridge is a full-stack agricultural platform with **two completely distinct portals** — one for **Farmers** and one for **Consumers** — both in a unified **green brand theme**. It features:

- 🎨 **Lumina-style split-layout hero pages** with floating dashboard cards and bold editorial headlines
- 🤖 **AI-powered tools** — fertilizer advisor, crop disease doctor, yield predictor, soil analyzer, chatbot
- ⚡ **Ultra-fast AI responses** — parallel provider racing, multi-key rotation, in-memory caching
- 🌀 **Canvas-based particle animations** — floating wireframe shapes + agri emoji on every page
- 📈 **Live mandi price intelligence** — Groq-powered with 20 commodities across 8 markets
- 🛒 **Full cart → checkout → payment flow** with coupon codes, UPI/Card/COD/Wallet support
- 🌐 **Trilingual** — English / हिंदी / मराठी with ~180 translation keys

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+ · FastAPI · SQLAlchemy ORM · SQLite |
| **Frontend** | React.js 18 · Vanilla CSS · Recharts · Leaflet.js |
| **State / i18n** | React Context API (Theme · Language · Auth) |
| **AI — Text** | **Groq API** — `llama-3.3-70b-versatile` + multi-key rotation |
| **AI — Vision** | **Groq API** — `meta-llama/llama-4-scout-17b-16e-instruct` |
| **AI — DeepSeek** | **DeepSeek-V3** via OpenRouter — Farming Academy |
| **AI — Cache** | In-memory `AIResponseCache` (TTL 600s) — eliminates repeat calls |
| **Weather** | **wttr.in** — free public JSON endpoint (no API key needed) |
| **Maps** | **Leaflet.js + OpenStreetMap** — fully free, no API key |
| **Distance** | **geopy + Nominatim** — free OpenStreetMap geocoding |
| **Animation** | HTML5 Canvas — `requestAnimationFrame` particle engine |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

---

### Step 1 — Backend Setup

```powershell
cd AgriBridge/backend

# Create & activate virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment file
if (-not (Test-Path .env)) { copy .env.example .env }
# Then edit .env and add your API keys (see section below)

# Start the server
uvicorn main:app --reload --port 8000
```

✅ Backend running at: **http://localhost:8000**
📖 API Docs at: **http://localhost:8000/docs**

---

### Step 2 — Frontend Setup

```powershell
cd AgriBridge/frontend

# Install dependencies
npm install

# Start React app
npm start
```

✅ Frontend running at: **http://localhost:3000**

---

## 🔑 API Key Setup

Weather and Maps need **zero keys**. AI features use Groq (free tier).

| Service | Key Needed? | Used For |
|---------|:-----------:|----------|
| **Groq AI** | ✅ Yes (free) | Chatbot, Fertilizer, Crop Doctor, Prices, Yield, Academy |
| **Weather** (wttr.in) | ❌ None | Weather forecasts |
| **Maps** (OpenStreetMap) | ❌ None | Maps & distance |

### Add your keys to `backend/.env`

```env
JWT_SECRET=agribridge-super-secret-key-change-me

# Groq AI — supports up to 3 rotating keys for speed
# Get free keys from: https://console.groq.com/keys
GROQ_API_KEY=gsk_your_primary_key_here
GROQ_API_KEY_2=gsk_your_second_key_here      # optional but recommended
GROQ_API_KEY_3=gsk_your_third_key_here       # optional but recommended
```

> 💡 **Speed tip:** Adding 2–3 free Groq keys enables **parallel key rotation**, reducing AI response time from 3–4 minutes to under 30 seconds. Each key has a generous free quota.

---

## 👥 Login & Role System

AgriBridge uses a **3-step OTP login** (email-based, no password required):

```
Step 1 → Choose Role (Farmer / Consumer)
Step 2 → Enter Email → OTP sent
Step 3 → Enter 6-digit OTP → Login
```

| Role | Theme | Portal |
|------|-------|--------|
| 🌾 **Farmer** | Green (`#22c55e`) | Sell produce · manage listings · AI tools · analytics |
| 🛒 **Consumer** | Green (`#22c55e`) | Browse market · cart · checkout · track orders |

> Both portals use the **unified green AgriBridge brand** — clean, consistent, and premium.

---

## 📁 Project Structure

```
AgriBridge/
├── backend/
│   ├── main.py              # FastAPI routes + seed data + all endpoints
│   ├── models.py            # SQLAlchemy SQLite table definitions
│   ├── auth_utils.py        # OTP generation + JWT logic
│   ├── ai_engine.py         # 🆕 v3.2: AI with caching, key rotation, racing
│   ├── database.py          # SQLite engine + session config
│   ├── config.py            # 🆕 v3.2: Multi-key support (KEY_2, KEY_3)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
└── frontend/
    ├── package.json
    └── src/
        ├── App.js               # Router + Role-based Sidebar + Language Toggle
        ├── api.js               # All Axios API calls (25+ functions)
        ├── index.css            # 🆕 v3.2: Global styles + particle + hero animations
        ├── context/
        │   └── LanguageContext.js   # EN/HI/MR i18n system (~180 keys)
        ├── components/
        │   ├── LivePriceTracker.js  # AI Live Price Tracker component
        │   ├── AILoader.js          # 🆕 v3.2: Premium animated AI skeleton loader
        │   └── AILoader.css         # AI loader keyframe animations
        └── pages/
            ├── HomePage.js          # 🆕 v3.2: Lumina-style split hero (Farmer + Consumer)
            ├── LoginPage.js         # 🆕 v3.2: Canvas particle background + OTP auth
            ├── FarmerMarket.js      # Farmer product listings + orders (with badges)
            ├── ConsumerMarket.js    # Enhanced marketplace (coupons + checkout nav)
            ├── CheckoutPage.js      # 3-step checkout wizard (address→payment→confirm)
            ├── MyOrdersPage.js      # Consumer order history + status timeline
            ├── WishlistPage.js      # Consumer wishlist with cart integration
            ├── FarmerDashboard.js   # Analytics dashboard (Recharts: line, bar, pie, radar)
            ├── AIHub.js             # 🆕 v3.2: Fertilizer + CropDoctor + Chatbot + AI skeletons
            ├── ChatPage.js          # Direct farmer-buyer messaging
            ├── FarmSimulator.js     # AI virtual farm simulator
            ├── FarmingTutorials.js  # DeepSeek-powered farming academy
            ├── Schemes.js           # 31 Government schemes hub
            ├── MapView.js           # Interactive map (farms, stores, delivery)
            └── Weather.js           # Live weather + transport calculator
```

---

## 🌟 Features Breakdown

### 🏠 1. Lumina-Style Premium Homepage *(NEW in v3.2)*

Both Farmer and Consumer home pages feature a **split-screen editorial layout** inspired by modern SaaS designs:

**Left Column — Text:**
- 🔴 Live badge pill (pulsing dot)
- Ultra-bold **3-line headline** (`clamp(3rem → 5.2rem)`) — e.g. `GROW YOUR / FARM INTO / REVENUE.`
- Subtext + key value proposition
- **Primary CTA** (solid green) + **Secondary CTA** (outline)
- Trust indicators row

**Right Column — Floating Dashboard Card:**
- macOS-style window dots (red · yellow · green)
- **Stat block** — Total Revenue / Savings with `↑ +24%` badge
- 2-column mini stat boxes (light card + dark card)
- Analytics action strip
- **Social proof badge** floating bottom-right (`Just joined Ramesh P. · Pune`)

**Background:**
- `#05120a` deep dark green base
- **Dot-grid texture** — `radial-gradient` CSS dots (26px spacing)
- **Canvas particle engine** — floating wireframe triangles, hexagons, diamonds + agri emoji
- Soft radial glow on the card side

---

### 🌀 2. Canvas Particle Animations *(NEW in v3.2)*

Three full-screen canvas animations across the app:

| Page | Component | Particles |
|------|-----------|-----------|
| **Login** | `LoginParticles` | 45 green wireframe shapes + twinkling starfield (80 dots) + agri emoji |
| **Farmer Home** | `AgriParticles variant="farmer"` | Green shapes + 🌾🌱💧☀️🌿🍀🌻🚜 icons + connection lines |
| **Consumer Home** | `AgriParticles variant="consumer"` | Green shapes + 🍅🥕🥦🍌🌶️🛒🍇🌽 icons + connection lines |

All canvases use `requestAnimationFrame`, resize on window resize, and clean up on unmount.

---

### ⚡ 3. AI Speed Optimization *(NEW in v3.2)*

**Before:** 3–4 minute AI response times.
**After:** Under 30 seconds with warm cache hits in < 1 second.

#### What changed in `ai_engine.py`:

**`AIResponseCache`** — In-memory LRU cache:
```python
cache = AIResponseCache(ttl=600)   # 10-minute TTL
# Identical requests return instantly from cache
```

**`GeminiKeyManager`** — Round-robin key rotation:
```python
keys = [GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3]
# Automatically rotates across keys to avoid rate limits
```

**`race_providers()`** — Parallel API racing:
```python
# Fires requests to Groq + DeepSeek simultaneously
# Returns whichever responds first
winner = await race_providers(prompt)
```

**Timeout reductions:**
- All functions: `60-90s → 20s`
- Chatbot `max_tokens`: `1024 → 512`
- Fertilizer `max_tokens`: `1500 → 900`

**`config.py` additions:**
```env
GROQ_API_KEY_2=...    # New: second key
GROQ_API_KEY_3=...    # New: third key
```

---

### 🤖 4. AI Hub with Skeleton Loaders *(ENHANCED in v3.2)*

All three AI tools now show a **premium animated skeleton** while waiting for responses:

| Tool | Skeleton Message | Powered By |
|------|-----------------|------------|
| 🌱 **Fertilizer Advisor** | `ANALYZING SOIL DATA` | Groq LLaMA 3.3 |
| 🔬 **Soil Health Analyzer** | `ANALYZING SOIL HEALTH` | Groq Vision |
| 📈 **Yield Predictor** | `PREDICTING YIELD` | OpenRouter |

**`AILoader` component features:**
- Rotating leaf SVG icon with speed streaks
- Cycling status messages every 2.2s
- Latency indicator (simulated ms counter)
- Animated progress bar
- System log ticker (model name + status)
- Bottom-left "SYSTEMS NOMINAL" indicator

---

### 📊 5. Farmer Analytics Dashboard

Full **Recharts** dashboard with 5 chart types:

| Chart | Data |
|-------|------|
| 📈 Area Chart | This week's revenue (Mon–Sun) |
| 📉 Line Chart | Monthly revenue trend (12 months) |
| 📊 Bar Chart (horizontal) | Top crops by kg sold |
| 🥧 Pie Chart | Crop sales distribution % |
| 🕸️ Radar Chart | Performance score (6 dimensions) |

Three dashboard tabs:
- **Overview** — Stats cards + all charts + seasonal calendar + quick actions
- **Live Prices** — Full Groq-powered mandi price tracker
- **Insights** — Progress bars + radar chart + 5 AI-generated recommendations

---

### 🛍️ 6. Consumer Cart → Checkout → Payment Flow

**Smart Cart** (`ConsumerMarket.js`):
- Coupon codes: `FRESH10` (10%) · `AGRI20` (20%) · `FARM15` (15%) · `KISAN5` (5%)
- Full price breakdown: Subtotal → Discount → GST (5%) → Delivery → Total

**3-Step Checkout Wizard** (`CheckoutPage.js`):
```
Step 1 — Delivery Address
  • All 32 Indian states/UTs dropdown
  • Saved addresses (up to 3, localStorage)

Step 2 — Payment Method
  • UPI    — Simulated QR code + UPI ID
  • Card   — Live card visual (number/name/expiry/CVV)
  • Net Banking — 10 major Indian banks
  • Cash on Delivery
  • Wallet — AgriBridge Credits

Step 3 — Order Confirmation
  • Full order summary + delivery recap
  • "Place Order" → POST /orders for each item
```

**Order Success:** Animated checkmark · invoice print · auto-redirect

---

### 🌐 7. Trilingual Language Support

Switch between **English**, **हिंदी**, and **मराठी** using the 3-pill toggle in the sidebar.

- ~180 translation keys covering all UI labels, buttons, stats, nav links
- Persisted in `localStorage` as `agribridge-lang`
- Works in both Farmer and Consumer portals simultaneously

---

### 🗺️ 8. Other Core Features

| Feature | Route | Description |
|---------|-------|-------------|
| 🗺️ Interactive Map | `/map` | Leaflet.js + OpenStreetMap · filter farms/stores/delivery |
| 🌦️ Weather | `/weather` | Live weather + transport cost calculator |
| 💬 Chat | `/chat` | Real-time farmer ↔ consumer messaging |
| 🚜 Farm Simulator | `/farm-simulator` | AI crop planner with ROI |
| 🎓 Farming Academy | `/tutorials` | DeepSeek-powered video tutorials |
| 🏛️ Govt Schemes | `/schemes` | 31 active schemes, searchable |
| 📈 Live Prices | `/live-prices` | AI mandi prices (20 commodities, 8 markets) |
| ❤️ Wishlist | `/wishlist` | Save & buy later with cart integration |
| 📦 My Orders | `/my-orders` | Order history + 4-stage timeline tracker |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/send-email-otp` | Send OTP to email |
| POST | `/auth/verify-email-otp` | Verify OTP → JWT token |
| GET | `/products` | List products (supports `?category=`) |
| POST | `/products` | Create product listing |
| PUT | `/products/{id}` | Update product |
| DELETE | `/products/{id}` | Remove product |
| GET | `/products/farmer/{id}` | Farmer's own products |
| POST | `/orders` | Place order |
| GET | `/orders/farmer/{id}` | Orders received by farmer |
| GET | `/orders/buyer/{id}` | Orders placed by consumer |
| POST | `/reviews` | Add product review |
| GET | `/reviews/product/{id}` | Product reviews |
| GET | `/messages/{u1}/{u2}` | Get conversation |
| POST | `/messages` | Send message |
| GET | `/schemes` | Government schemes |
| GET | `/analytics/farmer/{id}` | Farmer analytics |
| GET | `/analytics/market` | Platform analytics |
| POST | `/ai/fertilizer-advisor` | AI fertiliser schedule |
| POST | `/ai/crop-doctor` | AI crop disease diagnosis (vision) |
| POST | `/ai/chatbot` | Farming AI chatbot |
| POST | `/ai/farm-simulator` | AI virtual farm planner |
| POST | `/ai/soil-health` | AI soil health analyzer |
| POST | `/ai/live-prices` | AI live mandi price tracker |
| POST | `/ai/yield-prediction` | AI season-wise yield predictor |
| POST | `/ai/farming-tutorials` | AI farming tutorials |
| GET | `/ai/key-status` | Check all API key statuses |
| GET | `/weather?city=Pune` | Live weather (wttr.in, no key) |
| POST | `/transport-cost` | Transport cost estimate |

📖 Full interactive docs: **http://localhost:8000/docs**

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `CORS error` | Ensure backend is running on port 8000 |
| `Groq API error` | Add real `GROQ_API_KEY` to `backend/.env`, restart uvicorn |
| `AI response slow (3-4 min)` | Add `GROQ_API_KEY_2` and `GROQ_API_KEY_3` to `.env` for key rotation |
| `Live prices not loading` | Backend must be running + valid GROQ_API_KEY |
| `Weather not loading` | Check backend is running — wttr.in requires internet |
| `Map not showing` | Hard-refresh browser (Ctrl+Shift+R) |
| `Module not found` | Run `pip install -r requirements.txt` inside activated venv |
| `Port 8000 in use` | Use `--port 8001` and update proxy in `frontend/package.json` |
| `Checkout page empty` | Cart must have items — go to `/marketplace` first |
| `Language not switching` | Clear localStorage and reload; re-select language |
| `Particles not showing` | Check browser console for canvas errors; disable hardware acceleration |

---

## 📦 Python Dependencies

```
fastapi, uvicorn, sqlalchemy, pydantic, httpx,
python-jose, passlib, PyJWT, python-dotenv,
python-multipart, aiofiles, geopy, asyncio
```

---

## 🆕 Changelog

### v3.2 — Current Release

#### 🎨 Design
- **Lumina-style split-layout hero** for both Farmer and Consumer portals
  - Ultra-bold 3-line editorial headline (`GROW YOUR / FARM INTO / REVENUE.`)
  - Floating dashboard "app preview" card with macOS window dots, stat boxes, social proof badge
  - Dot-grid CSS texture background (`radial-gradient` on 26px grid)
- **Unified green brand color** — Consumer portal updated from purple to green throughout
  - Sidebar, hero, particles, ticker, floating card — all `#22c55e`

#### 🌀 Animations
- **Canvas particle engine** — `AgriParticles` component on Farmer and Consumer hero sections
  - Floating wireframe triangles, hexagons, diamonds with connection lines
  - Drifting agri emoji icons (variant-specific icon sets)
- **LoginParticles** — Full-screen canvas on login page
  - 45 green wireframe shapes + 80 twinkling starfield dots + 10 floating emoji

#### ⚡ AI Performance
- `AIResponseCache` class with 600s TTL — eliminates repeat API calls
- `GeminiKeyManager` — round-robin rotation across up to 3 Groq keys
- `race_providers()` — fires Groq + DeepSeek in parallel, returns fastest
- Timeouts reduced from 60–90s to 20s across all AI functions
- `GROQ_API_KEY_2` and `GROQ_API_KEY_3` added to `config.py`

#### 🎙️ Voice Search
- Mic button (🎙️) added to search bar in ConsumerMarket and FarmerMarket
- Uses Web Speech API (SpeechRecognition) — works in Chrome on Android/Desktop
- Language set to en-IN for Indian accent recognition
- Pulsing red dot (🔴) while listening, returns to green mic when done
- No backend required — fully client-side

#### 🤖 AI UX
- **`AILoader` skeleton** added to Fertilizer Advisor (`ANALYZING SOIL DATA`)
- **`AILoader` skeleton** added to Soil Health Analyzer (`ANALYZING SOIL HEALTH`)
- All 3 AI tools now show full animated skeleton during AI wait

---

### v3.0 — Major Release

#### Added
- 🌐 Trilingual Language System — English / हिंदी / मराठी (~180 keys)
- 🏠 Premium Farmer & Consumer Homepages with dual-interface design
- 🛍️ Full 3-step Checkout Wizard (Address → Payment → Confirmation)
- 💳 Payment Interface — UPI · Card (live visual) · Net Banking · COD · Wallet
- 🎉 Order Success Screen — animated checkmark, invoice print, auto-redirect
- 📦 My Orders Page — status filters, 4-stage timeline tracker
- ❤️ Wishlist Page — dedicated page with cart integration
- 🎟️ Coupon Codes — `FRESH10`, `AGRI20`, `FARM15`, `KISAN5`
- 🏷️ Product Performance Badges — 🏆 Top Seller / ⚠️ Low Stock / ✨ New
- 📡 Live Price Ticker — smooth CSS marquee with commodity prices

---

### v2.0

#### Added
- 🤖 AI Live Price Tracker — Groq-powered mandi intelligence
- 📊 Farmer Dashboard Tab System — Overview / Live Prices / Insights
- 🧠 AI Insights Tab — Performance radar + personalized recommendations
- ⚡ Weekly Revenue Sparkline (Recharts AreaChart)
- 💡 Rotating Farming Tips carousel
- 🗓️ Seasonal Crop Calendar

---

## 📄 License

Built for educational / hackathon purposes. Replace `JWT_SECRET` and all API keys with secure values before any production deployment.
