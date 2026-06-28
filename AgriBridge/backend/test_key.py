import httpx
import asyncio

async def test():
    key = open(".env").read()
    for line in key.splitlines():
        if line.startswith("GROQ_API_KEY="):
            api_key = line.split("=", 1)[1].strip()
            break

    print(f"Testing key: {api_key[:20]}...")
    r = await httpx.AsyncClient(timeout=15).post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 5}
    )
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:300]}")

asyncio.run(test())
