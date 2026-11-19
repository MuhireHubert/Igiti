// Stable for a particular round, unlike Math.random() during render, but
// changes when the route, mission, or campaign changes.
export function seededShuffle(items, seedValue) {
  let seed = 2166136261;
  for (const character of String(seedValue)) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    const swapIndex = (seed >>> 0) % (index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}
