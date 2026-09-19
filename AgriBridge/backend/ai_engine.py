import httpx
import base64
import asyncio
import time
import threading
import hashlib
from functools import partial
from config import settings
import json as json_lib

GROQ_BASE = "https://api.groq.com/openai/v1"

# ─── AI Provider Labels (shown in frontend) ───────────────────────────────────
PROVIDER_LABELS = {
    "groq":       {"name": "Groq",       "model": "LLaMA 3.3 70B",  "emoji": "⚡"},
    "openrouter": {"name": "OpenRouter", "model": "LLaMA 3.3 70B", "emoji": "🌐"},
}


# ─── AI Response Cache ────────────────────────────────────────────────────────
# Caches identical AI responses for 10 minutes so repeat queries are instant.
# Max 500 entries — oldest entries evicted when full (simple LRU-style cap).

class AIResponseCache:
    """Thread-safe in-memory response cache with TTL."""

    def __init__(self, ttl_seconds: int = 600, max_entries: int = 500):
        self._cache: dict = {}          # key → (response, expiry_timestamp)
        self._lock  = threading.Lock()
        self._ttl   = ttl_seconds
        self._max   = max_entries

    def _make_key(self, prompt: str, func_name: str = "") -> str:
        """Hash the first 300 chars of the prompt + function name."""
        raw = f"{func_name}:{prompt[:300]}"
        return hashlib.sha256(raw.encode()).hexdigest()[:24]

    def get(self, prompt: str, func_name: str = "") -> str | None:
        key = self._make_key(prompt, func_name)
        with self._lock:
            entry = self._cache.get(key)
            if entry and time.time() < entry[1]:
                return entry[0]
            if entry:
                del self._cache[key]   # expired
        return None

    def set(self, prompt: str, response: str, func_name: str = "") -> None:
        key = self._make_key(prompt, func_name)
        with self._lock:
            # Evict oldest entries if at capacity
            if len(self._cache) >= self._max:
                oldest = min(self._cache, key=lambda k: self._cache[k][1])
                del self._cache[oldest]
            self._cache[key] = (response, time.time() + self._ttl)

    def stats(self) -> dict:
        with self._lock:
            now = time.time()
            active = sum(1 for _, exp in self._cache.values() if now < exp)
            return {"total_entries": len(self._cache), "active_entries": active, "ttl_seconds": self._ttl}


# Singleton cache — shared across all requests
ai_cache = AIResponseCache(ttl_seconds=600, max_entries=500)


# ─── Smart Key Manager ────────────────────────────────────────────────────────
# Rotates between GROQ_API_KEY and GROQ_API_KEY_2 (if configured).
# On a 429 rate-limit hit, the offending key is put into a 60-second cooldown
# and all further requests automatically use the other key.
# Round-robin distributes load evenly when both keys are healthy.

