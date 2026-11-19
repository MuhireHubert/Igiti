import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, HeartHandshake, Leaf, Sprout, Trophy, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import EngineVisual from "../components/EngineVisual.jsx";
import { seededShuffle } from "../lib/gameShuffle.js";
import { advanceGameWorld } from "../lib/gameWorld.js";

const campaigns = [[
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
], [
  { title: "Read the shoreline", scene: "A youth science club in a Caribbean coastal town is mapping flood risks with families, fishers, and elders. A major storm season is approaching.", skill: "Shared observation", icon: UsersRound, choices: [
    { label: "Map local knowledge with tide data and ask every group what needs protecting.", effect: { trust: 3, roots: 1, time: -1 }, feedback: "Good adaptation begins with people who know the place and evidence that can support their choices." },
    { label: "Copy a plan from elsewhere without speaking to residents.", effect: { trust: -2, roots: 0, time: 1 }, feedback: "A plan can be technically neat and still miss the people who live with its consequences." },
    { label: "Only protect the most photographed area.", effect: { trust: -1, roots: 0, time: 0 }, feedback: "Resilience needs to include everyday lives, not only visible landmarks." },
  ] },
  { title: "Build the signal", scene: "The team can fund one first project: mangrove care, a community alert network, or a visitor campaign. You need a path that will last after launch day.", skill: "Systems design", icon: Sprout, choices: [
    { label: "Pair mangrove restoration with community alerts and paid local stewardship.", effect: { trust: 2, roots: 3, time: -1 }, feedback: "Linked solutions can protect ecosystems while strengthening local capacity." },
    { label: "Spend every resource on posters for one weekend.", effect: { trust: 0, roots: 0, time: 0 }, feedback: "Awareness helps, but an alert system needs people, practice, and maintenance." },
    { label: "Buy equipment without a care plan.", effect: { trust: -1, roots: 0, time: 1 }, feedback: "Tools only work when communities can sustain them." },
  ] },
  { title: "Keep the route open", scene: "A developer proposes a shortcut through a wetland that also supports fishing livelihoods and storm protection.", skill: "Long-term stewardship", icon: Leaf, choices: [
    { label: "Use the mapping to propose an alternate route and protect the wetland corridor.", effect: { trust: 2, roots: 3, time: -1 }, feedback: "A route can be redesigned when evidence and community voice are taken seriously." },
    { label: "Approve the shortcut because it is quicker this year.", effect: { trust: -1, roots: -1, time: 1 }, feedback: "Short-term convenience can increase future risk." },
    { label: "Stop collecting information once a decision is announced.", effect: { trust: -1, roots: 0, time: 0 }, feedback: "Monitoring helps communities respond when conditions change." },
  ] },
  { title: "Share the warning", scene: "Other coastal groups ask for the club’s methods. They want tools they can adapt for their own histories and shorelines.", skill: "Knowledge exchange", icon: HeartHandshake, choices: [
    { label: "Share open tools, credit local contributors, and invite reciprocal learning.", effect: { trust: 3, roots: 2, time: -1 }, feedback: "Networks grow stronger when knowledge travels with credit and context." },
    { label: "Keep the system secret to remain the only experts.", effect: { trust: -2, roots: 0, time: 0 }, feedback: "A resilience network depends on many capable communities." },
    { label: "Publish community data without permission.", effect: { trust: -3, roots: 0, time: 0 }, feedback: "Consent matters as much as technical skill." },
  ] },
], [
  { title: "Open the archive", scene: "A young curator is building a digital exhibition connecting family photographs, music, and migration stories across Lagos, London, Bahia, and New York.", skill: "Ethical research", icon: UsersRound, choices: [
    { label: "Ask families what they want shared, how they want to be named, and what should remain private.", effect: { trust: 3, roots: 1, time: -1 }, feedback: "Archives carry relationships, not only files." },
    { label: "Upload every image immediately for attention.", effect: { trust: -3, roots: 0, time: 1 }, feedback: "Visibility is not consent." },
    { label: "Remove names and histories to make everything look neutral.", effect: { trust: -1, roots: -1, time: 0 }, feedback: "Context gives a collection its meaning." },
  ] },
  { title: "Follow the rhythm", scene: "The exhibition needs an audio room. Contributors offer recordings in several languages and styles, each with different permissions.", skill: "Cultural attribution", icon: Sprout, choices: [
    { label: "Use only approved clips with clear artist credit, context, and listening notes.", effect: { trust: 2, roots: 3, time: -1 }, feedback: "Respectful credit turns listening into learning." },
    { label: "Use any recording found online because it is educational.", effect: { trust: -2, roots: 0, time: 1 }, feedback: "Educational intent does not remove rights or relationships." },
    { label: "Replace every voice with a generic sound effect.", effect: { trust: -1, roots: 0, time: 0 }, feedback: "A living archive should not erase the people who made it." },
  ] },
  { title: "Connect the collection", scene: "Visitors want to add stories of their own. The curator must decide how contributions will be checked and cared for.", skill: "Community curation", icon: Leaf, choices: [
    { label: "Create contributor review, source notes, and a way to correct or remove submissions.", effect: { trust: 2, roots: 3, time: -1 }, feedback: "A collection can stay alive when contributors retain agency." },
    { label: "Accept every claim without context or review.", effect: { trust: -1, roots: 0, time: 1 }, feedback: "Careful review protects both contributors and learners." },
    { label: "Let only outside institutions decide what counts.", effect: { trust: -2, roots: 0, time: 0 }, feedback: "Communities should help shape how their histories are represented." },
  ] },
  { title: "Pass it on", scene: "Schools and community groups want to adapt the exhibition for their own routes and languages.", skill: "Living legacy", icon: HeartHandshake, choices: [
    { label: "Offer adaptable learning kits with contributor credits and room for local additions.", effect: { trust: 3, roots: 2, time: -1 }, feedback: "A good learning world grows through many voices and places." },
    { label: "Lock the stories into one fixed, universal version.", effect: { trust: -2, roots: 0, time: 0 }, feedback: "History is richer when people can connect it to their own communities." },
    { label: "Remove source notes to make the exhibition shorter.", effect: { trust: -1, roots: -1, time: 1 }, feedback: "Sources help players keep learning beyond the game." },
  ] },
]];

