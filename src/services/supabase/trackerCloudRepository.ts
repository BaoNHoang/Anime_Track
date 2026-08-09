import type { TrackedAnime } from "../../domain/tracker/types";

async function cloudRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; expectedUserId?: string } = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers: {
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.expectedUserId
          ? { "X-Banime-User": options.expectedUserId }
          : {})
      },
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

  async upsert(item: TrackedAnime, expectedUserId: string): Promise<void> {
    await cloudRequest("/api/library", {
      method: "PUT",
      body: { items: [item] },
      expectedUserId
    });
  },

  async upsertMany(items: TrackedAnime[], expectedUserId: string): Promise<void> {
    if (!items.length) return;
    for (let index = 0; index < items.length; index += 100) {
      await cloudRequest("/api/library", {
        method: "PUT",
        body: { items: items.slice(index, index + 100) },
        expectedUserId
      });
    }
  },

  async remove(animeId: number, expectedUserId: string): Promise<void> {
    await cloudRequest(`/api/library/${encodeURIComponent(animeId)}`, {
      method: "DELETE",
      expectedUserId
    });
  }
};