class GroqKeyManager:
    """
    Groq API key manager with 429 cooldown tracking.
    Works with a single key — manages cooldown and request stats.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._last_index = 0             # round-robin index
        self._cooldowns: dict = {}       # key -> unix timestamp when cooldown expires
        self._request_counts: dict = {}  # key -> total requests served (for stats)

    @property
    def keys(self) -> list:
        """Returns current key list from config (supports hot-reload)."""
        return settings.GROQ_API_KEYS

    def _is_on_cooldown(self, key: str) -> bool:
        expiry = self._cooldowns.get(key, 0)
        return time.time() < expiry

    def get_key(self) -> str:
        """Return the next available key, or raise if all rate-limited."""
        with self._lock:
            all_keys = self.keys
            if not all_keys:
                raise RuntimeError(
                    "No GROQ_API_KEY configured! Add it to backend/.env"
                )
            
            # Try to find a non-cooldown key in round-robin fashion
            for i in range(len(all_keys)):
                idx = (self._last_index + i) % len(all_keys)
                key = all_keys[idx]
                if not self._is_on_cooldown(key):
                    self._last_index = (idx + 1) % len(all_keys)
                    self._request_counts[key] = self._request_counts.get(key, 0) + 1
                    return key
            
            # If all are on cooldown, just return the next one in sequence to trigger error/retry
            key = all_keys[self._last_index]
            self._last_index = (self._last_index + 1) % len(all_keys)
            return key

    def mark_rate_limited(self, key: str, retry_after_secs: float = 60.0):
        """Put the key on cooldown after receiving a 429 response."""
        with self._lock:
            self._cooldowns[key] = time.time() + retry_after_secs
            print(f"[GroqKeyManager] Key rate-limited — on cooldown for {retry_after_secs:.0f}s")

    def status(self) -> dict:
        """Return key health status (for /ai/key-status endpoint)."""
        all_keys = self.keys
        result = []
        for i, key in enumerate(all_keys):
            on_cd = self._is_on_cooldown(key)
            expiry = self._cooldowns.get(key, 0)
            result.append({
                "key_num": i + 1,
                "key_hint": f"...{key[-6:]}" if len(key) > 6 else "***",
                "status": "rate_limited" if on_cd else "active",
                "cooldown_remaining_secs": max(0, round(expiry - time.time(), 1)) if on_cd else 0,
                "total_requests": self._request_counts.get(key, 0),
            })
        return {
            "total_keys": len(all_keys),
            "active_keys": sum(1 for k in all_keys if not self._is_on_cooldown(k)),
            "keys": result,
        }


# Singleton — shared across all requests
key_manager = GroqKeyManager()


# ─── Generic Multi-Key Manager (OpenRouter, DeepSeek, etc.) ──────────────────
# Works with any provider that has multiple API keys.
# Rotates keys in round-robin fashion; on a 429 or auth error the offending
# key is put on a 60-second cooldown and the next available key is used.

class MultiKeyManager:
    """
    Round-robin key rotation with per-key cooldown for any API provider.
    Pass a callable that returns the current list of keys (so it
    picks up hot-reloaded .env changes automatically).
    """
    def __init__(self, provider_name: str, keys_fn):
        self.name = provider_name
        self._keys_fn = keys_fn          # callable -> list[str]
        self._lock = threading.Lock()
        self._last_index = 0
        self._cooldowns: dict = {}       # key -> cooldown expiry unix timestamp
        self._request_counts: dict = {}

    def _is_on_cooldown(self, key: str) -> bool:
        return time.time() < self._cooldowns.get(key, 0)

    def get_key(self) -> str:
        """Return next available key (round-robin), or raise if all cooling down."""
        with self._lock:
            all_keys = self._keys_fn()
            if not all_keys:
                raise RuntimeError(
                    f"No {self.name} API key configured! Add it to backend/.env"
                )
            for i in range(len(all_keys)):
                idx = (self._last_index + i) % len(all_keys)
                key = all_keys[idx]
                if not self._is_on_cooldown(key):
                    self._last_index = (idx + 1) % len(all_keys)
                    self._request_counts[key] = self._request_counts.get(key, 0) + 1
                    return key
            # All on cooldown — return next anyway so caller receives 429 error
            key = all_keys[self._last_index]
            self._last_index = (self._last_index + 1) % len(all_keys)
            return key

    def mark_failed(self, key: str, cooldown_secs: float = 60.0):
        """Put a key on cooldown after a rate-limit or auth error."""
        with self._lock:
            self._cooldowns[key] = time.time() + cooldown_secs
            print(f"[{self.name}KeyManager] Key ...{key[-6:]} on cooldown for {cooldown_secs:.0f}s")

    def has_keys(self) -> bool:
        return bool(self._keys_fn())

    def status(self) -> dict:
        all_keys = self._keys_fn()
        return {
            "provider": self.name,
            "total_keys": len(all_keys),
            "active_keys": sum(1 for k in all_keys if not self._is_on_cooldown(k)),
            "keys": [
                {
                    "key_num": i + 1,
                    "key_hint": f"...{k[-6:]}" if len(k) > 6 else "***",
                    "status": "rate_limited" if self._is_on_cooldown(k) else "active",
                    "total_requests": self._request_counts.get(k, 0),
                }
                for i, k in enumerate(all_keys)
            ],
        }


# Provider-specific singletons
openrouter_key_manager = MultiKeyManager("OpenRouter", lambda: settings.OPENROUTER_API_KEYS)


# ─── Provider Racing ─────────────────────────────────────────────────────────────────────
# Fire multiple providers simultaneously; return whichever responds first.
# This cuts worst-case latency from (P1_timeout + P2_timeout) to max(P1, P2).

async def race_providers(
    prompt: str,
    system: str = None,
    max_tokens: int = 800,
    temperature: float = 0.7,
    providers: list = None,   # e.g. ["groq", "openrouter"] — defaults to groq + openrouter
) -> str:
    """
    Race 2 providers in parallel; return the first successful response.
    If both fail, return the error message.
    """
    if providers is None:
        providers = ["groq", "openrouter"]

    _sentinel = object()
    queue: asyncio.Queue = asyncio.Queue()

    async def _call_and_enqueue(name: str):
        try:
            if name == "groq":
                result = await call_groq(prompt, system=system, max_tokens=max_tokens, temperature=temperature)
            elif name == "openrouter":
                result = await call_openrouter(prompt, system=system, max_tokens=max_tokens, temperature=temperature)
            else:
                return
            if result and not result.startswith("⚠"):
                await queue.put(result)
            else:
                await queue.put(_sentinel)  # signal failure
        except Exception as e:
            print(f"[race_providers] {name} failed: {e}")
            await queue.put(_sentinel)

    tasks = [asyncio.create_task(_call_and_enqueue(p)) for p in providers]

    errors = 0
    while errors < len(providers):
        result = await queue.get()
        if result is not _sentinel:
            # Cancel remaining tasks to avoid wasted resources
            for t in tasks:
                t.cancel()
            return result
        errors += 1

    return "⚠️ All AI providers are currently unavailable. Please try again in a moment."


# ─── OpenRouter Caller ────────────────────────────────────────────────────────

async def call_openrouter(
    prompt: str,
    system: str = None,
    max_tokens: int = 2000,
    temperature: float = 0.4,
) -> str:
    """
    Call OpenRouter API with automatic round-robin key rotation.
    Tries all configured OPENROUTER_API_KEY / OPENROUTER_API_KEY_2 keys.
    Falls back to Groq if no keys or all keys fail.
    """
    if not openrouter_key_manager.has_keys():
        return await call_groq(prompt, system=system, max_tokens=max_tokens, temperature=temperature)

    url = f"{settings.OPENROUTER_BASE_URL}/chat/completions"
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    all_keys = settings.OPENROUTER_API_KEYS
    tried: set = set()
    last_error = None

    for _ in range(len(all_keys)):
        key = openrouter_key_manager.get_key()
        if key in tried:
            break
        tried.add(key)
        try:
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://agribridge.app",
                "X-Title": "AgriBridge",
            }
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            if resp.status_code in (429, 401, 402, 403):
                print(f"[OpenRouter] Key ...{key[-6:]} got {resp.status_code} — cooling down")
                openrouter_key_manager.mark_failed(key, 60.0)
                last_error = f"HTTP {resp.status_code}"
                continue
            last_error = f"HTTP {resp.status_code}"
            break
        except Exception as e:
            last_error = str(e)
            print(f"[OpenRouter] Key ...{key[-6:]} exception: {e}")
            continue

    print(f"[OpenRouter] All keys exhausted ({last_error}) — falling back to Groq")
    return await call_groq(prompt, system=system, max_tokens=max_tokens, temperature=temperature)




async def _groq_json_call(payload: dict) -> str:
    """
    Shared helper for functions that call Groq and expect a JSON string back.
    Uses the key_manager for round-robin + 429 auto-retry.
    Returns the raw content string (caller handles json.loads + fence stripping).
    """
    import re as _re
    url = f"{GROQ_BASE}/chat/completions"

    tried_keys: set = set()
    while True:
        key = key_manager.get_key()
        if key in tried_keys:
            raise RuntimeError("All Groq API keys are currently rate-limited. Please wait and try again.")
        tried_keys.add(key)

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

        if resp.status_code == 429:
            try:
                err_data = resp.json()
                msg = err_data.get("error", {}).get("message", "")
                m = _re.search(r"try again in ([\d.]+)s", msg)
                wait = float(m.group(1)) + 5 if m else 65.0
            except Exception:
                wait = 65.0
            key_manager.mark_rate_limited(key, retry_after_secs=wait)
            continue

        if resp.status_code != 200:
            raise RuntimeError(f"Groq API error ({resp.status_code}): {resp.text[:300]}")

        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        if content.endswith("```"):
            content = content[:-3]

        return content.strip()


async def call_groq(
    prompt: str,
    system: str = None,
    max_tokens: int = 1024,
    temperature: float = 0.7,
) -> str:
    """
    Generic Groq text generation — auto-retries on 429 using the second key.
    """
    url = f"{GROQ_BASE}/chat/completions"
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    tried_keys = set()
    while True:
        key = key_manager.get_key()
        if key in tried_keys:
            # Exhausted all keys — return error
            return "\u26a0️ All Groq API keys are currently rate-limited. Please wait 60 seconds and try again."
        tried_keys.add(key)

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

        if resp.status_code == 429:
            # Parse retry-after from Groq error response if available
            try:
                err_data = resp.json()
                msg = err_data.get("error", {}).get("message", "")
                # Extract seconds from "Please try again in Xs."
                import re
                m = re.search(r"try again in ([\d.]+)s", msg)
                wait = float(m.group(1)) + 5 if m else 65.0
            except Exception:
                wait = 65.0
            key_manager.mark_rate_limited(key, retry_after_secs=wait)
            continue  # retry with next key

        if resp.status_code != 200:
            return f"\u26a0️ Groq API error ({resp.status_code}): {resp.text[:200]}. Check your GROQ_API_KEY."

        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def call_groq_vision(
    prompt: str,
    image_base64: str,
    mime_type: str = "image/jpeg",
    max_tokens: int = 1024,
) -> str:
    """
    Groq vision call — auto-retries on 429 using the second key.
    Vision model only supports images; no text-only mode here.
    """
    url = f"{GROQ_BASE}/chat/completions"
    payload = {
        "model": settings.GROQ_VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}
                }
            ]
        }],
        "temperature": 0.5,
        "max_tokens": max_tokens,
    }

    tried_keys = set()
    while True:
        key = key_manager.get_key()
        if key in tried_keys:
            return "\u26a0️ All Groq API keys are currently rate-limited. Please wait and try again."
        tried_keys.add(key)

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

        if resp.status_code == 429:
            try:
                err_data = resp.json()
                msg = err_data.get("error", {}).get("message", "")
                import re
                m = re.search(r"try again in ([\d.]+)s", msg)
                wait = float(m.group(1)) + 5 if m else 65.0
            except Exception:
                wait = 65.0
            key_manager.mark_rate_limited(key, retry_after_secs=wait)
            continue

        if resp.status_code != 200:
            return f"\u26a0️ Groq Vision error ({resp.status_code}): {resp.text[:200]}"

        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ─── OpenRouter Vision Caller ─────────────────────────────────────────────────

async def call_openrouter_vision(
    prompt: str,
    image_base64: str,
    mime_type: str = "image/jpeg",
    max_tokens: int = 2500,
) -> str:
    """
    Send an image + text prompt to OpenRouter (meta-llama/llama-4-scout).
    Falls back to text-only Groq if no OpenRouter keys are available or all fail.
    """
    if not openrouter_key_manager.has_keys():
        # No OpenRouter keys — degrade to text-only diagnosis
        return await call_groq(prompt, max_tokens=max_tokens)

    url = f"{settings.OPENROUTER_BASE_URL}/chat/completions"
    payload = {
        "model": settings.OPENROUTER_VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}
                }
            ]
        }],
        "temperature": 0.5,
        "max_tokens": max_tokens,
    }

    tried: set = set()
    for _ in range(len(settings.OPENROUTER_API_KEYS)):
        key = openrouter_key_manager.get_key()
        if key in tried:
            break
        tried.add(key)
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://agribridge.app",
            "X-Title": "AgriBridge",
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            if resp.status_code in (429, 401, 402, 403):
                openrouter_key_manager.mark_failed(key, 60.0)
                continue
            # Other error — return the message directly
            return f"\u26a0️ OpenRouter Vision error ({resp.status_code}): {resp.text[:200]}"
        except Exception as e:
            print(f"[OpenRouter Vision] exception: {e}")
            continue

    # All keys exhausted — fall back to text-only Groq
    print("[OpenRouter Vision] All keys exhausted — falling back to text-only Groq")
    return await call_groq(prompt, max_tokens=max_tokens)


# ─── Fertilizer Advisor (Primary: Groq ⚡ + OpenRouter 🌐 race) ───────────────

async def get_fertilizer_advice(crop: str, soil_type: str, ph: float, nitrogen: float, phosphorus: float, potassium: float, area_acres: float) -> str:
    """Race Groq vs OpenRouter — fastest healthy key wins — for expert fertilizer advice."""

    system = """You are an expert agronomist with 20+ years experience in Indian agriculture.
