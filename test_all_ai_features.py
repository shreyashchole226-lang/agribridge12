"""
AgriBridge - Complete AI Features Test Script
Tests all AI endpoints to verify new API keys are working correctly.
Run AFTER starting the backend: uvicorn main:app --reload --port 8000
"""

import httpx
import asyncio
import sys
import json
import base64
import os

BASE_URL = "http://localhost:8000"

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

results = []

def ok(msg):
    print(f"  {GREEN}✅ {msg}{RESET}")
    results.append(("PASS", msg))

def fail(msg):
    print(f"  {RED}❌ {msg}{RESET}")
    results.append(("FAIL", msg))

def warn(msg):
    print(f"  {YELLOW}⚠️  {msg}{RESET}")
    results.append(("WARN", msg))

def section(title):
    print(f"\n{BOLD}{CYAN}{'═'*55}{RESET}")
    print(f"{BOLD}{CYAN} {title}{RESET}")
    print(f"{BOLD}{CYAN}{'═'*55}{RESET}")


async def test_health():
    section("1. Backend Health Check")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{BASE_URL}/docs")
            if r.status_code == 200:
                ok("Backend is running at http://localhost:8000")
            else:
                fail(f"Backend returned {r.status_code}")
    except Exception as e:
        fail(f"Backend is NOT running! Start it first. Error: {e}")
        sys.exit(1)


async def test_key_status():
    section("2. Groq API Key Status")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{BASE_URL}/ai/key-status")
            data = r.json()
            print(f"  Total Groq keys configured: {data['total_keys']}")
            print(f"  Active keys: {data['active_keys']}")
            for k in data["keys"]:
                status_icon = "🟢" if k["status"] == "active" else "🔴"
                print(f"  {status_icon} Key {k['key_num']} ({k['key_hint']}): {k['status']} | {k['total_requests']} requests")
            if data["active_keys"] > 0:
                ok("At least one Groq key is active")
            else:
                fail("No active Groq keys! Check your GROQ_API_KEY in .env")
    except Exception as e:
        fail(f"Key status check failed: {e}")


async def test_ai_providers():
    section("3. AI Providers Configuration")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{BASE_URL}/ai/providers")
            data = r.json()
            for route in data["routing"]:
                configured = route["primary_configured"]
                icon = "🟢" if configured else "🟡"
                status = "configured" if configured else "fallback only"
                print(f"  {icon} {route['feature']}: {route['primary']} ({status})")
                if configured:
                    ok(f"{route['feature']} → {route['primary']} ({route['model']})")
                else:
                    warn(f"{route['feature']} → Will use fallback")
    except Exception as e:
        fail(f"Provider check failed: {e}")


async def test_groq_chatbot():
    section("4. Groq AI — Farming Chatbot")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            payload = {
                "user_message": "What is the best time to sow tomatoes in Pune?",
                "conversation_history": []
            }
            r = await client.post(f"{BASE_URL}/ai/chatbot", json=payload)
            data = r.json()
            if r.status_code == 200 and isinstance(data, str) and len(data) > 20:
                ok(f"Chatbot response received ({len(data)} chars)")
                print(f"  📝 Preview: {data[:120]}...")
            elif r.status_code == 200:
                ok(f"Chatbot returned: {str(data)[:150]}")
            else:
                fail(f"Chatbot failed: {r.status_code} — {data}")
    except Exception as e:
        fail(f"Chatbot test failed: {e}")


async def test_deepseek_fertilizer():
    section("5. DeepSeek AI — Fertilizer Advisor")
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            payload = {
                "farmer_id": 1,
                "crop": "Tomato",
                "soil_type": "Loamy",
                "ph": 6.5,
                "nitrogen": 80,
                "phosphorus": 40,
                "potassium": 60,
                "area_acres": 2.0
            }
            r = await client.post(f"{BASE_URL}/ai/fertilizer-advisor", json=payload)
            data = r.json()
            if r.status_code == 200 and "advice" in data and len(data["advice"]) > 50:
                ok(f"Fertilizer advice received ({len(data['advice'])} chars)")
                print(f"  📝 Preview: {data['advice'][:120]}...")
            else:
                fail(f"Fertilizer advisor failed: {r.status_code} — {str(data)[:200]}")
    except Exception as e:
        fail(f"Fertilizer test failed: {e}")


