import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Compass, Gamepad2, Leaf, Puzzle, ShieldCheck, Sparkles } from "lucide-react";
import { getApiBaseUrl, getGameById, getGames } from "../lib/api.js";
import PuzzleGame from "../components/PuzzleGame.jsx";
import { usePlayerAuth } from "../lib/PlayerAuthContext.jsx";

function PageHeader() {
  return <header className="page-header"><Link to="/" className="brand"><span className="brand-mark"><Leaf size={21} /></span><span className="brand-name">igiti<span>play</span></span></Link><Link className="back-link" to="/"><ArrowLeft size={15} /> Home</Link></header>;
}

function PageFooter() {
  return <footer className="page-footer"><span>© {new Date().getFullYear()} Igiti · Bringing Africa to life</span><a href="https://igiti.africa" target="_blank" rel="noreferrer">igiti.africa ↗</a></footer>;
}

function PageLayout({ eyebrow, title, subtitle, children }) {
  return <div className="subpage"><PageHeader /><main className="subpage-main"><div className="subpage-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{children}</main><PageFooter /></div>;
}

export function GamesPage() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getGames({ signal: controller.signal }).then((result) => setGames(result.data)).catch((err) => { if (err.name !== "AbortError") setError(err.message); });
    return () => controller.abort();
  }, []);
  return <PageLayout eyebrow="THE IGITI COLLECTION" title={<>A world of stories.<br /><em>Piece by piece.</em></>} subtitle="Browse the collection and find your next little adventure.">
    {error && <p className="inline-error">{error}</p>}
    <div className="subpage-game-grid">{games.map((game) => <Link to={`/games/${game.id}`} className="subpage-game" key={game.id}><img src={game.image} alt="" /><div><span>{game.category} · {game.pieces || "New"} pieces</span><h2>{game.title}</h2><p>{game.description}</p><strong>View game <ArrowRight size={15} /></strong></div></Link>)}</div>
    {games.length === 0 && !error && <p className="page-empty">The collection is being prepared. Please check back soon.</p>}
  </PageLayout>;
}

export function GamePage() {
  const { gameId } = useParams();
  const { user } = usePlayerAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cataloguePolicy, setCataloguePolicy] = useState(null);
  const [accessMessage, setAccessMessage] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getGameById(gameId, { signal: controller.signal })
      .then(setGame)
      .catch(() => setGame(null))
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, [gameId]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getApiBaseUrl()}/v1/access-policy`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Access is currently unavailable.")))
      .then((payload) => setCataloguePolicy(payload.data || { catalogueRequiresSubscription: false }))
      .catch((error) => { if (error.name !== "AbortError") setAccessMessage(error.message); });
    return () => controller.abort();
  }, []);
  const requiresPurchase = Boolean(game?.requiresPurchase || Number(game?.price?.amountMinor || 0) > 0 || cataloguePolicy?.catalogueRequiresSubscription);
  async function startPuzzle() {
    if (!cataloguePolicy) { setAccessMessage("Checking access. Please try again in a moment."); return; }
    if (!requiresPurchase) { setPlaying(true); return; }
    if (!user) { setAccessMessage("Sign in, then purchase access before playing this game."); return; }
    setCheckingAccess(true); setAccessMessage("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getApiBaseUrl()}/v1/me/puzzles/${game.id}/access`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We couldn't check access to this game.");
      if (payload.data?.permitted) { setPlaying(true); return; }
      setAccessMessage(`This game requires purchase. ${payload.data?.offer?.title || "This product needs a checkout offer from the platform owner."}`);
    } catch (error) { setAccessMessage(error.message); } finally { setCheckingAccess(false); }
  }
  return <PageLayout eyebrow="YOUR NEXT ADVENTURE" title={game ? game.title : "A story in the making"} subtitle={game ? game.description : "Explore the growing world of Igiti Play."}>
    {loaded && !game ? <p className="page-empty">We couldn't find that game. <Link to="/games">Return to the collection.</Link></p> : game && (playing
      ? <PuzzleGame game={game} onBack={() => setPlaying(false)} />
      : <div className="subpage-detail"><img src={game.image} alt="" /><div className="subpage-detail-copy"><span className="eyebrow">{game.category} · IGITI ORIGINAL</span><h2>Make room for curiosity.</h2><p>Every puzzle is an invitation to notice more, learn something new, and connect with the stories behind the picture.</p><div className="detail-stats"><span><Puzzle size={16} /> {game.pieces || "Multiple"} pieces</span><span><Compass size={16} /> {game.difficulty}</span><span><BookOpen size={16} /> Learn as you play</span></div><div className="notice"><Sparkles size={17} /><span>Arrange the picture pieces, track your time and moves, and use the picture guide. Progress saves automatically in this browser; account-based cloud saves are the next integration step.</span></div>{accessMessage && <p className="inline-error" role="alert">{accessMessage}</p>}{requiresPurchase && <p className="game-price">Paid access required</p>}<button className="button button-primary" onClick={startPuzzle} disabled={!cataloguePolicy || checkingAccess}>{!cataloguePolicy || checkingAccess ? "Checking access…" : requiresPurchase ? "Play or unlock" : "Start puzzle"} <ArrowRight size={16} /></button>{requiresPurchase && <button className="text-action game-checkout-link" onClick={() => navigate("/workspace")}>View plans and secure checkout <ArrowRight size={16} /></button>}</div></div>)}
  </PageLayout>;
}

export function HowToPlayPage() {
  const steps = [
    ["01", "Choose a story", "Pick a puzzle that sparks your curiosity. New collections will be added over time."],
    ["02", "Find your rhythm", "Start with a relaxed challenge and build confidence at your own pace."],
    ["03", "Explore the picture", "Use the image and the details around you to understand how the pieces fit together."],
    ["04", "Celebrate the finish", "Your progress saves automatically in this browser, so you can refresh and return to the same arrangement. Account-based saves will let you continue across devices."],
  ];
  return <PageLayout eyebrow="A LITTLE GUIDE" title={<>Take your time.<br /><em>Enjoy the discovery.</em></>} subtitle="Igiti games are made to be thoughtful, welcoming and fun for curious minds of every age.">
    <div className="steps-grid">{steps.map(([number, title, description]) => <article key={number} className="step-card"><span>{number}</span><h2>{title}</h2><p>{description}</p></article>)}</div>
    <div className="how-callout"><span className="how-icon"><ShieldCheck size={23} /></span><div><h2>Designed to feel welcoming</h2><p>Clear controls, responsive layouts and a steady pace come first. Igiti Play is being prepared as a dedicated home for the digital puzzle collection, while the existing Igiti experience remains separate until the new platform passes its launch checks.</p><Link to="/games">Find your first game <ArrowRight size={15} /></Link></div></div>
  </PageLayout>;
}
