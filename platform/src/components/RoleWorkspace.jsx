import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, CalendarDays, Crown, GraduationCap, LifeBuoy, School, ShoppingBag, UserRound } from "lucide-react";
import { getApiBaseUrl, getGames } from "../lib/api.js";

const roleMeta = {
  PLAYER: { label: "Player", icon: UserRound, copy: "Play games, keep your cloud saves, and manage your own progress." },
  STUDENT: { label: "Student", icon: GraduationCap, copy: "See games assigned by your teacher and complete them at your own pace." },
  TEACHER: { label: "Teacher", icon: GraduationCap, copy: "Assign published games to students in your school." },
  SCHOOL: { label: "School", icon: School, copy: "Assign published games to teachers in your school." },
  ADMIN: { label: "Administrator", icon: Crown, copy: "Manage the game collection, players, and operational reports." },
  OWNER: { label: "Platform owner", icon: Crown, copy: "Full control of users, schools, games, country media, settings, and reporting." },
};

function accessLabel(resource) {
  if (resource === "plan:user:all") return "Player all-products plan";
  if (resource === "plan:school:all") return "School all-products plan";
  if (resource === "card:all") return "A-54 complete card deck";
  if (resource.startsWith("card-mode:")) return `A-54 mode: ${resource.slice("card-mode:".length).replace(/-/g, " ")}`;
  return resource.startsWith("puzzle:") ? "Purchased puzzle" : resource;
}

function expiryLabel(expiresAt) {
  return expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}` : "Lifetime access";
}

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
  const [schools, setSchools] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [entitlements, setEntitlements] = useState([]);
  const [checkout, setCheckout] = useState({ configured: false, environment: "sandbox" });
  const [purchasing, setPurchasing] = useState("");
  const [state, setState] = useState({ loading: true, error: "", message: "" });

  async function refresh() {
    setState({ loading: true, error: "", message: "" });
    try {
      const token = await user.getIdToken();
      const [data, collection, offerResponse, checkoutResponse, accessList, schoolList] = await Promise.all([
        playerRequest("/workspace", token), getGames(),
        fetch(`${getApiBaseUrl()}/v1/offers`, { headers: { Accept: "application/json" } }).then((response) => response.json()),
        fetch(`${getApiBaseUrl()}/v1/checkout/status`, { headers: { Accept: "application/json" } }).then((response) => response.json()),
        playerRequest("/entitlements", token),
        fetch(`${getApiBaseUrl()}/v1/schools`, { headers: { Accept: "application/json" } }).then((response) => response.json()),
      ]);
      setWorkspace(data);
      setOffers(offerResponse.data || []);
      setEntitlements(accessList || []);
      setSchools(schoolList.data || []);
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

  async function saveSchool(event) {
    event.preventDefault();
    try { const token = await user.getIdToken(); await playerRequest("/school", token, { method: "PUT", body: JSON.stringify({ name: schoolName }) }); setState((current) => ({ ...current, message: "School workspace saved." })); await refresh(); } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  }

  async function chooseSchool(event) {
    event.preventDefault();
    try { const token = await user.getIdToken(); await playerRequest("/school-membership", token, { method: "PUT", body: JSON.stringify({ schoolId: selectedSchoolId }) }); setState((current) => ({ ...current, message: "School membership saved." })); await refresh(); } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  }

  if (state.loading) return <p className="role-workspace-loading">Loading your workspace…</p>;
  if (state.error) return <p className="account-error">{state.error}</p>;
  const meta = roleMeta[workspace?.role] || roleMeta.PLAYER;
  const Icon = meta.icon;
  const canAssign = ["SCHOOL", "TEACHER"].includes(workspace?.role);
  const isAdmin = ["ADMIN", "OWNER", "CONTENT_MANAGER", "MODERATOR"].includes(workspace?.role);
  const unlockedResources = new Set(entitlements.map((entitlement) => entitlement.resource));
  const planResources = new Set(["plan:user:all", "plan:school:all"]);
  const visibleOffers = offers.filter((offer) => {
    if (!planResources.has(offer.resource)) return true;
    return offer.resource === (workspace?.role === "SCHOOL" ? "plan:school:all" : "plan:user:all");
  });

  return <section className="role-workspace" aria-label={`${meta.label} workspace`}>
    <div className="role-workspace-head"><span><Icon size={16} /></span><div><strong>{meta.label} workspace</strong><small>{meta.copy}</small></div></div>
    {isAdmin && <button className="button button-dark account-wide" onClick={onOpenAdmin}><Crown size={15} /> Open control room</button>}
    {workspace?.role === "SCHOOL" && !workspace.school && <form className="role-assignment-form" onSubmit={saveSchool}><strong>Create your school workspace</strong><small>Teachers and students will select this school before you can assign learning games.</small><label className="account-field">School name<input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required minLength={2} /></label><button className="button button-primary account-wide">Create school</button></form>}
    {["TEACHER", "STUDENT"].includes(workspace?.role) && <form className="role-assignment-form" onSubmit={chooseSchool}><strong>{workspace.school ? `School: ${workspace.school.name}` : "Choose your school"}</strong><small>Select the school you belong to. Its school account can then connect your teaching or learning assignments.</small><label className="account-field">School<select value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)} required><option value="">Choose a school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label><button className="button button-primary account-wide" disabled={!selectedSchoolId}>Save school</button></form>}
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
    {visibleOffers.length > 0 && <div className="role-offers"><strong><ShoppingBag size={15} /> Game & account access</strong><small>{checkout.configured ? `Secure Pesapal checkout (${checkout.environment}). Access is activated only after Pesapal verifies payment.` : "Payments are being configured. Prices are shown, but checkout is not available yet."}</small>{visibleOffers.map((offer) => { const unlocked = unlockedResources.has(offer.resource) || isAdmin; return <article key={offer.key}><div><b>{offer.title}</b><small>{offer.description || `${offer.kind === "GAME" ? "Game" : "Account"} access`} · {offer.interval.replace("_", " ")}</small></div><button className="button button-primary" disabled={unlocked || !checkout.configured || purchasing === offer.key} onClick={() => beginCheckout(offer.key)}>{unlocked ? "Unlocked" : purchasing === offer.key ? "Opening…" : `${offer.amountMinor / 100} ${offer.currency}`}</button></article>; })}</div>}
    <section className="role-account-settings" aria-label="Account and access settings"><strong><CalendarDays size={15} /> Account & access</strong><small>Activate an available plan above, review your verified access, and check renewal dates here.</small>{entitlements.length ? <div className="role-entitlement-list">{entitlements.map((entitlement) => <article key={`${entitlement.resource}-${entitlement.orderId || "manual"}`}><div><b>{accessLabel(entitlement.resource)}</b><small>{expiryLabel(entitlement.expiresAt)}</small></div><span>Active</span></article>)}</div> : <p>No paid access is active on this account yet.</p>}<a className="role-support-link" href={`mailto:info@igiti.africa?subject=${encodeURIComponent("Igiti Play support request")}`}><LifeBuoy size={15} /> Ask Igiti support</a></section>
    {state.message && <p className="account-message">{state.message}</p>}
  </section>;
}
