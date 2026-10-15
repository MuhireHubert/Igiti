import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowRight, BookOpen, Check, ChevronDown, Compass,
  Crown, Flame, Gamepad2, Globe2, Heart, Leaf, Menu, Puzzle, Search,
  ShieldCheck, Sparkles, Trophy, X,
} from "lucide-react";
import { getGames } from "./lib/api.js";
import PuzzleGame from "./components/PuzzleGame.jsx";

const categories = ["All stories", "Geography", "Wildlife", "Nature"];
const filters = ["All levels", "Relaxed", "Curious", "Challenging"];

function Brand() {
  return (
    <a className="brand" href="#home" aria-label="Igiti Play home">
      <span className="brand-mark"><Leaf size={21} strokeWidth={2.4} /></span>
      <span className="brand-name">igiti<span>play</span></span>
    </a>
  );
}

function Header({ onExplore }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand />
        <nav className={menuOpen ? "nav-links is-open" : "nav-links"} aria-label="Main navigation">
          <a href="#library" onClick={() => { onExplore(); setMenuOpen(false); }}>Explore games</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How to play</a>
          <a href="https://igiti.africa" target="_blank" rel="noreferrer">Igiti Africa ↗</a>
        </nav>
        <div className="top-actions">
          <span className="member-note"><ShieldCheck size={15} /> Play at your pace</span>
          <button className="icon-button mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <a className="button button-dark button-small" href="#library" onClick={onExplore}>Find a game <ArrowRight size={15} /></a>
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
        <img src={game.image} alt="" loading="lazy" />
        <span className="art-wash" />
        <span className="game-category">{game.category}</span>
        {comingSoon ? <span className="coming-label">Coming soon</span> : <span className="play-bubble"><ArrowDownRight size={23} /></span>}
      </button>
      <div className="game-info">
        <div className="game-meta"><span><Puzzle size={14} /> {game.pieces} pieces</span><span>{game.difficulty}</span></div>
        <h3>{game.title}</h3>
        <p>{game.description}</p>
        <button className={comingSoon ? "text-action muted-action" : "text-action"} onClick={() => onSelect(game)} disabled={comingSoon}>
          {comingSoon ? "Join the next chapter" : "Explore this puzzle"} {!comingSoon && <ArrowRight size={16} />}
        </button>
      </div>
    </article>
  );
}

