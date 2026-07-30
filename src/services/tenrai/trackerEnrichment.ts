import type { TrackedAnime } from "../../domain/tracker/types";
import { getAnimeById } from "./animeService";

const TENRAI_BULK_DETAIL_DELAY_MS = 550;

export interface TenraiEnrichmentProgress {
  completed: number;
  total: number;
  enriched: number;
  failed: number;
}

export interface TenraiEnrichmentResult {
  items: TrackedAnime[];
  enriched: number;
  failed: number;
}

interface TenraiEnrichmentOptions {
  delayMs?: number;
  onProgress?: (progress: TenraiEnrichmentProgress) => void;
  signal?: AbortSignal;
}

function wait(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function enrichTrackedAnimeFromTenrai(
  items: TrackedAnime[],
  options: TenraiEnrichmentOptions = {}
): Promise<TenraiEnrichmentResult> {
  const enrichedItems: TrackedAnime[] = [];
  let enriched = 0;
  let failed = 0;
  const delayMs = options.delayMs ?? TENRAI_BULK_DETAIL_DELAY_MS;

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
