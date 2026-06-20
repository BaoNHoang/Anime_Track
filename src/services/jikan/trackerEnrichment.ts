import type { TrackedAnime } from "../../domain/tracker/types";
import { getAnimeById } from "./animeService";

const JIKAN_BULK_DETAIL_DELAY_MS = 1100;

export interface JikanEnrichmentProgress {
  completed: number;
  total: number;
  enriched: number;
  failed: number;
}

export interface JikanEnrichmentResult {
  items: TrackedAnime[];
  enriched: number;
  failed: number;
}

interface JikanEnrichmentOptions {
  delayMs?: number;
  onProgress?: (progress: JikanEnrichmentProgress) => void;
  signal?: AbortSignal;
}

function wait(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function enrichTrackedAnimeFromJikan(
  items: TrackedAnime[],
  options: JikanEnrichmentOptions = {}
): Promise<JikanEnrichmentResult> {
  const enrichedItems: TrackedAnime[] = [];
  let enriched = 0;
  let failed = 0;
  const delayMs = options.delayMs ?? JIKAN_BULK_DETAIL_DELAY_MS;

  for (let index = 0; index < items.length; index += 1) {
    if (index > 0) {
      await wait(delayMs);
    }

    const item = items[index];
    try {
      const anime = await getAnimeById(item.anime.id, options.signal);
      enrichedItems.push({
        ...item,
        anime,
        progress: Math.min(
          item.progress,
          anime.episodes ?? Number.MAX_SAFE_INTEGER
        )
      });
      enriched += 1;
    } catch {
      enrichedItems.push(item);
      failed += 1;
    }

    options.onProgress?.({
      completed: index + 1,
      total: items.length,
      enriched,
      failed
    });
  }

  return {
    items: enrichedItems,
    enriched,
    failed
  };
}
