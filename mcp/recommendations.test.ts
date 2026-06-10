import { describe, expect, it } from "vitest";
import type { Anime } from "../src/domain/anime/types";
import type { TrackedAnime } from "../src/domain/tracker/types";
import { rankRecommendationCandidates } from "./recommendations";

function anime(
  id: number,
  title: string,
  genres: string[],
  studio: string,
  score = 8
): Anime {
  return {
    id,
    title,
    imageUrl: "",
    largeImageUrl: "",
    synopsis: "",
    score,
    status: "Finished Airing",
    type: "TV",
    genres,
    studios: [studio],
    url: `https://myanimelist.net/anime/${id}`
  };
}

function tracked(value: Anime, userScore: number): TrackedAnime {
  return {
    anime: value,
    status: "completed",
    progress: 12,
    userScore,
    notes: "",
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("rankRecommendationCandidates", () => {
  it("excludes tracked titles and ranks shared preferences first", () => {
    const favorite = anime(1, "Favorite", ["Sci-Fi", "Adventure"], "Bones");
    const matching = anime(
      2,
      "Strong match",
      ["Sci-Fi", "Adventure"],
      "Bones"
    );
    const partial = anime(3, "Partial match", ["Comedy"], "Other");

    const result = rankRecommendationCandidates(
      [tracked(favorite, 10)],
      [favorite, partial, matching],
      {},
      10
    );

    expect(result.map((item) => item.anime.id)).toEqual([2, 3]);
    expect(result[0].reasons.join(" ")).toContain("Sci-Fi");
    expect(result[0].reasons.join(" ")).toContain("Bones");
  });

  it("applies explicit genre and score filters", () => {
    const result = rankRecommendationCandidates(
      [],
      [
        anime(2, "Pass", ["Drama"], "A", 8.5),
        anime(3, "Wrong genre", ["Action"], "A", 9),
        anime(4, "Low score", ["Drama"], "A", 6)
      ],
      { genres: ["Drama"], minScore: 8 },
      10
    );

    expect(result.map((item) => item.anime.id)).toEqual([2]);
  });
});
