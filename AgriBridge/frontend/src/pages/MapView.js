import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Info } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// ─── Fix Leaflet default icon (webpack breaks the default URLs) ───────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Custom coloured pin icons ────────────────────────────────────────────────
const makeIcon = (color, emoji) =>
  new L.DivIcon({
    className: "",
    html: `<div style="background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:36px;height:36px;box-shadow:0 2px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:16px;">${emoji}</span></div>`,
    iconSize:    [36, 36],
    iconAnchor:  [18, 36],
    popupAnchor: [0, -38],
  });

const ICONS = {
  farm:     makeIcon("#7c3aed", "🌾"),
  store:    makeIcon("#16a34a", "🏪"),
  delivery: makeIcon("#d97706", "🚚"),
  buyer:    makeIcon("#2563eb", "🛒"),
};

// ─── Pune & Bibewadi Local Locations ───────────────────────────────────────────────
const LOCATIONS = [
  // ─ Farms (Pune south & outskirts) ─
  { id:  1, type: "farm",     name: "Shinde Agro Farm",          lat: 18.4631, lng: 73.8547, city: "Bibewadi, Pune",     desc: "Tomatoes, Spinach, Green Chilli",        stock: "600 kg tomatoes",    contact: "+91 9820001111", rating: 4.8 },
  { id:  2, type: "farm",     name: "Patil Organics",            lat: 18.4512, lng: 73.8432, city: "Dhayari, Pune",      desc: "Organic Bhendi, Coriander, Brinjal",     stock: "200 kg bhendi",      contact: "+91 9822002222", rating: 4.9 },
  { id:  3, type: "farm",     name: "Katraj Vegetable Farm",     lat: 18.4490, lng: 73.8601, city: "Katraj, Pune",       desc: "Cauliflower, Cabbage, Beetroot",         stock: "450 kg cauliflower",  contact: "+91 9823003333", rating: 4.5 },
  { id:  4, type: "farm",     name: "Ambegaon Fresh Produce",    lat: 18.4750, lng: 73.8350, city: "Ambegaon, Pune",     desc: "Potato, Onion, Garlic",                  stock: "1000 kg onion",      contact: "+91 9824004444", rating: 4.6 },
  { id:  5, type: "farm",     name: "Narhe Krishi Kendra",       lat: 18.4592, lng: 73.8187, city: "Narhe, Pune",        desc: "Wheat, Jowar, Bajra (rabi crops)",       stock: "800 kg wheat",       contact: "+91 9825005555", rating: 4.3 },
  // ─ Stores / Mandis ─
  { id:  6, type: "store",    name: "Bibewadi Sabji Market",     lat: 18.4668, lng: 73.8512, city: "Bibewadi, Pune",     desc: "Local daily vegetable market",           timings: "5 AM – 11 AM",     contact: "+91 20 24212600", rating: 4.6 },
  { id:  7, type: "store",    name: "Pune Market Yard (APMC)",  lat: 18.5081, lng: 73.8553, city: "Gultekdi, Pune",     desc: "Pune's main wholesale agri market",      timings: "4 AM – 2 PM",     contact: "+91 20 24261500", rating: 4.7 },
  { id:  8, type: "store",    name: "Shivajinagar Vegetable Hub",lat: 18.5308, lng: 73.8474, city: "Shivajinagar, Pune", desc: "Retail + semi-wholesale produce",         timings: "6 AM – 9 PM",     contact: "+91 9820008888", rating: 4.4 },
  { id:  9, type: "store",    name: "Katraj Mandai",             lat: 18.4519, lng: 73.8631, city: "Katraj, Pune",       desc: "Neighbourhood mandai — all veggies",     timings: "6 AM – 8 PM",     contact: "+91 9821009999", rating: 4.3 },
  // ─ Delivery Partners ─
  { id: 10, type: "delivery", name: "Pune AgroExpress",          lat: 18.4680, lng: 73.8560, city: "Bibewadi, Pune",     desc: "Bike + tempo delivery across Pune",      vehicles: "15 bikes, 4 tempos", rate: "₹6–12/km",  contact: "+91 9900010001", rating: 4.8 },
  { id: 11, type: "delivery", name: "Swargate Logistics Hub",    lat: 18.5018, lng: 73.8553, city: "Swargate, Pune",     desc: "Mini-truck & tempo fleet — city-wide",   vehicles: "8 mini-trucks",  rate: "₹18/km", contact: "+91 9900010002", rating: 4.6 },
  { id: 12, type: "delivery", name: "Kondhwa Farm Courier",      lat: 18.4793, lng: 73.8838, city: "Kondhwa, Pune",      desc: "Last-mile farm-to-door delivery",        vehicles: "10 bikes",       rate: "₹5/km",  contact: "+91 9900010003", rating: 4.5 },
  // ─ Buyers ─
  { id: 13, type: "buyer",    name: "Rahul Desai (Retail)",      lat: 18.4725, lng: 73.8494, city: "Bibewadi, Pune",     desc: "Retail buyer — daily veggies 50–80 kg",  contact: "+91 9811100001", rating: 4.9 },
  { id: 14, type: "buyer",    name: "Sai Supermarket",           lat: 18.4558, lng: 73.8567, city: "Dhayari, Pune",      desc: "Supermarket — bulk orders 200+ kg",      contact: "+91 9811100002", rating: 4.7 },
  { id: 15, type: "buyer",    name: "Hotel Swad (Restaurant)",   lat: 18.4700, lng: 73.8600, city: "Bibewadi, Pune",     desc: "Restaurant buyer — fresh produce daily", contact: "+91 9811100003", rating: 4.6 },
];

