export const MAX_SCAN_ROWS_PER_USER = 10_000;

// The scan position is owned by the worker, not by the user-editable release
// cursor. Wrap once so every account eventually receives a turn.
export async function nextTrackedUserId(
  afterUserId: string | null,
  findAfter: (userId: string | null) => Promise<string | undefined>
) {
  return await findAfter(afterUserId) ??
    (afterUserId === null ? undefined : await findAfter(null));
}

export async function loadCompleteUserRows<T extends { anime_id: number }>(
  loadPage: (afterAnimeId: number, limit: number) => Promise<T[]>,
  pageSize = 1_000,
  maxRows = MAX_SCAN_ROWS_PER_USER
) {
  const rows: T[] = [];
  let afterAnimeId = 0;
  while (true) {
    const page = await loadPage(afterAnimeId, pageSize);
    if (page.length > pageSize || page.some((row) => row.anime_id <= afterAnimeId)) {
      throw new Error("The tracked anime scan did not advance in key order.");
    }
    rows.push(...page);
    if (rows.length > maxRows) {
      throw new Error("The tracked anime library exceeds the safe scan limit.");
    }
    if (page.length < pageSize) return rows;
    afterAnimeId = page[page.length - 1].anime_id;
  }
}

// Advance only when this account is actually visited. Clock-based rotation can
// permanently skip sources when the account is scanned every other job.
export function nextSeasonBatch<T>(sources: T[], savedOffset: number, batchSize = 3) {
  if (sources.length === 0) return { batch: [] as T[], nextOffset: 0 };
  const offset = Number.isSafeInteger(savedOffset) && savedOffset >= 0
    ? savedOffset % sources.length : 0;
  const count = Math.min(batchSize, sources.length);
  const batch = Array.from({ length: count }, (_, index) => sources[(offset + index) % sources.length]);
  return { batch, nextOffset: (offset + count) % sources.length };
}
