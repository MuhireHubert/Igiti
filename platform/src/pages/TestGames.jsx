import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Headphones, Lightbulb, Sparkles, Volume2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const testGames = {
  "african-heroes": { number: "01", title: "African Heroes: Story Quest", eyebrow: "Story prototype · decision mission", mechanic: "Choose a thoughtful action, then unlock the next story clue.", prompt: "A community library is preserving stories from local elders. What should your team do first?", options: ["Record the stories with consent and credit the storytellers", "Publish the stories without telling anyone", "Only collect the shortest stories", "Remove the storytellers’ names"], answer: 0, fact: "Great learning games treat communities as knowledge-holders, not just background scenery.", badge: "Hero card unlocked" },
  "taste-of-africa": { number: "02", title: "Taste of Africa", eyebrow: "Playtest queue · recipe match", mechanic: "Use food clues to place a dish in its cultural region.", prompt: "A shared plate of ugali is a staple across several countries in which Igiti region?", options: ["East Africa", "North Africa", "Island Countries", "Southern Africa"], answer: 0, fact: "Food belongs to people and places—each future round will name its sources and invite families to add their own stories.", badge: "Recipe card collected" },
  "wildlife-rangers": { number: "03", title: "African Wildlife Rangers", eyebrow: "Playtest queue · conservation mission", mechanic: "Choose the best habitat action and protect your virtual reserve.", prompt: "A forest-elephant herd needs a safe route between two rain-forest areas. What protects the herd best?", options: ["Protect and reconnect a forest corridor", "Build a busy road through the route", "Move the herd into a city", "Remove water points"], answer: 0, fact: "Conservation works best when habitats stay connected and local communities are included.", badge: "Ranger badge earned" },
  "music-map": { number: "04", title: "Music Map Challenge", eyebrow: "Audio pilot · listen & locate", mechanic: "Hear a cue, identify the instrument or style, then place it on the map.", prompt: "Listen to the cue. The kora is a 21-string harp-lute closely associated with which Igiti region?", options: ["West Africa", "Central Africa", "East Africa", "Island Countries"], answer: 0, fact: "This prototype uses your device voice for accessibility. Release audio will use licensed, artist-approved recordings and credits.", badge: "Sound map marker placed", audio: "The kora is a twenty-one string harp lute from West Africa." },
  "language-explorer": { number: "05", title: "Language Explorer", eyebrow: "Audio pilot · hear, match, speak", mechanic: "Listen, match the phrase, then build confidence through short repeatable rounds.", prompt: "Listen to the greeting “Muraho.” Which language does this round introduce?", options: ["Kinyarwanda", "Yoruba", "Amharic", "Zulu"], answer: 0, fact: "Language learning is stronger with community-reviewed pronunciation, context, and respectful attribution.", badge: "Language stamp earned", audio: "Muraho. A greeting in Kinyarwanda." },
};

function speak(text) {
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.84;
  window.speechSynthesis.speak(utterance);
  return true;
}

export default function TestGames() {
  const { gameId } = useParams();
  const game = testGames[gameId];
  const [answer, setAnswer] = useState(null);
  const [audioNote, setAudioNote] = useState("");
  const solved = answer === game?.answer;
  const answered = answer !== null;
  const progress = solved ? 100 : 0;

  if (!game) return <main className="test-game-page"><section className="test-game-shell"><p>That test game does not exist.</p><Link className="button button-primary" to="/">Back to Igiti Play</Link></section></main>;
  function choose(index) { if (!answered) setAnswer(index); }
  function nextRound() { setAnswer(null); }

  return <main className="test-game-page"><section className="test-game-shell" aria-labelledby="test-game-title">
    <Link className="test-game-back" to="/#games-under-test"><ArrowLeft size={16} /> Back to Games under Test</Link>
    <div className="test-game-hero"><div><span className="eyebrow">{game.eyebrow}</span><h1 id="test-game-title">{game.title}</h1><p>{game.mechanic}</p></div><div className="test-game-round"><span>TEST BUILD</span><strong>01</strong></div></div>
    <div className="test-game-progress" aria-label={`${Math.round(progress)}% through this test`}><span style={{ width: `${progress}%` }} /></div>
    <section className="test-game-mission"><div className="test-game-mission-top"><span><Sparkles size={17} /> Guided test</span>{game.audio && <button className="test-audio-button" onClick={() => setAudioNote(speak(game.audio) ? "Audio cue played." : "Audio is not supported by this browser.")}><Volume2 size={16} /> Play audio cue</button>}</div>{audioNote && <p className="test-audio-note"><Headphones size={15} /> {audioNote}</p>}
      <h2>{game.prompt}</h2><div className="test-answer-grid">{game.options.map((option, index) => <button key={option} className={answered ? (index === game.answer ? "correct" : index === answer ? "wrong" : "") : ""} onClick={() => choose(index)}><span>{String.fromCharCode(65 + index)}</span>{option}{answered && index === game.answer && <CheckCircle2 size={18} />}</button>)}</div>
      {answered && <div className={solved ? "test-result success" : "test-result retry"}><Lightbulb size={21} /><div><strong>{solved ? game.badge : "Try a different choice"}</strong><p>{solved ? game.fact : "Read the situation again, then choose the action that protects people, culture, or place."}</p></div></div>}
      {answered && <button className="button button-primary test-next" onClick={nextRound}>{solved ? "Run the test again" : "Try again"}<ArrowRight size={16} /></button>}</section>
    <p className="test-game-disclaimer">Prototype content for guided testing only. It is free while under test, saved only in this browser, and does not affect subscriptions, payments, or school assignments.</p>
  </section></main>;
}
