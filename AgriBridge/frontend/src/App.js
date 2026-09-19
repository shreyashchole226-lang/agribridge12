import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { chatWithBot } from "./api";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import FarmerMarket from "./pages/FarmerMarket";
import ConsumerMarket from "./pages/ConsumerMarket";
import FarmerDashboard from "./pages/FarmerDashboard";
import Schemes from "./pages/Schemes";
import AIHub from "./pages/AIHub";
import ChatPage from "./pages/ChatPage";
import Weather from "./pages/Weather";
import MapView from "./pages/MapView";
import FarmSimulator from "./pages/FarmSimulator";
import FarmingTutorials from "./pages/FarmingTutorials";
import CheckoutPage from "./pages/CheckoutPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import WishlistPage from "./pages/WishlistPage";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import LivePriceTracker from "./components/LivePriceTracker";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import "./index.css";

export const ThemeContext = createContext(null);

/* ─── Floating AI Chatbot ────────────────────────────────────────────────────── */
function FloatingAIChatbot({ isFarmer }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: isFarmer
        ? "🌾 Hi! I'm your AgriBridge AI assistant. Ask me anything about farming, prices, schemes, or your crops!"
        : "🛒 Hi! I'm AgriBridge AI. Ask me about fresh produce, seasonal prices, nutrition tips, or finding the best deals!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim(); setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      // Trim history to last 4 msgs and cap each message at 300 chars to avoid 413
      const trimmedHistory = messages.slice(-4).map(m => ({ ...m, content: m.content.slice(0, 300) }));
      const r = await chatWithBot(userMsg, trimmedHistory);
      setMessages(prev => [...prev, { role: "assistant", content: r.data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Sorry, AI is temporarily unavailable. Please try again." }]);
    }
    setLoading(false);
  };

  const QUICK = isFarmer
    ? ["Best crop for Kharif?", "Current MSP for wheat?", "Organic pest control?"]
    : ["Freshest vegetables today?", "Tomato price trend?", "Best seasonal fruits?"];

  return (
    <div className="ai-chatbot-fab">
      {open && (
        <div className="ai-chatbot-window">
          {/* Header */}
          <div className="ai-chatbot-header">
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: "0 0 16px rgba(34,197,94,0.5)" }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: "14px", margin: 0 }}>AgriBridge AI</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <div className="pulse-green" style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                <span style={{ color: "#4b5563", fontSize: 11 }}>Online 24/7</span>
              </div>
            </div>
            <button onClick={() => setMessages([{ role: "assistant", content: isFarmer ? "🌾 Hi! I'm your AgriBridge AI assistant. Ask me anything about farming, prices, schemes, or your crops!" : "🛒 Hi! I'm AgriBridge AI. Ask me about fresh produce, seasonal prices, nutrition tips, or finding the best deals!" }])} title="Clear chat" style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "4px 8px", borderRadius: 6 }}>🗑️</button>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
          </div>

          {/* Messages */}
          <div className="ai-chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "86%", padding: "9px 13px", borderRadius: 16,
                  fontSize: 13, lineHeight: 1.55,
                  background: msg.role === "user"
                    ? "linear-gradient(135deg,#22c55e,#16a34a)"
                    : "rgba(255,255,255,0.06)",
                  color: msg.role === "user" ? "#fff" : "#d1d5db",
                  borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                  borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                  border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.07)" : "none",
                  whiteSpace: "pre-wrap",
                }}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "10px 14px", display: "flex", gap: 5 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", animation: `bounce 0.9s ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div style={{ padding: "4px 14px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => setInput(q)} style={{
                fontSize: 11, background: "rgba(34,197,94,0.08)", color: "#86efac",
                border: "1px solid rgba(34,197,94,0.25)", padding: "3px 10px",
                borderRadius: 99, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s"
              }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div className="ai-chatbot-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask anything..."
              style={{
                flex: 1, padding: "9px 13px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)", color: "#f3f4f6", fontSize: 13,
                outline: "none", fontFamily: "inherit"
              }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              width: 38, height: 38, borderRadius: 12, border: "none",
              background: loading || !input.trim() ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, transition: "all 0.2s", flexShrink: 0
            }}>➤</button>
          </div>
        </div>
      )}

      <button className="ai-chatbot-btn" onClick={() => setOpen(v => !v)} title="Chat with AgriBridge AI">
        <span style={{ fontSize: 26 }}>{open ? "✕" : "🤖"}</span>
        {!open && <div className="ai-chatbot-badge" />}
      </button>
    </div>
  );
}

