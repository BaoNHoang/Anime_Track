import type { TrackedAnime } from "./types.js";

function latestEpisodeDate(item: TrackedAnime): string | undefined {
  const histories = [
    item.episodeHistory,
    ...(item.previousWatches ?? []).map((watch) => watch.episodeHistory)
  ];
  let latest: string | undefined;
  for (const history of histories) {
    for (const episode of history ?? []) {
      if (episode.watchedAt && (!latest || episode.watchedAt > latest)) {
        latest = episode.watchedAt;
      }
    }
  }
  return latest;
}

export function sortByRecentWatch(items: TrackedAnime[]): TrackedAnime[] {
  return [...items].sort((left, right) => {
    const leftWatch = latestEpisodeDate(left);
    const rightWatch = latestEpisodeDate(right);
    const leftDay = leftWatch ?? left.updatedAt.slice(0, 10);
    const rightDay = rightWatch ?? right.updatedAt.slice(0, 10);
    return rightDay.localeCompare(leftDay) ||
      Number(Boolean(rightWatch)) - Number(Boolean(leftWatch)) ||
      (!leftWatch && !rightWatch ? right.updatedAt.localeCompare(left.updatedAt) : 0) ||
      left.anime.id - right.anime.id;
  });
}