// ─── Filter & Type keys (translated at render time) ─────────────────────────
const FILTER_KEYS = [
  { key: "all",      labelKey: "mapFilterAll",      emoji: "🗺️" },
  { key: "farm",     labelKey: "mapFilterFarms",    emoji: "🌾" },
  { key: "store",    labelKey: "mapFilterStores",   emoji: "🏪" },
  { key: "delivery", labelKey: "mapFilterDelivery", emoji: "🚚" },
  { key: "buyer",    labelKey: "mapFilterBuyers",   emoji: "🛒" },
];

const TYPE_META = {
  farm:     { labelKey: "mapTypeFarm",     color: "#7c3aed", bg: "bg-purple-900/30", border: "border-purple-700/40", text: "text-purple-300" },
  store:    { labelKey: "mapTypeStore",    color: "#16a34a", bg: "bg-green-900/30",  border: "border-green-700/40",  text: "text-green-300"  },
  delivery: { labelKey: "mapTypeDelivery", color: "#d97706", bg: "bg-amber-900/30",  border: "border-amber-700/40",  text: "text-amber-300"  },
  buyer:    { labelKey: "mapTypeBuyer",    color: "#2563eb", bg: "bg-blue-900/30",   border: "border-blue-700/40",   text: "text-blue-300"   },
};

