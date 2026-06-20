import type { TrackedAnime } from "./types";

export interface MergeTrackedAnimeOptions {
  replaceOnEqualUpdatedAt?: boolean;
}

export function mergeTrackedAnime(
  localItems: TrackedAnime[],
  cloudItems: TrackedAnime[],
  options: MergeTrackedAnimeOptions = {}
): TrackedAnime[] {
  const merged = new Map<number, TrackedAnime>();

  for (const item of [...localItems, ...cloudItems]) {
    const existing = merged.get(item.anime.id);
    if (
      !existing ||
      item.updatedAt > existing.updatedAt ||
      (options.replaceOnEqualUpdatedAt &&
        item.updatedAt === existing.updatedAt)
    ) {
      merged.set(item.anime.id, item);
    }
  }

  return [...merged.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}
