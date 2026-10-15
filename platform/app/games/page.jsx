import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { getGames } from "../../src/lib/api.js";

export const metadata = {
  title: "Explore Games",
  description:
    "Browse Igiti Play's growing collection of African educational puzzles and games.",
};

function PageHeader() {
  return (
    <header className="page-header">
      <Link href="/" className="brand" aria-label="Igiti Play home">
        <span className="brand-mark"><Leaf size={21} /></span>
        <span className="brand-name">igiti<span>play</span></span>
      </Link>
      <Link className="back-link" href="/">Home</Link>
    </header>
  );
}

export default async function GamesRoute() {
  let games = [];
  let failed = false;
  try {
    const result = await getGames();
    games = result.data;
  } catch {
    failed = true;
  }

  return (
    <div className="subpage">
      <PageHeader />
      <main className="subpage-main">
        <div className="subpage-intro">
          <span className="eyebrow">THE IGITI COLLECTION</span>
          <h1>A world of stories.<br /><em>Piece by piece.</em></h1>
          <p>Browse the collection and find your next little adventure.</p>
        </div>
        {failed && (
          <p className="inline-error" role="alert">
            The game collection could not be reached right now. Please try again shortly.
          </p>
        )}
        {!failed && games.length > 0 && (
          <div className="subpage-game-grid">
            {games.map((game) => (
              <Link href={`/games/${game.id}`} className="subpage-game" key={game.id}>
                <img src={game.image} alt="" />
                <div>
                  <span>{game.category} · {game.pieces || "New"} pieces</span>
                  <h2>{game.title}</h2>
                  <p>{game.description}</p>
                  <strong>View game <ArrowRight size={15} /></strong>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!failed && games.length === 0 && (
          <p className="page-empty">The collection is being prepared. Please check back soon.</p>
        )}
      </main>
      <footer className="page-footer">
        <span>© {new Date().getFullYear()} Igiti · Bringing Africa to life</span>
        <a href="https://igiti.africa" target="_blank" rel="noreferrer">igiti.africa ↗</a>
      </footer>
    </div>
  );
}