Provide practical, actionable advice. Use Indian fertilizer brand names (Urea, DAP, MOP, SSP).
Respond in well-structured markdown with clear headings. Be concise but complete."""

    prompt = f"""Farmer soil data:
**Crop:** {crop} | **Soil:** {soil_type} | **pH:** {ph}
**N:** {nitrogen} kg/ha | **P:** {phosphorus} kg/ha | **K:** {potassium} kg/ha | **Area:** {area_acres} acres

Provide ACTIONABLE fertilization schedule covering:
1. **Soil Assessment** — current condition
2. **Recommended Fertilizers** — specific products with kg/acre quantities
3. **Application Schedule** — pre-sowing, sowing, top-dressing timing
4. **Organic Amendments** — compost, vermicompost recommendations
5. **Warnings** — what to avoid for this crop+soil combo
6. **Expected Yield Improvement** — estimated % gain

Use Indian market names (Urea, DAP, MOP). Keep practical for small-scale Indian farmer."""

    # Check cache first
    cache_key = f"{crop}_{soil_type}_{ph}_{nitrogen}_{phosphorus}_{potassium}"
    cached = ai_cache.get(cache_key, "fertilizer")
    if cached:
        print("[Cache] Fertilizer advice hit")
        return cached

    # Race Groq vs OpenRouter — whichever key responds first wins
    result = await race_providers(prompt, system=system, max_tokens=900, temperature=0.6,
                                   providers=["groq", "openrouter"])
    ai_cache.set(cache_key, result, "fertilizer")
    return result


# ─── Crop Disease Doctor (Primary: Groq Vision ⚡ → Fallback: OpenRouter) ──────

async def diagnose_crop_disease(image_base64: str, crop_name: str, symptoms: str) -> str:
    """Analyze crop image and symptoms using Groq Vision (primary) → OpenRouter text fallback."""

    prompt = f"""You are an expert plant pathologist specializing in Indian crops. I've carefully examined the provided image and the farmer's reported symptoms.

The farmer reports:
- **Crop:** {crop_name}
- **Observed Symptoms:** {symptoms}

Carefully examine the provided image and give a COMPLETE, DETAILED diagnosis covering ALL sections below:

## 1. Disease Name
Identified disease/pest/deficiency — provide both Common name and Scientific name.

## 2. Confidence Level
Your confidence percentage in this diagnosis and why.

## 3. Cause
Fungal / Bacterial / Viral / Nutrient Deficiency / Pest — explain the causal agent in detail.

## 4. Stage of Infection
Early / Mid / Advanced — describe what this means for this crop.

## 5. Immediate Action (within 24 hours)
List specific steps the farmer must take today to stop further spread.

## 6. Treatment Plan
**Chemical Treatment:**
- Specific Indian product names (e.g., Mancozeb, Carbendazim, Imidacloprid)
- Exact dosage and application method
- Frequency of application

**Organic/Natural Alternatives:**
- Neem oil, copper sulphate, or other organic solutions
- Preparation and application method

## 7. Prevention
How to prevent recurrence next season — cultural practices, resistant varieties, preventive sprays.

## 8. Expected Recovery
Timeline if treatment starts immediately. Will the crop be saved? Expected yield loss if any.

## 9. Additional Tips for Indian Farmers
Any government helpline, KVK contact, or regional advisory relevant to this disease in India.

If the image shows a healthy plant, say so clearly and provide a detailed maintenance and care guide."""
    return await call_openrouter_vision(prompt, image_base64, max_tokens=2500)


# ─── Soil Health Analyzer ─────────────────────────────────────────────────────

async def analyze_soil_health(image_base64: str, location: str = "", crop_intent: str = "") -> dict:
    """
    Analyze a soil photo using Groq Vision (LLaMA 4 Scout).
    Returns a structured JSON report with soil health metrics, deficiencies,
    pH estimate, organic matter level, and crop recommendations.
    """

    context_parts = []
    if location:
        context_parts.append(f"- **Location / Region:** {location}")
    if crop_intent:
        context_parts.append(f"- **Intended Crop:** {crop_intent}")
    context_text = "\n".join(context_parts) if context_parts else "(No additional context provided)"

    prompt = f"""
