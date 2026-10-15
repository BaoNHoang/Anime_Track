import type { Anime } from "./types";
import type { TrackedAnime } from "../tracker/types";

export type MapFilter = "all" | "untracked" | "unwatched";

export function filterMapCatalog(catalog: Anime[], library: TrackedAnime[], filter: MapFilter): Anime[] {
  if (filter === "all") return catalog;
  const excluded = new Set(library
    .filter((item) => filter === "untracked" || item.progress > 0 ||
      item.status === "completed" || Boolean(item.previousWatches?.length))
    .map((item) => item.anime.id));
  return catalog.filter((anime) => !excluded.has(anime.id));
}
