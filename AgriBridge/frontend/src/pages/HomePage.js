import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, getFarmerOrders, getBuyerOrders, getWeather } from "../api";
import { useLanguage } from "../context/LanguageContext";

/* ─── Animated Counter ──────────────────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "", prefix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef();
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1400, step = 16;
        const inc = target / (dur / step);
        let cur = 0;
        const t = setInterval(() => {
          cur = Math.min(cur + inc, target);
          setCount(Math.round(cur));
          if (cur >= target) clearInterval(t);
        }, step);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{count.toLocaleString("en-IN")}{suffix}</span>;
}

/* ─── Agri Particles Canvas ─────────────────────────────────────────────────── */
function AgriParticles({ variant = "farmer" }) {
  const canvasRef = useRef(null);
  // Both farmer and consumer now use green brand color
  const accentColor = "#22c55e";
  const accentRgb   = "34,197,94";
  const ICONS = variant === "farmer"
    ? ["🌾", "🌱", "💧", "☀️", "🌿", "🍀", "🌻", "🚜"]
    : ["🍅", "🥕", "🥦", "🍌", "🌶️", "🛒", "🍇", "🌽"];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let W, H;

    // ── Resize ──────────────────────────────────────────────────────────
    const resize = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Particle factory ────────────────────────────────────────────────
    const rand = (a, b) => Math.random() * (b - a) + a;
    const SHAPES = ["triangle", "hexagon", "diamond", "square"];

    const makeParticle = () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-0.25, 0.25), vy: rand(-0.22, 0.22),
      size: rand(14, 38),
      opacity: rand(0.04, 0.18),
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.005, 0.005),
    });

    const makeIcon = () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-0.18, 0.18), vy: rand(-0.15, 0.15),
      icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      size: rand(14, 26),
      opacity: rand(0.12, 0.35),
      drift: rand(0, Math.PI * 2),
      driftSpeed: rand(0.008, 0.018),
    });

    const NPART  = 40;
    const NICONS = 12;
    const particles = Array.from({ length: NPART  }, makeParticle);
    const icons      = Array.from({ length: NICONS }, makeIcon);

    // ── Draw a polygon shape ─────────────────────────────────────────────
    const drawShape = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 4;
      ctx.beginPath();

      if (p.shape === "triangle") {
        const s = p.size;
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.866, s * 0.5);
        ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.closePath();
      } else if (p.shape === "hexagon") {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const x = Math.cos(a) * p.size, y = Math.sin(a) * p.size;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else if (p.shape === "diamond") {
        const s = p.size;
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.6, 0);
        ctx.lineTo(0, s);  ctx.lineTo(-s * 0.6, 0);
        ctx.closePath();
      } else {
        const s = p.size * 0.8;
        ctx.rect(-s, -s, s * 2, s * 2);
      }
      ctx.stroke();
      ctx.restore();
    };

    // ── Draw connection lines between nearby particles ───────────────────
    const drawLines = () => {
      const DIST = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < DIST) {
            const alpha = (1 - d / DIST) * 0.07;
            ctx.strokeStyle = `rgba(${accentRgb},${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    // ── Draw floating emoji icons ────────────────────────────────────────
    const drawIcons = () => {
      icons.forEach(ic => {
        ctx.save();
        ctx.globalAlpha = ic.opacity;
        ctx.font = `${ic.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ic.icon, ic.x, ic.y);
        ctx.restore();
      });
    };

    // ── Animate ──────────────────────────────────────────────────────────
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      drawLines();

      particles.forEach(p => {
        p.x = (p.x + p.vx + W) % W;
        p.y = (p.y + p.vy + H) % H;
        p.rotation += p.rotSpeed;
        drawShape(p);
      });

      // Update all icon positions first
      icons.forEach(ic => {
        ic.drift += ic.driftSpeed;
        ic.x += ic.vx + Math.sin(ic.drift) * 0.08;
        ic.y += ic.vy + Math.cos(ic.drift) * 0.06;
        if (ic.x < -40) ic.x = W + 40;
        if (ic.x > W + 40) ic.x = -40;
        if (ic.y < -40) ic.y = H + 40;
        if (ic.y > H + 40) ic.y = -40;
      });
      // Then draw all icons in one pass
      drawIcons();

      animId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [accentColor, accentRgb]); // eslint-disable-line

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
      }}
    />
  );
}



