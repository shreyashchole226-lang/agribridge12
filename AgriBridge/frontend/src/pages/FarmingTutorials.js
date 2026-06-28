import React, { useState, useEffect } from "react";
import { getFarmingTutorials } from "../api";
import AILoader from "../components/AILoader";
import { useLanguage } from "../context/LanguageContext";
import {
  Loader, Play, BookOpen, ChevronDown, ChevronUp,
  ExternalLink, Star, Eye, Clock, Leaf, Search, RefreshCw
} from "lucide-react";

// ─── Category config ──────────────────────────────────────────────────────────
const CAT_CONFIG = {
  all:          { label: "All Topics",     icon: "🌐", color: "#22c55e" },
  home_farming: { label: "Home Farming",   icon: "🏡", color: "#22c55e" },
  micro_farming:{ label: "Micro Farming",  icon: "🌾", color: "#3b82f6" },
  hydroponics:  { label: "Hydroponics",    icon: "💧", color: "#06b6d4" },
  terrace:      { label: "Terrace Garden", icon: "🏙️", color: "#8b5cf6" },
  organic:      { label: "Organic Methods",icon: "🌿", color: "#f59e0b" },
};

const LEVEL_COLOR = {
  beginner:     { bg: "bg-green-900/30",  text: "text-green-400",  label: "Beginner" },
  intermediate: { bg: "bg-blue-900/30",   text: "text-blue-400",   label: "Intermediate" },
  advanced:     { bg: "bg-purple-900/30", text: "text-purple-400", label: "Advanced" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function difficultyStars(d) {
  const n = d === "Easy" ? 1 : d === "Medium" ? 2 : d === "Hard" ? 3 : 2;
  return "★".repeat(n) + "☆".repeat(3 - n);
}

// ─── YouTube Search Button (opens YouTube search, not embedded video) ─────────
function WatchOnYouTube({ query, videoId }) {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query || "home farming India")}`;
  return (
    <a
      href={searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
      style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
    >
      <Play size={14} fill="white" />
      Watch on YouTube
      <ExternalLink size={12} />
    </a>
  );
}

// ─── Tutorial Card ────────────────────────────────────────────────────────────
function TutorialCard({ tutorial, isExpanded, onToggle }) {
  const cat = CAT_CONFIG[tutorial.category] || CAT_CONFIG.all;
  const lvl = LEVEL_COLOR[tutorial.level] || LEVEL_COLOR.beginner;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        background: "rgba(6,20,10,0.85)",
        borderColor: isExpanded ? `${cat.color}60` : "rgba(55,65,81,0.5)",
        boxShadow: isExpanded ? `0 0 30px ${cat.color}18` : "none",
      }}
    >
      {/* Card Header */}
      <div
        className="p-5 cursor-pointer hover:bg-white/5 transition-all"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4">
          {/* Emoji Thumbnail */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${cat.color}25, ${cat.color}10)`, border: `1px solid ${cat.color}30` }}
          >
            {tutorial.thumbnail_emoji || cat.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${cat.color}20`, color: cat.color }}>
                {cat.icon} {cat.label}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lvl.bg} ${lvl.text}`}>
                {lvl.label}
              </span>
              {tutorial.difficulty && (
                <span className="text-xs text-yellow-400 px-2 py-0.5 bg-yellow-900/20 rounded-full">
                  {difficultyStars(tutorial.difficulty)} {tutorial.difficulty}
                </span>
              )}
            </div>

            <h3 className="text-white font-bold text-base leading-snug mb-1">{tutorial.title}</h3>
            <p className="text-gray-400 text-sm line-clamp-2">{tutorial.description}</p>

            {/* Meta */}
            <div className="flex gap-4 mt-2 flex-wrap">
              {tutorial.duration_mins && (
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <Clock size={11} /> {tutorial.duration_mins} min read
                </span>
              )}
              {tutorial.rating && (
                <span className="text-yellow-400 text-xs flex items-center gap-1">
                  <Star size={11} fill="currentColor" /> {tutorial.rating}
                </span>
              )}
              {tutorial.views_k && (
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <Eye size={11} /> {tutorial.views_k}K views
                </span>
              )}
              {tutorial.space_required && (
                <span className="text-gray-500 text-xs">📐 {tutorial.space_required}</span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-gray-500 mt-1">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        {/* Tags */}
        {tutorial.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 ml-20">
            {tutorial.tags.map((t, i) => (
              <span key={i} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-800 fade-in">
          <div className="pt-5 space-y-5">

            {/* Watch + Key Crops Row */}
            <div className="flex flex-wrap gap-3 items-center">
              <WatchOnYouTube query={tutorial.youtube_search_query} videoId={tutorial.youtube_video_id} />
              {tutorial.expected_yield && (
                <span className="text-green-400 text-sm bg-green-900/20 border border-green-900/40 px-3 py-1.5 rounded-xl">
                  📦 Expected: {tutorial.expected_yield}
                </span>
              )}
              {tutorial.govt_scheme && (
                <span className="text-amber-400 text-xs bg-amber-900/20 border border-amber-900/30 px-3 py-1.5 rounded-xl">
                  🏛️ {tutorial.govt_scheme}
                </span>
              )}
            </div>

            {/* What you'll learn + Quick tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tutorial.what_you_will_learn?.length > 0 && (
                <div className="bg-gray-900/60 rounded-xl p-4">
                  <h5 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-400" /> What You'll Learn
                  </h5>
                  <ul className="space-y-2">
                    {tutorial.what_you_will_learn.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <span className="text-blue-400 font-bold shrink-0">{i + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tutorial.quick_tips?.length > 0 && (
                <div className="bg-gray-900/60 rounded-xl p-4">
                  <h5 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <span>💡</span> Quick Tips
                  </h5>
                  <ul className="space-y-2">
                    {tutorial.quick_tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <span className="text-yellow-400 shrink-0">→</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Step by Step */}
            {tutorial.step_by_step?.length > 0 && (
              <div>
                <h5 className="text-white font-semibold text-sm mb-3">📋 Step-by-Step Guide</h5>
                <div className="space-y-2">
                  {tutorial.step_by_step.map((s, i) => (
                    <div key={i} className="flex gap-3 items-start bg-gray-900/40 rounded-xl p-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                        style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}88)` }}
                      >
                        {s.step}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{s.title}</p>
                        <p className="text-gray-400 text-sm mt-0.5">{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials */}
            {tutorial.materials_needed?.length > 0 && (
              <div>
                <h5 className="text-white font-semibold text-sm mb-3">🛒 Materials Needed</h5>
                <div className="grid grid-cols-2 gap-2">
                  {tutorial.materials_needed.map((m, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-900/40 rounded-xl px-3 py-2">
                      <span className="text-gray-300 text-sm">{m.item}</span>
                      <span className="text-green-400 text-xs font-medium ml-2 shrink-0">{m.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suitable Crops */}
            {tutorial.crops_suitable?.length > 0 && (
              <div>
                <h5 className="text-white font-semibold text-sm mb-2">🌱 Crops You Can Grow</h5>
                <div className="flex flex-wrap gap-1.5">
                  {tutorial.crops_suitable.map((c, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full border"
                      style={{ color: cat.color, borderColor: `${cat.color}40`, background: `${cat.color}12` }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Micro Farming Business Card ──────────────────────────────────────────────
function MicroBusinessCard({ type }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-2xl border border-gray-800 overflow-hidden cursor-pointer hover:border-blue-600/40 transition-all"
      style={{ background: "rgba(6,20,10,0.8)" }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{type.icon}</span>
            <div>
              <h4 className="text-white font-bold text-base">{type.type}</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-green-400 text-xs bg-green-900/20 px-2 py-0.5 rounded-full">💰 {type.potential_income}</span>
                <span className="text-blue-400 text-xs bg-blue-900/20 px-2 py-0.5 rounded-full">💼 {type.investment}</span>
                <span className="text-purple-400 text-xs bg-purple-900/20 px-2 py-0.5 rounded-full">⏱ {type.time_to_harvest}</span>
              </div>
            </div>
          </div>
          <span className="text-gray-500">{expanded ? "▲" : "▼"}</span>
        </div>
        <p className="text-gray-400 text-sm mt-2">{type.description}</p>
        <div className="text-gray-500 text-xs mt-1">📐 Space: {type.space}</div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4 fade-in">
          {type.best_crops?.length > 0 && (
            <div className="mb-3">
              <p className="text-gray-400 text-xs mb-1.5 font-semibold">Best Crops:</p>
              <div className="flex flex-wrap gap-1.5">
                {type.best_crops.map((c, i) => (
                  <span key={i} className="text-xs text-cyan-300 bg-cyan-900/20 border border-cyan-800/40 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
          {type.selling_options?.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs mb-1.5 font-semibold">Where to Sell:</p>
              <div className="flex flex-wrap gap-1.5">
                {type.selling_options.map((s, i) => (
                  <span key={i} className="text-xs text-orange-300 bg-orange-900/20 border border-orange-800/40 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────────────────
export default function FarmingTutorials() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [userLevel, setUserLevel] = useState("beginner");
  const [topic, setTopic] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [activeSection, setActiveSection] = useState("tutorials"); // "tutorials" | "micro" | "quick_start" | "space_guide"
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchTutorials = async () => {
    setLoading(true);
    setError("");
    setData(null);
    setExpandedId(null);
    try {
      const r = await getFarmingTutorials({ category, topic, user_level: userLevel });
      if (r.data.success) {
        setData(r.data);
        setHasLoaded(true);
      } else {
        setError(r.data.error || "Failed to load tutorials.");
      }
    } catch {
      setError("⚠️ Could not connect to AI. Make sure your DEEPSEEK_API_KEY is set in backend/.env");
    }
    setLoading(false);
  };

  // Filter tutorials by selected category
  const filteredTutorials = data?.tutorials?.filter(t =>
    category === "all" || t.category === category
  ) || [];

  const sectionTabs = [
    { id: "tutorials",   label: "📚 Tutorials", count: filteredTutorials.length },
    { id: "micro",       label: "🌾 Micro Farming Business" },
    { id: "quick_start", label: "🗓️ Quick Start Plans" },
    { id: "space_guide", label: "📐 Space Guide" },
  ];

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-green-900/30 flex items-center justify-center">
            <Leaf size={20} className="text-green-400" />
          </div>
          <div>
            <h1 className="section-title mb-0">{t("tutorialsTitle")}</h1>
            <p className="text-gray-400 text-sm">
              {t("tutorialsSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Control Panel ── */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Category */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-gray-400 text-xs mb-1 block">{t("category")}</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input-field text-sm">
              {Object.entries(CAT_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          {/* Level */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-gray-400 text-xs mb-1 block">{t("yourLevel")}</label>
            <select value={userLevel} onChange={e => setUserLevel(e.target.value)} className="input-field text-sm">
              <option value="beginner">🌱 Beginner</option>
              <option value="intermediate">🌿 Intermediate</option>
              <option value="advanced">🌳 Advanced</option>
            </select>
          </div>
          {/* Topic */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-gray-400 text-xs mb-1 flex items-center gap-1 block"><Search size={10}/> {t("topicOptional")}</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. mushrooms, hydroponics, composting"
              className="input-field text-sm"
              onKeyDown={e => e.key === "Enter" && fetchTutorials()}
            />
          </div>
          {/* Generate Button */}
          <button
            onClick={fetchTutorials}
            disabled={loading}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
            style={{ background: loading ? undefined : "linear-gradient(135deg, #166534, #22c55e)" }}
          >
            {loading ? (
              <><Loader size={15} className="animate-spin" /> {t("generating")}</>
            ) : (
              <><RefreshCw size={15} /> {hasLoaded ? t("regenerate") : t("loadTutorials")}</>
            )}
          </button>
        </div>

        {/* Category pill tabs */}
        {!loading && (
          <div className="flex gap-2 flex-wrap mt-4">
            {Object.entries(CAT_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => setCategory(k)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  category === k ? "text-white border-transparent" : "border-gray-700 text-gray-400 hover:text-white bg-gray-900"
                }`}
                style={category === k ? { background: v.color, borderColor: v.color } : {}}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state — Premium AI Loader */}
      {loading && (
        <AILoader message="BUILDING TUTORIAL LIBRARY" />
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-900/20 border border-red-800/50 text-red-400 rounded-2xl p-5 mb-4">
          <p className="font-semibold mb-1">Error</p>
          <p className="text-sm">{error}</p>
          <button onClick={fetchTutorials} className="mt-3 text-xs bg-red-900/30 border border-red-800/50 px-3 py-1.5 rounded-xl hover:bg-red-900/50 transition-all">
            Try Again
          </button>
        </div>
      )}

      {/* Empty prompt */}
      {!hasLoaded && !loading && !error && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🌾</div>
          <h3 className="text-white font-bold text-xl mb-2">{t("welcomeAcademy")}</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            {t("academyDesc")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto mb-6">
            {[
              { icon: "🏡", label: "Home Farming" },
              { icon: "🌾", label: "Micro Business" },
              { icon: "💧", label: "Hydroponics" },
              { icon: "🏙️", label: "Terrace Garden" },
            ].map(item => (
              <div key={item.label} className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-gray-400 text-xs">{item.label}</p>
              </div>
            ))}
          </div>
          <button onClick={fetchTutorials} className="btn-primary px-8"
            style={{ background: "linear-gradient(135deg, #166534, #22c55e)" }}>
            {t("loadAiTutorials")}
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {data && !loading && (
        <div className="space-y-6 fade-in">

          {/* Featured Info Banner */}
          {data.featured_info && (
            <div className="rounded-2xl p-6 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(22,101,52,0.4) 0%, rgba(6,78,59,0.3) 50%, rgba(6,18,10,0.9) 100%)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div className="relative z-10">
                <h2 className="text-white font-bold text-xl mb-2">{data.featured_info.title}</h2>
                <p className="text-gray-300 text-sm mb-5 max-w-2xl">{data.featured_info.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {data.featured_info.key_stats?.map((stat, i) => (
                    <div key={i} className="bg-black/30 backdrop-blur rounded-xl p-3 border border-white/10">
                      <div className="text-xl mb-1">{stat.icon}</div>
                      <p className="text-white font-bold text-lg">{stat.value}</p>
                      <p className="text-gray-400 text-xs">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Insight */}
          {data.ai_insight && (
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/40 rounded-2xl p-4">
              <p className="text-blue-400 text-sm font-semibold mb-1">🤖 AI Recommendation for You</p>
              <p className="text-gray-300 text-sm leading-relaxed">{data.ai_insight}</p>
            </div>
          )}

          {/* Section Navigation */}
          <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-2xl p-1.5 flex-wrap">
            {sectionTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1 ${
                  activeSection === tab.id ? "bg-agri-green text-white shadow-lg" : "text-gray-400 hover:text-white"
                }`}>
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSection === tab.id ? "bg-white/20" : "bg-gray-800"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tutorials Section ── */}
          {activeSection === "tutorials" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">
                  📚 {filteredTutorials.length} Tutorials
                  <span className="text-gray-500 text-sm font-normal ml-2">
                    — {CAT_CONFIG[category]?.label}
                  </span>
                </h2>
              </div>
              {filteredTutorials.length === 0 ? (
                <div className="card text-center py-10 text-gray-400">
                  No tutorials in this category yet. Try "All Topics" or generate new content.
                </div>
              ) : (
                filteredTutorials.map(t => (
                  <TutorialCard
                    key={t.id}
                    tutorial={t}
                    isExpanded={expandedId === t.id}
                    onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* ── Micro Farming Business Section ── */}
          {activeSection === "micro" && data.micro_farming_guide && (
            <div className="space-y-5">
              <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-white font-bold text-lg mb-2">{data.micro_farming_guide.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{data.micro_farming_guide.definition}</p>
              </div>

              <h3 className="text-white font-semibold text-lg">💼 Business Opportunities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.micro_farming_guide.types?.map((type, i) => (
                  <MicroBusinessCard key={i} type={type} />
                ))}
              </div>

              {/* Success Stories */}
              {data.micro_farming_guide.success_stories?.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold text-lg mb-3">🌟 Success Stories</h3>
                  <div className="space-y-3">
                    {data.micro_farming_guide.success_stories.map((s, i) => (
                      <div key={i} className="bg-gradient-to-r from-green-900/20 to-teal-900/10 border border-green-800/30 rounded-2xl p-4 flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center text-xl shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{s.name}</p>
                          <p className="text-gray-300 text-sm mt-1">{s.story}</p>
                          <div className="flex gap-3 mt-2">
                            <span className="text-green-400 text-xs bg-green-900/20 px-2 py-0.5 rounded-full">💰 {s.income}</span>
                            <span className="text-blue-400 text-xs bg-blue-900/20 px-2 py-0.5 rounded-full">💼 {s.investment}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Quick Start Plans ── */}
          {activeSection === "quick_start" && data.quick_start_plans?.length > 0 && (
            <div className="space-y-5">
              <h3 className="text-white font-bold text-lg">🗓️ Quick Start Plans</h3>
              {data.quick_start_plans.map((plan, pi) => (
                <div key={pi} className="rounded-2xl border border-gray-800 overflow-hidden"
                  style={{ background: "rgba(6,20,10,0.8)" }}>
                  <div className="p-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(55,65,81,0.5)" }}>
                    <span className="text-3xl">{plan.icon}</span>
                    <div>
                      <h4 className="text-white font-bold text-base">{plan.title}</h4>
                      <p className="text-gray-400 text-sm">{plan.description}</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    {plan.days?.map((d, di) => (
                      <div key={di} className="flex gap-3 items-start">
                        <div className="shrink-0 w-16 text-center">
                          <span className="text-xs font-bold px-2 py-1 rounded-lg text-white"
                            style={{ background: plan.color || "#22c55e" }}>
                            {d.day}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm pt-1">{d.task}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Space Guide ── */}
          {activeSection === "space_guide" && data.recommended_crops_by_space?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">📐 What to Grow Based on Your Space</h3>
              {data.recommended_crops_by_space.map((row, i) => {
                const colors = ["#22c55e", "#3b82f6", "#8b5cf6", "#f59e0b"];
                const col = colors[i % colors.length];
                return (
                  <div key={i} className="rounded-2xl border overflow-hidden"
                    style={{ borderColor: `${col}30`, background: `${col}08` }}>
                    <div className="p-4 flex gap-4 items-start">
                      <div className="w-24 shrink-0">
                        <p className="text-xs text-gray-500 mb-1">Space</p>
                        <p className="font-bold text-base" style={{ color: col }}>{row.space}</p>
                        <p className="text-gray-500 text-xs mt-1">{row.containers}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-400 text-xs mb-2">Suitable Crops:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.suitable?.map((c, ci) => (
                            <span key={ci} className="text-xs px-2.5 py-1 rounded-full border font-medium"
                              style={{ color: col, borderColor: `${col}40`, background: `${col}15` }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* CTA */}
              <div className="bg-gradient-to-r from-green-900/20 to-teal-900/10 border border-green-800/30 rounded-2xl p-5 mt-4">
                <h4 className="text-white font-semibold mb-2">🚀 Ready to Start?</h4>
                <p className="text-gray-300 text-sm mb-3">
                  Browse our tutorials section for step-by-step video guides specific to your space size.
                </p>
                <button onClick={() => setActiveSection("tutorials")} className="btn-primary px-5">
                  View Tutorials →
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

