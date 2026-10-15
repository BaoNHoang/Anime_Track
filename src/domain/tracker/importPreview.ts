import { mergeTrackedAnime, type MergeTrackedAnimeOptions } from "./merge";
import type { TrackedAnime } from "./types";

export interface ImportPreview {
  added: number;
  updated: number;
  unchanged: number;
  total: number;
  examples: string[];
}

export function previewLibraryImport(
  current: TrackedAnime[], imported: TrackedAnime[], options: MergeTrackedAnimeOptions = {}
): ImportPreview {
  const currentById = new Map(current.map((item) => [item.anime.id, item]));
  let added = 0;
  let updated = 0;
  const examples: string[] = [];
  for (const item of imported) {
    const existing = currentById.get(item.anime.id);
    const changes = !existing || item.updatedAt > existing.updatedAt ||
      (options.replaceOnEqualUpdatedAt && item.updatedAt === existing.updatedAt);
    if (!changes) continue;
    if (existing) updated += 1;
    else added += 1;
    if (examples.length < 8) examples.push(item.anime.titleEnglish || item.anime.title);
  }
  return {
    added,
    updated,
    unchanged: Math.max(0, imported.length - added - updated),
    total: mergeTrackedAnime(current, imported, options).length,
    examples
  };
}
