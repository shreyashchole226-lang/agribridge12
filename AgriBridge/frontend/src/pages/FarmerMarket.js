import React, { useState, useEffect, useCallback } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct, getFarmerProducts, getFarmerOrders } from "../api";
import { useLanguage } from "../context/LanguageContext";
import {
  Plus, Package, Edit2, Trash2, X, TrendingUp,
  ShoppingBag, AlertCircle, Search, IndianRupee, Layers,
  Star, Tag, ChevronRight, Sparkles, BarChart2, Mic, MicOff
} from "lucide-react";

const CATEGORIES = ["Vegetable", "Fruit", "Grain", "Pulse", "Spice", "Herb", "Leafy Green", "Dairy"];
const UNITS = ["kg", "g", "dozen", "piece", "litre", "bunch", "quintal"];
const CATEGORY_EMOJI = { Vegetable:"🥦", Fruit:"🍎", Grain:"🌾", Pulse:"🫘", Spice:"🌶️", Herb:"🌿", "Leafy Green":"🥬", Dairy:"🥛" };
const CATEGORY_COLORS = {
  Vegetable:"#22c55e", Fruit:"#f59e0b", Grain:"#d97706", Pulse:"#8b5cf6",
  Spice:"#ef4444", Herb:"#10b981", "Leafy Green":"#4ade80", Dairy:"#60a5fa"
};

const EMPTY_FORM = {
  name: "", category: "Vegetable", description: "", unit: "kg",
  retail_price: "", bulk_price: "", stock_qty: "", min_bulk_qty: 10,
  image_url: ""
};

