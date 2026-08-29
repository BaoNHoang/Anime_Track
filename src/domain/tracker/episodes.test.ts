import { describe, expect, it } from "vitest";
import type { TrackedAnime } from "./types";
import {
  nextEpisodeNumber,
  updateEpisodeHistory,
  watchedEpisodeNumbers
} from "./episodes";

function tracked(overrides: Partial<TrackedAnime> = {}): TrackedAnime {
  return {
    anime: {
      id: 1,
      title: "Test",
      imageUrl: "",
      largeImageUrl: "",
      synopsis: "",
      status: "Airing",
      type: "TV",
      episodes: 12,
      genres: [],
      studios: [],
      url: ""
    },
    status: "watching",
    progress: 3,
    notes: "",
    addedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides
  };
}

describe("episode tracking", () => {
  it("treats legacy progress as a watched prefix", () => {
    const item = tracked();
    expect([...watchedEpisodeNumbers(item)]).toEqual([1, 2, 3]);
    expect(nextEpisodeNumber(item)).toBe(4);
  });

  it("supports gaps and optional watch dates", () => {
    const result = updateEpisodeHistory(tracked(), 2, false);
    expect(result.progress).toBe(2);
    expect(result.episodeHistory.map((entry) => entry.episode)).toEqual([1, 3]);
    expect(nextEpisodeNumber({ ...tracked(), ...result })).toBe(2);

    const restored = updateEpisodeHistory(
      { ...tracked(), ...result },
      2,
      true,
      "2026-08-28"
    );
    expect(restored.episodeHistory[1]).toEqual({
      episode: 2,
      watchedAt: "2026-08-28"
    });
  });

  it("completes a title when every known episode is checked", () => {
    const item = tracked({ anime: { ...tracked().anime, episodes: 4 } });
    expect(updateEpisodeHistory(item, 4, true).status).toBe("completed");
  });
});