You are an expert soil scientist and agronomist with 25+ years of experience in Indian agriculture.

A farmer has uploaded a photograph of their soil. Analyse the image carefully.

Additional Context:
{context_text}

Provide a COMPREHENSIVE soil health report. Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{{
  "overall_health_score": 72,
  "overall_health_label": "Good | Fair | Poor | Excellent",
  "health_color": "#22c55e",
  "soil_color_observed": "Dark brown with reddish tinge",
  "soil_color_meaning": "Indicates moderate organic matter and iron presence",
  "texture_estimate": "Loamy | Sandy | Clayey | Silty | Sandy Loam | Clay Loam",
  "texture_explanation": "Brief explanation based on visual cues",
  "moisture_level": "Dry | Moist | Wet | Waterlogged",
  "moisture_explanation": "What the moisture level means for planting",
  "organic_matter": "Low | Medium | High",
  "organic_matter_score": 55,
  "estimated_ph_range": "6.0 – 7.0",
  "ph_suitability": "Slightly Acidic — suitable for most crops",
  "structure_quality": "Poor | Fair | Good | Excellent",
  "structure_notes": "Observations about clumping, cracking, aeration",
  "detected_issues": [
    {{
      "issue": "Low Nitrogen",
      "severity": "Moderate",
      "icon": "⚠️",
      "description": "Pale soil color suggests nitrogen deficiency"
    }}
  ],
  "positive_indicators": [
    "Good soil crumb structure visible",
    "No signs of waterlogging"
  ],
  "nutrient_estimates": {{
    "nitrogen": {{"level": "Low | Medium | High", "score": 40, "recommendation": "Apply Urea @ 50 kg/acre"}},
    "phosphorus": {{"level": "Low | Medium | High", "score": 60, "recommendation": "Apply DAP @ 25 kg/acre"}},
    "potassium": {{"level": "Low | Medium | High", "score": 70, "recommendation": "Apply MOP @ 20 kg/acre"}},
    "organic_carbon": {{"level": "Low | Medium | High", "score": 50, "recommendation": "Add 2 tonnes/acre FYM"}}
  }},
  "suitable_crops": [
    {{"crop": "Tomato", "emoji": "🍅", "suitability": "High", "reason": "pH and texture match well"}},
    {{"crop": "Wheat", "emoji": "🌾", "suitability": "Medium", "reason": "Needs nitrogen boost first"}},
    {{"crop": "Onion", "emoji": "🧅", "suitability": "High", "reason": "Drains well, suitable structure"}}
  ],
  "immediate_actions": [
    "Add organic compost to improve nitrogen",
    "Test soil pH with a kit before next sowing",
    "Ensure proper drainage channels are in place"
  ],
  "long_term_recommendations": [
    "Practice green manuring with Dhaincha or Sunhemp",
    "Rotate crops every season to prevent nutrient depletion",
    "Consider vermicomposting for sustainable soil enrichment"
  ],
  "govt_schemes_relevant": [
    "Soil Health Card Scheme — get free soil testing at your nearest KVK",
    "Paramparagat Krishi Vikas Yojana — ₹50,000/hectare for organic farming"
  ],
  "analysis_confidence": 78,
  "disclaimer": "This is a visual AI analysis. For precise NPK values, please get a lab soil test done at your nearest Krishi Vigyan Kendra (KVK)."
}}

Rules:
- overall_health_score: 0-100
- health_color must be a hex code: red (#ef4444) for poor, orange (#f97316) for fair, green (#22c55e) for good, emerald (#10b981) for excellent
- analysis_confidence: 0-100 (be honest — visual analysis has limits)
- All scores in nutrient_estimates must be 0-100
- detected_issues must only list issues you can actually infer from the image
- Be specific and practical — mention Indian fertilizer names (Urea, DAP, MOP, SSP)
- suitable_crops should be realistic for Indian farming"""

    try:
        raw = await call_openrouter_vision(prompt, image_base64)
        # Strip markdown fences if present
        content = raw.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        if content.endswith("```"):
            content = content[:-3]
        result = json_lib.loads(content.strip())
        result["success"] = True
        return result
    except json_lib.JSONDecodeError:
        # If JSON parsing fails, return the raw text wrapped
        return {"success": False, "raw_analysis": raw, "error": "Could not parse structured response"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Season-wise AI Yield Predictor ──────────────────────────────────────────

async def predict_seasonal_yield(
    crop_type: str,          # "Vegetable" | "Fruit"
    crop_name: str,
    season: str,             # "Kharif" | "Rabi" | "Zaid"
    location: str,
    land_size_acres: float,
    soil_type: str = "Loamy",
    irrigation: str = "Canal",
    variety: str = "",
) -> dict:
    """
    AI-powered season-wise yield prediction for vegetables and fruits.
    Uses Groq LLaMA 3.3 to generate month-by-month yield forecasts,
    revenue projections, risk analysis, and farming tips.
    """

    variety_note = f"Variety/Cultivar: {variety}" if variety else ""

    prompt = f"""You are an expert agricultural scientist and yield forecasting specialist for Indian farming.

A farmer wants a detailed yield prediction for the upcoming season:

- **Crop Type:** {crop_type}
- **Crop Name:** {crop_name}
- **Season:** {season}
- **Location:** {location}
- **Land Size:** {land_size_acres} acres
- **Soil Type:** {soil_type}
- **Irrigation Source:** {irrigation}
{variety_note}

Generate a COMPREHENSIVE and REALISTIC season-wise yield prediction report.
Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):

