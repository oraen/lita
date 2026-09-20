const LEVEL_COLOR_CLASSES = [
  "level-badge--dark-red",
  "level-badge--gold",
  "level-badge--purple",
  "level-badge--blue",
  "level-badge--yellow",
  "level-badge--green",
  "level-badge--gray",
];

export function getLevelBadgeClass(rankFromBest) {
  if (!Number.isInteger(rankFromBest) || rankFromBest < 0) {
    return LEVEL_COLOR_CLASSES.at(-1);
  }
  return LEVEL_COLOR_CLASSES[Math.min(rankFromBest, LEVEL_COLOR_CLASSES.length - 1)];
}
