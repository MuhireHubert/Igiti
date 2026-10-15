import Link from "next/link";
import { ArrowRight, Leaf, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "How to Play",
  description:
    "Learn how to explore Igiti Play puzzles at your own pace.",
};

const steps = [
  ["01", "Choose a story", "Pick a puzzle that sparks your curiosity. New collections will be added over time."],
  ["02", "Find your rhythm", "Start with a relaxed challenge and build confidence at your own pace."],
  ["03", "Explore the picture", "Use the image and the details around you to understand how the pieces fit together."],
  ["04", "Celebrate the finish", "The new platform is being built to support saving progress and returning whenever you are ready."],
];

export default function HowToPlayRoute() {
  return (
    <div className="subpage">
      <header className="page-header">
        <Link href="/" className="brand" aria-label="Igiti Play home">
          <span className="brand-mark"><Leaf size={21} /></span>
          <span className="brand-name">igiti<span>play</span></span>
        </Link>
        <Link className="back-link" href="/">Home</Link>
      </header>
      <main className="subpage-main">
        <div className="subpage-intro">
          <span className="eyebrow">A LITTLE GUIDE</span>
          <h1>Take your time.<br /><em>Enjoy the discovery.</em></h1>
          <p>Igiti games are made to be thoughtful, welcoming and fun for curious minds of every age.</p>
        </div>
        <div className="steps-grid">
          {steps.map(([number, title, description]) => (
            <article key={number} className="step-card">
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="how-callout">
          <span className="how-icon"><ShieldCheck size={23} /></span>
          <div>
            <h2>Designed to feel welcoming</h2>
            <p>Clear controls, responsive layouts and a steady pace come first. The new platform is being built alongside the existing game so familiar functionality is not removed before its replacement is ready.</p>
            <Link href="/games">Find your first game <ArrowRight size={15} /></Link>
          </div>
        </div>
      </main>
      <footer className="page-footer">
        <span>© {new Date().getFullYear()} Igiti · Bringing Africa to life</span>
        <a href="https://igiti.africa" target="_blank" rel="noreferrer">igiti.africa ↗</a>
      </footer>
    </div>
  );
}
