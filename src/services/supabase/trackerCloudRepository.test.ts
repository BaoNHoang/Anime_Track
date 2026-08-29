import { afterEach, describe, expect, it, vi } from "vitest";
import { trackerCloudRepository } from "./trackerCloudRepository";

describe("trackerCloudRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("replaces a non-JSON server error with actionable sync guidance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("A server error occurred", {
          status: 500,
          headers: { "Content-Type": "text/html" }
        })
      )
    );

    await expect(trackerCloudRepository.getAll()).rejects.toThrow(
      "Cloud sync is temporarily unavailable. Try again shortly."
    );
  });

  it("loads large cloud libraries in bounded pages", async () => {
    const firstItems = Array.from({ length: 250 }, (_, index) => ({
      anime: { id: index + 1 }
    }));
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const offset = new URL(input, "https://banime.test").searchParams.get(
        "offset"
      );
      const body =
        offset === "0"
          ? { items: firstItems, total: 251, nextOffset: 250 }
          : { items: [{ anime: { id: 251 } }], total: 251 };
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const items = await trackerCloudRepository.getAll();

    expect(items).toHaveLength(251);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("offset=250");
  });

  it("loads the compact profile summary separately", async () => {
    const summary = {
      stats: {
        total: 2000,
        watching: 10,
        completed: 1900,
        episodesWatched: 24000,
        daysWatched: 400
      },
      recentItems: [],
      favoriteGenres: [],
      airingItems: []
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ summary }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    await expect(trackerCloudRepository.getProfileSummary()).resolves.toEqual(
      summary
    );
  });

  it("binds writes to the expected user and chunks bulk imports", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response('{"saved":1}', {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const items = Array.from({ length: 201 }, (_, index) => ({
      anime: { id: index + 1 }
    })) as never;

    await trackerCloudRepository.upsertMany(items, "user-a");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.headers["X-Banime-User"]).toBe("user-a");
      expect(JSON.parse(options.body).items.length).toBeLessThanOrEqual(100);
    }
  });
});
