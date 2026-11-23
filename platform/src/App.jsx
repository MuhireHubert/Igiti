import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowRight, BookOpen, Check, ChevronDown, Compass,
  Crown, Flame, Gamepad2, Globe2, Heart, Leaf, Menu, Puzzle, Search,
  ShieldCheck, Sparkles, Trophy, X, ChefHat, Drum, Landmark, Languages,
  Lightbulb, PawPrint, Route, Store, PartyPopper, UsersRound, Headphones, Download, Share,
} from "lucide-react";
import { getApiBaseUrl, getGames } from "./lib/api.js";
import { deviceHeaders } from "./lib/device.js";
import PlayerAccount from "./components/PlayerAccount.jsx";
import { usePlayerAuth } from "./lib/PlayerAuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";

const categories = ["All stories", "Geography", "Wildlife", "Nature"];
const filters = ["All levels", "Relaxed", "Curious", "Challenging"];
const gamesUnderTest = [
  { id: "african-heroes", title: "African Heroes: Story Quest", mechanic: "Decision missions", icon: Landmark, phase: "Play now", description: "Make choices, solve clues, and unlock a collectible hero card for every completed chapter.", tags: ["Narrative", "Collectibles", "Classroom"] },
  { id: "taste-of-africa", title: "Taste of Africa", mechanic: "Recipe match", icon: ChefHat, phase: "Play now", description: "Match dishes to countries and regions, assemble recipes, and discover the people and stories behind every plate.", tags: ["Family", "Visual", "Regional"] },
  { id: "wildlife-rangers", title: "African Wildlife Rangers", mechanic: "Conservation missions", icon: PawPrint, phase: "Play now", description: "Identify habitats, match animals to ecosystems, and protect a virtual reserve as difficulty rises.", tags: ["Science", "Younger players", "Strategy"] },
  { id: "music-map", title: "Music Map Challenge", mechanic: "Listen & locate", icon: Drum, phase: "Play now", description: "Hear a short cue, place it on the map, and take on call-and-response rounds.", tags: ["Audio", "Map", "Multiplayer"] },
  { id: "language-explorer", title: "Language Explorer", mechanic: "Hear, match, speak", icon: Languages, phase: "Play now", description: "Match greetings and phrases, hear pronunciation, and identify languages through escalating rounds.", tags: ["Audio", "Language", "Practice"] },
  { id: "kingdoms-timeline", title: "Kingdoms & Civilizations Timeline", mechanic: "Build the timeline", icon: Landmark, phase: "Play now", description: "Place kingdoms, cities, trade routes, and inventions in order across Africa’s rich history.", tags: ["History", "Timeline", "Schools"] },
  { id: "inventors-lab", title: "African Inventors Lab", mechanic: "Solve & build", icon: Lightbulb, phase: "Play now", description: "Build simple solutions for water, health, energy, transport, and agriculture through logic challenges.", tags: ["STEM", "Problem solving", "Schools"] },
  { id: "diaspora-journey", title: "Diaspora Journey", mechanic: "Map the connections", icon: Route, phase: "Play now", description: "Follow people, music, food, language, and history between Africa, the Caribbean, the Americas, Europe, and the Middle East.", tags: ["Map", "Timeline", "Group play"] },
  { id: "market-master", title: "Market Master", mechanic: "Trade & budget", icon: Store, phase: "Play now", description: "Run a market stall, make wise trade decisions, and learn currencies, maths, and entrepreneurship.", tags: ["Maths", "Strategy", "Economy"] },
  { id: "festival-passport", title: "Festival Passport", mechanic: "Travel & collect", icon: PartyPopper, phase: "Play now", description: "Travel through festivals, fashion, architecture, dance, and celebrations to earn country passport stamps.", tags: ["Culture", "Collectibles", "Families"] },
];
const PuzzleGame = lazy(() => import("./components/PuzzleGame.jsx"));
const CardGame = lazy(() => import("./components/CardGame.jsx"));

function GameLoader() {
  return <div className="game-loader" aria-live="polite">Preparing your game…</div>;
}

function DeferredGame({ children }) {
  return <Suspense fallback={<GameLoader />}>{children}</Suspense>;
}