/* ─── Role-specific navigation ────────────────────────────────────────────── */
const FARMER_NAV = [
  { path: "/",               icon: "🏠", labelKey: "home" },
  { path: "/my-products",    icon: "🌾", labelKey: "myProducts",     badge: "Sell" },
  { path: "/dashboard",      icon: "📊", labelKey: "farmDashboard" },
  { path: "/ai-hub",         icon: "🤖", labelKey: "aiHub",           badge: "AI" },
  { path: "/live-prices",    icon: "📈", labelKey: "mandiPrices",     badge: "Live" },
  { path: "/farm-simulator", icon: "🚜", labelKey: "farmSimulator" },
  { path: "/tutorials",      icon: "🎓", labelKey: "farmingAcademy" },
  { path: "/chat",           icon: "💬", labelKey: "messages" },
  { path: "/schemes",        icon: "🏛️", labelKey: "govtSchemes" },
  { path: "/weather",        icon: "🌦️", labelKey: "weather" },
];

const CONSUMER_NAV = [
  { path: "/",            icon: "🏠", labelKey: "home" },
  { path: "/marketplace", icon: "🛒", labelKey: "browseMarket",  badge: "Buy" },
  { path: "/my-orders",   icon: "📦", labelKey: "myOrders" },
  { path: "/wishlist",    icon: "❤️", labelKey: "wishlist" },
  { path: "/live-prices", icon: "📈", labelKey: "livePrices",    badge: "Live" },
  { path: "/tutorials",   icon: "🎓", labelKey: "farmingAcademy" },
  { path: "/chat",        icon: "💬", labelKey: "messages" },
  { path: "/schemes",     icon: "🏛️", labelKey: "govtSchemes" },
  { path: "/map",         icon: "🗺️", labelKey: "mapRoutes" },
  { path: "/weather",     icon: "🚛", label: "Transport Cost" },
];

const DELIVERY_NAV = [
  { path: "/",                  icon: "🏠", labelKey: "home" },
  { path: "/delivery-dashboard",icon: "🚚", labelKey: "deliveryDashboard", badge: "New" },
  { path: "/chat",              icon: "💬", labelKey: "messages" },
  { path: "/map",               icon: "🗺️", labelKey: "mapRoutes" },
];

/* ─── Language Toggle Pills ─────────────────────────────────────────────────── */
function LanguageToggle({ collapsed }) {
  const { language, setLanguage } = useLanguage();
  const langs = [
    { code: "en", label: "EN" },
    { code: "hi", label: "हि" },
    { code: "mr", label: "म" },
  ];
  return (
    <div style={{
      display: "flex", gap: "4px", padding: "6px 8px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px",
      justifyContent: collapsed ? "center" : "flex-start",
    }}>
      {langs.map(l => (
        <button key={l.code} onClick={() => setLanguage(l.code)}
          title={l.code === "en" ? "English" : l.code === "hi" ? "हिंदी" : "मराठी"}
          style={{
            padding: collapsed ? "4px" : "4px 8px",
            borderRadius: "6px", border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: "11px", fontWeight: 700,
            background: language === l.code
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "transparent",
            color: language === l.code ? "#fff" : "#9ca3af",
            transition: "all 0.2s",
            minWidth: collapsed ? "24px" : "28px",
          }}
        >{l.label}</button>
      ))}
      {!collapsed && (
        <span style={{ color: "#4b5563", fontSize: "10px", alignSelf: "center", marginLeft: "2px" }}>
          Lang
        </span>
      )}
    </div>
  );
}

