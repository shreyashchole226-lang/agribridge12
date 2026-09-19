import React, { useState, useEffect, useRef } from "react";
import { sendEmailOtp, verifyEmailOtp } from "../api";
import "./LoginPage.css";
import { useLanguage } from "../context/LanguageContext";

/* ─── Canvas Particle Animation for Login Background ────────────────── */
function LoginParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let W, H;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const rand = (a, b) => Math.random() * (b - a) + a;
    const SHAPES = ["triangle", "hexagon", "diamond"];
    // Mix of green (farmer) and purple (consumer) accents
    const COLORS = [
      { stroke: "#22c55e", rgb: "34,197,94" },
      { stroke: "#4ade80", rgb: "74,222,128" },
      { stroke: "#16a34a", rgb: "22,163,74"  },
      { stroke: "#86efac", rgb: "134,239,172"},
    ];
    const ICONS = ["🌾", "🌱", "🛒", "🌿", "💧", "🍀", "🌻", "🍅", "🥕", "🌾"];

    // Geometric shapes
    const particles = Array.from({ length: 45 }, () => {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.22, 0.22), vy: rand(-0.20, 0.20),
        size: rand(12, 36),
        opacity: rand(0.04, 0.16),
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.004, 0.004),
        color: c.stroke, rgb: c.rgb,
      };
    });

    // Floating emoji icons
    const icons = Array.from({ length: 10 }, () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-0.14, 0.14), vy: rand(-0.12, 0.12),
      icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      size: rand(16, 28),
      opacity: rand(0.10, 0.28),
      drift: rand(0, Math.PI * 2),
      driftSpeed: rand(0.007, 0.016),
    }));

    // Starfield dots
    const stars = Array.from({ length: 80 }, () => ({
      x: rand(0, W), y: rand(0, H),
      r: rand(0.5, 1.8),
      opacity: rand(0.08, 0.35),
      twinkle: rand(0, Math.PI * 2),
      twinkleSpeed: rand(0.02, 0.06),
    }));

    const drawShape = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 0.9;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();

      if (p.shape === "triangle") {
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.866, p.size * 0.5);
        ctx.lineTo(-p.size * 0.866, p.size * 0.5);
        ctx.closePath();
      } else if (p.shape === "hexagon") {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const x = Math.cos(a) * p.size, y = Math.sin(a) * p.size;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else {
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawLines = () => {
      const DIST = 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < DIST) {
            const alpha = (1 - d / DIST) * 0.05;
            ctx.strokeStyle = `rgba(${particles[i].rgb},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, W, H);

      // Stars
      stars.forEach(s => {
        s.twinkle += s.twinkleSpeed;
        ctx.globalAlpha = s.opacity * (0.5 + 0.5 * Math.sin(s.twinkle));
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      drawLines();

      // Geometric shapes
      particles.forEach(p => {
        p.x = (p.x + p.vx + W) % W;
        p.y = (p.y + p.vy + H) % H;
        p.rotation += p.rotSpeed;
        drawShape(p);
      });

      // Emoji icons
      icons.forEach(ic => {
        ic.drift += ic.driftSpeed;
        ic.x += ic.vx + Math.sin(ic.drift) * 0.07;
        ic.y += ic.vy + Math.cos(ic.drift) * 0.05;
        if (ic.x < -40) ic.x = W + 40;
        if (ic.x > W + 40) ic.x = -40;
        if (ic.y < -40) ic.y = H + 40;
        if (ic.y > H + 40) ic.y = -40;
      });
      icons.forEach(ic => {
        ctx.save();
        ctx.globalAlpha = ic.opacity;
        ctx.font = `${ic.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ic.icon, ic.x, ic.y);
        ctx.restore();
      });

      animId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
      }}
    />
  );
}



/* ─── Step indicator ─────────────────────────────────────────────────── */
function StepDot({ step, current }) {
  const done   = current > step;
  const active = current === step;
  return (
    <div className={`login-step-dot ${done ? "done" : active ? "active" : ""}`}>
      {done ? "✓" : step}
    </div>
  );
}

