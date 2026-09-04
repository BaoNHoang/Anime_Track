import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Anime } from "../../domain/anime/types";
import type { TrackedAnime } from "../../domain/tracker/types";

const mocks = vi.hoisted(() => ({
  getAnimeById: vi.fn(),
  getAnimeSequels: vi.fn()
}));

vi.mock("./animeService", () => mocks);

import { findUpcomingSeasonNotifications } from "./seasonNotifications";

const anime: Anime = {
  id: 42,
  title: "First Season",
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Finished Airing",
  type: "TV",
  genres: [],
  studios: [],
  url: ""
};

const tracked: TrackedAnime = {
  anime,
  status: "completed",
  progress: 12,
  notes: "",
  addedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("findUpcomingSeasonNotifications", () => {
  beforeEach(() => {
    mocks.getAnimeById.mockReset();
    mocks.getAnimeSequels.mockReset();
    mocks.getAnimeSequels.mockResolvedValue([84]);
    mocks.getAnimeById.mockResolvedValue({
      ...anime,
      id: 84,
      title: "Second Season",
      status: "Not yet aired",
      startDate: "2026-10-01T00:00:00.000Z"
    });
  });

  it("creates a one-time alert for an explicitly related upcoming sequel", async () => {
    const result = await findUpcomingSeasonNotifications(
      [tracked],
      [],
      new Date("2026-09-04T00:00:00.000Z")
    );

    expect(result.notifications).toEqual([
      expect.objectContaining({
        id: "season:42:84",
        kind: "season",
        animeId: 84,
        sourceAnimeId: 42,
        sourceTitle: "First Season"
      })
    ]);
    expect(result.seenSeasonIds).toContain(84);
  });

  it("does not recreate a season that was already discovered", async () => {
    const result = await findUpcomingSeasonNotifications([tracked], [84]);

    expect(result.notifications).toEqual([]);
    expect(mocks.getAnimeById).not.toHaveBeenCalled();
  });

  it("does not alert for a sequel already present in the library", async () => {
    const sequelItem = { ...tracked, anime: { ...anime, id: 84 } };
    const result = await findUpcomingSeasonNotifications([tracked, sequelItem], []);

    expect(result.notifications).toEqual([]);
    expect(result.seenSeasonIds).toContain(84);
  });

  it("does not enqueue the entire library relation scan at once", async () => {
    let resolveFirst!: (value: number[]) => void;
    const firstRequest = new Promise<number[]>((resolve) => {
      resolveFirst = resolve;
    });
    mocks.getAnimeSequels
      .mockImplementationOnce(() => firstRequest)
      .mockResolvedValueOnce([]);
    const secondItem = { ...tracked, anime: { ...anime, id: 43 } };

    const pending = findUpcomingSeasonNotifications([tracked, secondItem], []);
    await Promise.resolve();

    expect(mocks.getAnimeSequels).toHaveBeenCalledTimes(1);
    resolveFirst([]);
    await pending;
    expect(mocks.getAnimeSequels).toHaveBeenCalledTimes(2);
  });
});
