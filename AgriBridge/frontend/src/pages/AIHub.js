import React, { useState, useRef, useEffect } from "react";
import {
  getFertilizerAdvice, getCropDiagnosis, chatWithBot,
  getSoilHealthAnalysis, getYieldPrediction, getKeyStatus
} from "../api";
import {
  Send, Upload, Leaf, Microscope, MessageCircle, Loader,
  FlaskConical, MapPin, Sprout, TrendingUp, BarChart2, Key, RefreshCw
} from "lucide-react";
import FarmSimulator from "./FarmSimulator";
import AILoader from "../components/AILoader";
import { useLanguage } from "../context/LanguageContext";

// ─── Key Status Banner ────────────────────────────────────────────────────
function KeyStatusBar() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const r = await getKeyStatus();
      setStatus(r.data);
      setLastRefresh(new Date());
    } catch { /* silent fail */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const allActive = status.active_keys === status.total_keys;
  const anyRateLimited = status.active_keys < status.total_keys;

  return (
    <div className={`rounded-2xl border px-4 py-3 mb-5 flex items-center gap-3 flex-wrap ${
      anyRateLimited
        ? "bg-yellow-900/20 border-yellow-700/40"
        : "bg-green-900/15 border-green-800/30"
    }`}>
      <div className="flex items-center gap-2 shrink-0">
        <Key size={14} className={anyRateLimited ? "text-yellow-400" : "text-green-400"} />
        <span className="text-xs font-semibold" style={{ color: anyRateLimited ? "#facc15" : "#4ade80" }}>
          Groq API Keys
        </span>
      </div>

      <div className="flex gap-2 flex-wrap flex-1">
        {status.keys.map(k => (
          <div key={k.key_num} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            k.status === "active"
              ? "bg-green-900/30 border-green-700/40 text-green-300"
              : "bg-red-900/30 border-red-700/40 text-red-300"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              k.status === "active" ? "bg-green-400" : "bg-red-400 animate-pulse"
            }`} />
            Key {k.key_num} <span className="text-gray-500">{k.key_hint}</span>
            {k.status === "active"
              ? <span className="text-green-500 ml-1">✓ Active · {k.total_requests} req</span>
              : <span className="text-red-400 ml-1">⏳ Cooldown {k.cooldown_remaining_secs}s</span>
            }
          </div>
        ))}

      </div>

      <button onClick={fetchStatus} disabled={loading}
        className="shrink-0 text-gray-500 hover:text-white transition-all">
        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
      </button>

      {lastRefresh && (
        <span className="text-gray-600 text-xs shrink-0">
          {lastRefresh.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

function MarkdownText({ text }) {
  if (!text) return null;

  const renderInline = (str) => {
    // Handle inline **bold**
    const parts = str.split(/\*\*(.*?)\*\*/);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
    );
  };

  return (
    <div className="text-gray-300 text-sm leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <p key={i} className="font-bold text-green-400 text-sm mt-4 mb-1.5 border-b border-green-900/40 pb-1">{line.replace('## ', '')}</p>;
        if (line.startsWith('# '))
          return <p key={i} className="font-bold text-white text-base mt-4 mb-1">{line.replace('# ', '')}</p>;
        if (line.startsWith('### '))
          return <p key={i} className="font-semibold text-blue-300 text-sm mt-3 mb-1">{line.replace('### ', '')}</p>;
        if (line.startsWith('**') && line.endsWith('**'))
          return <p key={i} className="font-bold text-yellow-400 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
        if (line.match(/^\d+\./)) {
          const [num, ...rest] = line.split('.');
          return <p key={i} className="ml-3 text-gray-300 my-0.5 flex gap-2"><span className="text-green-400 font-bold shrink-0">{num}.</span><span>{renderInline(rest.join('.').trim())}</span></p>;
        }
        if (line.startsWith('- ') || line.startsWith('* '))
          return <p key={i} className="ml-3 text-gray-300 my-0.5 flex gap-1.5"><span className="text-green-500 shrink-0">•</span><span>{renderInline(line.substring(2))}</span></p>;
        if (line === '') return <div key={i} className="my-1.5" />;
        return <p key={i} className="my-0.5">{renderInline(line)}</p>;
      })}
    </div>
  );
}

// ─── Fertilizer Advisor ───────────────────────────────────────────────────────
function FertilizerAdvisor({ currentUser }) {
  const [form, setForm] = useState({
    farmer_id: currentUser.id,
    crop: "Tomato", soil_type: "Loamy",
    ph: 6.5, nitrogen: 80, phosphorus: 40, potassium: 60, area_acres: 2,
  });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setResult("");
    try { const r = await getFertilizerAdvice(form); setResult(r.data.advice); }
    catch { setResult("⚠️ Error: Could not get advice. Please check your GROQ_API_KEY in backend/.env"); }
    setLoading(false);
  };

  const field = (label, key, type = "text", step) => (
    <div>
      <label className="text-gray-400 text-xs mb-1 block">{label}</label>
      <input type={type} step={step} value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: type === "number" ? parseFloat(e.target.value) : e.target.value })}
        className="input-field text-sm" />
    </div>
  );

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div className="bg-agri-green/20 p-2 rounded-lg"><Leaf size={20} className="text-agri-lime" /></div>
        <div>
          <h3 className="text-white font-semibold">AI Fertilizer Advisor</h3>
          <p className="text-gray-400 text-xs">🔬 Powered by <span className="text-purple-400 font-medium">DeepSeek</span> (Groq fallback) — Enter your soil data for a personalised schedule</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {field("Crop Name", "crop")}
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Soil Type</label>
          <select value={form.soil_type} onChange={(e) => setForm({...form, soil_type: e.target.value})} className="input-field text-sm">
            {["Loamy","Sandy","Clay","Silty","Peaty","Chalky","Black Cotton"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        {field("Soil pH (0-14)", "ph", "number", "0.1")}
        {field("Nitrogen N (kg/ha)", "nitrogen", "number")}
        {field("Phosphorus P (kg/ha)", "phosphorus", "number")}
        {field("Potassium K (kg/ha)", "potassium", "number")}
        {field("Farm Area (acres)", "area_acres", "number", "0.5")}
      </div>
      <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
        {loading ? <><Loader size={16} className="animate-spin" /> Analyzing Soil Data...</> : "🌱 Get AI Fertilizer Schedule"}
      </button>
      {/* Premium AI Loader while analyzing */}
      {loading && (
        <AILoader message="ANALYZING SOIL DATA" subtitle="PREPARING YOUR PERSONALIZED FERTILIZER SCHEDULE" />
      )}
      {result && (
        <div className="bg-agri-dark border border-agri-green/30 rounded-xl p-4 max-h-96 overflow-y-auto">
          <p className="text-agri-lime text-xs font-semibold mb-3">✨ AI Agronomist Recommendation</p>
          <MarkdownText text={result} />
        </div>
      )}
    </div>
  );
}

// ─── Season-wise Yield Predictor ──────────────────────────────────────────────

const CROPS = {
  Vegetable: ["Tomato","Onion","Potato","Cabbage","Cauliflower","Brinjal","Okra","Bitter Gourd","Bottle Gourd","Pumpkin","Carrot","Sweet Corn","Chilli","Capsicum","Cucumber","Spinach","Fenugreek"],
  Fruit:     ["Alphonso Mango","Banana","Pomegranate","Papaya","Watermelon","Grapes","Guava","Pineapple","Muskmelon","Lemon","Coconut","Sapota (Chikoo)","Amla","Dragon Fruit","Strawberry"],
};
const SEASONS = {
  Kharif: { label: "Kharif (Jun–Oct)", color: "#22c55e", emoji: "🌧️", months: "June to October" },
  Rabi:   { label: "Rabi (Nov–Mar)",   color: "#60a5fa", emoji: "❄️", months: "November to March" },
  Zaid:   { label: "Zaid (Apr–Jun)",   color: "#fb923c", emoji: "☀️", months: "April to June" },
};

function MiniBarChart({ data, maxVal }) {
  if (!data || data.length === 0) return null;
  const max = maxVal || Math.max(...data.map(d => d.yield_kg || d.growth || 0), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map((d, i) => {
        const val = d.yield_kg || d.growth || 0;
        const h = Math.max((val / max) * 100, 2);
        const isHarvest = d.yield_contribution_percent > 20;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.label || d.month_short}: ${val}${d.yield_kg !== undefined ? ' kg' : '%'}`}>
            <div
              className="w-full rounded-t transition-all duration-700"
              style={{
                height: `${h}%`,
                background: isHarvest
                  ? "linear-gradient(180deg, #22c55e, #16a34a)"
                  : "linear-gradient(180deg, #3b82f6, #2563eb)",
                minHeight: "2px"
              }}
            />
            <span className="text-gray-600 text-xs leading-none" style={{fontSize:"9px"}}>
              {d.month_short || d.label || ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub, color = "#22c55e", icon }) {
  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4">
      <p className="text-gray-500 text-xs mb-1">{icon} {label}</p>
      <p className="font-bold text-xl" style={{ color }}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function YieldPredictor() {
  const [cropType, setCropType]     = useState("Vegetable");
  const [cropName, setCropName]     = useState("Tomato");
  const [season, setSeason]         = useState("Kharif");
  const [location, setLocation]     = useState("Pune, Maharashtra");
  const [landSize, setLandSize]     = useState(2);
  const [soilType, setSoilType]     = useState("Loamy");
  const [irrigation, setIrrigation] = useState("Drip");
  const [variety, setVariety]       = useState("");
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [activeMonth, setActiveMonth] = useState(null);

  const handleCropTypeChange = (ct) => {
    setCropType(ct);
    setCropName(CROPS[ct][0]);
  };

  const handlePredict = async () => {
    if (!cropName || !location) { setError("Please fill in crop name and location."); return; }
    setLoading(true); setResult(null); setError(""); setActiveMonth(null);
    try {
      const r = await getYieldPrediction({
        crop_type: cropType, crop_name: cropName, season,
        location, land_size_acres: landSize,
        soil_type: soilType, irrigation, variety,
      });
      if (r.data.success) {
        setResult(r.data);
      } else {
        setError(r.data.error || "Prediction failed. Please try again.");
      }
    } catch (e) {
      setError("⚠️ Error connecting to AI. Check your GROQ_API_KEY in backend/.env");
    }
    setLoading(false);
  };

  const fmt = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n}`;
  const fmtKg = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}T` : `${n} kg`;
  const probColor = (s) => s === "High" || s === "Severe" ? "#ef4444" : s === "Medium" || s === "Moderate" ? "#f59e0b" : "#22c55e";
  const demandColor = (d) => d === "Very High" ? "#10b981" : d === "High" ? "#22c55e" : d === "Moderate" ? "#f59e0b" : "#ef4444";

  const s = result?.prediction_summary;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl" style={{ background: "rgba(59,130,246,0.15)" }}>
          <TrendingUp size={22} className="text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">🌾 Season-wise AI Yield Predictor</h3>
          <p className="text-gray-400 text-xs">🌐 Powered by <span className="text-orange-400 font-medium">OpenRouter</span> (Groq fallback) — Month-by-month yield forecasts for Vegetables &amp; Fruits</p>
        </div>
      </div>

      {/* Season Banner */}
      <div className="flex gap-2 mb-5">
        {Object.entries(SEASONS).map(([key, val]) => (
          <button key={key} onClick={() => setSeason(key)}
            className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              season === key ? "text-white shadow-lg" : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}
            style={season === key ? { background: val.color, borderColor: val.color } : {}}>
            <span>{val.emoji}</span>
            <span className="hidden md:inline">{key}</span>
            <span className="md:hidden">{key}</span>
          </button>
        ))}
      </div>

      {/* Crop Type Toggle */}
      <div className="flex gap-2 mb-5">
        {["Vegetable", "Fruit"].map(ct => (
          <button key={ct} onClick={() => handleCropTypeChange(ct)}
            className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
              cropType === ct
                ? ct === "Vegetable" ? "bg-green-600 border-green-500 text-white" : "bg-orange-500 border-orange-400 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}>
            {ct === "Vegetable" ? "🥦 Vegetables" : "🍎 Fruits"}
          </button>
        ))}
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div className="col-span-2 md:col-span-1">
          <label className="text-gray-400 text-xs mb-1 block">🌾 Crop Name</label>
          <select value={cropName} onChange={e => setCropName(e.target.value)} className="input-field text-sm">
            {CROPS[cropType].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 flex items-center gap-1 block"><MapPin size={10}/> Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Nashik, Maharashtra" className="input-field text-sm" />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">📐 Land Size (acres)</label>
          <input type="number" min={0.5} step={0.5} value={landSize} onChange={e => setLandSize(parseFloat(e.target.value))} className="input-field text-sm" />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">🧱 Soil Type</label>
          <select value={soilType} onChange={e => setSoilType(e.target.value)} className="input-field text-sm">
            {["Loamy","Sandy","Clay","Silty","Black Cotton","Red Laterite","Alluvial"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">💧 Irrigation</label>
          <select value={irrigation} onChange={e => setIrrigation(e.target.value)} className="input-field text-sm">
            {["Drip","Sprinkler","Canal","Borewell","Rainfed","Flood"].map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">🌿 Variety (optional)</label>
          <input value={variety} onChange={e => setVariety(e.target.value)} placeholder="e.g. Hybrid F1, Desi" className="input-field text-sm" />
        </div>
      </div>

      {error && <div className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm rounded-xl p-3 mb-4">{error}</div>}

      <button onClick={handlePredict} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mb-6"
        style={{ background: loading ? undefined : "linear-gradient(135deg, #1d4ed8, #2563eb)" }}>
        {loading ? (
          <><Loader size={16} className="animate-spin" /> Generating Yield Prediction… <span className="text-xs opacity-70">(15-25s)</span></>
        ) : (
          <><BarChart2 size={16} /> Predict Season Yield with AI</>
        )}
      </button>

      {/* Premium AI Loader while predicting */}
      {loading && (
        <AILoader message="PREDICTING YIELD" subtitle="CALCULATING MONTH-BY-MONTH SEASONAL FORECAST" />
      )}

      {/* ─── Results ─── */}
      {result && s && (
        <div className="space-y-5 fade-in">

          {/* Season badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
              style={{ background: SEASONS[season]?.color || "#22c55e" }}>
              {SEASONS[season]?.emoji} {season} Season — {s.sowing_month} to {s.harvest_month}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border"
              style={{ color: s.rating_color, borderColor: s.rating_color, background: `${s.rating_color}18` }}>
              ⭐ {s.overall_rating} Outlook
            </div>
            <span className="text-gray-500 text-xs">{s.growing_period_days} days growing period · AI Confidence: {s.overall_confidence}%</span>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Yield" value={fmtKg(s.total_yield_kg)} sub={`${fmtKg(s.yield_per_acre_kg)}/acre`} color="#22c55e" icon="📦" />
            <StatCard label="Revenue (min)" value={fmt(s.total_revenue_min_inr)} sub={`Max: ${fmt(s.total_revenue_max_inr)}`} color="#60a5fa" icon="💰" />
            <StatCard label="Net Profit" value={fmt(s.net_profit_min_inr)} sub={`Max: ${fmt(s.net_profit_max_inr)}`} color="#a78bfa" icon="📈" />
            <StatCard label="ROI" value={`${s.roi_percent}%`} sub="Return on investment" color={s.roi_percent >= 100 ? "#10b981" : "#f59e0b"} icon="🎯" />
          </div>

          {/* Growth Chart */}
          {result.yield_chart_data?.length > 0 && (
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
              <h4 className="text-white font-semibold mb-1 flex items-center gap-2"><BarChart2 size={16} className="text-blue-400"/> Monthly Growth & Yield Chart</h4>
              <p className="text-gray-500 text-xs mb-4">🟢 Green = harvest months  🔵 Blue = growth/preparation stages</p>
              <MiniBarChart data={result.yield_chart_data} />
              <div className="flex justify-between mt-2">
                <span className="text-gray-600 text-xs">{result.yield_chart_data[0]?.label}</span>
                <span className="text-gray-600 text-xs">{result.yield_chart_data[result.yield_chart_data.length-1]?.label}</span>
              </div>
            </div>
          )}

          {/* Monthly Timeline */}
          {result.monthly_forecast?.length > 0 && (
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
              <h4 className="text-white font-semibold mb-4">📅 Month-by-Month Farming Timeline</h4>
              <div className="space-y-2">
                {result.monthly_forecast.map((m, i) => (
                  <div key={i}>
                    <button
                      className={`w-full text-left rounded-xl p-3 border transition-all ${
                        activeMonth === i
                          ? "border-blue-600/60 bg-blue-900/20"
                          : "border-gray-800 bg-gray-800/40 hover:border-gray-700"
                      }`}
                      onClick={() => setActiveMonth(activeMonth === i ? null : i)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: "rgba(59,130,246,0.1)" }}>
                          {m.stage_emoji || "🌱"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium text-sm">{m.month}</span>
                            <span className="text-gray-500 text-xs">{m.week}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                              m.weather_risk === "High" ? "bg-red-900/30 text-red-400" :
                              m.weather_risk === "Medium" ? "bg-yellow-900/30 text-yellow-400" :
                              "bg-green-900/30 text-green-400"
                            }`}>{m.weather_risk} risk</span>
                          </div>
                          <p className="text-gray-400 text-xs truncate">{m.stage}</p>
                        </div>
                        {m.yield_contribution_percent > 0 && (
                          <div className="text-right shrink-0">
                            <span className="text-green-400 text-xs font-bold">+{m.yield_contribution_percent}% yield</span>
                          </div>
                        )}
                      </div>
                      {/* Growth bar */}
                      <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${m.expected_growth_percent}%`, background: SEASONS[season]?.color || "#22c55e" }} />
                      </div>
                    </button>
                    {activeMonth === i && (
                      <div className="mt-1 ml-4 bg-gray-900/60 border border-gray-800 rounded-xl p-4 fade-in">
                        <p className="text-gray-300 text-sm mb-2">{m.notes}</p>
                        <p className="text-gray-500 text-xs mb-2">💸 Estimated cost this month: <span className="text-white font-medium">₹{(m.estimated_cost_inr||0).toLocaleString()}</span></p>
                        {m.activities?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.activities.map((act, j) => (
                              <span key={j} className="text-xs bg-blue-900/30 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-full">{act}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {result.risk_factors?.length > 0 && (
            <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-5">
              <h4 className="text-red-400 font-semibold mb-4">⚠️ Season Risk Analysis</h4>
              <div className="space-y-3">
                {result.risk_factors.map((r, i) => (
                  <div key={i} className="bg-gray-900/60 rounded-xl p-3">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-lg">{r.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">{r.risk}</span>
                          <span className="text-xs font-bold" style={{ color: probColor(r.probability) }}>{r.probability} ({r.probability_score}%)</span>
                        </div>
                        <p className="text-red-300 text-xs mt-0.5">{r.impact}</p>
                        <div className="w-full bg-gray-800 rounded-full h-1 mt-1.5">
                          <div className="h-1 rounded-full" style={{ width: `${r.probability_score}%`, background: probColor(r.probability) }} />
                        </div>
                        <p className="text-gray-400 text-xs mt-1.5">💡 {r.mitigation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Costs + Price Forecast */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.input_costs && (
              <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
                <h4 className="text-white font-semibold mb-4">💸 Input Cost Breakdown</h4>
                {[
                  ["Seeds/Seedlings", result.input_costs.seeds_seedlings_inr],
                  ["Fertilizers", result.input_costs.fertilizers_inr],
                  ["Pesticides", result.input_costs.pesticides_inr],
                  ["Irrigation", result.input_costs.irrigation_inr],
                  ["Labour", result.input_costs.labour_inr],
                  ["Miscellaneous", result.input_costs.miscellaneous_inr],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-800 last:border-0">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className="text-white text-sm font-medium">₹{(val||0).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 mt-1">
                  <span className="text-agri-lime font-bold text-sm">Total Investment</span>
                  <span className="text-agri-lime font-bold">₹{(result.input_costs.total_input_cost_inr||0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {result.price_forecast && (
              <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
                <h4 className="text-white font-semibold mb-4">📊 Market Price Forecast</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Harvest Season Price</span>
                    <span className="text-white font-medium">₹{result.price_forecast.harvest_season_price_min}–{result.price_forecast.harvest_season_price_max}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Peak Price Month</span>
                    <span className="text-yellow-400 font-medium">{result.price_forecast.peak_price_month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Price Trend</span>
                    <span className={`font-medium ${result.price_forecast.price_trend === "Rising" ? "text-green-400" : result.price_forecast.price_trend === "Falling" ? "text-red-400" : "text-yellow-400"}`}>
                      {result.price_forecast.price_trend === "Rising" ? "📈" : result.price_forecast.price_trend === "Falling" ? "📉" : "➡️"} {result.price_forecast.price_trend}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Export Potential</span>
                    <span className="font-medium" style={{ color: demandColor(result.price_forecast.export_potential) }}>{result.price_forecast.export_potential}</span>
                  </div>
                  {result.price_forecast.best_markets?.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Best Markets:</p>
                      <div className="flex flex-wrap gap-1">
                        {result.price_forecast.best_markets.map((m, i) => (
                          <span key={i} className="text-xs bg-blue-900/30 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-full">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-2 bg-green-900/20 border border-green-800/30 rounded-xl p-2.5">
                    <p className="text-green-300 text-xs">💡 {result.price_forecast.market_advisory}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Variety Comparison */}
          {result.variety_comparison?.length > 0 && (
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
              <h4 className="text-white font-semibold mb-4">🌿 Recommended Varieties</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.variety_comparison.map((v, i) => (
                  <div key={i} className={`rounded-xl p-4 border ${v.recommended ? "border-agri-green/50 bg-agri-green/10" : "border-gray-800 bg-gray-800/40"}`}>
                    {v.recommended && <span className="text-agri-lime text-xs font-bold">⭐ RECOMMENDED</span>}
                    <p className="text-white font-semibold mt-1">{v.variety}</p>
                    <div className="space-y-1 mt-2">
                      <p className="text-gray-400 text-xs">Yield: <span className="text-white">{(v.yield_potential_kg_per_acre||0).toLocaleString()} kg/acre</span></p>
                      <p className="text-gray-400 text-xs">Maturity: <span className="text-white">{v.maturity_days} days</span></p>
                      <p className="text-gray-400 text-xs">Disease Resistance: <span style={{ color: v.disease_resistance === "High" ? "#22c55e" : v.disease_resistance === "Medium" ? "#f59e0b" : "#ef4444" }}>{v.disease_resistance}</span></p>
                      <p className="text-gray-400 text-xs">Market Demand: <span style={{ color: demandColor(v.market_demand) }}>{v.market_demand}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* vs State/National Average */}
          {result.comparison_to_average && (
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
              <h4 className="text-white font-semibold mb-3">📊 Benchmark Comparison</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">vs State Average</p>
                  <p className="text-2xl font-bold text-green-400">{result.comparison_to_average.your_predicted_vs_state}</p>
                  <p className="text-gray-600 text-xs">{(result.comparison_to_average.state_average_yield_kg_per_acre||0).toLocaleString()} kg/acre state avg</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-1">vs National Average</p>
                  <p className="text-2xl font-bold text-blue-400">{result.comparison_to_average.your_predicted_vs_national}</p>
                  <p className="text-gray-600 text-xs">{(result.comparison_to_average.national_average_yield_kg_per_acre||0).toLocaleString()} kg/acre national avg</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-3 text-center">{result.comparison_to_average.benchmark_note}</p>
            </div>
          )}

          {/* Critical Success + Govt Schemes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.critical_success_factors?.length > 0 && (
              <div className="bg-yellow-900/10 border border-yellow-900/30 rounded-2xl p-4">
                <h4 className="text-yellow-400 font-semibold mb-3 text-sm">🔑 Critical Success Factors</h4>
                {result.critical_success_factors.map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <span className="text-yellow-500 shrink-0">→</span>
                    <p className="text-gray-300 text-sm">{f}</p>
                  </div>
                ))}
              </div>
            )}
            {result.govt_support?.length > 0 && (
              <div className="bg-amber-900/10 border border-amber-900/30 rounded-2xl p-4">
                <h4 className="text-amber-400 font-semibold mb-3 text-sm">🏛️ Government Support</h4>
                {result.govt_support.map((g, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <span className="text-amber-500 shrink-0">📋</span>
                    <p className="text-gray-300 text-sm">{g}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Advisory */}
          {result.ai_advisory && (
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/40 rounded-2xl p-4">
              <p className="text-blue-400 font-semibold text-sm mb-2">🤖 AI Expert Advisory</p>
              <p className="text-gray-300 text-sm leading-relaxed">{result.ai_advisory}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Soil Health Analyzer ─────────────────────────────────────────────────────
function NutrientBar({ label, level, score, recommendation }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const levelColor = score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-300 text-xs font-medium">{label}</span>
        <span className={`text-xs font-bold ${levelColor}`}>{level} ({score}/100)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <p className="text-gray-500 text-xs">{recommendation}</p>
    </div>
  );
}

function ScoreRing({ score, color, label }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={radius} fill="none" stroke="#0a1a0f" strokeWidth="10" />
          <circle cx="55" cy="55" r={radius} fill="none" stroke={color || "#22c55e"} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white text-2xl font-bold">{score}</span>
          <span className="text-gray-400 text-xs">/100</span>
        </div>
      </div>
      <span className="text-gray-300 text-sm font-semibold mt-2">{label}</span>
    </div>
  );
}

function SoilHealthAnalyzer() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [location, setLocation] = useState("");
  const [cropIntent, setCropIntent] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) { setImage(file); setPreview(URL.createObjectURL(file)); setResult(null); setError(""); }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) { setImage(file); setPreview(URL.createObjectURL(file)); setResult(null); setError(""); }
  };

  const handleAnalyze = async () => {
    if (!image) { setError("Please upload a soil photo first!"); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("location", location);
      formData.append("crop_intent", cropIntent);
      const r = await getSoilHealthAnalysis(formData);
      if (r.data.success) setResult(r.data);
      else if (r.data.raw_analysis) { setError("AI returned unstructured response."); setResult({ raw: r.data.raw_analysis }); }
      else setError(r.data.error || "Analysis failed.");
    } catch { setError("⚠️ Error connecting to AI. Check your GROQ_API_KEY in backend/.env"); }
    setLoading(false);
  };

  const suitabilityColor = (s) =>
    s === "High" ? "text-green-400 bg-green-900/30 border-green-800" :
    s === "Medium" ? "text-yellow-400 bg-yellow-900/30 border-yellow-800" :
    "text-red-400 bg-red-900/30 border-red-800";
  const severityColor = (s) => s === "High" || s === "Severe" ? "text-red-400" : s === "Moderate" ? "text-yellow-400" : "text-blue-400";

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-amber-900/30 p-2.5 rounded-xl"><FlaskConical size={22} className="text-amber-400" /></div>
        <div>
          <h3 className="text-white font-semibold text-lg">AI Soil Health Analyzer</h3>
          <p className="text-gray-400 text-xs">⚡ Powered by <span className="text-green-400 font-medium">Groq Vision</span> — Upload a soil photo for instant AI health report</p>
        </div>
      </div>

      <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current.click()}
        className="border-2 border-dashed border-amber-700/40 hover:border-amber-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all mb-4 group relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(120,53,15,0.08) 0%, rgba(0,0,0,0) 100%)" }}>
        {preview ? (
          <div className="relative">
            <img src={preview} alt="soil" className="max-h-52 mx-auto rounded-xl object-contain shadow-lg" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl">
              <p className="text-white text-sm font-medium">Click to change photo</p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-16 h-16 bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Upload size={28} className="text-amber-500" />
            </div>
            <p className="text-white font-medium mb-1">Drop your soil photo here</p>
            <p className="text-gray-500 text-sm">or click to browse</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-gray-400 text-xs mb-1 flex items-center gap-1 block"><MapPin size={11}/> Location (optional)</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Nashik, Maharashtra" className="input-field text-sm" />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 flex items-center gap-1 block"><Sprout size={11}/> Intended Crop (optional)</label>
          <input value={cropIntent} onChange={e => setCropIntent(e.target.value)} placeholder="e.g. Tomato, Wheat" className="input-field text-sm" />
        </div>
      </div>

      {error && <div className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm rounded-xl p-3 mb-4">{error}</div>}

      <button onClick={handleAnalyze} disabled={loading || !image} className="btn-primary w-full flex items-center justify-center gap-2 mb-6"
        style={{ background: loading || !image ? undefined : "linear-gradient(135deg, #78350f, #d97706)" }}>
        {loading ? <><Loader size={16} className="animate-spin"/> Analyzing Soil Health…</> : "🔬 Analyze Soil Health with AI"}
      </button>
      {/* Premium AI Loader while analyzing soil */}
      {loading && (
        <AILoader message="ANALYZING SOIL HEALTH" subtitle="SCANNING SOIL COMPOSITION & NUTRIENT LEVELS WITH AI VISION" />
      )}

      {result && !result.raw && (
        <div className="space-y-5 fade-in">
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <ScoreRing score={result.overall_health_score} color={result.health_color} label={result.overall_health_label} />
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  {[["🎨 Soil Color", result.soil_color_observed],["🧱 Texture", result.texture_estimate],["💧 Moisture", result.moisture_level],["🌿 Organic Matter", result.organic_matter],["⚗️ Est. pH", result.estimated_ph_range],["🏗️ Structure", result.structure_quality]].map(([l,v]) => (
                    <div key={l} className="bg-gray-800/60 rounded-xl px-3 py-2">
                      <p className="text-gray-500 text-xs">{l}</p>
                      <p className="text-white text-sm font-semibold">{v || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {result.nutrient_estimates && (
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
              <h4 className="text-white font-semibold mb-4">🧪 Estimated Nutrient Levels</h4>
              <NutrientBar label="Nitrogen (N)" {...result.nutrient_estimates.nitrogen} />
              <NutrientBar label="Phosphorus (P)" {...result.nutrient_estimates.phosphorus} />
              <NutrientBar label="Potassium (K)" {...result.nutrient_estimates.potassium} />
              <NutrientBar label="Organic Carbon" {...result.nutrient_estimates.organic_carbon} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.detected_issues?.length > 0 && (
              <div className="bg-red-900/10 border border-red-900/30 rounded-2xl p-4">
                <h4 className="text-red-400 font-semibold mb-3 text-sm">⚠️ Detected Issues</h4>
                {result.detected_issues.map((issue, i) => (
                  <div key={i} className="bg-gray-900/60 rounded-xl p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{issue.icon}</span>
                      <span className="text-white text-sm font-medium">{issue.issue}</span>
                      <span className={`text-xs ml-auto font-semibold ${severityColor(issue.severity)}`}>{issue.severity}</span>
                    </div>
                    <p className="text-gray-400 text-xs">{issue.description}</p>
                  </div>
                ))}
              </div>
            )}
            {result.positive_indicators?.length > 0 && (
              <div className="bg-green-900/10 border border-green-900/30 rounded-2xl p-4">
                <h4 className="text-green-400 font-semibold mb-3 text-sm">✅ Positive Indicators</h4>
                {result.positive_indicators.map((pos, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-900/60 rounded-xl p-3 mb-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <p className="text-gray-300 text-sm">{pos}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {result.suitable_crops?.length > 0 && (
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
              <h4 className="text-white font-semibold mb-4">🌱 Crop Suitability for This Soil</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {result.suitable_crops.map((crop, i) => (
                  <div key={i} className={`border rounded-xl p-3 ${suitabilityColor(crop.suitability)}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{crop.emoji}</span>
                      <span className="font-semibold text-sm">{crop.crop}</span>
                    </div>
                    <span className="text-xs font-bold">{crop.suitability} Suitability</span>
                    <p className="text-gray-400 text-xs mt-1">{crop.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-white shrink-0">{result.analysis_confidence}%</div>
            <div>
              <p className="text-gray-300 text-xs font-semibold mb-0.5">AI Confidence Score</p>
              <p className="text-gray-500 text-xs">{result.disclaimer}</p>
            </div>
          </div>
        </div>
      )}
      {result?.raw && (
        <div className="bg-gray-900 border border-amber-800/30 rounded-xl p-4 max-h-96 overflow-y-auto">
          <p className="text-amber-400 text-xs font-semibold mb-3">🔬 AI Soil Analysis</p>
          <MarkdownText text={result.raw} />
        </div>
      )}
    </div>
  );
}

// ─── Crop Doctor ──────────────────────────────────────────────────────────────
function CropDoctor() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [cropName, setCropName] = useState("Tomato");
  const [symptoms, setSymptoms] = useState("Yellow spots on leaves, wilting");
  const [diagnosis, setDiagnosis] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) { setImage(file); setPreview(URL.createObjectURL(file)); }
  };
  const handleDiagnose = async () => {
    if (!image) { alert("Please upload an image first!"); return; }
    setLoading(true); setDiagnosis("");
    try {
      const formData = new FormData();
      formData.append("image", image); formData.append("crop_name", cropName); formData.append("symptoms", symptoms);
      const r = await getCropDiagnosis(formData);
      setDiagnosis(r.data.diagnosis);
    } catch { setDiagnosis("⚠️ Error connecting to AI. Check your GROQ_API_KEY in backend/.env"); }
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div className="bg-red-900/30 p-2 rounded-lg"><Microscope size={20} className="text-red-400" /></div>
        <div>
          <h3 className="text-white font-semibold">AI Crop Disease Doctor</h3>
          <p className="text-gray-400 text-xs">✨ Powered by <span className="text-blue-400 font-medium">Gemini Vision</span> (Groq Vision fallback) — Upload a photo for instant disease diagnosis</p>
        </div>
      </div>
      <div className="mb-4">
        <div onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-gray-700 hover:border-agri-green/50 rounded-xl p-6 text-center cursor-pointer transition-all">
          {preview ? <img src={preview} alt="crop" className="max-h-40 mx-auto rounded-lg object-contain" /> : (
            <div><Upload size={32} className="mx-auto mb-2 text-gray-500" />
              <p className="text-gray-400 text-sm">Click to upload crop image</p>
              <p className="text-gray-600 text-xs">(JPG, PNG, max 5MB)</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Crop Name</label>
          <input value={cropName} onChange={e => setCropName(e.target.value)} className="input-field text-sm" />
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1 block">Observed Symptoms</label>
          <input value={symptoms} onChange={e => setSymptoms(e.target.value)} className="input-field text-sm" />
        </div>
      </div>
      <button onClick={handleDiagnose} disabled={loading || !image} className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
        {loading ? <><Loader size={16} className="animate-spin" /> Diagnosing...</> : "🔬 Diagnose My Crop"}
      </button>
      {diagnosis && (
        <div className="bg-gray-900 border border-red-900/40 rounded-2xl overflow-hidden">
          {/* Report Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-red-900/30"
            style={{ background: "linear-gradient(135deg, rgba(127,29,29,0.3), rgba(30,10,10,0.5))" }}>
            <div className="w-8 h-8 rounded-full bg-red-900/50 flex items-center justify-center shrink-0">
              <Microscope size={14} className="text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-red-400 text-xs font-bold">🩺 AI Disease Diagnosis Report</p>
              <p className="text-gray-500 text-xs">Powered by Gemini Vision · {cropName}</p>
            </div>
            <span className="text-xs bg-red-900/30 border border-red-800/50 text-red-300 px-2 py-0.5 rounded-full">AI Analysis</span>
          </div>
          {/* Report Body */}
          <div className="p-4 max-h-[600px] overflow-y-auto">
            <MarkdownText text={diagnosis} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────
function FarmingChatbot() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🌾 Hello! I'm AgriBridge AI, your 24/7 farming assistant. Ask me about crop prices, weather, govt schemes, fertilizers, or anything agriculture-related!" }
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
      const r = await chatWithBot(userMsg, messages.slice(-6));
      setMessages(prev => [...prev, { role: "assistant", content: r.data.response }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Error: Check your GROQ_API_KEY in backend/.env" }]); }
    setLoading(false);
  };

  const QUICK = ["Best fertilizer for wheat?","Current MSP for rice?","How to treat aphids organically?","PM Kisan scheme details?"];

  return (
    <div className="card flex flex-col h-[500px]">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-800">
        <div className="bg-blue-900/30 p-2 rounded-lg"><MessageCircle size={20} className="text-blue-400" /></div>
        <div>
          <h3 className="text-white font-semibold">AgriBridge AI Assistant</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-agri-lime rounded-full pulse-green"></div>
            <p className="text-gray-400 text-xs">Online 24/7</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-agri-green text-white rounded-br-sm" : "bg-gray-800 text-gray-300 rounded-bl-sm"}`}>
              {msg.role === "assistant" ? <MarkdownText text={msg.content} /> : msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-gray-800 rounded-2xl px-4 py-3"><div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-agri-lime rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}></div>)}</div></div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 flex-wrap my-3">
        {QUICK.map(q => <button key={q} onClick={() => setInput(q)} className="text-xs bg-gray-800 hover:bg-agri-green/20 text-gray-400 hover:text-agri-lime border border-gray-700 hover:border-agri-green/50 px-2.5 py-1 rounded-full transition-all">{q}</button>)}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask anything about farming..." className="input-field flex-1 text-sm" />
        <button onClick={send} disabled={loading || !input.trim()} className="btn-primary px-4"><Send size={16} /></button>
      </div>
    </div>
  );
}

// ─── Main AI Hub Page ─────────────────────────────────────────────────────────
const TAB_META = {
  yield:        { color: "#3b82f6", glow: "rgba(59,130,246,0.25)" },
  fertilizer:   { color: "#22c55e", glow: "rgba(34,197,94,0.25)" },
  "soil-health":{ color: "#8b5cf6", glow: "rgba(139,92,246,0.25)" },
  doctor:       { color: "#ef4444", glow: "rgba(239,68,68,0.25)" },
  chatbot:      { color: "#60a5fa", glow: "rgba(96,165,250,0.25)" },
  "farm-sim":   { color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
};

export default function AIHub({ currentUser }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("yield");
  const tabs = [
    { id: "yield",        label: t("yieldPredictor"),    short: "Yield" },
    { id: "fertilizer",   label: t("fertilizerAdvisor"), short: "Fertilizer" },
    { id: "soil-health",  label: t("soilHealth"),        short: "Soil" },
    { id: "doctor",       label: t("cropDoctor"),        short: "Doctor" },
    { id: "chatbot",      label: t("aiChatbot"),         short: "Chat" },
    { id: "farm-sim",     label: t("farmSimulator"),     short: "Simulator" },
  ];
  const activeMeta = TAB_META[activeTab] || TAB_META.yield;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* ── Premium Hero Header ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(34,197,94,0.06) 50%, transparent 100%)",
        border: "1px solid rgba(139,92,246,0.2)", borderRadius: 24, padding: "28px 32px", marginBottom: 28,
        position: "relative", overflow: "hidden"
      }}>
        {/* Dual glow orbs */}
        <div style={{ position:"absolute", top:-60, right:-40, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.12), transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, left:80, width:150, height:150, borderRadius:"50%", background:"radial-gradient(circle, rgba(34,197,94,0.08), transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(139,92,246,0.4), rgba(34,197,94,0.3), transparent)" }} />

        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <div style={{ width:48, height:48, borderRadius:16, background:"linear-gradient(135deg, rgba(139,92,246,0.3), rgba(34,197,94,0.2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:"0 0 20px rgba(139,92,246,0.3)" }}>🤖</div>
              <div>
                <h1 style={{ fontSize:"1.9rem", fontWeight:900, color:"#fff", letterSpacing:"-0.02em", margin:0 }}>{t("aiFarmIntelligence")}</h1>
                <p style={{ color:"#6b7280", fontSize:13, margin:0 }}>{t("aiHubSubtitle")}</p>
              </div>
            </div>
            {/* Model badges */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {[
                { label:"⚡ Groq", sub:"Chatbot & Sim", color:"#22c55e" },
                { label:"🔬 DeepSeek", sub:"Fertilizer", color:"#a78bfa" },
                { label:"✨ Gemini", sub:"Crop Doctor", color:"#60a5fa" },
                { label:"🌐 OpenRouter", sub:"Yield", color:"#fb923c" },
              ].map(b => (
                <span key={b.label} style={{
                  display:"inline-flex", alignItems:"center", gap:5,
                  padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700,
                  background:`${b.color}12`, border:`1px solid ${b.color}30`, color:b.color
                }}>
                  {b.label} <span style={{ color:"#4b5563", fontWeight:400 }}>· {b.sub}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Live status dot */}
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", borderRadius:14, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", flexShrink:0 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 8px rgba(34,197,94,0.7)", animation:"pulse-dot 2s infinite" }} />
            <span style={{ color:"#4ade80", fontSize:12, fontWeight:700 }}>{t("aiSystemsOnline")}</span>
          </div>
        </div>
      </div>

      {/* ─ Live Key Status Bar ─ */}
      <KeyStatusBar />

      {/* ── Premium Tab Navigation ── */}
      <div style={{
        display:"flex", gap:6, marginBottom:24, flexWrap:"wrap",
        background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
        borderRadius:20, padding:6
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const meta = TAB_META[tab.id];
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding:"10px 18px", borderRadius:14, border:"none", cursor:"pointer",
                fontWeight:700, fontSize:13, fontFamily:"inherit",
                background: isActive ? `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` : "transparent",
                color: isActive ? "#fff" : "#6b7280",
                boxShadow: isActive ? `0 4px 16px ${meta.glow}` : "none",
                transition:"all 0.2s",
                transform: isActive ? "translateY(-1px)" : "",
              }}
              onMouseEnter={e => { if(!isActive) { e.currentTarget.style.color = "#e5e7eb"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}}
              onMouseLeave={e => { if(!isActive) { e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "transparent"; }}}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Active tab accent line ── */}
      <div style={{ height:2, background:`linear-gradient(90deg, transparent, ${activeMeta.color}, transparent)`, borderRadius:99, marginBottom:20, opacity:0.6, transition:"all 0.3s" }} />

      <div style={{ animation:"fadeIn 0.25s ease" }}>
        {activeTab === "yield"       && <YieldPredictor />}
        {activeTab === "fertilizer"  && <FertilizerAdvisor currentUser={currentUser} />}
        {activeTab === "soil-health" && <SoilHealthAnalyzer />}
        {activeTab === "doctor"      && <CropDoctor />}
        {activeTab === "chatbot"     && <FarmingChatbot />}
        {activeTab === "farm-sim"    && <FarmSimulator />}
      </div>
    </div>
  );
}

