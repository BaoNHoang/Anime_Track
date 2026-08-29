import type { EpisodeWatch, TrackedAnime, TrackingStatus } from "./types.js";

export const MAX_EPISODE_HISTORY = 5000;

function legacyHistory(item: Pick<TrackedAnime, "progress" | "episodeHistory">) {
  if (item.episodeHistory) return item.episodeHistory;
  const count = Math.min(item.progress, MAX_EPISODE_HISTORY);
  return Array.from({ length: count }, (_, index) => ({ episode: index + 1 }));
}

export function episodeHistory(
  item: Pick<TrackedAnime, "progress" | "episodeHistory">
): EpisodeWatch[] {
  return legacyHistory(item).map((entry) => ({ ...entry }));
}

export function watchedEpisodeNumbers(
  item: Pick<TrackedAnime, "progress" | "episodeHistory">
) {
  return new Set(legacyHistory(item).map((entry) => entry.episode));
}

export function nextEpisodeNumber(
  item: Pick<TrackedAnime, "progress" | "episodeHistory" | "anime">
) {
  if (!item.episodeHistory) {
    const next = item.progress + 1;
    return item.anime.episodes && next > item.anime.episodes ? undefined : next;
  }
  const watched = watchedEpisodeNumbers(item);
  const maximum = item.anime.episodes ?? Math.max(item.progress + 1, 1);
  for (let episode = 1; episode <= maximum; episode += 1) {
    if (!watched.has(episode)) return episode;
  }
  return undefined;
}

export function updateEpisodeHistory(
  item: Pick<TrackedAnime, "progress" | "episodeHistory" | "anime" | "status">,
  episode: number,
  watched: boolean,
  watchedAt?: string
): {
  episodeHistory: EpisodeWatch[];
  progress: number;
  status: TrackingStatus;
} {
  const maximum = item.anime.episodes ?? MAX_EPISODE_HISTORY;
  if (!Number.isInteger(episode) || episode < 1 || episode > maximum) {
    throw new RangeError("Episode is outside the available range.");
  }

  const history = episodeHistory(item).filter((entry) => entry.episode !== episode);
  if (watched) history.push({ episode, ...(watchedAt ? { watchedAt } : {}) });
  history.sort((left, right) => left.episode - right.episode);
  if (history.length > MAX_EPISODE_HISTORY) {
    throw new RangeError("Episode history is too large.");
  }

  const total = item.anime.episodes;
  const status = total && history.length >= total
    ? "completed"
    : watched && item.status === "plan_to_watch"
      ? "watching"
      : item.status === "completed"
        ? "watching"
        : item.status;

  return { episodeHistory: history, progress: history.length, status };
}

export function historyForProgress(
  item: Pick<TrackedAnime, "progress" | "episodeHistory">,
  progress: number
) {
  if (progress > MAX_EPISODE_HISTORY) return undefined;
  const existing = new Map(
    episodeHistory(item).map((entry) => [entry.episode, entry.watchedAt])
  );
  return Array.from({ length: progress }, (_, index) => {
    const episode = index + 1;
    const watchedAt = existing.get(episode);
    return { episode, ...(watchedAt ? { watchedAt } : {}) };
  });
}
