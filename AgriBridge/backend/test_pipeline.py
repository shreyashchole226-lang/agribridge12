"""
AgriBridge — Full Pipeline & AI Feature Test
============================================
Runs in two stages:
  Stage 1 │ API Key Health   — checks all 4 keys + SMTP
  Stage 2 │ AI Feature Tests — calls every real AI function with sample data

Usage:
    python test_pipeline.py
"""

import os, sys, asyncio, time, json, textwrap
from pathlib import Path
from dotenv import load_dotenv

# Always force-reload .env so new keys are never missed
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

# ── Colour / style helpers ───────────────────────────────────────────────────
GRN  = lambda s: f"\033[92m{s}\033[0m"
RED  = lambda s: f"\033[91m{s}\033[0m"
YLW  = lambda s: f"\033[93m{s}\033[0m"
CYN  = lambda s: f"\033[96m{s}\033[0m"
BLD  = lambda s: f"\033[1m{s}\033[0m"
DIM  = lambda s: f"\033[2m{s}\033[0m"

OK   = lambda s: GRN(f"  ✅  {s}")
ERR  = lambda s: RED(f"  ❌  {s}")
WRN  = lambda s: YLW(f"  ⚠️   {s}")
INF  = lambda s: CYN(f"  ℹ️   {s}")

def banner(title: str):
    w = 60
    print(f"\n\033[96m{'═'*w}\033[0m")
    print(f"\033[1;96m  {title}\033[0m")
    print(f"\033[96m{'═'*w}\033[0m\n")

def section(title: str):
    print(f"\n\033[93m  ── {title} {'─'*(50-len(title))}\033[0m")

def elapsed(t0: float) -> str:
    return DIM(f"({round(time.time()-t0,1)}s)")

# ────────────────────────────────────────────────────────────────────────────
# STAGE 1 — API Key Health
# ────────────────────────────────────────────────────────────────────────────

key_results: dict = {}

async def _ping_groq(var: str):
    import httpx
    key = os.getenv(var, "").strip()
    if not key:
        key_results[var] = WRN(f"{var} — not set / blank")
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile",
                      "messages": [{"role": "user", "content": "Reply with the single word: OK"}],
                      "max_tokens": 5},
            )
        if r.status_code == 200:
            reply = r.json()["choices"][0]["message"]["content"].strip()
            key_results[var] = OK(f"{var} → HTTP 200  reply='{reply}'  hint=...{key[-8:]}")
            return True
        key_results[var] = ERR(f"{var} → HTTP {r.status_code}: {r.text[:100]}")
        return False
    except Exception as e:
        key_results[var] = ERR(f"{var} → {type(e).__name__}: {e}")
        return False

async def _ping_openrouter(var: str):
    import httpx
    key = os.getenv(var, "").strip()
    if not key:
        key_results[var] = WRN(f"{var} — not set / blank")
        return False
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                         "HTTP-Referer": "https://agribridge.app", "X-Title": "AgriBridge"},
                json={"model": "meta-llama/llama-3.3-70b-instruct",
                      "messages": [{"role": "user", "content": "Reply with the single word: OK"}],
                      "max_tokens": 5},
            )
        if r.status_code == 200:
            reply = r.json()["choices"][0]["message"]["content"].strip()
            key_results[var] = OK(f"{var} → HTTP 200  reply='{reply[:30]}'  hint=...{key[-8:]}")
            return True
        key_results[var] = ERR(f"{var} → HTTP {r.status_code}: {r.text[:100]}")
        return False
    except Exception as e:
        key_results[var] = ERR(f"{var} → {type(e).__name__}: {e}")
        return False

def _ping_smtp():
    import smtplib
    user   = os.getenv("MAIL_USERNAME", "").strip()
    pwd    = os.getenv("MAIL_PASSWORD", "").strip()
    server = os.getenv("MAIL_SERVER",   "smtp.gmail.com")
    port   = int(os.getenv("MAIL_PORT", "587") or 587)
    if not user or not pwd:
        key_results["SMTP"] = WRN("MAIL_USERNAME / MAIL_PASSWORD — not set")
        return False
    try:
        smtp = smtplib.SMTP(server, port, timeout=10)
        smtp.starttls(); smtp.login(user, pwd); smtp.quit()
        key_results["SMTP"] = OK(f"SMTP {server}:{port} → login OK  ({user})")
        return True
    except smtplib.SMTPAuthenticationError:
        key_results["SMTP"] = ERR(f"SMTP auth failed — use Gmail App Password")
        return False
    except Exception as e:
        key_results["SMTP"] = ERR(f"SMTP → {type(e).__name__}: {e}")
        return False

