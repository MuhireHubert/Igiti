import { BarChart3, Compass, Gem, Leaf, MapPinned, Music2, PawPrint, Sprout, Store, UtensilsCrossed } from "lucide-react";

const labels = { heroes: ["Listen", "Grow", "Protect", "Legacy"], taste: ["Origin", "Ingredients", "Story"], wildlife: ["Habitat", "Corridor", "Reserve"], music: ["Listen", "Map", "Pattern"], language: ["Hear", "Meaning", "Recall"], timeline: ["Kush", "Coast", "Mali", "Zimbabwe"], inventors: ["People", "Build", "Maintain"], diaspora: ["Africa", "Caribbean", "World"], market: ["Budget", "Stock", "Market"], festival: ["Visit", "Learn", "Stamp"] };
const icons = { heroes: Leaf, taste: UtensilsCrossed, wildlife: PawPrint, music: Music2, language: Music2, timeline: Compass, inventors: Sprout, diaspora: MapPinned, market: Store, festival: Gem };

export default function EngineVisual({ type, step = 0 }) {
  const Icon = icons[type] || Compass;
  const items = labels[type] || labels.heroes;
  return <div className={`engine-visual engine-visual-${type}`} aria-hidden="true"><div className="engine-visual-glow" /><div className="engine-visual-title"><Icon size={16} /><span>LIVE GAME BOARD</span></div><div className="engine-visual-track">{items.map((item, index) => <div key={item} className={index <= step ? "engine-visual-node active" : "engine-visual-node"}><span>{type === "market" && index === 1 ? <BarChart3 size={15} /> : index + 1}</span><small>{item}</small></div>)}</div><div className="engine-visual-stage"><div className="engine-visual-token token-one" /><div className="engine-visual-token token-two" /><div className="engine-visual-token token-three" /><div className="engine-visual-grid" /></div></div>;
}
