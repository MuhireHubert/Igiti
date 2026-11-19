import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, HeartHandshake, Leaf, Sprout, Trophy, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

const chapters = [
  { title: "Listen before leading", scene: "Families say nearby streams are drying up, food is less secure, and finding firewood takes longer. You have one meeting to decide where the work begins.", skill: "Community listening", icon: UsersRound, choices: [
    { label: "Listen to residents, map the problems together, and let the group choose a first action.", effect: { trust: 3, roots: 1, time: -1 }, feedback: "People are more likely to sustain work they have shaped themselves." },
    { label: "Arrive with a finished plan and ask everyone to follow it immediately.", effect: { trust: -2, roots: 1, time: 1 }, feedback: "Fast instructions can miss the knowledge already held in a community." },
    { label: "Wait for outside experts to make every decision.", effect: { trust: -1, roots: 0, time: -2 }, feedback: "Partners can help, but local agency cannot be outsourced." },
  ] },
  { title: "Grow a living solution", scene: "The group is ready. You need a first action that can help soil, water, livelihoods, and confidence grow together.", skill: "Systems thinking", icon: Sprout, choices: [
    { label: "Create community nurseries and plant locally useful trees with care plans.", effect: { trust: 2, roots: 3, time: -1 }, feedback: "A nursery makes the work repeatable and gives people ownership of the next season." },
    { label: "Plant a single ceremonial tree, then end the project.", effect: { trust: 0, roots: 1, time: 0 }, feedback: "Symbols can inspire, but lasting restoration needs follow-through." },
    { label: "Choose the fastest-growing trees without asking what belongs in the local ecosystem.", effect: { trust: -1, roots: 0, time: 1 }, feedback: "Good restoration starts with local context, not only speed." },
  ] },
  { title: "Protect the conditions", scene: "Rain has come, but young seedlings and waterways need protection. The team has limited time and resources.", skill: "Stewardship", icon: Leaf, choices: [
    { label: "Organize care teams, protect water and soil, and track which seedlings survive.", effect: { trust: 2, roots: 3, time: -1 }, feedback: "Monitoring turns one planting day into a living practice." },
    { label: "Take a photo of the planting and assume every seedling will grow on its own.", effect: { trust: -1, roots: -1, time: 1 }, feedback: "Restoration is a relationship over time, not a single event." },
    { label: "Spend all resources on a large launch event instead of care materials.", effect: { trust: -1, roots: 0, time: 0 }, feedback: "Visibility matters less than what the community can maintain." },
  ] },
  { title: "Share the movement", scene: "The work is spreading. Younger people ask how they can join, and leaders are beginning to pay attention.", skill: "Civic action", icon: HeartHandshake, choices: [
    { label: "Share what worked, invite young people in, and connect environmental care with livelihoods and participation.", effect: { trust: 3, roots: 2, time: -1 }, feedback: "The strongest movements grow through shared knowledge and participation." },
    { label: "Keep the methods secret so only one group can lead.", effect: { trust: -2, roots: 0, time: 0 }, feedback: "A movement becomes stronger when people can adapt and carry it forward." },
    { label: "Stop once the first project receives attention.", effect: { trust: -1, roots: -1, time: 1 }, feedback: "Long-term change needs continued care, reflection, and participation." },
  ] },
];

function clamp(value) { return Math.max(0, Math.min(10, value)); }

