import random
import string
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── OTP Logic ───────────────────────────────────────────────────────────────

def generate_otp(length: int = 6) -> str:
    """Generate a random 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=length))

def get_otp_expiry() -> datetime:
    """Return expiry time: 10 minutes from now."""
    return datetime.utcnow() + timedelta(minutes=10)

def is_otp_valid(otp_expires_at: datetime) -> bool:
    """Check if OTP is still within valid window."""
    return datetime.utcnow() < otp_expires_at

# ─── JWT Logic ────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT token containing user data."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def send_otp_sms(phone: str, otp: str) -> bool:
    """
    Placeholder for SMS sending.
    In production, integrate Twilio/MSG91/Fast2SMS here.
    For demo: prints OTP to console.
    """
    print(f"\n{'='*40}")
    print(f"📱 OTP for {phone}: {otp}")
    print(f"{'='*40}\n")
    return True
