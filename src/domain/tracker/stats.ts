import type { TrackedAnime, TrackerStats } from "./types";

export function calculateTrackerStats(items: TrackedAnime[]): TrackerStats {
  const scored = items.filter((item) => item.userScore !== undefined);

  return {
    total: items.length,
    watching: items.filter((item) => item.status === "watching").length,
    completed: items.filter((item) => item.status === "completed").length,
    episodesWatched: items.reduce((sum, item) => sum + item.progress, 0),
    averageScore: scored.length
      ? scored.reduce((sum, item) => sum + (item.userScore ?? 0), 0) /
        scored.length
      : undefined
  };
}
