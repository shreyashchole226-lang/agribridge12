import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, addReview, getProductReviews } from "../api";
import { useLanguage } from "../context/LanguageContext";
import {
  ShoppingCart, Star, Package, Search, X, Plus, Minus,
  Trash2, CheckCircle, ChevronRight, Heart, SlidersHorizontal,
  TrendingUp, ChevronDown, Filter, ArrowUpDown
} from "lucide-react";

const CATEGORIES = ["All", "Vegetable", "Fruit", "Grain", "Pulse", "Spice", "Herb", "Leafy Green", "Dairy"];

/* ── Star Rating ─────────────────────────────────────────────────────── */
function StarRating({ rating, onRate, interactive = false, size = 14 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size}
          style={{ cursor: interactive ? "pointer" : "default",
            color: s <= (interactive ? hovered || rating : rating) ? "#f59e0b" : "#374151",
            fill:  s <= (interactive ? hovered || rating : rating) ? "#f59e0b" : "none",
            transition: "all 0.15s" }}
          onMouseEnter={() => interactive && setHovered(s)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate && onRate(s)}
        />
      ))}
    </div>
  );
}

/* ── Wishlist hook ───────────────────────────────────────────────────── */
function useWishlist() {
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agribridge_wishlist") || "[]"); }
    catch { return []; }
  });
  const toggle = useCallback((id) => {
    setWishlist(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem("agribridge_wishlist", JSON.stringify(next));
      return next;
    });
  }, []);
  return { wishlist, toggle };
}

