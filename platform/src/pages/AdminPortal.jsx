import { useEffect, useState } from "react";
import { onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ArrowLeft, BarChart3, BookOpen, CheckCircle2, CircleAlert, CreditCard, FileText, Gamepad2, LogOut, Plus, RefreshCw, Save, Settings, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { auth, firebaseReady } from "../lib/firebase.js";
import "./AdminPortal.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const blankGame = { slug: "", title: "", description: "", category: "Geography", coverImage: "", status: "DRAFT" };
const blankPuzzle = { slug: "", title: "", imageUrl: "", pieceCount: 60, difficulty: "RELAXED", allowedDifficulties: ["RELAXED"], funFact: "", price: "", currency: "USD", sortOrder: 0, isActive: false };
const blankCountryAsset = { country: "", imageUrl: "", caption: "" };
const blankOffer = { key: "", title: "", description: "", kind: "GAME", resource: "", amountMinor: "", currency: "USD", interval: "ONE_TIME", isActive: false };
const a54Modes = [
  ["quick-facts", "Quick Facts Showdown"], ["matching", "Country Matching"], ["card-war", "Igiti Card War"], ["guess-country", "Guess the Country"],
  ["who-am-i", "Who am I?"], ["regional", "Regional Challenges"], ["thematic", "Thematic Discovery"], ["roleplay", "Country Roleplay Day"],
];
const platformRoles = ["PLAYER", "SCHOOL", "TEACHER", "STUDENT", "MODERATOR", "CONTENT_MANAGER", "ADMIN", "OWNER"];
const administratorRoles = new Set(["ADMIN", "OWNER"]);

async function adminRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE}/v1/admin${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload.data;
}

function StatCard({ label, value, icon: Icon }) {
  return <article className="admin-stat"><span className="admin-stat-icon"><Icon size={18} /></span><span className="admin-stat-label">{label}</span><strong>{value ?? "—"}</strong></article>;
}