/* ─── Role Card ──────────────────────────────────────────────────────── */
function RoleCard({ role, selected, onSelect, t }) {
  const isFarmer   = role === "farmer";
  const isDelivery = role === "delivery_agent";
  const icon  = isFarmer ? "🌾" : isDelivery ? "🚚" : "🛒";
  const title = isFarmer ? t("farmer") : isDelivery ? t("deliveryAgent") : t("consumer");
  const desc  = isFarmer
    ? t("farmerDesc")
    : isDelivery
    ? t("deliveryDesc")
    : t("consumerDesc");
  const colorClass = isFarmer ? "farmer" : isDelivery ? "delivery" : "customer";
  return (
    <button
      className={`login-role-card ${selected ? "selected" : ""} ${colorClass}`}
      onClick={() => onSelect(role)}
      type="button"
      style={selected && isDelivery ? { borderColor: "#f97316", background: "rgba(249,115,22,0.08)" } : {}}
    >
      <div className="login-role-icon">{icon}</div>
      <h3 className="login-role-title">{title}</h3>
      <p className="login-role-desc">{desc}</p>
      <div className="login-role-features">
        {isFarmer ? (
          <>
            <span>🤖 AI Hub</span>
            <span>📊 Dashboard</span>
            <span>🚜 Farm Simulator</span>
            <span>📈 Yield Predictor</span>
          </>
        ) : isDelivery ? (
          <>
            <span>📦 Accept Orders</span>
            <span>🗺️ Route Map</span>
            <span>💰 Track Earnings</span>
            <span>📲 Status Updates</span>
          </>
        ) : (
          <>
            <span>🛒 Marketplace</span>
            <span>🚛 Transport Cost</span>
            <span>🎓 Tutorials</span>
            <span>💬 Direct Chat</span>
          </>
        )}
      </div>
      {selected && <div className="login-role-check">✓ {t("continueAs")}</div>}
    </button>
  );
}

/* ─── OTP Input — 6 individual boxes ────────────────────────────────── */
function OtpInput({ value, onChange }) {
  const inputsRef = React.useRef([]);
  const digits = Array(6).fill("").map((_, i) => value[i] || "");

  const handleChange = (e, idx) => {
    const ch = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = [...digits];
    arr[idx] = ch;
    onChange(arr.join(""));
    // move focus forward
    if (ch && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        const arr = [...digits];
        arr[idx] = "";
        onChange(arr.join(""));
      } else if (idx > 0) {
        inputsRef.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    // focus last filled box
    const lastIdx = Math.min(pasted.length, 5);
    inputsRef.current[lastIdx]?.focus();
  };

  return (
    <div className="otp-box">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputsRef.current[i] = el}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={`otp-cell-input ${d ? "filled" : ""}`}
          autoFocus={i === 0}
          autoComplete={i === 0 ? "one-time-code" : "off"}
        />
      ))}
    </div>
  );
}

