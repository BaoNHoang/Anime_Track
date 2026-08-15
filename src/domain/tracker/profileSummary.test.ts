import { describe, expect, it } from "vitest";
import type { TrackedAnime } from "./types";
import { createProfileSummary } from "./profileSummary";

function tracked(
  id: number,
  updatedAt: string,
  options: Partial<TrackedAnime> = {}
): TrackedAnime {
  return {
    anime: {
      id,
      title: `Anime ${id}`,
      imageUrl: "",
      largeImageUrl: "",
      synopsis: "",
      status: id === 1 ? "Currently Airing" : "Finished Airing",
      type: "TV",
      duration: "24 min",
      genres: id === 1 ? ["Action", "Drama"] : ["Drama"],
      studios: [],
      url: ""
    },
    status: id === 1 ? "watching" : "completed",
    progress: id,
    notes: "",
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt,
    ...options
  };
}

describe("createProfileSummary", () => {
  it("builds the small profile view from a full library", () => {
    const summary = createProfileSummary([
      tracked(2, "2026-01-02T00:00:00.000Z"),
      tracked(1, "2026-01-03T00:00:00.000Z")
    ]);

    expect(summary.stats).toMatchObject({
      total: 2,
      watching: 1,
      completed: 1,
      episodesWatched: 3
    });
    expect(summary.recentItems.map((item) => item.anime.id)).toEqual([1, 2]);
    expect(summary.favoriteGenres).toEqual([
      { genre: "Drama", count: 2 },
      { genre: "Action", count: 1 }
    ]);
    expect(summary.airingItems.map((item) => item.anime.id)).toEqual([1]);
  });
});
