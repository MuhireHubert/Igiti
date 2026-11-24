export function isFreeGame(game) {
  if (game?.price?.access === "FREE") return true;
  if (game?.requiresPurchase || game?.kind === "card") return false;
  const price = game?.price || {};
  return !Number(price.amountMinor || price.monthlyAmountMinor || price.yearlyAmountMinor);
}

export function orderGamesForDiscovery(games) {
  return [...games].sort((left, right) => {
    const freeDifference = Number(isFreeGame(right)) - Number(isFreeGame(left));
    if (freeDifference) return freeDifference;
    return (left.title || "").localeCompare(right.title || "");
  });
}
