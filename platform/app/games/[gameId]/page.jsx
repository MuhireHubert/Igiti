import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Compass, Leaf, Puzzle, Sparkles } from "lucide-react";
import { getGameById } from "../../../src/lib/api.js";

export async function generateMetadata({ params }) {
  const { gameId } = await params;
  const game = await getGameById(gameId).catch(() => null);
  if (!game) {
    return { title: "Game not found" };
  }
  return {
    title: game.title,
    description: game.description,
    openGraph: {
      title: game.title,
      description: game.description,
      images: game.image ? [game.image] : [],
    },
  };
}

function PageHeader() {
  return (
    <header className="page-header">
      <Link href="/" className="brand" aria-label="Igiti Play home">
        <span className="brand-mark"><Leaf size={21} /></span>
        <span className="brand-name">igiti<span>play</span></span>
      </Link>
      <Link className="back-link" href="/games"><ArrowLeft size={15} /> All games</Link>
    </header>
  );
}

export default async function GameDetailRoute({ params }) {
  const { gameId } = await params;
  const game = await getGameById(gameId).catch(() => null);
  if (!game) notFound();

  return (
    <div className="subpage">
      <PageHeader />
      <main className="subpage-main">
        <div className="subpage-intro">
          <span className="eyebrow">YOUR NEXT ADVENTURE</span>
          <h1>{game.title}</h1>
          <p>{game.description}</p>
        </div>
        <section className="subpage-detail">
          <img src={game.image} alt={`Artwork for ${game.title}`} />
          <div className="subpage-detail-copy">
            <span className="eyebrow">{game.category} · IGITI ORIGINAL</span>
            <h2>Make room for curiosity.</h2>
            <p>Every puzzle is an invitation to notice more, learn something new, and connect with the stories behind the picture.</p>
            <div className="detail-stats">
              <span><Puzzle size={16} /> {game.pieces || "Multiple"} pieces</span>
              <span><Compass size={16} /> {game.difficulty}</span>
              <span><BookOpen size={16} /> Learn as you play</span>
            </div>
            <div className="notice">
              <Sparkles size={17} />
              <span>The new puzzle runtime is being migrated and tested. The existing Igiti game remains available while the new experience is prepared.</span>
            </div>
            <Link className="button button-primary" href="/games">Back to the collection <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
      <footer className="page-footer">
        <span>© {new Date().getFullYear()} Igiti · Bringing Africa to life</span>
        <a href="https://igiti.africa" target="_blank" rel="noreferrer">igiti.africa ↗</a>
      </footer>
    </div>
  );
}