/* ── Filter Panel ────────────────────────────────────────────────────── */
function FilterPanel({ filters, setFilters, onClose }) {
  const { t } = useLanguage();
  const SORT_OPTIONS_I18N = () => [
    { label: t("newestFirst"),  value: "newest" },
    { label: t("priceLowHigh"), value: "price_asc" },
    { label: t("priceHighLow"), value: "price_desc" },
    { label: t("topRated"),     value: "rating" },
    { label: t("inStock"),      value: "stock" },
  ];
  const [local, setLocal] = useState(filters);
  const apply = () => { setFilters(local); onClose(); };
  const reset = () => { setLocal({ category: "All", priceMin: 0, priceMax: 500, minRating: 0, sort: "newest", inStockOnly: false }); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "340px", background: "#060f08", borderLeft: "1px solid rgba(34,197,94,0.2)",
        height: "100%", display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        overflowY: "auto"
      }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SlidersHorizontal size={18} color="#22c55e" />
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff" }}>{t("filters")}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Category */}
          <div>
            <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>{t("categoryLabel")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setLocal(l => ({ ...l, category: cat }))} style={{
                  padding: "5px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  background: local.category === cat ? "#22c55e" : "rgba(34,197,94,0.08)",
                  color: local.category === cat ? "#fff" : "#bbf7d0",
                  border: `1px solid ${local.category === cat ? "#22c55e" : "rgba(34,197,94,0.2)"}`,
                  transition: "all 0.15s"
                }}>{cat === "All" ? t("allCategories") : cat}</button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              {t("priceRange")}: <span style={{ color: "#22c55e" }}>₹{local.priceMin} – ₹{local.priceMax}</span>
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <input type="range" min={0} max={500} step={10} value={local.priceMin}
                onChange={e => setLocal(l => ({ ...l, priceMin: Number(e.target.value) }))}
                style={{ flex: 1, accentColor: "#22c55e" }} />
              <input type="range" min={0} max={500} step={10} value={local.priceMax}
                onChange={e => setLocal(l => ({ ...l, priceMax: Number(e.target.value) }))}
                style={{ flex: 1, accentColor: "#22c55e" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
              <span>₹0</span><span>₹500+</span>
            </div>
          </div>

          {/* Min Rating */}
          <div>
            <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>{t("minimumRating")}</p>
            <div style={{ display: "flex", gap: "6px" }}>
              {[0,1,2,3,4].map(r => (
                <button key={r} onClick={() => setLocal(l => ({ ...l, minRating: r }))} style={{
                  padding: "5px 10px", borderRadius: "8px", fontSize: "12px", cursor: "pointer",
                  background: local.minRating === r ? "#f59e0b" : "rgba(245,158,11,0.08)",
                  color: local.minRating === r ? "#000" : "#fbbf24",
                  border: `1px solid ${local.minRating === r ? "#f59e0b" : "rgba(245,158,11,0.2)"}`,
                  fontWeight: 600, transition: "all 0.15s"
                }}>{r === 0 ? t("allCategories") : `${r}★+`}</button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>{t("sortBy")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {SORT_OPTIONS_I18N().map(opt => (
                <button key={opt.value} onClick={() => setLocal(l => ({ ...l, sort: opt.value }))} style={{
                  padding: "8px 14px", borderRadius: "10px", fontSize: "13px", cursor: "pointer", textAlign: "left",
                  background: local.sort === opt.value ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
                  color: local.sort === opt.value ? "#bbf7d0" : "#6b7280",
                  border: `1px solid ${local.sort === opt.value ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.06)"}`,
                  fontWeight: local.sort === opt.value ? 700 : 400, transition: "all 0.15s"
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* In Stock only */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setLocal(l => ({ ...l, inStockOnly: !l.inStockOnly }))} style={{
              width: "40px", height: "22px", borderRadius: "99px", border: "none", cursor: "pointer",
              background: local.inStockOnly ? "#22c55e" : "#374151",
              position: "relative", transition: "all 0.2s"
            }}>
              <span style={{
                position: "absolute", top: "3px", left: local.inStockOnly ? "20px" : "3px",
                width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
                transition: "left 0.2s"
              }} />
            </button>
            <span style={{ color: "#d1d5db", fontSize: "13px" }}>{t("inStockOnly")}</span>
          </div>
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid #1f2937", display: "flex", gap: "10px" }}>
          <button onClick={reset} style={{
            flex: 1, padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)",
            border: "1px solid #374151", color: "#9ca3af", fontWeight: 600, cursor: "pointer", fontSize: "13px"
          }}>{t("resetBtn")}</button>
          <button onClick={apply} style={{
            flex: 2, padding: "10px", borderRadius: "10px", background: "#22c55e",
            border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "13px"
          }}>{t("applyFilters")}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Cart Sidebar ────────────────────────────────────────────── */
function CartSidebar({ cart, onUpdateQty, onRemove, onClose }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg]     = useState("");
  const [discountPct, setDiscountPct] = useState(0);

  const COUPONS = { FRESH10: 10, AGRI20: 20, FARM15: 15, KISAN5: 5 };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (COUPONS[code]) {
      setDiscountPct(COUPONS[code]);
      setCouponMsg(t("couponApplied") + ` ${COUPONS[code]}% off!`);
    } else {
      setCouponMsg(t("couponInvalid"));
      setDiscountPct(0);
    }
  };

  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = subtotal * (discountPct / 100);
  const afterDis    = subtotal - discountAmt;
  const gstAmt      = afterDis * 0.05;
  const total       = afterDis + gstAmt;

  const handleCheckout = () => {
    localStorage.setItem("agribridge_cart", JSON.stringify(cart));
    navigate("/checkout", { state: { cart, coupon: couponInput.toUpperCase(), discountPct } });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", width: "100%", maxWidth: "420px", background: "#060f08",
        borderLeft: "1px solid rgba(34,197,94,0.2)", display: "flex", flexDirection: "column",
        height: "100%", boxShadow: "-12px 0 48px rgba(0,0,0,0.6)", animation: "slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)"
      }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShoppingCart size={20} color="#22c55e" />
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#fff" }}>{t("myCart")}</span>
            <span style={{ background: "#22c55e", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "1px 8px", borderRadius: "99px" }}>
              {cart.reduce((s,i) => s+i.qty, 0)}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#4b5563" }}>
              <ShoppingCart size={56} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
              <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "6px" }}>{t("cartEmpty")}</p>
              <p style={{ fontSize: "13px" }}>{t("addFreshProduce")}</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "12px", display: "flex", gap: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <img src={item.image_url || "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=80"} alt={item.name}
                style={{ width: "60px", height: "60px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}
                onError={e => e.target.src = "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=80"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#fff", fontWeight: 600, fontSize: "14px", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                <p style={{ color: "#6b7280", fontSize: "12px", marginBottom: "8px" }}>₹{item.price}/{item.unit}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0a1a0f", borderRadius: "8px", padding: "4px 10px" }}>
                    <button onClick={() => onUpdateQty(item.id, item.qty-1)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 0 }}><Minus size={13} /></button>
                    <span style={{ color: "#fff", fontWeight: 700, width: "20px", textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => onUpdateQty(item.id, item.qty+1)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 0 }}><Plus size={13} /></button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#86efac", fontWeight: 700, fontSize: "14px" }}>₹{Math.round(item.price * item.qty)}</span>
                    <button onClick={() => onRemove(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #1f2937" }}>
            {/* Coupon code */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input value={couponInput} onChange={e => setCouponInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyCoupon()}
                placeholder="Coupon code (e.g. FRESH10)"
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f3f4f6", fontSize: "12px", outline: "none", fontFamily: "inherit"
                }} />
              <button onClick={applyCoupon} style={{
                padding: "8px 12px", borderRadius: "10px", border: "none",
                background: "rgba(34,197,94,0.15)", color: "#86efac",
                fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
              }}>Apply</button>
            </div>
            {couponMsg && (
              <p style={{ fontSize: "11px", marginBottom: "8px", color: discountPct > 0 ? "#86efac" : "#f87171" }}>{couponMsg}</p>
            )}
            {/* Price breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280", fontSize: "12px" }}>{t("subtotal")}</span>
                <span style={{ color: "#fff", fontSize: "12px" }}>₹{Math.round(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#22c55e", fontSize: "12px" }}>🎟️ {discountPct}% off</span>
                  <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: 700 }}>-₹{Math.round(discountAmt)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280", fontSize: "12px" }}>{t("gstLabel")}</span>
                <span style={{ color: "#6b7280", fontSize: "12px" }}>₹{Math.round(gstAmt)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280", fontSize: "12px" }}>{t("delivery")}</span>
                <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: 700 }}>{t("deliveryFree")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: "14px" }}>{t("total")}</span>
                <span style={{ color: "#22c55e", fontWeight: 900, fontSize: "16px" }}>₹{Math.round(total)}</span>
              </div>
            </div>
            <p style={{ color: "#4b5563", fontSize: "10px", textAlign: "center", marginBottom: "10px" }}>🚚 {t("estDelivery")}</p>
            <button onClick={handleCheckout} style={{
              width: "100%", padding: "14px", borderRadius: "12px", border: "none",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#fff", fontWeight: 800, fontSize: "15px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: "0 4px 20px rgba(34,197,94,0.4)", fontFamily: "inherit",
            }}>
              {t("proceedToCheckout")} · ₹{Math.round(total)}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


const CATEGORY_COLORS_CM = {
  All:"#22c55e", Vegetable:"#22c55e", Fruit:"#f59e0b", Grain:"#d97706",
  Pulse:"#8b5cf6", Spice:"#ef4444", Herb:"#10b981", "Leafy Green":"#4ade80", Dairy:"#60a5fa"
};
const CATEGORY_EMOJI_CM = { All:"🌿", Vegetable:"🥦", Fruit:"🍎", Grain:"🌾", Pulse:"🫘", Spice:"🌶️", Herb:"🌿", "Leafy Green":"🥬", Dairy:"🥛" };

/* ── Product Card ────────────────────────────────────────────────────── */
function ProductCard({ product, onAddToCart, cartQty, wishlisted, onWishlist, currentUser }) {
  const { t } = useLanguage();
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews]         = useState([]);
  const [myRating, setMyRating]       = useState(0);
  const [myComment, setMyComment]     = useState("");
  const [added, setAdded]             = useState(false);
  const accent = CATEGORY_COLORS_CM[product.category] || "#22c55e";
  const emoji  = CATEGORY_EMOJI_CM[product.category] || "🌿";

  const handleAdd = () => {
    onAddToCart(product, product.retail_price);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const loadReviews = async () => {
    try { const r = await getProductReviews(product.id); setReviews(r.data); }
    catch {}
  };

  const handleReview = async () => {
    if (!myRating) return;
    try {
      await addReview({ product_id: product.id, reviewer_id: currentUser.id, farmer_id: product.farmer_id, rating: myRating, comment: myComment });
      setMyRating(0); setMyComment(""); loadReviews();
    } catch {}
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.07)`,
      borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column",
      transition: "all 0.3s ease", position: "relative",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = `0 20px 56px rgba(0,0,0,0.5), 0 0 30px ${accent}15`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Accent line top */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity:0.8, zIndex:1 }} />

      {/* Image */}
      <div style={{ position:"relative", height:200, overflow:"hidden", flexShrink:0 }}>
        <img src={product.image_url || "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400"} alt={product.name}
          style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.5s ease" }}
          onError={e => e.target.src = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400"}
          onMouseEnter={e => e.target.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.target.style.transform = "scale(1)"}
        />
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(to top, rgba(6,13,8,0.95) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)` }} />

        {/* Category badge */}
        <div style={{ position:"absolute", top:10, left:10, background:`${accent}22`, border:`1px solid ${accent}50`, color:accent, fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:99, backdropFilter:"blur(8px)" }}>
          {emoji} {product.category}
        </div>

        {/* Wishlist */}
        <button onClick={() => onWishlist(product.id)} style={{
          position:"absolute", top:10, right:10, background:wishlisted ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.7)",
          border:`1px solid ${wishlisted ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
          borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", backdropFilter:"blur(8px)", transition:"all 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
        onMouseLeave={e => e.currentTarget.style.transform = ""}
        >
          <Heart size={16} style={{ color:wishlisted ? "#ef4444" : "#9ca3af", fill:wishlisted ? "#ef4444" : "none", transition:"all 0.2s" }} />
        </button>

        {/* Direct from farmer */}
        <div style={{ position:"absolute", bottom:10, left:10, display:"flex", gap:6 }}>
          <span style={{ background:"rgba(34,197,94,0.85)", color:"#fff", fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:99, backdropFilter:"blur(4px)" }}>🌾 {t("farmFreshBadge")}</span>
          {cartQty > 0 && <span style={{ background:`${accent}cc`, color:"#fff", fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:99, backdropFilter:"blur(4px)" }}>{cartQty} {t("inCart")}</span>}
        </div>

        {/* Rating overlay */}
        {product.avg_rating > 0 && (
          <div style={{ position:"absolute", bottom:10, right:10, background:"rgba(0,0,0,0.75)", borderRadius:99, padding:"3px 10px", display:"flex", alignItems:"center", gap:4, backdropFilter:"blur(4px)" }}>
            <Star size={11} fill="#f59e0b" color="#f59e0b" />
            <span style={{ color:"#fbbf24", fontSize:12, fontWeight:700 }}>{product.avg_rating}</span>
            <span style={{ color:"#6b7280", fontSize:10 }}>({product.review_count})</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding:"16px", flex:1, display:"flex", flexDirection:"column", gap:10 }}>
        <div>
          <h3 style={{ color:"#f3f4f6", fontWeight:800, fontSize:16, marginBottom:2 }}>{product.name}</h3>
          <p style={{ color:"#6b7280", fontSize:12 }}>by <span style={{ color:`${accent}cc`, fontWeight:600 }}>{product.farmer_name}</span></p>
        </div>

        {/* Price row */}
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1, background:`${accent}10`, border:`1px solid ${accent}28`, borderRadius:14, padding:"10px 12px" }}>
            <p style={{ color:"#6b7280", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>{t("retailLabel")}</p>
            <p style={{ color:accent, fontSize:18, fontWeight:900, lineHeight:1 }}>₹{product.retail_price}</p>
            <p style={{ color:"#374151", fontSize:9, marginTop:2 }}>{t("perUnit")} {product.unit}</p>
          </div>
          {product.bulk_price && product.bulk_price < product.retail_price && (
            <div style={{ flex:1, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:14, padding:"10px 12px" }}>
              <p style={{ color:"#6b7280", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>{t("bulkLabel")}</p>
              <p style={{ color:"#f59e0b", fontSize:18, fontWeight:900, lineHeight:1 }}>₹{product.bulk_price}</p>
              <p style={{ color:"#374151", fontSize:9, marginTop:2 }}>{t("minBulk")} {product.min_bulk_qty}{product.unit}</p>
            </div>
          )}
        </div>

        {/* Stock bar */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${Math.min(100, (product.stock_qty/500)*100)}%`, background:product.stock_qty > 50 ? "#22c55e" : product.stock_qty > 10 ? "#f59e0b" : "#ef4444", borderRadius:99, transition:"width 0.5s" }} />
          </div>
          <span style={{ color:product.stock_qty > 50 ? "#22c55e" : product.stock_qty > 10 ? "#f59e0b" : "#ef4444", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{product.stock_qty} {product.unit}</span>
        </div>

        {/* Add to Cart */}
        <button onClick={handleAdd} style={{
          width:"100%", padding:"12px", borderRadius:14, border:"none", cursor:"pointer",
          background: added ? `${accent}20` : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          color: added ? accent : "#fff", fontWeight:800, fontSize:14,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          border: added ? `1px solid ${accent}50` : "none",
          boxShadow: added ? "none" : `0 6px 20px ${accent}45`,
          transition:"all 0.2s", fontFamily:"inherit"
        }}
        onMouseEnter={e => { if(!added) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => e.currentTarget.style.transform = ""}
        >
          {added ? <><CheckCircle size={16} /> {t("addedToCart")}</> : <><ShoppingCart size={16} /> {t("addToCart")}</>}
        </button>

        {/* Reviews toggle */}
        <button onClick={() => { setShowReviews(v => !v); if (!showReviews) loadReviews(); }} style={{
          background:"none", border:"none", color:`${accent}cc`, fontSize:12, cursor:"pointer",
          padding:"2px 0", display:"flex", alignItems:"center", gap:5, fontFamily:"inherit",
          transition:"color 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.color = accent}
        onMouseLeave={e => e.currentTarget.style.color = `${accent}cc`}
        >
          <Star size={12} />
          {showReviews ? t("hideReviews") : `${t("reviewsRate")} (${product.review_count || 0})`}
        </button>

        {showReviews && (
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:12, display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:12 }}>
              <p style={{ color:"#d1d5db", fontSize:12, fontWeight:700, marginBottom:8 }}>{t("yourReview")}</p>
              <StarRating rating={myRating} onRate={setMyRating} interactive size={20} />
              <textarea value={myComment} onChange={e => setMyComment(e.target.value)} placeholder={t("shareExperience")}
                style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"#d1d5db", padding:"9px 12px", fontSize:12, marginTop:8, resize:"none", boxSizing:"border-box", fontFamily:"inherit", outline:"none" }} rows={2} />
              <button onClick={handleReview} style={{ width:"100%", marginTop:8, padding:"9px", borderRadius:10, background:`linear-gradient(135deg, ${accent}, ${accent}cc)`, border:"none", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                {t("submitReview")}
              </button>
            </div>
            {reviews.map(r => (
              <div key={r.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ color:"#d1d5db", fontSize:12, fontWeight:700 }}>{r.reviewer_name}</span>
                  <StarRating rating={r.rating} />
                </div>
                {r.comment && <p style={{ color:"#6b7280", fontSize:11, lineHeight:1.5 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Consumer Market ─────────────────────────────────────────────── */
export default function ConsumerMarket({ currentUser }) {
  const { t } = useLanguage();
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [listening, setListening]  = useState(false);

  // Voice Search via Web Speech API
  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice search not supported in this browser. Try Chrome."); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.start();
    recognition.onresult  = (e) => { setSearch(e.results[0][0].transcript); setListening(false); };
    recognition.onerror   = ()  => setListening(false);
    recognition.onend     = ()  => setListening(false);
  };
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters]     = useState({ category: "All", priceMin: 0, priceMax: 500, minRating: 0, sort: "newest", inStockOnly: false });

  // Cart
  const [cart, setCart]         = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Wishlist
  const { wishlist, toggle: toggleWishlist } = useWishlist();

  useEffect(() => { loadProducts(); }, [filters.category]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const r = await getProducts(filters.category !== "All" ? filters.category : null);
      setProducts(r.data);
    } catch {}
    setLoading(false);
  };

  // Apply all filters + sort
  const filtered = products
    .filter(p =>
      (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())) &&
      (p.retail_price >= filters.priceMin && p.retail_price <= filters.priceMax) &&
      (p.avg_rating >= filters.minRating) &&
      (!filters.inStockOnly || p.stock_qty > 0)
    )
    .sort((a, b) => {
      if (filters.sort === "price_asc")  return a.retail_price - b.retail_price;
      if (filters.sort === "price_desc") return b.retail_price - a.retail_price;
      if (filters.sort === "rating")     return b.avg_rating - a.avg_rating;
      if (filters.sort === "stock")      return b.stock_qty - a.stock_qty;
      return b.id - a.id; // newest
    });

  const handleAddToCart = useCallback((product, price) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      return ex ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
               : [...prev, { ...product, price, qty: 1 }];
    });
  }, []);

  const handleUpdateQty = useCallback((id, qty) => {
    setCart(prev => qty <= 0 ? prev.filter(i => i.id !== id) : prev.map(i => i.id === id ? { ...i, qty } : i));
  }, []);

  const handleRemove = useCallback((id) => setCart(prev => prev.filter(i => i.id !== id)), []);


  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const activeFilterCount = (filters.category !== "All" ? 1 : 0) + (filters.priceMin > 0 || filters.priceMax < 500 ? 1 : 0) + (filters.minRating > 0 ? 1 : 0) + (filters.inStockOnly ? 1 : 0);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* ── Premium Hero Header */}
      <div style={{
        background:"linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.03) 60%, transparent 100%)",
        border:"1px solid rgba(34,197,94,0.15)", borderRadius:24, padding:"28px 32px", marginBottom:28,
        display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16,
        position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"absolute", top:-50, right:-50, width:220, height:220, borderRadius:"50%", background:"radial-gradient(circle, rgba(34,197,94,0.1), transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:"linear-gradient(90deg, transparent, rgba(34,197,94,0.4), transparent)" }} />
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:"rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:"0 0 16px rgba(34,197,94,0.3)" }}>🛒</div>
            <h1 style={{ fontSize:"1.9rem", fontWeight:900, color:"#fff", letterSpacing:"-0.02em", margin:0 }}>{t("freshMarket")}</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ color:"#6b7280", fontSize:14 }}>{t("farmFreshDirect")} ·</span>
            <span style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#4ade80", fontSize:12, fontWeight:700, padding:"2px 10px", borderRadius:99 }}>🌿 {products.length} {t("productsLabel")}</span>
          </div>
        </div>

        {/* Cart Button - premium */}
        <button onClick={() => setCartOpen(true)} style={{
          display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderRadius:18,
          background: cartCount > 0 ? "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))" : "rgba(255,255,255,0.05)",
          border:`1px solid ${cartCount > 0 ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
          cursor:"pointer", color:"#fff", position:"relative", transition:"all 0.2s",
          boxShadow: cartCount > 0 ? "0 4px 20px rgba(34,197,94,0.2)" : "none"
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
        >
          <div style={{ position:"relative" }}>
            <ShoppingCart size={22} color={cartCount > 0 ? "#4ade80" : "#9ca3af"} />
            {cartCount > 0 && (
              <span style={{ position:"absolute", top:-8, right:-8, background:"#ef4444", color:"#fff", fontSize:10, fontWeight:900, width:18, height:18, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #060d08" }}>{cartCount}</span>
            )}
          </div>
          <div style={{ textAlign:"left" }}>
            <p style={{ fontWeight:800, fontSize:14, color:"#fff", margin:0 }}>{t("myCart")}</p>
            {cartCount > 0 && <p style={{ color:"#4ade80", fontSize:12, margin:0 }}>₹{Math.round(cartTotal)} · {cartCount} item{cartCount !== 1 ? "s" : ""}</p>}
          </div>
          {cartCount > 0 && <ChevronRight size={16} color="#4ade80" />}
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
          <input type="text" placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "11px 44px 11px 38px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f3f4f6", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          {/* Voice search mic button */}
          <button onClick={startVoiceSearch} title="Search by voice" style={{
            position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
            background: listening ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.3)"}`,
            borderRadius: "8px", padding: "4px 7px", cursor: "pointer",
            animation: listening ? "pulse 1s infinite" : "none",
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: "14px" }}>{listening ? "🔴" : "🎙️"}</span>
          </button>
        </div>

        <button onClick={() => setShowFilters(true)} style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "12px",
          background: activeFilterCount > 0 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${activeFilterCount > 0 ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
          color: activeFilterCount > 0 ? "#bbf7d0" : "#9ca3af", cursor: "pointer", fontWeight: 600, fontSize: "13px", transition: "all 0.2s"
        }}>
          <SlidersHorizontal size={16} />
          {t("filters")}
          {activeFilterCount > 0 && (
            <span style={{ background: "#22c55e", color: "#fff", fontSize: "10px", fontWeight: 800, padding: "1px 6px", borderRadius: "99px" }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Quick sort */}
        <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} style={{
          padding: "10px 14px", borderRadius: "12px", background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)", color: "#d1d5db", fontSize: "13px", cursor: "pointer"
        }}>
          <option value="newest" style={{ background: "#060d08" }}>{t("newestFirst")}</option>
          <option value="price_asc" style={{ background: "#060d08" }}>{t("priceLowHigh")}</option>
          <option value="price_desc" style={{ background: "#060d08" }}>{t("priceHighLow")}</option>
          <option value="rating" style={{ background: "#060d08" }}>{t("topRated")}</option>
          <option value="stock" style={{ background: "#060d08" }}>{t("inStock")}</option>
        </select>
      </div>

      {/* Category chips - premium colored pills */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {CATEGORIES.map(cat => {
          const catColor = CATEGORY_COLORS_CM[cat] || "#22c55e";
          const isActive = filters.category === cat;
          return (
            <button key={cat} onClick={() => setFilters(f => ({ ...f, category: cat }))} style={{
              padding:"7px 16px", borderRadius:99, fontSize:12, fontWeight:700, cursor:"pointer",
              background: isActive ? catColor : `${catColor}12`,
              color: isActive ? (cat === "Grain" || cat === "Fruit" ? "#1a0a00" : "#fff") : catColor,
              border:`1px solid ${isActive ? catColor : catColor + "35"}`,
              transition:"all 0.18s", fontFamily:"inherit",
              boxShadow: isActive ? `0 4px 12px ${catColor}45` : "none"
            }}
            onMouseEnter={e => { if(!isActive) { e.currentTarget.style.background = `${catColor}22`; e.currentTarget.style.transform = "translateY(-1px)"; }}}
            onMouseLeave={e => { if(!isActive) { e.currentTarget.style.background = `${catColor}12`; e.currentTarget.style.transform = ""; }}}
            >{CATEGORY_EMOJI_CM[cat]} {cat === "All" ? t("allCategories") : cat}</button>
          );
        })}
      </div>

      {/* Results count */}
      {!loading && (
        <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "16px" }}>
          {t("showingProducts")} <span style={{ color: "#86efac", fontWeight: 700 }}>{filtered.length}</span> {t("productsLabel")}
          {search && <> {t("forSearch")} "<span style={{ color: "#fff" }}>{search}</span>"</>}
        </p>
      )}

      {/* Wishlist strip */}
      {wishlist.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "10px 14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Heart size={14} color="#f87171" style={{ fill: "#f87171" }} />
          <span style={{ color: "#f87171", fontSize: "13px", fontWeight: 600 }}>{wishlist.length} {wishlist.length !== 1 ? t("itemsInWishlist") : t("itemInWishlist")}</span>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "18px" }}>
          {Array(8).fill(0).map((_, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "18px", padding: "16px", animation: "pulse 1.5s infinite" }}>
              <div style={{ background: "#0a1a0f", height: "180px", borderRadius: "12px", marginBottom: "12px" }} />
              <div style={{ background: "#0a1a0f", height: "14px", borderRadius: "6px", marginBottom: "8px" }} />
              <div style={{ background: "#0a1a0f", height: "12px", borderRadius: "6px", width: "60%" }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "18px" }}>
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} currentUser={currentUser}
              onAddToCart={handleAddToCart}
              cartQty={cart.find(i => i.id === p.id)?.qty || 0}
              wishlisted={wishlist.includes(p.id)}
              onWishlist={toggleWishlist}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px 20px", color: "#4b5563" }}>
              <Package size={56} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
              <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "6px" }}>{t("noProductsFound")}</p>
              <p style={{ fontSize: "13px" }}>{t("tryDifferentFilters")}</p>
              <button onClick={() => { setSearch(""); setFilters({ category: "All", priceMin: 0, priceMax: 500, minRating: 0, sort: "newest", inStockOnly: false }); }}
                style={{ marginTop: "16px", padding: "8px 20px", borderRadius: "10px", background: "#22c55e", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {t("clearFilters")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}

      {/* Cart Sidebar */}
      {cartOpen && (
        <CartSidebar cart={cart} onUpdateQty={handleUpdateQty} onRemove={handleRemove}
          onClose={() => setCartOpen(false)}
        />
      )}

      {/* Floating Cart */}
      {cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 40,
          display: "flex", alignItems: "center", gap: "10px", padding: "14px 22px",
          borderRadius: "18px", border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          color: "#fff", fontWeight: 800, fontSize: "14px",
          boxShadow: "0 8px 32px rgba(34,197,94,0.5)", animation: "bounceIn 0.4s ease"
        }}>
          <ShoppingCart size={18} />
          {cartCount} item{cartCount !== 1 ? "s" : ""} · ₹{Math.round(cartTotal)}
          <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 10px", borderRadius: "99px", fontSize: "12px" }}>View Cart</span>
        </button>
      )}
    </div>
  );
}


