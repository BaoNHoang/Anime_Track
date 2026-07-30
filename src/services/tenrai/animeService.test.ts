import { beforeEach, describe, expect, it, vi } from "vitest";

const { tenraiGetMock } = vi.hoisted(() => ({
  tenraiGetMock: vi.fn()
}));

vi.mock("./client", () => ({
  tenraiGet: tenraiGetMock
}));

import { getTopAnime } from "./animeService";

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

  it("requests four pages of 25 for the top 100 popular anime", async () => {
    await getTopAnime("bypopularity");

    expect(tenraiGetMock).toHaveBeenCalledTimes(4);
    expect(tenraiGetMock.mock.calls.map(([path]) => path)).toEqual([
      "/top/anime?filter=bypopularity&limit=25&page=1&sfw=true",
      "/top/anime?filter=bypopularity&limit=25&page=2&sfw=true",
      "/top/anime?filter=bypopularity&limit=25&page=3&sfw=true",
      "/top/anime?filter=bypopularity&limit=25&page=4&sfw=true"
    ]);
    expect(tenraiGetMock.mock.calls.map(([, options]) => options)).toEqual(
      Array.from({ length: 4 }, () =>
        expect.objectContaining({
          cacheMs: 6 * 60 * 60 * 1000,
          cacheStorage: "local"
        })
      )
    );
  });

  it("keeps airing and upcoming feeds to one request", async () => {
    await getTopAnime("airing");

    expect(tenraiGetMock).toHaveBeenCalledTimes(1);
    expect(tenraiGetMock).toHaveBeenCalledWith(
      "/top/anime?filter=airing&limit=18&page=1&sfw=true",
      expect.objectContaining({ cacheMs: 15 * 60 * 1000 })
    );
  });
});
