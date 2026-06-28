import React, { useState, useEffect } from "react";
import { getWeather, getTransportCost } from "../api";
import { Cloud, Wind, Droplets, Eye, Thermometer, MapPin, Truck, Loader } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const VEHICLE_TYPES = [
  { id: "bike", label: "🏍️ Bike", desc: "< 50kg" },
  { id: "auto", label: "🛺 Auto/Tempo", desc: "50-300kg" },
  { id: "mini_truck", label: "🚛 Mini Truck", desc: "300kg-2T" },
  { id: "truck", label: "🚚 Full Truck", desc: "2T+" },
];

const CITIES = ["Pune", "Mumbai", "Nashik", "Nagpur", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Jaipur"];

function WeatherCard({ data, t }) {
  if (!data) return null;

  const iconUrl = data.icon ? `https://openweathermap.org/img/wn/${data.icon}@2x.png` : null;
  const tempCategory = data.temperature > 35 ? "🌡️ Hot" : data.temperature > 25 ? "☀️ Warm" : data.temperature > 15 ? "🌤️ Pleasant" : "❄️ Cool";

  const farmingTip = data.temperature > 38
    ? "⚠️ Extreme heat — irrigate early morning or evening. Mulch fields."
    : data.humidity > 80
    ? "🍄 High humidity — watch for fungal diseases. Ensure good air circulation."
    : data.wind_speed > 10
    ? "💨 Strong winds — delay spraying pesticides/fertilizers today."
    : "✅ Good conditions for field work and irrigation.";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-agri-lime" />
            <h3 className="text-white font-display font-bold text-xl">{data.city}</h3>
          </div>
          <p className="text-gray-400 capitalize text-sm">{data.description}</p>
          <p className="text-gray-500 text-xs">{tempCategory}</p>
        </div>
        <div className="text-right">
          {iconUrl && <img src={iconUrl} alt="weather" className="w-16 h-16 ml-auto" />}
          <p className="text-5xl font-bold text-white">{Math.round(data.temperature)}°</p>
          <p className="text-gray-400 text-sm">{t("feelsLike")} {Math.round(data.feels_like)}°C</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: Droplets, label: t("humidity"), value: `${data.humidity}%`, color: "text-blue-400" },
          { icon: Wind, label: t("wind"), value: `${data.wind_speed} m/s`, color: "text-agri-lime" },
          { icon: Eye, label: t("visibility"), value: `${data.visibility} km`, color: "text-purple-400" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "rgba(10,26,15,0.9)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 14 }} className="p-3 text-center">
            <stat.icon size={18} className={`${stat.color} mx-auto mb-1`} />
            <p className={`${stat.color} font-semibold text-sm`}>{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-agri-dark border border-agri-green/30 rounded-xl p-3">
        <p className="text-agri-lime text-xs font-semibold mb-1">{t("todaysFarmingAdvisory")}</p>
        <p className="text-gray-300 text-sm">{farmingTip}</p>
      </div>
    </div>
  );
}

export default function Weather() {
  const { t } = useLanguage();
  const [city, setCity] = useState("Pune");
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  const [origin, setOrigin] = useState("Nashik, Maharashtra");
  const [destination, setDestination] = useState("Mumbai, Maharashtra");
  const [vehicleType, setVehicleType] = useState("truck");
  const [transport, setTransport] = useState(null);
  const [transportLoading, setTransportLoading] = useState(false);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const r = await getWeather(city);
      if (r.data.success) {
        setWeather(r.data);
      } else {
        setWeatherError(r.data.error || "Could not fetch weather. Check your OpenWeatherMap API key.");
      }
    } catch (e) {
      setWeatherError("Backend not connected. Start FastAPI server.");
    }
    setWeatherLoading(false);
  };

  const fetchTransport = async () => {
    setTransportLoading(true);
    try {
      const r = await getTransportCost(origin, destination, vehicleType);
      setTransport(r.data);
    } catch (e) { console.error(e); }
    setTransportLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="section-title mb-1">{t("weatherTitle")}</h1>
        <p className="text-gray-400 text-sm">{t("weatherSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weather Section */}
        <div className="space-y-4">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Cloud size={20} className="text-blue-400" /> {t("liveWeather")}
          </h2>

          {/* City Selector */}
          <div className="flex gap-2">
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="input-field flex-1 text-sm"
            >
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input
              placeholder={t("customCity")}
              onBlur={e => e.target.value && setCity(e.target.value)}
              className="input-field flex-1 text-sm"
            />
            <button onClick={fetchWeather} disabled={weatherLoading} className="btn-primary px-4">
              {weatherLoading ? <Loader size={16} className="animate-spin" /> : t("search")}
            </button>
          </div>

          {weatherLoading && (
            <div className="card text-center py-12">
              <Loader size={32} className="animate-spin text-agri-lime mx-auto mb-3" />
              <p className="text-gray-400">{t("fetchingWeather")}</p>
            </div>
          )}

          {weatherError && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
              <p className="text-red-400 text-sm">⚠️ {weatherError}</p>
              <p className="text-gray-500 text-xs mt-1">Add your OpenWeatherMap key in backend/config.py</p>
            </div>
          )}

          {weather && !weatherLoading && <WeatherCard data={weather} t={t} />}

          {/* Cities Quick Select */}
          <div className="flex flex-wrap gap-2">
            {CITIES.slice(0, 6).map(c => (
              <button
                key={c}
                onClick={() => { setCity(c); }}
                style={{
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 99,
                  border: city === c ? "1px solid rgba(59,130,246,0.6)" : "1px solid rgba(34,197,94,0.2)",
                  background: city === c ? "rgba(59,130,246,0.15)" : "rgba(10,26,15,0.7)",
                  color: city === c ? "#93c5fd" : "#9ca3af",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
                onMouseEnter={e => { if (city !== c) { e.currentTarget.style.background = "rgba(34,197,94,0.12)"; e.currentTarget.style.color = "#f3f4f6"; }}}
                onMouseLeave={e => { if (city !== c) { e.currentTarget.style.background = "rgba(10,26,15,0.7)"; e.currentTarget.style.color = "#9ca3af"; }}}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Transport Calculator */}
        <div className="space-y-4">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Truck size={20} className="text-agri-gold" /> {t("transportCalc")}
          </h2>

          <div className="card">
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">{t("originLabel")}</label>
                <input value={origin} onChange={e => setOrigin(e.target.value)} className="input-field text-sm" placeholder="e.g. Nashik, Maharashtra" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">{t("destinationLabel")}</label>
                <input value={destination} onChange={e => setDestination(e.target.value)} className="input-field text-sm" placeholder="e.g. Mumbai, Maharashtra" />
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="text-gray-400 text-xs mb-2 block">{t("vehicleType")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setVehicleType(v.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: vehicleType === v.id ? "1px solid rgba(245,158,11,0.6)" : "1px solid rgba(34,197,94,0.15)",
                        background: vehicleType === v.id ? "rgba(245,158,11,0.12)" : "rgba(10,26,15,0.8)",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={e => { if (vehicleType !== v.id) e.currentTarget.style.borderColor = "rgba(34,197,94,0.35)"; }}
                      onMouseLeave={e => { if (vehicleType !== v.id) e.currentTarget.style.borderColor = "rgba(34,197,94,0.15)"; }}
                    >
                      <p style={{ color: vehicleType === v.id ? "#fbbf24" : "#f3f4f6", fontSize: 14, fontWeight: 600, margin: 0 }}>{v.label}</p>
                      <p style={{ color: "#6b7280", fontSize: 11, margin: 0 }}>{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={fetchTransport} disabled={transportLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {transportLoading ? <><Loader size={16} className="animate-spin" /> {t("calculating")}</> : t("calcTransport")}
            </button>

            {transport && (
              <div className="mt-4 bg-agri-dark border border-agri-gold/30 rounded-xl p-4 fade-in">
                <p className="text-agri-gold text-xs font-semibold mb-3">{t("transportEstimate")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("distance"), value: `${transport.distance_km} km` },
                    { label: t("duration"), value: `~${transport.duration_min} min` },
                    { label: t("rate"), value: `₹${transport.cost_per_km}/km` },
                    { label: t("estCost"), value: `₹${transport.estimated_cost_inr?.toLocaleString()}`, highlight: true },
                  ].map(s => (
                    <div key={s.label} className={`bg-gray-800/50 rounded-xl p-3 text-center ${s.highlight ? "bg-agri-gold/10 border border-agri-gold/30" : ""}`}>
                      <p className={`font-bold text-lg ${s.highlight ? "text-agri-gold" : "text-white"}`}>{s.value}</p>
                      <p className="text-gray-500 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
                {transport.note && <p className="text-gray-500 text-xs mt-3 italic">{transport.note}</p>}

                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-gray-400 text-xs">
                    {t("route")}: <span className="text-white">{transport.origin}</span> → <span className="text-white">{transport.destination}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-4">
            <p className="text-blue-400 text-xs font-semibold mb-2">{t("aboutCalc")}</p>
            <p className="text-gray-400 text-xs leading-relaxed">{t("aboutCalcDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
