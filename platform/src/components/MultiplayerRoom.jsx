import { useEffect, useState } from "react";
import { Copy, Radio, Users } from "lucide-react";
import { getApiBaseUrl } from "../lib/api.js";
import { usePlayerAuth } from "../lib/PlayerAuthContext.jsx";

async function apiRequest(user, path, options = {}) {
  const token = await user.getIdToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Live match is unavailable right now.");
  return payload.data;
}

export default function MultiplayerRoom({ mode, locked }) {
  const { user } = usePlayerAuth();
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState("");
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setRoom(null); setAnswer(""); setNotice(""); }, [mode.id]);
  useEffect(() => {
    if (!room?.code || !user) return undefined;
    const controller = new AbortController();
    async function refresh() {
      try {
        const data = await apiRequest(user, `/v1/multiplayer/matches/${room.code}`, { signal: controller.signal });
        if (!controller.signal.aborted) setRoom(data);
      } catch (error) {
        if (!controller.signal.aborted) setNotice(error.message);
      }
    }
    refresh();
    const interval = window.setInterval(refresh, 2000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [room?.code, user]);

  async function createRoom() {
    if (!user) return setNotice("Sign in first to host a live match.");
    setBusy(true); setNotice("");
    try { setRoom(await apiRequest(user, "/v1/multiplayer/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: mode.id, maxPlayers: 4 }) })); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  async function joinRoom() {
    if (!user) return setNotice("Sign in first to join a live match.");
    setBusy(true); setNotice("");
    try { setRoom(await apiRequest(user, "/v1/multiplayer/matches/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim().toUpperCase() }) })); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  async function submitAnswer(event) {
    event.preventDefault();
    if (!room?.question || !answer.trim()) return;
    setBusy(true); setNotice("");
    try {
      const data = await apiRequest(user, `/v1/multiplayer/matches/${room.code}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer }) });
      setRoom(data.match); setAnswer(""); setNotice(data.correct ? "Correct — point awarded." : "Not this round. Keep going.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  if (locked) return null;
  return <section className="multiplayer-room" aria-label="Live multiplayer">
    <div className="multiplayer-heading"><div><span className="eyebrow"><Radio size={14} /> LIVE MULTIPLAYER</span><h3>Play this mode together</h3><p>Private rooms sync scores every two seconds. The server verifies every answer.</p></div>{room && <span className="live-sync">LIVE SYNC</span>}</div>
    {!room ? <div className="multiplayer-lobby"><button className="button button-primary" onClick={createRoom} disabled={busy}>Host a 4-player room</button><div className="join-room"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))} placeholder="ROOM CODE" aria-label="Room code" /><button className="button button-outline" onClick={joinRoom} disabled={busy || code.length !== 6}>Join room</button></div></div> : <div className="multiplayer-active"><div className="room-code"><span>ROOM CODE</span><strong>{room.code}</strong><button onClick={() => navigator.clipboard?.writeText(room.code)} title="Copy room code"><Copy size={14} /></button></div><div className="room-status"><span><Users size={15} /> {room.players.length}/{room.maxPlayers} players</span><span>{room.state === "WAITING" ? `Starts in ${room.secondsRemaining}s` : room.state === "LIVE" ? `${room.secondsRemaining}s · Round ${room.question?.round}/10` : "Match complete"}</span></div>{room.state === "LIVE" && room.question ? <form className="live-question" onSubmit={submitAnswer}><label>{room.question.prompt}</label><div><input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer" autoComplete="off" /><button className="button button-primary" disabled={busy}>Answer</button></div></form> : <p className="room-waiting">{room.state === "WAITING" ? "Share the room code. Everyone who joins must own this card mode." : "Final standings are below."}</p>}<ol className="live-leaderboard">{room.players.map((player, index) => <li key={player.id}><span>{index + 1}. {player.name}</span><strong>{player.score} pts</strong></li>)}</ol></div>}
    {notice && <p className="inline-error" role="status">{notice}</p>}
  </section>;
}