async def test_groq_live_prices():
    section("6. Groq AI — Live Mandi Prices")
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            payload = {
                "commodities": ["Tomato", "Onion", "Wheat", "Toor Dal"],
                "market": "Pune APMC"
            }
            r = await client.post(f"{BASE_URL}/ai/live-prices", json=payload)
            data = r.json()
            if r.status_code == 200 and data.get("success"):
                prices = data.get("prices", [])
                is_fallback = data.get("fallback", False)
                is_cached = data.get("cached", False)
                source = "FALLBACK" if is_fallback else ("CACHED" if is_cached else "LIVE AI")
                ok(f"Live prices received — {len(prices)} commodities [{source}]")
                if prices:
                    p = prices[0]
                    print(f"  📊 {p['commodity']}: ₹{p['current_price']}/kg ({p['trend']} {p.get('change_percent', 0):.1f}%)")
                if is_fallback:
                    warn("Using fallback prices — Groq may be rate-limited")
            else:
                fail(f"Live prices failed: {r.status_code} — {str(data)[:200]}")
    except Exception as e:
        fail(f"Live prices test failed: {e}")


async def test_groq_farm_simulator():
    section("7. Groq AI — Farm Simulator")
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            payload = {
                "land_size_acres": 2.0,
                "location": "Pune, Maharashtra",
                "budget_inr": 100000,
                "soil_type": "Loamy",
                "season": "Kharif"
            }
            r = await client.post(f"{BASE_URL}/ai/farm-simulator", json=payload)
            data = r.json()
            if r.status_code == 200 and data.get("success") and data.get("crops"):
                crops = data["crops"]
                ok(f"Farm simulator returned {len(crops)} crop recommendations")
                for i, c in enumerate(crops[:3]):
                    print(f"  {i+1}. {c['name']} — ROI: {c.get('roi_percent', 0)}% | Risk: {c.get('risk_level', '?')}")
            else:
                fail(f"Farm simulator failed: {r.status_code} — {str(data)[:200]}")
    except Exception as e:
        fail(f"Farm simulator test failed: {e}")


async def test_openrouter_yield_prediction():
    section("8. OpenRouter AI — Yield Predictor")
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            payload = {
                "crop_type": "Vegetable",
                "crop_name": "Tomato",
                "season": "Kharif",
                "location": "Pune, Maharashtra",
                "land_size_acres": 2.0,
                "soil_type": "Loamy",
                "irrigation": "Drip",
                "variety": ""
            }
            r = await client.post(f"{BASE_URL}/ai/yield-prediction", json=payload)
            data = r.json()
            if r.status_code == 200 and data.get("success"):
                summary = data.get("prediction_summary", {})
                provider = data.get("ai_provider", "Unknown")
                ok(f"Yield prediction received [Provider: {provider}]")
                print(f"  📈 Total Yield: {summary.get('total_yield_kg', 0):,} kg")
                print(f"  💰 Revenue: ₹{summary.get('total_revenue_min_inr', 0):,} – ₹{summary.get('total_revenue_max_inr', 0):,}")
                print(f"  🎯 ROI: {summary.get('roi_percent', 0)}%")
                monthly = data.get("monthly_forecast", [])
                if monthly:
                    ok(f"Monthly forecast has {len(monthly)} months")
                else:
                    warn("Monthly forecast is empty")
            else:
                fail(f"Yield prediction failed: {r.status_code} — {str(data)[:200]}")
    except Exception as e:
        fail(f"Yield prediction test failed: {e}")


async def test_groq_farming_tutorials():
    section("9. Groq AI — Farming Academy Tutorials")
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            payload = {
                "category": "home_farming",
                "topic": "",
                "user_level": "beginner"
            }
            r = await client.post(f"{BASE_URL}/ai/farming-tutorials", json=payload)
            data = r.json()
            if r.status_code == 200 and data.get("success"):
                tutorials = data.get("tutorials", [])
                ok(f"Farming tutorials received — {len(tutorials)} tutorials")
                for t in tutorials[:2]:
                    print(f"  📚 {t.get('title', 'No title')} [{t.get('level', '?')}]")
                micro = data.get("micro_farming_guide", {})
                if micro and micro.get("types"):
                    ok(f"Micro farming guide has {len(micro['types'])} business types")
            else:
                fail(f"Farming tutorials failed: {r.status_code} — {str(data)[:200]}")
    except Exception as e:
        fail(f"Farming tutorials test failed: {e}")


