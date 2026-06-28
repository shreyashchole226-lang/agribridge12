import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./tailwind-shim.css";
import "leaflet/dist/leaflet.css";
import App from "./App";

// ── ServiceWorker cleanup ─────────────────────────────────────────────────
// Suppress & unregister any stale cached ServiceWorkers.
// No SW is registered by this app — these are leftovers from previous sessions.

// 1. Catch synchronous SW errors before they reach React's error overlay
window.addEventListener("error", (event) => {
  if (
    event.message &&
    (event.message.includes("ServiceWorker") ||
      event.message.includes("sw.js"))
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

// 2. Catch async (Promise) SW errors before they reach React's overlay
window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || String(event.reason || "");
  if (msg.includes("ServiceWorker") || msg.includes("sw.js")) {
    event.preventDefault();
  }
});

// 3. Unregister every cached SW registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}
// ─────────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);

