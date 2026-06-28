import os
from pathlib import Path
from dotenv import load_dotenv

# Always load .env from the same directory as this config file
_ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

class Settings:
    # ─── JWT ─────────────────────────────────────────────────────────────
    JWT_SECRET: str = os.getenv("JWT_SECRET", "agribridge-super-secret-jwt-key-2024")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24

    # ─── Groq AI (Primary for Chatbot, Farm Simulator, Live Prices, Academy) ──
    # Free keys from: https://console.groq.com/keys
    @property
    def GROQ_API_KEY(self) -> str:
        return os.getenv("GROQ_API_KEY", "")

    @property
    def GROQ_API_KEYS(self) -> list:
        """All configured Groq keys (primary + optional extra) for round-robin load balancing."""
        keys = []
        for k in ["GROQ_API_KEY", "GROQ_API_KEY_2"]:
            v = os.getenv(k, "").strip()
            if v:
                keys.append(v)
        return keys

    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    # ─── Google Gemini (Optional: Crop Doctor vision analysis) ──────────────────
    # Free key from: https://aistudio.google.com/apikey
    @property
    def GEMINI_API_KEY(self) -> str:
        return os.getenv("GEMINI_API_KEY", "").strip()

    GEMINI_VISION_MODEL: str = "gemini-1.5-flash"

    # ─── DeepSeek AI (Optional: Fertilizer Advisor) ─────────────────────────────
    # Key from: https://platform.deepseek.com
    @property
    def DEEPSEEK_API_KEY(self) -> str:
        return os.getenv("DEEPSEEK_API_KEY", "").strip()

    DEEPSEEK_MODEL: str = "deepseek-chat"

    # ─── OpenRouter (Fallback / Large-context tasks: Yield, Tutorials) ─────────
    # Free keys from: https://openrouter.ai/keys
    @property
    def OPENROUTER_API_KEY(self) -> str:
        """Primary OpenRouter key (backwards-compat)."""
        return os.getenv("OPENROUTER_API_KEY", "")

    @property
    def OPENROUTER_API_KEYS(self) -> list:
        """All configured OpenRouter keys (primary + optional extra) for round-robin load balancing."""
        keys = []
        for k in ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY_2"]:
            v = os.getenv(k, "").strip()
            if v:
                keys.append(v)
        return keys

    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct"

    # ─── Weather (wttr.in) ────────────────────────────────────────────────────
    DEFAULT_CITY: str = "Pune"

    # ─── Email (fastapi-mail / Gmail SMTP) ─────────────────────────────────
    # Use Gmail App Password (NOT your regular password).
    # Steps: Google Account → Security → 2-Step Verification ON → App Passwords
    @property
    def MAIL_USERNAME(self) -> str:
        return os.getenv("MAIL_USERNAME", "").strip()

    @property
    def MAIL_PASSWORD(self) -> str:
        return os.getenv("MAIL_PASSWORD", "").strip()

    @property
    def MAIL_FROM(self) -> str:
        return os.getenv("MAIL_FROM", os.getenv("MAIL_USERNAME", "noreply@agribridge.app")).strip()

    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587

    # ─── App Config ───────────────────────────────────────────────────────
    APP_NAME: str = "AgriBridge"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]

settings = Settings()
