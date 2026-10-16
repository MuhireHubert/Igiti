// Vercel proxies this path to the staging API. Keeping the explicit variable
// first allows other hosts to opt into a different API without changing code.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const previewGames = [
  {
    id: "africa-landmarks",
    title: "Africa: Landmarks & Wonders",
    category: "Geography",
    description: "Piece together the places and landmarks that tell Africa's story.",
    difficulty: "Relaxed",
    pieces: 60,
    accent: "terracotta",
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=85",
    status: "available",
  },
  {
    id: "wild-africa",
    title: "Wild Africa",
    category: "Wildlife",
    description: "Meet the remarkable animals that make this continent extraordinary.",
    difficulty: "Curious",
    pieces: 100,
    accent: "forest",
    image: "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=1200&q=85",
    status: "coming-soon",
  },
  {
    id: "africa-resources",
    title: "The Wealth Beneath Us",
    category: "Nature",
    description: "Explore the resources and landscapes shaping African communities.",
    difficulty: "Challenging",
    pieces: 100,
    accent: "gold",
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=85",
    status: "coming-soon",
  },
];

export async function getGames({ signal } = {}) {
  if (!API_BASE) return { data: previewGames, source: "preview" };

  const response = await fetch(`${API_BASE}/v1/games`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("The game library could not be loaded.");
  const payload = await response.json();
  const games = (payload.data ?? []).flatMap((game) => {
    if (!game.puzzles?.length) {
      return [{
        id: game.id,
        title: game.title,
        category: game.category,
        description: game.description,
        difficulty: "Relaxed",
        pieces: 0,
        image: game.coverImage,
        status: "coming-soon",
      }];
    }
    return game.puzzles.map((puzzle) => ({
      id: puzzle.id,
      title: game.puzzles.length === 1 ? game.title : `${game.title}: ${puzzle.title}`,
      category: game.category,
      description: game.description,
      difficulty: ({
        RELAXED: "Relaxed",
        CURIOUS: "Curious",
        CHALLENGING: "Challenging",
        EXPERT: "Challenging",
      })[puzzle.difficulty] || "Curious",
      pieces: puzzle.pieceCount,
      image: puzzle.imageUrl || game.coverImage,
      status: "available",
      gameId: game.id,
      gameSlug: game.slug,
      puzzleSlug: puzzle.slug,
    }));
  });
  return { data: games, source: "api" };
}

export async function getGameById(id, options) {
  const { data } = await getGames(options);
  return data.find((game) => game.id === id) ?? null;
}

export function getApiBaseUrl() {
  return API_BASE;
}
