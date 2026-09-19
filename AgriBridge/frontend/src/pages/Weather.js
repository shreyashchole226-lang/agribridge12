import React, { useState } from "react";
import { getTransportCost } from "../api";
import { Truck, Loader } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const VEHICLE_TYPES = [
  { id: "bike", label: "🏍️ Bike", desc: "< 50kg" },
  { id: "auto", label: "🛺 Auto/Tempo", desc: "50-300kg" },
  { id: "mini_truck", label: "🚛 Mini Truck", desc: "300kg-2T" },
  { id: "truck", label: "🚚 Full Truck", desc: "2T+" },
];

export default function Weather() {
  const { t } = useLanguage();

  const [origin, setOrigin] = useState("Nashik, Maharashtra");
  const [destination, setDestination] = useState("Mumbai, Maharashtra");
  const [vehicleType, setVehicleType] = useState("truck");
  const [transport, setTransport] = useState(null);
  const [transportLoading, setTransportLoading] = useState(false);

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
        <h1 className="section-title mb-1">🚛 {t("transportCalc")}</h1>
        <p className="text-gray-400 text-sm">{t("aboutCalcDesc")}</p>
      </div>

      <div className="max-w-xl">
        {/* Transport Calculator */}
        <div className="space-y-4">
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
