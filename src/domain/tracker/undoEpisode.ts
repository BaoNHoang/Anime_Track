import type { TrackedAnime } from "./types.js";

// Only restore the episode edit if tracking has not changed since it. Other
// edits (ratings, notes, list membership) are intentionally left intact.
export function undoEpisodeUpdate(current: TrackedAnime, before: TrackedAnime, after: TrackedAnime) {
  if (current.anime.id !== before.anime.id || current.anime.id !== after.anime.id ||
      current.progress !== after.progress || current.status !== after.status ||
      current.completedAt !== after.completedAt ||
      JSON.stringify(current.episodeHistory) !== JSON.stringify(after.episodeHistory) ||
      JSON.stringify(current.previousWatches) !== JSON.stringify(after.previousWatches)) return undefined;
  return {
    progress: before.progress,
    status: before.status,
    completedAt: before.completedAt,
    episodeHistory: before.episodeHistory
  };
}
