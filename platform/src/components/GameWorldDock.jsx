import { useEffect, useMemo, useState } from "react";
import { Hand, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

const worlds = {
  "african-heroes": { title: "Hero field kit", character: [0, 0], objects: [["🧭", "Compass", "Find the next community clue."], ["🌱", "Seedling", "Grow long-term change."], ["📜", "Story card", "Collect a story with credit."]] },
  "taste-of-africa": { title: "Recipe story station", character: [0, 1], objects: [["🥭", "Ingredient basket", "Match ingredients to their food route."], ["🍲", "Cooking pot", "Build the recipe in the right order."], ["📖", "Source notes", "Every plate has a story and a source."]] },
  "wildlife-rangers": { title: "Ranger habitat table", character: [3, 0], objects: [["🐢", "Turtle trail", "Follow a nesting route without disturbing it."], ["🌊", "Water source", "Protect a shared habitat resource."], ["🌿", "Wildlife corridor", "Keep the movement route connected."]] },
  "music-map": { title: "Rhythm map table", character: [1, 0], objects: [["🥁", "Drum pulse", "Tap to imagine the rhythm pattern."], ["📍", "Map marker", "Place the sound on its route."], ["🎵", "Call and response", "Listen for the answer phrase."]] },
  "language-explorer": { title: "Language signal desk", character: [2, 0], objects: [["💬", "Greeting", "Hear first, then connect meaning."], ["🔊", "Voice wave", "Listen for sound and rhythm."], ["🗺️", "Language route", "Trace where communities use it."]] },
  "kingdoms-timeline": { title: "Timeline workshop", character: [2, 1], objects: [["⌛", "Era token", "Place it before or after another era."], ["🏛️", "Civilization card", "Read the clue before you place it."], ["🔗", "Connection", "Link people, trade, and ideas."]] },
  "inventors-lab": { title: "Inventors workbench", character: [3, 0], objects: [["⚙️", "System gear", "Build a solution that works together."], ["💡", "Test light", "Test the design, then improve it."], ["🛠️", "Repair kit", "Plan who can maintain it."]] },
  "diaspora-journey": { title: "Journey map desk", character: [3, 1], objects: [["🧳", "Travel trunk", "Open a connected route."], ["🎶", "Music link", "Follow a living cultural connection."], ["🧵", "Family thread", "Add a story without flattening its history."]] },
  "market-master": { title: "Market strategy stall", character: [0, 1], objects: [["🧺", "Stock basket", "Choose stock before the market shifts."], ["🪙", "Budget coin", "Protect your margin and plan ahead."], ["📈", "Demand chart", "Read the next price signal."]] },
  "festival-passport": { title: "Festival passport tent", character: [1, 1], objects: [["🎭", "Festival mask", "Learn the meaning before collecting."], ["🛂", "Passport stamp", "Earn a stamp through respectful choices."], ["🎨", "Maker card", "Credit the artist and host community."]] },
};

export default function GameWorldDock() {
  const { pathname } = useLocation();
  const gameId = pathname.split("/").at(-1);
  const world = worlds[gameId];
  const [selected, setSelected] = useState(null);
  const [collected, setCollected] = useState([]);
  const message = useMemo(() => !world || selected == null ? "Tap an item in the scene to inspect it." : world.objects[selected][2], [selected, world]);
  useEffect(() => { setSelected(null); setCollected([]); }, [gameId]);
  if (!world) return null;
  function inspect(index) { setSelected(index); setCollected((items) => items.includes(index) ? items : [...items, index]); }

  return <aside className="game-world-dock" aria-label={`${world.title} interactive visual`}>
    <div className="game-world-art" style={{ "--sprite-x": world.character[0], "--sprite-y": world.character[1] }}><span className="game-world-instruction"><Hand size={14} /> Tap the glowing items</span>{world.objects.map(([emoji, label], index) => <button aria-label={`Inspect ${label}`} key={label} className={`game-world-hotspot hotspot-${index} ${collected.includes(index) ? "collected" : ""}`} onClick={() => inspect(index)}><span>{emoji}</span><i>{collected.includes(index) ? "✓" : index + 1}</i></button>)}</div>
    <div className="game-world-content"><span className="eyebrow"><Sparkles size={14} /> INTERACTIVE WORLD · {collected.length}/{world.objects.length}</span><h2>{world.title}</h2><p>{message}</p><div className="game-world-objects">{world.objects.map(([emoji, label], index) => <button key={label} className={selected === index ? "active" : ""} onClick={() => inspect(index)}><span>{emoji}</span>{collected.includes(index) ? "Collected · " : "Inspect · "}{label}</button>)}</div><small><Hand size={13} /> Inspect every object to complete this mini-scene.</small></div>
  </aside>;
}
