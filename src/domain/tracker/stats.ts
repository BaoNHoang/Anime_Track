import type { TrackedAnime, TrackerStats } from "./types";

function durationMinutes(duration?: string): number {
  if (!duration) return 24;

  const hours = Number(duration.match(/(\d+(?:\.\d+)?)\s*hr/i)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+(?:\.\d+)?)\s*min/i)?.[1] ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : 24;
}

export function calculateTrackerStats(items: TrackedAnime[]): TrackerStats {
  const scored = items.filter((item) => item.userScore !== undefined);
  const minutesWatched = items.reduce(
    (sum, item) => sum + item.progress * durationMinutes(item.anime.duration),
    0
  );

  return {
    total: items.length,
    watching: items.filter((item) => item.status === "watching").length,
    completed: items.filter((item) => item.status === "completed").length,
    episodesWatched: items.reduce((sum, item) => sum + item.progress, 0),
    daysWatched: minutesWatched / (60 * 24),
    averageScore: scored.length
      ? scored.reduce((sum, item) => sum + (item.userScore ?? 0), 0) /
        scored.length
      : undefined
  };
}
