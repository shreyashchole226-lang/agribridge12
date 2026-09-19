import React, { useState } from "react";
import { simulateFarm } from "../api";
import {
  Sprout, TrendingUp, AlertTriangle, Droplets, BarChart3,
  Loader, ChevronDown, ChevronUp, Star, MapPin, IndianRupee,
  Layers, Calendar, Zap
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// ─── Helper: colour maps ──────────────────────────────────────────────────────
const RISK_COLOR = {
  Low:    { bg: "bg-emerald-900/40", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400" },
  Medium: { bg: "bg-amber-900/30",   border: "border-amber-500/40",   text: "text-amber-400",   dot: "bg-amber-400"   },
  High:   { bg: "bg-red-900/30",     border: "border-red-500/40",     text: "text-red-400",     dot: "bg-red-400"     },
};
const DEMAND_COLOR = {
  Low:       "text-gray-400",
  Moderate:  "text-blue-400",
  High:      "text-agri-lime",
  "Very High": "text-agri-gold",
};
const WATER_ICON = { Low: "💧", Moderate: "💧💧", High: "💧💧💧", "Very High": "💧💧💧💧" };

function fmt(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ value, max = 10, color = "bg-agri-lime" }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={`${color} h-1.5 rounded-full transition-all duration-700`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  );
}

// ─── Crop Result Card ─────────────────────────────────────────────────────────
function CropCard({ crop, rank }) {
  const [expanded, setExpanded] = useState(rank === 1);
  const risk = RISK_COLOR[crop.risk_level] || RISK_COLOR.Medium;
  const isTop = rank === 1;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isTop
          ? "border-agri-lime/50 bg-gradient-to-br from-agri-green/10 to-emerald-900/10 shadow-lg shadow-agri-green/10"
          : "border-gray-800 bg-gray-900/60"
      }`}
    >
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ background: "transparent", border: "none", width: "100%", textAlign: "left" }}
        className="p-5 flex items-center gap-4"
        id={`crop-card-${rank}`}
      >
        {/* Rank badge */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${
          isTop ? "bg-agri-lime text-gray-900" : "bg-gray-800 text-gray-400"
        }`}>
          {isTop ? "★" : rank}
        </div>

        {/* Emoji + Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{crop.emoji || "🌾"}</span>
            <h3 className="text-white font-bold text-base">{crop.name}</h3>
            {isTop && (
              <span className="text-xs bg-agri-lime/20 text-agri-lime border border-agri-lime/30 px-2 py-0.5 rounded-full font-semibold">
                Best Pick
              </span>
            )}
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {crop.category}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <span className="text-agri-lime font-semibold text-sm">
              {fmt(crop.projected_profit_min)} – {fmt(crop.projected_profit_max)} profit
            </span>
            <span className={`text-xs font-medium ${risk.text}`}>
              ● {crop.risk_level} Risk
            </span>
          </div>
        </div>

        {/* Suitability Score */}
        <div className="text-right flex-shrink-0">
          <div className={`text-2xl font-black ${isTop ? "text-agri-lime" : "text-gray-300"}`}>
            {crop.suitability_score}
          </div>
          <div className="text-gray-500 text-xs">/ 100</div>
        </div>

        {/* Chevron */}
        <div className="text-gray-500 flex-shrink-0">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Quick stats row (always visible) */}
      <div className="px-5 pb-4 grid grid-cols-4 gap-3">
        {/* Income */}
        <div className="bg-gray-800/60 rounded-xl p-3 text-center">
          <IndianRupee size={14} className="mx-auto text-agri-lime mb-1" />
          <div className="text-white font-bold text-sm">{fmt(crop.projected_revenue_min)}</div>
          <div className="text-gray-500 text-xs">Min Revenue</div>
        </div>
        {/* ROI */}
        <div className="bg-gray-800/60 rounded-xl p-3 text-center">
          <TrendingUp size={14} className="mx-auto text-blue-400 mb-1" />
          <div className="text-blue-400 font-bold text-sm">{crop.roi_percent}%</div>
          <div className="text-gray-500 text-xs">ROI</div>
        </div>
        {/* Water */}
        <div className="bg-gray-800/60 rounded-xl p-3 text-center">
          <Droplets size={14} className="mx-auto text-cyan-400 mb-1" />
          <div className="text-white font-bold text-xs">{crop.water_need}</div>
          <div className="text-gray-500 text-xs">Water Need</div>
        </div>
        {/* Demand */}
        <div className="bg-gray-800/60 rounded-xl p-3 text-center">
          <BarChart3 size={14} className={`mx-auto mb-1 ${DEMAND_COLOR[crop.market_demand] || "text-gray-400"}`} />
          <div className={`font-bold text-xs ${DEMAND_COLOR[crop.market_demand] || "text-gray-400"}`}>
            {crop.market_demand}
          </div>
          <div className="text-gray-500 text-xs">Demand</div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(34,197,94,0.15)", background: "rgba(6,13,8,0.75)", padding: "20px" }} className="space-y-5">
          {/* Financial Breakdown */}
          <div>
            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <IndianRupee size={12} /> Financial Projection
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Input Cost/Acre", val: `₹${crop.input_cost_per_acre?.toLocaleString()}`, color: "text-amber-400" },
                { label: "Total Input Cost", val: `₹${crop.total_input_cost?.toLocaleString()}`, color: "text-amber-400" },
                { label: "Expected Yield", val: `${crop.total_yield_kg?.toLocaleString()} kg`, color: "text-gray-300" },
                { label: "Price Range", val: `₹${crop.market_price_min}–₹${crop.market_price_max}/kg`, color: "text-gray-300" },
                { label: "Revenue (Min–Max)", val: `${fmt(crop.projected_revenue_min)} – ${fmt(crop.projected_revenue_max)}`, color: "text-agri-lime" },
                { label: "Profit (Min–Max)", val: `${fmt(crop.projected_profit_min)} – ${fmt(crop.projected_profit_max)}`, color: "text-agri-gold" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-800/40 rounded-xl p-3">
                  <div className="text-gray-500 text-xs mb-0.5">{item.label}</div>
                  <div className={`font-semibold text-sm ${item.color}`}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk & Water */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk */}
            <div className={`rounded-xl p-4 border ${risk.bg} ${risk.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className={risk.text} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${risk.text}`}>
                  Risk Assessment
                </span>
                <span className={`ml-auto text-xs font-bold ${risk.text}`}>
                  {crop.risk_score}/10
                </span>
              </div>
              <ScoreBar value={crop.risk_score} color={risk.dot.replace("bg-", "bg-")} />
              <ul className="mt-3 space-y-1">
                {(crop.risk_factors || []).map((f, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${risk.dot}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Water */}
            <div className="rounded-xl p-4 border border-cyan-500/30 bg-cyan-900/10">
              <div className="flex items-center gap-2 mb-3">
                <Droplets size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Water Requirement
                </span>
              </div>
              <div className="text-2xl mb-1">{WATER_ICON[crop.water_need] || "💧"}</div>
              <div className="text-white font-bold">{crop.water_need}</div>
              <div className="text-gray-500 text-xs mt-1">
                ~{crop.water_liters_per_acre_per_day?.toLocaleString()} L/acre/day
              </div>
              <div className="mt-2 text-xs text-cyan-300">
                Growing period: {crop.growing_days} days
              </div>
            </div>
          </div>

          {/* Market Demand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-gray-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Market Demand Score
              </span>
              <span className={`ml-auto font-bold text-sm ${DEMAND_COLOR[crop.market_demand]}`}>
                {crop.demand_score}/10 · {crop.market_demand}
              </span>
            </div>
            <ScoreBar value={crop.demand_score} color="bg-agri-lime" />
            {(crop.best_markets || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {crop.best_markets.map((m, i) => (
                  <span key={i} className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <MapPin size={10} /> {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Govt Support */}
          {crop.govt_support && (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3 flex items-start gap-2">
              <span className="text-lg flex-shrink-0">🏛️</span>
              <div>
                <div className="text-purple-300 text-xs font-semibold mb-0.5">Government Support Available</div>
                <div className="text-gray-400 text-xs">{crop.govt_support}</div>
              </div>
            </div>
          )}

          {/* Key Tips */}
          {(crop.key_tips || []).length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Zap size={12} /> Key Success Tips
              </div>
              <ul className="space-y-2">
                {crop.key_tips.map((tip, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-2 bg-gray-800/40 rounded-lg px-3 py-2">
                    <Star size={10} className="text-agri-gold mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Input Form ───────────────────────────────────────────────────────────────
function SimulatorForm({ onSubmit, loading, t }) {
  const [form, setForm] = useState({
    land_size_acres: 5,
    location: "Nashik, Maharashtra",
    budget_inr: 150000,
    soil_type: "Loamy",
    season: "Kharif",
  });

  const SOIL_TYPES = ["Loamy", "Sandy", "Clay", "Silty", "Black Cotton", "Red Laterite", "Alluvial", "Peaty"];
  const SEASONS    = ["Kharif (Jun–Oct)", "Rabi (Nov–Mar)", "Zaid (Mar–Jun)", "Year-Round"];

  const field = (label, key, type = "text", extra = {}) => (
    <div>
      <label className="text-gray-400 text-xs mb-1 block font-medium">{label}</label>
      <input
        type={type}
        value={form[key]}
        min={extra.min}
        max={extra.max}
        step={extra.step}
        onChange={(e) =>
          setForm({ ...form, [key]: type === "number" ? parseFloat(e.target.value) : e.target.value })
        }
        className="input-field text-sm"
        id={`sim-${key}`}
      />
    </div>
  );

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-agri-green/20 p-3 rounded-xl">
          <Sprout size={22} className="text-agri-lime" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base">{t("virtualFarmSim")}</h3>
          <p className="text-gray-400 text-xs">{t("farmSimDesc")}</p>
        </div>
        <span className="ml-auto text-xs bg-agri-green/20 text-agri-lime border border-agri-green/30 px-3 py-1 rounded-full font-semibold">
          Powered by Groq AI
        </span>
      </div>

      {/* Form grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {field(t("locationField"), "location")}
        {field(t("landSizeField"), "land_size_acres", "number", { min: 0.5, max: 1000, step: 0.5 })}
        {field(t("budgetField"), "budget_inr", "number", { min: 5000, step: 1000 })}
        <div>
          <label className="text-gray-400 text-xs mb-1 block font-medium">{t("soilTypeField")}</label>
          <select
            value={form.soil_type}
            onChange={(e) => setForm({ ...form, soil_type: e.target.value })}
            className="input-field text-sm"
            id="sim-soil_type"
          >
            {SOIL_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-gray-400 text-xs mb-1 block font-medium">{t("seasonField")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEASONS.map((s) => {
              const val = s.split(" ")[0];
              const active = form.season === val || form.season === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, season: val })}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    border: active ? "1px solid #22c55e" : "1px solid rgba(34,197,94,0.2)",
                    background: active ? "#22c55e" : "rgba(10,26,15,0.8)",
                    color: active ? "#fff" : "#9ca3af",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)"; e.currentTarget.style.color = "#f3f4f6"; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)"; e.currentTarget.style.color = "#9ca3af"; }}}
                  id={`sim-season-${val}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { icon: <Layers size={13} />, label: `${form.land_size_acres} acres` },
          { icon: <IndianRupee size={13} />, label: `₹${Number(form.budget_inr).toLocaleString()} budget` },
          { icon: <MapPin size={13} />, label: form.location },
          { icon: <Calendar size={13} />, label: form.season },
        ].map((item, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, background: "rgba(10,26,15,0.9)",
            border: "1px solid rgba(34,197,94,0.2)",
            padding: "6px 12px", borderRadius: 99,
            color: "#d1d5db",
          }}>
            <span style={{ color: "#4ade80" }}>{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>

      <button
        onClick={() => onSubmit(form)}
        disabled={loading || !form.location.trim()}
        id="run-farm-simulation"
        className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3"
      >
        {loading ? (
          <>
            <Loader size={18} className="animate-spin" />
            {t("simulating")}
          </>
        ) : (
          <>
            <Sprout size={18} />
            {t("runSimulation")}
          </>
        )}
      </button>
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────
function SimulationResults({ result }) {
  const { t } = useLanguage();
  const { farm_summary, crops } = result;

  return (
    <div className="space-y-5 fade-in">
      {/* Summary Banner */}
      <div className="rounded-2xl border border-agri-lime/30 bg-gradient-to-r from-agri-green/10 to-emerald-900/10 p-5">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🌾</span>
          <div className="flex-1">
            <h3 className="text-agri-lime font-bold text-base mb-1">
              Farm Simulation Complete — {farm_summary.location}
            </h3>
            <p className="text-gray-300 text-sm mb-3">{farm_summary.analysis_note}</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Land", val: `${farm_summary.land_acres} acres` },
                { label: "Budget", val: `₹${Number(farm_summary.budget_inr).toLocaleString()}` },
                { label: "Soil", val: farm_summary.soil_type },
                { label: "Season", val: farm_summary.season },
              ].map((item) => (
                <div key={item.label} className="text-xs">
                  <span className="text-gray-500">{item.label}: </span>
                  <span className="text-white font-semibold">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Crop Cards */}
      <div>
        <h4 className="text-gray-400 text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp size={14} />
          {t("aiRecommendedCrops")}
        </h4>
        <div className="space-y-3">
          {crops.map((crop) => (
            <CropCard key={crop.rank} crop={crop} rank={crop.rank} />
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-gray-600 text-xs text-center">
        ⚠️ Projections are AI estimates based on typical Indian market data (2024–25). Actual results depend on weather, market conditions, and farming practices. Always consult local agricultural experts.
      </p>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function FarmSimulator() {
  const { t } = useLanguage();
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState("");

  const handleSubmit = async (form) => {
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const r = await simulateFarm(form);
      if (!r.data.success) {
        setError(r.data.error || "Simulation failed. Please try again.");
      } else {
        setResult(r.data);
      }
    } catch (e) {
      setError("⚠️ Could not connect to backend. Make sure the server is running.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <SimulatorForm onSubmit={handleSubmit} loading={loading} t={t} />

      {error && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && <SimulationResults result={result} />}
    </div>
  );
}
