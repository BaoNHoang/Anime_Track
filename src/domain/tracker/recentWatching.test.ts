import { describe, expect, it } from "vitest";
import type { TrackedAnime } from "./types";
import { sortByRecentWatch } from "./recentWatching";

function tracked(id: number, updatedAt: string, watchedAt?: string): TrackedAnime {
  return {
    anime: { id, title: `Anime ${id}`, imageUrl: "", largeImageUrl: "", synopsis: "", status: "Airing", type: "TV", genres: [], studios: [], url: "" },
    status: "watching", progress: 1, notes: "", addedAt: "2026-01-01T00:00:00Z", updatedAt,
    ...(watchedAt ? { episodeHistory: [{ episode: 1, watchedAt }] } : {})
  };
}

describe("sortByRecentWatch", () => {
  it("does not promote a dated title when only its notes or score change", () => {
    const older = tracked(1, "2026-10-20T15:00:00Z", "2026-10-12");
    const newer = tracked(2, "2026-10-18T15:00:00Z", "2026-10-18");
    expect(sortByRecentWatch([older, newer]).map((item) => item.anime.id)).toEqual([2, 1]);
  });

  it("includes archived rewatch episode dates", () => {
    const rewatch = {
      ...tracked(1, "2026-01-01T00:00:00Z", "2026-09-01"),
      previousWatches: [{ progress: 1, completedAt: "2026-10-17T12:00:00Z", episodeHistory: [{ episode: 1, watchedAt: "2026-10-17" }] }]
    };
    expect(sortByRecentWatch([tracked(2, "2026-10-15T00:00:00Z", "2026-10-15"), rewatch])[0].anime.id).toBe(1);
  });

  it("uses update time for undated libraries and prefers a real watch on the same day", () => {
    const undated = tracked(1, "2026-10-18T23:00:00Z");
    const dated = tracked(2, "2026-10-01T00:00:00Z", "2026-10-18");
    expect(sortByRecentWatch([undated, dated]).map((item) => item.anime.id)).toEqual([2, 1]);
    expect(sortByRecentWatch([tracked(3, "2026-10-19T00:00:00Z"), undated])[0].anime.id).toBe(3);
  });
});
