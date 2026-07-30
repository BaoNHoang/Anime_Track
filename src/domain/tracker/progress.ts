import type { TrackedAnime } from "./types";

type TrackingUpdate = Partial<
  Pick<TrackedAnime, "status" | "progress">
>;

export function resolveTrackingProgress(
  item: TrackedAnime,
  updates: TrackingUpdate
) {
  const requestedProgress =
    updates.status === "completed" && item.anime.episodes !== undefined
      ? item.anime.episodes
      : updates.progress ?? item.progress;
  const validProgress = Number.isFinite(requestedProgress)
    ? requestedProgress
    : item.progress;

  return Math.max(
    0,
    Math.min(
      validProgress,
      item.anime.episodes ?? Number.MAX_SAFE_INTEGER
    )
  );
}
