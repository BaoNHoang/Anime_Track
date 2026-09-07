import type { TrackedAnime } from "../../domain/tracker/types";
import type { ProfileSummary } from "../../domain/tracker/profileSummary";

const LIBRARY_PAGE_SIZE = 250;

interface CloudLibraryPage {
  items: TrackedAnime[];
  total: number;
  nextOffset?: number;
}

async function cloudRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; expectedUserId?: string } = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      signal: AbortSignal.timeout(15000),
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
  async getPage(
    offset = 0,
    limit = LIBRARY_PAGE_SIZE
  ): Promise<CloudLibraryPage> {
    const query = new URLSearchParams({
      offset: String(offset),
      limit: String(limit)
    });
    return cloudRequest<CloudLibraryPage>(`/api/library?${query}`);
  },

  async getAll(): Promise<TrackedAnime[]> {
    const firstPage = await this.getPage(0, LIBRARY_PAGE_SIZE);
    if (!firstPage.nextOffset) return firstPage.items;

    const offsets: number[] = [];
    for (
      let offset = firstPage.nextOffset;
      offset < firstPage.total;
      offset += LIBRARY_PAGE_SIZE
    ) {
      offsets.push(offset);
    }

    const pages: CloudLibraryPage[] = [];
    for (let index = 0; index < offsets.length; index += 4) {
      const batch = offsets.slice(index, index + 4);
      pages.push(
        ...(await Promise.all(
          batch.map((offset) => this.getPage(offset, LIBRARY_PAGE_SIZE))
        ))
      );
    }
    return [firstPage, ...pages].flatMap((page) => page.items);
  },

  async getProfileSummary(): Promise<ProfileSummary> {
    const result = await cloudRequest<{ summary: ProfileSummary }>(
      "/api/library/summary"
    );
    return result.summary;
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