function Brand() {
  return (
    <Link className="brand" to="/games" aria-label="Browse Igiti Play games">
      <span className="brand-mark"><Leaf size={21} strokeWidth={2.4} /></span>
      <span className="brand-name">igiti<span>play</span></span>
    </Link>
  );
}

function InstallIgitiPlay() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(() => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    const onBeforeInstall = (event) => { event.preventDefault(); setInstallPrompt(event); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); setShowIosHelp(false); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBeforeInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function install() {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    if (isIos) setShowIosHelp((current) => !current);
  }

  if (installed) return null;
  return <div className="install-play-wrap"><button className="install-play" type="button" onClick={install} aria-expanded={showIosHelp}><Download size={14} /> Install app</button>{showIosHelp && <div className="install-play-help" role="status"><Share size={15} /><span>In Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</span></div>}</div>;
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand />
        <nav className={menuOpen ? "nav-links is-open" : "nav-links"} aria-label="Main navigation">
          <Link to="/games" onClick={() => setMenuOpen(false)}>Game library</Link>
          <Link to="/how-to-play" onClick={() => setMenuOpen(false)}>How to play</Link>
          <a href="https://igiti.africa" target="_blank" rel="noreferrer">Igiti Africa ↗</a>
        </nav>
        <div className="top-actions">
          <span className="member-note"><ShieldCheck size={15} /> Save your progress</span>
          <InstallIgitiPlay />
          <PlayerAccount />
          <button className="icon-button mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link className="button button-dark button-small" to="/games">Find a game <ArrowRight size={15} /></Link>
        </div>
      </div>
    </header>
  );
}

function GameCard({ game, onSelect }) {
  const comingSoon = game.status === "coming-soon";
  return (
    <article className={`game-card ${comingSoon ? "is-coming" : ""}`}>
      <button className="game-art" onClick={() => onSelect(game)} aria-label={`View ${game.title}`} disabled={comingSoon}>
        {game.image ? <img src={game.image} alt="" loading="lazy" /> : <span className="game-art-placeholder" aria-hidden="true">Igiti Play</span>}
        <span className="art-wash" />
        <span className="game-category">{game.category}</span>
        {comingSoon ? <span className="coming-label">Coming soon</span> : <span className="play-bubble"><ArrowDownRight size={23} /></span>}
      </button>
      <div className="game-info">
        <div className="game-meta"><span><Puzzle size={14} /> {game.pieces} pieces</span><span>{game.difficulty}</span></div>
        <h3>{game.title}</h3>
        <p>{game.description}</p>
        <button className={comingSoon ? "text-action muted-action" : "text-action"} onClick={() => onSelect(game)} disabled={comingSoon}>
          {comingSoon ? "Coming next" : "Play now"} {!comingSoon && <ArrowRight size={16} />}
        </button>
      </div>
    </article>
  );
}

