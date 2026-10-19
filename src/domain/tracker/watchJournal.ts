import type { TrackedAnime } from "./types.js";

export interface WatchJournalEvent {
  key: string;
  anime: TrackedAnime["anime"];
  at: string;
  day: string;
  kind: "episode" | "completion";
  episode?: number;
  rewatch: number;
}

const MAX_JOURNAL_EVENTS = 8;

export function createWatchJournal(items: TrackedAnime[]): WatchJournalEvent[] {
  const newest: Array<WatchJournalEvent & { timestamp: number }> = [];

  const add = (event: Omit<WatchJournalEvent, "day">) => {
    const timestamp = Date.parse(event.at);
    if (!Number.isFinite(timestamp)) return;
    newest.push({ ...event, day: new Date(timestamp).toISOString().slice(0, 10), timestamp });
    newest.sort((left, right) => right.timestamp - left.timestamp || left.key.localeCompare(right.key));
    if (newest.length > MAX_JOURNAL_EVENTS) newest.pop();
  };

  for (const item of items) {
    const watches = [
      ...(item.previousWatches ?? []).map((watch) => ({
        episodeHistory: watch.episodeHistory,
        completedAt: watch.completedAt
      })),
      { episodeHistory: item.episodeHistory, completedAt: item.completedAt }
    ];

    watches.forEach((watch, watchIndex) => {
      const rewatch = watchIndex;
      for (const entry of watch.episodeHistory ?? []) {
        if (!entry.watchedAt) continue;
        add({
          key: `${item.anime.id}:${watchIndex}:episode:${entry.episode}`,
          anime: item.anime,
          at: entry.watchedAt,
          kind: "episode",
          episode: entry.episode,
          rewatch
        });
      }
      if (watch.completedAt) {
        add({
          key: `${item.anime.id}:${watchIndex}:completion`,
          anime: item.anime,
          at: watch.completedAt,
          kind: "completion",
          rewatch
        });
      }
    });
  }

  return newest.map(({ key, anime, at, day, kind, episode, rewatch }) => ({
    key, anime, at, day, kind, episode, rewatch
  }));
}