function ImageUploadField({ label, value, onUpload, uploading, help = "JPG, PNG, or WebP · 10 MB maximum" }) {
  const inputId = `image-upload-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className="admin-image-upload">
    <span className="admin-image-upload-label">{label}</span>
    {value ? <img src={value} alt="Selected upload" className="admin-image-upload-preview" /> : <div className="admin-image-upload-placeholder"><Gamepad2 size={20} /><span>Your image will appear here</span></div>}
    <label htmlFor={inputId} className="admin-button admin-button-light admin-image-upload-button"><Plus size={15} /> {uploading ? "Uploading…" : value ? "Replace image" : "Choose image file"}</label>
    <input id={inputId} className="admin-image-upload-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const [file] = event.target.files || []; if (file) onUpload(file); event.target.value = ""; }} disabled={uploading} />
    <small>{help}</small>
  </div>;
}

export default function AdminPortal() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [countryAssets, setCountryAssets] = useState([]);
  const [offers, setOffers] = useState([]);
  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("{}");
  const [entitlementForm, setEntitlementForm] = useState({ playerId: "", resource: "", expiresAt: "" });
  const [gameForm, setGameForm] = useState(blankGame);
  const [editingGameId, setEditingGameId] = useState(null);
  const [activeGameId, setActiveGameId] = useState(null);
  const [puzzleForm, setPuzzleForm] = useState(blankPuzzle);
  const [editingPuzzleId, setEditingPuzzleId] = useState(null);
  const [countryAssetForm, setCountryAssetForm] = useState(blankCountryAsset);
  const [editingCountryAssetId, setEditingCountryAssetId] = useState(null);
  const [offerForm, setOfferForm] = useState(blankOffer);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth) return undefined;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  async function loadWorkspace(silent = false) {
    if (!user) return;
    if (!user.emailVerified) {
      setWorkspaceError("Verify your email address to open the Igiti Play admin portal. A verification link has been sent to this account.");
      return;
    }
    if (!silent) setLoading(true);
    setWorkspaceError("");
    try {
      const token = await user.getIdToken();
      const [session, summary, gameList, playerList] = await Promise.all([
        adminRequest("/session", token),
        adminRequest("/overview", token),
        adminRequest("/games", token),
        adminRequest("/players", token),
      ]);
      setAdminSession(session);
      setOverview(summary);
      setGames(gameList);
      setPlayers(playerList);
      if (administratorRoles.has(session.role)) {
        const [settingList, events, orders, entitlementList, assetList, offerList] = await Promise.all([
          adminRequest("/settings", token), adminRequest("/audit", token),
          adminRequest("/payments", token), adminRequest("/entitlements", token), adminRequest("/country-assets", token), adminRequest("/offers", token),
        ]);
        setSettings(settingList);
        setAuditEvents(events);
        setPaymentOrders(orders);
        setEntitlements(entitlementList);
        setCountryAssets(assetList);
        setOffers(offerList);
      } else {
        setSettings([]); setAuditEvents([]); setPaymentOrders([]); setEntitlements([]); setCountryAssets([]); setOffers([]);
      }
    } catch (error) {
      setWorkspaceError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadWorkspace();
    // Loading is tied to the authenticated user, not to every state change in the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        setLoginError("We sent a verification link to this email. Verify it, then sign in again to open the admin portal.");
      }
    } catch (error) {
      setLoginError(error.code === "auth/invalid-credential"
        ? "The email or password is incorrect."
        : error.code === "auth/too-many-requests"
          ? "Too many attempts. Please wait and try again."
          : "Sign-in failed. Check the Firebase Authentication setup and try again.");
    }
  }

  async function withAdminRequest(action, successMessage) {
    setSaving(true);
    setWorkspaceError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      await action(token);
      setNotice(successMessage);
      await loadWorkspace(true);
    } catch (error) {
      setWorkspaceError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file, update) {
    setSaving(true);
    setWorkspaceError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API_BASE}/v1/admin/media/images`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Image upload failed.");
      update(payload.data.url);
      setNotice("Image uploaded. Save the form to attach it to this game or country card.");
    } catch (error) {
      setWorkspaceError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function startNewGame() {
    setEditingGameId(null);
    setGameForm(blankGame);
    setTab("games");
  }

  function startEditGame(game) {
    setEditingGameId(game.id);
    setGameForm({ slug: game.slug, title: game.title, description: game.description, category: game.category, coverImage: game.coverImage, status: game.status });
    setActiveGameId(game.id);
    setTab("games");
  }

  async function saveGame(event) {
    event.preventDefault();
    await withAdminRequest(async (token) => {
      const path = editingGameId ? `/games/${editingGameId}` : "/games";
      const method = editingGameId ? "PATCH" : "POST";
      await adminRequest(path, token, { method, body: JSON.stringify(gameForm) });
      setGameForm(blankGame);
      setEditingGameId(null);
    }, editingGameId ? "Game updated." : "Game created as configured.");
  }

  async function changeGameStatus(game, status) {
    if (status === "ARCHIVED" && !window.confirm(`Archive “${game.title}”?`)) return;
    await withAdminRequest(async (token) => {
      await adminRequest(`/games/${game.id}`, token, { method: "PATCH", body: JSON.stringify({ status }) });
    }, status === "PUBLISHED" ? "Game published." : status === "ARCHIVED" ? "Game archived." : "Game returned to draft.");
  }

  async function deleteGame(game) {
    if (!window.confirm(`Permanently delete “${game.title}” and its puzzles? This cannot be undone.`)) return;
    await withAdminRequest(async (token) => {
      await adminRequest(`/games/${game.id}`, token, { method: "DELETE" });
      if (activeGameId === game.id) setActiveGameId(null);
    }, "Game deleted.");
  }

  function startNewPuzzle(gameId) {
    setActiveGameId(gameId);
    setEditingPuzzleId(null);
    setPuzzleForm(blankPuzzle);
  }

  function startEditPuzzle(gameId, puzzle) {
    setActiveGameId(gameId);
    setEditingPuzzleId(puzzle.id);
    setPuzzleForm({
      slug: puzzle.slug, title: puzzle.title, imageUrl: puzzle.imageUrl,
      pieceCount: puzzle.pieceCount, difficulty: puzzle.difficulty,
      allowedDifficulties: Array.isArray(puzzle.metadata?.allowedDifficulties) ? puzzle.metadata.allowedDifficulties : [puzzle.difficulty],
      funFact: puzzle.metadata?.funFact || "",
      price: puzzle.metadata?.pricing?.amountMinor ? String(puzzle.metadata.pricing.amountMinor / 100) : "",
      currency: puzzle.metadata?.pricing?.currency || "USD",
      sortOrder: puzzle.sortOrder, isActive: puzzle.isActive,
    });
  }

  async function savePuzzle(event) {
    event.preventDefault();
    if (!activeGameId) return;
    const price = puzzleForm.price === "" ? null : Math.round(Number(puzzleForm.price) * 100);
    const payload = { slug: puzzleForm.slug, title: puzzleForm.title, imageUrl: puzzleForm.imageUrl, pieceCount: Number(puzzleForm.pieceCount), difficulty: puzzleForm.difficulty, sortOrder: Number(puzzleForm.sortOrder), isActive: puzzleForm.isActive, metadata: { allowedDifficulties: puzzleForm.allowedDifficulties, funFact: puzzleForm.funFact || undefined, pricing: price == null ? null : { amountMinor: price, currency: puzzleForm.currency } } };
    await withAdminRequest(async (token) => {
      const path = editingPuzzleId ? `/puzzles/${editingPuzzleId}` : `/games/${activeGameId}/puzzles`;
      await adminRequest(path, token, { method: editingPuzzleId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setPuzzleForm(blankPuzzle);
      setEditingPuzzleId(null);
    }, editingPuzzleId ? "Puzzle updated." : "Puzzle added.");
  }

  async function togglePuzzle(gameId, puzzle) {
    setActiveGameId(gameId);
    await withAdminRequest(async (token) => {
      await adminRequest(`/puzzles/${puzzle.id}`, token, { method: "PATCH", body: JSON.stringify({ isActive: !puzzle.isActive }) });
    }, puzzle.isActive ? "Puzzle deactivated." : "Puzzle activated.");
  }

  async function deletePuzzle(puzzle) {
    if (!window.confirm(`Permanently delete “${puzzle.title}”?`)) return;
    await withAdminRequest(async (token) => {
      await adminRequest(`/puzzles/${puzzle.id}`, token, { method: "DELETE" });
    }, "Puzzle deleted.");
  }

  async function changePlayerRole(player, role) {
    if (role === player.role) return;
    if (!window.confirm(`Change ${player.displayName || "this player's"} role to ${role}?`)) return;
    await withAdminRequest(async (token) => {
      await adminRequest(`/players/${player.id}/role`, token, { method: "PATCH", body: JSON.stringify({ role }) });
    }, "Player role updated.");
  }

  async function changePlayerStatus(player, isDisabled) {
    if (!window.confirm(`${isDisabled ? "Disable" : "Re-enable"} ${player.displayName || "this player"}?`)) return;
    await withAdminRequest(async (token) => {
      await adminRequest(`/players/${player.id}/status`, token, { method: "PATCH", body: JSON.stringify({ isDisabled }) });
    }, isDisabled ? "Player access disabled." : "Player access restored.");
  }

  async function saveSetting(event) {
    event.preventDefault();
    let value;
    try { value = JSON.parse(settingValue); } catch { setWorkspaceError("Setting value must be valid JSON."); return; }
    await withAdminRequest(async (token) => {
      await adminRequest(`/settings/${settingKey}`, token, { method: "PUT", body: JSON.stringify({ value }) });
      setSettingKey(""); setSettingValue("{}");
    }, "Platform setting saved.");
  }

  async function grantEntitlement(event) {
    event.preventDefault();
    await withAdminRequest(async (token) => {
      await adminRequest("/entitlements", token, { method: "POST", body: JSON.stringify({ ...entitlementForm, expiresAt: entitlementForm.expiresAt ? new Date(entitlementForm.expiresAt).toISOString() : null }) });
      setEntitlementForm({ playerId: "", resource: "", expiresAt: "" });
    }, "Access entitlement granted.");
  }

  async function revokeEntitlement(entitlement) {
    if (!window.confirm(`Revoke ${entitlement.resource} access?`)) return;
    await withAdminRequest(async (token) => {
      await adminRequest(`/entitlements/${entitlement.id}/revoke`, token, { method: "PATCH" });
    }, "Access entitlement revoked.");
  }

  function editCountryAsset(asset) {
    setEditingCountryAssetId(asset.id);
    setCountryAssetForm({ country: asset.country, imageUrl: asset.imageUrl, caption: asset.caption || "" });
    setTab("countries");
  }

  async function saveCountryAsset(event) {
    event.preventDefault();
    await withAdminRequest(async (token) => {
      const path = editingCountryAssetId ? `/country-assets/${editingCountryAssetId}` : "/country-assets";
      await adminRequest(path, token, { method: editingCountryAssetId ? "PATCH" : "POST", body: JSON.stringify({ ...countryAssetForm, caption: countryAssetForm.caption || null }) });
      setCountryAssetForm(blankCountryAsset); setEditingCountryAssetId(null);
    }, editingCountryAssetId ? "Country image updated." : "Country image added.");
  }

  function editOffer(offer) {
    setEditingOfferId(offer.id);
    setOfferForm({ ...offer, description: offer.description || "", amountMinor: String(offer.amountMinor) });
    setTab("commerce");
  }

  function startA54ModeOffer(mode, title) {
    setEditingOfferId(null);
    setOfferForm({ key: `a54.${mode}`, title: `A-54: ${title}`, description: `Unlock the ${title} A-54 card-game mode.`, kind: "GAME", resource: `card-mode:${mode}`, amountMinor: "", currency: "USD", interval: "ONE_TIME", isActive: false });
    setTab("commerce");
  }

  async function saveOffer(event) {
    event.preventDefault();
    await withAdminRequest(async (token) => {
      const path = editingOfferId ? `/offers/${editingOfferId}` : "/offers";
      await adminRequest(path, token, { method: editingOfferId ? "PATCH" : "POST", body: JSON.stringify({ ...offerForm, amountMinor: Number(offerForm.amountMinor), description: offerForm.description || null }) });
      setOfferForm(blankOffer); setEditingOfferId(null);
    }, editingOfferId ? "Price offer updated." : "Price offer created.");
  }

  if (authLoading) return <main className="admin-screen"><p>Checking secure sign-in…</p></main>;

  if (!firebaseReady || !auth) return (
    <main className="admin-screen">
      <section className="admin-login-card">
        <div className="admin-brand"><span><ShieldCheck size={22} /></span><div><strong>Igiti Play</strong><small>Administrator workspace</small></div></div>
        <h1>One setup step remains</h1>
        <p>Firebase web configuration is not present in this deployment. Add the public Firebase Web App values to Vercel Environment Variables, then redeploy the staging branch.</p>
        <ul className="admin-setup-list"><li>VITE_FIREBASE_API_KEY</li><li>VITE_FIREBASE_AUTH_DOMAIN</li><li>VITE_FIREBASE_PROJECT_ID</li><li>VITE_FIREBASE_APP_ID</li><li>VITE_API_BASE_URL</li></ul>
        <Link className="admin-back-link" to="/">← Return to Igiti Play</Link>
      </section>
    </main>
  );

  if (!user) return (
    <main className="admin-screen">
      <form className="admin-login-card" onSubmit={handleLogin}>
        <div className="admin-brand"><span><ShieldCheck size={22} /></span><div><strong>Igiti Play</strong><small>Administrator workspace</small></div></div>
        <p className="admin-eyebrow">RESTRICTED ACCESS</p>
        <h1>Welcome back.</h1>
        <p>Sign in with your verified administrator account to manage the game library and players.</p>
        {loginError && <p className="admin-alert" role="alert">{loginError}</p>}
        <label className="admin-field">Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="admin-field">Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="admin-button admin-button-primary admin-button-wide" type="submit">Sign in securely <ShieldCheck size={16} /></button>
        <Link className="admin-back-link" to="/">← Return to Igiti Play</Link>
      </form>
    </main>
  );

  // The control room is not a player-facing destination. A signed-in player,
  // student, teacher, or school should be sent to the role portal rather than
  // being left with an alarming authorization message.
  if (workspaceError.includes("does not have an administrator role")) return (
    <main className="admin-screen">
      <section className="admin-login-card admin-role-redirect">
        <div className="admin-brand"><span><Gamepad2 size={22} /></span><div><strong>Igiti Play</strong><small>Role workspace</small></div></div>
        <p className="admin-eyebrow">YOU'RE SIGNED IN</p>
        <h1>This account has its own portal.</h1>
        <p>The Igiti Play control room is reserved for platform owners and administrators. Your account can still play, learn, or assign games according to its role.</p>
        <Link className="admin-button admin-button-primary admin-button-wide" to="/workspace">Open my role portal <ArrowLeft size={16} className="admin-flip-icon" /></Link>
        <button className="admin-back-link admin-link-button" onClick={() => signOut(auth)}>Sign out and use another account</button>
      </section>
    </main>
  );

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/"><span><ShieldCheck size={22} /></span><div><strong>Igiti Play</strong><small>Control room</small></div></Link>
        <div className="admin-side-label">WORKSPACE</div>
        <button className={tab === "overview" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("overview")}><BarChart3 size={17} /> Overview</button>
        <button className={tab === "games" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("games")}><Gamepad2 size={17} /> Games & puzzles</button>
        <button className={tab === "players" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("players")}><Users size={17} /> Players</button>
        {adminSession?.role === "OWNER" && <button className={tab === "countries" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("countries")}><BookOpen size={17} /> Country media</button>}
        {administratorRoles.has(adminSession?.role) && <><button className={tab === "commerce" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("commerce")}><CreditCard size={17} /> Purchases & access</button><button className={tab === "controls" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("controls")}><Settings size={17} /> Platform controls</button></>}
        <div className="admin-sidebar-bottom"><span className="admin-secure-dot" /> Signed in as <strong>{user.email}</strong><button onClick={() => signOut(auth)}><LogOut size={15} /> Sign out</button></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar"><div><span className="admin-eyebrow">IGITI PLAY / CONTROL ROOM</span><h1>{tab === "overview" ? "Platform overview" : tab === "games" ? "Games & puzzles" : tab === "players" ? "Player activity" : tab === "countries" ? "Country media" : tab === "commerce" ? "Purchases & access" : "Platform controls"}</h1></div><div className="admin-top-actions"><a href="/" target="_blank" rel="noreferrer">View player site ↗</a><button className="admin-icon-button" onClick={() => loadWorkspace()} disabled={loading} aria-label="Refresh data"><RefreshCw size={17} /></button></div></header>
        {workspaceError && <div className="admin-alert" role="alert"><CircleAlert size={17} />{workspaceError}</div>}
        {notice && <div className="admin-success" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={15} /></button></div>}
        {loading && <p className="admin-loading">Loading your workspace…</p>}

        {tab === "overview" && <div className="admin-content">
          <div className="admin-welcome"><div><span className="admin-eyebrow">GOOD TO SEE YOU</span><h2>Your platform, at a glance.</h2><p>Manage what players can discover, play and return to.</p></div><button className="admin-button admin-button-primary" onClick={startNewGame}><Plus size={16} /> Add a game</button></div>
          <div className="admin-stats-grid"><StatCard label="Total games" value={overview?.games} icon={Gamepad2} /><StatCard label="Published games" value={overview?.publishedGames} icon={BookOpen} /><StatCard label="Puzzles" value={overview?.puzzles} icon={CheckCircle2} /><StatCard label="Registered players" value={overview?.players} icon={Users} /><StatCard label="Saved sessions" value={overview?.savedProgress} icon={BarChart3} /><StatCard label="Completions" value={overview?.completions} icon={CheckCircle2} /></div>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Recently updated games</h2><p>Review status and continue editing the collection.</p></div><button className="admin-button admin-button-light" onClick={() => setTab("games")}>Manage all <ArrowLeft size={15} className="admin-flip-icon" /></button></div>
            {games.slice(0, 5).map((game) => <article className="admin-list-row" key={game.id}><img src={game.coverImage} alt="" /><div className="admin-list-copy"><strong>{game.title}</strong><span>{game.category} · {game.puzzles.length} puzzle(s)</span></div><span className={`admin-status status-${game.status.toLowerCase()}`}>{game.status}</span><button className="admin-row-action" onClick={() => startEditGame(game)}>Edit</button></article>)}
            {!games.length && <p className="admin-empty">No games yet. Add your first game to begin building the collection.</p>}
          </section>
        </div>}

        {tab === "games" && <div className="admin-content admin-game-layout">
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>{editingGameId ? "Edit game" : "Create a game"}</h2><p>Control the public title, story, cover and publishing state.</p></div>{editingGameId && <button className="admin-icon-button" onClick={() => { setEditingGameId(null); setGameForm(blankGame); }} aria-label="Cancel edit"><X size={16} /></button>}</div>
            <form className="admin-form" onSubmit={saveGame}>
              <label className="admin-field">Title<input value={gameForm.title} onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })} required minLength={2} maxLength={140} /></label>
              <label className="admin-field">URL slug<input value={gameForm.slug} onChange={(e) => setGameForm({ ...gameForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /><small>Lowercase words separated by hyphens.</small></label>
              <label className="admin-field">Description<textarea value={gameForm.description} onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })} required rows={3} /></label>
              <label className="admin-field">Category<input value={gameForm.category} onChange={(e) => setGameForm({ ...gameForm, category: e.target.value })} required /></label>
              <ImageUploadField label="Game cover image" value={gameForm.coverImage} uploading={saving} onUpload={(file) => uploadImage(file, (coverImage) => setGameForm((current) => ({ ...current, coverImage })))} />
              <label className="admin-field">Publishing state<select value={gameForm.status} onChange={(e) => setGameForm({ ...gameForm, status: e.target.value })}><option value="DRAFT">Draft — hidden from players</option><option value="PUBLISHED">Published — visible to players</option><option value="ARCHIVED">Archived — hidden from players</option></select></label>
              <button className="admin-button admin-button-primary admin-button-wide" type="submit" disabled={saving}><Save size={16} /> {saving ? "Saving…" : editingGameId ? "Save game changes" : "Create game"}</button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Game library</h2><p>{games.length} game(s) · select a game to manage its puzzles.</p></div></div>
            {games.map((game) => <article className={`admin-game-item ${activeGameId === game.id ? "selected" : ""}`} key={game.id}>
              <div className="admin-game-item-head"><img src={game.coverImage} alt="" /><div className="admin-list-copy"><strong>{game.title}</strong><span>{game.slug} · {game.puzzles.length} puzzle(s)</span><span className={`admin-status status-${game.status.toLowerCase()}`}>{game.status}</span></div></div>
              <div className="admin-inline-actions"><button className="admin-button admin-button-light" onClick={() => startEditGame(game)}>Edit game</button><button className="admin-button admin-button-light" onClick={() => setActiveGameId(activeGameId === game.id ? null : game.id)}>{activeGameId === game.id ? "Hide puzzles" : "Manage puzzles"}</button>{game.status !== "PUBLISHED" ? <button className="admin-button admin-button-green" onClick={() => changeGameStatus(game, "PUBLISHED")}>Publish</button> : <button className="admin-button admin-button-light" onClick={() => changeGameStatus(game, "DRAFT")}>Unpublish</button>}<button className="admin-icon-button danger" onClick={() => deleteGame(game)} aria-label={`Delete ${game.title}`}><Trash2 size={15} /></button></div>
              {activeGameId === game.id && <div className="admin-puzzles"><div className="admin-puzzle-heading"><strong>Puzzles for {game.title}</strong><button className="admin-button admin-button-primary" onClick={() => startNewPuzzle(game.id)}><Plus size={14} /> Add puzzle</button></div>
                {game.puzzles.map((puzzle) => <div className="admin-puzzle-row" key={puzzle.id}><div><strong>{puzzle.title}</strong><span>{puzzle.pieceCount} pieces · {puzzle.difficulty} · {puzzle.isActive ? "Active" : "Inactive"}</span></div><button className="admin-row-action" onClick={() => startEditPuzzle(game.id, puzzle)}>Edit</button><button className="admin-row-action" onClick={() => togglePuzzle(game.id, puzzle)}>{puzzle.isActive ? "Deactivate" : "Activate"}</button><button className="admin-row-action danger-text" onClick={() => deletePuzzle(puzzle)}>Delete</button></div>)}
                {(!game.puzzles || game.puzzles.length === 0) && <p className="admin-empty">No puzzles yet. Add one to make this game playable.</p>}
                {activeGameId === game.id && <form className="admin-form admin-puzzle-form" onSubmit={savePuzzle}><div className="admin-panel-heading"><h3>{editingPuzzleId ? "Edit puzzle" : "New puzzle"}</h3>{editingPuzzleId && <button type="button" className="admin-icon-button" onClick={() => { setEditingPuzzleId(null); setPuzzleForm(blankPuzzle); }}><X size={15} /></button>}</div>
                  <label className="admin-field">Puzzle title<input value={puzzleForm.title} onChange={(e) => setPuzzleForm({ ...puzzleForm, title: e.target.value })} required /></label>
                  <label className="admin-field">Slug<input value={puzzleForm.slug} onChange={(e) => setPuzzleForm({ ...puzzleForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
                  <ImageUploadField label="Puzzle image" value={puzzleForm.imageUrl} uploading={saving} onUpload={(file) => uploadImage(file, (imageUrl) => setPuzzleForm((current) => ({ ...current, imageUrl })))} />
                  <div className="admin-form-two"><label className="admin-field">Pieces<input type="number" min="2" max="1000" value={puzzleForm.pieceCount} onChange={(e) => setPuzzleForm({ ...puzzleForm, pieceCount: e.target.value })} required /></label><label className="admin-field">Difficulty<select value={puzzleForm.difficulty} onChange={(e) => setPuzzleForm({ ...puzzleForm, difficulty: e.target.value })}><option value="RELAXED">Relaxed</option><option value="CURIOUS">Curious</option><option value="CHALLENGING">Challenging</option><option value="EXPERT">Expert</option></select></label></div>
                  <fieldset className="admin-difficulty-options"><legend>Levels players may choose</legend>{["RELAXED", "CURIOUS", "CHALLENGING", "EXPERT"].map((level) => <label key={level}><input type="checkbox" checked={puzzleForm.allowedDifficulties.includes(level)} onChange={(event) => setPuzzleForm({ ...puzzleForm, allowedDifficulties: event.target.checked ? [...puzzleForm.allowedDifficulties, level] : puzzleForm.allowedDifficulties.filter((item) => item !== level) })} disabled={puzzleForm.allowedDifficulties.length === 1 && puzzleForm.allowedDifficulties.includes(level)} /> {level.charAt(0) + level.slice(1).toLowerCase()}</label>)}</fieldset>
                  <label className="admin-field">Completion fun fact <small>Displayed in a celebratory pop-up when this puzzle is solved.</small><textarea value={puzzleForm.funFact} onChange={(e) => setPuzzleForm({ ...puzzleForm, funFact: e.target.value })} maxLength={500} rows={2} /></label>
                  <div className="admin-form-two"><label className="admin-field">Puzzle price <small>Leave blank for free play.</small><input type="number" min="0" step="0.01" value={puzzleForm.price} onChange={(e) => setPuzzleForm({ ...puzzleForm, price: e.target.value })} placeholder="0.00" /></label><label className="admin-field">Currency<select value={puzzleForm.currency} onChange={(e) => setPuzzleForm({ ...puzzleForm, currency: e.target.value })}><option value="USD">USD</option><option value="RWF">RWF</option><option value="KES">KES</option><option value="UGX">UGX</option></select></label></div>
                  <div className="admin-form-two"><label className="admin-field">Sort order<input type="number" min="0" value={puzzleForm.sortOrder} onChange={(e) => setPuzzleForm({ ...puzzleForm, sortOrder: e.target.value })} /></label><label className="admin-checkbox"><input type="checkbox" checked={puzzleForm.isActive} onChange={(e) => setPuzzleForm({ ...puzzleForm, isActive: e.target.checked })} /> Available to players</label></div>
                  <button className="admin-button admin-button-primary admin-button-wide" type="submit" disabled={saving}><Save size={15} /> {editingPuzzleId ? "Save puzzle" : "Add puzzle"}</button>
                </form>}
              </div>}
            </article>)}
            {!games.length && <p className="admin-empty">No games have been created yet.</p>}
          </section>
        </div>}

        {tab === "players" && <div className="admin-content"><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Player directory</h2><p>Latest 200 profiles and saved-session activity. Sensitive authentication credentials are never displayed.</p></div></div>
          {players.map((player) => <article className="admin-player-row" key={player.id}><span className="admin-player-avatar">{(player.displayName || "P").trim().slice(0, 1).toUpperCase()}</span><div className="admin-list-copy"><strong>{player.displayName || "Player"}{player.isDisabled ? " · Disabled" : ""}</strong><span>Joined {new Date(player.createdAt).toLocaleDateString()} · Last active {new Date(player.updatedAt).toLocaleDateString()}</span></div><span className="admin-player-sessions">{player._count.progress} saved session(s)</span><label className="admin-field" aria-label={`Role for ${player.displayName || "player"}`}><select value={player.role} onChange={(event) => changePlayerRole(player, event.target.value)} disabled={saving || adminSession?.role !== "OWNER"}>{platformRoles.map((role) => <option key={role} value={role}>{role.replace("_", " ")}</option>)}</select></label>{adminSession?.role === "OWNER" && <button className="admin-row-action" onClick={() => changePlayerStatus(player, !player.isDisabled)} disabled={saving}>{player.isDisabled ? "Enable" : "Disable"}</button>}</article>)}
          {!players.length && <p className="admin-empty">Player profiles will appear here when players sign in and save progress.</p>}
        </section></div>}

        {tab === "countries" && adminSession?.role === "OWNER" && <div className="admin-content admin-game-layout">
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{editingCountryAssetId ? "Update country card" : "Add country card"}</h2><p>Choose one visual per country. It will be used across that country’s two A-54 cards, stays in Firebase Storage, and is audited.</p></div>{editingCountryAssetId && <button className="admin-icon-button" onClick={() => { setEditingCountryAssetId(null); setCountryAssetForm(blankCountryAsset); }}><X size={16} /></button>}</div>
            <form className="admin-form" onSubmit={saveCountryAsset}><label className="admin-field">Country<input value={countryAssetForm.country} onChange={(e) => setCountryAssetForm({ ...countryAssetForm, country: e.target.value })} required /></label><ImageUploadField label="Country card image" value={countryAssetForm.imageUrl} uploading={saving} onUpload={(file) => uploadImage(file, (imageUrl) => setCountryAssetForm((current) => ({ ...current, imageUrl })))} /><label className="admin-field">Caption <small>(optional)</small><input value={countryAssetForm.caption} onChange={(e) => setCountryAssetForm({ ...countryAssetForm, caption: e.target.value })} maxLength={280} /></label><button className="admin-button admin-button-primary admin-button-wide" disabled={saving || !countryAssetForm.imageUrl}><Save size={15} /> {editingCountryAssetId ? "Save country card" : "Add country card"}</button></form>
          </section>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Country image catalogue</h2><p>{countryAssets.length} country image(s) available to game content.</p></div></div>{countryAssets.map((asset) => <article className="admin-list-row" key={asset.id}><img src={asset.imageUrl} alt="" /><div className="admin-list-copy"><strong>{asset.country}</strong><span>{asset.caption || "No caption"}</span></div><button className="admin-row-action" onClick={() => editCountryAsset(asset)}>Update</button></article>)}{!countryAssets.length && <p className="admin-empty">No country images have been added yet.</p>}</section>
        </div>}

        {tab === "commerce" && <div className="admin-content admin-game-layout">
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{editingOfferId ? "Update offer" : "Game and account prices"}</h2><p>Only the owner can activate an offer. Checkout will always use this server-side price.</p></div>{editingOfferId && <button className="admin-icon-button" onClick={() => { setEditingOfferId(null); setOfferForm(blankOffer); }}><X size={16} /></button>}</div>
            {adminSession?.role === "OWNER" && <div className="admin-mode-pricing"><strong>A-54 card-game mode prices</strong><small>Select a mode to create its server-owned price and checkout entitlement.</small><div>{a54Modes.map(([mode, title]) => <button type="button" className="admin-button admin-button-light" key={mode} onClick={() => startA54ModeOffer(mode, title)}>{title}</button>)}</div></div>}
            {adminSession?.role === "OWNER" && <form className="admin-form" onSubmit={saveOffer}><label className="admin-field">Offer key<input value={offerForm.key} onChange={(e) => setOfferForm({ ...offerForm, key: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="game.a54" required /></label><label className="admin-field">Title<input value={offerForm.title} onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })} required /></label><label className="admin-field">Description<input value={offerForm.description} onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })} maxLength={500} /></label><div className="admin-form-two"><label className="admin-field">For<select value={offerForm.kind} onChange={(e) => setOfferForm({ ...offerForm, kind: e.target.value })}><option value="GAME">Specific game</option><option value="ACCOUNT">Account plan</option></select></label><label className="admin-field">Access resource<input value={offerForm.resource} onChange={(e) => setOfferForm({ ...offerForm, resource: e.target.value.toLowerCase() })} placeholder="game:a54" required /></label></div><div className="admin-form-two"><label className="admin-field">Price in minor units<input type="number" min="0" value={offerForm.amountMinor} onChange={(e) => setOfferForm({ ...offerForm, amountMinor: e.target.value })} required /></label><label className="admin-field">Currency<input value={offerForm.currency} onChange={(e) => setOfferForm({ ...offerForm, currency: e.target.value.toUpperCase() })} maxLength={3} required /></label></div><div className="admin-form-two"><label className="admin-field">Billing<select value={offerForm.interval} onChange={(e) => setOfferForm({ ...offerForm, interval: e.target.value })}><option value="ONE_TIME">One-time</option><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label><label className="admin-checkbox"><input type="checkbox" checked={offerForm.isActive} onChange={(e) => setOfferForm({ ...offerForm, isActive: e.target.checked })} /> Visible for checkout</label></div><button className="admin-button admin-button-primary admin-button-wide" disabled={saving}><Save size={15} /> {editingOfferId ? "Save price" : "Create price offer"}</button></form>}
            {offers.map((offer) => <article className="admin-list-row" key={offer.id}><div className="admin-list-copy"><strong>{offer.title} · {offer.amountMinor} {offer.currency}</strong><span>{offer.kind} · {offer.interval.replace("_", " ")} · {offer.resource}</span></div><span className={`admin-status status-${offer.isActive ? "published" : "draft"}`}>{offer.isActive ? "ACTIVE" : "DRAFT"}</span>{adminSession?.role === "OWNER" && <button className="admin-row-action" onClick={() => editOffer(offer)}>Edit</button>}</article>)}
            {!offers.length && <p className="admin-empty">No paid game or account offers have been configured.</p>}
          </section>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Verified payment orders</h2><p>Payment redirects never grant play access. Only a server-verified provider callback can mark an order paid.</p></div></div>
            {paymentOrders.map((order) => <article className="admin-list-row" key={order.id}><div className="admin-list-copy"><strong>{order.player.displayName || "Player"} · {order.amountMinor} {order.currency}</strong><span>{order.provider} · {order.providerOrderId || "Awaiting provider reference"} · {new Date(order.createdAt).toLocaleString()}</span></div><span className={`admin-status status-${order.status === "PAID" ? "published" : "draft"}`}>{order.status}</span></article>)}
            {!paymentOrders.length && <p className="admin-empty">No game payment orders have been recorded yet.</p>}
          </section>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Access entitlements</h2><p>Owners can grant or revoke access for support cases. All changes are logged.</p></div></div>
            {adminSession?.role === "OWNER" && <form className="admin-form" onSubmit={grantEntitlement}><label className="admin-field">Player ID<input value={entitlementForm.playerId} onChange={(e) => setEntitlementForm({ ...entitlementForm, playerId: e.target.value })} required /></label><label className="admin-field">Resource key<input placeholder="game:premium" value={entitlementForm.resource} onChange={(e) => setEntitlementForm({ ...entitlementForm, resource: e.target.value.toLowerCase() })} required /></label><label className="admin-field">Expiry (optional)<input type="datetime-local" value={entitlementForm.expiresAt} onChange={(e) => setEntitlementForm({ ...entitlementForm, expiresAt: e.target.value })} /></label><button className="admin-button admin-button-primary" type="submit" disabled={saving}><Plus size={15} /> Grant access</button></form>}
            {entitlements.map((entitlement) => <article className="admin-list-row" key={entitlement.id}><div className="admin-list-copy"><strong>{entitlement.resource} · {entitlement.player.displayName || "Player"}</strong><span>{entitlement.expiresAt ? `Expires ${new Date(entitlement.expiresAt).toLocaleString()}` : "No expiry"}{entitlement.order ? ` · ${entitlement.order.provider} order` : " · Manual grant"}</span></div><span className={`admin-status status-${entitlement.status === "ACTIVE" ? "published" : "archived"}`}>{entitlement.status}</span>{adminSession?.role === "OWNER" && entitlement.status === "ACTIVE" && <button className="admin-row-action danger-text" onClick={() => revokeEntitlement(entitlement)}>Revoke</button>}</article>)}
          </section>
        </div>}

        {tab === "controls" && <div className="admin-content admin-game-layout">
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Platform settings</h2><p>Structured JSON configuration is server-owned and fully audited. Never add payment credentials here.</p></div></div>
            {adminSession?.role === "OWNER" && <form className="admin-form" onSubmit={saveSetting}><label className="admin-field">Setting key<input placeholder="game.access" value={settingKey} onChange={(e) => setSettingKey(e.target.value.toLowerCase())} required /></label><label className="admin-field">JSON value<textarea rows={5} value={settingValue} onChange={(e) => setSettingValue(e.target.value)} required /></label><button className="admin-button admin-button-primary" type="submit" disabled={saving}><Save size={15} /> Save setting</button></form>}
            {settings.map((setting) => <article className="admin-list-row" key={setting.key}><div className="admin-list-copy"><strong>{setting.key}</strong><span>{JSON.stringify(setting.value)} · Updated {new Date(setting.updatedAt).toLocaleString()}</span></div></article>)}
            {!settings.length && <p className="admin-empty">No runtime settings have been created.</p>}
          </section>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Administrative audit trail</h2><p>Latest 200 privileged actions.</p></div><FileText size={18} /></div>
            {auditEvents.map((event) => <article className="admin-list-row" key={event.id}><div className="admin-list-copy"><strong>{event.action}</strong><span>{event.actor.displayName || event.actor.role} · {event.targetType}{event.targetId ? ` · ${event.targetId}` : ""} · {new Date(event.createdAt).toLocaleString()}</span></div></article>)}
            {!auditEvents.length && <p className="admin-empty">Privileged actions will appear here.</p>}
          </section>
        </div>}
        <footer className="admin-footer"><span>Igiti Play Administration</span><span>Access is checked by the API on every protected request.</span></footer>
      </section>
    </main>
  );
}
