import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import { GamePage, GamesPage, HowToPlayPage } from "./pages/Pages.jsx";
import AdminPortal from "./pages/AdminPortal.jsx";
import { PlayerAuthProvider } from "./lib/PlayerAuthContext.jsx";

export default function Router() {
  return (
    <PlayerAuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/:gameId" element={<GamePage />} />
        <Route path="/how-to-play" element={<HowToPlayPage />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </PlayerAuthProvider>
  );
}