{{
  "success": true,
  "crop_name": "{crop_name}",
  "crop_type": "{crop_type}",
  "season": "{season}",
  "location": "{location}",
  "land_acres": {land_size_acres},

  "prediction_summary": {{
    "total_yield_kg": 12000,
    "yield_per_acre_kg": 6000,
    "total_revenue_min_inr": 480000,
    "total_revenue_max_inr": 720000,
    "net_profit_min_inr": 320000,
    "net_profit_max_inr": 480000,
    "roi_percent": 185,
    "growing_period_days": 120,
    "sowing_month": "June",
    "harvest_month": "October",
    "overall_confidence": 82,
    "overall_rating": "Excellent | Good | Fair | Poor",
    "rating_color": "#22c55e"
  }},

  "monthly_forecast": [
    {{
      "month": "June",
      "month_short": "Jun",
      "week": "Weeks 1-4",
      "stage": "Land Preparation & Sowing",
      "stage_emoji": "🌱",
      "expected_growth_percent": 10,
      "activities": ["Deep ploughing", "Basal fertilizer application", "Seed sowing"],
      "weather_risk": "Low | Medium | High",
      "estimated_cost_inr": 15000,
      "yield_contribution_percent": 0,
      "notes": "Critical stage for stand establishment"
    }},
    {{
      "month": "July",
      "month_short": "Jul",
      "week": "Weeks 5-8",
      "stage": "Vegetative Growth",
      "stage_emoji": "🌿",
      "expected_growth_percent": 35,
      "activities": ["Weeding", "First irrigation", "Foliar spray"],
      "weather_risk": "Medium",
      "estimated_cost_inr": 8000,
      "yield_contribution_percent": 15,
      "notes": "Monsoon rains support growth but watch for fungal issues"
    }}
  ],

  "yield_chart_data": [
    {{ "label": "Month Name", "growth": 10, "yield_kg": 0, "cumulative_yield_kg": 0, "cost_inr": 15000 }}
  ],

  "risk_factors": [
    {{
      "risk": "Pest Attack (Aphids)",
      "probability": "Medium",
      "probability_score": 45,
      "impact": "15-20% yield loss",
      "mitigation": "Apply Imidacloprid @ 0.5 ml/L or neem oil spray",
      "icon": "🐛"
    }}
  ],

  "input_costs": {{
    "seeds_seedlings_inr": 8000,
    "fertilizers_inr": 18000,
    "pesticides_inr": 6000,
    "irrigation_inr": 5000,
    "labour_inr": 20000,
    "miscellaneous_inr": 3000,
    "total_input_cost_inr": 60000
  }},

  "price_forecast": {{
    "harvest_season_price_min": 40,
    "harvest_season_price_max": 60,
    "peak_price_month": "October",
    "off_season_premium_possible": true,
    "best_markets": ["Pune APMC", "Mumbai Vashi Market", "Nashik Mandi"],
    "export_potential": "Low | Medium | High",
    "price_trend": "Stable | Rising | Falling",
    "market_advisory": "One-sentence advisory on when and where to sell"
  }},

  "variety_comparison": [
    {{
      "variety": "Recommended Variety Name",
      "yield_potential_kg_per_acre": 7000,
      "maturity_days": 110,
      "disease_resistance": "High",
      "market_demand": "High",
      "recommended": true
    }}
  ],

  "critical_success_factors": [
    "Timely weeding in first 30 days is crucial for yield",
    "Drip irrigation increases yield by 20-25% vs flood irrigation"
  ],

  "govt_support": [
    "PM Fasal Bima Yojana — insure this crop against weather risk",
    "MIDH subsidy — 40% subsidy on drip irrigation installation"
  ],

  "comparison_to_average": {{
    "state_average_yield_kg_per_acre": 4500,
    "national_average_yield_kg_per_acre": 4000,
    "your_predicted_vs_state": "+33%",
    "your_predicted_vs_national": "+50%",
    "benchmark_note": "Your predicted yield is above state average due to favourable soil and irrigation"
  }},

  "ai_advisory": "3-sentence expert farming advisory specific to this crop, season, and location combination."
}}

Rules:
- monthly_forecast must have EXACTLY one entry per month from sowing_month to harvest_month (inclusive)
- yield_chart_data must mirror monthly_forecast with numerical data for charting
- All INR values must be realistic for Indian 2024-25 markets
- growing_period_days must match sowing to harvest span
- overall_confidence: 0-100 (be realistic)
- rating_color: #10b981 for Excellent, #22c55e for Good, #f59e0b for Fair, #ef4444 for Poor
- risk_factors: list 3-5 realistic risks for this crop+season combination
- variety_comparison: list 3 recommended varieties for this crop in this region
- Be very specific to {location} — mention local APMC names, regional price ranges, local pest issues"""

    system_prompt = "You are an Indian agricultural AI that responds ONLY with valid JSON. No markdown, no explanation, just the JSON object."

    try:
        # ── Primary: OpenRouter (large context, reliable JSON) ─────────────────
        if openrouter_key_manager.has_keys():
            try:
                raw = await call_openrouter(
                    prompt,
                    system=system_prompt,
                    max_tokens=3500,
                    temperature=0.4,
                )
                ai_provider = "OpenRouter"
            except Exception as or_err:
                print(f"[YieldPredict] OpenRouter failed: {or_err} — falling back to Groq")
                payload = {
                    "model": settings.GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.4,
                    "max_tokens": 3500,
                }
                raw = await _groq_json_call(payload)
                ai_provider = "Groq"
        else:
            # ── Fallback: Groq ─────────────────────────────────────────────
            payload = {
                "model": settings.GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.4,
                "max_tokens": 3500,
            }
            raw = await _groq_json_call(payload)
            ai_provider = "Groq"

        # Strip markdown fences if present
        content = raw.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        if content.endswith("```"):
            content = content[:-3]

        result = json_lib.loads(content.strip())
        result["success"] = True
        result["ai_provider"] = ai_provider
        return result

    except json_lib.JSONDecodeError as e:
        return {"success": False, "error": f"JSON parse error: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Farming Tutorials & Micro Farming Info ───────────────────────────────────

async def get_farming_tutorials(
    category: str = "all",       # "home_farming" | "micro_farming" | "organic" | "hydroponics" | "terrace" | "all"
    topic: str = "",             # specific topic query
    user_level: str = "beginner" # "beginner" | "intermediate" | "advanced"
) -> dict:
    """
    AI-generated farming tutorial cards for home & micro farming.
    Primary: Gemini 1.5 Flash (8K output tokens, generous free tier).
    Fallback: DeepSeek → Groq.
    """

    category_context = {
        "home_farming":  "home farming, kitchen gardens, backyard farming, container gardening",
        "micro_farming": "micro farming, small-scale commercial farming, urban micro-farms, rooftop farms",
        "organic":       "organic farming, natural fertilizers, composting, biodynamic farming",
        "hydroponics":   "hydroponics, aquaponics, soilless farming, NFT systems, DWC systems",
        "terrace":       "terrace farming, rooftop gardens, balcony farming, vertical gardens",
        "all":           "home farming, micro farming, organic farming, hydroponics, terrace/rooftop farming",
    }
    focus = category_context.get(category, category_context["all"])
    topic_note = f"Focus specifically on: {topic}." if topic else ""

    # ── Compact prompt — describes schema rather than showing a huge filled example ──
    prompt = f"""You are an expert agricultural educator for Indian urban farmers and home growers.

Generate a farming tutorial library JSON for: {focus}
User Level: {user_level}
{topic_note}

Return ONLY a valid JSON object with these exact fields:

