import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types";
import type { TrackedAnime } from "../tracker/types";
import { rankRecommendations } from "./rankRecommendations";

function anime(id: number, genres: string[], studios: string[]): Anime {
  return {
    id,
    title: `Anime ${id}`,
    imageUrl: "",
    largeImageUrl: "",
    synopsis: "",
    status: "Finished Airing",
    type: "TV",
    genres,
    studios,
    url: ""
  };
}

function tracked(value: Anime, score = 8): TrackedAnime {
  return {
    anime: value,
    status: "completed",
    progress: 12,
    userScore: score,
    notes: "",
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z"
  };
}

describe("rankRecommendations", () => {
  it("does not treat low scores as positive preferences", () => {
    expect(rankRecommendations([tracked(anime(1, ["Drama"], ["Bones"]), 2)],
      [anime(2, ["Drama"], ["Bones"])])).toEqual([]);
  });
  it("ranks untracked titles by watch-history affinity", () => {
    const library = [tracked(anime(1, ["Drama", "Fantasy"], ["Bones"]))];
    const recommendations = rankRecommendations(library, [
      anime(1, ["Drama"], ["Bones"]),
      anime(2, ["Comedy"], ["Other"]),
      anime(3, ["Fantasy"], ["Bones"])
    ]);

    expect(recommendations.map((item) => item.anime.id)).toEqual([3]);
    expect(recommendations[0].reason).toContain("Bones");
  });

  it("boosts explicitly favorited studios", () => {
    const library = [tracked(anime(1, ["Drama"], ["Other"]))];
    const recommendations = rankRecommendations(
      library,
      [
        anime(2, ["Drama"], ["Other"]),
        anime(3, ["Drama"], ["Ghibli"])
      ],
      [{ id: 21, name: "Ghibli" }]
    );

    expect(recommendations[0].anime.id).toBe(3);
    expect(recommendations[0].reason).toBe("From favorite studio Ghibli");
  });

  it("waits for meaningful history before recommending", () => {
    expect(rankRecommendations([], [anime(2, ["Drama"], ["Bones"])]))
      .toEqual([]);
  });
});