export default function HeroQuest() {
  const [chapter, setChapter] = useState(0);
  const [stats, setStats] = useState({ trust: 4, roots: 3, time: 7 });
  const [choice, setChoice] = useState(null);
  const [history, setHistory] = useState([]);
  const complete = chapter >= chapters.length;
  const active = chapters[Math.min(chapter, chapters.length - 1)];
  const unlock = complete && stats.trust >= 6 && stats.roots >= 6;
  const result = useMemo(() => {
    if (!complete) return null;
    if (unlock) return { title: "The Hummingbird Collective", copy: "You built trust, restored conditions for growth, and invited others to carry the work forward.", tone: "gold" };
    if (stats.trust >= 5 || stats.roots >= 5) return { title: "A Movement Begins", copy: "You found a promising path. Replay the quest to balance community trust with long-term stewardship.", tone: "green" };
    return { title: "Reflect and Rebuild", copy: "Every decision has consequences. Try again and listen closely to what makes community action last.", tone: "blue" };
  }, [complete, stats, unlock]);

  function selectChoice(index) {
    if (choice !== null) return;
    const selected = active.choices[index];
    setChoice(index);
    setStats((current) => ({ trust: clamp(current.trust + selected.effect.trust), roots: clamp(current.roots + selected.effect.roots), time: clamp(current.time + selected.effect.time) }));
    setHistory((items) => [...items, { title: active.title, selected: selected.label }]);
  }
  function continueQuest() { setChoice(null); setChapter((value) => value + 1); }
  function restart() { setChapter(0); setChoice(null); setHistory([]); setStats({ trust: 4, roots: 3, time: 7 }); }

  return <main className="hero-quest-page"><section className="hero-quest-shell" aria-labelledby="hero-quest-title">
    <Link className="hero-quest-back" to="/#games-under-test"><ArrowLeft size={16} /> Games under Test</Link>
    <header className="hero-quest-header"><div><span className="eyebrow">AFRICAN HEROES · STORY QUEST 01</span><h1 id="hero-quest-title">The Green Belt <em>Decision Trail</em></h1><p>A story-inspired strategy quest about how collective action can restore both ecosystems and agency.</p></div><div className="hero-quest-chapter"><span>CHAPTER</span><strong>{complete ? "COMPLETE" : `${chapter + 1} / ${chapters.length}`}</strong></div></header>
    <div className="hero-quest-progress"><span style={{ width: `${(Math.min(chapter, chapters.length) / chapters.length) * 100}%` }} /></div>
    <section className="hero-quest-stats" aria-label="Mission resources"><div><UsersRound size={18} /><span>Community trust</span><strong>{stats.trust}/10</strong></div><div><Sprout size={18} /><span>Living roots</span><strong>{stats.roots}/10</strong></div><div><Leaf size={18} /><span>Season time</span><strong>{stats.time}/10</strong></div></section>
    {!complete ? <section className="hero-quest-scene"><div className="hero-quest-scene-label"><active.icon size={20} /><span>{active.skill}</span></div><h2>{active.title}</h2><p>{active.scene}</p><div className="hero-choice-list">{active.choices.map((item, index) => <button key={item.label} className={choice === index ? "selected" : ""} disabled={choice !== null} onClick={() => selectChoice(index)}><span>{String.fromCharCode(65 + index)}</span>{item.label}</button>)}</div>{choice !== null && <div className="hero-choice-feedback"><CheckCircle2 size={20} /><div><strong>Mission insight</strong><p>{active.choices[choice].feedback}</p></div></div>} {choice !== null && <button className="button button-primary hero-continue" onClick={continueQuest}>{chapter + 1 === chapters.length ? "See your legacy" : "Continue the quest"}<ArrowRight size={16} /></button>}</section> : <section className={`hero-quest-ending ${result.tone}`}><Trophy size={34} /><span className="eyebrow">COLLECTIBLE UNLOCK</span><h2>{result.title}</h2><p>{result.copy}</p>{unlock && <div className="hero-collectible"><Leaf size={26} /><div><strong>Wangari Maathai · Eco-citizenship card</strong><span>Unlocked for completing the balanced decision trail.</span></div></div>}<div className="hero-journey-log"><strong>Your decision trail</strong>{history.map((item) => <p key={item.title}><span>{item.title}</span>{item.selected}</p>)}</div><button className="button button-primary" onClick={restart}>Play a different path <ArrowRight size={16} /></button></section>}
    <aside className="hero-quest-sources"><BookOpen size={17} /><p>This learning quest is inspired by Wangari Maathai’s community-centred environmental work. The Green Belt Movement says it was founded in 1977 and uses tree planting as an entry point for environmental management, community empowerment, and livelihoods. <a href="https://www.greenbeltmovement.org/who-we-are/" target="_blank" rel="noreferrer">Read the Green Belt Movement source ↗</a> · <a href="https://www.nobelprize.org/prizes/lists/all-nobel-prizes/all/" target="_blank" rel="noreferrer">Nobel Peace Prize 2004 ↗</a></p></aside>
  </section></main>;
}
