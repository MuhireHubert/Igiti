import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ArrowLeft, BarChart3, BookOpen, CheckCircle2, CircleAlert, Gamepad2, LogOut, Plus, RefreshCw, Save, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import { auth, firebaseReady } from "../lib/firebase.js";
import "./AdminPortal.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const blankGame = { slug: "", title: "", description: "", category: "Geography", coverImage: "", status: "DRAFT" };
const blankPuzzle = { slug: "", title: "", imageUrl: "", pieceCount: 60, difficulty: "RELAXED", sortOrder: 0, isActive: false };
const platformRoles = ["PLAYER", "MODERATOR", "CONTENT_MANAGER", "ADMIN", "OWNER"];

async function adminRequest(path, token, options = {}) {
  if (!API_BASE) throw new Error("VITE_API_BASE_URL is missing. Add the staging API URL to the Vercel environment variables and redeploy.");
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
  const [gameForm, setGameForm] = useState(blankGame);
  const [editingGameId, setEditingGameId] = useState(null);
  const [activeGameId, setActiveGameId] = useState(null);
  const [puzzleForm, setPuzzleForm] = useState(blankPuzzle);
  const [editingPuzzleId, setEditingPuzzleId] = useState(null);
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
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
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
      sortOrder: puzzle.sortOrder, isActive: puzzle.isActive,
    });
  }

  async function savePuzzle(event) {
    event.preventDefault();
    if (!activeGameId) return;
    const payload = { ...puzzleForm, pieceCount: Number(puzzleForm.pieceCount), sortOrder: Number(puzzleForm.sortOrder) };
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

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/"><span><ShieldCheck size={22} /></span><div><strong>Igiti Play</strong><small>Control room</small></div></Link>
        <div className="admin-side-label">WORKSPACE</div>
        <button className={tab === "overview" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("overview")}><BarChart3 size={17} /> Overview</button>
        <button className={tab === "games" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("games")}><Gamepad2 size={17} /> Games & puzzles</button>
        <button className={tab === "players" ? "admin-nav active" : "admin-nav"} onClick={() => setTab("players")}><Users size={17} /> Players</button>
        <div className="admin-sidebar-bottom"><span className="admin-secure-dot" /> Signed in as <strong>{user.email}</strong><button onClick={() => signOut(auth)}><LogOut size={15} /> Sign out</button></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar"><div><span className="admin-eyebrow">IGITI PLAY / CONTROL ROOM</span><h1>{tab === "overview" ? "Platform overview" : tab === "games" ? "Games & puzzles" : "Player activity"}</h1></div><div className="admin-top-actions"><a href="/" target="_blank" rel="noreferrer">View player site ↗</a><button className="admin-icon-button" onClick={() => loadWorkspace()} disabled={loading} aria-label="Refresh data"><RefreshCw size={17} /></button></div></header>
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
              <label className="admin-field">Cover image URL<input type="url" value={gameForm.coverImage} onChange={(e) => setGameForm({ ...gameForm, coverImage: e.target.value })} required /></label>
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
                  <label className="admin-field">Puzzle image URL<input type="url" value={puzzleForm.imageUrl} onChange={(e) => setPuzzleForm({ ...puzzleForm, imageUrl: e.target.value })} required /></label>
                  <div className="admin-form-two"><label className="admin-field">Pieces<input type="number" min="2" max="1000" value={puzzleForm.pieceCount} onChange={(e) => setPuzzleForm({ ...puzzleForm, pieceCount: e.target.value })} required /></label><label className="admin-field">Difficulty<select value={puzzleForm.difficulty} onChange={(e) => setPuzzleForm({ ...puzzleForm, difficulty: e.target.value })}><option value="RELAXED">Relaxed</option><option value="CURIOUS">Curious</option><option value="CHALLENGING">Challenging</option><option value="EXPERT">Expert</option></select></label></div>
                  <div className="admin-form-two"><label className="admin-field">Sort order<input type="number" min="0" value={puzzleForm.sortOrder} onChange={(e) => setPuzzleForm({ ...puzzleForm, sortOrder: e.target.value })} /></label><label className="admin-checkbox"><input type="checkbox" checked={puzzleForm.isActive} onChange={(e) => setPuzzleForm({ ...puzzleForm, isActive: e.target.checked })} /> Available to players</label></div>
                  <button className="admin-button admin-button-primary admin-button-wide" type="submit" disabled={saving}><Save size={15} /> {editingPuzzleId ? "Save puzzle" : "Add puzzle"}</button>
                </form>}
              </div>}
            </article>)}
            {!games.length && <p className="admin-empty">No games have been created yet.</p>}
          </section>
        </div>}

        {tab === "players" && <div className="admin-content"><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Player directory</h2><p>Latest 200 profiles and saved-session activity. Sensitive authentication credentials are never displayed.</p></div></div>
          {players.map((player) => <article className="admin-player-row" key={player.id}><span className="admin-player-avatar">{(player.displayName || "P").trim().slice(0, 1).toUpperCase()}</span><div className="admin-list-copy"><strong>{player.displayName || "Player"}</strong><span>Joined {new Date(player.createdAt).toLocaleDateString()} · Last active {new Date(player.updatedAt).toLocaleDateString()}</span></div><span className="admin-player-sessions">{player._count.progress} saved session(s)</span><label className="admin-field" aria-label={`Role for ${player.displayName || "player"}`}><select value={player.role} onChange={(event) => changePlayerRole(player, event.target.value)} disabled={saving || adminSession?.role !== "OWNER"}>{platformRoles.map((role) => <option key={role} value={role}>{role.replace("_", " ")}</option>)}</select></label></article>)}
          {!players.length && <p className="admin-empty">Player profiles will appear here when players sign in and save progress.</p>}
        </section></div>}
        <footer className="admin-footer"><span>Igiti Play Administration</span><span>Access is checked by the API on every protected request.</span></footer>
      </section>
    </main>
  );
}
