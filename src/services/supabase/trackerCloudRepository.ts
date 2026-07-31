import type { TrackedAnime } from "../../domain/tracker/types";

async function cloudRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers:
      options.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body)
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Cloud sync failed.");
  }
  return data;
}

export const trackerCloudRepository = {
  async getAll(): Promise<TrackedAnime[]> {
    const result = await cloudRequest<{ items: TrackedAnime[] }>(
      "/api/library"
    );
    return result.items;
  },

  async upsert(item: TrackedAnime): Promise<void> {
    await cloudRequest("/api/library", {
      method: "PUT",
      body: { items: [item] }
    });
  },

  async upsertMany(items: TrackedAnime[]): Promise<void> {
    if (!items.length) return;
    await cloudRequest("/api/library", {
      method: "PUT",
      body: { items }
    });
  },

  async remove(animeId: number): Promise<void> {
    await cloudRequest(`/api/library/${encodeURIComponent(animeId)}`, {
      method: "DELETE"
    });
  }
};