{{
  "success": true,
  "category": "{category}",
  "user_level": "{user_level}",
  "page_title": "string",
  "page_subtitle": "string",

  "featured_info": {{
    "title": "string",
    "description": "2-3 sentences about benefits for Indian households",
    "key_stats": [
      {{"icon": "emoji", "value": "string", "label": "string"}}
    ]
  }},

  "categories": [
    {{"id": "home_farming", "name": "Home Farming", "icon": "🏡", "color": "#22c55e", "description": "string", "tutorial_count": 5}},
    {{"id": "micro_farming", "name": "Micro Farming", "icon": "🌾", "color": "#3b82f6", "description": "string", "tutorial_count": 5}},
    {{"id": "hydroponics", "name": "Hydroponics", "icon": "💧", "color": "#06b6d4", "description": "string", "tutorial_count": 4}},
    {{"id": "terrace", "name": "Terrace/Rooftop", "icon": "🏙️", "color": "#8b5cf6", "description": "string", "tutorial_count": 4}},
    {{"id": "organic", "name": "Organic Methods", "icon": "🌿", "color": "#f59e0b", "description": "string", "tutorial_count": 4}}
  ],

  "tutorials": [
    {{
      "id": "t1",
      "title": "string — specific actionable title",
      "category": "home_farming|micro_farming|hydroponics|terrace|organic",
      "category_label": "string",
      "category_color": "hex color matching category",
      "level": "beginner|intermediate|advanced",
      "duration_mins": number,
      "thumbnail_emoji": "emoji",
      "description": "2 sentences about what this tutorial covers",
      "youtube_search_query": "specific YouTube search terms for this topic",
      "youtube_video_id": "dQw4w9WgXcQ",
      "what_you_will_learn": ["point 1", "point 2", "point 3", "point 4"],
      "quick_tips": ["tip 1", "tip 2", "tip 3", "tip 4"],
      "materials_needed": [{{"item": "string", "cost": "₹ amount or Free"}}],
      "step_by_step": [{{"step": 1, "title": "string", "detail": "string"}}],
      "crops_suitable": ["crop1", "crop2", "crop3"],
      "expected_yield": "string",
      "space_required": "string",
      "difficulty": "Easy|Medium|Hard",
      "rating": 4.5,
      "views_k": 80,
      "govt_scheme": "relevant Indian govt scheme name",
      "tags": ["tag1", "tag2", "tag3"]
    }}
  ],

  "micro_farming_guide": {{
    "title": "What is Micro Farming?",
    "definition": "string",
    "types": [
      {{
        "type": "string",
        "icon": "emoji",
        "investment": "₹ range",
        "potential_income": "₹/month range",
        "space": "sq ft range",
        "time_to_harvest": "string",
        "description": "string",
        "best_crops": ["crop1", "crop2"],
        "selling_options": ["option1", "option2"]
      }}
    ],
    "success_stories": [
      {{"name": "string", "story": "string", "income": "₹/month", "investment": "₹ initial"}}
    ]
  }},

  "quick_start_plans": [
    {{
      "title": "7-Day Starter Plan",
      "icon": "🗓️",
      "color": "#22c55e",
      "description": "string",
      "days": [{{"day": "Day 1", "task": "string"}}]
    }}
  ],

  "recommended_crops_by_space": [
    {{"space": "0-10 sq ft", "suitable": ["crop1", "crop2"], "containers": "string"}},
    {{"space": "10-50 sq ft", "suitable": ["crop1", "crop2"], "containers": "string"}},
    {{"space": "50-200 sq ft", "suitable": ["crop1", "crop2"], "containers": "string"}},
    {{"space": "200+ sq ft", "suitable": ["crop1", "crop2"], "containers": "string"}}
  ],

  "ai_insight": "2-3 sentences of personalized advice for Indian urban/semi-urban farmers"
}}

RULES:
- Generate EXACTLY 5 tutorials with DIFFERENT categories
- Include 4 types in micro_farming_guide (microgreens, mushroom, vermicompost, hydro herbs)
- All costs in Indian Rupees, realistic for 2024-25
- Include Indian crops: tomato, chilli, coriander, methi, spinach, brinjal, moringa etc.
- Mention Indian govt schemes: PM Kisan, PMFBY, National Urban Horticulture Mission etc.
- Keep each string concise — avoid very long descriptions
- youtube_video_id always use placeholder "dQw4w9WgXcQ"
- Ensure JSON is complete and properly closed"""

    system_msg = "You are an Indian agricultural educator. Output ONLY valid JSON. No markdown, no explanation. Ensure all brackets and braces are properly closed."

    async def _parse_and_fix(raw: str) -> dict:
        """Strip fences, parse JSON, auto-fix common truncation."""
        content = raw.strip()
        # Strip markdown fences
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:])
        if content.endswith("```"):
            content = content[:-3].rstrip()
        content = content.strip()
        # Remove any leading/trailing garbage before first {
        start = content.find("{")
        if start > 0:
            content = content[start:]
        # Try direct parse first
        try:
            return json_lib.loads(content)
        except json_lib.JSONDecodeError:
            pass
        # Auto-fix truncated JSON
        fixed = content.rstrip()
        if fixed.endswith(","):
            fixed = fixed[:-1]
        open_braces = fixed.count('{') - fixed.count('}')
        open_brackets = fixed.count('[') - fixed.count(']')
        fixed += ']' * max(open_brackets, 0) + '}' * max(open_braces, 0)
        return json_lib.loads(fixed)

    try:
        # ── Primary: OpenRouter — large context, reliable JSON output ─────────
        if openrouter_key_manager.has_keys():
            try:
                raw = await call_openrouter(
                    prompt,
                    system=system_msg,
                    max_tokens=4500,
                    temperature=0.5,
                )
                result = await _parse_and_fix(raw)
                result["success"] = True
                result["ai_provider"] = "OpenRouter"
                return result
            except Exception as or_err:
                print(f"[Tutorials] OpenRouter failed: {or_err} — falling back to Groq")

        # ── Fallback: Groq ─────────────────────────────────────────────────────
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.5,
            "max_tokens": 3500,
        }
        content = await _groq_json_call(payload)
        result = await _parse_and_fix(content)
        result["success"] = True
        result["ai_provider"] = "Groq"
        return result

    except json_lib.JSONDecodeError as e:
        return {"success": False, "error": f"JSON parse error: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Market Chatbot ───────────────────────────────────────────────────────────

async def farming_chatbot(user_message: str, conversation_history: list) -> str:
    """24/7 farming assistant with conversation context. Cached for repeat questions."""

    system_context = """You are AgriBridge AI - a knowledgeable, friendly assistant for Indian farmers and agricultural buyers. 
