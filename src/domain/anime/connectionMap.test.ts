import { describe, expect, it } from "vitest";
import { buildAnimeConnections, shuffleMapItems } from "./connectionMap";
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
    expect(result.neighbors.map((entry) => entry.anime.id).sort()).toEqual([2, 3]);
    expect(result.neighbors.find((entry) => entry.anime.id === 2)?.via).toBe("studio:bones");
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
    expect(result.neighbors.map((entry) => entry.anime.id).sort()).toEqual([2, 3]);
  });

  it("samples from the full matching facet instead of a six-title shortlist", () => {
    const center = anime(1, ["Action", "Fantasy"], ["A"]);
    const studioTitles = Array.from({ length: 12 }, (_, index) => anime(index + 2, [], ["A"]));
    const genreTitles = Array.from({ length: 12 }, (_, index) => anime(index + 20, ["Fantasy"], []));
    const result = buildAnimeConnections(center, [...studioTitles, ...genreTitles], {
      facet: { key: "genre:fantasy", kind: "genre", label: "Fantasy" },
      seed: 42
    });

    expect(result.neighbors).toHaveLength(6);
    expect(result.neighbors.every((entry) => entry.anime.genres.includes("Fantasy"))).toBe(true);
    expect(result.neighbors.every((entry) => entry.via === "genre:fantasy")).toBe(true);
  });

  it("changes the visible sample when reshuffled without changing the catalog", () => {
    const center = anime(1, ["Action"], []);
    const pool = Array.from({ length: 24 }, (_, index) => anime(index + 2, ["Action"], []));
    const facet = { key: "genre:action", kind: "genre" as const, label: "Action" };
    const first = buildAnimeConnections(center, pool, { facet, seed: 1 });
    const next = buildAnimeConnections(center, pool, { facet, seed: 2 });

    expect(first.neighbors.map((entry) => entry.anime.id)).not.toEqual(next.neighbors.map((entry) => entry.anime.id));
    expect(shuffleMapItems([1, 2, 3], 7)).toEqual(shuffleMapItems([1, 2, 3], 7));
  });

  it("shows other studios as branches when exploring a genre", () => {
    const center = anime(1, ["Action"], ["Home Studio"]);
    const genre = { key: "genre:action", kind: "genre" as const, label: "Action" };
    const result = buildAnimeConnections(center, [
      anime(2, ["Action"], ["Home Studio"]),
      anime(3, ["Action"], ["Studio B"]),
      anime(4, ["Action"], ["Studio C"]),
      anime(5, ["Action"], ["Studio D"])
    ], { facet: genre, seed: 7 });

    expect(result.facets[0]).toEqual(genre);
    expect(result.facets.slice(1).map((facet) => facet.label).sort()).toEqual(["Studio B", "Studio C", "Studio D"]);
    expect(result.facets.slice(1).every((facet) => facet.parentKey === genre.key)).toBe(true);
    expect(result.neighbors.map((entry) => entry.anime.id)).toContain(3);
  });

  it("keeps a real genre bridge when branching to another studio", () => {
    const center = anime(1, ["Action"], ["Home Studio"]);
    const genre = { key: "genre:action", kind: "genre" as const, label: "Action" };
    const studio = { key: "studio:studio b", kind: "studio" as const, label: "Studio B" };
    const result = buildAnimeConnections(center, [anime(2, ["Action"], ["Studio B"])], {
      facet: studio,
      bridgeGenre: genre
    });

    expect(result.facets.find((facet) => facet.key === studio.key)?.parentKey).toBe(genre.key);
    expect(result.neighbors[0].via).toBe(studio.key);
  });

  it("prefers different series when a genre has enough choices", () => {
    const center = anime(1, ["Action"], ["Home Studio"]);
    const catalog = [
      ...Array.from({ length: 6 }, (_, index) => ({
        ...anime(index + 2, ["Action"], ["Studio B"]), title: `Dragon Ball Season ${index + 1}`
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        ...anime(index + 20, ["Action"], [`Studio ${index + 3}`]), title: `Different ${index} Story`
      }))
    ];
    const result = buildAnimeConnections(center, catalog, {
      facet: { key: "genre:action", kind: "genre", label: "Action" }, seed: 3
    });

    expect(result.neighbors.filter((entry) => entry.anime.title.startsWith("Dragon Ball"))).toHaveLength(1);
  });
});