function GamePreview({ game, onBack }) {
  const { user } = usePlayerAuth();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [cataloguePolicy, setCataloguePolicy] = useState(null);
  const paid = Number(game.price?.amountMinor || 0) > 0;
  const requiresPurchase = paid || game.requiresPurchase;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getApiBaseUrl()}/v1/access-policy`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Access is currently unavailable.")))
      .then((payload) => setCataloguePolicy(payload.data || { catalogueRequiresSubscription: false }))
      .catch((error) => { if (error.name !== "AbortError") setAccessMessage(error.message); });
    return () => controller.abort();
  }, []);
  async function startPuzzle() {
    if (!cataloguePolicy) { setAccessMessage("Checking access. Please try again in a moment."); return; }
    if (!requiresPurchase) { setPlaying(true); return; }
    if (!user) { setAccessMessage("Sign in, then purchase access before playing this paid game."); return; }
    setCheckingAccess(true);
    setAccessMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getApiBaseUrl()}/v1/me/puzzles/${game.id}/access`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...deviceHeaders() } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We couldn't check access to this game.");
      if (payload.data?.permitted) { setPlaying(true); return; }
      setAccessMessage(`This game requires purchase. ${payload.data?.offer?.title || "Open your workspace to complete secure Pesapal checkout."}`);
    } catch (error) { setAccessMessage(error.message); } finally { setCheckingAccess(false); }
  }
  if (game.kind === "card") return <DeferredGame><CardGame onBack={onBack} /></DeferredGame>;
  if (playing) return <DeferredGame><PuzzleGame game={game} onBack={() => setPlaying(false)} /></DeferredGame>;
  return (
    <section className="detail-panel" aria-live="polite">
      <button className="back-link" onClick={onBack}>← Back to the library</button>
      <div className="detail-grid">
        <div className="detail-art"><img src={game.image} alt="" /></div>
        <div className="detail-copy">
          <span className="eyebrow">{game.category} · PUZZLE QUEST</span>
          <h2>{game.title}</h2>
          <p>{game.description}</p>
          <div className="detail-stats"><span><Puzzle size={16} /> {game.pieces} pieces</span><span><Compass size={16} /> {game.difficulty}</span><span><BookOpen size={16} /> Learn as you play</span></div>
          <div className="notice"><Sparkles size={17} /><span>Beat the board, protect your streak, and return anytime—your progress saves automatically.</span></div>
          {accessMessage && <p className="inline-error" role="alert">{accessMessage}</p>}
          {requiresPurchase && <p className="game-price">{paid ? `Individual access · ${(Number(game.price.amountMinor) / 100).toFixed(2)} ${game.price.currency}` : "Subscriber access required"}</p>}
          <button className="button button-primary" onClick={startPuzzle} disabled={checkingAccess || !cataloguePolicy}>{checkingAccess || !cataloguePolicy ? "Checking access…" : requiresPurchase ? "View subscription plans" : "Play for free"} <ArrowRight size={17} /></button>
          {requiresPurchase && <button className="text-action game-checkout-link" onClick={() => navigate("/workspace")}>View plans and secure checkout <ArrowRight size={16} /></button>}
        </div>
      </div>
    </section>
  );
}