You help with: market prices, crop management, government schemes, weather interpretation, farming techniques, pest control, 
organic farming, storage tips, transport logistics, and agricultural finance. 
Always give practical, actionable advice. Use simple language. When relevant, mention government schemes that might help.
Keep responses concise but complete. Add emojis for readability."""

    # Check cache for identical questions with no conversation history
    if not conversation_history:
        cached = ai_cache.get(user_message, "chatbot")
        if cached:
            print("[Cache] Chatbot hit")
            return cached

    # Build messages list for multi-turn format
    # Cap each history message at 400 chars and user_message at 800 chars to prevent 413
    messages = [{"role": "system", "content": system_context}]
    for msg in conversation_history[-4:]:  # Last 4 messages for context
        role = msg.get("role", "user")
        content = msg.get("content", "")[:400]  # Truncate long messages
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message[:800]})

    # Use key manager with faster timeout + parallel race with DeepSeek
    url = f"{GROQ_BASE}/chat/completions"
    chat_key = key_manager.get_key()
    headers = {
        "Authorization": f"Bearer {chat_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 512,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

        if resp.status_code == 429:
            key_manager.mark_rate_limited(chat_key, retry_after_secs=65.0)
            # Race fallback: OpenRouter or another Groq key
            prompt_text = "\n".join(f"{m['role']}: {m['content']}" for m in messages[1:])
            result = await race_providers(prompt_text, system=system_context, max_tokens=512,
                                          providers=["openrouter", "groq"])
            if not conversation_history:
                ai_cache.set(user_message, result, "chatbot")
            return result

        if resp.status_code == 413:
            # Payload too large — retry with a much shorter history (last 2 messages only)
            print("[Chatbot] 413 payload too large — retrying with trimmed history")
            short_messages = [{"role": "system", "content": system_context}]
            for msg in conversation_history[-2:]:
                role = msg.get("role", "user")
                short_messages.append({"role": role, "content": msg.get("content", "")})
            short_messages.append({"role": "user", "content": user_message})
            payload["messages"] = short_messages
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            # Still failing — fall through to generic error
            return f"⚠️ Message too long. Please start a new conversation."

        if resp.status_code != 200:
            return f"⚠️ Groq API error ({resp.status_code}). Please try again."

        result = resp.json()["choices"][0]["message"]["content"]
        if not conversation_history:
            ai_cache.set(user_message, result, "chatbot")
        return result

    except Exception as e:
        print(f"[Chatbot] Error: {e} — racing fallback")
        prompt_text = "\n".join(f"{m['role']}: {m['content']}" for m in messages[1:])
        return await race_providers(prompt_text, system=system_context, max_tokens=512,
                                    providers=["openrouter", "groq"])


# ─── Weather Service (wttr.in – no API key required) ─────────────────────────

async def get_weather(city: str) -> dict:
    """
    Fetch real-time weather using wttr.in — a completely free service.
    No API key needed. Uses the public JSON endpoint provided by wttr.in.
    Docs: https://wttr.in/:help
    """
    # wttr.in returns detailed JSON with no authentication required
    url = f"https://wttr.in/{city}?format=j1"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers={"User-Agent": "AgriBridge/1.0"})
            if resp.status_code == 200:
                data = resp.json()
                current = data["current_condition"][0]
                area = data["nearest_area"][0]
                area_name = area["areaName"][0]["value"]
                country = area["country"][0]["value"]

                # Map wttr.in weather code to a human description
                weather_desc = current["weatherDesc"][0]["value"]

                return {
                    "city": f"{area_name}, {country}",
                    "temperature": float(current["temp_C"]),
                    "feels_like": float(current["FeelsLikeC"]),
                    "humidity": int(current["humidity"]),
                    "description": weather_desc.lower(),
                    "icon": _wttr_icon(current["weatherCode"]),
                    "wind_speed": round(float(current["windspeedKmph"]) / 3.6, 1),  # km/h → m/s
                    "visibility": round(float(current["visibility"]), 1),
                    "success": True,
                    "source": "wttr.in (no API key)"
                }
            else:
                return {"success": False, "error": f"wttr.in returned {resp.status_code}", "city": city}
        except Exception as e:
            return {"success": False, "error": str(e), "city": city}


def _wttr_icon(code: str) -> str:
    """Map wttr.in weather code to an OpenWeatherMap-style icon code for UI compatibility."""
    code = int(code)
    if code in (113,):           return "01d"   # Sunny / Clear
    if code in (116,):           return "02d"   # Partly cloudy
    if code in (119, 122):       return "03d"   # Cloudy / Overcast
    if code in (143, 248, 260):  return "50d"   # Mist / Fog
    if code in (176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 353, 356, 359):
        return "09d"   # Rain / Drizzle
    if code in (179, 182, 185, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377):
        return "13d"   # Snow / Sleet
    if code in (200, 386, 389, 392, 395):
        return "11d"   # Thunderstorm
    return "01d"       # Default: clear


# ─── Distance Calculator (geopy – no API key required) ────────────────────────

def _geocode_and_distance(origin: str, destination: str) -> tuple:
    """
    Geocode two place names using Nominatim (OpenStreetMap) and compute the
    geodesic (great-circle) distance. Runs synchronously; call via executor.
    No API key required — uses geopy's built-in Nominatim geocoder.
    """
    from geopy.geocoders import Nominatim
    from geopy.distance import geodesic

    geolocator = Nominatim(user_agent="agribridge_transport_calc")

    loc_origin = geolocator.geocode(origin, timeout=10)
    loc_dest   = geolocator.geocode(destination, timeout=10)

    if loc_origin is None or loc_dest is None:
        return None, None  # Could not geocode one or both locations

    coords_origin = (loc_origin.latitude, loc_origin.longitude)
    coords_dest   = (loc_dest.latitude,   loc_dest.longitude)

    distance_km = geodesic(coords_origin, coords_dest).km
    return round(distance_km, 1), coords_origin, coords_dest


async def calculate_transport_cost(origin: str, destination: str, vehicle_type: str = "truck") -> dict:
    """
    Estimate transport cost using geopy (Nominatim + geodesic distance).
    No external API key required — uses OpenStreetMap data via Nominatim.
    """
    # Cost per km by vehicle type (INR)
    cost_per_km = {"bike": 5, "auto": 12, "truck": 25, "mini_truck": 18}
    rate = cost_per_km.get(vehicle_type, 25)

    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            None, partial(_geocode_and_distance, origin, destination)
        )
        distance_km = result[0]

        if distance_km is None:
            return {
                "success": False,
                "error": f"Could not geocode '{origin}' or '{destination}'. Try a more specific location name.",
                "origin": origin,
                "destination": destination
            }

        # Estimate travel time: assume avg 50 km/h for trucks on Indian roads
        avg_speed_kmh = {"bike": 40, "auto": 30, "truck": 45, "mini_truck": 50}.get(vehicle_type, 45)
        duration_min  = round((distance_km / avg_speed_kmh) * 60)
        est_cost      = round(distance_km * rate)

        return {
            "origin": origin,
            "destination": destination,
            "distance_km": distance_km,
            "duration_min": duration_min,
            "vehicle_type": vehicle_type,
            "estimated_cost_inr": est_cost,
            "cost_per_km": rate,
            "success": True,
            "source": "geopy / OpenStreetMap Nominatim (no API key)"
        }
    except Exception as e:
        return {"success": False, "error": str(e), "origin": origin, "destination": destination}


# ─── Virtual Farm Simulator ───────────────────────────────────────────────────

async def simulate_farm_crops(
    land_size_acres: float,
    location: str,
    budget_inr: float,
    soil_type: str = "Loamy",
    season: str = "Kharif"
) -> dict:
    """
    Simulate 5 best crop options for the given farm parameters using Groq AI.
    Returns structured JSON with projected income, risk, water need, and market demand.
    """

    prompt = f"""
You are an expert agricultural economist and agronomist specializing in Indian farming.