/* ─── Live Price Ticker ──────────────────────────────────────────────────────── */
function LiveTicker() {
  const prices = [
    "🍅 Tomato ₹28/kg", "🥔 Potato ₹18/kg", "🧅 Onion ₹35/kg",
    "🌾 Wheat ₹22/kg", "🍌 Banana ₹45/dz", "🫘 Moong Dal ₹95/kg",
    "🌶️ Chilli ₹60/kg", "🥦 Broccoli ₹80/kg", "🍋 Lemon ₹40/dz",
    "🥕 Carrot ₹25/kg", "🫛 Green Peas ₹55/kg", "🌽 Corn ₹30/pc",
  ];
  const items = [...prices, ...prices];
  return (
    <div style={{ overflow: "hidden", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "12px", padding: "10px 0", marginBottom: "24px" }}>
      <div style={{ display: "flex", gap: "0", whiteSpace: "nowrap", animation: "ticker-scroll 32s linear infinite" }}>
        {items.map((p, i) => (
          <span key={i} style={{ padding: "0 24px", color: "#86efac", fontSize: "13px", fontWeight: 600 }}>
            {p} <span style={{ color: "rgba(134,239,172,0.3)", marginLeft: "8px" }}>|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Farmer farming tips (static, outside component) ── */
const FARMER_TIPS = [
  { icon: "💧", tip: "farmingTip1" },
  { icon: "🌿", tip: "farmingTip2" },
  { icon: "🧪", tip: "farmingTip3" },
  { icon: "🌾", tip: "farmingTip4" },
  { icon: "🐛", tip: "farmingTip5" },
  { icon: "📅", tip: "farmingTip6" },
];

const SEASONS = [
  { key: "kharif", months: [5,6,7,8,9], crops: ["Rice","Maize","Soybean","Cotton","Bajra"], icon: "🌧️" },
  { key: "rabi",   months: [10,11,0,1,2], crops: ["Wheat","Mustard","Gram","Pea","Barley"], icon: "❄️" },
  { key: "zaid",   months: [2,3,4],       crops: ["Watermelon","Cucumber","Pumpkin","Fodder"], icon: "☀️" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   🌾 FARMER HOME — Premium Designer Layout
   ═══════════════════════════════════════════════════════════════════════════ */
function FarmerHome({ currentUser }) {
  const { t } = useLanguage();
  const [orders, setOrders]   = useState([]);
  const [weather, setWeather] = useState(null);
  const [tipIdx, setTipIdx]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [classicView, setClassicView] = useState(
    () => localStorage.getItem("agribridge_farmer_view") === "classic"
  );
  const toggleView = () => setClassicView(v => {
    localStorage.setItem("agribridge_farmer_view", !v ? "classic" : "modern");
    return !v;
  });

  const QUICK_ACTIONS = [
    { icon: "🤖", label: t("aiHub"),           sub: t("featureAITitle"),    link: "/ai-hub",         color: "#6366f1" },
    { icon: "🚜", label: t("farmSimulator"),   sub: t("farmSimulator"),     link: "/farm-simulator", color: "#f59e0b" },
    { icon: "📈", label: t("mandiPrices"),     sub: t("livePricesBadge"),   link: "/live-prices",    color: "#22c55e" },
    { icon: "🌦️", label: t("weather"),        sub: t("featureWeatherTitle"), link: "/weather",       color: "#0ea5e9" },
    { icon: "💬", label: t("messages"),        sub: t("messages"),          link: "/chat",           color: "#ec4899" },
    { icon: "🏛️", label: t("govtSchemes"),    sub: t("govtSchemes"),       link: "/schemes",        color: "#a855f7" },
    { icon: "📊", label: t("farmDashboard"),   sub: t("farmDashboard"),     link: "/dashboard",      color: "#14b8a6" },
    { icon: "🌾", label: t("myProducts"),      sub: t("myListings"),        link: "/my-products",    color: "#f97316" },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [oRes, wRes] = await Promise.allSettled([
          getFarmerOrders(currentUser.id),
          getWeather(currentUser.location?.split(",")[0] || "Pune"),
        ]);
        if (oRes.status === "fulfilled") setOrders(oRes.value.data || []);
        if (wRes.status === "fulfilled") setWeather(wRes.value.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [currentUser.id, currentUser.location]);

  useEffect(() => {
    const t2 = setInterval(() => setTipIdx(i => (i + 1) % FARMER_TIPS.length), 6000);
    return () => clearInterval(t2);
  }, []);

  const totalRevenue  = orders.reduce((s, o) => s + (o.total_price || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const recentOrders  = orders.slice(0, 5);
  const lowStock      = 0; // would come from products

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");

  const currentMonth = new Date().getMonth();
  const activeSeason = SEASONS.find(s => s.months.includes(currentMonth)) || SEASONS[0];

  const STATS = [
    { icon: "💰", label: t("totalRevenue"),   value: `₹${Math.round(totalRevenue).toLocaleString("en-IN")}`, color: "#22c55e", sub: t("thisSeasonLabel") },
    { icon: "📦", label: t("totalOrders"),    value: orders.length, color: "#8b5cf6", sub: t("allTimeLabel") },
    { icon: "⏳", label: t("pendingOrders"),  value: pendingOrders, color: "#f59e0b", sub: t("needsActionLabel") },
    { icon: "⚠️", label: t("lowStockAlert"),  value: lowStock, color: "#ef4444", sub: t("itemsLt10") },
  ];

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>

      {/* View Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button onClick={toggleView} style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px",
          borderRadius: "99px", border: "1px solid rgba(34,197,94,0.3)",
          background: classicView ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
          color: classicView ? "#22c55e" : "#6b7280", fontSize: "12px", fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
        }}>
          {classicView ? "🆕 " + t("modernView").replace("🆕 ","") : "📋 " + t("classicView").replace("📋 ","")}
        </button>
      </div>

      {classicView ? <FarmerClassicView currentUser={currentUser} orders={orders} weather={weather} loading={loading} tipIdx={tipIdx} /> : (<>

      {/* ═══ FARMER HERO ═══ */}
      <div style={{
        background: "#05120a",
        borderRadius: "24px", position: "relative", overflow: "hidden",
        minHeight: "70vh", display: "flex", alignItems: "center",
      }}>
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.18) 1px, transparent 1px)",
          backgroundSize: "26px 26px", zIndex: 0,
        }} />
        <AgriParticles variant="farmer" />
        <div style={{
          position: "absolute", right: "15%", top: "5%",
          width: "380px", height: "380px",
          background: "radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 65%)",
          zIndex: 0, pointerEvents: "none",
        }} />

        {/* Content grid — constrained so it never overflows */}
        <div style={{
          position: "relative", zIndex: 2, width: "100%",
          display: "grid", gridTemplateColumns: "1fr auto",
          gap: "32px", padding: "48px 36px", alignItems: "center",
          boxSizing: "border-box",
        }}>
          {/* ── LEFT: Text ── */}
          <div style={{ minWidth: 0 }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)",
              borderRadius: "99px", padding: "6px 16px", marginBottom: "24px",
            }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#86efac", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em" }}>{t("newAICropDoctor")}</span>
            </div>

            {/* Headline — clamped to never overflow sidebar layout */}
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "clamp(1.8rem,3.2vw,3.2rem)", fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0 }}>{t("farmerHeroLine1")}</p>
              <p style={{ fontSize: "clamp(1.8rem,3.2vw,3.2rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0, color: "#22c55e" }}>{t("farmerHeroLine2")}</p>
              <p style={{ fontSize: "clamp(1.8rem,3.2vw,3.2rem)", fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0 }}>{t("farmerHeroLine3")}</p>
            </div>

            <p style={{ color: "#9ca3af", fontSize: "15px", maxWidth: "400px", lineHeight: 1.65, marginBottom: "6px" }}>
              {t("farmerHeroDesc")}
            </p>
            <p style={{ color: "#22c55e", fontSize: "13px", fontWeight: 700, marginBottom: "28px" }}>
              {t("farmerHeroAccent")}
            </p>

            {/* CTA Buttons */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
              <Link to="/my-products" style={{
                padding: "13px 26px", borderRadius: "12px", textDecoration: "none",
                background: "#22c55e", color: "#021a08", fontWeight: 900, fontSize: "14px",
                display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#22c55e"; e.currentTarget.style.transform = "translateY(0)"; }}
              >{t("farmerCta1")}</Link>
              <Link to="/ai-hub" style={{
                padding: "13px 26px", borderRadius: "12px", textDecoration: "none",
                background: "transparent", border: "2px solid rgba(255,255,255,0.2)",
                color: "#fff", fontWeight: 700, fontSize: "14px",
                display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(34,197,94,0.6)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
              >{t("farmerCta2")}</Link>
            </div>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {[t("farmerFeature1"), t("farmerFeature2"), t("farmerFeature3")].map((f, i) => (
                <span key={i} style={{ color: "#4b5563", fontSize: "12px", fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Floating Dashboard Card ── */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            {/* Card glow */}
            <div style={{
              position: "absolute", inset: "-30px", borderRadius: "40px",
              background: "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.08) 0%, transparent 70%)",
              zIndex: 0,
            }} />

            {/* Main white card — compact */}
            <div style={{
              background: "#fff", borderRadius: "20px", padding: "22px",
              boxShadow: "0 32px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
              position: "relative", zIndex: 1, width: "100%", maxWidth: "280px",
            }}>
              {/* Window traffic lights */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "22px" }}>
                {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
                  <div key={i} style={{ width: "11px", height: "11px", borderRadius: "50%", background: c }} />
                ))}
              </div>

              {/* Revenue */}
              <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>{t("totalRevenueCard")}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <p style={{ color: "#111", fontSize: "28px", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>₹24,50,502</p>
                <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: 800, padding: "4px 10px", borderRadius: "99px" }}>↑ +24%</span>
              </div>

              {/* 2-col stat boxes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "14px", border: "1px solid #f0f0f0" }}>
                  <p style={{ color: "#9ca3af", fontSize: "10px", marginBottom: "6px" }}>🌾 {t("activeFarmers")}</p>
                  <p style={{ color: "#111", fontSize: "24px", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>2.4k</p>
                </div>
                <div style={{ background: "#05120a", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ color: "#86efac", fontSize: "10px", marginBottom: "6px" }}>🛒 {t("orders")}</p>
                  <p style={{ color: "#fff", fontSize: "24px", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>18,204</p>
                </div>
              </div>

              {/* Analytics button strip */}
              <div style={{
                background: "#d1fae5", borderRadius: "12px", padding: "14px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer",
              }}>
                <span style={{ color: "#065f46", fontSize: "13px", fontWeight: 700 }}>{t("earningsView")}</span>
                <span style={{ color: "#065f46", fontSize: "16px", fontWeight: 900 }}>→</span>
              </div>
            </div>

            {/* Social proof floating badge */}
            <div style={{
              position: "absolute", bottom: "-18px", right: "0px",
              background: "#fff", borderRadius: "14px", padding: "10px 16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", gap: "10px", zIndex: 2,
            }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
              }}>🌾</div>
              <div>
                <p style={{ color: "#111", fontSize: "11px", fontWeight: 700, margin: 0 }}>{t("justJoined")}</p>
                <p style={{ color: "#6b7280", fontSize: "10px", margin: 0 }}>Ramesh P. · Pune</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LIVE PRICE TICKER (full-width banner) ═══ */}
      <div style={{ background: "#0d1f10", borderTop: "1px solid rgba(34,197,94,0.15)", borderBottom: "1px solid rgba(34,197,94,0.15)", padding: "12px 0", overflow: "hidden", marginBottom: "0" }}>
        <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
          <div style={{ background: "#22c55e", color: "#fff", fontSize: "11px", fontWeight: 800, padding: "6px 16px", borderRadius: "4px", marginRight: "24px", flexShrink: 0, letterSpacing: "0.06em" }}>{t("livePricesBadge")}</div>
          <div style={{ display: "flex", gap: "0", animation: "ticker-scroll 28s linear infinite", flexShrink: 0 }}>
            {[
              "🌾 Wheat · ₹22/kg · Vidarbha","🫘 Soybean · ₹55/kg · Madhya Pradesh","🍇 Grapes · ₹80/kg · Sangli",
              "🍅 Tomato · ₹28/kg · Nashik","🌽 Maize · ₹22/kg · Pune","🥔 Potato · ₹18/kg · Agra",
              "🧅 Onion · ₹35/kg · Lasalgaon","🫛 Green Peas · ₹55/kg · Kolhapur","🌶️ Chilli · ₹60/kg · Guntur",
              "🌾 Wheat · ₹22/kg · Vidarbha","🫘 Soybean · ₹55/kg · Madhya Pradesh","🍇 Grapes · ₹80/kg · Sangli",
            ].map((p, i) => (
              <span key={i} style={{ padding: "0 28px", color: "#86efac", fontSize: "13px", fontWeight: 600, borderRight: "1px solid rgba(34,197,94,0.15)" }}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PLATFORM FEATURES ═══ */}
      <div style={{ padding: "72px 0 60px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "99px", padding: "6px 18px", marginBottom: "24px" }}>
          <span style={{ color: "#22c55e", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em" }}>{t("platformFeaturesBadge")}</span>
        </div>
        <h2 style={{ color: "#fff", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 900, marginBottom: "12px" }}>{t("everythingFarmerNeeds")}</h2>
        <p style={{ color: "#6b7280", fontSize: "15px", maxWidth: "480px", margin: "0 auto 48px", lineHeight: 1.7 }}>
          {t("platformFeaturesDesc")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px" }}>
          {[
            { icon: "🛒", titleKey: "featureMarketTitle", descKey: "featureMarketDesc", link: "/marketplace", accent: "#22c55e" },
            { icon: "🤖", titleKey: "featureAITitle",     descKey: "featureAIDesc",     link: "/ai-hub",       accent: "#8b5cf6" },
            { icon: "🌤️", titleKey: "featureWeatherTitle",descKey: "featureWeatherDesc",link: "/weather",      accent: "#0ea5e9" },
            { icon: "🗺️", titleKey: "featureMapTitle",   descKey: "featureMapDesc",   link: "/map",          accent: "#f59e0b" },
          ].map((f, i) => (
            <Link key={i} to={f.link} style={{ textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = `${f.accent}44`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "20px", padding: "28px 24px", textAlign: "left", transition: "all 0.25s",
              }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `${f.accent}18`, border: `1px solid ${f.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "18px" }}>{f.icon}</div>
                <p style={{ color: "#f3f4f6", fontWeight: 800, fontSize: "16px", marginBottom: "8px" }}>{t(f.titleKey)}</p>
                <p style={{ color: "#6b7280", fontSize: "13px", lineHeight: 1.65 }}>{t(f.descKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ WHO USES AGRIBRIDGE ═══ */}
      <WhoUsesSection variant="farmer" />

      {/* ═══ PERSONAL DASHBOARD STRIP ═══ */}
      <div style={{ marginTop: "24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "22px", padding: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>📊 {t("yourDashboard")} — {currentUser.name?.split(" ")[0]}</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/my-products" style={{ color: "#86efac", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{t("manageProducts")}</Link>
            <Link to="/dashboard" style={{ color: "#86efac", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{t("fullDashboard")}</Link>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "12px", marginBottom: "16px" }}>
          {[
            { icon: "💰", label: t("totalRevenue"), value: loading ? "—" : `₹${Math.round(totalRevenue).toLocaleString("en-IN")}`, color: "#22c55e" },
            { icon: "📦", label: t("totalOrders"), value: loading ? "—" : orders.length, color: "#8b5cf6" },
            { icon: "⏳", label: t("pendingOrders"), value: loading ? "—" : pendingOrders, color: "#f59e0b" },
            { icon: "🌦️", label: t("weather"), value: loading ? "—" : (weather ? `${weather.temperature || "—"}°C` : "N/A"), color: "#0ea5e9" },
          ].map((s, i) => (
            <div key={i} style={{ background: `${s.color}0d`, border: `1px solid ${s.color}22`, borderRadius: "16px", padding: "14px 16px" }}>
              <p style={{ fontSize: "18px", marginBottom: "4px" }}>{s.icon}</p>
              <p style={{ color: "#6b7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
              <p style={{ color: s.color, fontSize: "1.3rem", fontWeight: 900, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* Recent orders mini-list */}
        {!loading && recentOrders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ color: "#6b7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{t("recentOrdersLabel")}</p>
            {recentOrders.slice(0, 3).map((o, i) => (
              <div key={o.id || i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px" }}>
                <span style={{ fontSize: "14px" }}>🛒</span>
                <span style={{ color: "#f3f4f6", fontSize: "12px", fontWeight: 700, flex: 1 }}>{o.product_name || "Product"}</span>
                <span style={{ color: "#6b7280", fontSize: "11px" }}>×{o.quantity}</span>
                <span style={{ color: "#22c55e", fontWeight: 800, fontSize: "12px" }}>₹{Math.round(o.total_price || 0)}</span>
                <span style={{ padding: "2px 7px", borderRadius: "99px", fontSize: "9px", fontWeight: 700, background: "rgba(245,158,11,0.1)", color: "#fbbf24" }}>{o.status || "pending"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ WHO USES AGRIBRIDGE ═══ */}
      <WhoUsesSection variant="farmer" />

    </>)}





  </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   📋 WHO USES AGRIBRIDGE — Shared Tab Section
   ═══════════════════════════════════════════════════════════════════════ */
function WhoUsesSection({ variant = "farmer" }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("farmers");
  const accent = "#22c55e";

  const TABS = {
    farmers: {
      label: t("forFarmers"),
      points: [
        t("farmerTab1"), t("farmerTab2"), t("farmerTab3"), t("farmerTab4"), t("farmerTab5"),
      ],
      cta: t("startAsFarmer"), link: "/register",
    },
    consumers: {
      label: t("forConsumers"),
      points: [
        t("consumerTab1"), t("consumerTab2"), t("consumerTab3"), t("consumerTab4"), t("consumerTab5"),
      ],
      cta: t("shopFreshProduce"), link: "/marketplace",
    },
    businesses: {
      label: t("forBusinesses"),
      points: [
        t("businessTab1"), t("businessTab2"), t("businessTab3"), t("businessTab4"), t("businessTab5"),
      ],
      cta: t("contactB2B"), link: "/contact",
    },
  };

  return (
    <div style={{ padding: "60px 0 40px", textAlign: "center" }}>
      <div style={{ display: "inline-block", background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: "99px", padding: "6px 18px", marginBottom: "24px" }}>
        <span style={{ color: accent, fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em" }}>{t("builtForEveryone")}</span>
      </div>
      <h2 style={{ color: "#fff", fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 900, marginBottom: "32px" }}>{t("whoUsesTitle")}</h2>

      {/* Tab selector */}
      <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "4px", marginBottom: "36px" }}>
        {Object.entries(TABS).map(([key, val]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "10px 22px", borderRadius: "11px", border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: "14px", fontWeight: 700, transition: "all 0.2s",
            background: tab === key ? accent : "transparent",
            color: tab === key ? "#fff" : "#6b7280",
          }}>{val.label}</button>
        ))}
      </div>

      {/* Content box */}
      <div style={{ maxWidth: "600px", margin: "0 auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "32px 36px", textAlign: "left" }}>
        {TABS[tab].points.map((pt, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: accent, marginTop: "6px", flexShrink: 0 }} />
            <p style={{ color: "#d1d5db", fontSize: "15px", lineHeight: 1.6 }}>{pt}</p>
          </div>
        ))}
        <Link to={TABS[tab].link} style={{
          display: "inline-block", marginTop: "12px", padding: "12px 22px", borderRadius: "12px",
          background: `${accent}18`, border: `1px solid ${accent}35`,
          color: accent, fontWeight: 700, fontSize: "14px", textDecoration: "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = `${accent}28`}
        onMouseLeave={e => e.currentTarget.style.background = `${accent}18`}
        >{TABS[tab].cta}</Link>
      </div>
    </div>
  );
}




/* ═══════════════════════════════════════════════════════════════════════════
   🛒 CONSUMER HOME — Premium Designer Layout
   ═══════════════════════════════════════════════════════════════════════════ */
function ConsumerHome({ currentUser }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [wishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agribridge_wishlist") || "[]"); } catch { return []; }
  });
  const [classicView, setClassicView] = useState(
    () => localStorage.getItem("agribridge_consumer_view") === "classic"
  );
  const toggleView = () => setClassicView(v => {
    localStorage.setItem("agribridge_consumer_view", !v ? "classic" : "modern");
    return !v;
  });

  const QUICK_ACTIONS = [
    { icon: "🛒", label: t("browseMarket"),     sub: t("freshMarket"),      link: "/marketplace",  color: "#8b5cf6" },
    { icon: "📦", label: t("myOrders"),         sub: t("orderSummary"),     link: "/my-orders",    color: "#8b5cf6" },
    { icon: "❤️",  label: t("wishlist"),         sub: `${wishlist.length} ${t("itemsInWishlist")}`, link: "/wishlist", color: "#ef4444" },
    { icon: "📈", label: t("livePrices"),       sub: t("livePricesBadge"),  link: "/live-prices",  color: "#22c55e" },
    { icon: "💬", label: t("messages"),         sub: t("messages"),         link: "/chat",         color: "#ec4899" },
    { icon: "🏛️", label: t("govtSchemes"),     sub: t("govtSchemes"),      link: "/schemes",      color: "#a855f7" },
    { icon: "🗺️", label: t("mapRoutes"),       sub: t("featureMapTitle"),  link: "/map",          color: "#f59e0b" },
  ];

  const FEATURED_FARMERS = [
    { name: "Ramesh Patil",  location: "Nasik, Maharashtra",  specialty: "Grapes & Onion",    emoji: "👨‍🌾", rating: 4.9, orders: 342 },
    { name: "Sunita Devi",   location: "Jaipur, Rajasthan",   specialty: "Spices & Dal",      emoji: "👩‍🌾", rating: 4.8, orders: 218 },
    { name: "Vikram Singh",  location: "Amritsar, Punjab",    specialty: "Wheat & Rice",      emoji: "🧑‍🌾", rating: 4.7, orders: 189 },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, oRes] = await Promise.allSettled([
          getProducts(),
          getBuyerOrders(currentUser.id),
        ]);
        if (pRes.status === "fulfilled") setProducts(pRes.value.data || []);
        if (oRes.status === "fulfilled") setOrders(oRes.value.data || []);
      } catch {}
      setLoading(false);
    };
    load();
    // Count cart
    try {
      const cart = JSON.parse(localStorage.getItem("agribridge_cart") || "[]");
      setCartCount(cart.reduce((s, i) => s + i.qty, 0));
    } catch {}
  }, [currentUser.id]);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");

  const deals    = [...products].filter(p => p.stock_qty > 0).sort((a, b) => a.retail_price - b.retail_price).slice(0, 4);
  const topRated = [...products].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 4);

  const recentOrders = orders.slice(0, 3);
  const totalSpent   = orders.reduce((s, o) => s + (o.total_price || 0), 0);

  const IMG_FALLBACK = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80";

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>

      {/* View Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button onClick={toggleView} style={{
          display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px",
          borderRadius: "99px", border: "1px solid rgba(34,197,94,0.3)",
          background: classicView ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
          color: classicView ? "#8b5cf6" : "#6b7280", fontSize: "12px", fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
        }}>
          {classicView ? "🆕 " + t("modernView").replace("🆕 ","") : "📋 " + t("classicView").replace("📋 ","")}
        </button>
      </div>

      {classicView ? <ConsumerClassicView currentUser={currentUser} orders={orders} products={deals} loading={loading} /> : (<>

      {/* ═══ CONSUMER HERO ═══ */}
      <div style={{
        background: "#05120a",
        borderRadius: "24px", position: "relative", overflow: "hidden",
        minHeight: "70vh", display: "flex", alignItems: "center",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(34,197,94,0.18) 1px, transparent 1px)",
          backgroundSize: "26px 26px", zIndex: 0,
        }} />
        <AgriParticles variant="consumer" />
        <div style={{
          position: "absolute", right: "15%", top: "5%",
          width: "380px", height: "380px",
          background: "radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 65%)",
          zIndex: 0, pointerEvents: "none",
        }} />

        {/* Content grid — constrained */}
        <div style={{
          position: "relative", zIndex: 2, width: "100%",
          display: "grid", gridTemplateColumns: "1fr auto",
          gap: "32px", padding: "48px 36px", alignItems: "center",
          boxSizing: "border-box",
        }}>
          {/* ── LEFT: Text ── */}
          <div style={{ minWidth: 0 }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)",
              borderRadius: "99px", padding: "7px 18px", marginBottom: "32px",
            }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#86efac", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em" }}>{t("newFarmToDoor")}</span>
            </div>

            {/* Headline — clamped */}
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "clamp(1.8rem,3.2vw,3.2rem)", fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0 }}>FRESH FARM</p>
              <p style={{ fontSize: "clamp(1.8rem,3.2vw,3.2rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0, color: "#22c55e" }}>PRODUCE,</p>
              <p style={{ fontSize: "clamp(1.8rem,3.2vw,3.2rem)", fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em", margin: 0 }}>DIRECT.</p>
            </div>

            <p style={{ color: "#9ca3af", fontSize: "15px", maxWidth: "400px", lineHeight: 1.65, marginBottom: "6px" }}>
              {t("consumerHeroDesc")}
            </p>
            <p style={{ color: "#22c55e", fontSize: "13px", fontWeight: 700, marginBottom: "28px" }}>
              {t("consumerHeroAccent")}
            </p>

            {/* CTA Buttons */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
              <Link to="/marketplace" style={{
                padding: "13px 26px", borderRadius: "12px", textDecoration: "none",
                background: "#22c55e", color: "#021a08", fontWeight: 900, fontSize: "14px",
                display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#22c55e"; e.currentTarget.style.transform = "translateY(0)"; }}
              >{t("consumerCta1")}</Link>
              <Link to="/my-orders" style={{
                padding: "13px 26px", borderRadius: "12px", textDecoration: "none",
                background: "transparent", border: "2px solid rgba(255,255,255,0.2)",
                color: "#fff", fontWeight: 700, fontSize: "14px",
                display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(34,197,94,0.6)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
              >{t("consumerCta2")}</Link>
            </div>

            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {[t("verifiedFarmers"), t("freshGuaranteed"), t("freeReturns")].map((f, i) => (
                <span key={i} style={{ color: "#4b5563", fontSize: "12px", fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Floating Market Card ── */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            {/* Card glow */}
            <div style={{
              position: "absolute", inset: "-30px", borderRadius: "40px",
              background: "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.08) 0%, transparent 70%)",
              zIndex: 0,
            }} />

            {/* Main white card — smaller on constrained layouts */}
            <div style={{
              background: "#fff", borderRadius: "20px", padding: "22px",
              boxShadow: "0 32px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
              position: "relative", zIndex: 1, width: "100%", maxWidth: "300px",
            }}>
              {/* Window traffic lights */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "22px" }}>
                {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
                  <div key={i} style={{ width: "11px", height: "11px", borderRadius: "50%", background: c }} />
                ))}
              </div>

              {/* Savings */}
              <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>{t("totalSavings")}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <p style={{ color: "#111", fontSize: "28px", fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>₹15,20,400</p>
                <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: 800, padding: "4px 10px", borderRadius: "99px" }}>↑ +40%</span>
              </div>

              {/* 2-col stat boxes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "14px", border: "1px solid #f0f0f0" }}>
                  <p style={{ color: "#9ca3af", fontSize: "10px", marginBottom: "6px" }}>🌾 {t("ourFarmers")}</p>
                  <p style={{ color: "#111", fontSize: "24px", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>1,204</p>
                </div>
                <div style={{ background: "#05120a", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ color: "#86efac", fontSize: "10px", marginBottom: "6px" }}>📦 {t("products")}</p>
                  <p style={{ color: "#fff", fontSize: "24px", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>5.4k</p>
                </div>
              </div>

              {/* Market button strip */}
              <div style={{
                background: "#d1fae5", borderRadius: "12px", padding: "14px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer",
              }}>
                <span style={{ color: "#065f46", fontSize: "13px", fontWeight: 700 }}>🛒 {t("browseMarketCard")}</span>
                <span style={{ color: "#065f46", fontSize: "16px", fontWeight: 900 }}>→</span>
              </div>
            </div>

            {/* Social proof floating badge */}
            <div style={{
              position: "absolute", bottom: "-18px", right: "0px",
              background: "#fff", borderRadius: "14px", padding: "10px 16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", gap: "10px", zIndex: 2,
            }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
              }}>🛒</div>
              <div>
                <p style={{ color: "#111", fontSize: "11px", fontWeight: 700, margin: 0 }}>{t("justOrdered")}</p>
                <p style={{ color: "#6b7280", fontSize: "10px", margin: 0 }}>Priya M. · Mumbai</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LIVE PRICE TICKER (green variant) ═══ */}
      <div style={{ background: "#0d1f10", borderTop: "1px solid rgba(34,197,94,0.15)", borderBottom: "1px solid rgba(34,197,94,0.15)", padding: "12px 0", overflow: "hidden", marginBottom: "0" }}>
        <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
          <div style={{ background: "#22c55e", color: "#fff", fontSize: "11px", fontWeight: 800, padding: "6px 16px", borderRadius: "4px", marginRight: "24px", flexShrink: 0, letterSpacing: "0.06em" }}>{t("livePricesBadge")}</div>
          <div style={{ display: "flex", gap: "0", animation: "ticker-scroll 28s linear infinite", flexShrink: 0 }}>
            {[
              "🍅 Tomato · ₹28/kg · Nashik","🥔 Potato · ₹18/kg · Agra","🧅 Onion · ₹35/kg · Lasalgaon",
              "🍌 Banana · ₹45/dz · Kerala","🌾 Wheat · ₹22/kg · Punjab","🫛 Peas · ₹55/kg · Kolhapur",
              "🌶️ Chilli · ₹60/kg · Guntur","🥕 Carrot · ₹25/kg · Ooty","🍇 Grapes · ₹80/kg · Sangli",
              "🍅 Tomato · ₹28/kg · Nashik","🥔 Potato · ₹18/kg · Agra","🧅 Onion · ₹35/kg · Lasalgaon",
            ].map((p, i) => (
              <span key={i} style={{ padding: "0 28px", color: "#86efac", fontSize: "13px", fontWeight: 600, borderRight: "1px solid rgba(34,197,94,0.12)" }}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PLATFORM FEATURES (Consumer) ═══ */}
      <div style={{ padding: "72px 0 60px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "99px", padding: "6px 18px", marginBottom: "24px" }}>
          <span style={{ color: "#8b5cf6", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em" }}>{t("platformFeaturesBadge")}</span>
        </div>
        <h2 style={{ color: "#fff", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 900, marginBottom: "12px" }}>Everything a Consumer Needs</h2>
        <p style={{ color: "#6b7280", fontSize: "15px", maxWidth: "480px", margin: "0 auto 48px", lineHeight: 1.7 }}>
          Fresh farm-to-table produce, transparent pricing, and doorstep delivery — all in one place.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px" }}>
          {[
            { icon: "🛒", title: "Fresh Marketplace", desc: "Browse 5,400+ products from verified farmers. Retail & bulk pricing, instant cart.", link: "/marketplace", accent: "#8b5cf6" },
            { icon: "🌾", title: "Meet Your Farmers", desc: "See who grows your food. Rate, review, and message farmers directly.", link: "/chat", accent: "#22c55e" },
            { icon: "📦", title: "Track Orders", desc: "Real-time order tracking from farm dispatch to your doorstep delivery.", link: "/my-orders", accent: "#0ea5e9" },
            { icon: "📈", title: "Live Market Prices", desc: "Know if you're getting a fair deal — real-time APMC mandi rates.", link: "/live-prices", accent: "#f59e0b" },
          ].map((f, i) => (
            <Link key={i} to={f.link} style={{ textDecoration: "none" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = `${f.accent}44`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "20px", padding: "28px 24px", textAlign: "left", transition: "all 0.25s",
              }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `${f.accent}18`, border: `1px solid ${f.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "18px" }}>{f.icon}</div>
                <p style={{ color: "#f3f4f6", fontWeight: 800, fontSize: "16px", marginBottom: "8px" }}>{f.title}</p>
                <p style={{ color: "#6b7280", fontSize: "13px", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ WHO USES AGRIBRIDGE (Consumer) ═══ */}
      <WhoUsesSection variant="consumer" />

      {/* ═══ PERSONAL DASHBOARD STRIP ═══ */}
      <div style={{ marginTop: "24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "22px", padding: "22px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>🛒 Your Account — {currentUser.name?.split(" ")[0]}</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/marketplace" style={{ color: "#86efac", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>Browse Products →</Link>
            <Link to="/my-orders" style={{ color: "#86efac", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>My Orders →</Link>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "12px" }}>
          {[
            { icon: "📦", label: t("ordersCount"), value: loading ? "—" : orders.length, color: "#8b5cf6" },
            { icon: "💰", label: t("spentTotal"), value: loading ? "—" : `₹${Math.round(totalSpent).toLocaleString("en-IN")}`, color: "#f59e0b" },
            { icon: "❤️", label: t("wishlistCount"), value: wishlist.length, color: "#ef4444" },
            { icon: "🛍️", label: "Products", value: loading ? "—" : products.length, color: "#22c55e" },
          ].map((s, i) => (
            <div key={i} style={{ background: `${s.color}0d`, border: `1px solid ${s.color}22`, borderRadius: "16px", padding: "14px 16px" }}>
              <p style={{ fontSize: "18px", marginBottom: "4px" }}>{s.icon}</p>
              <p style={{ color: "#6b7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
              <p style={{ color: s.color, fontSize: "1.3rem", fontWeight: 900, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>




      {/* ── Quick Actions ── */}

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "22px", padding: "22px", marginBottom: "24px" }}>
        <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", marginBottom: "16px" }}>{t("quickActions")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
          {QUICK_ACTIONS.map((a, i) => (
            <Link key={i} to={a.link} style={{
              textDecoration: "none", background: `${a.color}0d`, border: `1px solid ${a.color}22`,
              borderRadius: "16px", padding: "14px 12px", display: "flex", flexDirection: "column",
              gap: "6px", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${a.color}18`; e.currentTarget.style.borderColor = `${a.color}44`; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${a.color}0d`; e.currentTarget.style.borderColor = `${a.color}22`; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <span style={{ fontSize: "22px" }}>{a.icon}</span>
              <p style={{ color: "#f3f4f6", fontSize: "12px", fontWeight: 700, lineHeight: 1.2 }}>{a.label}</p>
              <p style={{ color: "#6b7280", fontSize: "10px" }}>{a.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Best Deals + Top Rated ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>

        {/* Best Deals */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "22px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>{t("todaysDeals")}</h2>
            <Link to="/marketplace" style={{ color: "#4ade80", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{t("viewAll")} →</Link>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[...Array(3)].map((_, i) => <div key={i} style={{ height: "52px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : deals.length === 0 ? (
            <p style={{ color: "#4b5563", fontSize: "13px", textAlign: "center", padding: "20px" }}>No deals today</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {deals.map((p, i) => (
                <div key={p.id} onClick={() => navigate("/marketplace")} style={{
                  display: "flex", gap: "10px", alignItems: "center", padding: "9px 12px",
                  background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)",
                  borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
                  animation: `slideUp 0.3s ${i * 0.06}s ease both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)"; e.currentTarget.style.background = "rgba(139,92,246,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.12)"; e.currentTarget.style.background = "rgba(139,92,246,0.04)"; }}
                >
                  <img src={p.image_url || IMG_FALLBACK} alt={p.name}
                    style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover" }}
                    onError={e => e.target.src = IMG_FALLBACK} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                    <p style={{ color: "#6b7280", fontSize: "11px" }}>🌾 {p.farmer_name || "Farmer"}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ color: "#22c55e", fontWeight: 900, fontSize: "14px" }}>₹{p.retail_price}</p>
                    <span style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: "9px", fontWeight: 800, padding: "1px 6px", borderRadius: "99px" }}>DEAL</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Rated */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "22px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>{t("topRated")}</h2>
            <Link to="/marketplace" style={{ color: "#fbbf24", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{t("viewAll")} →</Link>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[...Array(3)].map((_, i) => <div key={i} style={{ height: "52px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : topRated.length === 0 ? (
            <p style={{ color: "#4b5563", fontSize: "13px", textAlign: "center", padding: "20px" }}>No products yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {topRated.map((p, i) => (
                <div key={p.id} onClick={() => navigate("/marketplace")} style={{
                  display: "flex", gap: "10px", alignItems: "center", padding: "9px 12px",
                  background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)",
                  borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
                  animation: `slideUp 0.3s ${i * 0.06}s ease both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)"; e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.12)"; e.currentTarget.style.background = "rgba(245,158,11,0.04)"; }}
                >
                  <img src={p.image_url || IMG_FALLBACK} alt={p.name}
                    style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover" }}
                    onError={e => e.target.src = IMG_FALLBACK} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                    <p style={{ color: "#fbbf24", fontSize: "11px" }}>⭐ {p.avg_rating} · {p.review_count} reviews</p>
                  </div>
                  <p style={{ color: "#22c55e", fontWeight: 900, fontSize: "14px", flexShrink: 0 }}>₹{p.retail_price}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Featured Farmers + Recent Orders ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>

        {/* Featured Farmers */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "22px", padding: "20px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", marginBottom: "16px" }}>{t("featuredFarmers")}</h2>
          {FEATURED_FARMERS.map((f, i) => (
            <div key={i} style={{
              display: "flex", gap: "12px", alignItems: "center", padding: "12px",
              background: "rgba(255,255,255,0.02)", borderRadius: "14px", marginBottom: "8px",
              border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.2s",
              animation: `slideUp 0.4s ${i * 0.08}s ease both`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)"; e.currentTarget.style.background = "rgba(34,197,94,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                {f.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                  <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px" }}>{f.name}</p>
                  <span style={{ background: "rgba(34,197,94,0.15)", color: "#86efac", fontSize: "9px", fontWeight: 700, padding: "1px 6px", borderRadius: "99px" }}>✓ {t("verified")}</span>
                </div>
                <p style={{ color: "#6b7280", fontSize: "11px" }}>📍 {f.location}</p>
                <p style={{ color: "#4b5563", fontSize: "10px" }}>{f.specialty} · {f.orders} orders</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#fbbf24", fontSize: "12px", fontWeight: 700 }}>⭐ {f.rating}</p>
                <Link to="/chat" style={{ fontSize: "10px", color: "#4ade80", textDecoration: "none", fontWeight: 600 }}>Message</Link>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Orders */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "22px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>{t("latestOrders")}</h2>
            <Link to="/my-orders" style={{ color: "#86efac", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{t("viewAll")} →</Link>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[...Array(3)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <p style={{ fontSize: "2rem", marginBottom: "8px" }}>📦</p>
              <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px" }}>{t("noOrders")}</p>
              <Link to="/marketplace" style={{
                display: "inline-block", padding: "8px 16px", borderRadius: "10px",
                background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
                fontWeight: 700, fontSize: "12px", textDecoration: "none",
              }}>{t("shopNow")}</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentOrders.map((o, i) => (
                <div key={o.id || i} onClick={() => navigate("/my-orders")} style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
                  animation: `slideUp 0.3s ${i * 0.06}s ease both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                >
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🛒</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#f3f4f6", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.product_name || "Product"}</p>
                    <p style={{ color: "#6b7280", fontSize: "11px" }}>from {o.farmer_name || "Farmer"} · qty: {o.quantity}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ color: "#22c55e", fontWeight: 800, fontSize: "13px" }}>₹{Math.round(o.total_price || 0)}</p>
                    <span style={{
                      padding: "2px 8px", borderRadius: "99px", fontSize: "9px", fontWeight: 700,
                      background: o.status === "delivered" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                      color: o.status === "delivered" ? "#86efac" : "#fbbf24",
                    }}>{o.status || "pending"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── App Stats Banner ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(37,99,235,0.05))",
        border: "1px solid rgba(139,92,246,0.18)", borderRadius: "22px", padding: "24px 32px",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "20px",
      }}>
        {[
          { label: "Farmers",  value: 1200, suffix: "+", color: "#22c55e" },
          { label: "Products", value: 5400, suffix: "+", color: "#8b5cf6" },
          { label: "Orders",   value: 28000, suffix: "+", color: "#f59e0b" },
          { label: "States",   value: 22, suffix: "",    color: "#a855f7" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p style={{ color: s.color, fontSize: "1.8rem", fontWeight: 900 }}>
              <AnimatedCounter target={s.value} suffix={s.suffix} />
            </p>
            <p style={{ color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </>)}
  </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   🌾 FARMER CLASSIC VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function FarmerClassicView({ currentUser, orders, weather, loading, tipIdx }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const totalRevenue  = orders.reduce((s, o) => s + (o.total_price || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  const quickLinks = [
    { icon: "🌾", label: t("myProducts"),    path: "/my-products" },
    { icon: "📊", label: t("farmDashboard"), path: "/dashboard" },
    { icon: "🤖", label: t("aiHub"),          path: "/ai-hub" },
    { icon: "📈", label: t("mandiPrices"),   path: "/live-prices" },
    { icon: "🌦️", label: t("weather"),      path: "/weather" },
    { icon: "🏛️", label: t("govtSchemes"), path: "/schemes" },
  ];

  const statusColors = { pending: "#f59e0b", processing: "#8b5cf6", shipped: "#0ea5e9", delivered: "#22c55e", cancelled: "#ef4444" };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Classic Header */}
      <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 800, margin: "0 0 4px" }}>🌾 {t("farmerGreeting")}</h1>
          <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>{currentUser.name} · {currentUser.location || "India"}</p>
        </div>
        {weather && (
          <div style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: "12px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>{weather.condition?.includes("rain") ? "🌧️" : weather.condition?.includes("cloud") ? "⛅" : "☀️"}</span>
            <div>
              <p style={{ color: "#f3f4f6", fontWeight: 700, margin: 0 }}>{weather.temperature || "--"}°C</p>
              <p style={{ color: "#6b7280", fontSize: "11px", margin: 0 }}>{currentUser.location?.split(",")[0] || "Weather"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: t("totalRevenue"),  value: `₹${Math.round(totalRevenue).toLocaleString("en-IN")}`, icon: "💰", color: "#22c55e" },
          { label: t("totalOrders"),   value: orders.length, icon: "📦", color: "#8b5cf6" },
          { label: t("pendingOrders"), value: pendingOrders, icon: "⏳", color: "#f59e0b" },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "22px", margin: "0 0 4px" }}>{s.icon}</p>
            <p style={{ color: s.color, fontWeight: 900, fontSize: "1.4rem", margin: "0 0 4px" }}>{s.value}</p>
            <p style={{ color: "#6b7280", fontSize: "11px", margin: 0, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Quick Links */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px" }}>
          <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>⚡ {t("quickActions")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {quickLinks.map((l, i) => (
              <button key={i} onClick={() => navigate(l.path)} style={{
                background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)",
                borderRadius: "10px", padding: "10px 8px", cursor: "pointer",
                color: "#86efac", fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,0.07)"}>
                <span style={{ fontSize: "18px" }}>{l.icon}</span>
                <span style={{ fontSize: "10px", textAlign: "center" }}>{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Tip */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px" }}>
          <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>💡 {t("todaysTip")}</p>
          <div style={{ background: "rgba(34,197,94,0.06)", borderRadius: "12px", padding: "14px" }}>
            <p style={{ fontSize: "28px", marginBottom: "8px" }}>{FARMER_TIPS[tipIdx].icon}</p>
            <p style={{ color: "#d1fae5", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>{t(FARMER_TIPS[tipIdx].tip)}</p>
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "10px", justifyContent: "center" }}>
            {FARMER_TIPS.map((_, i) => (
              <div key={i} style={{ width: i === tipIdx ? "16px" : "6px", height: "6px", borderRadius: "99px", background: i === tipIdx ? "#22c55e" : "rgba(34,197,94,0.2)", transition: "all 0.3s" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px" }}>
        <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>📦 {t("recentOrders")}</p>
        {orders.length === 0 ? (
          <p style={{ color: "#4b5563", fontSize: "13px", textAlign: "center", padding: "20px" }}>{t("noOrdersYet")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {orders.slice(0, 4).map((o, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p style={{ color: "#f3f4f6", fontSize: "13px", fontWeight: 600, margin: "0 0 2px" }}>{o.product_name || "Product"}</p>
                  <p style={{ color: "#6b7280", fontSize: "11px", margin: 0 }}>{o.buyer_name || "Buyer"} · {o.quantity} {o.unit || "kg"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#22c55e", fontWeight: 700, fontSize: "13px", margin: "0 0 2px" }}>₹{o.total_price || o.total}</p>
                  <span style={{ background: `${statusColors[o.status] || "#6b7280"}22`, color: statusColors[o.status] || "#6b7280", fontSize: "10px", fontWeight: 700, padding: "1px 8px", borderRadius: "99px" }}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   🛒 CONSUMER CLASSIC VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function ConsumerClassicView({ currentUser, orders, products, loading }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const totalSpent = orders.reduce((s, o) => s + (o.total_price || 0), 0);
  const wishlistCount = (() => { try { return JSON.parse(localStorage.getItem("agribridge_wishlist") || "[]").length; } catch { return 0; } })();

  const quickLinks = [
    { icon: "🛒", label: t("browseMarket"),  path: "/marketplace", color: "#8b5cf6" },
    { icon: "📦", label: t("myOrders"),      path: "/my-orders",   color: "#f59e0b" },
    { icon: "❤️", label: t("wishlist"),      path: "/wishlist",    color: "#ef4444" },
    { icon: "📈", label: t("livePrices"),    path: "/live-prices", color: "#22c55e" },
    { icon: "💬", label: t("messages"),       path: "/chat",        color: "#ec4899" },
    { icon: "🗺️", label: t("mapRoutes"),    path: "/map",         color: "#0ea5e9" },
  ];

  const statusColors = { pending: "#f59e0b", processing: "#8b5cf6", shipped: "#0ea5e9", delivered: "#22c55e", cancelled: "#ef4444" };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Classic Header */}
      <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 800, margin: "0 0 4px" }}>🛒 {t("consumerPortal")}</h1>
          <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>{currentUser.name} · {currentUser.location || "India"}</p>
        </div>
        <button onClick={() => navigate("/marketplace")} style={{
          padding: "10px 20px", borderRadius: "12px", border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
          fontWeight: 700, fontSize: "13px", fontFamily: "inherit",
        }}>🛒 {t("browseMarket")}</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: t("ordersCount"),  value: orders.length, icon: "📦", color: "#8b5cf6" },
          { label: t("spentTotal"),   value: `₹${Math.round(totalSpent).toLocaleString("en-IN")}`, icon: "💸", color: "#22c55e" },
          { label: t("wishlistCount"),value: wishlistCount, icon: "❤️", color: "#ef4444" },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "22px", margin: "0 0 4px" }}>{s.icon}</p>
            <p style={{ color: s.color, fontWeight: 900, fontSize: "1.4rem", margin: "0 0 4px" }}>{s.value}</p>
            <p style={{ color: "#6b7280", fontSize: "11px", margin: 0, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Quick Links */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px" }}>
          <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>⚡ {t("quickActions")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {quickLinks.map((l, i) => (
              <button key={i} onClick={() => navigate(l.path)} style={{
                background: `rgba(139,92,246,0.07)`, border: "1px solid rgba(34,197,94,0.12)",
                borderRadius: "10px", padding: "10px 8px", cursor: "pointer",
                color: "#86efac", fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(139,92,246,0.07)"}>
                <span style={{ fontSize: "18px" }}>{l.icon}</span>
                <span style={{ fontSize: "10px", textAlign: "center" }}>{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured Products */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px" }}>
          <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>🔥 {t("todaysDeals")}</p>
          {loading ? (
            <p style={{ color: "#4b5563", fontSize: "12px", textAlign: "center" }}>{t("loading")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {products.slice(0, 3).map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <img src={p.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=40"} alt="" style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover" }} onError={e => e.target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=40"} />
                    <p style={{ color: "#d1d5db", fontSize: "12px", margin: 0, fontWeight: 600 }}>{p.name}</p>
                  </div>
                  <p style={{ color: "#8b5cf6", fontWeight: 800, fontSize: "12px", margin: 0 }}>₹{p.retail_price}/{p.unit}</p>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate("/marketplace")} style={{ width: "100%", marginTop: "10px", padding: "8px", borderRadius: "10px", border: "1px solid rgba(34,197,94,0.3)", background: "rgba(139,92,246,0.08)", color: "#4ade80", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {t("browseMarket")} →
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px" }}>
        <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>📋 {t("latestOrders")}</p>
        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "#4b5563", fontSize: "13px", marginBottom: "12px" }}>{t("noOrders")}</p>
            <button onClick={() => navigate("/marketplace")} style={{ padding: "8px 20px", borderRadius: "10px", border: "none", background: "#8b5cf6", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t("shopNow")}</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {orders.slice(0, 4).map((o, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p style={{ color: "#f3f4f6", fontSize: "13px", fontWeight: 600, margin: "0 0 2px" }}>{o.product_name || "Product"}</p>
                  <p style={{ color: "#6b7280", fontSize: "11px", margin: 0 }}>from {o.farmer_name || "Farmer"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#8b5cf6", fontWeight: 700, fontSize: "13px", margin: "0 0 2px" }}>₹{o.total_price || o.total}</p>
                  <span style={{ background: `${statusColors[o.status] || "#6b7280"}22`, color: statusColors[o.status] || "#6b7280", fontSize: "10px", fontWeight: 700, padding: "1px 8px", borderRadius: "99px" }}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Generic Home (logged out)
   ═══════════════════════════════════════════════════════════════════════════ */
function GenericHome() {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px", animation: "fadeIn 0.4s ease" }}>
      <p style={{ fontSize: "4rem", marginBottom: "16px" }}>🌾</p>
      <h1 style={{ color: "#fff", fontSize: "2rem", fontWeight: 900, marginBottom: "8px" }}>Welcome to AgriBridge</h1>
      <p style={{ color: "#6b7280", fontSize: "16px", marginBottom: "24px" }}>Empowering Indian Agriculture</p>
      <Link to="/" style={{ padding: "12px 28px", borderRadius: "12px", background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", fontWeight: 700, textDecoration: "none" }}>
        Get Started
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT EXPORT — Role Switch
   ═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage({ currentUser }) {
  const content = !currentUser
    ? <GenericHome />
    : currentUser.role === "farmer"
    ? <FarmerHome currentUser={currentUser} />
    : <ConsumerHome currentUser={currentUser} />;

  return (
    <div style={{
      width: "100%",
      maxWidth: "100%",
      overflowX: "hidden",
      boxSizing: "border-box",
      padding: "20px 24px 40px",
    }}>
      {content}
    </div>
  );
}

