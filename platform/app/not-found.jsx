import Link from "next/link";
import { ArrowLeft, Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <main className="subpage">
      <header className="page-header">
        <Link href="/" className="brand" aria-label="Igiti Play home">
          <span className="brand-mark"><Leaf size={21} /></span>
          <span className="brand-name">igiti<span>play</span></span>
        </Link>
      </header>
      <section className="subpage-main">
        <div className="subpage-intro">
          <span className="eyebrow">A LITTLE DETOUR</span>
          <h1>This story isn't<br /><em>here just yet.</em></h1>
          <p>The page may have moved, or the adventure may not be available yet.</p>
          <Link className="button button-primary" href="/games"><ArrowLeft size={16} /> Return to the games</Link>
        </div>
      </section>
    </main>
  );
}