A farmer wants to plan their crop for the upcoming season. Here are the details:
- **Location:** {location}
- **Land Size:** {land_size_acres} acres
- **Budget:** ₹{budget_inr:,.0f}
- **Soil Type:** {soil_type}
- **Season:** {season}

Simulate and recommend exactly 5 best crop options for this farmer. For each crop, provide a realistic projection.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{{
  "farm_summary": {{
    "location": "{location}",
    "land_acres": {land_size_acres},
    "budget_inr": {budget_inr},
    "soil_type": "{soil_type}",
    "season": "{season}",
    "analysis_note": "A 2-sentence contextual note about farming in this location/season"
  }},
  "crops": [
    {{
      "rank": 1,
      "name": "Crop Name",
      "category": "Vegetable|Grain|Fruit|Pulse|Spice|Cash Crop",
      "emoji": "🌾",
      "growing_days": 90,
      "input_cost_per_acre": 12000,
      "total_input_cost": 24000,
      "expected_yield_kg_per_acre": 2000,
      "total_yield_kg": 4000,
      "market_price_min": 25,
      "market_price_max": 40,
      "projected_revenue_min": 100000,
      "projected_revenue_max": 160000,
      "projected_profit_min": 76000,
      "projected_profit_max": 136000,
      "roi_percent": 317,
      "risk_level": "Low|Medium|High",
      "risk_score": 3,
      "risk_factors": ["Factor 1", "Factor 2"],
      "water_need": "Low|Moderate|High|Very High",
      "water_liters_per_acre_per_day": 2500,
      "market_demand": "Low|Moderate|High|Very High",
      "demand_score": 8,
      "best_markets": ["Nashik APMC", "Mumbai Wholesale"],
      "govt_support": "PM Kisan, PMFBY crop insurance available",
      "key_tips": ["Tip 1", "Tip 2", "Tip 3"],
      "suitability_score": 87
    }}
  ]
}}

Rules:
- Rank crops from best to worst fit for this farmer's specific situation
- All monetary values must be realistic for Indian markets in 2024-2025
- total_input_cost = input_cost_per_acre × {land_size_acres}
- total_yield_kg = expected_yield_kg_per_acre × {land_size_acres}
- risk_score: 1-10 (1=very low risk, 10=very high risk)
- demand_score: 1-10 (10=extremely high demand)
- suitability_score: 0-100 overall fit score for this farmer
- Consider the budget constraint: total_input_cost must not exceed ₹{budget_inr:,.0f}
- Be specific to {location} — mention local mandis, typical prices for that region
- Provide 3 key_tips per crop specific to the location and season
"""

    try:
        url = f"{GROQ_BASE}/chat/completions"
        sim_key = key_manager.get_key()
        headers = {
            "Authorization": f"Bearer {sim_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an agricultural AI that responds ONLY with valid JSON. No markdown, no explanation, just the JSON object."
                },
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4,
            "max_tokens": 3000,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                return {"success": False, "error": f"Groq API error ({resp.status_code}): {resp.text}"}

            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()

            # Strip any accidental markdown code fences
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            if content.endswith("```"):
                content = content[:-3]

            import json as json_lib
            result = json_lib.loads(content.strip())
            result["success"] = True
            return result

    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Farmer Stress Detector ───────────────────────────────────────────────────

STRESS_SYSTEM_PROMPT = """You are a compassionate AI trained to detect signs of stress, anxiety, and crisis in messages 
from Indian farmers. You analyze tone, language, and content to identify distress signals such as:
- Financial distress: debt, loan, moneylender, can't repay, bankrupt, sold land, mortgaged
- Crop failure: complete loss, destroyed, nothing left, ruined harvest, pest wiped out
- Hopelessness/despair: no point, giving up, what's the use, can't continue, don't know what to do
- Crisis language: very worried, scared, panicking, breaking down, family pressure
- Suicidal ideation: any hint of self-harm, "end it", "no reason to live" (this must be flagged as CRITICAL)

You respond ONLY with valid JSON. Be sensitive and err on the side of caution."""

async def detect_farmer_stress(messages: list, response_delay_seconds: float = 0) -> dict:
    """
    Analyze recent chat messages for farmer distress signals using Groq AI.
    Returns a structured assessment with stress score, category, and recommended support resources.
    
    Args:
        messages: list of {role, content} dicts (last 5-10 messages)
        response_delay_seconds: how long the farmer took to respond (long delays = possible distress signal)
    """
    # Build conversation text for analysis
    conversation_text = "\n".join([
        f"[{m.get('role', 'user').upper()}]: {m.get('content', '')}"
        for m in messages[-8:]  # last 8 messages for context
    ])

    delay_note = ""
    if response_delay_seconds > 120:
        delay_note = f"\nNote: The farmer also took {int(response_delay_seconds/60)} minutes to respond, which may indicate hesitation or distress."

    prompt = f"""Analyze the following farmer chat conversation for signs of stress, financial distress, or emotional crisis.

CONVERSATION:
{conversation_text}
{delay_note}

Respond ONLY with this JSON format (no markdown, no extra text):
{{
  "stress_score": 4,
  "stress_level": "Low|Moderate|High|Critical",
  "detected_signals": ["signal1", "signal2"],
  "primary_concern": "Brief 1-sentence description of the main issue detected",
  "tone": "calm|worried|anxious|distressed|desperate|critical",
  "financial_distress": true,
  "crop_failure_mentioned": false,
  "crisis_language": false,
  "suicidal_ideation": false,
  "recommended_action": "none|show_schemes|show_counsellor|emergency",
  "relevant_scheme_keywords": ["PM Kisan", "PMFBY"],
  "empathy_message": "A warm, non-patronising 1-sentence message to show the farmer they're heard",
  "counsellor_needed": false,
  "analysis_summary": "2-sentence explanation of what was detected and why"
}}

Rules:
- stress_score: 0-10 (0=no stress, 10=critical crisis)  
- If suicidal_ideation=true, set stress_score=10, stress_level=Critical, recommended_action=emergency
- Only flag detected signals that are actually present in the text
- Be culturally sensitive to Indian farming context (moneylender debt, kharif failure, etc.)
- If conversation is normal/positive, return low scores with recommended_action=none
- relevant_scheme_keywords must match ACTUAL Indian govt schemes (PM Kisan, PMFBY, KCC, NABARD, etc.)"""

    try:
        url = f"{GROQ_BASE}/chat/completions"
        stress_key = key_manager.get_key()
        headers = {
            "Authorization": f"Bearer {stress_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": STRESS_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,   # low temp for consistent, reliable analysis
            "max_tokens": 800,
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                return {"success": False, "error": f"Groq API error ({resp.status_code})"}

            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()

            # Strip accidental markdown fences
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            if content.endswith("```"):
                content = content[:-3]

            import json as json_lib
            result = json_lib.loads(content.strip())
            result["success"] = True
            result["response_delay_seconds"] = response_delay_seconds
            return result

    except Exception as e:
        # Fail silently — stress detection must never break the chat
        return {
            "success": False,
            "error": str(e),
            "stress_score": 0,
            "stress_level": "Low",
            "recommended_action": "none"
        }