async def stage1_key_health():
    banner("STAGE 1 — API Key Health Check")
    t0 = time.time()

    section("Groq keys  (round-robin load-balanced)")
    await asyncio.gather(_ping_groq("GROQ_API_KEY"), _ping_groq("GROQ_API_KEY_2"))
    for k in ["GROQ_API_KEY", "GROQ_API_KEY_2"]:
        print(key_results[k])

    section("OpenRouter keys  (round-robin load-balanced)")
    await asyncio.gather(_ping_openrouter("OPENROUTER_API_KEY"), _ping_openrouter("OPENROUTER_API_KEY_2"))
    for k in ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY_2"]:
        print(key_results[k])

    section("Gmail SMTP")
    _ping_smtp()
    print(key_results["SMTP"])

    passed = sum(1 for v in key_results.values() if "✅" in v)
    failed = sum(1 for v in key_results.values() if "❌" in v)
    warned = sum(1 for v in key_results.values() if "⚠" in v)

    print(f"\n  {BLD('Key summary:')}  {GRN(f'{passed} passed')}  │  {RED(f'{failed} failed')}  │  {YLW(f'{warned} warnings')}  {elapsed(t0)}")

    if failed:
        print(RED("  Fix failing keys before starting the backend!"))
    return failed == 0


# ────────────────────────────────────────────────────────────────────────────
# STAGE 2 — AI Feature Tests
# ────────────────────────────────────────────────────────────────────────────

feat_results: list = []   # list of (name, ok, detail, duration)

def record(name: str, ok: bool, detail: str, dur: float):
    feat_results.append((name, ok, detail, dur))

async def _run_feature(label: str, coro):
    """Run a single AI feature coroutine, catch errors, record timing."""
    t0 = time.time()
    try:
        result = await coro
        dur = round(time.time() - t0, 1)
        if isinstance(result, dict):
            ok  = result.get("success", True)
            err = result.get("error", "")
            detail = f"provider={result.get('ai_provider','?')}  keys={list(result.keys())[:4]}" if ok else f"ERROR: {err}"
        elif isinstance(result, str):
            # Any non-empty response that doesn't start with an error marker is a pass
            ok     = len(result) > 0 and not result.startswith("⚠") and not result.lower().startswith("error")
            detail = textwrap.shorten(result, 90) if ok else result[:120]
        else:
            ok, detail = True, str(result)[:80]
        record(label, ok, detail, dur)
    except Exception as e:
        dur = round(time.time() - t0, 1)
        record(label, False, f"{type(e).__name__}: {str(e)[:100]}", dur)


async def stage2_ai_features():
    banner("STAGE 2 — AI Feature Pipeline Test")

    # Import the engine AFTER env is loaded
    try:
        import ai_engine as ai
    except Exception as e:
        print(ERR(f"Cannot import ai_engine: {e}"))
        return False

    # ── 1. Groq basic call ──────────────────────────────────────────────────
    section("1. Groq LLM  (key_manager round-robin)")
    await _run_feature(
        "Groq call_groq()",
        ai.call_groq("What is the capital of Maharashtra? One word.", max_tokens=10)
    )

    # ── 2. OpenRouter basic call ────────────────────────────────────────────
    section("2. OpenRouter LLM  (openrouter_key_manager round-robin)")
    await _run_feature(
        "OpenRouter call_openrouter()",
        ai.call_openrouter("What is the capital of Maharashtra? One word.", max_tokens=10)
    )

    # ── 3. race_providers ───────────────────────────────────────────────────
    section("3. Provider Racing  (Groq ⚡ vs OpenRouter 🌐 — fastest wins)")
    await _run_feature(
        "race_providers(['groq','openrouter'])",
        ai.race_providers("Say the single word: Mumbai", max_tokens=10,
                          providers=["groq", "openrouter"])
    )

    # ── 4. Fertilizer Advisor ───────────────────────────────────────────────
    section("4. Fertilizer Advisor  (Groq + OpenRouter race)")
    await _run_feature(
        "get_fertilizer_advice()",
        ai.get_fertilizer_advice(
            crop="Wheat", soil_type="Loamy", ph=6.5,
            nitrogen=80, phosphorus=40, potassium=60, area_acres=2.0
        )
    )

    # ── 5. Farming Chatbot ──────────────────────────────────────────────────
    section("5. Farming Chatbot  (Groq primary, OpenRouter fallback)")
    await _run_feature(
        "farming_chatbot()",
        ai.farming_chatbot("What is the best crop for Pune in Kharif season?", [])
    )

    # ── 6. Farm Simulator ──────────────────────────────────────────────────
    section("6. Virtual Farm Simulator  (Groq JSON)")
    await _run_feature(
        "simulate_farm_crops()",
        ai.simulate_farm_crops(
            land_size_acres=3.0, location="Nashik, Maharashtra",
            budget_inr=50000, soil_type="Red Laterite", season="Kharif"
        )
    )

    # ── 7. Yield Predictor ──────────────────────────────────────────────────
    section("7. Yield Predictor  (OpenRouter → Groq fallback)")
    await _run_feature(
        "predict_seasonal_yield()",
        ai.predict_seasonal_yield(
            crop_type="Vegetable", crop_name="Tomato", season="Kharif",
            location="Pune, Maharashtra", land_size_acres=1.5,
            soil_type="Loamy", irrigation="Drip"
        )
    )

    # ── 8. Farming Tutorials ────────────────────────────────────────────────
    section("8. Farming Tutorials  (OpenRouter → Groq fallback)")
    await _run_feature(
        "get_farming_tutorials()",
        ai.get_farming_tutorials(category="home_farming", user_level="beginner")
    )

    # ── 9. Stress Detector ──────────────────────────────────────────────────
    section("9. Farmer Stress Detector  (Groq JSON)")
    await _run_feature(
        "detect_farmer_stress()",
        ai.detect_farmer_stress([
            {"role": "user", "content": "My tomato crop is doing well this year."},
            {"role": "assistant", "content": "Great to hear! Keep up the good work."},
            {"role": "user", "content": "Yes, I hope the prices stay good at the mandi."},
        ])
    )

    # ── 10. Weather (no AI key needed) ──────────────────────────────────────
    section("10. Weather Service  (wttr.in — no API key)")
    await _run_feature(
        "get_weather('Pune')",
        ai.get_weather("Pune")
    )

    # ── Print Results ────────────────────────────────────────────────────────
    banner("STAGE 2 — AI Feature Results")
    passed = failed = 0
    for name, ok, detail, dur in feat_results:
        tag = OK if ok else ERR
        status = "PASS" if ok else "FAIL"
        print(tag(f"[{status}] {name}  ({dur}s)"))
        print(DIM(f"         {detail}\n"))
        if ok: passed += 1
        else:  failed += 1

    print(f"  {BLD('Feature summary:')}  {GRN(f'{passed} passed')}  │  {RED(f'{failed} failed')}")
    return failed == 0


