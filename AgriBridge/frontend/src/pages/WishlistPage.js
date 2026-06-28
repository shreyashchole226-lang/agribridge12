import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts } from "../api";
import { useLanguage } from "../context/LanguageContext";

export default function WishlistPage({ currentUser }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agribridge_wishlist") || "[]"); } catch { return []; }
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agribridge_cart") || "[]"); } catch { return []; }
  });
  const [addedMap, setAddedMap] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await getProducts();
        const all = r.data || [];
        setProducts(all.filter(p => wishlist.includes(p.id)));
      } catch { setProducts([]); }
      setLoading(false);
    };
    if (wishlist.length > 0) load();
    else setLoading(false);
  }, []);

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter(w => w !== id);
    setWishlist(updated);
    setProducts(prev => prev.filter(p => p.id !== id));
    localStorage.setItem("agribridge_wishlist", JSON.stringify(updated));
  };

  const addToCart = (product) => {
    const updated = (() => {
      const ex = cart.find(i => i.id === product.id);
      return ex ? cart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
                : [...cart, { ...product, price: product.retail_price, qty: 1 }];
    })();
    setCart(updated);
    localStorage.setItem("agribridge_cart", JSON.stringify(updated));
    setAddedMap(m => ({ ...m, [product.id]: true }));
    setTimeout(() => setAddedMap(m => ({ ...m, [product.id]: false })), 1500);
  };

  const IMG_FALLBACK = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80";

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 900, marginBottom: "4px" }}>
            ❤️ {t("myWishlist")}
          </h1>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>{products.length} saved items</p>
        </div>
        {cart.length > 0 && (
          <button onClick={() => navigate("/checkout", { state: { cart } })} style={{
            padding: "10px 20px", borderRadius: "12px", border: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
            fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 16px rgba(34,197,94,0.35)",
          }}>🛒 Cart ({cart.reduce((s, i) => s + i.qty, 0)}) → Checkout</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: "280px", background: "rgba(255,255,255,0.03)", borderRadius: "18px", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", animation: "bounceIn 0.5s ease" }}>
          <p style={{ fontSize: "5rem", marginBottom: "16px" }}>💔</p>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.3rem", marginBottom: "8px" }}>{t("noWishlist")}</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>Save products from the market to see them here</p>
          <Link to="/marketplace" style={{
            padding: "12px 24px", borderRadius: "12px", textDecoration: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
            fontWeight: 700, fontSize: "14px",
          }}>🛒 {t("browseMarket")}</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
          {products.map((p, i) => (
            <div key={p.id} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "20px", overflow: "hidden", transition: "all 0.25s",
              animation: `slideUp 0.4s ${i * 0.06}s ease both`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {/* Image */}
              <div style={{ position: "relative", height: "160px", overflow: "hidden" }}>
                <img src={p.image_url || IMG_FALLBACK} alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }}
                  onError={e => e.target.src = IMG_FALLBACK}
                  onMouseEnter={e => e.target.style.transform = "scale(1.07)"}
                  onMouseLeave={e => e.target.style.transform = "scale(1)"}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
                <span style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(13,17,23,0.85)", color: "#bbf7d0", fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", backdropFilter: "blur(4px)" }}>
                  {p.category}
                </span>
                {/* Remove button */}
                <button onClick={() => removeFromWishlist(p.id)} style={{
                  position: "absolute", top: "8px", right: "8px", background: "rgba(239,68,68,0.9)",
                  border: "none", borderRadius: "50%", width: "28px", height: "28px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff", fontSize: "12px",
                }} title={t("removeFromWishlist")}>✕</button>
              </div>

              {/* Info */}
              <div style={{ padding: "14px" }}>
                <p style={{ color: "#f3f4f6", fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{p.name}</p>
                <p style={{ color: "#6b7280", fontSize: "11px", marginBottom: "8px" }}>
                  🌾 {p.farmer_name || "Farmer"} · ⭐ {p.avg_rating || "—"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ color: "#22c55e", fontWeight: 900, fontSize: "16px" }}>₹{p.retail_price}<span style={{ color: "#6b7280", fontWeight: 400, fontSize: "11px" }}>/{p.unit}</span></p>
                  {p.stock_qty <= 0 && (
                    <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 600, background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: "99px" }}>{t("outOfStock")}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button onClick={() => removeFromWishlist(p.id)} style={{
                    flex: 1, padding: "8px", borderRadius: "10px", fontSize: "11px",
                    fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171",
                  }}>❤️ {t("removeFromWishlist")}</button>
                  <button onClick={() => addToCart(p)} disabled={p.stock_qty <= 0 || addedMap[p.id]} style={{
                    flex: 1, padding: "8px", borderRadius: "10px", fontSize: "11px",
                    fontWeight: 700, cursor: p.stock_qty <= 0 ? "not-allowed" : "pointer",
                    fontFamily: "inherit", transition: "all 0.2s",
                    background: addedMap[p.id] ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)",
                    border: addedMap[p.id] ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(34,197,94,0.2)",
                    color: addedMap[p.id] ? "#86efac" : "#bbf7d0",
                    opacity: p.stock_qty <= 0 ? 0.5 : 1,
                  }}>
                    {addedMap[p.id] ? "✓ " + t("addedToCart") : "🛒 " + t("addToCartFromWishlist")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart summary if items added */}
      {cart.length > 0 && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 50,
          background: "linear-gradient(135deg, #1d2433, #0d1117)",
          border: "1px solid rgba(34,197,94,0.3)", borderRadius: "16px",
          padding: "14px 20px", boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", gap: "12px",
          animation: "bounceIn 0.4s ease",
        }}>
          <span style={{ fontSize: "20px" }}>🛒</span>
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: "13px" }}>{cart.reduce((s, i) => s + i.qty, 0)} items · ₹{Math.round(cart.reduce((s, i) => s + i.price * i.qty, 0))}</p>
          </div>
          <button onClick={() => navigate("/checkout", { state: { cart } })} style={{
            padding: "8px 16px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
            fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
          }}>Checkout →</button>
        </div>
      )}
    </div>
  );
}

