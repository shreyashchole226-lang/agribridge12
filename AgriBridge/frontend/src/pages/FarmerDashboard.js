import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFarmerAnalytics, getMarketAnalytics } from "../api";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
  AreaChart, Area, Legend
} from "recharts";
import {
  TrendingUp, Package, Star, ShoppingBag, IndianRupee,
  ArrowUpRight, ArrowDownRight, Activity, Award, Leaf, Clock,
  AlertTriangle, CheckCircle2, BarChart2, Zap, RefreshCw
} from "lucide-react";
import LivePriceTracker from "../components/LivePriceTracker";
import { useLanguage } from "../context/LanguageContext";

const COLORS = ["#4ade80", "#d97706", "#60a5fa", "#f87171", "#a78bfa", "#fb923c", "#34d399", "#f472b6"];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "text-agri-lime", trend, trendVal, gradient }) {
  return (
    <div className={`stat-card relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 ${gradient || ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold ${color} truncate`}>{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(trendVal || trend)}% vs last month
            </div>
          )}
        </div>
        <div className="bg-agri-green/20 p-3 rounded-xl flex-shrink-0 group-hover:bg-agri-green/30 transition-colors">
          <Icon size={22} className="text-agri-lime" />
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 shadow-xl">
        <p className="text-gray-300 text-sm font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-sm">
            {p.name}: {p.name === "revenue" || p.name === "Revenue" ? `₹${p.value?.toLocaleString()}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Quick Action Card ────────────────────────────────────────────────────────
function QuickAction({ icon, label, desc, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border border-gray-700/50 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 transition-all group w-full text-left`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-gray-500 text-xs truncate">{desc}</p>
      </div>
      <ArrowUpRight size={14} className="text-gray-600 group-hover:text-agri-lime transition-colors flex-shrink-0" />
    </button>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────
function InfoPanel({ title, items, color = "border-agri-green/30 bg-agri-green/5" }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-agri-lime font-semibold text-sm mb-3">{title}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">{item.label}</span>
            <span className="text-white font-semibold text-sm">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Farmer Tips ─────────────────────────────────────────────────────────────
const FARM_TIPS = [
  { icon: "💧", tip: "Water your crops early morning to reduce evaporation by up to 30%." },
  { icon: "🌱", tip: "Rotate crops every season to naturally replenish soil nutrients." },
  { icon: "📦", tip: "Sell 30% of harvest at retail price — it boosts profit margins significantly." },
  { icon: "🤝", tip: "Join a Farmer Producer Organization (FPO) to get better bulk pricing." },
  { icon: "📱", tip: "Use e-NAM portal to compare mandi prices across India before selling." },
  { icon: "🏦", tip: "Apply for Kisan Credit Card — get up to ₹3 lakh credit at 4% interest." },
];

function TipCard() {
  const [idx, setIdx] = useState(0);
  const { t } = useLanguage();
  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % FARM_TIPS.length), 6000);
    return () => clearInterval(timer);
  }, []);
  const tip = FARM_TIPS[idx];
  return (
    <div className="bg-gradient-to-r from-agri-green/10 to-transparent border border-agri-green/20 rounded-2xl p-4 flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">{tip.icon}</span>
      <div>
        <p className="text-agri-lime text-xs font-semibold mb-1">{t("farmingTipLabel")}</p>
        <p className="text-gray-300 text-sm">{tip.tip}</p>
      </div>
      <div className="flex gap-1 ml-auto flex-shrink-0">
        {FARM_TIPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-agri-lime w-4" : "bg-gray-600"}`}
          />
        ))}
      </div>
    </div>
  );
}


