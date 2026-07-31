import type { TrackedAnime } from "../../domain/tracker/types";

async function cloudRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
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
  } catch {
    throw new Error("Cloud sync could not be reached. Try again shortly.");
  }

  const responseText = await response.text();
  let data: T & { error?: string };
  try {
    data = responseText
      ? (JSON.parse(responseText) as T & { error?: string })
      : ({} as T & { error?: string });
  } catch {
    throw new Error("Cloud sync is temporarily unavailable. Try again shortly.");
  }
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
