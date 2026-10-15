import type { TrackedAnime } from "../tracker/types";

export function recommendationGenres(library: TrackedAnime[], limit = 5): string[] {
  const weights = new Map<string, { label: string; score: number }>();
  for (const item of library) {
    if (item.status === "plan_to_watch" || item.status === "dropped") continue;
    const weight = (item.status === "completed" ? 2 : 1) +
      (item.userScore !== undefined && item.userScore >= 8 ? 1 : 0);
    for (const label of new Set(item.anime.genres.filter(Boolean))) {
      const key = label.trim().toLocaleLowerCase();
      if (!key) continue;
      const previous = weights.get(key);
      weights.set(key, { label: previous?.label ?? label, score: (previous?.score ?? 0) + weight });
    }
  }
  return [...weights.values()]
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, limit)
    .map((entry) => entry.label);
}
