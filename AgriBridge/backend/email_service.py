"""
Email OTP Service — AgriBridge
Uses fastapi-mail with Gmail SMTP
"""
import random
import string
from datetime import datetime, timedelta
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from config import settings


def _mail_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_FROM_NAME="AgriBridge",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


def generate_otp(length: int = 6) -> str:
    """Generate a secure 6-digit numeric OTP."""
    return "".join(random.choices(string.digits, k=length))


def otp_expiry(minutes: int = 10) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)


async def send_otp_email(email: str, otp: str, name: str = "", role: str = "farmer") -> bool:
    """
    Send a beautiful HTML OTP email via Gmail SMTP.
    Returns True on success, False on failure.
    """
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        print("[Email] MAIL_USERNAME / MAIL_PASSWORD not configured — skipping email send")
        print(f"[Email] OTP for {email}: {otp}")   # Dev fallback — print to console
        return True

    role_emoji = "🌾" if role == "farmer" else "🛒"
    role_label = "Farmer" if role == "farmer" else "Customer"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgriBridge OTP</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#111827;border-radius:20px;overflow:hidden;border:1px solid #1f2937;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#14532d,#166534);padding:32px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🌾</div>
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.05em;">AgriBridge</h1>
              <p style="color:#86efac;margin:4px 0 0;font-size:13px;">Empowering Indian Farmers</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#9ca3af;font-size:14px;margin:0 0 6px;">Hello{f", {name}" if name else ""},</p>
              <h2 style="color:#ffffff;font-size:18px;margin:0 0 20px;">
                {role_emoji} Your {role_label} Login OTP
              </h2>
              <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 28px;">
                Use the code below to verify your identity and access AgriBridge.
                This code expires in <strong style="color:#f9fafb;">10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#0a0f1a;border:2px solid #22c55e;border-radius:16px;
                          padding:28px 24px;text-align:center;margin:0 0 28px;">
                <p style="color:#6b7280;font-size:11px;letter-spacing:0.2em;
                           text-transform:uppercase;margin:0 0 12px;">Verification Code</p>
                <div style="font-size:44px;font-weight:900;letter-spacing:0.18em;
                             color:#22c55e;font-family:'Courier New',monospace;">{otp}</div>
              </div>

              <div style="background:#1a2332;border-left:3px solid #f59e0b;
                           border-radius:8px;padding:14px 18px;margin:0 0 24px;">
                <p style="color:#fbbf24;font-size:12px;margin:0;line-height:1.5;">
                  ⚠️ Never share this OTP with anyone. AgriBridge will never call
                  or message you asking for this code.
                </p>
              </div>

              <p style="color:#6b7280;font-size:12px;margin:0;">
                If you didn't request this login, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d1117;padding:20px 40px;border-top:1px solid #1f2937;
                        text-align:center;">
              <p style="color:#374151;font-size:11px;margin:0;letter-spacing:0.05em;">
                © 2025 AgriBridge · Pune, India · Built for Indian Farmers 🇮🇳
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    message = MessageSchema(
        subject=f"🌾 AgriBridge OTP: {otp}",
        recipients=[email],
        body=html_body,
        subtype=MessageType.html,
    )
    try:
        fm = FastMail(_mail_config())
        await fm.send_message(message)
        print(f"[Email] OTP sent to {email}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send OTP to {email}: {e}")
        print(f"[Email] OTP for {email}: {otp}")   # Console fallback
        return False


# ─── Order Confirmation Email ──────────────────────────────────────────────────

async def send_order_confirmation_email(
    email: str,
    buyer_name: str,
    order_id: int,
    product_name: str,
    quantity: int,
    unit: str,
    unit_price: float,
    total: float,
    delivery_address: str,
    payment_method: str = "Online",
    farmer_name: str = "Farmer",
) -> bool:
    """
    Send a beautifully formatted HTML order confirmation email to the buyer.
    Uses the same Gmail SMTP connection as OTP emails.
    """
    gst_amt     = round(total * 0.05, 2)
    grand_total = round(total + gst_amt, 2)
    expected_date = (datetime.utcnow() + timedelta(days=4)).strftime("%d %B %Y")
    order_date    = datetime.utcnow().strftime("%d %b %Y, %I:%M %p") + " UTC"

    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        print("[Email] SMTP not configured — order confirmation skipped (console fallback):")
        print(f"  Order #{order_id} | {buyer_name} | {product_name} x{quantity} | ₹{grand_total} → {email}")
        return True

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#111827;border-radius:20px;overflow:hidden;border:1px solid #1f2937;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#4c1d95,#5b21b6);padding:32px 40px;text-align:center;">
  <div style="font-size:48px;margin-bottom:8px;">✅</div>
  <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Order Confirmed!</h1>
  <p style="color:#c4b5fd;margin:6px 0 0;font-size:13px;">Thank you for shopping on AgriBridge 🌾</p>
</td></tr>

<!-- Greeting -->
<tr><td style="padding:28px 40px 16px;">
  <p style="color:#9ca3af;font-size:14px;margin:0 0 6px;">Hello, <strong style="color:#f3f4f6;">{buyer_name}</strong>!</p>
  <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
    Your order has been placed successfully. The farmer is preparing your fresh produce. 
    Track your order from the <strong style="color:#a78bfa;">My Orders</strong> section on AgriBridge.
  </p>
