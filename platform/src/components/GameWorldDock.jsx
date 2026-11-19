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

const scenePacks = {
  "african-heroes": [["🧭", "Compass", "Find the next community clue."], ["🌱", "Seedling", "Grow long-term change."], ["📜", "Story card", "Collect a story with credit."], ["🗣️", "Listening circle", "Open a new community conversation."], ["💧", "Water map", "Protect the conditions that help the plan last."], ["🤝", "Alliance badge", "Connect another group to the movement."], ["🏅", "Legacy card", "Record what the next generation can carry forward."]],
  "taste-of-africa": [["🥭", "Ingredient basket", "Match ingredients to their food route."], ["🍲", "Cooking pot", "Build the recipe in the right order."], ["📖", "Source notes", "Every plate has a story and a source."], ["🧂", "Flavor clue", "Compare a new ingredient combination."], ["🗺️", "Route card", "Trace a food story across places."], ["👩🏾‍🍳", "Cook's note", "Collect a credited preparation story."], ["🍽️", "Serving table", "Choose what respectful sharing looks like."]],
  "wildlife-rangers": [["🐢", "Turtle trail", "Follow a nesting route without disturbing it."], ["🌊", "Water source", "Protect a shared habitat resource."], ["🌿", "Wildlife corridor", "Keep the movement route connected."], ["🦍", "Gorilla family", "Set a buffer route around a forest edge."], ["🪺", "Nest watch", "Protect a breeding site during a storm."], ["🐘", "Migration track", "Balance water, habitat, and people."], ["🛖", "Ranger post", "Coordinate a community monitoring plan."]],
  "music-map": [["🥁", "Drum pulse", "Tap to imagine the rhythm pattern."], ["📍", "Map marker", "Place the sound on its route."], ["🎵", "Call and response", "Listen for the answer phrase."], ["🎧", "Listening station", "Open a fresh sound route."], ["🪘", "Rhythm layer", "Identify the next rhythmic layer."], ["🌊", "Diaspora beat", "Follow a rhythm across the ocean."], ["⭐", "Sound badge", "Collect a fully mapped listening chain."]],
  "language-explorer": [["💬", "Greeting", "Hear first, then connect meaning."], ["🔊", "Voice wave", "Listen for sound and rhythm."], ["🗺️", "Language route", "Trace where communities use it."], ["📝", "Phrase tile", "Rebuild a phrase from memory."], ["👂", "Listening clue", "Compare two similar sounds."], ["🌍", "Community map", "Connect a language across places."], ["🪪", "Language stamp", "Collect the completed recall chain."]],
  "kingdoms-timeline": [["⌛", "Era token", "Place it before or after another era."], ["🏛️", "Civilization card", "Read the clue before you place it."], ["🔗", "Connection", "Link people, trade, and ideas."], ["🛶", "Trade route", "Connect a new route across a map."], ["📚", "Archive page", "Compare evidence from another era."], ["🧱", "Build marker", "Restore a broken timeline sequence."], ["🏆", "Chronology seal", "Complete a longer historical route."]],
  "inventors-lab": [["⚙️", "System gear", "Build a solution that works together."], ["💡", "Test light", "Test the design, then improve it."], ["🛠️", "Repair kit", "Plan who can maintain it."], ["🔋", "Energy cell", "Power a new system component."], ["🚰", "Water valve", "Test the flow under pressure."], ["🧪", "Field trial", "Inspect feedback from the community."], ["✅", "Prototype seal", "Confirm the design can last."]],
  "diaspora-journey": [["🧳", "Travel trunk", "Open a connected route."], ["🎶", "Music link", "Follow a living cultural connection."], ["🧵", "Family thread", "Add a story without flattening its history."], ["📮", "Letter route", "Trace a message across generations."], ["🍲", "Food memory", "Connect a dish to a journey."], ["📷", "Archive image", "Read the context around a photograph."], ["🌐", "Network badge", "Complete a wider connection map."]],
  "market-master": [["🧺", "Stock basket", "Choose stock before the market shifts."], ["🪙", "Budget coin", "Protect your margin and plan ahead."], ["📈", "Demand chart", "Read the next price signal."], ["🚚", "Supply cart", "Plan around an incoming delivery."], ["🧾", "Ledger", "Compare cost and return."], ["🤝", "Trade offer", "Decide whether the deal is fair."], ["🏪", "Stall badge", "Reinvest after a successful round."]],
  "festival-passport": [["🎭", "Festival mask", "Learn the meaning before collecting."], ["🛂", "Passport stamp", "Earn a stamp through respectful choices."], ["🎨", "Maker card", "Credit the artist and host community."], ["🥁", "Performance cue", "Listen before joining a celebration."], ["🧵", "Craft story", "Meet the people behind a tradition."], ["📅", "Festival calendar", "Plan a respectful visit."], ["✨", "Cultural stamp", "Complete this festival route with care."]],
};

export default function GameWorldDock() {
  const { pathname } = useLocation();
  const gameId = pathname.split("/").at(-1);
  const world = worlds[gameId];
  const [selected, setSelected] = useState(null);
  const [collected, setCollected] = useState([]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const objects = useMemo(() => { if (!world) return []; const pack = scenePacks[gameId]; return Array.from({ length: 3 }, (_, offset) => pack[(sceneIndex + offset) % pack.length]); }, [gameId, sceneIndex, world]);
  const message = useMemo(() => !world || selected == null ? "Tap an item in the scene to inspect it." : objects[selected][2], [selected, world, objects]);
  useEffect(() => { setSelected(null); setCollected([]); setSceneIndex(0); }, [gameId]);
  useEffect(() => { const listener = (event) => { if (event.detail?.gameId !== gameId) return; setSceneIndex((value) => value + 1); setSelected(null); setCollected([]); }; window.addEventListener("igiti:world-advance", listener); return () => window.removeEventListener("igiti:world-advance", listener); }, [gameId]);
  useEffect(() => {
    if (!objects.length || collected.length !== objects.length) return undefined;
    const timeout = window.setTimeout(() => { setSceneIndex((value) => value + 1); setSelected(null); setCollected([]); }, 850);
    return () => window.clearTimeout(timeout);
  }, [collected, objects.length]);
  if (!world) return null;
  function inspect(index) { setSelected(index); setCollected((items) => items.includes(index) ? items : [...items, index]); }

  return <aside className="game-world-dock" aria-label={`${world.title} interactive visual`}>
    <div className="game-world-art" style={{ "--sprite-x": world.character[0], "--sprite-y": world.character[1] }}><span className="game-world-instruction"><Hand size={14} /> Scene {sceneIndex + 1} · tap the glowing items</span>{objects.map(([emoji, label], index) => <button aria-label={`Inspect ${label}`} key={label} className={`game-world-hotspot hotspot-${index} ${collected.includes(index) ? "collected" : ""}`} onClick={() => inspect(index)}><span>{emoji}</span><i>{collected.includes(index) ? "✓" : index + 1}</i></button>)}</div>
    <div className="game-world-content"><span className="eyebrow"><Sparkles size={14} /> INTERACTIVE WORLD · {collected.length}/{objects.length}</span><h2>{world.title} · scene {sceneIndex + 1}</h2><p>{message}</p><div className="game-world-objects">{objects.map(([emoji, label], index) => <button key={label} className={selected === index ? "active" : ""} onClick={() => inspect(index)}><span>{emoji}</span>{collected.includes(index) ? "Collected · " : "Inspect · "}{label}</button>)}</div><small><Hand size={13} /> Every new game round opens a fresh three-object scene.</small></div>
  </aside>;
}
