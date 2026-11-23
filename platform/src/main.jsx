import React from "react";
import { createRoot } from "react-dom/client";
import Router from "./Router.jsx";
import "./styles.css";

const analyticsEndpoint = (import.meta.env.VITE_API_BASE_URL || "https://igiti-play-api-staging.onrender.com").replace(/\/$/, "");
const width = window.innerWidth;
const sendAnalytics = () => void fetch(`${analyticsEndpoint}/v1/analytics/events`, {
  method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
  body: JSON.stringify({ source: "play", path: window.location.pathname, deviceType: width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop" }),
}).catch(() => undefined);
if ("requestIdleCallback" in window) window.requestIdleCallback(sendAnalytics, { timeout: 3000 });
else window.setTimeout(sendAnalytics, 1500);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
