"""
AgriBridge — API Key Health Tester
Tests every key in .env with a real lightweight call.
"""
import os, sys, asyncio, time
from pathlib import Path
from dotenv import load_dotenv

# Always force-reload so newly added keys are picked up immediately
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

# ── Colour helpers ──────────────────────────────────────────
OK  = lambda s: f"\033[92m✅ {s}\033[0m"
ERR = lambda s: f"\033[91m❌ {s}\033[0m"
WRN = lambda s: f"\033[93m⚠️  {s}\033[0m"
HDR = lambda s: f"\033[96m{'═'*55}\n   {s}\n{'═'*55}\033[0m"

results = {}

# ── Groq ────────────────────────────────────────────────────
async def test_groq_key(var: str):
    key = os.getenv(var, "")
    if not key or "your" in key.lower():
        results[var] = WRN(f"{var} not set")
        return
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 5}
            )
        if r.status_code == 200:
            word = r.json()["choices"][0]["message"]["content"].strip()
            results[var] = OK(f"{var} → {r.status_code} | reply: '{word}'")
        else:
            results[var] = ERR(f"{var} → HTTP {r.status_code}: {r.text[:120]}")
    except Exception as e:
        results[var] = ERR(f"{var} → {type(e).__name__}: {str(e)[:100]}")

async def test_groq():
    await asyncio.gather(
        test_groq_key("GROQ_API_KEY"),
        test_groq_key("GROQ_API_KEY_2"),
    )

# ── OpenRouter ──────────────────────────────────────────────
async def test_openrouter_key(var: str):
    key = os.getenv(var, "")
    if not key or "your" in key.lower():
        results[var] = WRN(f"{var} not set")
        return
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": "deepseek/deepseek-chat", "messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 5}
            )
        if r.status_code == 200:
            word = r.json()["choices"][0]["message"]["content"].strip()
            results[var] = OK(f"{var} → {r.status_code} | reply: '{word}'")
        else:
            results[var] = ERR(f"{var} → HTTP {r.status_code}: {r.text[:120]}")
    except Exception as e:
        results[var] = ERR(f"{var} → {type(e).__name__}: {str(e)[:100]}")

async def test_openrouter():
    await asyncio.gather(
        test_openrouter_key("OPENROUTER_API_KEY"),
        test_openrouter_key("OPENROUTER_API_KEY_2"),
    )

# ── Mail (SMTP) ─────────────────────────────────────────────
def test_mail():
    import smtplib
    user   = os.getenv("MAIL_USERNAME", "")
    pwd    = os.getenv("MAIL_PASSWORD", "")
    server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    port   = int(os.getenv("MAIL_PORT", "587") or 587)
    if not user or not pwd or "your" in (user + pwd).lower():
        results["Mail"] = WRN("MAIL_USERNAME / MAIL_PASSWORD not set")
        return
    try:
        smtp = smtplib.SMTP(server, port, timeout=10)
        smtp.starttls()
        smtp.login(user, pwd)
        smtp.quit()
        results["Mail"] = OK(f"SMTP {server}:{port} → Login successful ({user})")
    except smtplib.SMTPAuthenticationError:
        results["Mail"] = ERR(f"SMTP {server}:{port} → Auth failed — wrong password or App Password needed")
    except Exception as e:
        results["Mail"] = ERR(f"SMTP {server}:{port} → {type(e).__name__}: {str(e)[:100]}")

# ── Main ─────────────────────────────────────────────────────
async def main():
    print(HDR("AgriBridge API Key Health Check"))
    print()
    t0 = time.time()

    await asyncio.gather(
        test_groq(),
        test_openrouter(),
    )
    test_mail()

    elapsed = round(time.time() - t0, 1)
    print(f"\n{'─'*55}")
    for name, result in results.items():
        print(result)

    passed = sum(1 for v in results.values() if "✅" in v)
    failed = sum(1 for v in results.values() if "❌" in v)
    warned = sum(1 for v in results.values() if "⚠" in v)

    print(f"\n{'─'*55}")
    print(f"  Results: {passed} passed  |  {failed} failed  |  {warned} warnings")
    print(f"  Time:    {elapsed}s")
    print(f"{'─'*55}\n")

if __name__ == "__main__":
    asyncio.run(main())
