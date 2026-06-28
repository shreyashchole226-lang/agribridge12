import React, { useState, useEffect, useCallback } from "react";
import { getLivePrices } from "../api";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Zap,
  AlertCircle, BarChart2, Info, ChevronDown, ChevronUp
} from "lucide-react";

const MARKETS = [
  "Pune APMC", "Mumbai APMC", "Delhi Azadpur", "Nashik APMC",
  "Bangalore APMC", "Ahmedabad APMC", "Hyderabad APMC", "Kolkata APMC"
];

/* Design tokens */
const C = {
  green:  "#22c55e",  lime:   "#4ade80",
  red:    "#ef4444",  red4:   "#f87171",
  amber:  "#f59e0b",  amber4: "#fbbf24",
  blue:   "#60a5fa",  purple: "#a78bfa",
  white:  "#f1f5f9",  muted:  "#94a3b8",
  gray:   "#64748b",  dim:    "#334155",
};

/* Trend chip */
function Chip({ trend, change }) {
  const up   = trend === "up";
  const dn   = trend === "down";
  const color = up ? C.lime : dn ? C.red4 : C.muted;
  const bg    = up ? "rgba(34,197,94,0.13)" : dn ? "rgba(239,68,68,0.13)" : "rgba(148,163,184,0.1)";
  const Icon  = up ? TrendingUp : dn ? TrendingDown : Minus;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "3px",
      color, background: bg, borderRadius: "99px",
      padding: "3px 8px", fontSize: "11px", fontWeight: 800,
      whiteSpace: "nowrap",
    }}>
      <Icon size={10} />
      {up ? "+" : dn ? "-" : ""}
      {Math.abs(change || 0).toFixed(1)}%
    </span>
  );
}

/* Sentiment badge */
function Sentiment({ val }) {
  const map = {
    Bullish: { bg: "rgba(34,197,94,0.14)",  bc: "rgba(34,197,94,0.35)",  c: C.lime,   e: "\uD83D\uDCC8" },
    Bearish: { bg: "rgba(239,68,68,0.14)",  bc: "rgba(239,68,68,0.35)",  c: C.red4,   e: "\uD83D\uDCC9" },
    Neutral: { bg: "rgba(245,158,11,0.14)", bc: "rgba(245,158,11,0.35)", c: C.amber4, e: "\u2696\uFE0F" },
  };
  const { bg, bc, c, e } = map[val] || map.Neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "5px 13px", borderRadius: "99px", fontSize: "12px", fontWeight: 700,
      background: bg, border: `1px solid ${bc}`, color: c,
    }}>
      {e} {val}
    </span>
  );
}