async def test_groq_stress_detector():
    section("10. Groq AI — Farmer Stress Detector")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            payload = {
                "messages": [
                    {"role": "user", "content": "My tomato crop has completely failed this season due to heavy rain. I took a loan and don't know how to repay."},
                    {"role": "assistant", "content": "I'm sorry to hear that. Have you looked into PM Fasal Bima Yojana?"},
                    {"role": "user", "content": "I don't know what to do. Everything is lost."}
                ],
                "response_delay_seconds": 0
            }
            r = await client.post(f"{BASE_URL}/ai/stress-detector", json=payload)
            data = r.json()
            if r.status_code == 200 and data.get("success"):
                level = data.get("stress_level", "Unknown")
                score = data.get("stress_score", 0)
                action = data.get("recommended_action", "none")
                ok(f"Stress detector working — Level: {level} (score: {score}/10) | Action: {action}")
                signals = data.get("detected_signals", [])
                if signals:
                    print(f"  🔍 Detected signals: {', '.join(signals[:3])}")
            else:
                fail(f"Stress detector failed: {r.status_code} — {str(data)[:200]}")
    except Exception as e:
        fail(f"Stress detector test failed: {e}")


async def test_weather():
    section("11. Weather (wttr.in — No API Key)")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{BASE_URL}/weather", params={"city": "Pune"})
            data = r.json()
            if r.status_code == 200 and data.get("success"):
                ok(f"Weather data received — {data['city']}: {data['temperature']}°C, {data['description']}")
            else:
                fail(f"Weather failed: {r.status_code} — {str(data)[:200]}")
    except Exception as e:
        fail(f"Weather test failed: {e}")


async def test_products_api():
    section("12. Products API (Non-AI)")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{BASE_URL}/products")
            data = r.json()
            if r.status_code == 200 and len(data) > 0:
                ok(f"Products API working — {len(data)} products in database")
            else:
                fail(f"Products API failed: {r.status_code}")
    except Exception as e:
        fail(f"Products test failed: {e}")


async def main():
    print(f"\n{BOLD}{'='*55}")
    print(f" AgriBridge — Complete AI Feature Test Suite")
    print(f" Testing all AI features with new API keys")
    print(f"{'='*55}{RESET}\n")

    await test_health()
    await test_key_status()
    await test_ai_providers()
    await test_groq_chatbot()
    await test_deepseek_fertilizer()
    await test_groq_live_prices()
    await test_groq_farm_simulator()
    await test_openrouter_yield_prediction()
    await test_groq_farming_tutorials()
    await test_groq_stress_detector()
    await test_weather()
    await test_products_api()

    # Summary
    section("TEST SUMMARY")
    passed = sum(1 for r in results if r[0] == "PASS")
    failed = sum(1 for r in results if r[0] == "FAIL")
    warned = sum(1 for r in results if r[0] == "WARN")
    total = len(results)

    print(f"  {GREEN}✅ Passed: {passed}{RESET}")
    print(f"  {RED}❌ Failed: {failed}{RESET}")
    print(f"  {YELLOW}⚠️  Warnings: {warned}{RESET}")
    print(f"  Total checks: {total}")

    if failed == 0:
        print(f"\n  {GREEN}{BOLD}🎉 All AI features are working with your new API keys!{RESET}")
    else:
        print(f"\n  {RED}{BOLD}❌ {failed} test(s) failed. Check the errors above.{RESET}")
        print(f"\n  Common fixes:")
        print(f"  1. Make sure backend is running: uvicorn main:app --reload --port 8000")
        print(f"  2. Check all keys in backend/.env are valid")
        print(f"  3. Groq rate limits reset after 60 seconds — try again")

    print()


if __name__ == "__main__":
    asyncio.run(main())