# ────────────────────────────────────────────────────────────────────────────
# PIPELINE OVERVIEW — printed before running
# ────────────────────────────────────────────────────────────────────────────

def print_pipeline_diagram():
    banner("AgriBridge AI Key Pipeline")
    print(CYN("""
  ┌─────────────────────────────────────────────────────┐
  │              GROQ  (2 keys, round-robin)             │
  │   GROQ_API_KEY  ──→  GroqKeyManager                  │
  │   GROQ_API_KEY_2 ─→  (429 cooldown + auto-retry)    │
  │                                                      │
  │   Used by: Chatbot, Farm Simulator, Fertilizer       │
  │            Advisor (race), Crop Doctor (Vision),     │
  │            Stress Detector, Price Predictor          │
  ├─────────────────────────────────────────────────────┤
  │           OPENROUTER  (2 keys, round-robin)          │
  │   OPENROUTER_API_KEY   ──→  MultiKeyManager          │
  │   OPENROUTER_API_KEY_2 ──→  (429 cooldown + retry)  │
  │                                                      │
  │   Used by: Yield Predictor, Tutorials,               │
  │            Fertilizer Advisor (race), Chatbot 429    │
  │            fallback                                  │
  ├─────────────────────────────────────────────────────┤
  │                  RACE STRATEGY                       │
  │   Groq ⚡ + OpenRouter 🌐 fire simultaneously        │
  │   → First healthy response wins                      │
  │   → Loser task cancelled (no wasted tokens)         │
  ├─────────────────────────────────────────────────────┤
  │                GMAIL SMTP                            │
  │   Used by: OTP login / email verification           │
  └─────────────────────────────────────────────────────┘
"""))

# ────────────────────────────────────────────────────────────────────────────
# MAIN
# ────────────────────────────────────────────────────────────────────────────

async def main():
    t_total = time.time()
    print_pipeline_diagram()

    keys_ok = await stage1_key_health()
    if not keys_ok:
        print(YLW("\n  ⚠️  One or more keys failed. AI feature tests may be unreliable."))
        ans = input("  Continue to feature tests anyway? [y/N] ").strip().lower()
        if ans != "y":
            sys.exit(1)

    feats_ok = await stage2_ai_features()

    total = round(time.time() - t_total, 1)
    banner("Final Report")
    print(OK("All keys healthy + all features passing!") if (keys_ok and feats_ok)
          else ERR("Some checks failed — see details above"))
    print(f"\n  Total time: {total}s\n")

if __name__ == "__main__":
    asyncio.run(main())
