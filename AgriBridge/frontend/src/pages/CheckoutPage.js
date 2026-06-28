import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { placeOrder } from "../api";
import { useLanguage } from "../context/LanguageContext";

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry",
];

const BANKS = [
  "State Bank of India","HDFC Bank","ICICI Bank","Axis Bank","Kotak Mahindra Bank",
  "Punjab National Bank","Bank of Baroda","Canara Bank","Union Bank of India","IndusInd Bank",
];

const DELIVERY_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 4);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
})();

/* ─── Step Indicator ───────────────────────────────────────────────────────── */
function StepIndicator({ current, t }) {
  const steps = [t("step1"), t("step2"), t("step3")];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "14px",
              background: i < current ? "#22c55e" : i === current
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : "rgba(255,255,255,0.06)",
              color: i <= current ? "#fff" : "#4b5563",
              border: i === current ? "2px solid #22c55e" : "2px solid transparent",
              boxShadow: i === current ? "0 0 16px rgba(34,197,94,0.4)" : "none",
              transition: "all 0.3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "10px", fontWeight: 600, color: i <= current ? "#bbf7d0" : "#4b5563", whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < 2 && (
            <div style={{
              flex: 1, height: "2px", margin: "0 8px", marginBottom: "20px",
              background: i < current ? "#22c55e" : "rgba(255,255,255,0.08)", transition: "all 0.4s",
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Input Field ──────────────────────────────────────────────────────────── */
function Field({ label, children, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputCss = {
  width: "100%", padding: "11px 14px", borderRadius: "10px",
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#f3f4f6", fontSize: "14px", outline: "none", boxSizing: "border-box",
  fontFamily: "inherit", transition: "border-color 0.2s",
};

/* ─── Step 1: Address ──────────────────────────────────────────────────────── */
function AddressStep({ address, setAddress, t }) {
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agribridge_addresses") || "[]"); } catch { return []; }
  });

  const set = (k, v) => setAddress(a => ({ ...a, [k]: v }));

  const saveAddr = () => {
    if (!address.name || !address.phone || !address.city || !address.pincode) return;
    const updated = [address, ...saved.filter(a => a.pincode !== address.pincode)].slice(0, 3);
    setSaved(updated);
    localStorage.setItem("agribridge_addresses", JSON.stringify(updated));
  };

  return (
    <div style={{ animation: "fadeIn 0.35s ease" }}>
      {saved.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <p style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 600, marginBottom: "10px" }}>
            {t("savedAddresses")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {saved.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
                background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "12px", cursor: "pointer"
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px" }}>{a.name}</p>
                  <p style={{ color: "#6b7280", fontSize: "11px" }}>{a.houseFlat}, {a.area}, {a.city} - {a.pincode}</p>
                </div>
                <button onClick={() => setAddress(a)} style={{
                  padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(34,197,94,0.4)",
                  background: "rgba(34,197,94,0.12)", color: "#bbf7d0", fontSize: "11px",
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                }}>{t("useThisAddress")}</button>
              </div>
            ))}
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "16px 0" }} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <Field label={t("fullName")} required>
          <input value={address.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Arjun Sharma" style={inputCss}
            onFocus={e => e.target.style.borderColor = "#22c55e"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </Field>
        <Field label={t("phone")} required>
          <input value={address.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit number" style={inputCss} type="tel"
            onFocus={e => e.target.style.borderColor = "#22c55e"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </Field>
      </div>

      <div style={{ height: "14px" }} />
      <Field label={t("houseFlat")} required>
        <input value={address.houseFlat} onChange={e => set("houseFlat", e.target.value)}
          placeholder="Flat No, Building, Floor" style={inputCss}
          onFocus={e => e.target.style.borderColor = "#22c55e"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
      </Field>

      <div style={{ height: "14px" }} />
      <Field label={t("areaStreet")} required>
        <input value={address.area} onChange={e => set("area", e.target.value)}
          placeholder="Area, Street, Locality" style={inputCss}
          onFocus={e => e.target.style.borderColor = "#22c55e"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
      </Field>

      <div style={{ height: "14px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
        <Field label={t("city")} required>
          <input value={address.city} onChange={e => set("city", e.target.value)}
            placeholder="e.g. Pune" style={inputCss}
            onFocus={e => e.target.style.borderColor = "#22c55e"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </Field>
        <Field label={t("pincode")} required>
          <input value={address.pincode} onChange={e => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit" style={inputCss} type="tel"
            onFocus={e => e.target.style.borderColor = "#22c55e"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
        </Field>
        <Field label={t("state")} required>
          <select value={address.state} onChange={e => set("state", e.target.value)}
            style={{ ...inputCss, cursor: "pointer" }}>
            <option value="">Select...</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div style={{ height: "16px" }} />
      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
        <input type="checkbox" onChange={saveAddr} style={{ width: "16px", height: "16px", accentColor: "#22c55e" }} />
        <span style={{ color: "#9ca3af", fontSize: "13px" }}>{t("saveAddress")}</span>
      </label>
    </div>
  );
}

/* ─── Step 2: Payment ──────────────────────────────────────────────────────── */
function PaymentStep({ payment, setPayment, t }) {
  const set = (k, v) => setPayment(p => ({ ...p, [k]: v }));
  const methods = [
    { id: "upi", icon: "📱", label: t("upi"), sub: "PhonePe, GPay, BHIM" },
    { id: "card", icon: "💳", label: t("card"), sub: "Credit / Debit" },
    { id: "netbanking", icon: "🏦", label: t("netBanking"), sub: "All major banks" },
    { id: "cod", icon: "💵", label: t("cod"), sub: "Pay on delivery" },
    { id: "wallet", icon: "👜", label: t("wallet"), sub: "AgriBridge Credits" },
  ];

  return (
    <div style={{ animation: "fadeIn 0.35s ease" }}>
      {/* Method selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        {methods.map(m => (
          <button key={m.id} onClick={() => set("method", m.id)} style={{
            display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px",
            borderRadius: "14px", border: payment.method === m.id
              ? "2px solid #22c55e" : "1px solid rgba(255,255,255,0.08)",
            background: payment.method === m.id ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
            cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s",
            boxShadow: payment.method === m.id ? "0 0 16px rgba(34,197,94,0.2)" : "none",
          }}>
            <span style={{ fontSize: "24px" }}>{m.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "14px" }}>{m.label}</p>
              <p style={{ color: "#6b7280", fontSize: "12px" }}>{m.sub}</p>
            </div>
            <div style={{
              width: "18px", height: "18px", borderRadius: "50%",
              border: payment.method === m.id ? "none" : "2px solid #374151",
              background: payment.method === m.id ? "#22c55e" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {payment.method === m.id && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
            </div>
          </button>
        ))}
      </div>

      {/* UPI Details */}
      {payment.method === "upi" && (
        <div style={{ padding: "20px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "16px", animation: "fadeIn 0.3s ease" }}>
          <p style={{ color: "#bbf7d0", fontWeight: 700, fontSize: "13px", marginBottom: "14px" }}>📱 UPI Payment</p>
          {/* QR Code (SVG pattern) */}
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <div style={{
              width: "120px", height: "120px", margin: "0 auto", background: "#fff",
              borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
              padding: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}>
              {/* Simulated QR */}
              <svg width="100" height="100" viewBox="0 0 100 100">
                {[...Array(7)].map((_, r) => [...Array(7)].map((__, c) => {
                  const isCorner = (r < 2 && c < 2) || (r < 2 && c >= 5) || (r >= 5 && c < 2);
                  const filled = isCorner || Math.random() > 0.5;
                  return filled ? <rect key={`${r}-${c}`} x={c * 13 + 8} y={r * 13 + 8} width="11" height="11" fill="#000" rx="1" /> : null;
                }))}
              </svg>
            </div>
            <p style={{ color: "#6b7280", fontSize: "11px", marginTop: "8px" }}>{t("scanQR")}</p>
          </div>
          <Field label={t("upiId")}>
            <input value={payment.upiId || ""} onChange={e => set("upiId", e.target.value)}
              placeholder="yourname@upi" style={inputCss}
              onFocus={e => e.target.style.borderColor = "#22c55e"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
          </Field>
        </div>
      )}

      {/* Card Details */}
      {payment.method === "card" && (
        <div style={{ padding: "20px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "16px", animation: "fadeIn 0.3s ease" }}>
          {/* Card Visual */}
          <div style={{
            background: "linear-gradient(135deg, #1e3a5f, #16a34a)", borderRadius: "16px",
            padding: "20px", marginBottom: "16px", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", marginBottom: "12px" }}>💳 DEBIT / CREDIT CARD</p>
            <p style={{ color: "#fff", fontSize: "18px", fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: "16px" }}>
              {(payment.cardNumber || "").replace(/(.{4})/g, "$1 ").trim() || "•••• •••• •••• ••••"}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px" }}>VALID THRU<br /><span style={{ color: "#fff", fontWeight: 700 }}>{payment.expiry || "MM/YY"}</span></p>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>{payment.cardName || "CARD HOLDER"}</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Field label={t("cardNumber")}>
              <input value={payment.cardNumber || ""} onChange={e => set("cardNumber", e.target.value.replace(/\D/g, "").slice(0, 16))}
                placeholder="1234 5678 9012 3456" style={inputCss} type="tel"
                onFocus={e => e.target.style.borderColor = "#22c55e"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </Field>
            <Field label="Name on Card">
              <input value={payment.cardName || ""} onChange={e => set("cardName", e.target.value.toUpperCase())}
                placeholder="AS ON CARD" style={inputCss}
                onFocus={e => e.target.style.borderColor = "#22c55e"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label={t("expiryDate")}>
                <input value={payment.expiry || ""} onChange={e => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                  set("expiry", v);
                }} placeholder="MM/YY" style={inputCss}
                  onFocus={e => e.target.style.borderColor = "#22c55e"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </Field>
              <Field label={t("cvv")}>
                <input value={payment.cvv || ""} onChange={e => set("cvv", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="•••" style={inputCss} type="password"
                  onFocus={e => e.target.style.borderColor = "#22c55e"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Net Banking */}
      {payment.method === "netbanking" && (
        <div style={{ padding: "20px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "16px", animation: "fadeIn 0.3s ease" }}>
          <Field label={t("selectBank")}>
            <select value={payment.bank || ""} onChange={e => set("bank", e.target.value)} style={{ ...inputCss, cursor: "pointer" }}>
              <option value="">Choose your bank...</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>
      )}

      {/* COD */}
      {payment.method === "cod" && (
        <div style={{ padding: "16px 20px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "14px", animation: "fadeIn 0.3s ease", display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "24px" }}>💵</span>
          <div>
            <p style={{ color: "#86efac", fontWeight: 700, fontSize: "14px" }}>Cash on Delivery Selected</p>
            <p style={{ color: "#6b7280", fontSize: "12px", lineHeight: 1.5, marginTop: "4px" }}>
              Pay in cash when your order arrives. Keep the exact amount ready. No extra charges.
            </p>
          </div>
        </div>
      )}

      {/* Wallet */}
      {payment.method === "wallet" && (
        <div style={{ padding: "16px 20px", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "14px", animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ color: "#bbf7d0", fontWeight: 700, fontSize: "14px" }}>👜 AgriBridge Wallet</p>
            <p style={{ color: "#a855f7", fontWeight: 900, fontSize: "1.2rem" }}>₹250.00</p>
          </div>
          <p style={{ color: "#6b7280", fontSize: "12px" }}>Available credits from cashback and referrals.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Step 3: Review + Confirm ──────────────────────────────────────────────── */
function ConfirmStep({ cart, address, payment, discount, gstAmount, total, t }) {
  const methodLabels = { upi: "UPI", card: "Card", netbanking: "Net Banking", cod: "Cash on Delivery", wallet: "AgriBridge Wallet" };
  return (
    <div style={{ animation: "fadeIn 0.35s ease", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Items */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px" }}>
        <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>{t("orderSummary")}</p>
        {cart.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "10px 0", borderBottom: i < cart.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <img src={item.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=60"}
              alt={item.name} style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover" }}
              onError={e => e.target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=60"} />
            <div style={{ flex: 1 }}>
              <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px" }}>{item.name}</p>
              <p style={{ color: "#6b7280", fontSize: "11px" }}>{item.qty} × ₹{item.price}</p>
            </div>
            <p style={{ color: "#22c55e", fontWeight: 800 }}>₹{Math.round(item.price * item.qty)}</p>
          </div>
        ))}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "12px", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#22c55e", fontSize: "13px" }}>🎟️ {t("discount")}</span>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>-₹{Math.round(discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af", fontSize: "13px" }}>{t("gst")}</span>
            <span style={{ color: "#9ca3af" }}>₹{Math.round(gstAmount)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af", fontSize: "13px" }}>{t("deliveryFree")}</span>
            <span style={{ color: "#22c55e", fontWeight: 700 }}>FREE</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <span style={{ color: "#f3f4f6", fontWeight: 800, fontSize: "16px" }}>{t("total")}</span>
            <span style={{ color: "#22c55e", fontWeight: 900, fontSize: "18px" }}>₹{Math.round(total)}</span>
          </div>
        </div>
      </div>

      {/* Address */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "20px" }}>📍</span>
        <div>
          <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{t("deliveryTo")}</p>
          <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "14px" }}>{address.name} · {address.phone}</p>
          <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>{address.houseFlat}, {address.area}</p>
          <p style={{ color: "#6b7280", fontSize: "12px" }}>{address.city}, {address.state} - {address.pincode}</p>
        </div>
      </div>

      {/* Payment method */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <span style={{ fontSize: "20px" }}>💳</span>
        <div>
          <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{t("payUsing")}</p>
          <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "14px" }}>{methodLabels[payment.method] || "—"}</p>
        </div>
      </div>

      {/* Delivery estimate */}
      <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "14px", padding: "14px 16px", display: "flex", gap: "10px", alignItems: "center" }}>
        <span style={{ fontSize: "18px" }}>🚚</span>
        <div>
          <p style={{ color: "#86efac", fontWeight: 700, fontSize: "13px" }}>{t("expectedDelivery")}</p>
          <p style={{ color: "#6b7280", fontSize: "12px" }}>{DELIVERY_DATE}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Order Success Screen ──────────────────────────────────────────────────── */
function SuccessScreen({ orderId, total, t, onClose }) {
  const navigate = useNavigate();
  const [count, setCount] = useState(5);

  useEffect(() => {
    const t2 = setInterval(() => setCount(c => {
      if (c <= 1) { clearInterval(t2); navigate("/marketplace"); }
      return c - 1;
    }), 1000);
    return () => clearInterval(t2);
  }, [navigate]);

  const printInvoice = () => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Invoice - ${orderId}</title><style>body{font-family:sans-serif;padding:40px;} h1{color:#16a34a;} table{width:100%;border-collapse:collapse;margin:20px 0;} td,th{border:1px solid #ddd;padding:10px;text-align:left;} th{background:#f0fdf4;}</style></head><body><h1>🌾 AgriBridge Invoice</h1><p>Order ID: <strong>${orderId}</strong></p><p>Date: ${new Date().toLocaleDateString("en-IN")}</p><p>Total Paid: <strong>₹${total}</strong></p><p>Expected Delivery: ${DELIVERY_DATE}</p><p>Thank you for shopping with AgriBridge!</p></body></html>`);
    w.print();
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", animation: "bounceIn 0.6s ease",
    }}>
      {/* Animated checkmark */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <div style={{
          width: "100px", height: "100px", borderRadius: "50%",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 60px rgba(34,197,94,0.5)",
          animation: "pulse-green 2s infinite",
        }}>
          <span style={{ fontSize: "48px", lineHeight: 1 }}>✓</span>
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", top: "50%", left: "50%",
            width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e",
            transform: `rotate(${i * 45}deg) translate(60px) translateX(-50%)`,
            animation: `pulse 1.5s ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>

      <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 900, marginBottom: "8px", textAlign: "center" }}>
        {t("orderSuccess")}
      </h1>
      <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "6px" }}>
        {t("orderId")}: <span style={{ color: "#22c55e", fontFamily: "monospace", fontWeight: 700 }}>{orderId}</span>
      </p>
      <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "6px" }}>
        {t("expectedDelivery")}: <span style={{ color: "#f3f4f6", fontWeight: 700 }}>{DELIVERY_DATE}</span>
      </p>
      <p style={{ color: "#22c55e", fontSize: "1.5rem", fontWeight: 900, marginBottom: "28px" }}>₹{total} {t("payUsing")} ✓</p>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginBottom: "24px" }}>
        <button onClick={printInvoice} style={{
          padding: "12px 24px", borderRadius: "12px", border: "1px solid rgba(34,197,94,0.4)",
          background: "rgba(34,197,94,0.1)", color: "#86efac", fontWeight: 700, cursor: "pointer",
          fontSize: "14px", fontFamily: "inherit",
        }}>🧾 {t("downloadInvoice")}</button>
        <button onClick={() => navigate("/my-orders")} style={{
          padding: "12px 24px", borderRadius: "12px", border: "1px solid rgba(34,197,94,0.4)",
          background: "rgba(34,197,94,0.1)", color: "#bbf7d0", fontWeight: 700, cursor: "pointer",
          fontSize: "14px", fontFamily: "inherit",
        }}>📦 {t("trackOrderBtn")}</button>
        <button onClick={() => navigate("/marketplace")} style={{
          padding: "12px 24px", borderRadius: "12px", border: "none",
          background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", fontWeight: 700,
          cursor: "pointer", fontSize: "14px", fontFamily: "inherit",
        }}>🛒 {t("continueShopping2")}</button>
      </div>
      <p style={{ color: "#4b5563", fontSize: "12px" }}>Redirecting to marketplace in {count}s…</p>
    </div>
  );
}

/* ─── Main CheckoutPage ─────────────────────────────────────────────────────── */
export default function CheckoutPage({ currentUser }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Cart comes via navigation state OR localStorage
  const [cart] = useState(() => {
    const fromState = location.state?.cart;
    if (fromState && fromState.length > 0) return fromState;
    try { return JSON.parse(localStorage.getItem("agribridge_cart") || "[]"); } catch { return []; }
  });

  const [coupon] = useState(() => location.state?.coupon || "");
  const [discountPct] = useState(() => location.state?.discountPct || 0);

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState({
    name: currentUser?.name || "", phone: currentUser?.phone || "",
    houseFlat: "", area: "", city: currentUser?.location?.split(",")[0]?.trim() || "",
    pincode: "", state: "Maharashtra",
  });
  const [payment, setPayment] = useState({ method: "upi", upiId: "", cardNumber: "", expiry: "", cvv: "", cardName: "", bank: "" });
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");

  // Price calculations
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = subtotal * (discountPct / 100);
  const afterDiscount = subtotal - discountAmt;
  const gstAmount = afterDiscount * 0.05;
  const total = afterDiscount + gstAmount;

  if (!cart || cart.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", animation: "fadeIn 0.4s ease" }}>
        <p style={{ fontSize: "4rem", marginBottom: "16px" }}>🛒</p>
        <h2 style={{ color: "#fff", fontSize: "1.4rem", fontWeight: 800, marginBottom: "8px" }}>{t("cartEmpty")}</h2>
        <button onClick={() => navigate("/marketplace")} style={{
          marginTop: "16px", padding: "12px 28px", borderRadius: "12px", border: "none",
          background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
          fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "14px",
        }}>{t("browseProducts")}</button>
      </div>
    );
  }

  const validateStep = () => {
    if (step === 0) {
      if (!address.name || !address.phone || !address.houseFlat || !address.area || !address.city || !address.pincode || !address.state) {
        setError("Please fill all required address fields."); return false;
      }
      if (address.phone.length !== 10) { setError("Enter a valid 10-digit phone number."); return false; }
      if (address.pincode.length !== 6) { setError("Enter a valid 6-digit pincode."); return false; }
    }
    if (step === 1) {
      if (!payment.method) { setError("Please select a payment method."); return false; }
      if (payment.method === "upi" && !payment.upiId) { setError("Please enter your UPI ID."); return false; }
      if (payment.method === "card" && (!payment.cardNumber || payment.cardNumber.length < 16)) {
        setError("Please enter a valid 16-digit card number."); return false;
      }
      if (payment.method === "netbanking" && !payment.bank) { setError("Please select a bank."); return false; }
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
  };

  const handlePlaceOrder = async () => {
    if (!validateStep()) return;
    setPlacing(true);
    try {
      for (const item of cart) {
        await placeOrder({
          buyer_id: currentUser.id, product_id: item.id,
          quantity: item.qty, order_type: "retail",
          delivery_address: `${address.houseFlat}, ${address.area}, ${address.city}, ${address.state} - ${address.pincode}`,
        });
      }
      const id = "AB" + Date.now().toString().slice(-8);
      setOrderId(id);
      localStorage.removeItem("agribridge_cart");
      setSuccess(true);
    } catch {
      setError("Order failed. Please try again.");
    }
    setPlacing(false);
  };

  if (success) {
    return <SuccessScreen orderId={orderId} total={Math.round(total)} t={t} onClose={() => navigate("/marketplace")} />;
  }

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", animation: "fadeIn 0.4s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
          style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "20px", padding: "4px" }}>
          ←
        </button>
        <div>
          <h1 style={{ color: "#fff", fontSize: "1.6rem", fontWeight: 900 }}>🛍️ {t("checkout")}</h1>
          <p style={{ color: "#6b7280", fontSize: "13px" }}>{cart.length} item{cart.length !== 1 ? "s" : ""} · ₹{Math.round(total)}</p>
        </div>
      </div>

      <StepIndicator current={step} t={t} />

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px", alignItems: "start" }}>
        {/* Main form */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "24px" }}>
          {step === 0 && <AddressStep address={address} setAddress={setAddress} t={t} />}
          {step === 1 && <PaymentStep payment={payment} setPayment={setPayment} t={t} />}
          {step === 2 && <ConfirmStep cart={cart} address={address} payment={payment} discount={discountAmt} gstAmount={gstAmount} total={total} t={t} />}

          {error && (
            <div style={{ marginTop: "16px", padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#f87171", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginTop: "20px" }}>
            {step < 2 ? (
              <button onClick={handleNext} style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
                fontWeight: 800, fontSize: "15px", cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 4px 20px rgba(34,197,94,0.35)", transition: "all 0.2s",
              }}>
                {step === 0 ? `${t("paymentMethod")} →` : `${t("step3")} →`}
              </button>
            ) : (
              <button onClick={handlePlaceOrder} disabled={placing} style={{
                width: "100%", padding: "14px", borderRadius: "12px", border: "none",
                background: placing ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#fff", fontWeight: 800, fontSize: "15px", cursor: placing ? "not-allowed" : "pointer",
                fontFamily: "inherit", boxShadow: placing ? "none" : "0 4px 20px rgba(34,197,94,0.35)",
              }}>
                {placing ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                    {t("placingOrder")}
                  </span>
                ) : `🌾 ${t("placeOrder")}`}
              </button>
            )}
          </div>
        </div>

        {/* Order summary sidebar */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "20px", position: "sticky", top: "20px" }}>
          <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>{t("orderSummary")}</p>
          {cart.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
              <img src={item.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=50"}
                alt={item.name} style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }}
                onError={e => e.target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=50"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#f3f4f6", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                <p style={{ color: "#6b7280", fontSize: "11px" }}>×{item.qty}</p>
              </div>
              <p style={{ color: "#22c55e", fontWeight: 700, fontSize: "13px" }}>₹{Math.round(item.price * item.qty)}</p>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9ca3af", fontSize: "12px" }}>{t("subtotal")}</span>
              <span style={{ color: "#f3f4f6", fontSize: "12px" }}>₹{Math.round(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#22c55e", fontSize: "12px" }}>🎟️ {discountPct}% {t("discount")}</span>
                <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: 700 }}>-₹{Math.round(discountAmt)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9ca3af", fontSize: "12px" }}>{t("gst")}</span>
              <span style={{ color: "#9ca3af", fontSize: "12px" }}>₹{Math.round(gstAmount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9ca3af", fontSize: "12px" }}>{t("deliveryFree")}</span>
              <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: 700 }}>FREE</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ color: "#f3f4f6", fontWeight: 800, fontSize: "14px" }}>{t("total")}</span>
              <span style={{ color: "#22c55e", fontWeight: 900, fontSize: "16px" }}>₹{Math.round(total)}</span>
            </div>
          </div>
          <div style={{ marginTop: "12px", padding: "8px 12px", background: "rgba(34,197,94,0.06)", borderRadius: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "14px" }}>🚚</span>
            <p style={{ color: "#6b7280", fontSize: "11px" }}>{t("estimatedDelivery")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

