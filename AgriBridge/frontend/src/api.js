import axios from "axios";

const BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const requestOTP = (phone, role, name) =>
  api.post("/auth/request-otp", { phone, role, name });

export const verifyOTP = (phone, code) =>
  api.post("/auth/verify-otp", { phone, code });

// ── Email OTP (new) ───────────────────────────────────────────────────────────
export const sendEmailOtp = (email, role, name = "") =>
  api.post("/auth/send-email-otp", { email, role, name });

export const verifyEmailOtp = (email, code, role, name = "", location = "") =>
  api.post("/auth/verify-email-otp", { email, code, role, name, location });

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = () => api.get("/users");
export const getUser = (id) => api.get(`/users/${id}`);

// ─── Products ─────────────────────────────────────────────────────────────────
export const getProducts = (category) =>
  api.get("/products", { params: category ? { category } : {} });

export const createProduct = (product, farmerId) =>
  api.post(`/products?farmer_id=${farmerId}`, product);

export const getFarmerProducts = (farmerId) =>
  api.get(`/products/farmer/${farmerId}`);

export const updateProduct = (productId, data) =>
  api.put(`/products/${productId}`, data);

export const deleteProduct = (productId) =>
  api.delete(`/products/${productId}`);

export const getFarmerOrders = (farmerId) =>
  api.get(`/orders/farmer/${farmerId}`);


// ─── Orders ───────────────────────────────────────────────────────────────────
export const placeOrder = (order) => api.post("/orders", order);
export const getBuyerOrders = (buyerId) => api.get(`/orders/buyer/${buyerId}`);

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const addReview = (review) => api.post("/reviews", review);
export const getProductReviews = (productId) => api.get(`/reviews/product/${productId}`);

// ─── Messages ─────────────────────────────────────────────────────────────────
export const sendMessage = (msg) => api.post("/messages", msg);
export const getConversation = (user1, user2) => api.get(`/messages/${user1}/${user2}`);

// ─── Schemes ──────────────────────────────────────────────────────────────────
export const getSchemes = () => api.get("/schemes");

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getFarmerAnalytics = (farmerId) => api.get(`/analytics/farmer/${farmerId}`);
export const getMarketAnalytics = () => api.get("/analytics/market");

// ─── AI ───────────────────────────────────────────────────────────────────────
export const getFertilizerAdvice = (data) => api.post("/ai/fertilizer-advisor", data);

export const getCropDiagnosis = (formData) =>
  api.post("/ai/crop-doctor", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getSoilHealthAnalysis = (formData) =>
  api.post("/ai/soil-health", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const chatWithBot = (user_message, conversation_history) =>
  api.post("/ai/chatbot", { user_message, conversation_history });

export const simulateFarm = (data) =>
  api.post("/ai/farm-simulator", data);

export const detectFarmerStress = (messages, response_delay_seconds = 0) =>
  api.post("/ai/stress-detector", { messages, response_delay_seconds });

// ─── Weather & Maps ───────────────────────────────────────────────────────────
export const getWeather = (city) => api.get("/weather", { params: { city } });
export const getTransportCost = (origin, destination, vehicle_type) =>
  api.post("/transport-cost", { origin, destination, vehicle_type });

// ─── AI Live Prices ───────────────────────────────────────────────────────────
export const getLivePrices = (commodities = null, market = "Pune APMC") =>
  api.post("/ai/live-prices", { commodities, market });

// ─── AI Yield Predictor ───────────────────────────────────────────────────────
export const getYieldPrediction = (data) =>
  api.post("/ai/yield-prediction", data);

// ─── AI Farming Tutorials ─────────────────────────────────────────────────────
export const getFarmingTutorials = (data) =>
  api.post("/ai/farming-tutorials", data);

// ─── AI Key Status ────────────────────────────────────────────────────────────
export const getKeyStatus = () =>
  api.get("/ai/key-status");

// ─── Delivery ─────────────────────────────────────────────────────────────────
export const getAvailableDeliveries = () =>
  api.get("/deliveries/available");

export const getAgentDeliveries = (agentId) =>
  api.get(`/deliveries/agent/${agentId}`);

export const assignDelivery = (orderId, agentId) =>
  api.post("/deliveries/assign", { order_id: orderId, agent_id: agentId });

export const updateDeliveryStatus = (deliveryId, status, notes = "") =>
  api.put(`/deliveries/${deliveryId}/status`, { status, notes });

export const getOrderDelivery = (orderId) =>
  api.get(`/deliveries/order/${orderId}`);

export default api;
