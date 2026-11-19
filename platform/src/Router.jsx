import { lazy, Suspense, useEffect } from "react";
import { Analytics, track } from "@vercel/analytics/react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import App from "./App.jsx";
import { PlayerAuthProvider } from "./lib/PlayerAuthContext.jsx";

const GamePage = lazy(() => import("./pages/Pages.jsx").then((module) => ({ default: module.GamePage })));
const GamesPage = lazy(() => import("./pages/Pages.jsx").then((module) => ({ default: module.GamesPage })));
const HowToPlayPage = lazy(() => import("./pages/Pages.jsx").then((module) => ({ default: module.HowToPlayPage })));
const AdminPortal = lazy(() => import("./pages/AdminPortal.jsx"));
const RolePortal = lazy(() => import("./pages/RolePortal.jsx"));

function PageLoader() {
  return <main className="page-loader" aria-live="polite">Loading Igiti Play…</main>;
}

function DeferredPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    track("page_view", { route: location.pathname });
  }, [location.pathname]);

  return null;
}

export default function Router() {
  return (
    <PlayerAuthProvider>
    <BrowserRouter>
      <RouteAnalytics />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/games" element={<DeferredPage><GamesPage /></DeferredPage>} />
        <Route path="/games/:gameId" element={<DeferredPage><GamePage /></DeferredPage>} />
        <Route path="/how-to-play" element={<DeferredPage><HowToPlayPage /></DeferredPage>} />
        <Route path="/admin" element={<DeferredPage><AdminPortal /></DeferredPage>} />
        <Route path="/workspace" element={<DeferredPage><RolePortal /></DeferredPage>} />
        <Route path="/settings" element={<DeferredPage><RolePortal /></DeferredPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
    </PlayerAuthProvider>
  );
}
