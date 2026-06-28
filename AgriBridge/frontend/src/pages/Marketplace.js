import React, { useState, useEffect, useCallback } from "react";
import { getProducts, placeOrder, addReview, getProductReviews, getLivePrices } from "../api";
import {
  ShoppingCart, Star, Package, Search, X, Plus, Minus,
  Trash2, CheckCircle, ShoppingBag, ChevronRight, Tag,
  BarChart2, TrendingUp, TrendingDown as TDown, ChevronDown, ChevronUp
} from "lucide-react";
import LivePriceTracker from "../components/LivePriceTracker";

const CATEGORIES = ["All", "Vegetable", "Fruit", "Grain", "Pulse", "Spice", "Herb", "Leafy Green", "Dairy"];

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating, onRate, interactive = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={interactive ? 20 : 14}
          className={`${
            star <= (interactive ? hovered || rating : rating)
              ? "fill-agri-gold text-agri-gold"
              : "text-gray-600"
          } ${interactive ? "cursor-pointer transition-all" : ""}`}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate && onRate(star)}
        />
      ))}
    </div>
  );
}

// ─── Cart Sidebar ─────────────────────────────────────────────────────────────
function CartSidebar({ cart, onUpdateQty, onRemove, onCheckout, onClose, currentUser, checkoutDone }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const isBusiness = currentUser?.role === "business";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-gray-900 border-l border-gray-700 flex flex-col h-full shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <ShoppingBag size={22} className="text-agri-lime" />
            <h2 className="font-display text-xl font-bold text-white">Your Cart</h2>
            <span className="bg-agri-green text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {cart.length} item{cart.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <ShoppingCart size={56} className="text-gray-700" />
              <p className="text-gray-500 text-lg font-medium">Your cart is empty</p>
              <p className="text-gray-600 text-sm">Add fresh produce from the marketplace!</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-3 bg-gray-800 rounded-2xl p-3">
                <img
                  src={item.image_url || "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=80"}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  onError={(e) => (e.target.src = "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=80")}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-gray-400 text-xs mb-2">₹{item.price}/{item.unit}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-gray-700 rounded-xl px-2 py-1">
                      <button
                        onClick={() => onUpdateQty(item.id, item.qty - 1)}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-sm font-medium w-6 text-center">{item.qty}</span>
                      <button
                        onClick={() => onUpdateQty(item.id, item.qty + 1)}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-agri-lime font-bold text-sm">
                        ₹{Math.round(item.price * item.qty)}
                      </span>
                      <button onClick={() => onRemove(item.id)} className="text-red-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-800 space-y-4">
            {isBusiness && (
              <div className="flex items-center gap-2 bg-agri-gold/10 border border-agri-gold/30 rounded-xl px-3 py-2">
                <Tag size={14} className="text-agri-gold" />
                <p className="text-agri-gold text-xs font-medium">Bulk pricing applied where eligible</p>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Subtotal</span>
              <span className="text-white font-bold text-lg">₹{Math.round(total)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Delivery</span>
              <span className="text-agri-lime">Free</span>
            </div>
            <div className="h-px bg-gray-700" />
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Total</span>
              <span className="text-agri-lime font-bold text-xl">₹{Math.round(total)}</span>
            </div>

            {checkoutDone ? (
              <div className="flex items-center justify-center gap-2 bg-agri-lime/20 border border-agri-lime/40 rounded-2xl py-4">
                <CheckCircle size={20} className="text-agri-lime" />
                <span className="text-agri-lime font-semibold">Order Placed Successfully!</span>
              </div>
            ) : (
              <button
                onClick={onCheckout}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold"
              >
                Checkout · ₹{Math.round(total)}
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, currentUser, onAddToCart, cartQty }) {
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [added, setAdded] = useState(false);

  const isBusiness = currentUser?.role === "business";
  const displayPrice = isBusiness ? product.bulk_price : product.retail_price;

  const loadReviews = async () => {
    const r = await getProductReviews(product.id);
    setReviews(r.data);
  };

  const handleAddToCart = () => {
    onAddToCart(product, displayPrice);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleReview = async () => {
    if (!myRating) return;
    await addReview({
      product_id: product.id,
      reviewer_id: currentUser.id,
      farmer_id: product.farmer_id,
      rating: myRating,
      comment: myComment,
    });
    setMyComment("");
    setMyRating(0);
    loadReviews();
  };

  return (
    <div className="card fade-in flex flex-col group hover:border-agri-green/40 transition-all duration-300">
      {/* Image */}
      <div className="relative overflow-hidden rounded-xl mb-4 h-44">
        <img
          src={product.image_url || "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => (e.target.src = "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-2 left-2">
          <span className="bg-agri-dark/80 text-agri-lime text-xs px-2 py-1 rounded-full border border-agri-lime/30 backdrop-blur-sm">
            {product.category}
          </span>
        </div>
        {isBusiness && (
          <div className="absolute top-2 right-2 bg-agri-gold/90 text-black text-xs px-2 py-1 rounded-full font-bold">
            BULK
          </div>
        )}
        {cartQty > 0 && (
          <div className="absolute bottom-2 right-2 bg-agri-green text-white text-xs px-2 py-1 rounded-full font-bold">
            {cartQty} in cart
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-display text-base font-semibold text-white mb-0.5 leading-tight">{product.name}</h3>
        <p className="text-gray-400 text-xs mb-2">by {product.farmer_name}</p>
        <p className="text-gray-500 text-xs mb-3 line-clamp-2 flex-1">{product.description}</p>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <StarRating rating={product.avg_rating} />
          <span className="text-gray-400 text-xs">
            {product.avg_rating} ({product.review_count})
          </span>
        </div>

        {/* Price */}
        <div className="bg-gray-800/80 rounded-xl p-3 mb-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-xs mb-0.5">{isBusiness ? "Bulk Price" : "Retail Price"}</p>
              <p className="text-agri-lime text-lg font-bold">
                ₹{displayPrice}
                <span className="text-gray-400 text-xs font-normal">/{product.unit}</span>
              </p>
            </div>
            {isBusiness && (
              <div className="text-right">
                <p className="text-gray-500 text-xs line-through">₹{product.retail_price}</p>
                <p className="text-agri-gold text-xs">Min {product.min_bulk_qty}{product.unit}</p>
              </div>
            )}
          </div>
          <p className="text-gray-600 text-xs mt-1">Stock: {product.stock_qty} {product.unit}</p>
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 mb-3 ${
            added
              ? "bg-agri-lime/20 border border-agri-lime text-agri-lime"
              : "bg-agri-green hover:bg-agri-green/80 text-white active:scale-95"
          }`}
        >
          {added ? (
            <><CheckCircle size={16} /> Added to Cart!</>
          ) : (
            <><ShoppingCart size={16} /> Add to Cart</>
          )}
        </button>

        {/* Reviews Toggle */}
        <button
          onClick={() => { setShowReviews(!showReviews); if (!showReviews) loadReviews(); }}
          className="text-agri-lime text-xs hover:underline w-full text-center"
        >
          {showReviews ? "Hide Reviews" : `See Reviews & Rate`}
        </button>

        {showReviews && (
          <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
            <div className="bg-gray-800/50 rounded-xl p-3">
              <p className="text-gray-300 text-xs mb-2 font-medium">Your Review</p>
              <StarRating rating={myRating} onRate={setMyRating} interactive />
              <textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                placeholder="Write your review..."
                className="input-field mt-2 text-sm resize-none"
                rows={2}
              />
              <button onClick={handleReview} className="btn-primary w-full mt-2 text-sm py-1.5">
                Submit Review
              </button>
            </div>
            {reviews.map((r) => (
              <div key={r.id} className="bg-gray-800/30 rounded-lg p-2.5">
                <div className="flex justify-between items-start">
                  <p className="text-gray-300 text-xs font-medium">{r.reviewer_name}</p>
                  <StarRating rating={r.rating} />
                </div>
                {r.comment && <p className="text-gray-400 text-xs mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Marketplace Ticker ───────────────────────────────────────────────────────

function MarketplaceTicker() {
  const [prices, setPrices] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    getLivePrices(null, "Pune APMC")
      .then(res => {
        if (res.data?.success && res.data?.prices?.length > 0) {
          setPrices(res.data.prices);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Fallback static prices if AI not loaded yet
  const fallback = [
    { commodity: "Tomato", emoji: "🍅", current_price: 45, trend: "up", change_percent: 8.2, unit: "kg" },
    { commodity: "Onion", emoji: "🧅", current_price: 32, trend: "down", change_percent: -4.1, unit: "kg" },
    { commodity: "Potato", emoji: "🥔", current_price: 28, trend: "stable", change_percent: 0, unit: "kg" },
    { commodity: "Rice (Basmati)", emoji: "🌾", current_price: 85, trend: "up", change_percent: 3.6, unit: "kg" },
    { commodity: "Wheat", emoji: "🌾", current_price: 32, trend: "stable", change_percent: 0.5, unit: "kg" },
    { commodity: "Alphonso Mango", emoji: "🥭", current_price: 150, trend: "down", change_percent: -6.2, unit: "kg" },
    { commodity: "Toor Dal", emoji: "🫘", current_price: 115, trend: "up", change_percent: 5.8, unit: "kg" },
    { commodity: "Turmeric", emoji: "🟡", current_price: 145, trend: "up", change_percent: 12.1, unit: "kg" },
    { commodity: "Garlic", emoji: "🧄", current_price: 125, trend: "down", change_percent: -3.4, unit: "kg" },
    { commodity: "Green Chilli", emoji: "🌶️", current_price: 82, trend: "up", change_percent: 9.7, unit: "kg" },
  ];

  const display = prices.length > 0 ? prices : (loaded ? fallback : fallback);
  const items = [...display, ...display];

  return (
    <div
      className="overflow-hidden bg-gray-900/70 border border-gray-700/50 rounded-xl relative"
      style={{ height: "40px" }}
    >
      <div
        className="flex items-center absolute top-0 whitespace-nowrap"
        style={{ animation: "ticker-scroll 60s linear infinite" }}
      >
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 text-sm px-3 h-10">
            <span>{item.emoji || "🌾"}</span>
            <span className="text-gray-300 font-medium">{item.commodity}</span>
            <span className="text-agri-lime font-bold">₹{item.current_price}</span>
            {item.trend === "up" && (
              <span className="text-emerald-400 text-xs flex items-center gap-0.5">
                <TrendingUp size={11} />+{Math.abs(item.change_percent).toFixed(1)}%
              </span>
            )}
            {item.trend === "down" && (
              <span className="text-red-400 text-xs flex items-center gap-0.5">
                <TDown size={11} />-{Math.abs(item.change_percent).toFixed(1)}%
              </span>
            )}
            {item.trend === "stable" && (
              <span className="text-gray-500 text-xs">—</span>
            )}
            <span className="text-gray-700 ml-2">|</span>
          </span>
        ))}
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-900/95 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-900/95 to-transparent z-10 pointer-events-none" />
    </div>
  );
}

// ─── Marketplace Page ─────────────────────────────────────────────────────────
export default function Marketplace({ currentUser }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Cart state
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => { loadProducts(); }, [category]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const r = await getProducts(category !== "All" ? category : null);
      setProducts(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Cart handlers
  const handleAddToCart = useCallback((product, price) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, price, qty: 1 }];
    });
  }, []);

  const handleUpdateQty = useCallback((id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
    }
  }, []);

  const handleRemove = useCallback((id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleCheckout = async () => {
    if (!currentUser || checkingOut) return;
    setCheckingOut(true);
    try {
      const isBusiness = currentUser.role === "business";
      // Place one order per cart item
      for (const item of cart) {
        await placeOrder({
          buyer_id: currentUser.id,
          product_id: item.id,
          quantity: item.qty,
          order_type: isBusiness ? "bulk" : "retail",
          delivery_address: currentUser.location || "Mumbai",
        });
      }
      setCheckoutDone(true);
      setTimeout(() => {
        setCart([]);
        setCheckoutDone(false);
        setCartOpen(false);
      }, 2500);
    } catch (e) { console.error(e); }
    setCheckingOut(false);
  };

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const [showPricePanel, setShowPricePanel] = useState(false);


  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title mb-1">
            {currentUser?.role === "business" ? "🏭 B2B Wholesale Market" : "🛒 Fresh Market"}
          </h1>
          <p className="text-gray-400 text-sm">
            {currentUser?.role === "business"
              ? "Bulk pricing automatically applied for eligible quantities"
              : `Shopping as ${currentUser?.name} · ${products.length} products available`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Prices Button */}
          <button
            onClick={() => setShowPricePanel(!showPricePanel)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              showPricePanel
                ? "bg-agri-green text-white border-agri-green"
                : "bg-agri-green/20 text-agri-lime border-agri-green/40 hover:bg-agri-green/30"
            }`}
          >
            <BarChart2 size={16} />
            <span className="hidden sm:inline">Live Prices</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            {showPricePanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Cart Button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-3 bg-agri-green/20 hover:bg-agri-green/30 border border-agri-green/40 rounded-2xl px-5 py-3 transition-all duration-200 group"
          >
            <ShoppingCart size={20} className="text-agri-lime" />
            <div className="text-left">
              <p className="text-white text-sm font-semibold">My Cart</p>
              {cartCount > 0 && (
                <p className="text-agri-lime text-xs">₹{Math.round(cartTotal)} · {cartCount} item{cartCount !== 1 ? "s" : ""}</p>
              )}
            </div>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Live Price Panel */}
      {showPricePanel && (
        <div className="mb-6 fade-in">
          <LivePriceTracker compact={false} defaultMarket="Pune APMC" />
        </div>
      )}

      {/* Live Price Ticker Strip (always visible) */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={13} className="text-agri-lime" />
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Live Mandi Prices</span>
          <span className="flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          </span>
        </div>
        <MarketplaceTicker />
      </div>

      {/* B2B Banner */}
      {currentUser?.role === "business" && (
        <div className="bg-agri-gold/10 border border-agri-gold/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🏭</span>
          <div>
            <p className="text-agri-gold font-semibold text-sm">B2B Wholesale Mode Active</p>
            <p className="text-gray-400 text-xs">Bulk pricing shown. Add items to cart to place wholesale orders.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search 63 products — vegetables, fruits, dairy, spices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                category === cat
                  ? "bg-agri-green text-white shadow-lg shadow-agri-green/30"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-gray-500 text-sm mb-4">
          Showing <span className="text-agri-lime font-semibold">{filtered.length}</span> products
          {search && <span> for "<span className="text-white">{search}</span>"</span>}
        </p>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="bg-gray-800 h-44 rounded-xl mb-4" />
              <div className="h-4 bg-gray-800 rounded mb-2" />
              <div className="h-3 bg-gray-800 rounded w-2/3 mb-4" />
              <div className="h-10 bg-gray-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              currentUser={currentUser}
              onAddToCart={handleAddToCart}
              cartQty={cart.find((i) => i.id === p.id)?.qty || 0}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-500">
              <Package size={56} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">No products found</p>
              <p className="text-sm text-gray-600">Try a different category or search term</p>
            </div>
          )}
        </div>
      )}

      {/* Cart Sidebar */}
      {cartOpen && (
        <CartSidebar
          cart={cart}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemove}
          onCheckout={handleCheckout}
          onClose={() => setCartOpen(false)}
          currentUser={currentUser}
          checkoutDone={checkoutDone}
        />
      )}

      {/* Floating Cart Button (when cart has items and sidebar closed) */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 bg-agri-green text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-agri-green/40 hover:bg-agri-green/90 transition-all duration-200 active:scale-95"
        >
          <ShoppingCart size={20} />
          <span className="font-semibold">{cartCount} item{cartCount !== 1 ? "s" : ""} · ₹{Math.round(cartTotal)}</span>
          <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">View Cart</span>
        </button>
      )}
    </div>
  );
}
