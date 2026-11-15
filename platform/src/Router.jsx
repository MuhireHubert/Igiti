import { useEffect } from "react";
import { Analytics, track } from "@vercel/analytics/react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import App from "./App.jsx";
import { GamePage, GamesPage, HowToPlayPage } from "./pages/Pages.jsx";
import AdminPortal from "./pages/AdminPortal.jsx";
import RolePortal from "./pages/RolePortal.jsx";
import { PlayerAuthProvider } from "./lib/PlayerAuthContext.jsx";

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
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/:gameId" element={<GamePage />} />
        <Route path="/how-to-play" element={<HowToPlayPage />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/workspace" element={<RolePortal />} />
        <Route path="/settings" element={<RolePortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
    </PlayerAuthProvider>
  );
}