function GamePreview({ game, onBack }) {
  const [playing, setPlaying] = useState(false);
  if (playing) return <PuzzleGame game={game} onBack={() => setPlaying(false)} />;
  return (
    <section className="detail-panel" aria-live="polite">
      <button className="back-link" onClick={onBack}>← Back to the library</button>
      <div className="detail-grid">
        <div className="detail-art"><img src={game.image} alt="" /></div>
        <div className="detail-copy">
          <span className="eyebrow">{game.category} · IGITI ORIGINAL</span>
          <h2>{game.title}</h2>
          <p>{game.description}</p>
          <div className="detail-stats"><span><Puzzle size={16} /> {game.pieces} pieces</span><span><Compass size={16} /> {game.difficulty}</span><span><BookOpen size={16} /> Learn as you play</span></div>
          <div className="notice"><Sparkles size={17} /><span>Your puzzle is ready to play in this staging build. Arrange the image pieces, track your moves, and use the picture guide when you need it.</span></div>
          <button className="button button-primary" onClick={() => setPlaying(true)}>Start puzzle <ArrowRight size={17} /></button>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [games, setGames] = useState([]);
  const [source, setSource] = useState("preview");
  const [loadError, setLoadError] = useState("");
  const [category, setCategory] = useState("All stories");
  const [difficulty, setDifficulty] = useState("All levels");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getGames({ signal: controller.signal })
      .then((result) => { setGames(result.data); setSource(result.source); })
      .catch((error) => { if (error.name !== "AbortError") setLoadError(error.message); });
    return () => controller.abort();
  }, []);

  const visibleGames = useMemo(() => games.filter((game) => {
    const categoryMatches = category === "All stories" || game.category === category;
    const difficultyMatches = difficulty === "All levels" || game.difficulty === difficulty;
    const query = search.trim().toLowerCase();
    return categoryMatches && difficultyMatches && (!query || `${game.title} ${game.description} ${game.category}`.toLowerCase().includes(query));
  }), [games, category, difficulty, search]);

  const explore = () => document.getElementById("library")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div id="home" className="app-shell">
      <div className="announcement"><span><Sparkles size={13} /> A new way to explore Africa through play</span><a href="#library">Discover the collection <ArrowRight size={13} /></a></div>
      <Header onExplore={explore} />
      <main>
        <section className="hero">
          <div className="hero-pattern" aria-hidden="true" />
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> ROOTED IN AFRICA. MADE FOR CURIOUS MINDS.</span>
            <h1>Every piece tells<br />a <em>story.</em></h1>
            <p className="hero-lede">Come closer to the places, people and wonders of Africa. One thoughtful move at a time.</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={explore}>Explore the games <ArrowRight size={17} /></button>
              <a className="button button-outline" href="#how-it-works"><span className="play-mini">▶</span> How it works</a>
            </div>
            <div className="hero-proof"><div className="proof-avatars"><span>🌍</span><span>🧩</span><span>🌿</span></div><span>Made for learners, families & lifelong explorers</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-frame"><img src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1400&q=90" alt="The landscapes and rich natural beauty of Africa" /></div>
            <div className="floating-note note-top"><span className="note-icon"><Globe2 size={18} /></span><span><b>Explore more</b><small>Discover a continent</small></span></div>
            <div className="floating-note note-bottom"><span className="note-icon note-green"><Trophy size={18} /></span><span><b>Learn by doing</b><small>Progress at your pace</small></span></div>
            <div className="hero-stamp"><span>MADE WITH</span><strong>♥</strong><span>FOR AFRICA</span></div>
          </div>
          <a className="scroll-cue" href="#library">SCROLL TO EXPLORE <ChevronDown size={14} /></a>
        </section>

        <section className="value-strip" aria-label="Platform values">
          <div><span className="value-icon"><Compass size={19} /></span><span><b>Explore with purpose</b><small>Every game opens a new window</small></span></div>
          <div><span className="value-icon"><BookOpen size={19} /></span><span><b>Knowledge that stays</b><small>Curiosity leads the way</small></span></div>
          <div><span className="value-icon"><Heart size={19} /></span><span><b>Play your own way</b><small>No rush. No pressure.</small></span></div>
          <div><span className="value-icon"><Crown size={19} /></span><span><b>Celebrate each win</b><small>Small moments matter</small></span></div>
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <div><span className="eyebrow">THE COLLECTION</span><h2>Choose your <em>adventure.</em></h2><p>Start with a story that catches your eye. There is always more to discover.</p></div>
            <div className="collection-count"><strong>{visibleGames.length.toString().padStart(2, "0")}</strong><span>STORIES TO EXPLORE</span></div>
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
          {selected ? <GamePreview game={selected} onBack={() => setSelected(null)} /> : (
            <div className="game-grid">
              {visibleGames.map((game) => <GameCard key={game.id} game={game} onSelect={setSelected} />)}
              {visibleGames.length === 0 && <div className="empty-state"><Search size={26} /><h3>No stories found</h3><p>Try another search or clear one of your filters.</p><button className="text-action" onClick={() => { setCategory("All stories"); setDifficulty("All levels"); setSearch(""); }}>Clear filters <ArrowRight size={15} /></button></div>}
            </div>
          )}
          <div className="library-foot"><span>More stories are on their way.</span><span>Designed in Africa <span className="africa-heart">♥</span> for everyone.</span></div>
        </section>

        <section className="manifesto" id="how-it-works">
          <div className="manifesto-art"><div className="manifesto-ring ring-one" /><div className="manifesto-ring ring-two" /><div className="manifesto-center"><Leaf size={42} /><span>IGITI</span></div><span className="manifesto-tag tag-one">DISCOVER</span><span className="manifesto-tag tag-two">CONNECT</span><span className="manifesto-tag tag-three">REMEMBER</span></div>
          <div className="manifesto-copy"><span className="eyebrow">MORE THAN A GAME</span><h2>Play is how<br />we <em>remember.</em></h2><p>Igiti brings African knowledge into the moments we share. Explore maps, landmarks, wildlife and stories through experiences that make learning feel natural—and worth coming back to.</p><div className="manifesto-points"><span><Check size={16} /> Built around African stories</span><span><Check size={16} /> Designed for curious minds of all ages</span><span><Check size={16} /> A growing collection, made with care</span></div><a className="text-action" href="https://igiti.africa" target="_blank" rel="noreferrer">Discover Igiti's mission <ArrowRight size={16} /></a></div>
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
