import React, { useState, useEffect, useRef, useCallback } from "react";
import { getConversation, sendMessage, getUsers, detectFarmerStress, getSchemes } from "../api";
import { Send, MessageCircle, User, Heart, Phone, ExternalLink, ShieldAlert, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// ─── Counsellor Data ──────────────────────────────────────────────────────────
const COUNSELLORS = [
  { name: "Kisan Call Centre", phone: "1800-180-1551", hours: "24/7 Free", lang: "All Indian languages", type: "govt" },
  { name: "iCall (TISS)", phone: "9152987821", hours: "Mon–Sat, 8am–10pm", lang: "Hindi, English", type: "mental" },
  { name: "Vandrevala Foundation", phone: "1860-2662-345", hours: "24/7", lang: "Hindi, English, Marathi", type: "mental" },
  { name: "NABARD Agri Helpline", phone: "1800-200-7789", hours: "Mon–Fri, 9am–6pm", lang: "All Indian languages", type: "finance" },
];

// ─── Stress Level Config ──────────────────────────────────────────────────────
const STRESS_CONFIG = {
  Low:      { color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.25)", label: "Calm",      icon: "🌱" },
  Moderate: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.3)",  label: "Worried",   icon: "😟" },
  High:     { color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.35)", label: "Distressed",icon: "😰" },
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.45)",  label: "Crisis",    icon: "🆘" },
};

