import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBuyerOrders, getOrderDelivery } from "../api";
import { useLanguage } from "../context/LanguageContext";

const STATUS_CONFIG = {
  pending:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "⏳", border: "rgba(245,158,11,0.3)" },
  processing: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  label: "⚙️", border: "rgba(34,197,94,0.3)" },
  shipped:    { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   label: "🚚", border: "rgba(34,197,94,0.3)" },
  delivered:  { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   label: "✅", border: "rgba(34,197,94,0.3)" },
  cancelled:  { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "❌", border: "rgba(239,68,68,0.3)" },
};

const DELIVERY_STATUS_LABELS = {
  assigned:   { label: "Agent Assigned", color: "#3b82f6", icon: "✅" },
  picked_up:  { label: "Order Picked Up", color: "#8b5cf6", icon: "📦" },
  in_transit: { label: "Out for Delivery", color: "#f97316", icon: "🚚" },
  delivered:  { label: "Delivered", color: "#22c55e", icon: "🎉" },
};

export default function MyOrdersPage({ currentUser }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deliveries, setDeliveries] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await getBuyerOrders(currentUser.id);
        const orderList = r.data || [];
        setOrders(orderList);
        // Fetch delivery info for all orders
        const delivMap = {};
        await Promise.all(orderList.map(async (o) => {
          try {
            const dr = await getOrderDelivery(o.id);
            if (dr.data?.delivery) delivMap[o.id] = dr.data.delivery;
          } catch {}
        }));
        setDeliveries(delivMap);
      } catch { setOrders([]); }
      setLoading(false);
    };
    load();
  }, [currentUser.id]);

  const statusKeys = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const tStatus = (s) => ({
    pending: t("pending"), processing: t("processing"),
    shipped: t("shipped"), delivered: t("delivered"), cancelled: t("cancelled")
  })[s] || s;

  return (
    <div style={{ animation: "fadeIn 0.4s ease", maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 900, marginBottom: "4px" }}>
            📦 {t("myOrdersTitle")}
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>{orders.length} {t("ordersCount")}</p>
        </div>
        <Link to="/marketplace" style={{
          padding: "10px 20px", borderRadius: "12px", textDecoration: "none",
          background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
          fontWeight: 700, fontSize: "13px", boxShadow: "0 4px 16px rgba(34,197,94,0.35)",
        }}>🛒 {t("shopNow")}</Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {statusKeys.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "6px 14px", borderRadius: "99px", border: "1px solid",
            borderColor: filter === s ? "#22c55e" : "rgba(255,255,255,0.1)",
            background: filter === s ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
            color: filter === s ? "#bbf7d0" : "#6b7280",
            fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.2s",
          }}>
            {s === "all" ? "All" : tStatus(s)}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: "100px", background: "rgba(255,255,255,0.03)", borderRadius: "16px", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", animation: "fadeIn 0.4s ease" }}>
          <p style={{ fontSize: "4rem", marginBottom: "16px" }}>📦</p>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.3rem", marginBottom: "8px" }}>{t("noOrders")}</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
            {filter !== "all" ? `No ${tStatus(filter)} orders` : "Start shopping fresh produce!"}
          </p>
          <Link to="/marketplace" style={{
            padding: "12px 24px", borderRadius: "12px", textDecoration: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
            fontWeight: 700, fontSize: "14px",
          }}>🛒 {t("shopNow")}</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((order, i) => {
            const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            return (
              <div key={order.id || i} style={{
                background: "rgba(255,255,255,0.02)", border: `1px solid ${s.border}`,
                borderRadius: "18px", padding: "18px 20px", transition: "all 0.2s",
                animation: `slideUp 0.4s ${i * 0.05}s ease both`,
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "14px",
                      background: s.bg, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "22px", flexShrink: 0,
                    }}>{s.label}</div>
                    <div>
                      <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "14px", marginBottom: "3px" }}>
                        {order.product_name || "Product"}
                      </p>
                      <p style={{ color: "#6b7280", fontSize: "12px", marginBottom: "3px" }}>
                        From: {order.farmer_name || "Farmer"} · Qty: {order.quantity || 1}
                      </p>
                      <p style={{ color: "#4b5563", fontSize: "11px" }}>
                        {t("orderId")}: <span style={{ fontFamily: "monospace", color: "#9ca3af" }}>AB{String(order.id).padStart(6, "0")}</span>
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      display: "inline-block", padding: "4px 12px", borderRadius: "99px", fontSize: "11px",
                      fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                      marginBottom: "8px",
                    }}>{tStatus(order.status || "pending")}</span>
                    <p style={{ color: "#22c55e", fontWeight: 900, fontSize: "16px" }}>₹{Math.round(order.total_price || 0)}</p>
                  </div>
                </div>

                {/* Order status timeline */}
                <div style={{ marginTop: "14px", display: "flex", gap: "0", alignItems: "center" }}>
                  {["pending", "processing", "shipped", "delivered"].map((stage, idx) => {
                    const stages = ["pending", "processing", "shipped", "delivered"];
                    const currentIdx = stages.indexOf(order.status);
                    const isDone = idx <= currentIdx;
                    const isActive = idx === currentIdx;
                    return (
                      <React.Fragment key={stage}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                          <div style={{
                            width: "20px", height: "20px", borderRadius: "50%",
                            background: isDone ? "#22c55e" : "rgba(255,255,255,0.08)",
                            border: isActive ? "2px solid #22c55e" : "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "9px", color: "#fff", boxShadow: isActive ? "0 0 10px rgba(34,197,94,0.5)" : "none",
                          }}>{isDone ? "✓" : ""}</div>
                          <span style={{ fontSize: "9px", color: isDone ? "#86efac" : "#4b5563", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {tStatus(stage)}
                          </span>
                        </div>
                        {idx < 3 && (
                          <div style={{ flex: 1, height: "2px", margin: "0 4px", marginBottom: "12px", background: idx < currentIdx ? "#22c55e" : "rgba(255,255,255,0.06)" }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Delivery Agent Info */}
                {deliveries[order.id] && (() => {
                  const d = deliveries[order.id];
                  const dlvCfg = DELIVERY_STATUS_LABELS[d.status];
                  if (!dlvCfg) return null;
                  return (
                    <div style={{
                      marginTop: 12, padding: "10px 14px", borderRadius: 12,
                      background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span style={{ fontSize: 18 }}>{dlvCfg.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: dlvCfg.color, margin: 0 }}>{dlvCfg.label}</p>
                        <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                          Agent: <span style={{ color: "#9ca3af", fontWeight: 600 }}>{d.agent_name}</span>
                          {d.agent_location ? ` · ${d.agent_location}` : ""}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 10, padding: "3px 8px", borderRadius: 99, fontWeight: 700,
                        background: `${dlvCfg.color}18`, color: dlvCfg.color, border: `1px solid ${dlvCfg.color}30`,
                      }}>🚚 Tracked</span>
                    </div>
                  );
                })()}

                <button onClick={() => navigate("/marketplace")} style={{
                  marginTop: "12px", padding: "7px 16px", borderRadius: "8px", fontSize: "12px",
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                  color: "#bbf7d0",
                }}>🔄 {t("reorder")}</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