</td></tr>

<!-- Order Meta -->
<tr><td style="padding:0 40px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#1f2937;border-radius:12px;padding:14px 18px;width:48%;">
        <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Order ID</p>
        <p style="color:#a78bfa;font-size:16px;font-weight:800;margin:0;font-family:'Courier New',monospace;">AB{order_id:06d}</p>
      </td>
      <td style="width:4%;"></td>
      <td style="background:#1f2937;border-radius:12px;padding:14px 18px;width:48%;">
        <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Order Date</p>
        <p style="color:#f3f4f6;font-size:13px;font-weight:600;margin:0;">{order_date}</p>
      </td>
    </tr>
  </table>
</td></tr>

<!-- Product Details -->
<tr><td style="padding:0 40px 16px;">
  <div style="background:#0a0f1a;border:1px solid #1f2937;border-radius:14px;padding:20px;">
    <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">📦 Order Details</p>
    <table width="100%" cellpadding="4" cellspacing="0">
      <tr><td style="color:#9ca3af;font-size:13px;">Product</td>
          <td style="color:#f3f4f6;font-size:13px;font-weight:700;text-align:right;">{product_name}</td></tr>
      <tr><td style="color:#9ca3af;font-size:13px;">Farmer</td>
          <td style="color:#86efac;font-size:13px;font-weight:600;text-align:right;">🌾 {farmer_name}</td></tr>
      <tr><td style="color:#9ca3af;font-size:13px;">Quantity</td>
          <td style="color:#f3f4f6;font-size:13px;font-weight:700;text-align:right;">{quantity} {unit}</td></tr>
      <tr><td style="color:#9ca3af;font-size:13px;">Unit Price</td>
          <td style="color:#f3f4f6;font-size:13px;text-align:right;">₹{unit_price}/{unit}</td></tr>
      <tr><td colspan="2" style="border-top:1px solid #1f2937;padding:6px 0;"></td></tr>
      <tr><td style="color:#9ca3af;font-size:13px;">Subtotal</td>
          <td style="color:#f3f4f6;font-size:13px;text-align:right;">₹{total}</td></tr>
      <tr><td style="color:#9ca3af;font-size:13px;">GST (5%)</td>
          <td style="color:#9ca3af;font-size:13px;text-align:right;">₹{gst_amt}</td></tr>
      <tr><td style="color:#9ca3af;font-size:13px;">Delivery</td>
          <td style="color:#22c55e;font-size:13px;font-weight:700;text-align:right;">FREE</td></tr>
      <tr><td colspan="2" style="border-top:1px solid #374151;padding:6px 0;"></td></tr>
      <tr><td style="color:#f3f4f6;font-size:15px;font-weight:800;">Total Paid</td>
          <td style="color:#22c55e;font-size:18px;font-weight:900;text-align:right;">₹{grand_total}</td></tr>
    </table>
  </div>
</td></tr>

<!-- Delivery + Payment -->
<tr><td style="padding:0 40px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#1a1f2e;border:1px solid #1f2937;border-radius:12px;padding:16px;width:48%;vertical-align:top;">
        <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">📍 Delivery To</p>
        <p style="color:#d1d5db;font-size:13px;line-height:1.5;margin:0;">{delivery_address}</p>
      </td>
      <td style="width:4%;"></td>
      <td style="background:#1a1f2e;border:1px solid #1f2937;border-radius:12px;padding:16px;width:48%;vertical-align:top;">
        <p style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">💳 Payment</p>
        <p style="color:#d1d5db;font-size:13px;margin:0;">{payment_method}</p>
        <p style="color:#22c55e;font-size:11px;font-weight:700;margin:4px 0 0;">✅ Confirmed</p>
      </td>
    </tr>
  </table>
</td></tr>

<!-- Expected Delivery Banner -->
<tr><td style="padding:0 40px 24px;">
  <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);
              border-radius:14px;padding:16px 20px;text-align:center;">
    <p style="color:#86efac;font-size:14px;margin:0;font-weight:600;">
      🚚 Expected Delivery: <strong style="color:#22c55e;">{expected_date}</strong>
    </p>
  </div>
</td></tr>

<!-- Footer -->
<tr><td style="background:#0d1117;padding:20px 40px;border-top:1px solid #1f2937;text-align:center;">
  <p style="color:#374151;font-size:11px;margin:0 0 4px;">
    Questions? Message the farmer directly on AgriBridge or reply to this email.
  </p>
  <p style="color:#374151;font-size:11px;margin:0;">
    © 2025 AgriBridge · Empowering Indian Agriculture 🇮🇳
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    message = MessageSchema(
        subject=f"✅ Order Confirmed — AB{order_id:06d} | AgriBridge",
        recipients=[email],
        body=html_body,
        subtype=MessageType.html,
    )
    try:
        fm = FastMail(_mail_config())
        await fm.send_message(message)
        print(f"[Email] Order #{order_id} confirmation sent to {email}")
        return True
    except Exception as e:
        print(f"[Email] Order confirmation failed for {email}: {e}")
        return False
