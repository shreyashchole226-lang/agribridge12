/**
 * AgriBridge — Selective API Proxy
 * Only proxies real backend routes to port 8000.
 * Webpack HMR hot-update requests stay on port 3000.
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

const API_ROUTES = [
  "/auth",
  "/products",
  "/orders",
  "/reviews",
  "/messages",
  "/schemes",
  "/analytics",
  "/ai",
  "/weather",
  "/transport-cost",
  "/users",
  "/deliveries",
];

module.exports = function (app) {
  API_ROUTES.forEach((route) => {
    app.use(
      route,
      createProxyMiddleware({
        target: "http://localhost:8000",
        changeOrigin: true,
        logLevel: "silent", // suppress proxy noise in console
      })
    );
  });
};