export default function ChatPage({ currentUser }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [schemes, setSchemes] = useState([]);

  // Stress detector state
  const [stressData, setStressData] = useState(null);
  const [showSupportPanel, setShowSupportPanel] = useState(false);
  const [supportTab, setSupportTab] = useState("schemes"); // "schemes" | "counsellors"
  const [showSchemes, setShowSchemes] = useState(false);
  const [stressAnalysing, setStressAnalysing] = useState(false);
  const [dismissedLevel, setDismissedLevel] = useState(null);

  // For response delay tracking
  const lastSentAt = useRef(null);
  const bottomRef = useRef();

  useEffect(() => { loadUsers(); loadSchemes(); }, []);

  useEffect(() => {
    if (selectedUser) {
      setStressData(null);
      setShowSupportPanel(false);
      setDismissedLevel(null);
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUsers = async () => {
    const r = await getUsers();
    setUsers(r.data.filter(u => u.id !== currentUser.id));
  };

  const loadSchemes = async () => {
    try {
      const r = await getSchemes();
      setSchemes(r.data);
    } catch {}
  };

  const loadMessages = async () => {
    if (!selectedUser) return;
    const r = await getConversation(currentUser.id, selectedUser.id);
    setMessages(r.data);
  };

  // ── Silent stress analysis after every send ──────────────────────────────
  const runStressDetection = useCallback(async (allMessages, delaySec = 0) => {
    if (allMessages.length < 2) return;
    setStressAnalysing(true);
    try {
      // Build role-mapped messages for the AI (farmer = user, others = assistant)
      const mapped = allMessages.slice(-10).map(m => ({
        role: m.sender_id === currentUser.id ? "user" : "assistant",
        content: m.content,
      }));
      const r = await detectFarmerStress(mapped, delaySec);
      const data = r.data;
      if (data.success && data.stress_score >= 3) {
        setStressData(data);
        // Auto-show panel for High/Critical if not dismissed
        if ((data.stress_level === "High" || data.stress_level === "Critical") &&
            data.stress_level !== dismissedLevel) {
          setShowSupportPanel(true);
          setSupportTab(data.recommended_action === "show_counsellor" || data.stress_level === "Critical"
            ? "counsellors" : "schemes");
        }
      } else {
        setStressData(data && data.stress_score < 3 ? { ...data, stress_level: "Low" } : null);
      }
    } catch {}
    setStressAnalysing(false);
  }, [currentUser.id, dismissedLevel]);

  const handleSend = async () => {
    if (!input.trim() || !selectedUser || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    const delaySec = lastSentAt.current
      ? Math.round((Date.now() - lastSentAt.current) / 1000)
      : 0;
    lastSentAt.current = Date.now();
    try {
      await sendMessage({ sender_id: currentUser.id, receiver_id: selectedUser.id, content });
      const r = await getConversation(currentUser.id, selectedUser.id);
      setMessages(r.data);
      // Fire stress detection silently in background
      runStressDetection(r.data, delaySec);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const roleColor = (role) => {
    if (role === "farmer") return "bg-agri-lime text-agri-dark";
    if (role === "business") return "bg-agri-gold text-black";
    return "bg-blue-500 text-white";
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const cfg = stressData ? STRESS_CONFIG[stressData.stress_level] || STRESS_CONFIG.Low : null;

  // Filter schemes by stress detector keywords
  const relevantSchemes = stressData?.relevant_scheme_keywords?.length
    ? schemes.filter(s => stressData.relevant_scheme_keywords.some(kw =>
        s.title.toLowerCase().includes(kw.toLowerCase()) ||
        s.description.toLowerCase().includes(kw.toLowerCase())
      ))
    : schemes.slice(0, 3);

  return (
    <div className="fade-in" style={{ position: "relative" }}>
      <div className="mb-5">
        <h1 className="section-title mb-1">{t("chatTitle")}</h1>
        <p className="text-gray-400 text-sm">
          {t("chatSubtitle")}
          <span style={{ color: "#4ade80", fontSize: "11px", marginLeft: "10px" }}>
            🛡️ AI Stress Monitor Active
          </span>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", height: "640px" }}>

        {/* ── User List ─────────────────────────────────────── */}
        <div className="card" style={{ overflowY: "auto" }}>
          <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
            <User size={15} className="text-agri-lime" /> {t("chatTitle").replace("💬 ", "")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 12px", borderRadius: "14px", cursor: "pointer",
                  background: selectedUser?.id === u.id ? "rgba(74,222,128,0.12)" : "transparent",
                  border: selectedUser?.id === u.id ? "1px solid rgba(74,222,128,0.35)" : "1px solid transparent",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  background: "rgba(74,222,128,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: "#4ade80", fontWeight: "bold", fontSize: "14px", flexShrink: 0,
                }}>
                  {u.name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: "#fff", fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${roleColor(u.role)}`}>{u.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Chat Window + Support Panel ───────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: 0 }}>

          {/* Stress Banner — shown when stress >= Moderate */}
          {stressData && stressData.stress_score >= 3 && cfg && stressData.stress_level !== dismissedLevel && (
            <div style={{
              padding: "12px 16px",
              borderRadius: "14px",
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              display: "flex", alignItems: "center", gap: "12px",
              animation: "fadeIn 0.4s ease",
            }}>
              <span style={{ fontSize: "20px" }}>{cfg.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: cfg.color, fontWeight: 600, fontSize: "13px", marginBottom: "2px" }}>
                  {stressData.stress_level === "Critical" ? "🆘 Crisis Alert — " : ""}
                  Stress Detected: {cfg.label}
                  {stressAnalysing && <span style={{ color: "#6b7280", fontSize: "11px", marginLeft: "8px" }}>Analysing…</span>}
                </p>
                <p style={{ color: "#9ca3af", fontSize: "12px" }}>{stressData.empathy_message}</p>
              </div>
              <button
                onClick={() => setShowSupportPanel(v => !v)}
                style={{
                  background: cfg.color, color: "#000", fontSize: "11px",
                  fontWeight: 700, padding: "5px 12px", borderRadius: "8px",
                  border: "none", cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {showSupportPanel ? "Hide Help" : "Get Help"}
              </button>
              <button
                onClick={() => { setDismissedLevel(stressData.stress_level); setShowSupportPanel(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px" }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Support Panel */}
          {showSupportPanel && stressData && cfg && (
            <div style={{
              borderRadius: "16px",
              background: "rgba(15,46,26,0.6)",
              border: `1px solid ${cfg.border}`,
              backdropFilter: "blur(12px)",
              overflow: "hidden",
              animation: "slideDown 0.3s ease",
            }}>
              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {[
                  { key: "schemes",     label: "🏛️ Govt Schemes" },
                  { key: "counsellors", label: "📞 Agri Counsellors" },
                ].map(t => (
                  <button key={t.key} onClick={() => setSupportTab(t.key)} style={{
                    flex: 1, padding: "10px", fontSize: "12px", fontWeight: 600,
                    background: supportTab === t.key ? cfg.bg : "transparent",
                    color: supportTab === t.key ? cfg.color : "#6b7280",
                    border: "none", cursor: "pointer",
                    borderBottom: supportTab === t.key ? `2px solid ${cfg.color}` : "2px solid transparent",
                    transition: "all 0.2s",
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: "14px", maxHeight: "200px", overflowY: "auto" }}>
                {supportTab === "schemes" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stressData.relevant_scheme_keywords?.length > 0 && (
                      <p style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>
                        💡 Suggested based on your conversation
                      </p>
                    )}
                    {relevantSchemes.length === 0 && (
                      <p style={{ color: "#6b7280", fontSize: "12px" }}>Loading relevant schemes…</p>
                    )}
                    {relevantSchemes.map(s => (
                      <div key={s.id} style={{
                        background: "rgba(255,255,255,0.04)", borderRadius: "10px",
                        padding: "10px 12px", border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
                      }}>
                        <div>
                          <p style={{ color: "#fff", fontWeight: 600, fontSize: "12px" }}>{s.title}</p>
                          <p style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px" }}>{s.benefit_amount} · {s.eligibility}</p>
                        </div>
                        <a href={s.apply_link} target="_blank" rel="noopener noreferrer" style={{
                          color: cfg.color, fontSize: "11px", fontWeight: 600,
                          display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap",
                          background: cfg.bg, padding: "4px 8px", borderRadius: "6px",
                          border: `1px solid ${cfg.border}`, textDecoration: "none",
                        }}>
                          Apply <ExternalLink size={10} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {supportTab === "counsellors" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <p style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>
                      🤝 Trained advisors ready to help — all calls are confidential
                    </p>
                    {COUNSELLORS.map(c => (
                      <div key={c.name} style={{
                        background: "rgba(255,255,255,0.04)", borderRadius: "10px",
                        padding: "10px 12px", border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "center", gap: "12px",
                      }}>
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "50%",
                          background: c.type === "mental" ? "rgba(139,92,246,0.2)" :
                                      c.type === "finance" ? "rgba(251,191,36,0.2)" : "rgba(74,222,128,0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          fontSize: "16px",
                        }}>
                          {c.type === "mental" ? "🧠" : c.type === "finance" ? "💰" : "📞"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#fff", fontWeight: 600, fontSize: "12px" }}>{c.name}</p>
                          <p style={{ color: "#9ca3af", fontSize: "11px" }}>{c.hours} · {c.lang}</p>
                        </div>
                        <a href={`tel:${c.phone}`} style={{
                          color: "#4ade80", fontSize: "12px", fontWeight: 700,
                          display: "flex", alignItems: "center", gap: "5px",
                          background: "rgba(74,222,128,0.1)", padding: "5px 10px",
                          borderRadius: "8px", border: "1px solid rgba(74,222,128,0.25)",
                          textDecoration: "none",
                        }}>
                          <Phone size={11} /> {c.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Chat Card */}
          <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "14px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", fontWeight: "bold" }}>
                    {selectedUser.name[0]}
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>{selectedUser.name}</p>
                    <p style={{ color: "#6b7280", fontSize: "11px", textTransform: "capitalize" }}>{selectedUser.role} · {selectedUser.location}</p>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Stress indicator dot */}
                    {stressData && (
                      <div
                        onClick={() => setShowSupportPanel(v => !v)}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          background: cfg?.bg, border: `1px solid ${cfg?.border}`,
                          padding: "4px 10px", borderRadius: "20px", cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        title={`Stress Level: ${stressData.stress_level} (${stressData.stress_score}/10)`}
                      >
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: cfg?.color, boxShadow: `0 0 6px ${cfg?.color}` }} />
                        <span style={{ color: cfg?.color, fontSize: "11px", fontWeight: 600 }}>{cfg?.label}</span>
                        {stressAnalysing && <span style={{ color: "#6b7280", fontSize: "10px" }}>●</span>}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div className="w-2 h-2 bg-agri-lime rounded-full pulse-green" />
                      <span style={{ color: "#6b7280", fontSize: "11px" }}>{t("online")}</span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
                  {messages.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
                      <MessageCircle size={40} style={{ marginBottom: "12px", opacity: 0.25 }} />
                      <p style={{ fontSize: "14px" }}>{t("noMessages")}</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === currentUser.id;
                      return (
                        <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                            {!isMe && <span style={{ color: "#6b7280", fontSize: "11px", marginBottom: "3px", marginLeft: "4px" }}>{msg.sender_name}</span>}
                            <div style={{
                              padding: "10px 14px", borderRadius: "18px", fontSize: "13px",
                              background: isMe ? "linear-gradient(135deg,#16a34a,#4ade80)" : "rgba(255,255,255,0.07)",
                              color: isMe ? "#fff" : "#e5e7eb",
                              borderBottomRightRadius: isMe ? "4px" : "18px",
                              borderBottomLeftRadius: isMe ? "18px" : "4px",
                            }}>
                              {msg.content}
                            </div>
                            <span style={{ color: "#4b5563", fontSize: "10px", marginTop: "3px" }}>{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Quick Messages */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "10px 0 8px" }}>
                  {["What's your best price?", "Can you deliver?", "Available in bulk?", "Let's finalize the deal!"].map(q => (
                    <button key={q} onClick={() => setInput(q)} style={{
                      fontSize: "11px", background: "rgba(255,255,255,0.05)",
                      color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)",
                      padding: "4px 10px", borderRadius: "20px", cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#4ade80"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input Row */}
                <div style={{ display: "flex", gap: "8px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder={`Message ${selectedUser.name}…`}
                    className="input-field"
                    style={{ flex: 1, fontSize: "13px" }}
                  />
                  <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary" style={{ padding: "0 16px" }}>
                    <Send size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
                <MessageCircle size={52} style={{ marginBottom: "16px", opacity: 0.18 }} />
                <p style={{ color: "#9ca3af", fontWeight: 500, marginBottom: "6px" }}>{t("selectConversation")}</p>
                <p style={{ fontSize: "12px" }}>AI Stress Monitor watches every conversation quietly</p>
                <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "12px", padding: "10px 16px" }}>
                  <ShieldAlert size={16} style={{ color: "#4ade80" }} />
                  <span style={{ color: "#9ca3af", fontSize: "12px" }}>Detects financial distress, crop failure language & emotional crisis — then quietly surfaces help</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  );
}
