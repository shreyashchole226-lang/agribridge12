# 📋 Product Requirements Document (PRD)

## AgriBridge — End-to-End Agricultural Ecosystem Platform

> **Version:** 3.2  
> **Status:** Active Development  
> **Last Updated:** September 2026  
> **Document Type:** Product Requirements Document  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Objectives](#3-goals--objectives)
4. [Target Users](#4-target-users)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [System Architecture](#8-system-architecture)
9. [Tech Stack](#9-tech-stack)
10. [Feature Specifications](#10-feature-specifications)
11. [API Specification](#11-api-specification)
12. [UI/UX Requirements](#12-uiux-requirements)
13. [AI Integration Requirements](#13-ai-integration-requirements)
14. [Security Requirements](#14-security-requirements)
15. [Localization Requirements](#15-localization-requirements)
16. [Performance Requirements](#16-performance-requirements)
17. [Constraints & Assumptions](#17-constraints--assumptions)
18. [Out of Scope](#18-out-of-scope)
19. [Success Metrics](#19-success-metrics)
20. [Release Roadmap](#20-release-roadmap)

---

## 1. Executive Summary

**AgriBridge** is a full-stack agricultural platform that bridges the gap between farmers and consumers by providing a unified digital marketplace, AI-powered farming tools, live market intelligence, and direct communication channels.

The platform operates two distinct portals — **Farmer Portal** and **Consumer Portal** — under a single unified green brand, enabling:
- Farmers to sell produce, manage listings, access AI advisory tools, and view business analytics.
- Consumers to browse a marketplace, purchase directly from farmers, track orders, and discover farm-fresh produce.

AgriBridge is built using **FastAPI + React**, powered by **Groq AI (LLaMA 3.3)** for intelligent features, and supports **trilingual interaction** in English, Hindi, and Marathi.

---

## 2. Problem Statement

### For Farmers
- Limited direct access to consumers — farmers rely on middlemen who reduce their profit margins.
- Lack of real-time market price intelligence for making informed selling decisions.
- No affordable, accessible AI advisory for crop health, fertilization, and yield prediction.
- Limited digital tools available in regional Indian languages.

### For Consumers
- No reliable platform to purchase fresh produce directly from verified local farmers.
- Lack of transparency in pricing and product sourcing.
- No consolidated way to discover government agriculture schemes or connect with farmers.

### Market Gap
There is no existing platform that combines a **direct farmer-consumer marketplace**, **AI-powered farm management tools**, **live mandi price intelligence**, and **multilingual support** into a single cohesive product.

---

## 3. Goals & Objectives

| # | Goal | Objective |
|---|------|-----------|
| G1 | Empower Farmers | Enable farmers to sell produce directly, reducing middlemen dependency |
| G2 | AI-Driven Insights | Provide affordable, instant AI advisory for crop management |
| G3 | Price Transparency | Surface live mandi prices to help farmers sell at optimal rates |
| G4 | Consumer Trust | Give consumers verified, farm-fresh product sourcing with order tracking |
| G5 | Inclusivity | Support English, Hindi, and Marathi to reach rural and semi-urban farmers |
| G6 | Speed & Reliability | Ensure AI responses under 30 seconds via caching and key rotation |

---

## 4. Target Users

### Primary Users

#### 🌾 Farmer
- **Profile:** Indian smallholder / medium-scale farmer aged 25–60
- **Location:** Rural and semi-urban India (Maharashtra, UP, Punjab, MP, etc.)
- **Tech Literacy:** Basic smartphone usage, familiar with WhatsApp
- **Language:** Prefers Hindi or Marathi over English
- **Pain Points:** Low produce prices, no AI advisory, no digital marketplace, limited market info

#### 🛒 Consumer
- **Profile:** Urban/semi-urban Indian household buyer aged 20–45
- **Location:** Tier 1 and Tier 2 Indian cities
- **Tech Literacy:** Moderate to high — comfortable with online shopping
- **Language:** Primarily English or Hindi
- **Pain Points:** Overpriced produce, no direct farm sourcing, quality uncertainty

### Secondary Users

#### 🏛️ Government / NGO Partners
- Monitor scheme uptake and farmer engagement via platform analytics

#### 📊 Platform Administrators
- Manage listings, moderate content, monitor API health and usage

---

## 5. User Stories

### Farmer Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| F1 | Farmer | Register and log in via OTP | I can securely access my portal |
| F2 | Farmer | List my produce with price and photos | Consumers can discover and buy my products |
| F3 | Farmer | View AI fertilizer recommendations | I can improve crop health efficiently |
| F4 | Farmer | Upload a photo of my diseased crop | I can get instant AI diagnosis and treatment advice |
| F5 | Farmer | View live mandi prices for 20 commodities | I can decide when and where to sell |
| F6 | Farmer | See my revenue analytics and charts | I can track my business performance |
| F7 | Farmer | Chat directly with buyers | I can negotiate and build direct relationships |
| F8 | Farmer | Use a virtual farm simulator | I can plan crop seasons with ROI projections |
| F9 | Farmer | Browse government schemes | I can access financial aid and subsidies |
| F10 | Farmer | Check weather and transport costs | I can plan logistics intelligently |
| F11 | Farmer | Use the app in Marathi or Hindi | I can understand all features in my language |
| F12 | Farmer | Search products using voice | I can interact without typing |

### Consumer Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| C1 | Consumer | Register and log in via OTP | I can securely access my portal |
| C2 | Consumer | Browse a marketplace of farm products | I can discover fresh local produce |
| C3 | Consumer | Add items to cart and apply coupon codes | I can save money on purchases |
| C4 | Consumer | Checkout with UPI, card, or COD | I can pay using my preferred method |
| C5 | Consumer | Track my order through status stages | I know when my produce will arrive |
| C6 | Consumer | Add products to a wishlist | I can save items to buy later |
| C7 | Consumer | Leave reviews on products | I can help other consumers make decisions |
| C8 | Consumer | Chat with a farmer directly | I can ask questions about sourcing |
| C9 | Consumer | Search products by voice | I can find items hands-free |
| C10 | Consumer | View farmer locations on a map | I can find nearby farms and stores |

---

## 6. Functional Requirements

### 6.1 Authentication

| ID | Requirement |
|----|-------------|
| AUTH-01 | The system shall support email-based OTP login (no password) |
| AUTH-02 | OTP shall be 6 digits, valid for a limited time window |
| AUTH-03 | The system shall issue a JWT token upon successful OTP verification |
| AUTH-04 | The system shall support two roles: **Farmer** and **Consumer** |
| AUTH-05 | Users shall select their role (Farmer/Consumer) before entering email |
| AUTH-06 | Each role shall be routed to a separate portal after login |

### 6.2 Farmer Portal

| ID | Requirement |
|----|-------------|
| FP-01 | Farmer shall be able to create, update, and delete product listings |
| FP-02 | Listings shall include: name, description, category, price, quantity, images |
| FP-03 | Farmer shall view all incoming orders with buyer details |
| FP-04 | Farmer shall access an analytics dashboard with 5 chart types |
| FP-05 | Dashboard shall show: total revenue, orders, top crops, monthly trends |
| FP-06 | Farmer shall access all AI tools from the AI Hub |
| FP-07 | Farmer shall view all 31 available government schemes |
| FP-08 | Farmer shall be able to message any consumer |
| FP-09 | Farmer shall be able to view the interactive map |
| FP-10 | Farmer shall access live weather data by city |

### 6.3 Consumer Portal

| ID | Requirement |
|----|-------------|
| CP-01 | Consumer shall browse all available products with filters by category |
| CP-02 | Consumer shall add/remove items from the cart |
| CP-03 | Consumer shall apply valid coupon codes during checkout |
| CP-04 | Consumer shall complete a 3-step checkout: Address → Payment → Confirmation |
| CP-05 | Consumer shall support payment via UPI, Card, Net Banking, COD, Wallet |
| CP-06 | Consumer shall view order history with 4-stage status tracking |
| CP-07 | Consumer shall add/remove products from wishlist |
| CP-08 | Consumer shall leave reviews on purchased products |
| CP-09 | Consumer shall message farmers directly |

### 6.4 AI Features

| ID | Requirement |
|----|-------------|
| AI-01 | The system shall provide a **Fertilizer Advisor** based on crop and soil inputs |
| AI-02 | The system shall provide a **Crop Doctor** — image-based disease diagnosis |
| AI-03 | The system shall provide a **Farming Chatbot** for general agricultural Q&A |
| AI-04 | The system shall provide a **Farm Simulator** for ROI-based crop planning |
| AI-05 | The system shall provide a **Soil Health Analyzer** via image upload |
| AI-06 | The system shall provide a **Yield Predictor** based on season, crop, and area |
| AI-07 | The system shall provide a **Live Mandi Price Tracker** for 20 commodities across 8 markets |
| AI-08 | The system shall provide a **Farming Academy** with AI-generated tutorials |
| AI-09 | All AI tools shall show an animated skeleton loader while waiting for response |
| AI-10 | AI responses shall be cached in-memory for 600 seconds to avoid repeated API calls |

### 6.5 Marketplace

| ID | Requirement |
|----|-------------|
| MKT-01 | Products shall display name, image, price, farmer name, and rating |
| MKT-02 | The system shall support product search by text and voice |
| MKT-03 | Products shall support category-based filtering |
| MKT-04 | Listings shall display performance badges: Top Seller / Low Stock / New |
| MKT-05 | A live price ticker shall scroll commodity prices continuously |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID | Requirement |
|----|-------------|
| PERF-01 | AI responses shall complete within **30 seconds** under normal conditions |
| PERF-02 | Cached AI responses shall return within **< 1 second** |
| PERF-03 | Frontend initial load shall complete within **3 seconds** on a 4G connection |
| PERF-04 | API endpoints shall respond within **500ms** for non-AI requests |

### 7.2 Availability

| ID | Requirement |
|----|-------------|
| AVL-01 | Backend shall support horizontal scaling via multiple Groq API keys |
| AVL-02 | System shall degrade gracefully when AI providers are unavailable |

### 7.3 Usability

| ID | Requirement |
|----|-------------|
| USE-01 | Platform shall be usable on mobile (responsive design) |
| USE-02 | Language toggle shall persist across sessions via localStorage |
| USE-03 | All AI loading states shall display animated progress feedback |

### 7.4 Security

| ID | Requirement |
|----|-------------|
| SEC-01 | All API endpoints (except auth) shall require JWT authorization |
| SEC-02 | JWT secret shall be stored in environment variables, never hardcoded |
| SEC-03 | OTP shall expire after a defined time window |
| SEC-04 | API keys shall never be exposed to the frontend |

---

## 8. System Architecture

```
+------------------------------------------------------------------+
|                        CLIENT (Browser)                          |
|              React.js 18 · Vanilla CSS · Recharts                |
|          React Context (Auth · Language · Theme)                 |
+--------------------------------+---------------------------------+
                                 |  HTTP (Axios)
                                 v
+------------------------------------------------------------------+
|                       BACKEND (FastAPI)                          |
|    main.py · models.py · auth_utils.py · ai_engine.py           |
|          SQLAlchemy ORM ──► SQLite Database                      |
+--------+--------------------+--------------------+---------------+
         |                    |                    |
         v                    v                    v
  +------------+      +--------------+    +--------------+
  | Groq API   |      |   wttr.in    |    | OpenRouter   |
  | LLaMA 3.3  |      |  (Weather)   |    | DeepSeek-V3  |
  | Key x3     |      +--------------+    +--------------+
  +------------+
         |
  +------------+
  | Groq Vision|
  | LLaMA-4   |
  +------------+
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite** over PostgreSQL | Simplicity for hackathon/educational deployment; zero infra overhead |
| **Groq** over OpenAI | Free tier, faster inference (LPU), better for real-time use |
| **Multi-key rotation** | Avoids rate limits; enables parallel request racing |
| **In-memory cache** | Eliminates redundant AI calls; instant responses for repeated queries |
| **Vanilla CSS** | Maximum flexibility, no build tooling overhead |
| **OTP-only auth** | Reduces friction; no password management needed |

---

## 9. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend Framework** | FastAPI | 0.100+ |
| **Language** | Python | 3.10+ |
| **ORM** | SQLAlchemy | Latest |
| **Database** | SQLite | Built-in |
| **Auth** | PyJWT + python-jose | Latest |
| **Frontend Framework** | React.js | 18 |
| **Styling** | Vanilla CSS | — |
| **Charts** | Recharts | Latest |
| **Maps** | Leaflet.js + OpenStreetMap | Latest |
| **Geocoding** | geopy + Nominatim | Latest |
| **AI — Text** | Groq API (llama-3.3-70b-versatile) | Latest |
| **AI — Vision** | Groq API (llama-4-scout-17b-16e) | Latest |
| **AI — Academy** | DeepSeek-V3 via OpenRouter | Latest |
| **Weather** | wttr.in (no API key) | Public |
| **i18n** | React Context (custom) | — |
| **HTTP Client** | Axios (frontend) / httpx (backend) | Latest |
| **Animation** | HTML5 Canvas + requestAnimationFrame | — |

---

## 10. Feature Specifications

### 10.1 Homepage (Lumina-Style Layout)

**Layout:** Split-screen editorial design

| Column | Content |
|--------|---------|
| Left | Live badge pill · Bold 3-line headline · Subtext · Primary + Secondary CTA · Trust indicators |
| Right | macOS-style floating dashboard card · Revenue stats · Mini stat boxes · Social proof badge |

**Background:** `#05120a` dark green · dot-grid CSS texture · Canvas particle engine

---

### 10.2 Authentication Flow

```
Step 1 → Role Selection  (Farmer / Consumer)
Step 2 → Email Input     (OTP sent to email)
Step 3 → OTP Verification (6-digit code → JWT issued)
```

---

### 10.3 Farmer Analytics Dashboard

**Three Tabs:**

| Tab | Contents |
|-----|---------|
| Overview | Stats cards + 5 Recharts charts + Seasonal calendar + Quick actions |
| Live Prices | Groq-powered mandi price tracker (20 commodities, 8 markets) |
| Insights | Progress bars + Radar chart + 5 AI-generated recommendations |

**Chart Types:** Area · Line · Horizontal Bar · Pie · Radar

---

### 10.4 AI Hub

| Tool | Input | AI Provider | Skeleton Message |
|------|-------|-------------|-----------------|
| Fertilizer Advisor | Crop type, soil type, area | Groq LLaMA 3.3 | `ANALYZING SOIL DATA` |
| Crop Doctor | Crop image upload | Groq Vision LLaMA-4 | `DIAGNOSING CROP` |
| Farming Chatbot | Text message | Groq LLaMA 3.3 | `PROCESSING QUERY` |
| Soil Health Analyzer | Soil image upload | Groq Vision | `ANALYZING SOIL HEALTH` |
| Yield Predictor | Crop, season, area inputs | OpenRouter | `PREDICTING YIELD` |
| Farm Simulator | Crop plan parameters | Groq LLaMA 3.3 | `SIMULATING FARM` |

**AILoader Component:**
- Rotating leaf SVG icon with speed streaks
- Cycling status messages every 2.2 seconds
- Simulated latency counter (ms display)
- Animated progress bar
- System log ticker with model name + status
- Bottom-left "SYSTEMS NOMINAL" indicator

---

### 10.5 Consumer Checkout Flow

```
Cart Review
  └──► Step 1: Delivery Address
         • All 32 Indian states/UTs dropdown
         • Up to 3 saved addresses (localStorage)
  └──► Step 2: Payment Method
         • UPI (simulated QR + UPI ID input)
         • Card (live card visual: number/name/expiry/CVV)
         • Net Banking (10 major Indian banks)
         • Cash on Delivery
         • AgriBridge Wallet Credits
  └──► Step 3: Order Confirmation
         • Full order summary + delivery recap
         • "Place Order" → POST /orders
         • Animated success checkmark
         • Invoice print + auto-redirect
```

**Coupon Codes:**

| Code | Discount |
|------|---------|
| `FRESH10` | 10% |
| `AGRI20` | 20% |
| `FARM15` | 15% |
| `KISAN5` | 5% |

**Price Breakdown:** Subtotal → Discount → GST (5%) → Delivery → **Total**

---

### 10.6 Order Tracking

4-stage timeline tracker:

```
Order Placed → Confirmed → Dispatched → Delivered
```

---

### 10.7 Interactive Map

- **Provider:** Leaflet.js + OpenStreetMap (no API key required)
- **Markers:** Farms · Stores · Delivery hubs
- **Filters:** Toggle visibility by marker type

---

### 10.8 Government Schemes Hub

- **Count:** 31 active government agricultural schemes
- **Features:** Searchable · Category filters · Eligibility details

---

### 10.9 Voice Search

- **API:** Web Speech API (`SpeechRecognition`)
- **Language:** `en-IN` (Indian accent tuned)
- **UI:** Mic button on search bars in ConsumerMarket and FarmerMarket
- **State:** Pulsing red dot while listening → returns to mic icon when done
- **Client-side only:** No backend required

---

## 11. API Specification

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/send-email-otp` | Send OTP to email |
| POST | `/auth/verify-email-otp` | Verify OTP → returns JWT token |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List all products (supports `?category=` filter) |
| POST | `/products` | Create a new product listing |
| PUT | `/products/{id}` | Update a product |
| DELETE | `/products/{id}` | Remove a product |
| GET | `/products/farmer/{id}` | Get a farmer's own listings |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders` | Place a new order |
| GET | `/orders/farmer/{id}` | Orders received by a farmer |
| GET | `/orders/buyer/{id}` | Orders placed by a consumer |

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reviews` | Submit a product review |
| GET | `/reviews/product/{id}` | Get reviews for a product |

### Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages/{u1}/{u2}` | Retrieve conversation between two users |
| POST | `/messages` | Send a message |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/farmer/{id}` | Farmer-specific analytics |
| GET | `/analytics/market` | Platform-wide analytics |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/fertilizer-advisor` | AI fertilizer recommendation |
| POST | `/ai/crop-doctor` | AI crop disease diagnosis (vision) |
| POST | `/ai/chatbot` | Farming AI chatbot |
| POST | `/ai/farm-simulator` | AI virtual farm ROI planner |
| POST | `/ai/soil-health` | AI soil health analyzer (vision) |
| POST | `/ai/live-prices` | Live mandi price tracker |
| POST | `/ai/yield-prediction` | Season-wise yield prediction |
| POST | `/ai/farming-tutorials` | AI farming academy content |
| GET | `/ai/key-status` | Check all Groq API key statuses |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/weather?city={city}` | Live weather via wttr.in |
| POST | `/transport-cost` | Transport cost estimation |
| GET | `/schemes` | List all government schemes |

---

## 12. UI/UX Requirements

### Design System

| Property | Value |
|----------|-------|
| **Primary Color** | `#22c55e` (Green) |
| **Background (Dark)** | `#05120a` |
| **Headline Size** | `clamp(3rem, 5vw, 5.2rem)` |
| **Border Radius** | `12px` (cards), `8px` (buttons) |

### Design Principles

1. **Unified Brand:** Both portals share the same green brand color.
2. **Split-Screen Hero:** Editorial layout with text left, floating card right on homepages.
3. **Canvas Animations:** Full-screen particle backgrounds on Login, Farmer Home, Consumer Home.
4. **Skeleton Loaders:** All AI tools show animated skeleton while loading.
5. **Micro-animations:** Hover effects, pulsing indicators, progress bars throughout.
6. **Responsive:** All pages shall be usable on screens >= 375px wide.

### Canvas Particle Specs

| Page | Particles |
|------|-----------|
| Login | 45 green wireframe shapes + 80 twinkling dots + 10 agri emoji |
| Farmer Home | Green shapes + farm emoji icons + connection lines |
| Consumer Home | Green shapes + produce emoji icons + connection lines |

---

## 13. AI Integration Requirements

### AI Provider Strategy

| Priority | Provider | Use Case |
|----------|----------|---------|
| Primary | Groq (LLaMA 3.3-70b) | Text-based AI tools |
| Primary | Groq (LLaMA-4 Scout Vision) | Image-based tools |
| Secondary | OpenRouter (DeepSeek-V3) | Farming Academy |
| Fallback | Race winner | First responder wins |

### AI Performance Architecture

| Component | Details |
|-----------|---------|
| **Cache TTL** | 600 seconds (10 minutes) |
| **Key Rotation** | Round-robin across GROQ_API_KEY, KEY_2, KEY_3 |
| **Parallel Racing** | Groq + DeepSeek fired simultaneously; first response wins |
| **Max Tokens (Chatbot)** | 512 |
| **Max Tokens (Fertilizer)** | 900 |
| **Timeout** | 20 seconds per request |

### AI Key Setup (`backend/.env`)

```env
JWT_SECRET=agribridge-super-secret-key-change-me

GROQ_API_KEY=gsk_your_primary_key_here
GROQ_API_KEY_2=gsk_your_second_key_here    # optional, recommended
GROQ_API_KEY_3=gsk_your_third_key_here     # optional, recommended
```

---

## 14. Security Requirements

| Requirement | Implementation |
|-------------|---------------|
| Authentication | JWT token (PyJWT + python-jose) |
| OTP Auth | Email-based 6-digit OTP; no password stored |
| Secret Management | `.env` file; `.gitignore`d; never hardcoded |
| API Protection | All endpoints except `/auth/*` require valid JWT |
| Production Note | Replace `JWT_SECRET` with a cryptographically strong value before any deployment |

---

## 15. Localization Requirements

| Property | Specification |
|----------|--------------|
| **Supported Languages** | English (en) · Hindi (hi) · Marathi (mr) |
| **Translation Keys** | ~180 keys covering all UI labels, buttons, stats, nav |
| **Persistence** | Stored in `localStorage` as `agribridge-lang` |
| **Switcher UI** | 3-pill toggle in the sidebar (EN / HI / MR) |
| **Voice Search** | SpeechRecognition set to `en-IN` locale |

---

## 16. Performance Requirements

| Metric | Target |
|--------|--------|
| AI response time (cold) | <= 30 seconds |
| AI response time (cached) | < 1 second |
| Standard API response | < 500 ms |
| Frontend initial load | < 3 seconds (4G) |
| Canvas animation | 60 fps (requestAnimationFrame) |
| Groq timeout threshold | 20 seconds |

---

## 17. Constraints & Assumptions

### Constraints

- **Database:** SQLite is used — not suitable for high-concurrency production deployments without migration to PostgreSQL.
- **AI Rate Limits:** Groq free tier has token/minute limits; multi-key rotation is the primary mitigation.
- **No Real Payments:** Payment flow is simulated — no real payment gateway integration.
- **Voice Search:** Limited to Chrome browser (Web Speech API support).
- **Maps/Weather:** Both are free public APIs with no SLA guarantees.

### Assumptions

- Users have a working internet connection.
- Farmers have at least a basic smartphone with a web browser.
- Groq API free tier is sufficient for hackathon/educational usage volume.
- Users accept cookies and localStorage usage for language/session persistence.

---

## 18. Out of Scope

| Feature | Reason |
|---------|--------|
| Real payment processing | Regulatory complexity; MVP uses simulation |
| Native mobile app (iOS/Android) | Web-first approach; PWA possible in future |
| Live GPS order tracking | Requires logistics partner integration |
| Multi-vendor admin panel | Admin tooling not prioritized in v3 |
| Push notifications | Not in current roadmap |
| Product image hosting CDN | Images hosted locally; CDN is a future upgrade |
| ML model training | Uses pre-trained LLMs via API |
| Real-time WebSocket chat | Chat is poll-based; WebSocket is a future upgrade |
| Farmer KYC / verification | Trust layer not implemented in MVP |

---

## 19. Success Metrics

### Engagement Metrics

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| Registered Farmers | 500+ |
| Registered Consumers | 2,000+ |
| Products Listed | 5,000+ |
| Orders Placed | 10,000+ |
| AI Tool Queries | 50,000+ |

### Performance Metrics

| Metric | Target |
|--------|--------|
| AI cache hit rate | > 40% |
| Average AI response time | < 20 seconds |
| API uptime | > 99% |
| Page load time | < 3 seconds |

### Business Metrics

| Metric | Target |
|--------|--------|
| Farmer-to-consumer transaction rate | > 30% of browsing sessions |
| Average order value | Rs. 500+ |
| Repeat purchase rate (consumers) | > 25% within 30 days |
| Language switch usage | > 35% users use HI or MR |

---

## 20. Release Roadmap

### v1.0 — Foundation (Completed)
- Basic farmer/consumer portals
- Product listings and orders
- Simple authentication

### v2.0 — Intelligence (Completed)
- AI Live Price Tracker (Groq)
- Farmer Dashboard with charts (Area, Line, Bar, Pie, Radar)
- AI Insights tab + Radar chart
- Seasonal crop calendar
- Rotating farming tips carousel

### v3.0 — Commerce & Globalization (Completed)
- Trilingual system (EN / HI / MR, ~180 keys)
- Full 3-step checkout wizard (Address → Payment → Confirmation)
- All payment methods (UPI, Card, COD, Net Banking, Wallet)
- Order tracking with 4-stage timeline
- Wishlist page with cart integration
- Coupon codes (FRESH10, AGRI20, FARM15, KISAN5)
- Product performance badges (Top Seller, Low Stock, New)
- Live price ticker (CSS marquee)

### v3.2 — Performance & UX (Current Release)
- Lumina-style split-screen hero pages
- Canvas particle engine (AgriParticles + LoginParticles)
- AI response cache (600s TTL in-memory LRU)
- Multi-key Groq rotation + parallel provider racing
- AI skeleton loaders (AILoader component)
- Voice search via Web Speech API (en-IN)
- Unified green brand across both portals

### v4.0 — Planned
- Real payment gateway (Razorpay / PhonePe)
- WebSocket real-time chat
- Progressive Web App (PWA) support with offline mode
- Admin dashboard
- Farmer KYC / verification
- PostgreSQL migration
- CDN image hosting
- Push notifications

---

## Appendix A — Project Structure

```
AgriBridge/
├── backend/
│   ├── main.py              # FastAPI routes + seed data + all endpoints
│   ├── models.py            # SQLAlchemy SQLite table definitions
│   ├── auth_utils.py        # OTP generation + JWT logic
│   ├── ai_engine.py         # AI with caching, key rotation, racing
│   ├── database.py          # SQLite engine + session config
│   ├── config.py            # Multi-key support (KEY_2, KEY_3)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
└── frontend/
    ├── package.json
    └── src/
        ├── App.js               # Router + Role-based Sidebar + Language Toggle
        ├── api.js               # All Axios API calls (25+ functions)
        ├── index.css            # Global styles + particle + hero animations
        ├── context/
        │   └── LanguageContext.js   # EN/HI/MR i18n system (~180 keys)
        ├── components/
        │   ├── LivePriceTracker.js  # AI Live Price Tracker component
        │   ├── AILoader.js          # Premium animated AI skeleton loader
        │   └── AILoader.css         # AI loader keyframe animations
        └── pages/
            ├── HomePage.js          # Lumina-style split hero (Farmer + Consumer)
            ├── LoginPage.js         # Canvas particle background + OTP auth
            ├── FarmerMarket.js      # Farmer product listings + orders
            ├── ConsumerMarket.js    # Marketplace (coupons + checkout nav)
            ├── CheckoutPage.js      # 3-step checkout wizard
            ├── MyOrdersPage.js      # Consumer order history + status timeline
            ├── WishlistPage.js      # Consumer wishlist with cart integration
            ├── FarmerDashboard.js   # Analytics dashboard (Recharts)
            ├── AIHub.js             # Fertilizer + CropDoctor + Chatbot
            ├── ChatPage.js          # Direct farmer-buyer messaging
            ├── FarmSimulator.js     # AI virtual farm simulator
            ├── FarmingTutorials.js  # DeepSeek-powered farming academy
            ├── Schemes.js           # 31 Government schemes hub
            ├── MapView.js           # Interactive map (farms, stores, delivery)
            └── Weather.js           # Live weather + transport calculator
```

---

## Appendix B — Python Dependencies

```
fastapi, uvicorn, sqlalchemy, pydantic, httpx,
python-jose, passlib, PyJWT, python-dotenv,
python-multipart, aiofiles, geopy, asyncio
```

---

## Appendix C — Glossary

| Term                   | Definition                                    |
| ---------------------- | --------------------------------------------- |
| **Mandi**              | Traditional Indian agricultural wholesale market |
| **OTP**                | One-Time Password — 6-digit verification code sent to email |
| **JWT**                | JSON Web Token — used for stateless authentication |
| **Groq**               | AI inference platform using LPU for fast LLM responses |
| **LLaMA 3.3**          | Meta's large language model used for text AI features |
| **LPU**                | Language Processing Unit — Groq's custom chip for fast AI inference |
| **Kisan**              | Hindi/Marathi word for "Farmer" |
| **GST**                | Goods and Services Tax — 5% applied to consumer orders |
| **COD** w               | Cash on Delivery — payment collected at delivery |
| **UPI**                | Unified Payments Interface — Indian digital payment standard |
| **PRD**                | Product Requirements Document |





---

*This PRD covers AgriBridge v3.2 — an educational/hackathon full-stack agricultural platform.*  
*For production deployment, replace all placeholder API keys and secrets with secure values.*
