import type { FavoriteEntry } from "../account/favorites.js";
import type { Anime } from "../anime/types.js";
import type { TrackedAnime } from "../tracker/types.js";
import { rankRecommendations } from "./rankRecommendations.js";

export function shuffleRecommendations<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  let state = seed >>> 0;
  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    const swap = Math.floor(random * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

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
