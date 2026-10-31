import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, Layers3, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { africaDeck, cardModes, countries } from "../lib/africaDeck.js";
import { getApiBaseUrl } from "../lib/api.js";
import { usePlayerAuth } from "../lib/PlayerAuthContext.jsx";
import { useNavigate } from "react-router-dom";

function pickOptions(answer) {
  const alternatives = countries.filter((item) => item.capital !== answer).sort(() => Math.random() - 0.5).slice(0, 3).map((item) => item.capital);
  return [...alternatives, answer].sort(() => Math.random() - 0.5);
}

function countryKey(country) {
  return String(country || "").trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function shuffledDeck(cards) {
  const deck = [...cards];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[pick]] = [deck[pick], deck[index]];
  }
  return deck;
}

export default function CardGame({ onBack }) {
  const { user } = usePlayerAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(cardModes[0]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState("");
  const [countryArtwork, setCountryArtwork] = useState({});
  const [offers, setOffers] = useState([]);
  const [offersLoaded, setOffersLoaded] = useState(false);
  const [cataloguePolicy, setCataloguePolicy] = useState(null);
  const [modeAccess, setModeAccess] = useState({});
  const [modeNotice, setModeNotice] = useState("");
  const deck = useMemo(() => shuffledDeck(africaDeck), []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getApiBaseUrl()}/v1/country-assets`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((response) => response.ok ? response.json() : { data: [] })
      .then((payload) => setCountryArtwork(Object.fromEntries((payload.data || []).map((asset) => [countryKey(asset.country), asset]))))
      .catch((error) => { if (error.name !== "AbortError") setCountryArtwork({}); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getApiBaseUrl()}/v1/offers`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((response) => response.ok ? response.json() : { data: [] })
      .then((payload) => { setOffers(payload.data || []); setOffersLoaded(true); })
      .catch(() => { setOffers([]); setOffersLoaded(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getApiBaseUrl()}/v1/access-policy`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Card access is currently unavailable.")))
      .then((payload) => setCataloguePolicy(payload.data || { catalogueRequiresSubscription: false }))
      .catch((error) => { if (error.name !== "AbortError") setModeNotice(error.message); });
    return () => controller.abort();
  }, []);
  const card = deck[round % deck.length];
  const artwork = countryArtwork[countryKey(card.country)];
  const options = useMemo(() => pickOptions(card.capital), [card.id]);
  const question = mode.id === "matching" ? `Which country has ${card.capital} as its capital?` : mode.id === "guess-country" ? `I am in ${card.region} Africa and my capital is ${card.capital}. Who am I?` : `What is the capital of ${card.country}?`;
  const correctAnswer = mode.id === "matching" || mode.id === "guess-country" ? card.country : card.capital;
  const choices = mode.id === "matching" || mode.id === "guess-country"
    ? [...countries.filter((item) => item.country !== card.country).sort(() => Math.random() - 0.5).slice(0, 3).map((item) => item.country), card.country].sort(() => Math.random() - 0.5)
    : options;
  const revealOnly = ["who-am-i", "regional", "thematic", "roleplay", "card-war"].includes(mode.id);
  const offerForMode = (item) => offers.find((offer) => offer.resource === `card-mode:${item.id}` && Number(offer.amountMinor) > 0);
  const activeModeOffer = offerForMode(mode);
  const resourceForMode = (item) => `card-mode:${item.id}`;
  const modeNeedsAccess = (item) => Boolean(offerForMode(item) || cataloguePolicy?.catalogueRequiresSubscription);
  const activeModeLocked = !offersLoaded || !cataloguePolicy || (modeNeedsAccess(mode) && modeAccess[resourceForMode(mode)] !== true);
  async function chooseMode(item) {
    if (!offersLoaded || !cataloguePolicy) { setModeNotice("Checking card access. Please try again in a moment."); return; }
    const needsAccess = modeNeedsAccess(item);
    if (!needsAccess) { setMode(item); setAnswer(""); setModeNotice(""); return; }
    if (!user) { setModeNotice("Sign in and purchase this card-game mode before playing it."); return; }
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getApiBaseUrl()}/v1/me/access/${encodeURIComponent(resourceForMode(item))}`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We couldn't check access to this card mode.");
      setModeAccess((current) => ({ ...current, [resourceForMode(item)]: Boolean(payload.data?.permitted) }));
      if (!payload.data?.permitted) { setModeNotice(`${payload.data?.offer?.title || item.title} requires purchase. Open your workspace for secure checkout.`); return; }
      setMode(item); setAnswer(""); setModeNotice("");
    } catch (error) { setModeNotice(error.message); }
  }
  // The first mode is selected before offers arrive. Resolve its entitlement
  // as soon as pricing loads so a paid default cannot be played unchecked.
  useEffect(() => {
    if (!offersLoaded || !cataloguePolicy || !modeNeedsAccess(mode) || Object.hasOwn(modeAccess, resourceForMode(mode))) return undefined;
    if (!user) {
      setModeAccess((current) => ({ ...current, [resourceForMode(mode)]: false }));
      return undefined;
    }
    const controller = new AbortController();
    user.getIdToken()
      .then((token) => fetch(`${getApiBaseUrl()}/v1/me/access/${encodeURIComponent(resourceForMode(mode))}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, signal: controller.signal,
      }))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "We couldn't check access to this card mode.");
        if (!controller.signal.aborted) setModeAccess((current) => ({ ...current, [resourceForMode(mode)]: Boolean(payload.data?.permitted) }));
      })
      .catch((error) => {
        if (error.name !== "AbortError") setModeNotice(error.message);
      });
    return () => controller.abort();
  }, [offers, offersLoaded, cataloguePolicy, mode, modeAccess, user]);
  const next = () => { setRound((value) => value + 1); setAnswer(""); };
  const choose = (choice) => { if (answer) return; setAnswer(choice); if (choice === correctAnswer) setScore((value) => value + 1); };

  return <section className="card-game" aria-live="polite">
    <button className="back-link" onClick={onBack}>← Back to the library</button>
    <header className="card-game-hero"><div><span className="eyebrow"><Layers3 size={15} /> IGITI A-54 · 108 CARD DECK</span><h2>Play Africa,<br /><em>card by card.</em></h2><p>Two cards for each of Africa's 54 countries. Pick a mode, draw a card, and learn together.</p></div><div className="deck-counter"><Layers3 size={28} /><strong>108</strong><span>PLAYABLE CARDS</span></div></header>
    <div className="mode-grid">{cardModes.map((item, index) => { const offer = offerForMode(item); const subscriptionOnly = !offer && cataloguePolicy?.catalogueRequiresSubscription; return <button key={item.id} className={mode.id === item.id ? "mode-card active" : "mode-card"} onClick={() => chooseMode(item)}><span>0{index + 1}{offer ? ` · ${offer.amountMinor / 100} ${offer.currency}` : subscriptionOnly ? " · SUBSCRIBER" : ""}</span><strong>{item.title}</strong><small>{item.prompt}</small></button>; })}</div>
    {modeNotice && <p className="inline-error" role="alert">{modeNotice}</p>}
    {activeModeLocked ? <section className="card-play-area card-mode-locked"><div><span className="eyebrow">{!offersLoaded || !cataloguePolicy ? "CHECKING ACCESS" : "PAID CARD MODE"}</span><h3>{activeModeOffer?.title || mode.title}</h3><p>{!offersLoaded || !cataloguePolicy ? "Checking whether this card mode is available to this account." : "This mode unlocks only after Pesapal confirms payment. A redirect alone never grants access."}</p>{offersLoaded && cataloguePolicy && <button className="button button-primary" onClick={() => navigate("/workspace")}>Open secure checkout <ArrowRight size={16} /></button>}</div></section> : <div className="card-play-area"><article className="country-card"><span className="card-kind">{card.type === "PROFILE" ? "COUNTRY PROFILE" : "CHALLENGE CARD"}</span><span className="card-region">{card.region} AFRICA</span>{artwork ? <figure className="country-card-visual"><img src={artwork.imageUrl} alt={`${card.country} card artwork`} /></figure> : <div className="card-map" aria-hidden="true">✦</div>}<h3>{revealOnly && !answer ? "Mystery country" : card.country}</h3><p>{revealOnly && !answer ? "Draw a clue, then reveal the country." : `Capital: ${card.capital}`}</p>{artwork?.caption && !(revealOnly && !answer) && <small className="country-card-caption">{artwork.caption}</small>}<span className="card-number">{String((round % deck.length) + 1).padStart(3, "0")} / 108</span></article><div className="round-panel"><div className="round-top"><span><Trophy size={16} /> Score {score}</span><span>Round {round + 1}</span></div><span className="eyebrow"><Sparkles size={14} /> {mode.title}</span><h3>{revealOnly ? mode.prompt : question}</h3>{revealOnly ? <><p className="round-copy">{answer ? `${card.country} · ${card.capital} · ${card.region} Africa` : "Use the card with friends, classmates, or family. Reveal when you are ready."}</p><button className="button button-primary" onClick={() => answer ? next() : setAnswer("revealed")}>{answer ? <>Next card <ArrowRight size={16} /></> : <>Reveal card <BookOpen size={16} /></>}</button></> : <div className="answer-grid">{choices.map((choice) => <button key={choice} className={answer ? choice === correctAnswer ? "answer correct" : choice === answer ? "answer wrong" : "answer" : "answer"} onClick={() => choose(choice)} disabled={Boolean(answer)}>{answer && choice === correctAnswer && <Check size={16} />}{choice}</button>)}</div>}{answer && !revealOnly && <button className="text-action next-round" onClick={next}>Next card <ArrowRight size={16} /></button>}<button className="reset-score" onClick={() => { setScore(0); setRound(0); setAnswer(""); }}><RotateCcw size={14} /> Reset session</button></div></div>}
  </section>;
}