function clamp(value) { return Math.max(0, Math.min(10, value)); }

export default function HeroQuest() {
  const [campaignIndex, setCampaignIndex] = useState(0);
  const chapters = campaigns[campaignIndex];
  const campaign = [
    { number: "01", title: <>The Green Belt <em>Decision Trail</em></>, summary: "A story-inspired strategy quest about collective action, restoration, and agency." },
    { number: "02", title: <>Coastline <em>Signal Quest</em></>, summary: "A coastal resilience adventure linking Caribbean communities, ecosystems, and shared knowledge." },
    { number: "03", title: <>Archive <em>Alive Quest</em></>, summary: "A global story quest about family histories, diaspora connections, and ethical digital curation." },
  ][campaignIndex];
  const [chapter, setChapter] = useState(0);
  const [stats, setStats] = useState({ trust: 4, roots: 3, time: 7 });
  const [choice, setChoice] = useState(null);
  const [history, setHistory] = useState([]);
  const complete = chapter >= chapters.length;
  const active = chapters[Math.min(chapter, chapters.length - 1)];
  const choices = useMemo(() => seededShuffle(active.choices, `hero:${campaignIndex}:${chapter}`), [active, campaignIndex, chapter]);
  const unlock = complete && stats.trust >= 6 && stats.roots >= 6;
  const result = useMemo(() => {
    if (!complete) return null;
    if (unlock) return { title: "The Hummingbird Collective", copy: "You built trust, restored conditions for growth, and invited others to carry the work forward.", tone: "gold" };
    if (stats.trust >= 5 || stats.roots >= 5) return { title: "A Movement Begins", copy: "You found a promising path. Replay the quest to balance community trust with long-term stewardship.", tone: "green" };
    return { title: "Reflect and Rebuild", copy: "Every decision has consequences. Try again and listen closely to what makes community action last.", tone: "blue" };
  }, [complete, stats, unlock]);

  function selectChoice(selected) {
    if (choice !== null) return;
    setChoice(selected);
    setStats((current) => ({ trust: clamp(current.trust + selected.effect.trust), roots: clamp(current.roots + selected.effect.roots), time: clamp(current.time + selected.effect.time) }));
    setHistory((items) => [...items, { title: active.title, selected: selected.label }]);
  }
  function continueQuest() { advanceGameWorld("african-heroes"); setChoice(null); setChapter((value) => value + 1); }
  function restart(nextCampaign = false) { if (nextCampaign) { advanceGameWorld("african-heroes"); setCampaignIndex((value) => (value + 1) % campaigns.length); } setChapter(0); setChoice(null); setHistory([]); setStats({ trust: 4, roots: 3, time: 7 }); }

  return <main className="hero-quest-page"><section className="hero-quest-shell" aria-labelledby="hero-quest-title">
    <Link className="hero-quest-back" to="/#games-under-test"><ArrowLeft size={16} /> Games under Test</Link>
    <header className="hero-quest-header"><div><span className="eyebrow">HEROES &amp; CONNECTIONS · STORY QUEST {campaign.number}</span><h1 id="hero-quest-title">{campaign.title}</h1><p>{campaign.summary}</p></div><div className="hero-quest-chapter"><span>CHAPTER</span><strong>{complete ? "COMPLETE" : `${chapter + 1} / ${chapters.length}`}</strong></div></header>
    <div className="hero-quest-progress"><span style={{ width: `${(Math.min(chapter, chapters.length) / chapters.length) * 100}%` }} /></div>
    <EngineVisual type="heroes" step={Math.min(chapter, 3)} />
    <section className="hero-quest-stats" aria-label="Mission resources"><div><UsersRound size={18} /><span>Community trust</span><strong>{stats.trust}/10</strong></div><div><Sprout size={18} /><span>Living roots</span><strong>{stats.roots}/10</strong></div><div><Leaf size={18} /><span>Season time</span><strong>{stats.time}/10</strong></div></section>
    {!complete ? <section className="hero-quest-scene"><div className="hero-quest-scene-label"><active.icon size={20} /><span>{active.skill}</span></div><h2>{active.title}</h2><p>{active.scene}</p><div className="hero-choice-list">{choices.map((item, index) => <button key={item.label} className={choice === item ? "selected" : ""} disabled={choice !== null} onClick={() => selectChoice(item)}><span>{String.fromCharCode(65 + index)}</span>{item.label}</button>)}</div>{choice !== null && <div className="hero-choice-feedback"><CheckCircle2 size={20} /><div><strong>Mission insight</strong><p>{choice.feedback}</p></div></div>} {choice !== null && <button className="button button-primary hero-continue" onClick={continueQuest}>{chapter + 1 === chapters.length ? "See your legacy" : "Continue the quest"}<ArrowRight size={16} /></button>}</section> : <section className={`hero-quest-ending ${result.tone}`}><Trophy size={34} /><span className="eyebrow">COLLECTIBLE UNLOCK</span><h2>{result.title}</h2><p>{result.copy}</p>{unlock && <div className="hero-collectible"><Leaf size={26} /><div><strong>{campaignIndex === 0 ? "Wangari Maathai · Eco-citizenship card" : campaignIndex === 1 ? "Coastal Steward · Signal card" : "Living Archive · Connection card"}</strong><span>Unlocked for completing a balanced decision trail.</span></div></div>}<div className="hero-journey-log"><strong>Your decision trail</strong>{history.map((item) => <p key={item.title}><span>{item.title}</span>{item.selected}</p>)}</div><button className="button button-primary" onClick={() => restart(true)}>Open the next story <ArrowRight size={16} /></button></section>}
    <aside className="hero-quest-sources"><BookOpen size={17} /><p>{campaignIndex === 0 ? <>This quest is inspired by Wangari Maathai’s community-centred environmental work. <a href="https://www.greenbeltmovement.org/who-we-are/" target="_blank" rel="noreferrer">Read the Green Belt Movement source ↗</a> · <a href="https://www.nobelprize.org/prizes/lists/all-nobel-prizes/all/" target="_blank" rel="noreferrer">Nobel Peace Prize 2004 ↗</a></> : "Prototype story content. Release missions will be individually sourced, community-reviewed, and credited before publication."}</p></aside>
  </section></main>;
}