// ─── Seasonal Calendar ────────────────────────────────────────────────────────
const SEASONAL = [
  { month: "Jan–Feb", crops: ["Wheat", "Mustard", "Peas"], season: "Rabi" },
  { month: "Mar–Apr", crops: ["Maize", "Groundnut", "Watermelon"], season: "Zaid" },
  { month: "May–Jun", crops: ["Bajra", "Jowar", "Rice"], season: "Kharif" },
  { month: "Jul–Sep", crops: ["Cotton", "Soybean", "Turmeric"], season: "Kharif" },
  { month: "Oct–Nov", crops: ["Tomato", "Onion", "Garlic"], season: "Rabi" },
  { month: "Dec",     crops: ["Carrot", "Cauliflower", "Spinach"], season: "Rabi" },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function FarmerDashboard({ currentUser }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFarmer, setActiveFarmer] = useState(currentUser.role === "farmer" ? currentUser.id : 1);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { loadData(); }, [activeFarmer]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [a, m] = await Promise.all([getFarmerAnalytics(activeFarmer), getMarketAnalytics()]);
      setAnalytics(a.data);
      setMarket(m.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-agri-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">{t("loadingDashboard")}</p>
        </div>
      </div>
    );
  }

  const { summary, monthly_revenue, top_crops, product_ratings } = analytics || {};

  // Fake week-day revenue for mini sparkline
  const weekRevenue = [
    { day: "Mon", Revenue: 4200 }, { day: "Tue", Revenue: 6800 },
    { day: "Wed", Revenue: 5100 }, { day: "Thu", Revenue: 7400 },
    { day: "Fri", Revenue: 9200 }, { day: "Sat", Revenue: 11500 },
    { day: "Sun", Revenue: 8300 },
  ];

  const TABS = [
    { id: "overview",   label: t("overview"),    icon: "📊" },
    { id: "prices",     label: t("livePrices"), icon: "📈" },
    { id: "insights",   label: t("insights"),    icon: "🧠" },
  ];

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }} className="space-y-6">
      {/* ── Premium Hero Header ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(59,130,246,0.06) 60%, transparent 100%)",
        border: "1px solid rgba(34,197,94,0.18)", borderRadius: 24, padding: "28px 32px",
        position: "relative", overflow: "hidden", marginBottom: 4
      }}>
        {/* Glow orbs */}
        <div style={{ position:"absolute", top:-50, right:-40, width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(34,197,94,0.1), transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, left:60, width:150, height:150, borderRadius:"50%", background:"radial-gradient(circle, rgba(59,130,246,0.07), transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(34,197,94,0.4), rgba(59,130,246,0.3), transparent)" }} />

        <div style={{ display:"flex", flexWrap:"wrap", gap:16, justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <div style={{ width:48, height:48, borderRadius:16, background:"rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:"0 0 20px rgba(34,197,94,0.3)" }}>📊</div>
              <div>
                <h1 style={{ fontSize:"1.9rem", fontWeight:900, color:"#fff", letterSpacing:"-0.02em", margin:0 }}>{t("analyticsDashboard")}</h1>
                <p style={{ color:"#6b7280", fontSize:13, margin:0 }}>{t("dashboardSubtitle")}</p>
              </div>
            </div>
            {/* Quick stats chips in header */}
            {summary && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:4 }}>
                {[
                  { icon:"📦", label:`${summary.total_products || 0} ${t("products")}`, color:"#22c55e" },
                  { icon:"🛒", label:`${summary.total_orders || 0} ${t("orders")}`, color:"#3b82f6" },
                  { icon:"💰", label:`₹${((summary.total_revenue||0)/1000).toFixed(0)}K ${t("revenue")}`, color:"#f59e0b" },
                  { icon:"⭐", label:`${summary.avg_rating || "—"} ${t("rating")}`, color:"#a78bfa" },
                ].map(c => (
                  <span key={c.label} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700, background:`${c.color}14`, border:`1px solid ${c.color}30`, color:c.color }}>
                    {c.icon} {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Controls */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <button onClick={loadData} style={{
              display:"flex", alignItems:"center", gap:6, padding:"9px 14px", borderRadius:12,
              background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)",
              color:"#4ade80", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,197,94,0.18)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,0.1)"; e.currentTarget.style.transform = ""; }}
            >
              <RefreshCw size={13} /> {t("refresh")}
            </button>
            <select value={activeFarmer} onChange={(e) => setActiveFarmer(parseInt(e.target.value))}
              style={{ padding:"9px 14px", borderRadius:12, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#f3f4f6", fontSize:13, cursor:"pointer", fontFamily:"inherit", outline:"none" }}
            >
              <option value={1}>Ramesh Patil — Pune</option>
              <option value={2}>Sunita Devi — Pune</option>
              <option value={4}>Santosh Jadhav — Baramati</option>
              <option value={5}>Mahadev Shinde — Indapur</option>
              <option value={6}>Tukaram Pawar — Shirur</option>
              <option value={7}>Babanrao Kale — Daund</option>
              <option value={8}>Nitin Chavan — Junnar</option>
              <option value={9}>Ganesh Bhosale — Ambegaon</option>
              <option value={10}>Vitthal More — Mulshi</option>
              <option value={11}>Prakash Gaikwad — Purandar</option>
              <option value={12}>Suresh Dhumal — Talegaon</option>
              <option value={13}>Ramesh Kendre — Bhor</option>
              <option value={14}>Dnyaneshwar Jagtap — Haveli</option>
              <option value={15}>Sunil Thorat — Saswad</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Rotating Tip ── */}
      <TipCard />

      {/* ── Premium Tab Nav ── */}
      <div style={{ display:"flex", gap:6, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, padding:"5px" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            padding:"10px 16px", borderRadius:13, border:"none", cursor:"pointer",
            fontWeight:700, fontSize:13, fontFamily:"inherit",
            background: activeTab === tab.id ? "linear-gradient(135deg, #22c55e, #16a34a)" : "transparent",
            color: activeTab === tab.id ? "#fff" : "#6b7280",
            boxShadow: activeTab === tab.id ? "0 4px 16px rgba(34,197,94,0.3)" : "none",
            transition:"all 0.2s",
          }}
          onMouseEnter={e => { if(activeTab !== tab.id) e.currentTarget.style.color = "#e5e7eb"; }}
          onMouseLeave={e => { if(activeTab !== tab.id) e.currentTarget.style.color = "#6b7280"; }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>


      {/* ════════════ OVERVIEW TAB ════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Platform stats banner */}
          {market && (
            <div className="bg-gradient-to-r from-agri-green/10 via-transparent to-blue-500/10 border border-agri-green/20 rounded-2xl p-4">
              <p className="text-agri-lime text-xs font-semibold mb-3 uppercase tracking-wider">🌐 {t("platformOverview")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {[
                  { label: t("products"), value: market.total_products, icon: "📦" },
                  { label: t("orders"),   value: market.total_orders,   icon: "🛒" },
                  { label: t("revenue"),  value: `₹${(market.total_revenue / 1000).toFixed(0)}K`, icon: "💰" },
                  { label: t("farmers"),  value: market.total_farmers,  icon: "👨‍🌾" },
                  { label: t("buyers"),   value: market.total_buyers,   icon: "🤝" },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: 14,
                    padding: "10px 8px",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.14)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,0.08)"}
                  >
                    <p className="text-lg mb-0.5">{s.icon}</p>
                    <p className="text-white font-bold text-lg">{s.value}</p>
                    <p className="text-gray-400 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stat Cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={IndianRupee}
                label={t("totalRevenue")}
                value={`₹${summary.total_revenue?.toLocaleString()}`}
                sub={t("allTimeEarnings")}
                trend={12.4}
                trendVal={12.4}
              />
              <StatCard
                icon={ShoppingBag}
                label={t("totalOrders")}
                value={summary.total_orders}
                sub={t("fulfilledOrders")}
                color="text-blue-400"
                trend={8.1}
                trendVal={8.1}
              />
              <StatCard
                icon={Star}
                label={t("avgRating")}
                value={`${summary.avg_rating}/5`}
                sub={t("customerSatisfaction")}
                color="text-agri-gold"
                trend={2.3}
                trendVal={2.3}
              />
              <StatCard
                icon={Package}
                label={t("activeProducts")}
                value={summary.active_products}
                sub={t("listedOnMarket")}
                color="text-purple-400"
              />
            </div>
          )}

          {/* Weekly revenue sparkline */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-agri-lime" />
                <h3 className="text-white font-semibold">{t("thisWeeksRevenue")}</h3>
              </div>
              <span className="text-agri-lime font-bold text-sm">
                ₹{weekRevenue.reduce((s, d) => s + d.Revenue, 0).toLocaleString()}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weekRevenue}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0a1a0f" />
                <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Revenue" stroke="#4ade80" strokeWidth={2.5}
                  fill="url(#revenueGrad)" dot={{ fill: "#4ade80", r: 4 }} activeDot={{ r: 7 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-agri-lime" />
                <h3 className="text-white font-semibold">{t("monthlyRevenue")}</h3>
              </div>
              {monthly_revenue?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthly_revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0a1a0f" />
                    <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="revenue" stroke="#4ade80" strokeWidth={2.5}
                      dot={{ fill: "#4ade80", r: 4 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-gray-500">{t("noRevenueData")}</div>
              )}
            </div>

            {/* Most Sold Crops */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <Package size={18} className="text-agri-gold" />
                <h3 className="text-white font-semibold">{t("mostSoldCrops")}</h3>
              </div>
              {top_crops?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={top_crops} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#0a1a0f" />
                    <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="crop" stroke="#6b7280" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="qty_sold" radius={[0, 6, 6, 0]}>
                      {top_crops.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-gray-500">{t("noSalesData")}</div>
              )}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Ratings */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <Star size={18} className="text-agri-gold" />
                <h3 className="text-white font-semibold">{t("avgCustomerRating")}</h3>
              </div>
              {product_ratings?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={product_ratings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0a1a0f" />
                    <XAxis dataKey="product" stroke="#6b7280" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 5]} stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avg_rating" radius={[6, 6, 0, 0]}>
                      {product_ratings.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-gray-500">{t("noRatingData")}</div>
              )}
            </div>

            {/* Pie */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={18} className="text-blue-400" />
                <h3 className="text-white font-semibold">{t("cropSalesDistribution")}</h3>
              </div>
              {top_crops?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={top_crops}
                      dataKey="qty_sold"
                      nameKey="crop"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {top_crops.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-gray-500">{t("noData")}</div>
              )}
            </div>
          </div>

          {/* Info Panels Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoPanel
              title={t("revenueBreakdown")}
              items={[
                { label: t("retailSales"), value: `₹${Math.round((summary?.total_revenue || 0) * 0.35).toLocaleString()}` },
                { label: t("bulkB2B"),     value: `₹${Math.round((summary?.total_revenue || 0) * 0.65).toLocaleString()}` },
                { label: t("avgPerOrder"),value: summary?.total_orders ? `₹${Math.round((summary.total_revenue || 0) / summary.total_orders)}` : "—" },
              ]}
            />
            <InfoPanel
              title={t("productHealth")}
              color="border-blue-500/20 bg-blue-500/5"
              items={[
                { label: t("activeListings"), value: summary?.active_products || 0 },
                { label: t("avgRating"),      value: `${summary?.avg_rating || "—"} ★` },
                { label: t("returnRate"),     value: "2.1%" },
              ]}
            />
            <InfoPanel
              title={t("farmStatus")}
              color="border-yellow-500/20 bg-yellow-500/5"
              items={[
                { label: t("currentSeasonLabel"), value: "Kharif 2025" },
                { label: t("nextHarvest"),   value: "Aug–Sep 2025" },
                { label: t("mspCoverage"),   value: "Eligible" },
              ]}
            />
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-agri-gold" />
              <h3 className="text-white font-semibold">{t("quickActions")}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickAction icon="💊" label="Crop Doctor" desc="Diagnose plant diseases with AI" color="bg-red-500/20" onClick={() => navigate('/ai-hub')} />
              <QuickAction icon="🌱" label="Fertilizer Advice" desc="Get soil-based recommendations" color="bg-green-500/20" onClick={() => navigate('/ai-hub')} />
              <QuickAction icon="🚜" label="Farm Simulator" desc="Plan your next season crop" color="bg-yellow-500/20" onClick={() => navigate('/farm-simulator')} />
              <QuickAction icon="🏛️" label="Govt Schemes" desc="Find eligible subsidies" color="bg-blue-500/20" onClick={() => navigate('/schemes')} />
              <QuickAction icon="🗺️" label="Transport Routes" desc="Calculate delivery costs" color="bg-purple-500/20" onClick={() => navigate('/weather')} />
              <QuickAction icon="💬" label="Chat with Buyer" desc="Negotiate directly" color="bg-pink-500/20" onClick={() => navigate('/chat')} />
            </div>
          </div>

          {/* Seasonal Crop Calendar */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Leaf size={16} className="text-agri-lime" />
              <h3 className="text-white font-semibold">🗓️ Seasonal Crop Calendar</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {SEASONAL.map((s) => (
                <div key={s.month} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 hover:border-agri-green/30 transition-colors">
                  <p className="text-agri-lime text-xs font-bold mb-1">{s.month}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full mb-2 inline-block ${
                    s.season === "Kharif" ? "bg-blue-500/20 text-blue-300"
                    : s.season === "Rabi" ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-purple-500/20 text-purple-300"
                  }`}>{s.season}</span>
                  <div className="space-y-0.5">
                    {s.crops.map(c => (
                      <p key={c} className="text-gray-400 text-xs">• {c}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-400 font-semibold text-sm">{t("marketAlert")}</p>
              <p className="text-amber-400/70 text-xs mt-1">{t("marketAlertDesc")}</p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ LIVE PRICES TAB ════════════ */}
      {activeTab === "prices" && (
        <LivePriceTracker defaultMarket="Pune APMC" />
      )}

      {/* ════════════ INSIGHTS TAB ════════════ */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          {/* Performance Score */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Award size={18} className="text-agri-gold" />
              <h3 className="text-white font-semibold">{t("farmPerformanceScore")}</h3>
            </div>
            {summary && (
              <div className="space-y-4">
                {[
                  { labelKey: "revenueGrowth",     score: 78, color: "#4ade80" },
                  { labelKey: "customerSatisfaction", score: Math.round((summary.avg_rating / 5) * 100), color: "#d97706" },
                  { labelKey: "productDiversity",  score: Math.min(100, (summary.active_products / 10) * 100), color: "#60a5fa" },
                  { labelKey: "marketReach",       score: 65, color: "#a78bfa" },
                  { labelKey: "onTimeDelivery",    score: 91, color: "#34d399" },
                ].map(s => (
                  <div key={s.labelKey}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{t(s.labelKey)}</span>
                      <span className="font-bold" style={{ color: s.color }}>{Math.round(s.score)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${s.score}%`, background: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Radar Chart */}
          {summary && (
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={18} className="text-purple-400" />
                <h3 className="text-white font-semibold">{t("performanceRadar")}</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={[
                  { subject: "Revenue",     A: 78 },
                  { subject: "Ratings",     A: Math.round((summary.avg_rating / 5) * 100) },
                  { subject: "Products",    A: Math.min(100, (summary.active_products / 10) * 100) },
                  { subject: "Delivery",    A: 91 },
                  { subject: "Reach",       A: 65 },
                  { subject: "Diversity",   A: 72 },
                ]}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" stroke="#6b7280" tick={{ fontSize: 12 }} />
                  <Radar name="Performance" dataKey="A" stroke="#4ade80" fill="#4ade80" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Key Insights */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-agri-gold" />
              <h3 className="text-white font-semibold">{t("aiGeneratedInsights")}</h3>
            </div>
            <div className="space-y-3">
              {[
                { icon: <TrendingUp size={16} className="text-emerald-400" />, text: "Your revenue increased 12.4% compared to last month — keep it up!", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { icon: <Star size={16} className="text-yellow-400" />, text: `Your average rating of ${summary?.avg_rating}/5 puts you in the top 15% of farmers on AgriBridge.`, bg: "bg-yellow-500/10 border-yellow-500/20" },
                { icon: <Package size={16} className="text-blue-400" />, text: "Diversify! Farmers with 8+ product types earn 34% more on average.", bg: "bg-blue-500/10 border-blue-500/20" },
                { icon: <Clock size={16} className="text-purple-400" />, text: "Best selling time: List new products on Tuesday/Wednesday for 25% more views.", bg: "bg-purple-500/10 border-purple-500/20" },
                { icon: <CheckCircle2 size={16} className="text-agri-lime" />, text: "Tomato demand is high this week. Consider listing more if you have stock.", bg: "bg-agri-green/10 border-agri-green/20" },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-3 border rounded-xl p-3 ${item.bg}`}>
                  <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                  <p className="text-gray-300 text-sm">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

