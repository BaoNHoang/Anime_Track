import { describe, expect, it } from "vitest";
import { buildAnimeConnections } from "./connectionMap";
import type { Anime } from "./types";

const anime = (id: number, genres: string[], studios: string[], score = 7): Anime => ({
  id,
  title: `Anime ${id}`,
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Finished Airing",
  type: "TV",
  genres,
  studios,
  score,
  url: ""
});

describe("buildAnimeConnections", () => {
  it("connects titles through actual shared genres and studios", () => {
    const center = anime(1, ["Action", "Fantasy"], ["Bones"]);
    const result = buildAnimeConnections(center, [
      center,
      anime(2, ["Comedy"], ["Bones"]),
      anime(3, ["Fantasy"], ["Other"]),
      anime(4, ["Comedy"], ["Other"])
    ]);

    expect(result.facets.map((facet) => facet.label)).toContain("Bones");
    expect(result.neighbors.map((entry) => entry.anime.id)).toEqual([2, 3]);
    expect(result.neighbors[0].via).toBe("studio:bones");
  });

  it("deduplicates catalog titles and caps the visible neighborhood", () => {
    const center = anime(1, ["Action"], []);
    const related = Array.from({ length: 9 }, (_, index) => anime(index + 2, ["Action"], []));
    const result = buildAnimeConnections(center, [...related, related[0]]);

    expect(result.neighbors).toHaveLength(6);
    expect(new Set(result.neighbors.map((entry) => entry.anime.id)).size).toBe(6);
  });

  it("does not invent links when no metadata overlaps", () => {
    const result = buildAnimeConnections(anime(1, ["Drama"], ["A"]), [anime(2, ["Comedy"], ["B"])]);
    expect(result.neighbors).toEqual([]);
  });

  it("includes connections through either of a title's studios", () => {
    const result = buildAnimeConnections(anime(1, [], ["A", "B"]), [
      anime(2, [], ["A"]),
      anime(3, [], ["B"])
    ]);
    expect(result.facets.map((facet) => facet.label)).toEqual(["A", "B"]);
    expect(result.neighbors.map((entry) => entry.anime.id)).toEqual([2, 3]);
  });
});
