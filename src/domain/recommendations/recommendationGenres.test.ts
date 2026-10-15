import { describe, expect, it } from "vitest";
import { recommendationGenres } from "./recommendationGenres";
import type { TrackedAnime } from "../tracker/types";

function entry(id: number, genres: string[], status: TrackedAnime["status"], userScore?: number): TrackedAnime {
  return {
    anime: { id, title: `Anime ${id}`, imageUrl: "", largeImageUrl: "", synopsis: "", status: "Finished Airing", type: "TV", genres, studios: [], url: "" },
    status, progress: 1, notes: "", addedAt: "2026-01-01", updatedAt: "2026-01-01", userScore
  };
}

describe("recommendation genre sources", () => {
  it("prioritizes completed and highly scored genres without using dropped or planned titles", () => {
    expect(recommendationGenres([
      entry(1, ["Comedy"], "watching"),
      entry(2, ["Action", "Comedy"], "completed", 9),
      entry(3, ["Romance"], "dropped"),
      entry(4, ["Sports"], "plan_to_watch")
    ])).toEqual(["Comedy", "Action"]);
  });
});
