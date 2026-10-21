import type { Anime } from "./types.js";

export function sampleTopAnime(items: Anime[], count: number, seed: number): Anime[] {
  const pool = items.slice(0, 50);
  let state = seed >>> 0;
  const selected = Math.min(count, pool.length);
  for (let index = 0; index < selected; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const swapIndex = index + Math.floor((state / 2 ** 32) * (pool.length - index));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, selected);
}
