import type { Anime } from "./types";

export function dedupeAnimeById(items: Anime[]): Anime[] {
  const unique = new Map<number, Anime>();

  for (const item of items) {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  }

  return [...unique.values()];
}
