import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types.js";
import type { TrackedAnime } from "../tracker/types.js";
import { sampleRecommendations } from "./sampleRecommendations.js";

function anime(id: number): Anime {
  return {
    id, title: `Anime ${id}`, imageUrl: "", largeImageUrl: "", synopsis: "",
    status: "Finished Airing", type: "TV", genres: ["Drama"], studios: [], url: ""
  };
}

const library: TrackedAnime[] = [{
  anime: anime(1), status: "completed", progress: 12, notes: "",
  addedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z"
}];

describe("Home recommendation sampling", () => {
  it("includes genre-feed candidates while excluding tracked titles", () => {
    const picks = sampleRecommendations(library, [anime(1), anime(2), anime(3)], [], 7);
    expect(picks.map(({ anime: item }) => item.id).sort()).toEqual([2, 3]);
  });

  it("varies five picks across visits without duplicates or losing affinity", () => {
    const candidates = Array.from({ length: 20 }, (_, index) => anime(index + 2));
    const first = sampleRecommendations(library, candidates, [], 1);
    const next = sampleRecommendations(library, candidates, [], 2);

    expect(first).toHaveLength(5);
    expect(new Set(first.map(({ anime: item }) => item.id)).size).toBe(5);
    expect(first.map(({ anime: item }) => item.id)).not.toEqual(next.map(({ anime: item }) => item.id));
    expect(first.every((item) => item.score > 0)).toBe(true);
  });
});
