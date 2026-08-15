import { calculateTrackerStats } from "./stats.js";
import type { TrackedAnime, TrackerStats } from "./types.js";

export interface GenreCount {
  genre: string;
  count: number;
}

export interface ProfileSummary {
  stats: TrackerStats;
  recentItems: TrackedAnime[];
  favoriteGenres: GenreCount[];
  airingItems: TrackedAnime[];
}

export function createProfileSummary(items: TrackedAnime[]): ProfileSummary {
  const genreCounts = new Map<string, number>();
  const airingItems: TrackedAnime[] = [];

  for (const item of items) {
    for (const genre of item.anime.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
    if (
      (item.status === "watching" || item.status === "plan_to_watch") &&
      item.anime.status.toLowerCase().includes("currently airing")
    ) {
      airingItems.push(item);
    }
  }

  return {
    stats: calculateTrackerStats(items),
    recentItems: [...items]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 12),
    favoriteGenres: [...genreCounts.entries()]
      .map(([genre, count]) => ({ genre, count }))
      .sort(
        (left, right) =>
          right.count - left.count || left.genre.localeCompare(right.genre)
      )
      .slice(0, 5),
    airingItems
  };
}