function App() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [source, setSource] = useState("preview");
  const [loadError, setLoadError] = useState("");
  const [category, setCategory] = useState("All stories");
  const [difficulty, setDifficulty] = useState("All levels");
  const [search, setSearch] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getGames({ signal: controller.signal })
      .then((result) => { setGames(result.data); setSource(result.source); })
      .catch((error) => { if (error.name !== "AbortError") setLoadError(error.message); });
    return () => controller.abort();
  }, []);

  const libraryGames = useMemo(() => [{
    id: "a54-card-game", kind: "card", title: "A-54: Africa Card Game", category: "Card game", description: "A 108-card deck: two cards for every African country, with eight ways to play.", difficulty: "All modes", pieces: 108, image: "/images/a54-card-game-thumbnail.png", status: "available",
  }, ...games], [games]);
  const visibleGames = useMemo(() => libraryGames.filter((game) => {
    const categoryMatches = category === "All stories" || game.category === category;
    const difficultyMatches = difficulty === "All levels" || game.difficulty === difficulty;
    const query = search.trim().toLowerCase();
    return categoryMatches && difficultyMatches && (!query || `${game.title} ${game.description} ${game.category}`.toLowerCase().includes(query));
  }), [libraryGames, category, difficulty, search]);

  return (
    <div id="home" className="app-shell">
      <div className="announcement"><span><Sparkles size={13} /> NEW QUESTS · AFRICA'S STORIES, PLAYABLE</span><Link to="/games">Choose a game <ArrowRight size={13} /></Link></div>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-pattern" aria-hidden="true" />
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> IGITI PLAY · PRESS START</span>
            <h1>Africa is your<br />next <em>level.</em></h1>
            <p className="hero-lede">Pick a puzzle, race the clock, and unlock a new way to see Africa—one smart move at a time.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/games">Start playing <ArrowRight size={17} /></Link>
              <Link className="button button-outline" to="/how-to-play"><span className="play-mini">▶</span> Learn the rules</Link>
            </div>
            <div className="hero-proof"><div className="proof-avatars"><span>⚡</span><span>🧩</span><span>🏆</span></div><span>Puzzles, scores, saves, and more quests ahead</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-frame"><img src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1400&q=90" alt="The landscapes and rich natural beauty of Africa" /></div>
            <div className="floating-note note-top"><span className="note-icon"><Globe2 size={18} /></span><span><b>Quest mode</b><small>Explore every region</small></span></div>
            <div className="floating-note note-bottom"><span className="note-icon note-green"><Trophy size={18} /></span><span><b>Level up</b><small>Track every win</small></span></div>
            <div className="hero-stamp"><span>READY</span><strong>▶</strong><span>PLAYER ONE</span></div>
          </div>
          <Link className="scroll-cue" to="/games">BROWSE THE COLLECTION <ChevronDown size={14} /></Link>
        </section>

        <section className="value-strip" aria-label="Platform values">
          <div><span className="value-icon"><Gamepad2 size={19} /></span><span><b>Jump straight in</b><small>Tap, drag, and solve</small></span></div>
          <div><span className="value-icon"><BookOpen size={19} /></span><span><b>Play with purpose</b><small>Every board has a story</small></span></div>
          <div><span className="value-icon"><Flame size={19} /></span><span><b>Build your streak</b><small>Your progress stays with you</small></span></div>
          <div><span className="value-icon"><Crown size={19} /></span><span><b>Chase the win</b><small>Beat your best time</small></span></div>
        </section>

        <section className="play-paths" aria-label="What you can do in Igiti Play">
          <div className="play-paths-heading"><span className="eyebrow">A COMPLETE PLAY SPACE</span><h2>Everything here has a <em>purpose.</em></h2><p>Choose a meaningful challenge, learn as you play, and keep every paid experience secure and easy to return to.</p></div>
          <div className="play-path-grid">
            <article className="play-path-card"><span className="play-path-icon"><Puzzle size={23} /></span><span className="play-path-kicker">PUZZLE QUESTS</span><h3>Build the picture. Unlock the story.</h3><p>Choose your level, use a limited hint when you need it, and reveal an admin-curated fact with every correct piece.</p><Link to="/games" className="play-path-link">Explore puzzles <ArrowRight size={16} /></Link></article>
            <article className="play-path-card play-path-featured"><span className="play-path-icon"><Gamepad2 size={23} /></span><span className="play-path-kicker">A-54 CARD GAME</span><h3>108 country cards. Eight distinct ways to think.</h3><p>Test memory, geography, quick facts, regions, strategy, and role play—then explore map layers, audio cues, and private real-time multiplayer rooms.</p><Link to="/games/a54-card-game" className="play-path-link">Open A-54 <ArrowRight size={16} /></Link></article>
            <article className="play-path-card"><span className="play-path-icon"><ShieldCheck size={23} /></span><span className="play-path-kicker">YOUR ACCOUNT</span><h3>Progress, plans, and access in one place.</h3><p>Sign in to save your play, see your active access, manage a school plan, and securely unlock paid games through Pesapal.</p><Link to="/settings" className="play-path-link">View account & plans <ArrowRight size={16} /></Link></article>
          </div>
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <div><span className="eyebrow">GAME LIBRARY</span><h2>Pick your next <em>challenge.</em></h2><p>Choose a board, set your pace, and go for the perfect solve.</p></div>
            <div className="collection-count"><strong>{visibleGames.length.toString().padStart(2, "0")}</strong><span>PUZZLES READY</span></div>
          </div>

          <div className="library-tools">
            <div className="category-tabs" role="group" aria-label="Filter by category">
              {categories.map((item) => <button key={item} className={category === item ? "category-tab active" : "category-tab"} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <div className="filter-actions">
              <label className="search-box"><Search size={17} /><input aria-label="Search games" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a story..." /></label>
              <button className="filter-toggle" onClick={() => setMobileFilters(!mobileFilters)}><span>Difficulty</span><ChevronDown size={15} /></button>
              <div className={mobileFilters ? "difficulty-menu open" : "difficulty-menu"}>
                {filters.map((item) => <button key={item} className={difficulty === item ? "selected" : ""} onClick={() => { setDifficulty(item); setMobileFilters(false); }}>{difficulty === item && <Check size={14} />}{item}</button>)}
              </div>
            </div>
          </div>

          {loadError && <p className="inline-error" role="status">{loadError} Showing the preview collection where available.</p>}
          {source === "preview" && <p className="preview-note"><span /> Preview collection · Connect the API to load published games</p>}
          <div className="game-grid">
              {visibleGames.map((game) => <GameCard key={game.id} game={game} onSelect={(item) => navigate(`/games/${item.id}`)} />)}
              {visibleGames.length === 0 && <div className="empty-state"><Search size={26} /><h3>No stories found</h3><p>Try another search or clear one of your filters.</p><button className="text-action" onClick={() => { setCategory("All stories"); setDifficulty("All levels"); setSearch(""); }}>Clear filters <ArrowRight size={15} /></button></div>}
            </div>
          <div className="library-foot"><span>More stories are on their way.</span><span>Designed in Africa <span className="africa-heart">♥</span> for everyone.</span></div>
        </section>

        <section className="test-lab" id="games-under-test" aria-labelledby="test-lab-title">
          <div className="test-lab-heading">
            <div><span className="eyebrow"><span className="eyebrow-dot" /> GAMES UNDER TEST</span><h2 id="test-lab-title">The next Igiti games are being <em>built to play.</em></h2><p>These are purpose-built prototypes—not filler. Each one has one strong core mechanic, culturally grounded content, and a clear route from family play to classroom use.</p></div>
            <div className="test-lab-status"><span>10</span><strong>new game concepts</strong><small>Testing before release keeps each collection meaningful.</small></div>
          </div>
          <div className="igiti-formula" aria-label="The Igiti game design formula">
            <div><Gamepad2 size={20} /><strong>One core mechanic</strong><span>Every game asks one satisfying thing of the player.</span></div>
            <div><Globe2 size={20} /><strong>Beautiful country visuals</strong><span>Places, people, and stories are never generic decoration.</span></div>
            <div><Headphones size={20} /><strong>Audio with purpose</strong><span>Music and language are learned by listening, not just reading.</span></div>
            <div><UsersRound size={20} /><strong>Grow together</strong><span>Difficulty, collections, multiplayer, and classroom assignments scale the experience.</span></div>
          </div>
          <div className="test-game-grid">
            {gamesUnderTest.slice(0, 3).map((game, index) => {
              const Icon = game.icon;
              return <article className="test-game-card" key={game.title}>
                <div className="test-game-top"><span className="test-game-number">{String(index + 1).padStart(2, "0")}</span><span className="test-game-phase">{game.phase}</span></div>
                <span className="test-game-icon"><Icon size={26} /></span>
                <span className="test-game-mechanic">{game.mechanic}</span>
                <h3>{game.title}</h3><p>{game.description}</p>
                <div className="test-game-tags">{game.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                {game.id ? <Link className="test-game-open" to={`/games-under-test/${game.id}`}>Open playable prototype <ArrowRight size={15} /></Link> : <span className="test-game-note">Next concept · not yet in subscriptions</span>}
              </article>;
            })}
          </div>
          <Link className="button button-outline test-lab-all" to="/games-under-test">Explore all ten game engines <ArrowRight size={16} /></Link>
          <p className="test-lab-footnote">We will release games only after content review, playtesting, accessibility checks, and secure access setup. Early concepts do not affect existing paid access or school assignments.</p>
        </section>

        <section className="manifesto" id="how-it-works">
          <div className="manifesto-art"><div className="manifesto-ring ring-one" /><div className="manifesto-ring ring-two" /><div className="manifesto-center"><Leaf size={42} /><span>IGITI</span></div><span className="manifesto-tag tag-one">DISCOVER</span><span className="manifesto-tag tag-two">CONNECT</span><span className="manifesto-tag tag-three">REMEMBER</span></div>
          <div className="manifesto-copy"><span className="eyebrow">HOW TO PLAY</span><h2>Choose. Solve.<br /><em>Level up.</em></h2><p>Every Igiti board turns landmarks, wildlife, maps, and stories into a playable challenge. Finish a puzzle, improve your time, and come back for the next quest.</p><div className="manifesto-points"><span><Check size={16} /> Pick a challenge from the library</span><span><Check size={16} /> Swap or drag pieces into place</span><span><Check size={16} /> Save progress and chase your best score</span></div><Link className="text-action" to="/games">Choose a game <ArrowRight size={16} /></Link></div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main"><Brand /><p>Bringing Africa to life.<br />Adults can learn too.</p><a className="footer-cta" href="https://igiti.africa" target="_blank" rel="noreferrer">Visit igiti.africa <ArrowRight size={15} /></a></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Igiti. Made with care.</span><div><a href="https://igiti.africa" target="_blank" rel="noreferrer">About Igiti</a><a href="https://igiti.africa" target="_blank" rel="noreferrer">Contact</a><span>Learn. Play. Discover.</span></div></div>
      </footer>
    </div>
  );
}

export default App;
