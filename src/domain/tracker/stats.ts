import type { TrackedAnime, TrackerStats } from "./types.js";

export function durationMinutes(duration?: string): number {
  if (!duration) return 24;

  const hours = Number(duration.match(/(\d+(?:\.\d+)?)\s*hr/i)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+(?:\.\d+)?)\s*min/i)?.[1] ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : 24;
}

export function calculateTrackerStats(items: TrackedAnime[]): TrackerStats {
  let watching = 0;
  let completed = 0;
  let episodesWatched = 0;
  let minutesWatched = 0;
  let scoredTotal = 0;
  let scoredCount = 0;

  for (const item of items) {
    if (item.status === "watching") watching += 1;
    if (item.status === "completed") completed += 1;
    episodesWatched += item.progress;
    minutesWatched += item.progress * durationMinutes(item.anime.duration);
    if (item.userScore !== undefined) {
      scoredTotal += item.userScore;
      scoredCount += 1;
    }
  }

  return {
    total: items.length,
    watching,
    completed,
    episodesWatched,
    daysWatched: minutesWatched / (60 * 24),
    averageScore: scoredCount
      ? scoredTotal / scoredCount
      : undefined
  };
}
