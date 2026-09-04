import { beforeEach, describe, expect, it, vi } from "vitest";

const { tenraiGetMock } = vi.hoisted(() => ({
  tenraiGetMock: vi.fn()
}));

vi.mock("./client", () => ({
  tenraiGet: tenraiGetMock
}));

import {
  browseAnime,
  getAnimeSequels,
  getTopAnime,
  searchAnime
} from "./animeService";

describe("getTopAnime", () => {
  beforeEach(() => {
    tenraiGetMock.mockReset();
    tenraiGetMock.mockResolvedValue({
      data: [],
      pagination: {
        current_page: 1,
        has_next_page: true
      }
    });
  });

  it("requests and persistently caches any popular anime page", async () => {
    await getTopAnime("bypopularity", 5);

    expect(tenraiGetMock).toHaveBeenCalledTimes(1);
    expect(tenraiGetMock).toHaveBeenCalledWith(
      "/top/anime?filter=bypopularity&limit=24&page=5&sfw=true",
      expect.objectContaining({
        cacheMs: 6 * 60 * 60 * 1000,
        cacheStorage: "local"
      })
    );
  });

  it("pages and persistently caches airing and upcoming feeds", async () => {
    await getTopAnime("airing", 2);

    expect(tenraiGetMock).toHaveBeenCalledTimes(1);
    expect(tenraiGetMock).toHaveBeenCalledWith(
      "/top/anime?filter=airing&limit=24&page=2&sfw=true",
      expect.objectContaining({
        cacheMs: 15 * 60 * 1000,
        cacheStorage: "local"
      })
    );
  });

  it("includes the requested page when searching and caches it locally", async () => {
    await searchAnime("bebop", 3);

    expect(tenraiGetMock).toHaveBeenCalledWith(
      "/anime?q=bebop&limit=20&sfw=true&order_by=popularity&sort=asc&page=3",
      expect.objectContaining({
        cacheMs: 30 * 60 * 1000,
        cacheStorage: "local"
      })
    );
  });

  it("builds bounded preset browse requests", async () => {
    await browseAnime("2010s", 2);

    expect(tenraiGetMock).toHaveBeenCalledWith(
      "/anime?start_date=2010-01-01&end_date=2019-12-31&order_by=score&sort=desc&limit=24&sfw=true&page=2",
      expect.objectContaining({ cacheStorage: "local" })
    );
  });

  it("returns only anime sequel relationships with persistent caching", async () => {
    tenraiGetMock.mockResolvedValueOnce({
      data: [
        { relation: "Sequel", entry: [
          { mal_id: 84, type: "anime", name: "Season 2", url: "https://example.com" },
          { mal_id: 85, type: "manga", name: "Manga", url: "https://example.com" }
        ] },
        { relation: "Prequel", entry: [
          { mal_id: 1, type: "anime", name: "Season 0", url: "https://example.com" }
        ] }
      ]
    });

    await expect(getAnimeSequels(42)).resolves.toEqual([84]);
    expect(tenraiGetMock).toHaveBeenCalledWith(
      "/anime/42/relations",
      expect.objectContaining({
        cacheMs: 24 * 60 * 60 * 1000,
        cacheStorage: "local"
      })
    );
  });
});