/* Stat mini card */
function StatMini({ icon, label, value, color, bg, bc }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? bg.replace(/0\.\d+\)$/, "0.15)") : bg,
        border: `1px solid ${bc}`,
        borderRadius: "16px", padding: "14px 16px",
        transition: "all 0.22s ease",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
      }}
    >
      <p style={{ color: C.gray, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px", display: "flex", alignItems: "center", gap: "4px" }}>
        <span>{icon}</span>{label}
      </p>
      <p style={{ color, fontWeight: 900, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value || "\u2014"}
      </p>
    </div>
  );
}

/* Price Card — always visible, no click required */
function PriceRow({ item, idx }) {
  const [hov, setHov] = useState(false);

  const accent = item.trend === "up" ? C.green : item.trend === "down" ? C.red : C.dim;
  const demandColor = ["High","Very High"].includes(item.demand) ? C.lime
    : item.demand === "Low" ? C.red4 : C.amber4;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov
          ? "rgba(34,197,94,0.06)"
          : idx % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.018)",
        border: `1px solid ${hov ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: "16px",
        transition: "all 0.18s ease",
        overflow: "hidden",
        animation: `slideUp 0.28s ease ${idx * 0.04}s both`,
        boxShadow: hov ? "0 6px 28px rgba(34,197,94,0.1)" : "none",
      }}
    >
      {/* Header: emoji + name + price + chip */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "14px 16px 10px",
      }}>
        {/* Emoji badge */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg, ${accent}25, ${accent}0a)`,
          border: `1px solid ${accent}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem",
        }}>
          {item.emoji || "\uD83C\uDF3E"}
        </div>

        {/* Name + category */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: C.white, fontWeight: 800, fontSize: "15px", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.commodity}
          </p>
          <p style={{ color: C.gray, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            {item.category}
          </p>
        </div>

        {/* Price + chip */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ color: C.lime, fontWeight: 900, fontSize: "18px", lineHeight: 1.1, whiteSpace: "nowrap" }}>
            {"\u20B9"}{item.current_price}
            <span style={{ color: C.gray, fontSize: "10px", fontWeight: 500 }}>/{item.unit}</span>
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <Chip trend={item.trend} change={item.change_percent} />
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        {[
          { label: "Yesterday", value: `\u20B9${item.previous_price}`, color: C.white },
          { label: "Range",     value: `\u20B9${item.min_price}\u2013${item.max_price}`, color: C.blue },
          { label: "Arrivals",  value: `${item.arrival_tonnes}T`, color: C.amber4 },
          { label: "Demand",    value: item.demand, color: demandColor },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: "9px 10px", textAlign: "center",
            borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
            background: i % 2 === 0 ? "rgba(10,26,15,0.5)" : "rgba(6,18,10,0.4)",
          }}>
            <p style={{ color: C.gray, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>
              {s.label}
            </p>
            <p style={{ color: s.color, fontWeight: 800, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Forecast + best sell time */}
      {(item.price_forecast || item.best_selling_time) && (
        <div style={{ padding: "9px 16px 12px", display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(34,197,94,0.02)" }}>
          {item.price_forecast && (
            <p style={{ color: "#93c5fd", fontSize: "11px", display: "flex", gap: "6px", alignItems: "flex-start" }}>
              <Info size={11} style={{ flexShrink: 0, marginTop: "1px", color: C.blue }} />
              {item.price_forecast}
            </p>
          )}
          {item.best_selling_time && (
            <p style={{ color: C.amber4, fontSize: "11px", display: "flex", gap: "6px", alignItems: "center", fontWeight: 600 }}>
              <Zap size={11} style={{ flexShrink: 0 }} />
              Best time: {item.best_selling_time}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* Ticker (exported for use on other pages) */
export function PriceTicker({ prices }) {
  if (!prices?.length) return null;
  const items = [...prices, ...prices];
  return (
    <div style={{ overflow: "hidden", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: "12px", height: "36px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "20px", position: "absolute", top: 0, height: "100%", whiteSpace: "nowrap", animation: "ticker-scroll 45s linear infinite" }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", padding: "0 6px" }}>
            <span>{item.emoji || "\uD83C\uDF3E"}</span>
            <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{item.commodity}</span>
            <span style={{ color: C.lime, fontWeight: 800 }}>{"\u20B9"}{item.current_price}</span>
            <Chip trend={item.trend} change={item.change_percent} />
            <span style={{ color: C.dim, marginLeft: "6px" }}>·</span>
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "40px", background: "linear-gradient(90deg, #060d08, transparent)", zIndex: 1, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "40px", background: "linear-gradient(270deg, #060d08, transparent)", zIndex: 1, pointerEvents: "none" }} />
    </div>
  );
}

/* Main Component */
export default function LivePriceTracker({ compact = false, defaultMarket = "Pune APMC" }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [market,      setMarket]      = useState(defaultMarket);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filter,      setFilter]      = useState("All");
  const [sortBy,      setSortBy]      = useState("default");
  const [showAI,      setShowAI]      = useState(true);

  const CATS = ["All", "Vegetable", "Fruit", "Grain", "Pulse", "Spice"];

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getLivePrices(null, market);
      if (res.data?.success) { setData(res.data); setLastRefresh(new Date()); }
      else setError(res.data?.error || "Failed to fetch prices");
    } catch { setError("Backend offline. Start uvicorn on port 8000."); }
    setLoading(false);
  }, [market]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { const t = setInterval(fetch, 5 * 60 * 1000); return () => clearInterval(t); }, [fetch]);

  const prices = (() => {
    if (!data?.prices) return [];
    let p = [...data.prices];
    if (filter !== "All") p = p.filter(x => x.category === filter);
    if (sortBy === "price_asc")  p.sort((a, b) => a.current_price - b.current_price);
    if (sortBy === "price_desc") p.sort((a, b) => b.current_price - a.current_price);
    if (sortBy === "gainers")    p.sort((a, b) => b.change_percent - a.change_percent);
    if (sortBy === "losers")     p.sort((a, b) => a.change_percent - b.change_percent);
    return p;
  })();

  const sel = {
    background: "rgba(10,26,15,0.9)",
    border: "1px solid rgba(34,197,94,0.2)",
    borderRadius: "10px", color: C.white,
    fontSize: "12px", padding: "7px 12px",
    fontFamily: "inherit", outline: "none", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 0.3s ease both" }}>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))",
        border: "1px solid rgba(34,197,94,0.22)",
        borderRadius: "20px", padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "14px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.1), transparent)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #22c55e, #15803d)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(34,197,94,0.4)" }}>
              <BarChart2 size={22} color="#fff" />
            </div>
            {!loading && data && (
              <span style={{ position: "absolute", top: -3, right: -3, width: 11, height: 11, borderRadius: "50%", background: "#22c55e", border: "2px solid #060d08", animation: "pulse 2s infinite" }} />
            )}
          </div>
          <div>
            <h2 style={{ color: C.white, fontWeight: 800, fontSize: "1.1rem", marginBottom: "2px" }}>🤖 AI Live Price Tracker</h2>
            <p style={{ color: C.gray, fontSize: "12px" }}>
              {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Connecting to mandi data…"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {data && <Sentiment val={data.market_sentiment} />}
          <select value={market} onChange={e => setMarket(e.target.value)} style={sel}>
            {MARKETS.map(m => <option key={m} value={m} style={{ background: "#0a1a0f" }}>{m}</option>)}
          </select>
          <button onClick={fetch} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)",
            borderRadius: "10px", color: C.lime, padding: "7px 14px",
            fontSize: "12px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1, transition: "all 0.2s", fontFamily: "inherit",
          }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Updating…" : "⟳ Refresh"}
          </button>
        </div>
      </div>

      {/* SENTIMENT REASON */}
      {data?.sentiment_reason && (
        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "13px", padding: "11px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Info size={14} color="#a5b4fc" style={{ flexShrink: 0 }} />
          <p style={{ color: "#c7d2fe", fontSize: "13px" }}>{data.sentiment_reason}</p>
        </div>
      )}

      {/* STAT ROW */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "11px" }}>
          <StatMini icon="📈" label="Top Gainer"   value={data.top_gainer}              color={C.lime}   bg="rgba(34,197,94,0.08)"  bc="rgba(34,197,94,0.2)"  />
          <StatMini icon="📉" label="Top Loser"    value={data.top_loser}               color={C.red4}   bg="rgba(239,68,68,0.08)"  bc="rgba(239,68,68,0.2)"  />
          <StatMini icon="🌾" label="Commodities"  value={`${data.prices?.length || 0} tracked`} color={C.green}  bg="rgba(34,197,94,0.06)"  bc="rgba(34,197,94,0.15)" />
          <StatMini icon="🏪" label="Market"       value={data.market}                  color={C.blue}   bg="rgba(59,130,246,0.08)" bc="rgba(59,130,246,0.2)"  />
        </div>
      )}

      {/* AI INSIGHTS */}
      {data?.ai_insights?.length > 0 && (
        <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "17px", overflow: "hidden" }}>
          <button onClick={() => setShowAI(s => !s)} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "13px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: "7px", color: "#c4b5fd", fontSize: "13px", fontWeight: 700 }}>
              <Zap size={14} color="#a78bfa" /> 🧠 AI Market Insights
            </span>
            {showAI ? <ChevronUp size={14} color="#a78bfa" /> : <ChevronDown size={14} color="#a78bfa" />}
          </button>
          {showAI && (
            <div style={{ padding: "0 18px 15px", display: "flex", flexDirection: "column", gap: "7px" }}>
              {data.ai_insights.map((ins, i) => (
                <div key={i} style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                  <span style={{ color: C.purple, fontWeight: 800, fontSize: "10px", marginTop: "3px", flexShrink: 0, background: "rgba(139,92,246,0.15)", borderRadius: "99px", padding: "1px 6px" }}>{i + 1}</span>
                  <p style={{ color: "#ddd6fe", fontSize: "13px", lineHeight: 1.6 }}>{ins}</p>
                </div>
              ))}
              {data.advisory && (
                <div style={{ marginTop: "5px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "11px", padding: "10px 14px" }}>
                  <p style={{ color: C.amber4, fontSize: "12px", fontWeight: 600, lineHeight: 1.6 }}>💡 {data.advisory}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FILTER & SORT BAR */}
      {data && !compact && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", flex: 1 }}>
            {CATS.map(cat => {
              const active = filter === cat;
              return (
                <button key={cat} onClick={() => setFilter(cat)} style={{
                  padding: "6px 14px", borderRadius: "99px", fontFamily: "inherit",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.18s",
                  background: active ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,0.05)",
                  color: active ? "#fff" : C.muted,
                  border: `1px solid ${active ? "#22c55e" : "rgba(255,255,255,0.1)"}`,
                  boxShadow: active ? "0 2px 10px rgba(34,197,94,0.3)" : "none",
                  transform: active ? "scale(1.04)" : "scale(1)",
                }}>
                  {cat}
                </button>
              );
            })}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...sel, minWidth: "140px" }}>
            <option value="default"    style={{ background: "#0a1a0f" }}>Default Order</option>
            <option value="gainers"    style={{ background: "#0a1a0f" }}>Top Gainers ↑</option>
            <option value="losers"     style={{ background: "#0a1a0f" }}>Top Losers ↓</option>
            <option value="price_desc" style={{ background: "#0a1a0f" }}>Price: High → Low</option>
            <option value="price_asc"  style={{ background: "#0a1a0f" }}>Price: Low → High</option>
          </select>
        </div>
      )}

      {/* LOADER */}
      {loading && !data && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "16px" }}>
          <div style={{ position: "relative", width: 56, height: 56 }}>
            <div style={{ position: "absolute", inset: 0, border: "4px solid rgba(34,197,94,0.15)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", inset: 0, border: "4px solid transparent", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "1.3rem" }}>🤖</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: C.white, fontWeight: 700, marginBottom: "4px" }}>AI Analyzing Mandi Data…</p>
            <p style={{ color: C.gray, fontSize: "13px" }}>Fetching live prices from {market}</p>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <AlertCircle size={17} color={C.red4} style={{ flexShrink: 0, marginTop: "1px" }} />
          <div>
            <p style={{ color: C.red4, fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>Unable to fetch prices</p>
            <p style={{ color: "rgba(248,113,113,0.7)", fontSize: "12px", marginBottom: "8px" }}>{error}</p>
            <button onClick={fetch} style={{ color: C.red4, fontSize: "12px", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>Retry</button>
          </div>
        </div>
      )}

      {/* PRICE GRID — always-visible cards in 2-column responsive grid */}
      {data && prices.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "10px",
        }}>
          {prices.map((item, i) => <PriceRow key={i} item={item} idx={i} />)}
        </div>
      )}

      {data && prices.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: C.gray }}>
          <BarChart2 size={36} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
          <p>No prices for "{filter}"</p>
        </div>
      )}

      {/* FOOTER */}
      {data && (
        <p style={{ textAlign: "center", color: "#334155", fontSize: "12px", paddingTop: "4px" }}>
          🔄 Auto-refreshes every 5 min · Powered by Groq AI ⚡
        </p>
      )}
    </div>
  );
}
