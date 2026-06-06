import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types";
import { calculateTrackerStats } from "./stats";
import type { TrackedAnime } from "./types";

const anime: Anime = {
  id: 1,
  title: "Test Anime",
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Finished Airing",
  type: "TV",
  genres: [],
  studios: [],
  url: ""
};

function tracked(
  status: TrackedAnime["status"],
  progress: number,
  userScore?: number
): TrackedAnime {
  return {
    anime: { ...anime, id: Math.random() },
    status,
    progress,
    userScore,
    notes: "",
    addedAt: "",
    updatedAt: ""
  };
}

describe("calculateTrackerStats", () => {
  it("summarizes progress and scored titles", () => {
    const stats = calculateTrackerStats([
      tracked("watching", 4, 8),
      tracked("completed", 12, 10),
      tracked("plan_to_watch", 0)
    ]);

    expect(stats).toEqual({
      total: 3,
      watching: 1,
      completed: 1,
      episodesWatched: 16,
      averageScore: 9
    });
  });
});