/* ── Toast ───────────────────────────────────────────────────────── */
function Toast({ message, onClose }) {
  if (!message) return null;
  const isError = message.startsWith("❌");
  return (
    <div style={{
      position: "fixed", top: "20px", right: "20px", zIndex: 200,
      background: isError ? "rgba(127,29,29,0.95)" : "rgba(5,46,22,0.95)",
      border: `1px solid ${isError ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.4)"}`,
      borderRadius: "16px", padding: "14px 20px", color: "#fff",
      fontWeight: 700, fontSize: "14px", boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
      backdropFilter: "blur(12px)", animation: "slideInRight 0.3s ease",
      display: "flex", alignItems: "center", gap: "10px", minWidth: "240px"
    }}>
      <span style={{ fontSize: 20 }}>{isError ? "⚠️" : "✅"}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 0 }}>
        <X size={16} />
      </button>
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: `linear-gradient(135deg, ${color}14, ${color}06)`,
      border: `1px solid ${color}28`, borderRadius: "20px", padding: "22px",
      display: "flex", alignItems: "center", gap: "16px",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.25s", position: "relative", overflow: "hidden"
    }}
    onMouseEnter={e => { if(onClick) e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${color}22`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%", background:`radial-gradient(circle, ${color}18, transparent)`, pointerEvents:"none" }} />
      <div style={{ width:52, height:52, borderRadius:16, background:`${color}1a`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 20px ${color}30` }}>
        {React.cloneElement(icon, { size: 22, color })}
      </div>
      <div>
        <p style={{ color:"#6b7280", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{label}</p>
        <p style={{ color:"#f3f4f6", fontSize:"1.6rem", fontWeight:900, lineHeight:1 }}>{value}</p>
        {sub && <p style={{ color, fontSize:11, marginTop:4, fontWeight:600 }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Product Modal ────────────────────────────────────────────────── */
function ProductModal({ initial, onSave, onClose, loading }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const accent = CATEGORY_COLORS[form.category] || "#22c55e";

  const inputStyle = {
    width:"100%", padding:"11px 14px", borderRadius:12,
    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
    color:"#f3f4f6", fontSize:13, outline:"none", boxSizing:"border-box",
    transition:"all 0.2s", fontFamily:"inherit"
  };
  const labelStyle = { color:"#6b7280", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, display:"block" };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:70, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }} onClick={onClose} />
      <div style={{
        position:"relative", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto",
        background:"linear-gradient(180deg, #0a1a0d 0%, #060d08 100%)",
        border:`1px solid ${accent}40`, borderRadius:24,
        boxShadow:`0 32px 80px rgba(0,0,0,0.8), 0 0 40px ${accent}18`,
        animation:"slideUp 0.3s var(--ease-bounce)"
      }}>
        {/* Glow top */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${accent}, transparent)`, borderRadius:"24px 24px 0 0" }} />

        {/* Header */}
        <div style={{ padding:"22px 24px 18px", borderBottom:`1px solid rgba(255,255,255,0.07)`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#0a1a0d", borderRadius:"24px 24px 0 0", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`${accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
              {CATEGORY_EMOJI[form.category] || "🌾"}
            </div>
            <div>
              <h2 style={{ color:"#fff", fontWeight:900, fontSize:"1.1rem", margin:0 }}>
                {initial ? t("editProduct") : t("addProduct")}
              </h2>
              <p style={{ color:accent, fontSize:11, margin:0, fontWeight:600 }}>{form.category}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#9ca3af" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>{t("productName")} *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Fresh Tomatoes" style={inputStyle}
              onFocus={e => e.target.style.borderColor = accent + "60"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>

          {/* Category + Unit */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={labelStyle}>{t("categoryLabel")} *</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c} style={{ background:"#060d08" }}>{CATEGORY_EMOJI[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t("unit")} *</label>
              <select value={form.unit} onChange={e => set("unit", e.target.value)} style={inputStyle}>
                {UNITS.map(u => <option key={u} value={u} style={{ background:"#060d08" }}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>{t("description")}</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Describe your product — freshness, origin, quality…"
              style={{ ...inputStyle, resize:"none" }} rows={3}
              onFocus={e => e.target.style.borderColor = accent + "60"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
          </div>

          {/* Prices */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={labelStyle}>{t("retailPrice")} *</label>
              <input type="number" value={form.retail_price} onChange={e => set("retail_price", e.target.value)}
                placeholder="e.g. 45" style={inputStyle} min={0}
                onFocus={e => e.target.style.borderColor = "#22c55e60"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div>
              <label style={labelStyle}>{t("bulkPrice")}</label>
              <input type="number" value={form.bulk_price} onChange={e => set("bulk_price", e.target.value)}
                placeholder="e.g. 38" style={inputStyle} min={0}
                onFocus={e => e.target.style.borderColor = "#f59e0b60"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
          </div>

          {/* Stock + Min bulk */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={labelStyle}>{t("stockQty")} *</label>
              <input type="number" value={form.stock_qty} onChange={e => set("stock_qty", e.target.value)}
                placeholder="e.g. 200" style={inputStyle} min={0} />
            </div>
            <div>
              <label style={labelStyle}>{t("minBulkQty")}</label>
              <input type="number" value={form.min_bulk_qty} onChange={e => set("min_bulk_qty", e.target.value)}
                placeholder="e.g. 50" style={inputStyle} min={1} />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label style={labelStyle}>{t("imageUrl")}</label>
            <input value={form.image_url} onChange={e => set("image_url", e.target.value)}
              placeholder="https://…" style={inputStyle} />
          </div>

          {/* Image preview */}
          {form.image_url && (
            <div style={{ position:"relative", borderRadius:14, overflow:"hidden", height:140, border:`1px solid ${accent}30` }}>
              <img src={form.image_url} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e => e.target.style.display = "none"} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
              <span style={{ position:"absolute", bottom:8, left:12, color:"#fff", fontSize:11, fontWeight:700 }}>Preview</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px 22px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:10 }}>
          <button onClick={onClose} style={{
            flex:1, padding:"13px", borderRadius:12, background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.1)", color:"#9ca3af", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit"
          }}>{t("cancelBtn")}</button>
          <button onClick={() => onSave(form)} disabled={loading || !form.name || !form.retail_price || !form.stock_qty} style={{
            flex:2, padding:"13px", borderRadius:12,
            background: !form.name || !form.retail_price || !form.stock_qty ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            border:"none", color:"#fff", fontWeight:800, cursor:"pointer", fontSize:13,
            boxShadow: form.name && form.retail_price && form.stock_qty ? `0 4px 20px ${accent}50` : "none",
            transition:"all 0.2s", fontFamily:"inherit"
          }}>
            {loading ? t("loading") : initial ? `✓ ${t("saveChanges")}` : `🌾 ${t("addProduct")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Product Card (grid view) ─────────────────────────────────────── */
function ProductCard({ product, onEdit, onDelete }) {
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);
  const accent = CATEGORY_COLORS[product.category] || "#22c55e";
  const emoji = CATEGORY_EMOJI[product.category] || "🌾";
  const stockColor = product.stock_qty > 50 ? "#22c55e" : product.stock_qty > 10 ? "#f59e0b" : "#ef4444";
  const isTopSeller = (product.avg_rating || 0) >= 4.5 && (product.review_count || 0) >= 5;
  const isLowStock = (product.stock_qty || 0) <= 10 && (product.stock_qty || 0) > 0;
  const isNew = !product.review_count || product.review_count === 0;

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${product.name}" from your listings?`)) return;
    setDeleting(true);
    try { await onDelete(product.id); }
    catch { setDeleting(false); }
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 20, overflow: "hidden", transition: "all 0.3s",
      position: "relative", display: "flex", flexDirection: "column",
      animation: "fadeIn 0.4s ease"
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}45`; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.5), 0 0 24px ${accent}18`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Top accent line */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity:0.7, zIndex:1 }} />

      {/* Image */}
      <div style={{ position:"relative", height:160, overflow:"hidden", flexShrink:0 }}>
        <img
          src={product.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400"}
          alt={product.name}
          style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.5s" }}
          onError={e => e.target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400"}
          onMouseEnter={e => e.target.style.transform = "scale(1.06)"}
          onMouseLeave={e => e.target.style.transform = ""}
        />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(6,13,8,0.95) 0%, rgba(6,13,8,0.2) 50%, transparent 100%)" }} />

        {/* Badge */}
        <div style={{ position:"absolute", top:10, left:10, display:"flex", gap:4, flexWrap:"wrap" }}>
          {isTopSeller && <span style={{ background:"rgba(245,158,11,0.9)", color:"#000", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:99, backdropFilter:"blur(4px)" }}>🏆 TOP</span>}
          {isLowStock && <span style={{ background:"rgba(239,68,68,0.9)", color:"#fff", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:99 }}>⚠️ LOW</span>}
          {isNew && <span style={{ background:"rgba(139,92,246,0.9)", color:"#fff", fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:99 }}>✨ NEW</span>}
        </div>

        {/* Action buttons overlay */}
        <div style={{ position:"absolute", top:10, right:10, display:"flex", gap:6 }}>
          <button onClick={() => onEdit(product)} title="Edit" style={{
            width:32, height:32, borderRadius:10, border:"1px solid rgba(59,130,246,0.4)",
            background:"rgba(0,0,0,0.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(4px)", transition:"all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.3)"; e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.7)"; e.currentTarget.style.transform = ""; }}
          >
            <Edit2 size={13} color="#60a5fa" />
          </button>
          <button onClick={handleDelete} disabled={deleting} title="Delete" style={{
            width:32, height:32, borderRadius:10, border:"1px solid rgba(239,68,68,0.4)",
            background:"rgba(0,0,0,0.7)", cursor:deleting ? "not-allowed" : "pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(4px)", transition:"all 0.2s", opacity:deleting ? 0.5 : 1
          }}
          onMouseEnter={e => { if(!deleting) { e.currentTarget.style.background = "rgba(239,68,68,0.3)"; e.currentTarget.style.transform = "scale(1.1)"; }}}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.7)"; e.currentTarget.style.transform = ""; }}
          >
            <Trash2 size={13} color="#f87171" />
          </button>
        </div>

        {/* Category chip */}
        <div style={{ position:"absolute", bottom:10, left:10 }}>
          <span style={{ background:`${accent}22`, border:`1px solid ${accent}40`, color:accent, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, backdropFilter:"blur(4px)" }}>
            {emoji} {product.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:"14px 16px", flex:1, display:"flex", flexDirection:"column", gap:10 }}>
        <div>
          <p style={{ color:"#f3f4f6", fontWeight:800, fontSize:15, marginBottom:2 }}>{product.name}</p>
          {product.description && <p style={{ color:"#6b7280", fontSize:12, lineHeight:1.4 }} title={product.description}>
            {product.description.length > 60 ? product.description.slice(0,60) + "…" : product.description}
          </p>}
        </div>

        {/* Prices */}
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
            <p style={{ color:"#6b7280", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>{t("retailLabel")}</p>
            <p style={{ color:"#22c55e", fontWeight:900, fontSize:16 }}>₹{product.retail_price}</p>
            <p style={{ color:"#374151", fontSize:9 }}>{t("perUnit")} {product.unit}</p>
          </div>
          {product.bulk_price && (
            <div style={{ flex:1, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:12, padding:"10px 12px", textAlign:"center" }}>
              <p style={{ color:"#6b7280", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>{t("bulkLabel")}</p>
              <p style={{ color:"#f59e0b", fontWeight:900, fontSize:16 }}>₹{product.bulk_price}</p>
              <p style={{ color:"#374151", fontSize:9 }}>{t("minBulk")} {product.min_bulk_qty}{product.unit}</p>
            </div>
          )}
        </div>

        {/* Stock + Rating */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:stockColor, boxShadow:`0 0 6px ${stockColor}` }} />
            <span style={{ color:stockColor, fontSize:12, fontWeight:700 }}>{product.stock_qty} {product.unit}</span>
            <span style={{ color:"#4b5563", fontSize:11 }}>{t("inStock")}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <Star size={12} fill="#f59e0b" color="#f59e0b" />
            <span style={{ color:"#fbbf24", fontSize:12, fontWeight:700 }}>{product.avg_rating || "—"}</span>
            <span style={{ color:"#4b5563", fontSize:11 }}>({product.review_count || 0})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main FarmerMarket ───────────────────────────────────────────────── */
export default function FarmerMarket({ currentUser }) {
  const { t } = useLanguage();
  const [products, setProducts]   = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [search, setSearch]       = useState("");
  const [listening, setListening]  = useState(false);
  const [filterCat, setFilterCat] = useState("All");
  const [toast, setToast]         = useState("");
  const [tab, setTab]             = useState("products");
  const [viewMode, setViewMode]   = useState("grid"); // "grid" | "table"

  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast("❌ Voice search requires Chrome browser."); return; }
    const r = new SR(); r.lang = "en-IN"; r.interimResults = false;
    setListening(true); r.start();
    r.onresult = (e) => { setSearch(e.results[0][0].transcript); setListening(false); };
    r.onerror = r.onend = () => setListening(false);
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let prods = [];
      try {
        const r = await getFarmerProducts(currentUser.id);
        prods = r.data;
      } catch {
        const r = await getProducts();
        prods = r.data.filter(p => p.farmer_id === currentUser.id || p.farmer_name === currentUser.name);
      }
      setProducts(prods);
      try {
        const o = await getFarmerOrders(currentUser.id);
        setOrders(o.data || []);
      } catch { setOrders([]); }
    } catch {}
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const handleSave = async (form) => {
    if (!form.name.trim()) { showToast("❌ Product name is required."); return; }
    if (!form.retail_price || Number(form.retail_price) <= 0) { showToast("❌ Enter a valid retail price."); return; }
    setSaving(true);
    try {
      const payload = {
        name:         form.name.trim(),
        category:     form.category,
        description:  form.description || "",
        unit:         form.unit,
        retail_price: Number(form.retail_price),
        bulk_price:   Number(form.bulk_price) || Number(form.retail_price),
        stock_qty:    Number(form.stock_qty) || 0,
        min_bulk_qty: Number(form.min_bulk_qty) || 10,
        image_url:    form.image_url || "",
      };
      if (editProduct) {
        await updateProduct(editProduct.id, payload);
        showToast("✅ Product updated successfully!");
      } else {
        await createProduct(payload, currentUser.id);
        showToast("✅ Product listed on marketplace!");
      }
      setShowModal(false);
      setEditProduct(null);
      await loadData();
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to save. Check backend.";
      showToast(`❌ ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast("🗑️ Product removed.");
    } catch { showToast("❌ Could not delete."); }
  };

  const filtered = products.filter(p =>
    (filterCat === "All" || p.category === filterCat) &&
    (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRevenue = orders.reduce((s, o) => s + (o.total_price || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const lowStock = products.filter(p => p.stock_qty < 10).length;
  const activeCategories = [...new Set(products.map(p => p.category))];

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <Toast message={toast} onClose={() => setToast("")} />

      {/* ── Radial glow bg */}
      <div style={{ position:"fixed", top:0, right:0, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(34,197,94,0.04), transparent)", pointerEvents:"none", zIndex:0 }} />

      {/* ── Page Hero Header ── */}
      <div style={{
        background:"linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.03) 50%, transparent 100%)",
        border:"1px solid rgba(34,197,94,0.15)", borderRadius:24, padding:"28px 32px", marginBottom:28,
        display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16,
        position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(34,197,94,0.1), transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(34,197,94,0.4), transparent)" }} />
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🌾</div>
            <h1 style={{ fontSize:"1.9rem", fontWeight:900, color:"#fff", letterSpacing:"-0.02em", margin:0 }}>{t("myListings")}</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ color:"#6b7280", fontSize:14 }}>{products.length} {t("productsLabel")} ·</span>
            {activeCategories.slice(0,3).map(c => (
              <span key={c} style={{ background:`${CATEGORY_COLORS[c]}18`, border:`1px solid ${CATEGORY_COLORS[c]}35`, color:CATEGORY_COLORS[c], fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:99 }}>
                {CATEGORY_EMOJI[c]} {c}
              </span>
            ))}
            {activeCategories.length > 3 && <span style={{ color:"#4b5563", fontSize:11 }}>+{activeCategories.length - 3} more</span>}
          </div>
        </div>
        <button onClick={() => { setEditProduct(null); setShowModal(true); }} style={{
          display:"flex", alignItems:"center", gap:8, padding:"13px 24px",
          borderRadius:16, border:"none", cursor:"pointer",
          background:"linear-gradient(135deg, #22c55e, #16a34a)",
          color:"#fff", fontWeight:800, fontSize:14, fontFamily:"inherit",
          boxShadow:"0 6px 24px rgba(34,197,94,0.45)", transition:"all 0.2s"
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(34,197,94,0.55)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 24px rgba(34,197,94,0.45)"; }}
        >
          <Plus size={18} /> {t("addProduct")}
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))", gap:16, marginBottom:28 }}>
        <StatCard icon={<Package />} label={t("myListings")} value={products.length} sub={t("myListings")} color="#22c55e" onClick={() => setTab("products")} />
        <StatCard icon={<IndianRupee />} label={t("totalRevenue")} value={`₹${Math.round(totalRevenue).toLocaleString()}`} sub={t("fromOrders")} color="#f59e0b" />
        <StatCard icon={<ShoppingBag />} label={t("totalOrders")} value={orders.length} sub={`${pendingOrders} ${t("pendingOrders")}`} color="#3b82f6" onClick={() => setTab("orders")} />
        <StatCard icon={<AlertCircle />} label={t("lowStockAlert")} value={lowStock} sub={lowStock > 0 ? t("needsActionLabel") : "All good ✓"} color={lowStock > 0 ? "#ef4444" : "#22c55e"} />
      </div>

      {/* ── Tab Nav ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,0.04)", borderRadius:14, padding:4, border:"1px solid rgba(255,255,255,0.07)" }}>
          {[["products", `📦 ${t("myListings")}`], ["orders", `🛒 ${t("orders")}`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding:"9px 20px", borderRadius:10, border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
              background: tab === key ? "linear-gradient(135deg, #22c55e, #16a34a)" : "transparent",
              color: tab === key ? "#fff" : "#6b7280",
              transition:"all 0.2s", fontFamily:"inherit",
              boxShadow: tab === key ? "0 4px 12px rgba(34,197,94,0.3)" : "none"
            }}>{label}</button>
          ))}
        </div>

        {tab === "products" && (
          <div style={{ display:"flex", gap:6 }}>
            {["grid", "table"].map(m => (
              <button key={m} onClick={() => setViewMode(m)} title={m + " view"} style={{
                width:34, height:34, borderRadius:10, border:`1px solid ${viewMode === m ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.1)"}`,
                background: viewMode === m ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                color: viewMode === m ? "#22c55e" : "#6b7280", fontSize:14, transition:"all 0.2s"
              }}>
                {m === "grid" ? "⊞" : "☰"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === "products" && (
        <>
          {/* Search + Filter */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
            <div style={{ position:"relative", flex:1, minWidth:200 }}>
              <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#6b7280" }} />
              <input type="text" placeholder={t("searchListings")} value={search} onChange={e => setSearch(e.target.value)} style={{
                width:"100%", padding:"11px 42px 11px 38px", borderRadius:12, background:"rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.1)", color:"#f3f4f6", fontSize:13, outline:"none", boxSizing:"border-box",
                transition:"all 0.2s", fontFamily:"inherit"
              }}
              onFocus={e => e.target.style.borderColor = "rgba(34,197,94,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              <button onClick={startVoiceSearch} title="Voice search" style={{
                position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                background: listening ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)",
                border:`1px solid ${listening ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)"}`,
                borderRadius:8, width:28, height:28, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                animation: listening ? "pulse 1s infinite" : "none",
              }}>
                <span style={{ fontSize:12 }}>{listening ? "🔴" : "🎙️"}</span>
              </button>
            </div>

            {/* Category pills */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {["All", ...CATEGORIES].map(cat => {
                const active = filterCat === cat;
                const color = CATEGORY_COLORS[cat] || "#22c55e";
                return (
                  <button key={cat} onClick={() => setFilterCat(cat)} style={{
                    padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer",
                    background: active ? color : `${color}10`,
                    color: active ? "#fff" : color,
                    border:`1px solid ${active ? color : color + "30"}`,
                    transition:"all 0.15s", fontFamily:"inherit",
                    boxShadow: active ? `0 4px 12px ${color}40` : "none"
                  }}>
                    {cat !== "All" && CATEGORY_EMOJI[cat]} {cat === "All" ? t("allCategories") : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listing counter */}
          {!loading && filtered.length > 0 && (
            <p style={{ color:"#4b5563", fontSize:12, marginBottom:14, fontWeight:600 }}>
              {t("showingProducts")} <span style={{ color:"#22c55e" }}>{filtered.length}</span> {t("forSearch")} {products.length} {t("productsLabel")}
            </p>
          )}

          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:16 }}>
              {Array(6).fill(0).map((_,i) => (
                <div key={i} style={{ height:320, background:"rgba(255,255,255,0.03)", borderRadius:20,
                  backgroundImage:"linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
                  backgroundSize:"200% 100%", animation:"shimmer 1.8s infinite" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 20px" }}>
              <div style={{ width:80, height:80, borderRadius:24, background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:36 }}>🌾</div>
              <p style={{ fontSize:"1.2rem", fontWeight:800, color:"#f3f4f6", marginBottom:6 }}>
                {products.length === 0 ? t("noListings") : t("noProductsFound")}
              </p>
              <p style={{ color:"#6b7280", fontSize:14, marginBottom:24 }}>
                {products.length === 0 ? t("addFirstProduct") : t("tryDifferentFilters")}
              </p>
              {products.length === 0 && (
                <button onClick={() => setShowModal(true)} style={{
                  padding:"13px 28px", borderRadius:14, border:"none",
                  background:"linear-gradient(135deg, #22c55e, #16a34a)",
                  color:"#fff", fontWeight:800, cursor:"pointer", fontSize:14,
                  boxShadow:"0 6px 24px rgba(34,197,94,0.4)", fontFamily:"inherit"
                }}>+ {t("addFirstProduct")}</button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:16 }}>
              {filtered.map(p => (
                <ProductCard key={p.id} product={p}
                  onEdit={p => { setEditProduct(p); setShowModal(true); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            /* Table view */
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {/* Table header */}
              <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 100px 100px 90px 100px 80px", gap:10, padding:"6px 16px 8px", marginBottom:2 }}>
                {["", "Product", "Retail", "Bulk", "Stock", "Rating", "Actions"].map((h, i) => (
                  <p key={i} style={{ color:"#4b5563", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", textAlign:i >= 2 ? "center" : "left", margin:0 }}>{h}</p>
                ))}
              </div>
              {filtered.map(p => {
                const accent = CATEGORY_COLORS[p.category] || "#22c55e";
                const stockColor = p.stock_qty > 50 ? "#22c55e" : p.stock_qty > 10 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={p.id} style={{
                    display:"grid", gridTemplateColumns:"60px 1fr 100px 100px 90px 100px 80px",
                    alignItems:"center", gap:10, padding:"14px 16px",
                    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)",
                    borderRadius:14, transition:"all 0.2s", animation:"fadeIn 0.3s ease"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}30`; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  >
                    <img src={p.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=80"} alt={p.name}
                      style={{ width:52, height:52, borderRadius:10, objectFit:"cover" }}
                      onError={e => e.target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=80"} />
                    <div>
                      <p style={{ color:"#f3f4f6", fontWeight:700, fontSize:14, margin:"0 0 4px" }}>{p.name}</p>
                      <span style={{ background:`${accent}18`, color:accent, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99 }}>{CATEGORY_EMOJI[p.category]} {p.category}</span>
                    </div>
                    <p style={{ color:"#22c55e", fontWeight:800, fontSize:15, textAlign:"center", margin:0 }}>₹{p.retail_price}<span style={{ color:"#4b5563", fontSize:10, fontWeight:400 }}>/{p.unit}</span></p>
                    <p style={{ color:"#f59e0b", fontWeight:700, fontSize:14, textAlign:"center", margin:0 }}>₹{p.bulk_price || "—"}</p>
                    <p style={{ color:stockColor, fontWeight:800, fontSize:15, textAlign:"center", margin:0 }}>{p.stock_qty}</p>
                    <p style={{ textAlign:"center", margin:0 }}><span style={{ color:"#f59e0b" }}>⭐</span> <span style={{ color:"#fff", fontWeight:700 }}>{p.avg_rating || "—"}</span></p>
                    <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                      <button onClick={() => { setEditProduct(p); setShowModal(true); }} style={{ width:30, height:30, borderRadius:8, border:"1px solid rgba(59,130,246,0.35)", background:"rgba(59,130,246,0.1)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Edit2 size={12} color="#60a5fa" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} style={{ width:30, height:30, borderRadius:8, border:"1px solid rgba(239,68,68,0.35)", background:"rgba(239,68,68,0.1)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Trash2 size={12} color="#f87171" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── ORDERS TAB ── */}
      {tab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 20px" }}>
              <div style={{ width:80, height:80, borderRadius:24, background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:36 }}>🛒</div>
              <p style={{ fontSize:"1.2rem", fontWeight:800, color:"#f3f4f6", marginBottom:6 }}>{t("noOrdersYet")}</p>
              <p style={{ color:"#6b7280", fontSize:14 }}>Orders from buyers will appear here</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {orders.map(o => {
                const statusColor = o.status === "delivered" ? "#22c55e" : o.status === "pending" ? "#f59e0b" : "#3b82f6";
                return (
                  <div key={o.id} style={{
                    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:16, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
                    transition:"all 0.2s", animation:"fadeIn 0.3s ease"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = `${statusColor}30`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  >
                    <div style={{ width:44, height:44, borderRadius:12, background:`${statusColor}18`, border:`1px solid ${statusColor}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:20 }}>
                      {o.status === "delivered" ? "✅" : o.status === "pending" ? "⏳" : "📦"}
                    </div>
                    <div style={{ flex:1, minWidth:140 }}>
                      <p style={{ color:"#f3f4f6", fontWeight:700, fontSize:15, margin:"0 0 2px" }}>{o.product_name || "Product"}</p>
                      <p style={{ color:"#6b7280", fontSize:12, margin:0 }}>from {o.buyer_name || "Buyer"}</p>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <p style={{ color:"#6b7280", fontSize:11, margin:"0 0 2px" }}>Quantity</p>
                      <p style={{ color:"#fff", fontWeight:700, margin:0 }}>{o.quantity}</p>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <p style={{ color:"#6b7280", fontSize:11, margin:"0 0 2px" }}>Total</p>
                      <p style={{ color:"#22c55e", fontWeight:800, fontSize:16, margin:0 }}>₹{Math.round(o.total_price || 0).toLocaleString()}</p>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <p style={{ color:"#6b7280", fontSize:11, margin:"0 0 4px" }}>Type</p>
                      <span style={{
                        padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700,
                        background: o.order_type === "bulk" ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.1)",
                        color: o.order_type === "bulk" ? "#fbbf24" : "#86efac",
                        border: o.order_type === "bulk" ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(34,197,94,0.3)"
                      }}>{o.order_type || "retail"}</span>
                    </div>
                    <span style={{
                      padding:"5px 14px", borderRadius:99, fontSize:11, fontWeight:700,
                      background:`${statusColor}18`, color:statusColor, border:`1px solid ${statusColor}35`
                    }}>{o.status || "pending"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ProductModal
          initial={editProduct}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
          loading={saving}
        />
      )}
    </div>
  );
}

