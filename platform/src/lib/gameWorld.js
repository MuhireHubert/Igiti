export function advanceGameWorld(gameId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("igiti:world-advance", { detail: { gameId } }));
}
