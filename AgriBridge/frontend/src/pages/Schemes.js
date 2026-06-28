import React, { useState, useEffect } from "react";
import { getSchemes } from "../api";
import { ExternalLink, Search, Building2, IndianRupee, Users, Calendar, Filter } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const MINISTRY_FILTERS = [
  "All",
  "Ministry of Agriculture & Farmers Welfare",
  "Ministry of Finance",
  "Ministry of Jal Shakti",
  "Ministry of New & Renewable Energy",
  "Ministry of Food Processing Industries",
  "Ministry of Fisheries",
  "Ministry of Railways",
  "Ministry of Civil Aviation",
];

export default function Schemes() {
  const { t } = useLanguage();
  const [schemes, setSchemes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [ministryFilter, setMinistryFilter] = useState("All");

  useEffect(() => {
    getSchemes().then(r => { setSchemes(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = schemes.filter(s => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchMinistry =
      ministryFilter === "All" || s.ministry === ministryFilter;
    return matchSearch && matchMinistry;
  });

  // Count unique ministries
  const uniqueMinistries = new Set(schemes.map(s => s.ministry)).size;

  return (
    <div className="fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🏗️</span>
          <div>
            <h1 className="section-title mb-0">{t("schemesTitle")}</h1>
            <p className="text-gray-400 text-sm">{t("schemesSubtitle")}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-3.5 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("searchSchemes")}
          className="input-field pl-10 text-sm"
        />
      </div>

      {/* Ministry Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter size={14} className="text-gray-500 flex-shrink-0" />
        {MINISTRY_FILTERS.map(m => (
          <button
            key={m}
            onClick={() => setMinistryFilter(m)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              ministryFilter === m
                ? "bg-agri-green text-white shadow-lg shadow-agri-green/30"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            {m === "All" ? t("allMinistries") : m.replace("Ministry of ", "").replace(" & Farmers Welfare", "")}
          </button>
        ))}
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: t("activeSchemes"), value: schemes.length || 31, icon: "📋" },
          { label: t("ministries"), value: `${uniqueMinistries || 8}+`, icon: "🏢" },
          { label: t("beneficiaries"), value: "14Cr+", icon: "👨‍🌾" },
        ].map(s => (
          <div key={s.label} className="stat-card text-center py-4">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-white font-bold text-xl">{s.value}</p>
            <p className="text-gray-400 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-gray-500 text-sm mb-4">
          {t("showing")} <span className="text-agri-lime font-semibold">{filtered.length}</span> {filtered.length !== 1 ? t("schemes") : t("scheme")}
          {search && <span> for "<span className="text-white">{search}</span>"</span>}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="card animate-pulse h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(scheme => (
            <div key={scheme.id} className="card hover:border-agri-gold/40 transition-all group">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-display font-semibold text-lg leading-tight mb-1">
                    {scheme.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Building2 size={12} />
                    <span>{scheme.ministry}</span>
                  </div>
                </div>
                <a
                  href={scheme.apply_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 flex-shrink-0 bg-agri-gold/10 hover:bg-agri-gold/20 border border-agri-gold/30 text-agri-gold px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-all"
                >
                  {t("applyNow")} <ExternalLink size={11} />
                </a>
              </div>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{scheme.description}</p>

              {/* Details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-agri-green/10 border border-agri-green/20 rounded-xl p-2.5 text-center">
                  <IndianRupee size={14} className="text-agri-lime mx-auto mb-1" />
                  <p className="text-agri-lime text-xs font-semibold">{scheme.benefit_amount}</p>
                  <p className="text-gray-500 text-xs">{t("benefit")}</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-2.5 text-center">
                  <Users size={14} className="text-blue-400 mx-auto mb-1" />
                  <p className="text-blue-400 text-xs font-semibold line-clamp-2">{scheme.eligibility}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{t("eligibility")}</p>
                </div>
                <div className="bg-agri-gold/10 border border-agri-gold/20 rounded-xl p-2.5 text-center">
                  <Calendar size={14} className="text-agri-gold mx-auto mb-1" />
                  <p className="text-agri-gold text-xs font-semibold">{scheme.deadline}</p>
                  <p className="text-gray-500 text-xs">{t("deadline")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p>{t("noSchemesFound")} "{search}"</p>
        </div>
      )}
    </div>
  );
}