/* ─── Theme Toggle ─────────────────────────────────────────────────────────── */
function ThemeToggle({ collapsed }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { t } = useLanguage();
  const isDark = theme === "dark";
  return (
    <button onClick={toggleTheme} title={isDark ? t("lightMode") : t("darkMode")} className="sidebar-theme-btn">
      <span className="sidebar-theme-track">
        <span className="sidebar-theme-knob" style={{ left: isDark ? "18px" : "2px" }} />
      </span>
      {!collapsed && <span className="sidebar-theme-label">{isDark ? t("darkMode") : t("lightMode")}</span>}
      <span style={{ fontSize: "15px" }}>{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────────────── */
function Sidebar({ currentUser, onLogout, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const { t } = useLanguage();
  const isFarmer   = currentUser?.role === "farmer";
  const isDelivery = currentUser?.role === "delivery_agent";
  const navLinks = isFarmer ? FARMER_NAV : isDelivery ? DELIVERY_NAV : CONSUMER_NAV;

  // Role-specific brand colors
  const accent      = isFarmer ? "#22c55e" : isDelivery ? "#f97316" : "#22c55e";
  const accentLight = isFarmer ? "rgba(34,197,94," : isDelivery ? "rgba(249,115,22," : "rgba(34,197,94,";
  const roleLabel   = isFarmer ? t("farmerPortal") : isDelivery ? t("deliveryPortal") : t("consumerPortal");

  // Low stock badge (farmer only)
  const wishlistCount = !isFarmer && !isDelivery
    ? (() => { try { return JSON.parse(localStorage.getItem("agribridge_wishlist") || "[]").length; } catch { return 0; } })()
    : 0;

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"} ${mobileOpen ? "sidebar-mobile-open" : ""}`}
        style={{ borderRight: `1px solid ${accentLight}0.12)` }}
      >
        {/* Header */}
        <div className="sidebar-header">
          {!collapsed && (
            <Link to="/" className="sidebar-logo" onClick={() => setMobileOpen(false)}>
              <span className="sidebar-logo-icon">{isDelivery ? "🚚" : "🌾"}</span>
              <div>
                <span className="sidebar-logo-text">{t("appName")}</span>
                <span className="sidebar-logo-badge" style={{ background: `${accentLight}0.2)`, color: accent, border: `1px solid ${accentLight}0.3)` }}>
                  {isFarmer ? t("farmer") : isDelivery ? t("deliveryAgent") : t("consumer")}
                </span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link to="/" className="sidebar-logo-mini" onClick={() => setMobileOpen(false)}>{isDelivery ? "🚚" : "🌾"}</Link>
          )}
          <button className="sidebar-collapse-btn" onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}>
            <span className="sidebar-collapse-icon">{collapsed ? "›" : "‹"}</span>
          </button>
        </div>

        {/* Role badge strip */}
        {!collapsed && (
          <div style={{
            margin: "0 12px 8px", padding: "6px 12px", borderRadius: "10px",
            background: `${accentLight}0.08)`, border: `1px solid ${accentLight}0.2)`,
            fontSize: "11px", fontWeight: 600, color: accent, letterSpacing: "0.03em",
          }}>
            {roleLabel}
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const badgeCount = link.labelKey === "wishlist" ? wishlistCount : 0;
            return (
              <Link key={link.path} to={link.path} onClick={() => setMobileOpen(false)}
                className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                style={isActive ? { background: `${accentLight}0.12)`, color: accent, borderLeft: `3px solid ${accent}` } : {}}
                title={collapsed ? (link.label || t(link.labelKey)) : ""}
              >
                <span className="sidebar-link-icon">{link.icon}</span>
                {!collapsed && <span className="sidebar-link-label">{link.label || t(link.labelKey)}</span>}
                {isActive && !collapsed && <span className="sidebar-link-dot" style={{ background: accent }} />}
                {!collapsed && badgeCount > 0 && (
                  <span style={{ fontSize: "9px", fontWeight: 800, padding: "1px 5px", borderRadius: "99px", background: "#ef4444", color: "#fff", marginLeft: "auto" }}>
                    {badgeCount}
                  </span>
                )}
                {!collapsed && link.badge && !isActive && !badgeCount && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700, padding: "1px 5px", borderRadius: "99px",
                    background: link.badge === "Live" ? "#ef4444" : accent,
                    color: "#fff", marginLeft: "auto", letterSpacing: "0.03em",
                  }}>{link.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          <LanguageToggle collapsed={collapsed} />
          <ThemeToggle collapsed={collapsed} />
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: `${accentLight}0.15)`, border: `1px solid ${accentLight}0.4)` }}>
              <span style={{ color: accent, fontWeight: 700, fontSize: "0.9rem" }}>
                {(currentUser?.name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <>
                <div className="sidebar-user-info">
                  <p className="sidebar-user-name">{(currentUser?.name || "User").split(" ")[0]}</p>
                  <p className="sidebar-user-role" style={{ color: accent }}>{isFarmer ? t("farmer") : isDelivery ? t("deliveryAgent") : t("consumer")}</p>
                </div>
                <button onClick={onLogout} style={{
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px", color: "#f87171", fontSize: "11px", padding: "4px 8px",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 600, marginLeft: "auto", flexShrink: 0,
                }}>{t("logout")}</button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── Mobile Top Bar ───────────────────────────────────────────────────────── */
function MobileTopBar({ currentUser, mobileOpen, setMobileOpen }) {
  const isFarmer   = currentUser?.role === "farmer";
  const isDelivery = currentUser?.role === "delivery_agent";
  const { t } = useLanguage();
  return (
    <header className="mobile-topbar">
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
        <span className="mobile-menu-icon">{mobileOpen ? "✕" : "☰"}</span>
      </button>
      <Link to="/" className="sidebar-logo" style={{ textDecoration: "none" }}>
        <span style={{ fontSize: "1.4rem" }}>{isDelivery ? "🚚" : "🌾"}</span>
        <span className="sidebar-logo-text">{t("appName")}</span>
      </Link>
      <div className="mobile-user-badge" style={{ background: isDelivery ? "rgba(249,115,22,0.15)" : "rgba(34,197,94,0.15)", color: isDelivery ? "#f97316" : "#22c55e" }}>
        <span>{isFarmer ? "🌾" : isDelivery ? "🚚" : "🛒"} {(currentUser?.name || "User").split(" ")[0]}</span>
      </div>
    </header>
  );
}

/* ─── App Content ──────────────────────────────────────────────────────────── */
function AppContent({ currentUser, onLogout }) {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isFarmer   = currentUser?.role === "farmer";
  const isDelivery = currentUser?.role === "delivery_agent";
  const { t } = useLanguage();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="app-shell">
      <Sidebar currentUser={currentUser} onLogout={onLogout}
        collapsed={collapsed} setCollapsed={setCollapsed}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
      />
      <MobileTopBar currentUser={currentUser} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="app-main" style={{ marginLeft: `${sidebarWidth}px` }}>
        <main className={isHome ? "app-home-content" : "app-page-content"}>
          <Routes>
            <Route path="/" element={<HomePage currentUser={currentUser} />} />

            {/* Farmer-only routes */}
            {isFarmer && <Route path="/my-products"    element={<FarmerMarket currentUser={currentUser} />} />}
            {isFarmer && <Route path="/dashboard"      element={<FarmerDashboard currentUser={currentUser} />} />}
            {isFarmer && <Route path="/ai-hub"         element={<AIHub currentUser={currentUser} />} />}
            {isFarmer && <Route path="/farm-simulator" element={<FarmSimulator />} />}

            {/* Consumer-only routes */}
            {!isFarmer && !isDelivery && <Route path="/marketplace" element={<ConsumerMarket currentUser={currentUser} />} />}
            {!isFarmer && !isDelivery && <Route path="/checkout"    element={<CheckoutPage currentUser={currentUser} />} />}
            {!isFarmer && !isDelivery && <Route path="/my-orders"   element={<MyOrdersPage currentUser={currentUser} />} />}
            {!isFarmer && !isDelivery && <Route path="/wishlist"    element={<WishlistPage currentUser={currentUser} />} />}

            {/* Delivery Agent routes */}
            {isDelivery && <Route path="/delivery-dashboard" element={<DeliveryDashboard currentUser={currentUser} />} />}

            {/* Shared routes */}
            <Route path="/live-prices" element={
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>📈 {t("mandiPrices")}</h1>
                <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: "20px" }}>Real-time APMC prices — refreshed every 5 minutes</p>
                <LivePriceTracker />
              </div>
            } />
            <Route path="/tutorials" element={<FarmingTutorials />} />
            <Route path="/chat"      element={<ChatPage currentUser={currentUser} />} />
            <Route path="/schemes"   element={<Schemes />} />
            <Route path="/map"       element={<MapView />} />
            <Route path="/weather"   element={<Weather />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Floating AI Chatbot — visible on ALL pages */}
        <FloatingAIChatbot isFarmer={isFarmer} />

        {!isHome && (
          <footer className="app-footer">
            {isDelivery ? "🚚" : "🌾"} {t("allRights")} · {isFarmer ? t("farmerPortal") : isDelivery ? t("deliveryPortal") : t("consumerPortal")}
          </footer>
        )}
      </div>
    </div>
  );
}

/* ─── Root App ─────────────────────────────────────────────────────────────── */
export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("agribridge-theme") || "dark");
  const [currentUser, setCurrentUser] = useState(() => {
    try { const s = localStorage.getItem("agribridge_user"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("agribridge-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(p => p === "dark" ? "light" : "dark");

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem("agribridge_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("agribridge_user");
    localStorage.removeItem("agribridge_token");
  };

  return (
    <LanguageProvider>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {!currentUser ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <Router>
            <AppContent currentUser={currentUser} onLogout={handleLogout} />
          </Router>
        )}
      </ThemeContext.Provider>
    </LanguageProvider>
  );
}
