import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, Layers3, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { africaDeck, cardModes, countries } from "../lib/africaDeck.js";
import { getApiBaseUrl } from "../lib/api.js";

function pickOptions(answer) {
  const alternatives = countries.filter((item) => item.capital !== answer).sort(() => Math.random() - 0.5).slice(0, 3).map((item) => item.capital);
  return [...alternatives, answer].sort(() => Math.random() - 0.5);
}

export default function CardGame({ onBack }) {
  const [mode, setMode] = useState(cardModes[0]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [countryArtwork, setCountryArtwork] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getApiBaseUrl()}/v1/country-assets`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((response) => response.ok ? response.json() : { data: [] })
      .then((payload) => setCountryArtwork(Object.fromEntries((payload.data || []).map((asset) => [asset.country, asset]))))
      .catch((error) => { if (error.name !== "AbortError") setCountryArtwork({}); });
    return () => controller.abort();
  }, []);
  const card = africaDeck[round % africaDeck.length];
  const artwork = countryArtwork[card.country];
  const options = useMemo(() => pickOptions(card.capital), [card.id]);
  const question = mode.id === "matching" ? `Which country has ${card.capital} as its capital?` : mode.id === "guess-country" ? `I am in ${card.region} Africa and my capital is ${card.capital}. Who am I?` : `What is the capital of ${card.country}?`;
  const correctAnswer = mode.id === "matching" || mode.id === "guess-country" ? card.country : card.capital;
  const choices = mode.id === "matching" || mode.id === "guess-country"
    ? [...countries.filter((item) => item.country !== card.country).sort(() => Math.random() - 0.5).slice(0, 3).map((item) => item.country), card.country].sort(() => Math.random() - 0.5)
    : options;
  const revealOnly = ["who-am-i", "regional", "thematic", "roleplay", "card-war"].includes(mode.id);
  const next = () => { setRound((value) => value + 1); setAnswer(""); };
  const choose = (choice) => { if (answer) return; setAnswer(choice); if (choice === correctAnswer) setScore((value) => value + 1); };

  return <section className="card-game" aria-live="polite">
    <button className="back-link" onClick={onBack}>← Back to the library</button>
    <header className="card-game-hero"><div><span className="eyebrow"><Layers3 size={15} /> IGITI A-54 · 108 CARD DECK</span><h2>Play Africa,<br /><em>card by card.</em></h2><p>Two cards for each of Africa's 54 countries. Pick a mode, draw a card, and learn together.</p></div><div className="deck-counter"><Layers3 size={28} /><strong>108</strong><span>PLAYABLE CARDS</span></div></header>
    <div className="mode-grid">{cardModes.map((item, index) => <button key={item.id} className={mode.id === item.id ? "mode-card active" : "mode-card"} onClick={() => { setMode(item); setAnswer(""); }}><span>0{index + 1}</span><strong>{item.title}</strong><small>{item.prompt}</small></button>)}</div>
    <div className="card-play-area"><article className={`country-card ${artwork ? "has-country-art" : ""}`}>{artwork && <img className="country-card-art" src={artwork.imageUrl} alt="" />}<span className="card-kind">{card.type === "PROFILE" ? "COUNTRY PROFILE" : "CHALLENGE CARD"}</span><span className="card-region">{card.region} AFRICA</span><div className="card-map">✦</div><h3>{revealOnly && !answer ? "Mystery country" : card.country}</h3><p>{revealOnly && !answer ? "Draw a clue, then reveal the country." : `Capital: ${card.capital}`}</p>{artwork?.caption && !(revealOnly && !answer) && <small className="country-card-caption">{artwork.caption}</small>}<span className="card-number">{String((round % africaDeck.length) + 1).padStart(3, "0")} / 108</span></article><div className="round-panel"><div className="round-top"><span><Trophy size={16} /> Score {score}</span><span>Round {round + 1}</span></div><span className="eyebrow"><Sparkles size={14} /> {mode.title}</span><h3>{revealOnly ? mode.prompt : question}</h3>{revealOnly ? <><p className="round-copy">{answer ? `${card.country} · ${card.capital} · ${card.region} Africa` : "Use the card with friends, classmates, or family. Reveal when you are ready."}</p><button className="button button-primary" onClick={() => answer ? next() : setAnswer("revealed")}>{answer ? <>Next card <ArrowRight size={16} /></> : <>Reveal card <BookOpen size={16} /></>}</button></> : <div className="answer-grid">{choices.map((choice) => <button key={choice} className={answer ? choice === correctAnswer ? "answer correct" : choice === answer ? "answer wrong" : "answer" : "answer"} onClick={() => choose(choice)} disabled={Boolean(answer)}>{answer && choice === correctAnswer && <Check size={16} />}{choice}</button>)}</div>}{answer && !revealOnly && <button className="text-action next-round" onClick={next}>Next card <ArrowRight size={16} /></button>}<button className="reset-score" onClick={() => { setScore(0); setRound(0); setAnswer(""); }}><RotateCcw size={14} /> Reset session</button></div></div>
  </section>;
}
