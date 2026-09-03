import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types";
import type { TrackedAnime } from "./types";
import {
  createYearInReview,
  parseSharedYearInReview,
  serializeYearInReview
} from "./yearInReview";

const anime: Anime = {
  id: 1,
  title: "Review Anime",
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Finished Airing",
  type: "TV",
  duration: "24 min per ep",
  genres: ["Drama"],
  studios: ["Bones"],
  url: ""
};

const item: TrackedAnime = {
  anime,
  status: "completed",
  progress: 3,
  episodeHistory: [
    { episode: 1, watchedAt: "2026-01-05" },
    { episode: 2, watchedAt: "2026-01-06" },
    { episode: 3, watchedAt: "2026-02-01" }
  ],
  notes: "",
  addedAt: "2025-12-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z"
};

describe("createYearInReview", () => {
  it("summarizes dated episode activity and preferences", () => {
    const review = createYearInReview([item], 2026);
    expect(review).toMatchObject({
      episodesWatched: 3,
      minutesWatched: 72,
      completedTitles: 1,
      activeTitles: 1,
      completionRate: 100,
      favoriteGenres: [{ name: "Drama", count: 3 }],
      favoriteStudios: [{ name: "Bones", count: 3 }]
    });
    expect(review.monthlyEpisodes.slice(0, 2)).toEqual([2, 1]);
  });

  it("round-trips a bounded share payload", () => {
    const review = createYearInReview([item], 2026);
    const parsed = parseSharedYearInReview(
      serializeYearInReview(review, "viewer")
    );
    expect(parsed).toEqual({ review, username: "viewer" });
  });

  it("rejects malformed public recap data", () => {
    expect(parseSharedYearInReview(new URLSearchParams("share=1&year=9999")))
      .toBeUndefined();
  });
});