/* ─── Main LoginPage ─────────────────────────────────────────────────── */
export default function LoginPage({ onLogin }) {
  const { t } = useLanguage();
  const [step,     setStep]     = useState(1);
  const [role,     setRole]     = useState("");
  const [email,    setEmail]    = useState("");
  const [name,     setName]     = useState("");
  const [otp,      setOtp]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [devOtp,   setDevOtp]   = useState("");   // shown in dev if mail not configured
  const [resendCd, setResendCd] = useState(0);

  /* ── Step 1: Choose role ── */
  const handleRoleSelect = (r) => {
    setRole(r);
    setError("");
  };

  const goToEmail = () => {
    if (!role) { setError("Please choose your account type first."); return; }
    setError("");
    setStep(2);
  };

  /* ── Step 2: Send OTP ── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true); setError("");
    try {
      const r = await sendEmailOtp(email.trim(), role, name.trim());
      if (r.data.dev_otp) setDevOtp(r.data.dev_otp);
      setStep(3);
      // start 60s resend cooldown
      setResendCd(60);
      const t = setInterval(() => setResendCd(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send OTP. Please try again.");
    }
    setLoading(false);
  };

  /* ── Step 3: Verify OTP ── */
  const handleVerify = async () => {
    if (otp.length < 6) { setError("Please enter the complete 6-digit OTP."); return; }
    setLoading(true); setError("");
    try {
      const r = await verifyEmailOtp(email.trim(), otp, role, name.trim());
      const user = r.data.user;
      // Store JWT in localStorage
      if (r.data.token) localStorage.setItem("agribridge_token", r.data.token);
      localStorage.setItem("agribridge_user", JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP. Please try again.");
      setOtp("");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCd > 0) return;
    setOtp(""); setError(""); setDevOtp("");
    await handleSendOtp({ preventDefault: () => {} });
  };

  return (
    <div className="login-page">
      {/* ── Canvas particle background ── */}
      <LoginParticles />

      <div className="login-card">
        {/* ── Logo ── */}
        <div className="login-logo">
          <span className="login-logo-icon">🌾</span>
          <div>
            <span className="login-logo-text">AgriBridge</span>
            <span className="login-logo-badge">Beta</span>
          </div>
        </div>

        {/* ── Step indicators ── */}
        <div className="login-steps">
          <StepDot step={1} current={step} />
          <div className={`login-step-line ${step > 1 ? "done" : ""}`} />
          <StepDot step={2} current={step} />
          <div className={`login-step-line ${step > 2 ? "done" : ""}`} />
          <StepDot step={3} current={step} />
        </div>

        {/* ════════ STEP 1: Choose Role ════════ */}
        {step === 1 && (
          <div className="login-step-content">
            <h1 className="login-heading">{t("welcomeTitle")}</h1>
            <p className="login-subheading">{t("iAmA")}</p>

            <div className="login-roles">
              <RoleCard role="farmer"         selected={role === "farmer"}         onSelect={handleRoleSelect} t={t} />
              <RoleCard role="consumer"        selected={role === "consumer"}        onSelect={handleRoleSelect} t={t} />
              <RoleCard role="delivery_agent" selected={role === "delivery_agent"} onSelect={handleRoleSelect} t={t} />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              className="login-btn-primary"
              onClick={goToEmail}
              disabled={!role}
            >
              {t("continueAs")} {role === "farmer" ? "🌾 " + t("farmer") : role === "consumer" ? "🛒 " + t("consumer") : role === "delivery_agent" ? "🚚 " + t("deliveryAgent") : "…"}
            </button>
          </div>
        )}

        {/* ════════ STEP 2: Enter Email ════════ */}
        {step === 2 && (
          <div className="login-step-content">
            <button className="login-back" onClick={() => { setStep(1); setError(""); }}>
              {t("back")}
            </button>
            <h1 className="login-heading">
              {role === "farmer" ? "🌾 " + t("farmer") : role === "delivery_agent" ? "🚚 " + t("deliveryAgent") : "🛒 " + t("consumer")}
            </h1>
            <p className="login-subheading">
              {t("emailAddress").replace(" *","")} — we'll send a 6-digit code
            </p>

            <form onSubmit={handleSendOtp} className="login-form">
              <div className="login-field">
                <label>{t("yourName")}</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patil"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="login-input"
                />
              </div>
              <div className="login-field">
                <label>{t("emailAddress")}</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  className="login-input"
                  required
                  autoFocus
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading || !email}
              >
                {loading ? (
                  <span className="login-spinner" />
                ) : (
                  t("sendOtp")
                )}
              </button>
            </form>
          </div>
        )}

        {/* ════════ STEP 3: Enter OTP ════════ */}
        {step === 3 && (
          <div className="login-step-content">
            <button className="login-back" onClick={() => { setStep(2); setOtp(""); setError(""); }}>
              {t("back")}
            </button>
            <h1 className="login-heading">{t("checkInbox")}</h1>
            <p className="login-subheading">
              {t("sentCode")} <strong>{email}</strong>
            </p>

            {/* Dev fallback message when email isn't configured */}
            {devOtp && (
              <div className="login-dev-otp">
                <span>{t("devMode")}</span>
                <strong>{devOtp}</strong>
              </div>
            )}

            <OtpInput value={otp} onChange={v => { setOtp(v); setError(""); }} />

            {error && <p className="login-error">{error}</p>}

            <button
              className="login-btn-primary"
              onClick={handleVerify}
              disabled={loading || otp.length < 6}
            >
              {loading ? <span className="login-spinner" /> : t("verifyLogin")}
            </button>

            <div className="login-resend">
              {resendCd > 0 ? (
                <span>{t("resendIn")} {resendCd}s</span>
              ) : (
                <button className="login-resend-btn" onClick={handleResend}>
                  {t("resendOtp")}
                </button>
              )}
            </div>
          </div>
        )}

        <p className="login-footer">{t("secureNote")}</p>
      </div>
    </div>
  );
}
