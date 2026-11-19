import { useMemo, useState } from "react";
import { Hand, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

const worlds = {
  "african-heroes": { title: "Hero field kit", character: 0, objects: [["🧭", "Compass", "Find the next community clue."], ["🌱", "Seedling", "Grow long-term change."], ["📜", "Story card", "Collect a story with credit."]] },
  "taste-of-africa": { title: "Recipe story station", character: 4, objects: [["🥭", "Ingredient basket", "Match ingredients to their food route."], ["🍲", "Cooking pot", "Build the recipe in the right order."], ["📖", "Source notes", "Every plate has a story and a source."]] },
  "wildlife-rangers": { title: "Ranger habitat table", character: 3, objects: [["🐢", "Turtle trail", "Follow a nesting route without disturbing it."], ["🌊", "Water source", "Protect a shared habitat resource."], ["🌿", "Wildlife corridor", "Keep the movement route connected."]] },
  "music-map": { title: "Rhythm map table", character: 1, objects: [["🥁", "Drum pulse", "Tap to imagine the rhythm pattern."], ["📍", "Map marker", "Place the sound on its route."], ["🎵", "Call and response", "Listen for the answer phrase."]] },
  "language-explorer": { title: "Language signal desk", character: 2, objects: [["💬", "Greeting", "Hear first, then connect meaning."], ["🔊", "Voice wave", "Listen for sound and rhythm."], ["🗺️", "Language route", "Trace where communities use it."]] },
  "kingdoms-timeline": { title: "Timeline workshop", character: 6, objects: [["⌛", "Era token", "Place it before or after another era."], ["🏛️", "Civilization card", "Read the clue before you place it."], ["🔗", "Connection", "Link people, trade, and ideas."]] },
  "inventors-lab": { title: "Inventors workbench", character: 3, objects: [["⚙️", "System gear", "Build a solution that works together."], ["💡", "Test light", "Test the design, then improve it."], ["🛠️", "Repair kit", "Plan who can maintain it."]] },
  "diaspora-journey": { title: "Journey map desk", character: 7, objects: [["🧳", "Travel trunk", "Open a connected route."], ["🎶", "Music link", "Follow a living cultural connection."], ["🧵", "Family thread", "Add a story without flattening its history."]] },
  "market-master": { title: "Market strategy stall", character: 4, objects: [["🧺", "Stock basket", "Choose stock before the market shifts."], ["🪙", "Budget coin", "Protect your margin and plan ahead."], ["📈", "Demand chart", "Read the next price signal."]] },
  "festival-passport": { title: "Festival passport tent", character: 5, objects: [["🎭", "Festival mask", "Learn the meaning before collecting."], ["🛂", "Passport stamp", "Earn a stamp through respectful choices."], ["🎨", "Maker card", "Credit the artist and host community."]] },
};

export default function GameWorldDock() {
  const { pathname } = useLocation();
  const gameId = pathname.split("/").at(-1);
  const world = worlds[gameId];
  const [selected, setSelected] = useState(null);
  const message = useMemo(() => !world || selected == null ? "Tap an item in the scene to inspect it." : world.objects[selected][2], [selected, world]);
  if (!world) return null;

  return <aside className="game-world-dock" aria-label={`${world.title} interactive visual`}>
    <div className="game-world-art" style={{ "--world-character": world.character }} aria-hidden="true" />
    <div className="game-world-content"><span className="eyebrow"><Sparkles size={14} /> INTERACTIVE WORLD</span><h2>{world.title}</h2><p>{message}</p><div className="game-world-objects">{world.objects.map(([emoji, label], index) => <button key={label} className={selected === index ? "active" : ""} onClick={() => setSelected(index)}><span>{emoji}</span>{label}</button>)}</div><small><Hand size={13} /> The objects change with each engine.</small></div>
  </aside>;
}