// ─── Fly-to helper (must be a child of MapContainer) ─────────────────────────
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 13, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span style={{ color: "#f59e0b", fontSize: 12 }}>
      {"★".repeat(full)}{"☆".repeat(5 - full)}
      <span style={{ color: "#9ca3af", marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

// ─── Sidebar card ─────────────────────────────────────────────────────────────
function LocationCard({ loc, onClick, isActive, t }) {
  const meta = TYPE_META[loc.type];
  const emoji = loc.type === "farm" ? "🌾" : loc.type === "store" ? "🏪" : loc.type === "delivery" ? "🚚" : "🛒";
  return (
    <button
      onClick={() => onClick(loc)}
      className={`w-full text-left p-3 rounded-xl border transition-all mb-2 ${
        isActive
          ? `${meta.bg} ${meta.border} ring-1`
          : "border-gray-700/50 hover:border-gray-500/70 bg-gray-800/30"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{loc.name}</p>
          <p className={`text-xs ${meta.text}`}>{t(meta.labelKey)} · {loc.city}</p>
          <Stars rating={loc.rating} />
        </div>
      </div>
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function MapView() {
  const { t } = useLanguage();
  const [filter, setFilter]       = useState("all");
  const [searchQ, setSearchQ]     = useState("");
  const [selected, setSelected]   = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [showRadius, setShowRadius] = useState(false);

  const filtered = LOCATIONS.filter((l) => {
    const matchType   = filter === "all" || l.type === filter;
    const matchSearch = !searchQ ||
      l.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      l.city.toLowerCase().includes(searchQ.toLowerCase());
    return matchType && matchSearch;
  });

  const handleSelect = (loc) => {
    setSelected(loc);
    setFlyTarget(loc);
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="section-title mb-1">{t("mapPageTitle")}</h1>
        <p className="text-gray-400 text-sm">{t("mapPageSubtitle")}</p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTER_KEYS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filter === f.key
                ? "bg-agri-green text-white border-agri-green"
                : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white"
            }`}
          >
            {f.emoji} {t(f.labelKey)}
          </button>
        ))}
        <label className="flex items-center gap-1.5 ml-auto cursor-pointer text-xs text-gray-400 hover:text-white select-none">
          <input
            type="checkbox"
            checked={showRadius}
            onChange={(e) => setShowRadius(e.target.checked)}
            className="accent-agri-green"
          />
          {t("mapShow10km")}
        </label>
      </div>

      {/* Map + Sidebar */}
      <div style={{ display: "flex", gap: 16, height: "68vh", minHeight: 500 }}>

        {/* Sidebar */}
        <div style={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t("mapSearchPlaceholder")}
            className="input-field text-sm py-2"
          />

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <div key={key} className={`${meta.bg} ${meta.border} border rounded-lg p-2 text-center`}>
                <p className={`text-base font-bold ${meta.text}`}>
                  {LOCATIONS.filter((l) => l.type === key).length}
                </p>
                <p className="text-gray-400 text-xs">{t(meta.labelKey).split(" ")[0]}s</p>
              </div>
            ))}
          </div>

          {/* Scrollable list */}
          <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
            <p className="text-gray-500 text-xs mb-2">
              {filtered.length} {filtered.length !== 1 ? t("mapLocationsPlural") : t("mapLocations")}
            </p>
            {filtered.map((loc) => (
              <LocationCard
                key={loc.id}
                loc={loc}
                onClick={handleSelect}
                isActive={selected?.id === loc.id}
                t={t}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-gray-500 text-sm text-center mt-8">{t("mapNoLocations")}</p>
            )}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", position: "relative" }}>
          <MapContainer
            center={[18.4668, 73.8512]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyTo target={flyTarget} />

            {filtered.map((loc) => (
              <React.Fragment key={loc.id}>
                <Marker
                  position={[loc.lat, loc.lng]}
                  icon={ICONS[loc.type]}
                  eventHandlers={{ click: () => handleSelect(loc) }}
                >
                  <Popup maxWidth={250}>
                    <div style={{ fontFamily: "Inter,sans-serif", minWidth: 200 }}>
                      <span style={{
                        background: TYPE_META[loc.type].color + "22",
                        border: `1px solid ${TYPE_META[loc.type].color}66`,
                        borderRadius: 6, padding: "2px 8px",
                        fontSize: 10, color: TYPE_META[loc.type].color,
                        fontWeight: 700, display: "inline-block", marginBottom: 6
                      }}>
                        {t(TYPE_META[loc.type].labelKey).toUpperCase()}
                      </span>
                      <h3 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700 }}>{loc.name}</h3>
                      <p style={{ margin: "0 0 4px", fontSize: 11, color: "#666" }}>📍 {loc.city}</p>
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#444" }}>{loc.desc}</p>
                      {loc.stock    && <p style={{ fontSize: 11, color: "#16a34a", margin: "2px 0" }}>📦 {loc.stock}</p>}
                      {loc.timings  && <p style={{ fontSize: 11, color: "#2563eb", margin: "2px 0" }}>⏰ {loc.timings}</p>}
                      {loc.vehicles && <p style={{ fontSize: 11, color: "#d97706", margin: "2px 0" }}>🚗 {loc.vehicles}</p>}
                      {loc.rate     && <p style={{ fontSize: 11, color: "#d97706", margin: "2px 0" }}>💰 {loc.rate}</p>}
                      <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, color: "#888" }}>{loc.contact}</span>
                        <Stars rating={loc.rating} />
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {showRadius && selected?.id === loc.id && (
                  <Circle
                    center={[loc.lat, loc.lng]}
                    radius={10000}
                    pathOptions={{
                      color: TYPE_META[loc.type].color,
                      fillOpacity: 0.06,
                      weight: 1.5,
                      dashArray: "6 4",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </MapContainer>

          {/* Legend overlay */}
          <div style={{
            position: "absolute", bottom: 16, right: 16, zIndex: 999,
            background: "rgba(10,10,20,0.88)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "10px 14px", fontSize: 11, color: "#ccc",
            backdropFilter: "blur(8px)", pointerEvents: "none",
          }}>
            <p style={{ fontWeight: 700, marginBottom: 6, color: "#fff" }}>{t("mapLegend")}</p>
            {Object.entries(TYPE_META).map(([k, m]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color }} />
                <span>{t(m.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className={`mt-4 ${TYPE_META[selected.type].bg} ${TYPE_META[selected.type].border} border rounded-2xl p-5 fade-in`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${TYPE_META[selected.type].text}`}>
                {t(TYPE_META[selected.type].labelKey)}
              </span>
              <h2 className="text-white font-bold text-xl">{selected.name}</h2>
              <p className="text-gray-400 text-sm flex items-center gap-1">
                <MapPin size={13} /> {selected.city}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { labelKey: "mapDetailDescription", value: selected.desc,     color: "text-white"       },
              selected.stock    && { labelKey: "mapDetailStock",   value: selected.stock,    color: "text-green-400"  },
              selected.timings  && { labelKey: "mapDetailTimings", value: selected.timings,  color: "text-blue-400"   },
              selected.vehicles && { labelKey: "mapDetailFleet",   value: selected.vehicles, color: "text-amber-400"  },
              selected.rate     && { labelKey: "mapDetailRate",    value: selected.rate,     color: "text-amber-400"  },
              { labelKey: "mapDetailContact",     value: selected.contact,  color: "text-white"       },
              { labelKey: "mapDetailRating",      value: `⭐ ${selected.rating}/5`, color: "text-amber-400" },
            ].filter(Boolean).map((item) => (
              <div key={item.labelKey} className="bg-gray-800/50 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{t(item.labelKey)}</p>
                <p className={`text-sm font-medium ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info bar */}
      <div className="mt-4 bg-blue-900/10 border border-blue-800/30 rounded-xl p-3 flex items-center gap-2">
        <Info size={14} className="text-blue-400 flex-shrink-0" />
        <p className="text-blue-300 text-xs">
          {t("mapPoweredBy")}
        </p>
      </div>
    </div>
  );
}
