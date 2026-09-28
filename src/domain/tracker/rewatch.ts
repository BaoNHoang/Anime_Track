import type { TrackedAnime } from "./types.js";

export const MAX_PREVIOUS_WATCHES = 50;

export function startRewatch(item: TrackedAnime, now = new Date().toISOString()): TrackedAnime {
  if (item.status !== "completed") throw new Error("Complete this watch before starting a rewatch.");
  if ((item.previousWatches?.length ?? 0) >= MAX_PREVIOUS_WATCHES) {
    throw new Error(`A title can keep up to ${MAX_PREVIOUS_WATCHES} previous watches.`);
  }
  return {
    ...item,
    previousWatches: [...(item.previousWatches ?? []), {
      completedAt: item.completedAt ?? item.updatedAt,
      progress: item.progress,
      ...(item.episodeHistory ? { episodeHistory: item.episodeHistory.map((entry) => ({ ...entry })) } : {})
    }],
    status: "watching",
    progress: 0,
    episodeHistory: [],
    completedAt: undefined,
    updatedAt: now
  };
}
