import { getNextAiringAt } from "./airing.js";
import type { Anime } from "./types.js";

export function selectNextAirings(items: Anime[], now: Date, limit = 5) {
  return items
    .map((anime) => ({ anime, date: getNextAiringAt(anime, now) }))
    .filter((entry): entry is { anime: Anime; date: Date } => Boolean(entry.date))
    .sort((left, right) =>
      left.date.getTime() - right.date.getTime() || left.anime.id - right.anime.id
    )
    .slice(0, limit);
}
