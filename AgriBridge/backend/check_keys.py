import os, asyncio, time, sys
from pathlib import Path
from dotenv import load_dotenv

# Force UTF-8 output on Windows so emoji in API replies don't crash
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)
import httpx, smtplib

results = {}

async def test_groq(var):
    key = os.getenv(var, "")
    if not key:
        results[var] = "[SKIP] " + var + " not set"
        return
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 5}
            )
        if r.status_code == 200:
            reply = r.json()["choices"][0]["message"]["content"].strip()
            results[var] = "[PASS] " + var + " -> HTTP 200 | reply: " + reply
        else:
            results[var] = "[FAIL] " + var + " -> HTTP " + str(r.status_code) + ": " + r.text[:150]
    except Exception as e:
        results[var] = "[ERROR] " + var + " -> " + str(e)

async def test_openrouter(var):
    key = os.getenv(var, "")
    if not key:
        results[var] = "[SKIP] " + var + " not set"
        return
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
                json={"model": "deepseek/deepseek-chat", "messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 5}
            )
        if r.status_code == 200:
            reply = r.json()["choices"][0]["message"]["content"].strip()
            results[var] = "[PASS] " + var + " -> HTTP 200 | reply: " + reply
        else:
            results[var] = "[FAIL] " + var + " -> HTTP " + str(r.status_code) + ": " + r.text[:150]
    except Exception as e:
        results[var] = "[ERROR] " + var + " -> " + str(e)

def test_mail():
    user   = os.getenv("MAIL_USERNAME", "")
    pwd    = os.getenv("MAIL_PASSWORD", "")
    server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    port   = int(os.getenv("MAIL_PORT", "587") or 587)
    if not user or not pwd:
        results["Mail_SMTP"] = "[SKIP] MAIL_USERNAME / MAIL_PASSWORD not set"
        return
    try:
        s = smtplib.SMTP(server, port, timeout=10)
        s.starttls()
        s.login(user, pwd)
        s.quit()
        results["Mail_SMTP"] = "[PASS] SMTP " + server + ":" + str(port) + " -> Login OK (" + user + ")"
    except smtplib.SMTPAuthenticationError:
        results["Mail_SMTP"] = "[FAIL] SMTP " + server + ":" + str(port) + " -> Auth failed (wrong password / App Password needed)"
    except Exception as e:
        results["Mail_SMTP"] = "[ERROR] SMTP -> " + str(e)

async def main():
    print("=" * 55)
    print("  AgriBridge API Key Health Check")
    print("=" * 55)
    t0 = time.time()

    await asyncio.gather(
        test_groq("GROQ_API_KEY"),
        test_groq("GROQ_API_KEY_2"),
        test_openrouter("OPENROUTER_API_KEY"),
        test_openrouter("OPENROUTER_API_KEY_2"),
    )
    test_mail()

    elapsed = round(time.time() - t0, 1)
    print()
    passed = failed = skipped = 0
    for k, v in results.items():
        print(v)
        if "[PASS]"  in v: passed  += 1
        elif "[FAIL]" in v or "[ERROR]" in v: failed += 1
        else: skipped += 1

    print()
    print("-" * 55)
    print("  PASSED:  " + str(passed))
    print("  FAILED:  " + str(failed))
    print("  SKIPPED: " + str(skipped))
    print("  Time:    " + str(elapsed) + "s")
    print("-" * 55)

if __name__ == "__main__":
    asyncio.run(main())
