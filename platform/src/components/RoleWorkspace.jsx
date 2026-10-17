import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, Crown, GraduationCap, School, ShoppingBag, UserRound } from "lucide-react";
import { getApiBaseUrl, getGames } from "../lib/api.js";

const roleMeta = {
  PLAYER: { label: "Player", icon: UserRound, copy: "Play games, keep your cloud saves, and manage your own progress." },
  STUDENT: { label: "Student", icon: GraduationCap, copy: "See games assigned by your teacher and complete them at your own pace." },
  TEACHER: { label: "Teacher", icon: GraduationCap, copy: "Assign published games to students in your school." },
  SCHOOL: { label: "School", icon: School, copy: "Assign published games to teachers in your school." },
  ADMIN: { label: "Administrator", icon: Crown, copy: "Manage the game collection, players, and operational reports." },
  OWNER: { label: "Platform owner", icon: Crown, copy: "Full control of users, schools, games, country media, settings, and reporting." },
};

async function playerRequest(path, token, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}/v1/me${path}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "We couldn't load your workspace.");
  return payload.data;
}

async function checkoutRequest(path, token, options = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "We couldn't start checkout.");
  return payload.data;
}

export default function RoleWorkspace({ user, onOpenAdmin }) {
  const [workspace, setWorkspace] = useState(null);
  const [games, setGames] = useState([]);
  const [gameId, setGameId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [offers, setOffers] = useState([]);
  const [checkout, setCheckout] = useState({ configured: false, environment: "sandbox" });
  const [purchasing, setPurchasing] = useState("");
  const [state, setState] = useState({ loading: true, error: "", message: "" });

  async function refresh() {
    setState({ loading: true, error: "", message: "" });
    try {
      const token = await user.getIdToken();
      const [data, collection, offerResponse, checkoutResponse] = await Promise.all([
        playerRequest("/workspace", token), getGames(),
        fetch(`${getApiBaseUrl()}/v1/offers`, { headers: { Accept: "application/json" } }).then((response) => response.json()),
        fetch(`${getApiBaseUrl()}/v1/checkout/status`, { headers: { Accept: "application/json" } }).then((response) => response.json()),
      ]);
      setWorkspace(data);
      setOffers(offerResponse.data || []);
      setCheckout(checkoutResponse.data || { configured: false, environment: "sandbox" });
      // Assignments reference the server Game id, not the built-in preview
      // card game (which intentionally has no database record yet).
      setGames(collection.data.filter((game) => game.gameId));
    } catch (error) {
      setState({ loading: false, error: error.message, message: "" });
      return;
    }
    setState({ loading: false, error: "", message: "" });
  }

  useEffect(() => { refresh(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function assign(event) {
    event.preventDefault();
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      const token = await user.getIdToken();
      await playerRequest("/assignments", token, { method: "POST", body: JSON.stringify({ gameId, recipientId, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined }) });
      setGameId(""); setRecipientId(""); setDueAt("");
      await refresh();
      setState({ loading: false, error: "", message: "Game assigned." });
    } catch (error) { setState({ loading: false, error: error.message, message: "" }); }
  }

  async function beginCheckout(offerKey) {
    setPurchasing(offerKey);
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      const token = await user.getIdToken();
      const order = await checkoutRequest("/v1/checkout/orders", token, { method: "POST", body: JSON.stringify({ offerKey }) });
      window.location.assign(order.redirectUrl);
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, message: "" }));
      setPurchasing("");
    }
  }

  if (state.loading) return <p className="role-workspace-loading">Loading your workspace…</p>;
  if (state.error) return <p className="account-error">{state.error}</p>;
  const meta = roleMeta[workspace?.role] || roleMeta.PLAYER;
  const Icon = meta.icon;
  const canAssign = ["SCHOOL", "TEACHER"].includes(workspace?.role);
  const isAdmin = ["ADMIN", "OWNER", "CONTENT_MANAGER", "MODERATOR"].includes(workspace?.role);

  return <section className="role-workspace" aria-label={`${meta.label} workspace`}>
    <div className="role-workspace-head"><span><Icon size={16} /></span><div><strong>{meta.label} workspace</strong><small>{meta.copy}</small></div></div>
    {isAdmin && <button className="button button-dark account-wide" onClick={onOpenAdmin}><Crown size={15} /> Open control room</button>}
    {canAssign && <form className="role-assignment-form" onSubmit={assign}>
      <strong>{workspace.role === "SCHOOL" ? "Assign a game to a teacher" : "Assign a game to a student"}</strong>
      <small>{workspace.school ? `${workspace.school.name} · ${workspace.recipients.length} eligible recipient(s)` : "Ask the owner to add your school membership first."}</small>
      <label className="account-field">Recipient<select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required><option value="">Choose a recipient</option>{workspace.recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.displayName || "Unnamed account"}</option>)}</select></label>
      <label className="account-field">Published game<select value={gameId} onChange={(event) => setGameId(event.target.value)} required><option value="">Choose a game</option>{games.map((game) => <option key={game.id} value={game.gameId || game.id}>{game.title}</option>)}</select></label>
      <label className="account-field">Due date <small>(optional)</small><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
      <button className="button button-primary account-wide" disabled={!workspace.recipients.length}><BookOpenCheck size={15} /> Assign game</button>
    </form>}
    {workspace?.assignments?.length > 0 && <div className="role-assignments"><strong>My assigned games</strong>{workspace.assignments.map((assignment) => <article key={assignment.id}><img src={assignment.game.coverImage} alt="" /><div><b>{assignment.game.title}</b><small>From {assignment.assignedBy.displayName || assignment.assignedBy.role}{assignment.dueAt ? ` · due ${new Date(assignment.dueAt).toLocaleDateString()}` : ""}</small></div><ArrowRight size={15} /></article>)}</div>}
    {workspace?.workspace === "STUDENT" && !workspace.assignments?.length && <p className="account-copy">No games have been assigned yet. Your teacher can add one when your school setup is complete.</p>}
    {offers.length > 0 && <div className="role-offers"><strong><ShoppingBag size={15} /> Game & account access</strong><small>{checkout.configured ? `Secure Pesapal checkout (${checkout.environment}). Access is activated after Pesapal verifies payment.` : "Payments are being configured. Prices are shown, but checkout is not available yet."}</small>{offers.map((offer) => <article key={offer.key}><div><b>{offer.title}</b><small>{offer.description || `${offer.kind === "GAME" ? "Game" : "Account"} access`} · {offer.interval.replace("_", " ")}</small></div><button className="button button-primary" disabled={!checkout.configured || purchasing === offer.key} onClick={() => beginCheckout(offer.key)}>{purchasing === offer.key ? "Opening…" : `${offer.amountMinor / 100} ${offer.currency}`}</button></article>)}</div>}
    {state.message && <p className="account-message">{state.message}</p>}
  </section>;
}
