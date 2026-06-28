import React, { useState, useEffect, useCallback } from "react";
import { getAvailableDeliveries, getAgentDeliveries, assignDelivery, updateDeliveryStatus } from "../api";
import { useLanguage } from "../context/LanguageContext";

/* ─── Status config ──────────────────────────────────────────────────────────── */
const DELIVERY_STATUS = {
  pending_assignment: { label: "⏳ Awaiting Pickup", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  assigned:          { label: "✅ Assigned",          color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  picked_up:         { label: "📦 Picked Up",          color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)" },
  in_transit:        { label: "🚚 In Transit",         color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
  delivered:         { label: "🎉 Delivered",          color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)" },
  failed:            { label: "❌ Failed",              color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
};

const NEXT_STATUS = {
  assigned:   "picked_up",
  picked_up:  "in_transit",
  in_transit: "delivered",
};

const NEXT_LABEL = {
  assigned:   "📦 Confirm Pickup",
  picked_up:  "🚚 Mark In Transit",
  in_transit: "🎉 Mark Delivered",
};

/* ─── Stat Card ─────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color = "#22c55e" }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 20, padding: "20px 22px", flex: 1, minWidth: 140,
      transition: "all 0.25s", cursor: "default",
      boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = color; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─── Available Order Card ──────────────────────────────────────────────────── */
function AvailableCard({ order, onAssign, agentId, loading, t }) {
  const [assigning, setAssigning] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    setAssigning(true);
    try {
      await onAssign(order.order_id, agentId);
      setDone(true);
    } catch { setAssigning(false); }
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18, padding: "18px 20px", transition: "all 0.2s",
      animation: "fadeIn 0.4s ease",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.background = "rgba(34,197,94,0.03)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 800,
              background: order.order_type === "bulk" ? "rgba(139,92,246,0.15)" : "rgba(34,197,94,0.12)",
              color: order.order_type === "bulk" ? "#a78bfa" : "#86efac",
              border: `1px solid ${order.order_type === "bulk" ? "rgba(139,92,246,0.3)" : "rgba(34,197,94,0.25)"}`,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>{order.order_type}</div>
            <span style={{ fontSize: 10, color: "#4b5563" }}>Order #AB{String(order.order_id).padStart(6, "0")}</span>
          </div>

          <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>
            {order.products}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>🌾</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                <span style={{ color: "#6b7280", fontWeight: 600 }}>{t("pickup")}: </span>{order.pickup_address}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>🏠</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                <span style={{ color: "#6b7280", fontWeight: 600 }}>{t("drop")}: </span>
                {order.delivery_address} ({order.buyer_name})
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#22c55e" }}>₹{order.earning}</div>
            <div style={{ fontSize: 10, color: "#4b5563" }}>earning</div>
          </div>
          {done ? (
            <div style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "rgba(34,197,94,0.15)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)",
            }}>✅ Assigned!</div>
          ) : (
            <button
              onClick={handle}
              disabled={assigning || loading}
              style={{
                padding: "9px 18px", borderRadius: 10, border: "none", fontWeight: 800,
                fontSize: 12, cursor: assigning ? "not-allowed" : "pointer", fontFamily: "inherit",
                background: assigning ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#22c55e,#16a34a)",
                color: "#fff", transition: "all 0.2s",
                boxShadow: assigning ? "none" : "0 4px 16px rgba(34,197,94,0.4)",
              }}
            >{assigning ? t("loading") : t("acceptDelivery")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── My Delivery Card ──────────────────────────────────────────────────────── */
function MyDeliveryCard({ delivery, onStatusUpdate, loading }) {
  const cfg = DELIVERY_STATUS[delivery.status] || DELIVERY_STATUS.assigned;
  const nextStatus = NEXT_STATUS[delivery.status];
  const nextLabel  = NEXT_LABEL[delivery.status];
  const [updating, setUpdating] = useState(false);

  const handle = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      await onStatusUpdate(delivery.delivery_id, nextStatus);
    } finally { setUpdating(false); }
  };

  // Timeline steps
  const STEPS = ["assigned", "picked_up", "in_transit", "delivered"];
  const currentIdx = STEPS.indexOf(delivery.status);

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: "20px 22px", transition: "all 0.2s",
      animation: "fadeIn 0.4s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            }}>{cfg.label}</span>
            <span style={{ fontSize: 10, color: "#4b5563" }}>#AB{String(delivery.order_id).padStart(6, "0")}</span>
          </div>
          <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{delivery.products}</p>
          <p style={{ color: "#6b7280", fontSize: 12 }}>🏠 {delivery.buyer_name} · {delivery.delivery_address}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e" }}>₹{delivery.earning}</div>
          <div style={{ fontSize: 10, color: "#4b5563" }}>earned</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 0 }}>
        {STEPS.map((step, idx) => {
          const isDone = idx <= currentIdx && delivery.status !== "failed";
          const isActive = idx === currentIdx && delivery.status !== "failed";
          const stepLabel = { assigned: "Assigned", picked_up: "Picked", in_transit: "Transit", delivered: "Done" }[step];
          return (
            <React.Fragment key={step}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: isDone ? cfg.color : "rgba(255,255,255,0.07)",
                  border: isActive ? `2px solid ${cfg.color}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "#fff",
                  boxShadow: isActive ? `0 0 12px ${cfg.color}60` : "none",
                  transition: "all 0.3s",
                }}>{isDone ? "✓" : ""}</div>
                <span style={{ fontSize: 9, color: isDone ? cfg.color : "#374151", fontWeight: 600, whiteSpace: "nowrap" }}>{stepLabel}</span>
              </div>
              {idx < 3 && <div style={{ flex: 1, height: 2, margin: "0 4px", marginBottom: 12, background: idx < currentIdx && delivery.status !== "failed" ? cfg.color : "rgba(255,255,255,0.06)", transition: "all 0.3s" }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Action button */}
      {nextStatus && delivery.status !== "delivered" && delivery.status !== "failed" && (
        <button
          onClick={handle}
          disabled={updating}
          style={{
            width: "100%", padding: "10px", borderRadius: 12, border: "none",
            background: updating ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg,${cfg.color},${cfg.color}cc)`,
            color: "#fff", fontWeight: 800, fontSize: 13, cursor: updating ? "not-allowed" : "pointer",
            fontFamily: "inherit", transition: "all 0.2s",
            boxShadow: updating ? "none" : `0 4px 16px ${cfg.color}40`,
          }}
        >{updating ? "Updating..." : nextLabel}</button>
      )}

      {delivery.status === "delivered" && (
        <div style={{
          padding: "10px", borderRadius: 12, textAlign: "center",
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
          fontSize: 13, fontWeight: 700, color: "#86efac",
        }}>🎉 Delivery Complete! ₹{delivery.earning} earned</div>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function DeliveryDashboard({ currentUser }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("available");
  const [available, setAvailable] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [avail, mine] = await Promise.all([
        getAvailableDeliveries(),
        getAgentDeliveries(currentUser.id),
      ]);
      setAvailable(avail.data || []);
      setMyDeliveries(mine.data || []);
    } catch { setAvailable([]); setMyDeliveries([]); }
    setLoading(false);
  }, [currentUser.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const showMsg = (msg, isErr = false) => {
    setActionMsg({ text: msg, err: isErr });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleAssign = async (orderId, agentId) => {
    try {
      await assignDelivery(orderId, agentId);
      showMsg("✅ Order assigned! Head to pickup location.");
      loadData();
    } catch (e) {
      showMsg(e?.response?.data?.detail || "Failed to assign delivery.", true);
      throw e;
    }
  };

  const handleStatusUpdate = async (deliveryId, status) => {
    try {
      await updateDeliveryStatus(deliveryId, status);
      const msgs = {
        picked_up: "📦 Pickup confirmed! Now head to delivery address.",
        in_transit: "🚚 Order is now in transit!",
        delivered: "🎉 Delivered! ₹50 earned.",
      };
      showMsg(msgs[status] || "Status updated!");
      loadData();
    } catch (e) {
      showMsg("Failed to update status.", true);
    }
  };

  // Stats
  const totalDeliveries   = myDeliveries.length;
  const completedCount    = myDeliveries.filter(d => d.status === "delivered").length;
  const activeCount       = myDeliveries.filter(d => ["assigned", "picked_up", "in_transit"].includes(d.status)).length;
  const totalEarnings     = myDeliveries.filter(d => d.status === "delivered").reduce((s, d) => s + (d.earning || 50), 0);

  const TABS = [
    { key: "available", label: t("availableOrders"), count: available.length },
    { key: "my",        label: t("myDeliveries"), count: myDeliveries.length },
    { key: "earnings",  label: t("earnings") },
  ];

  return (
    <div style={{ animation: "fadeIn 0.4s ease", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: "linear-gradient(135deg,#f97316,#ea580c)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            boxShadow: "0 8px 24px rgba(249,115,22,0.35)",
          }}>🚚</div>
          <div>
            <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 900, margin: 0 }}>
              {t("deliveryAgentPortal")}
            </h1>
            <p style={{ color: "#f97316", fontSize: 13, margin: 0, fontWeight: 600 }}>
              {currentUser?.name} · {t("deliveryAgent")}
            </p>
          </div>
          <button onClick={loadData} disabled={loading} style={{
            marginLeft: "auto", padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(249,115,22,0.3)",
            background: "rgba(249,115,22,0.08)", color: "#fb923c", fontWeight: 700, fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}>{loading ? t("refreshing") : t("refresh")}</button>
        </div>
      </div>

      {/* Action message toast */}
      {actionMsg && (
        <div style={{
          padding: "12px 18px", borderRadius: 12, marginBottom: 16, fontWeight: 700, fontSize: 13,
          background: actionMsg.err ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
          border: `1px solid ${actionMsg.err ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
          color: actionMsg.err ? "#f87171" : "#86efac",
          animation: "fadeIn 0.2s ease",
        }}>{actionMsg.text}</div>
      )}

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="🚚" label={t("totalDeliveries")} value={totalDeliveries} color="#f97316" />
        <StatCard icon="✅" label={t("completedDeliveries")} value={completedCount} color="#22c55e" />
        <StatCard icon="⏳" label={t("activeDeliveries")} value={activeCount} color="#3b82f6" />
        <StatCard icon="💰" label={t("totalEarned")} value={`₹${totalEarnings}`} color="#f59e0b" sub={`₹50 ${t("perDelivery")}`} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 18px", borderRadius: 99, fontWeight: 700, fontSize: 13,
            fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s",
            border: tab === t.key ? "1px solid #f97316" : "1px solid rgba(255,255,255,0.1)",
            background: tab === t.key ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.03)",
            color: tab === t.key ? "#fb923c" : "#6b7280",
          }}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 110, borderRadius: 18, background: "rgba(255,255,255,0.03)", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : tab === "available" ? (
        <div>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
            {available.length} order{available.length !== 1 ? "s" : ""} waiting for a delivery agent
          </p>
          {available.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "3.5rem", marginBottom: 12 }}>📭</p>
              <p style={{ color: "#9ca3af", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t("noAvailableOrders")}</p>
              <p style={{ color: "#4b5563", fontSize: 13 }}>Check back soon — new orders appear as consumers place them.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {available.map((o, i) => (
                <AvailableCard key={o.order_id} order={o} onAssign={handleAssign} agentId={currentUser.id} loading={loading} t={t} />
              ))}
            </div>
          )}
        </div>
      ) : tab === "my" ? (
        <div>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
            {myDeliveries.length} total deliveries · {activeCount} active
          </p>
          {myDeliveries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "3.5rem", marginBottom: 12 }}>🚚</p>
              <p style={{ color: "#9ca3af", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t("noMyDeliveries")}</p>
              <p style={{ color: "#4b5563", fontSize: 13 }}>Accept an order from the Available tab to get started!</p>
              <button onClick={() => setTab("available")} style={{
                marginTop: 16, padding: "10px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
                fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>{t("browseAvailable")}</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Active first */}
              {myDeliveries.filter(d => d.status !== "delivered" && d.status !== "failed").map(d => (
                <MyDeliveryCard key={d.delivery_id} delivery={d} onStatusUpdate={handleStatusUpdate} loading={loading} />
              ))}
              {/* Completed */}
              {myDeliveries.filter(d => d.status === "delivered" || d.status === "failed").map(d => (
                <MyDeliveryCard key={d.delivery_id} delivery={d} onStatusUpdate={handleStatusUpdate} loading={loading} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Earnings tab */
        <div>
          <div style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))",
            border: "1px solid rgba(249,115,22,0.25)", borderRadius: 20, padding: "24px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("totalEarned")}</p>
                <p style={{ color: "#f97316", fontSize: "2.8rem", fontWeight: 900, lineHeight: 1 }}>₹{totalEarnings}</p>
                <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>From {completedCount} completed deliveries</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  padding: "14px 20px", borderRadius: 16,
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                }}>
                  <p style={{ color: "#9ca3af", fontSize: 11, margin: "0 0 4px" }}>{t("perDelivery")}</p>
                  <p style={{ color: "#22c55e", fontSize: 26, fontWeight: 900, margin: 0 }}>₹50</p>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 style={{ color: "#9ca3af", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              {t("completedDeliveries")}
            </h3>
            {myDeliveries.filter(d => d.status === "delivered").length === 0 ? (
              <p style={{ color: "#4b5563", fontSize: 14, padding: "20px 0" }}>No completed deliveries yet.</p>
            ) : (
              myDeliveries.filter(d => d.status === "delivered").map((d, i) => (
                <div key={d.delivery_id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 18px", borderRadius: 14,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  animation: `slideUp 0.3s ${i * 0.04}s ease both`,
                }}>
                  <div>
                    <p style={{ color: "#d1d5db", fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                      🎉 {d.products?.substring(0, 40)}{d.products?.length > 40 ? "..." : ""}
                    </p>
                    <p style={{ color: "#6b7280", fontSize: 11 }}>
                      📍 {d.delivery_address} · {d.buyer_name}
                    </p>
                  </div>
                  <div style={{
                    fontSize: 16, fontWeight: 900, color: "#22c55e",
                    background: "rgba(34,197,94,0.1)", padding: "6px 14px",
                    borderRadius: 10, border: "1px solid rgba(34,197,94,0.2)",
                  }}>₹{d.earning}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
