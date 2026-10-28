import type { FavoriteEntry } from "../account/favorites.js";
import type { Anime } from "../anime/types.js";
import type { TrackedAnime } from "../tracker/types.js";
import { rankRecommendations } from "./rankRecommendations.js";

export function sampleRecommendations(
  library: TrackedAnime[],
  candidates: Anime[],
  favoriteStudios: FavoriteEntry[],
  seed: number,
  count = 5
) {
  const pool = rankRecommendations(library, candidates, favoriteStudios, count * 4);
  const selected = Math.min(count, pool.length);
  let state = seed >>> 0;

  for (let index = 0; index < selected; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const swapIndex = index + Math.floor((state / 2 ** 32) * (pool.length - index));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, selected);
}
